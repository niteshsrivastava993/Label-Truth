import { User } from "../models/user.js";
import { Scan } from "../models/scan.js";
import cloudinary from "../lib/cloudinary.js";
import axios from "axios";

export const performScan = async (req: any, res: any) => {
  console.log('--- Scanning process started ---');
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

    // 2. Fetch image from Cloudinary as Buffer and convert to Base64
    // Using the user requested double-fetch pattern for maximum robustness.
    console.log("Step 2: Fetching image from Cloudinary for Gemini REST API...");
    let imageBase64: string;
    let imageMimeType: string;
    try {
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      imageBase64 = Buffer.from(imageResponse.data).toString('base64');
      imageMimeType = imageResponse.headers['content-type'] || req.file.mimetype;
      console.log('Image fetched and converted successfully.');
    } catch (fetchError: any) {
      console.error('Failed to fetch image from Cloudinary:', fetchError.message);
      throw new Error(`Image fetch error: ${fetchError.message}`);
    }

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

    // 4. Prepare Gemini direct REST API call
    console.log('Step 3: Preparing Gemini direct REST API call...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not defined in environment');

    // Using stable v1 endpoint and explicit flash model as requested.
    const GEMINI_REST_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

Return ONLY JSON with this format (No markdown blocks):
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

Begin analysis.`;

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
      ]
    };

    try {
      console.log("Step 4: Calling Gemini Direct REST API (stable v1)...");
      const geminiResponse = await axios.post(GEMINI_REST_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!geminiResponse.data || !geminiResponse.data.candidates || geminiResponse.data.candidates.length === 0) {
        console.error('Full response:', JSON.stringify(geminiResponse.data, null, 2));
        throw new Error("Invalid response from Gemini API: No candidates returned");
      }

      console.log('Gemini API call successful.');

      // 5. Parsing
      console.log('Step 5: Parsing AI response...');
      const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
      
      if (!responseText) {
        console.error('Parsed text is empty. Raw API Response structure:', JSON.stringify(geminiResponse.data, null, 2));
        throw new Error('AI analysis text not found in response payload');
      }

      // Extract JSON from text (handling potential markdown)
      let cleanedJsonText = responseText.replace(/^(^```json\s*|^```)|(```$)/g, '').trim();
      if(!cleanedJsonText || cleanedJsonText === '{}'){
         cleanedJsonText = '{"productName": "Unknown", "confidenceScore": 0, "safetyVerdict": "UNSAFE", "overallHealthScore": 0, "simpleExplanation": "AI failed to parse result", "simplifiedIngredients": []}';
      }

      let analysis;
      try {
        analysis = JSON.parse(cleanedJsonText);
        console.log('AI response parsed to JSON successfully.');
      } catch (e: any) {
        console.error("Failed to parse AI response JSON. Raw text:", responseText);
        return res.status(500).json({ error: "AI response was not valid JSON", raw: responseText });
      }

      // 6. Save to DB if Authenticated
      if (req.user) {
        try {
          const scan = new Scan({
            userId: req.user.userId,
            productName: analysis.productName,
            ingredients: (analysis.simplifiedIngredients || []).map((i: any) => i.scientificName).join(", "),
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
            simplifiedIngredients: (analysis.simplifiedIngredients || []).map((i: any) => ({
              ...i,
              name: i.scientificName,
              isHarmful: i.safetyLevel === 'Avoid'
            })),
            imageUrl: imageUrl
          });
          await scan.save();
          console.log('Scan saved to history');
        } catch (dbErr: any) {
          console.error("Database save failed:", dbErr.message);
        }
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
    console.error("--- GLOBAL PERFORM_SCAN ERROR ---");
    console.error(error.message);
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
