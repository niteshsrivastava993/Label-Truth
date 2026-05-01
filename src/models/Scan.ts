import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productName: { type: String, required: true },
  ingredients: { type: String, required: true },
  verdict: { type: String, enum: ['Safe', 'Caution', 'Danger', 'SAFE', 'MODERATE', 'UNSAFE'], required: true },
  summary: { type: String },
  simpleExplanation: { type: String },
  detailedAnalysis: { type: String },
  healthScore: { type: Number },
  overallHealthScore: { type: Number },
  safetyVerdict: { type: String, enum: ['SAFE', 'MODERATE', 'UNSAFE'] },
  criticalWarnings: { type: [String] },
  conditionImpact: { type: Map, of: String },
  hiddenDangers: { type: [String] },
  allergensFound: { type: [String] },
  conditionSpecificAdvice: { type: String },
  marketingClaims: { type: String },
  theReality: { type: String },
  hiddenSugars: { type: [String] },
  harmfulChemicals: { type: [String] },
  isDeceptive: { type: Boolean },
  simplifiedIngredients: [{
    name: String,
    scientificName: String,
    simpleName: String,
    whatItActuallyIs: String,
    safetyLevel: { type: String, enum: ['Safe', 'Caution', 'Avoid'] },
    isHarmful: Boolean
  }],
  imageUrl: { type: String },
}, { timestamps: true, collection: 'scan_history' });

export const Scan = mongoose.model('Scan', scanSchema);
