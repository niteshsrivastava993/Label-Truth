import { GoogleGenAI, Type } from "@google/genai";
import { User } from "../models/User";
import { Scan } from "../models/Scan";

export const performScan = async (req: any, res: any) => {
  // Frontend handles AI scanning now due to environment constraints.
  // This endpoint is legacy or can be used for fallback if API key is in environment.
  res.status(404).json({ error: "Please use frontend analysis" });
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
