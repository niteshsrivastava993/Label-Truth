import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { User } from "../models/User.js";
import { Scan } from "../models/Scan.js";
import cloudinary from "../lib/cloudinary.js";

export const performScan = async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // 1. Upload to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    console.log("Uploading image to Cloudinary...");
    const cloudinaryRes = await cloudinary.uploader.upload(dataURI, {
      folder: "label_truth_scans",
    });
    const imageUrl = cloudinaryRes.secure_url;

    // 2. Get User Profile for Context
    let healthConditions: string[] = [];
    let allergies: string[] = [];
    
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        healthConditions = user.healthConditions || [];
        allergies = user.allergies || [];
      }
    }

    // 3. Initialize AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: b64,
          mimeType: req.file.mimetype
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return res.status(500).json({ error: "AI response parsing failed" });
    }

    // 4. Save to DB if Authenticated
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

  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze product" });
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
