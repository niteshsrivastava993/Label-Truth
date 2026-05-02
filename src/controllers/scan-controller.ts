import { GoogleGenerativeAI } from "@google/generative-ai";
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

    // 2. Fetch image from Cloudinary as Buffer (Strict Rule #2)
    console.log("Step 2: Fetching image from Cloudinary for Gemini...");
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

    // 4. Initialize AI (Strict Rule #1)
    console.log("Step 3: Initializing Gemini with model 'gemini-1.5-pro'...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

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

    // 5. Generate Content (Strict Rule #3: Try/Catch with detailed logs)
    try {
      console.log("Calling Gemini API...");
      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType
          }
        },
        { text: prompt }
      ]);

      const response = await result.response;
      const text = response.text();
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
      console.error("--- GEMINI API ERROR DETAILS ---");
      if (geminiErr.response) {
        console.error("Status:", geminiErr.response.status);
        console.error("Data:", geminiErr.response.data);
      }
      console.error("Message:", geminiErr.message);
      console.error("Stack:", geminiErr.stack);
      throw geminiErr; // Rethrow to be caught by the outer catch
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
