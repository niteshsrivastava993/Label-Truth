import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

export const analyzeLabel = async (base64Image: string, healthConditions: string[]) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured. Please set it in the Secrets panel.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
  const prompt = `
    Analyze this food label image for someone with these health conditions/preferences: ${healthConditions.join(", ")}.
    Identify the product name, ingredients, and provide a verdict based on the health conditions.
    
    STRICT VERDICT RULES:
    - Danger: For lethal ingredients or direct threats (e.g., Maltodextrin if the user is Diabetic).
    - Caution: For safe but artificial ingredients, moderate warnings, or highly processed items.
    - Safe: For 100% clean ingredients safe for the user's specific profile.

    The "detailedAnalysis" field MUST explain exactly why an ingredient is a threat to the user's specific profile with scientific reasoning.
    
    Return the response in this exact JSON format:
    {
      "productName": "string",
      "ingredients": "string",
      "verdict": "Safe" | "Caution" | "Danger",
      "summary": "string",
      "detailedAnalysis": "string"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          ingredients: { type: Type.STRING },
          verdict: { 
            type: Type.STRING,
            enum: ["Safe", "Caution", "Danger"]
          },
          summary: { type: Type.STRING },
          detailedAnalysis: { type: Type.STRING },
        },
        required: ["productName", "ingredients", "verdict", "summary", "detailedAnalysis"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Invalid response from AI");
  }
};
