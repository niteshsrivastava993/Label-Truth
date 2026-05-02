import { User } from "../models/user.js";
import { Scan } from "../models/scan.js";
import cloudinary from "../lib/cloudinary.js";
import axios from "axios";

export const performScan = async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // 1. Upload to Cloudinary
    console.log("Step 1: Uploading image to Cloudinary...");
    const b64Input = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64Input}`;
    
    const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
      folder: "label_truth_scans",
    });
    const imageUrl = cloudinaryRes.secure_url;
    console.log("Cloudinary Upload Success:", imageUrl);

    // 2. Fetch image from Cloudinary as Buffer
    console.log("Step 2: Fetching image from Cloudinary for Gemini REST API...");
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const imageMimeType = imageResponse.headers['content-type'] || req.file.mimetype;

    // 3. Get User Profile for Context
    let healthConditions: string[] = [];
    let allergies: string[] = [];
    
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        healthConditions = user.healthConditions || [];
        allergies = user.allergies || [];
      }
    }

    // 4. Prompt Setup
    const prompt = `Act as the core AI engine for "Label Truth" Health App.
Analyze this product label Specifically for hidden sugars, harmful chemicals, and bad preservatives.

User Health Profile:
- Conditions: [${healthConditions.join(", ")}]
- Allergies: [${allergies.join(", ")}]

Objectives:
1. OCR: Extract product name and ingredients.
2. Hidden Dangers: Identify disguised sugars (syrups, maltodextrin etc) and harmful additives.
3. Marketing Gimmick Audit: Compare marketing claims (e.g. "No Added Sugar") vs reality.
4. Truth Decoder: Translate complex ingredients to 5th-grade English.
5. Verdict: Provide a health score (1-10), a simple 2-line explanation, and a confidence_score (0.0 to 1.0).
6. Error Handling: If the label is torn or unreadable, set confidence_score < 0.3.

Return ONLY JSON with this format:
{
  "productName": "string",
  "confidenceScore": number,
  "safetyVerdict": "SAFE" | "MODERATE" | "UNSAFE",
  "overallHealthScore": number,
  "simpleExplanation": "string",
  "criticalWarnings": ["string"],
  "conditionImpact": { "condition_name": "impact_description" },
  "marketingClaims": "string",
  "theReality": "string",
  "hiddenSugars": ["string"],
  "harmfulChemicals": ["string"],
  "isDeceptive": boolean,
  "simplifiedIngredients": [
    {
      "scientificName": "string",
      "simpleName": "string",
      "whatItActuallyIs": "string",
      "safetyLevel": "Safe" | "Caution" | "Avoid"
    }
  ]
}

Output MUST be strictly JSON string only.`;

    // 5. Direct REST API Call
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: imageMimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    try {
      console.log("Step 3: Calling Gemini Direct REST API...");
      const geminiResponse = await axios.post(apiUrl, payload);
      
      if (!geminiResponse.data || !geminiResponse.data.candidates || geminiResponse.data.candidates.length === 0) {
        throw new Error("Invalid response from Gemini API: No candidates returned");
      }

      const text = geminiResponse.data.candidates[0].content.parts[0].text;
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse AI response JSON. Raw text:", text);
        return res.status(500).json({ error: "AI response was not valid JSON", raw: text });
      }

      // 6. Save to DB if Authenticated
      if (req.user) {
        const scan = new Scan({
          userId: req.user.userId,
          productName: analysis.productName,
          ingredients: analysis.simplifiedIngredients.map((i: any) => i.scientificName).join(", "),
          verdict: analysis.safetyVerdict,
          safetyVerdict: analysis.safetyVerdict,
          overallHealthScore: analysis.overallHealthScore,
          simpleExplanation: analysis.simpleExplanation,
          criticalWarnings: analysis.criticalWarnings,
          conditionImpact: analysis.conditionImpact,
          healthScore: analysis.overallHealthScore,
          marketingClaims: analysis.marketingClaims,
          theReality: analysis.theReality,
          hiddenSugars: analysis.hiddenSugars,
          harmfulChemicals: analysis.harmfulChemicals,
          isDeceptive: analysis.isDeceptive,
          simplifiedIngredients: analysis.simplifiedIngredients.map((i: any) => ({
            ...i,
            name: i.scientificName,
            isHarmful: i.safetyLevel === 'Avoid'
          })),
          imageUrl: imageUrl
        });
        await scan.save();
      }

      res.json({ ...analysis, imageUrl });

    } catch (geminiErr: any) {
      console.error("--- GEMINI DIRECT API ERROR DETAILS ---");
      if (geminiErr.response) {
        console.error("Status:", geminiErr.response.status);
        console.error("Data:", JSON.stringify(geminiErr.response.data, null, 2));
      } else {
        console.error("Error Message:", geminiErr.message);
      }
      return res.status(500).json({ 
        error: "Gemini REST API Error", 
        details: geminiErr.response?.data || geminiErr.message 
      });
    }

  } catch (error: any) {
    console.error("Controller Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to analyze product",
      message: "Check server logs for detailed trace"
    });
  }
};

export const saveScan = async (req: any, res: any) => {
  try {
    const { analysis, imageData } = req.body;
    
    if (!analysis || !imageData) {
      return res.status(400).json({ error: "Missing analysis data or image" });
    }

    const scan = new Scan({
      userId: req.user.userId,
      productName: analysis.productName,
      ingredients: analysis.simplifiedIngredients.map((i: any) => i.scientificName).join(", "),
      verdict: analysis.safetyVerdict,
      safetyVerdict: analysis.safetyVerdict,
      overallHealthScore: analysis.overallHealthScore,
      simpleExplanation: analysis.simpleExplanation,
      criticalWarnings: analysis.criticalWarnings,
      conditionImpact: analysis.conditionImpact,
      healthScore: analysis.overallHealthScore,
      marketingClaims: analysis.marketingClaims,
      theReality: analysis.theReality,
      hiddenSugars: analysis.hiddenSugars,
      harmfulChemicals: analysis.harmfulChemicals,
      isDeceptive: analysis.isDeceptive,
      simplifiedIngredients: analysis.simplifiedIngredients.map((i: any) => ({
        ...i,
        name: i.scientificName,
        isHarmful: i.safetyLevel === 'Avoid'
      })),
      imageUrl: imageData
    });
    
    await scan.save();
    console.log('Scan saved to history');
    res.json({ success: true, scanId: scan._id });
  } catch (error: any) {
    console.error("Save scan error:", error);
    res.status(500).json({ error: "Failed to save scan: " + error.message });
  }
};

export const getHistory = async (req: any, res: any) => {
  try {
    const history = await Scan.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(history);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
