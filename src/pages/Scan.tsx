import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Loader2, RotateCcw, AlertTriangle, CheckCircle2, Sparkles, History, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { scanService, profileService } from '../services/api';

export default function Scan() {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ 
    productName: string, 
    safetyVerdict: 'SAFE' | 'MODERATE' | 'UNSAFE', 
    overallHealthScore: number,
    simpleExplanation: string,
    criticalWarnings: string[],
    conditionImpact: Record<string, string>,
    marketingClaims: string,
    theReality: string,
    hiddenSugars: string[],
    harmfulChemicals: string[],
    isDeceptive: boolean,
    simplifiedIngredients: {
      scientificName: string,
      simpleName: string,
      whatItActuallyIs: string,
      safetyLevel: 'Safe' | 'Caution' | 'Avoid',
      isHarmful: boolean
    }[]
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryHint, setShowHistoryHint] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);

    // Analyze immediately
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // 1. Get user profile for context
      let healthConditions: string[] = [];
      let allergies: string[] = [];
      try {
        const profile = await profileService.getProfile();
        healthConditions = profile.healthConditions || [];
        allergies = profile.allergies || [];
      } catch (err) {
        console.warn('Could not fetch user profile for context, proceeding with generic analysis');
      }

      // 2. Initialize AI
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      
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

Output MUST be strictly JSON.`;

      // ... base64 conversion ...
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              safetyVerdict: { 
                type: Type.STRING,
                enum: ["SAFE", "MODERATE", "UNSAFE"]
              },
              overallHealthScore: { type: Type.NUMBER },
              simpleExplanation: { type: Type.STRING },
              criticalWarnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              conditionImpact: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING }
              },
              marketingClaims: { type: Type.STRING },
              theReality: { type: Type.STRING },
              hiddenSugars: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              harmfulChemicals: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              isDeceptive: { type: Type.BOOLEAN },
              simplifiedIngredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    scientificName: { type: Type.STRING },
                    simpleName: { type: Type.STRING },
                    whatItActuallyIs: { type: Type.STRING },
                    safetyLevel: { 
                      type: Type.STRING,
                      enum: ["Safe", "Caution", "Avoid"]
                    }
                  },
                  required: ["scientificName", "simpleName", "whatItActuallyIs", "safetyLevel"]
                }
              }
            },
            required: ["productName", "safetyVerdict", "overallHealthScore", "simpleExplanation", "criticalWarnings", "conditionImpact", "marketingClaims", "theReality", "hiddenSugars", "harmfulChemicals", "isDeceptive", "simplifiedIngredients"],
          },
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI engine");
      }

      const analysis = JSON.parse(response.text);
      
      if (analysis.confidenceScore < 0.4) {
        setError("Image quality is too low or label is partially hidden. Analysis might be inaccurate.");
      }

      // Map analysis to include isHarmful for existing UI expectations
      const processResult = {
        ...analysis,
        simplifiedIngredients: analysis.simplifiedIngredients.map((i: any) => ({
          ...i,
          isHarmful: i.safetyLevel === 'Avoid'
        }))
      };

      setResult(processResult);
      setShowHistoryHint(true);

      // 3. Save to history via backend (fire and forget)
      try {
        await scanService.saveResults(processResult, image || (await new Promise<string>(r => {
          const rd = new FileReader();
          rd.onloadend = () => r(rd.result as string);
          rd.readAsDataURL(file);
        })));
      } catch (saveErr) {
        console.warn('Failed to save to history:', saveErr);
      }

    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to analyze label. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const triggerCameraInput = () => cameraInputRef.current?.click();

  const reset = () => {
    setImage(null);
    setResult(null);
    setIsAnalyzing(false);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950">
      {/* Hidden Inputs */}
      <input 
        type="file" 
        accept="image/*"
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {!image ? (
        <div className="flex flex-col h-full">
          {/* Top 20% */}
          <div className="h-[20%] flex flex-col justify-center px-6">
            <h1 className="text-3xl font-bold text-white tracking-tight">Label Truth</h1>
            <p className="text-gray-400 text-sm">Scan labels to uncover the truth.</p>
          </div>

          {/* Middle 60% */}
          <div className="h-[60%] flex items-center justify-center px-6">
            <div className="grid grid-cols-2 gap-4 w-full">
              <motion.button
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={triggerCameraInput}
                className="aspect-square bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-white shadow-xl hover:bg-gray-800 transition-all"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/20">
                  <Camera size={32} className="text-white" />
                </div>
                <span className="font-semibold text-sm tracking-wide">Open Camera</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={triggerFileInput}
                className="aspect-square bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-white shadow-xl hover:bg-gray-800 transition-all"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-600/20">
                  <ImageIcon size={32} className="text-white" />
                </div>
                <span className="font-semibold text-sm tracking-wide">Import Image</span>
              </motion.button>
            </div>
          </div>

          {/* Bottom 20% - Space for Nav */}
          <div className="h-[20%]"></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto pb-24">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {result ? result.productName : 'Analysis'}
            </h1>
            {result && (
              <button onClick={reset} className="p-2 text-gray-500 hover:text-white transition-colors">
                <RotateCcw size={20} />
              </button>
            )}
          </header>

          <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shrink-0">
            <img 
              src={image} 
              alt="Scanned Label" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-white font-medium animate-pulse">AI is analyzing ingredients...</p>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
              >
                <AlertTriangle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Score & Verdict Card */}
                <div className={`p-6 rounded-3xl border flex flex-col items-center gap-4 text-center shadow-2xl relative overflow-hidden ${
                  result.safetyVerdict === 'SAFE' ? 'bg-green-500/5 border-green-500/20' :
                  result.safetyVerdict === 'MODERATE' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={100} />
                  </div>

                  <div className="flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mb-2 ${
                      result.overallHealthScore >= 7 ? 'border-green-500 text-green-500' :
                      result.overallHealthScore >= 4 ? 'border-amber-500 text-amber-500' :
                      'border-red-500 text-red-500'
                    }`}>
                      <span className="text-4xl font-black">{result.overallHealthScore}<span className="text-sm">/10</span></span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Overall Health Score</span>
                  </div>

                  <div>
                    <h3 className={`text-3xl font-black mb-2 tracking-tight ${
                      result.safetyVerdict === 'SAFE' ? 'text-green-400' :
                      result.safetyVerdict === 'MODERATE' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {result.safetyVerdict}
                    </h3>
                    <p className="text-gray-300 leading-relaxed max-w-xs">{result.simpleExplanation}</p>
                  </div>
                </div>

                {/* Critical Warnings */}
                {result.criticalWarnings.length > 0 && (
                  <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3 text-red-400">
                      <AlertTriangle size={18} />
                      <h4 className="text-sm font-bold uppercase tracking-wider">Critical Warnings</h4>
                    </div>
                    <ul className="space-y-1">
                      {result.criticalWarnings.map((warning, i) => (
                        <li key={i} className="text-xs text-red-300 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Condition Impact Analysis */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-2">Medical Profile Impact</h4>
                  <div className="space-y-2">
                    {Object.entries(result.conditionImpact).map(([condition, impact], i) => (
                      <div key={i} className="p-4 rounded-2xl bg-gray-900 border border-gray-800">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">{condition}</div>
                        <p className="text-gray-300 text-xs leading-relaxed">{impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Marketing Audit Section */}
                <div className={`p-6 rounded-3xl border shadow-2xl relative overflow-hidden transition-all ${
                  result.isDeceptive ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={20} className={result.isDeceptive ? 'text-red-400' : 'text-green-400'} />
                    <h4 className="text-sm font-bold uppercase tracking-widest text-white">Marketing Gimmick Auditor</h4>
                    {result.isDeceptive && (
                      <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded uppercase">Deceptive</span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Likely Claims</span>
                      <p className="text-white font-medium">{result.marketingClaims}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">The Reality</span>
                      <p className="text-gray-200 text-sm leading-relaxed">{result.theReality}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {result.hiddenSugars.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Hidden Sugars</span>
                          <div className="flex flex-wrap gap-1">
                            {result.hiddenSugars.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] border border-amber-500/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.harmfulChemicals.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Harmful Chemicals</span>
                          <div className="flex flex-wrap gap-1">
                            {result.harmfulChemicals.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-[10px] border border-red-500/20">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consumer-Friendly Ingredient Decoder */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pl-2">
                    <BookOpen size={18} className="text-blue-400" />
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Label Truth Decoder</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {result.simplifiedIngredients.map((ing, i) => (
                      <div key={i} className={`p-5 rounded-3xl bg-gray-900 border transition-all hover:bg-gray-800/80 ${
                        ing.safetyLevel === 'Avoid' ? 'border-red-500/30' : 
                        ing.safetyLevel === 'Caution' ? 'border-amber-500/30' :
                        'border-gray-800'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Scientific Name</span>
                            <span className={`font-mono text-xs ${ing.safetyLevel === 'Avoid' ? 'text-red-400' : 'text-white'}`}>
                              {ing.scientificName}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            ing.safetyLevel === 'Avoid' ? 'bg-red-500/20 text-red-500' :
                            ing.safetyLevel === 'Caution' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-green-500/20 text-green-500'
                          }`}>
                            {ing.safetyLevel}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-px bg-gray-800 grow" />
                            <span className="text-[10px] font-black text-blue-500 uppercase italic">Truth Translation</span>
                            <div className="h-px bg-gray-800 grow" />
                          </div>
                          
                          <div>
                            <h5 className="text-white font-bold text-base mb-1">{ing.simpleName}</h5>
                            <p className="text-gray-400 text-xs leading-relaxed italic border-l-2 border-blue-500/30 pl-3">
                              "{ing.whatItActuallyIs}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {showHistoryHint && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/history')}
                    className="w-full p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center gap-3 hover:bg-blue-500/20 transition-all font-bold"
                  >
                    <History size={20} />
                    <span>Save to Health History</span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!result && !isAnalyzing && (
            <button 
              onClick={reset}
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors py-2"
            >
              <RotateCcw size={18} />
              <span className="text-sm font-medium">Start Over</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
