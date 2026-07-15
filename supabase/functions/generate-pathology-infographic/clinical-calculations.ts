/**
 * Clinical Calculations Module for Smart Reports
 *
 * Contains 20 individual clinical indices and 12 composite health scores
 * for longevity reports. All calculations gracefully handle missing inputs.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PatientBiometrics {
  anthropometry?: {
    height_cm?: number;
    weight_kg?: number;
  };
  vital_signs?: {
    systolic_bp?: number;
    diastolic_bp?: number;
    pulse_rate?: number;
  };
  lifestyle?: {
    smoking_status?: 'never' | 'former' | 'current';
    smokeless_tobacco?: 'never' | 'former' | 'current';
    alcohol_consumption?: 'never' | 'occasional' | 'regular';
  };
  medical_history?: {
    diabetes?: boolean;
    hypertension?: boolean;
    dyslipidemia?: boolean;
    thyroid_disorder?: boolean;
    heart_disease?: boolean;
    kidney_disease?: boolean;
  };
  family_history?: {
    diabetes?: boolean;
    heart_disease?: boolean;
    hypertension?: boolean;
    stroke?: boolean;
    cancer?: boolean;
  };
}

export interface ExtractedLabValues {
  // CBC / Hematology
  hemoglobin?: number;
  rbc?: number;
  wbc?: number;
  platelets?: number;
  mcv?: number;
  mch?: number;
  mchc?: number;
  rdw?: number;
  neutrophils?: number;
  lymphocytes?: number;
  monocytes?: number;
  eosinophils?: number;
  basophils?: number;
  hematocrit?: number;

  // Renal
  creatinine?: number;
  bun?: number;
  urea?: number;
  uric_acid?: number;

  // Liver
  ast?: number; // SGOT
  alt?: number; // SGPT
  alp?: number;
  ggt?: number;
  bilirubin_total?: number;
  bilirubin_direct?: number;
  albumin?: number;
  total_protein?: number;

  // Lipids
  total_cholesterol?: number;
  hdl?: number;
  ldl?: number;
  vldl?: number;
  triglycerides?: number;

  // Metabolic
  fasting_glucose?: number;
  random_glucose?: number;
  hba1c?: number;
  insulin?: number;

  // Iron Studies
  iron?: number;
  ferritin?: number;
  tibc?: number;
  transferrin_saturation?: number;

  // Vitamins
  vitamin_d?: number;
  vitamin_b12?: number;
  folate?: number;

  // Minerals
  calcium?: number;
  phosphorus?: number;
  magnesium?: number;
  sodium?: number;
  potassium?: number;
  chloride?: number;

  // Inflammatory
  crp?: number;
  esr?: number;

  // Thyroid
  tsh?: number;
  t3?: number;
  t4?: number;
  free_t3?: number;
  free_t4?: number;

  // Patient info
  age?: number;
  sex?: 'Male' | 'Female';
}

export interface CalculatedIndex {
  name: string;
  value: number | string;
  unit?: string;
  interpretation: string;
  category: string;
  status: 'optimal' | 'borderline' | 'elevated' | 'low' | 'high' | 'normal' | 'not_calculated';
  reference_range?: string;
  formula?: string;
}

export interface CompositeScore {
  name: string;
  emoji: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';
  interpretation: string;
  factors_used: string[];
  factors_missing: string[];
  recommendations: string[];
}

export interface CalculatedIndices {
  individual_indices: CalculatedIndex[];
  composite_scores: CompositeScore[];
  biological_age_estimate?: {
    estimated_age: number;
    chronological_age: number;
    age_difference: number;
    interpretation: string;
  };
  longevity_score?: {
    score: number;
    percentile?: number;
    interpretation: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function notCalculated(name: string, category: string, reason: string): CalculatedIndex {
  return {
    name,
    value: 'N/A',
    interpretation: `Not calculated: ${reason}`,
    category,
    status: 'not_calculated',
  };
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ============================================================================
// INDIVIDUAL CLINICAL INDICES (20 calculations)
// ============================================================================

// 1. BMI
export function calculateBMI(bio: PatientBiometrics): CalculatedIndex {
  const height = bio.anthropometry?.height_cm;
  const weight = bio.anthropometry?.weight_kg;

  if (!height || !weight) {
    return notCalculated('BMI', 'Body Composition', 'Height and/or weight not provided');
  }

  const heightM = height / 100;
  const bmi = round(weight / (heightM * heightM), 1);

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (bmi < 18.5) {
    status = 'low';
    interpretation = 'Underweight';
  } else if (bmi < 25) {
    status = 'optimal';
    interpretation = 'Normal weight';
  } else if (bmi < 30) {
    status = 'borderline';
    interpretation = 'Overweight';
  } else {
    status = 'high';
    interpretation = 'Obese';
  }

  return {
    name: 'BMI',
    value: bmi,
    unit: 'kg/m²',
    interpretation,
    category: 'Body Composition',
    status,
    reference_range: '18.5 - 24.9',
    formula: 'Weight (kg) / Height (m)²',
  };
}

// 2. BSA (Body Surface Area) - DuBois formula
export function calculateBSA(bio: PatientBiometrics): CalculatedIndex {
  const height = bio.anthropometry?.height_cm;
  const weight = bio.anthropometry?.weight_kg;

  if (!height || !weight) {
    return notCalculated('BSA', 'Body Composition', 'Height and/or weight not provided');
  }

  const bsa = round(0.007184 * Math.pow(height, 0.725) * Math.pow(weight, 0.425), 2);

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = `Body surface area: ${bsa} m²`;

  if (bsa < 1.5) {
    interpretation += ' (below average)';
  } else if (bsa > 2.2) {
    interpretation += ' (above average)';
  } else {
    status = 'optimal';
    interpretation += ' (within normal range)';
  }

  return {
    name: 'BSA (Body Surface Area)',
    value: bsa,
    unit: 'm²',
    interpretation,
    category: 'Body Composition',
    status,
    reference_range: '1.5 - 2.2',
    formula: '0.007184 × Height^0.725 × Weight^0.425',
  };
}

// 3. Creatinine Clearance (Cockcroft-Gault)
export function calculateCreatinineClearance(lab: ExtractedLabValues, bio: PatientBiometrics): CalculatedIndex {
  const age = lab.age;
  const weight = bio.anthropometry?.weight_kg;
  const creatinine = lab.creatinine;
  const sex = lab.sex;

  if (!age || !weight || !creatinine) {
    return notCalculated('Creatinine Clearance', 'Renal Function', 'Age, weight, or creatinine not available');
  }

  let crcl = ((140 - age) * weight) / (72 * creatinine);
  if (sex === 'Female') {
    crcl *= 0.85;
  }
  crcl = round(crcl, 1);

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (crcl >= 90) {
    status = 'optimal';
    interpretation = 'Normal kidney function';
  } else if (crcl >= 60) {
    status = 'borderline';
    interpretation = 'Mildly reduced kidney function';
  } else if (crcl >= 30) {
    status = 'low';
    interpretation = 'Moderately reduced kidney function';
  } else {
    status = 'low';
    interpretation = 'Severely reduced kidney function';
  }

  return {
    name: 'Creatinine Clearance (CrCl)',
    value: crcl,
    unit: 'mL/min',
    interpretation,
    category: 'Renal Function',
    status,
    reference_range: '≥ 90',
    formula: '(140 - age) × weight / (72 × creatinine) [× 0.85 if female]',
  };
}

// 4. eGFR (CKD-EPI 2021)
export function calculateEGFR(lab: ExtractedLabValues): CalculatedIndex {
  const age = lab.age;
  const creatinine = lab.creatinine;
  const sex = lab.sex;

  if (!age || !creatinine) {
    return notCalculated('eGFR', 'Renal Function', 'Age or creatinine not available');
  }

  // CKD-EPI 2021 (race-free)
  const k = sex === 'Female' ? 0.7 : 0.9;
  const alpha = sex === 'Female' ? -0.241 : -0.302;
  const sexMultiplier = sex === 'Female' ? 1.012 : 1;

  const scrK = creatinine / k;
  const egfr = round(
    142 * Math.pow(Math.min(scrK, 1), alpha) * Math.pow(Math.max(scrK, 1), -1.200) * Math.pow(0.9938, age) * sexMultiplier,
    1
  );

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (egfr >= 90) {
    status = 'optimal';
    interpretation = 'Normal kidney function (Stage 1)';
  } else if (egfr >= 60) {
    status = 'borderline';
    interpretation = 'Mildly decreased (Stage 2)';
  } else if (egfr >= 45) {
    status = 'low';
    interpretation = 'Mild to moderate decrease (Stage 3a)';
  } else if (egfr >= 30) {
    status = 'low';
    interpretation = 'Moderate to severe decrease (Stage 3b)';
  } else if (egfr >= 15) {
    status = 'low';
    interpretation = 'Severely decreased (Stage 4)';
  } else {
    status = 'low';
    interpretation = 'Kidney failure (Stage 5)';
  }

  return {
    name: 'eGFR',
    value: egfr,
    unit: 'mL/min/1.73m²',
    interpretation,
    category: 'Renal Function',
    status,
    reference_range: '≥ 90',
    formula: 'CKD-EPI 2021 equation',
  };
}

// 5. CKD Stage
export function calculateCKDStage(lab: ExtractedLabValues): CalculatedIndex {
  const egfrResult = calculateEGFR(lab);
  if (egfrResult.status === 'not_calculated') {
    return notCalculated('CKD Stage', 'Renal Function', 'eGFR could not be calculated');
  }

  const egfr = egfrResult.value as number;
  let stage = '';
  let status: CalculatedIndex['status'] = 'normal';

  if (egfr >= 90) {
    stage = 'Stage 1 (Normal)';
    status = 'optimal';
  } else if (egfr >= 60) {
    stage = 'Stage 2 (Mild)';
    status = 'borderline';
  } else if (egfr >= 45) {
    stage = 'Stage 3a (Mild-Moderate)';
    status = 'low';
  } else if (egfr >= 30) {
    stage = 'Stage 3b (Moderate-Severe)';
    status = 'low';
  } else if (egfr >= 15) {
    stage = 'Stage 4 (Severe)';
    status = 'low';
  } else {
    stage = 'Stage 5 (Kidney Failure)';
    status = 'low';
  }

  return {
    name: 'CKD Stage',
    value: stage,
    interpretation: `Based on eGFR of ${egfr} mL/min/1.73m²`,
    category: 'Renal Function',
    status,
    reference_range: 'Stage 1 (eGFR ≥90)',
  };
}

// 6. BUN/Creatinine Ratio
export function calculateBUNCreatinineRatio(lab: ExtractedLabValues): CalculatedIndex {
  const bun = lab.bun;
  const creatinine = lab.creatinine;

  if (!bun || !creatinine) {
    return notCalculated('BUN/Creatinine Ratio', 'Renal Function', 'BUN or creatinine not available');
  }

  const ratio = round(bun / creatinine, 1);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (ratio < 10) {
    status = 'low';
    interpretation = 'Low ratio - possible liver disease, malnutrition, or low protein intake';
  } else if (ratio <= 20) {
    status = 'optimal';
    interpretation = 'Normal ratio';
  } else {
    status = 'high';
    interpretation = 'Elevated ratio - may indicate dehydration, GI bleeding, or high protein diet';
  }

  return {
    name: 'BUN/Creatinine Ratio',
    value: ratio,
    unit: ':1',
    interpretation,
    category: 'Renal Function',
    status,
    reference_range: '10 - 20',
    formula: 'BUN / Creatinine',
  };
}

// 7. AST/ALT Ratio (De Ritis Ratio)
export function calculateASTALTRatio(lab: ExtractedLabValues): CalculatedIndex {
  const ast = lab.ast;
  const alt = lab.alt;

  if (!ast || !alt) {
    return notCalculated('AST/ALT Ratio', 'Liver Function', 'AST or ALT not available');
  }

  const ratio = round(ast / alt, 2);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (ratio < 1) {
    status = 'optimal';
    interpretation = 'Ratio < 1 typically seen in non-alcoholic fatty liver or viral hepatitis';
  } else if (ratio < 2) {
    status = 'borderline';
    interpretation = 'Ratio 1-2 may suggest alcoholic liver disease';
  } else {
    status = 'high';
    interpretation = 'Ratio ≥ 2 often associated with alcoholic hepatitis or cirrhosis';
  }

  return {
    name: 'AST/ALT Ratio (De Ritis)',
    value: ratio,
    interpretation,
    category: 'Liver Function',
    status,
    reference_range: '< 1.0 (healthy liver)',
    formula: 'AST / ALT',
  };
}

// 8. FIB-4 Score (Liver Fibrosis)
export function calculateFIB4(lab: ExtractedLabValues): CalculatedIndex {
  const age = lab.age;
  const ast = lab.ast;
  const alt = lab.alt;
  const platelets = lab.platelets;

  if (!age || !ast || !alt || !platelets) {
    return notCalculated('FIB-4 Score', 'Liver Fibrosis', 'Age, AST, ALT, or platelets not available');
  }

  const fib4 = round((age * ast) / (platelets * Math.sqrt(alt)), 2);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (fib4 < 1.3) {
    status = 'optimal';
    interpretation = 'Low probability of advanced fibrosis';
  } else if (fib4 < 2.67) {
    status = 'borderline';
    interpretation = 'Indeterminate - further evaluation may be needed';
  } else {
    status = 'high';
    interpretation = 'High probability of advanced fibrosis';
  }

  return {
    name: 'FIB-4 Score',
    value: fib4,
    interpretation,
    category: 'Liver Fibrosis',
    status,
    reference_range: '< 1.3 (low risk)',
    formula: '(Age × AST) / (Platelets × √ALT)',
  };
}

// 9. Non-HDL Cholesterol
export function calculateNonHDLCholesterol(lab: ExtractedLabValues): CalculatedIndex {
  const totalChol = lab.total_cholesterol;
  const hdl = lab.hdl;

  if (!totalChol || !hdl) {
    return notCalculated('Non-HDL Cholesterol', 'Lipid Profile', 'Total cholesterol or HDL not available');
  }

  const nonHdl = round(totalChol - hdl, 0);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (nonHdl < 100) {
    status = 'optimal';
    interpretation = 'Optimal (very low CV risk)';
  } else if (nonHdl < 130) {
    status = 'normal';
    interpretation = 'Near optimal';
  } else if (nonHdl < 160) {
    status = 'borderline';
    interpretation = 'Borderline high';
  } else if (nonHdl < 190) {
    status = 'high';
    interpretation = 'High';
  } else {
    status = 'high';
    interpretation = 'Very high';
  }

  return {
    name: 'Non-HDL Cholesterol',
    value: nonHdl,
    unit: 'mg/dL',
    interpretation,
    category: 'Lipid Profile',
    status,
    reference_range: '< 130',
    formula: 'Total Cholesterol - HDL',
  };
}

// 10. Remnant Cholesterol
export function calculateRemnantCholesterol(lab: ExtractedLabValues): CalculatedIndex {
  const totalChol = lab.total_cholesterol;
  const hdl = lab.hdl;
  const ldl = lab.ldl;

  if (!totalChol || !hdl || !ldl) {
    return notCalculated('Remnant Cholesterol', 'Lipid Profile', 'Total cholesterol, HDL, or LDL not available');
  }

  const remnant = round(totalChol - hdl - ldl, 0);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (remnant < 23) {
    status = 'optimal';
    interpretation = 'Normal remnant cholesterol';
  } else if (remnant < 30) {
    status = 'borderline';
    interpretation = 'Borderline elevated';
  } else {
    status = 'high';
    interpretation = 'Elevated - increased cardiovascular risk';
  }

  return {
    name: 'Remnant Cholesterol',
    value: remnant,
    unit: 'mg/dL',
    interpretation,
    category: 'Lipid Profile',
    status,
    reference_range: '< 23',
    formula: 'Total Cholesterol - HDL - LDL',
  };
}

// 11. Atherogenic Index of Plasma (AIP)
export function calculateAIP(lab: ExtractedLabValues): CalculatedIndex {
  const tg = lab.triglycerides;
  const hdl = lab.hdl;

  if (!tg || !hdl) {
    return notCalculated('Atherogenic Index of Plasma', 'Cardiovascular Risk', 'Triglycerides or HDL not available');
  }

  // Convert to mmol/L if in mg/dL
  const tgMmol = tg / 88.57;
  const hdlMmol = hdl / 38.67;
  const aip = round(Math.log10(tgMmol / hdlMmol), 3);

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (aip < 0.1) {
    status = 'optimal';
    interpretation = 'Low cardiovascular risk';
  } else if (aip < 0.24) {
    status = 'borderline';
    interpretation = 'Intermediate cardiovascular risk';
  } else {
    status = 'high';
    interpretation = 'High cardiovascular risk';
  }

  return {
    name: 'Atherogenic Index of Plasma (AIP)',
    value: aip,
    interpretation,
    category: 'Cardiovascular Risk',
    status,
    reference_range: '< 0.1 (low risk)',
    formula: 'log₁₀(TG / HDL) [in mmol/L]',
  };
}

// 12. Triglyceride/HDL Ratio
export function calculateTGHDLRatio(lab: ExtractedLabValues): CalculatedIndex {
  const tg = lab.triglycerides;
  const hdl = lab.hdl;

  if (!tg || !hdl) {
    return notCalculated('TG/HDL Ratio', 'Cardiovascular Risk', 'Triglycerides or HDL not available');
  }

  const ratio = round(tg / hdl, 2);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (ratio < 2) {
    status = 'optimal';
    interpretation = 'Optimal - low insulin resistance risk';
  } else if (ratio < 3.5) {
    status = 'borderline';
    interpretation = 'Moderate - some insulin resistance possible';
  } else {
    status = 'high';
    interpretation = 'Elevated - higher insulin resistance and CV risk';
  }

  return {
    name: 'Triglyceride/HDL Ratio',
    value: ratio,
    interpretation,
    category: 'Cardiovascular Risk',
    status,
    reference_range: '< 2.0',
    formula: 'Triglycerides / HDL',
  };
}

// 13. TyG Index (Triglyceride-Glucose)
export function calculateTyGIndex(lab: ExtractedLabValues): CalculatedIndex {
  const tg = lab.triglycerides;
  const glucose = lab.fasting_glucose;

  if (!tg || !glucose) {
    return notCalculated('TyG Index', 'Metabolic', 'Triglycerides or fasting glucose not available');
  }

  // Formula: ln(TG × FBG / 2)
  const tyg = round(Math.log(tg * glucose / 2), 2);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (tyg < 8.5) {
    status = 'optimal';
    interpretation = 'Low insulin resistance';
  } else if (tyg < 9.0) {
    status = 'borderline';
    interpretation = 'Moderate insulin resistance';
  } else {
    status = 'high';
    interpretation = 'High insulin resistance - metabolic syndrome risk';
  }

  return {
    name: 'TyG Index',
    value: tyg,
    interpretation,
    category: 'Metabolic',
    status,
    reference_range: '< 8.5',
    formula: 'ln(Triglycerides × Fasting Glucose / 2)',
  };
}

// 14. Estimated Average Glucose (eAG)
export function calculateEAG(lab: ExtractedLabValues): CalculatedIndex {
  const hba1c = lab.hba1c;

  if (!hba1c) {
    return notCalculated('Estimated Average Glucose', 'Metabolic', 'HbA1c not available');
  }

  const eag = round(28.7 * hba1c - 46.7, 0);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (eag < 126) {
    status = 'optimal';
    interpretation = 'Normal average glucose';
  } else if (eag < 154) {
    status = 'borderline';
    interpretation = 'Pre-diabetes range';
  } else {
    status = 'high';
    interpretation = 'Diabetes range';
  }

  return {
    name: 'Estimated Average Glucose (eAG)',
    value: eag,
    unit: 'mg/dL',
    interpretation,
    category: 'Metabolic',
    status,
    reference_range: '< 126 (HbA1c < 6.0%)',
    formula: '28.7 × HbA1c - 46.7',
  };
}

// 15. Mentzer Index (Microcytic Anemia Differentiation)
export function calculateMentzerIndex(lab: ExtractedLabValues): CalculatedIndex {
  const mcv = lab.mcv;
  const rbc = lab.rbc;

  if (!mcv || !rbc) {
    return notCalculated('Mentzer Index', 'Hematology', 'MCV or RBC not available');
  }

  const mentzer = round(mcv / rbc, 1);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (mentzer < 13) {
    status = 'normal';
    interpretation = 'Suggests thalassemia trait (if anemia present)';
  } else {
    status = 'normal';
    interpretation = 'Suggests iron deficiency anemia (if anemia present)';
  }

  return {
    name: 'Mentzer Index',
    value: mentzer,
    interpretation,
    category: 'Hematology',
    status,
    reference_range: '< 13 (thalassemia), ≥ 13 (iron deficiency)',
    formula: 'MCV / RBC count',
  };
}

// 16. NLR (Neutrophil-Lymphocyte Ratio)
export function calculateNLR(lab: ExtractedLabValues): CalculatedIndex {
  const neutrophils = lab.neutrophils;
  const lymphocytes = lab.lymphocytes;

  if (!neutrophils || !lymphocytes) {
    return notCalculated('NLR', 'Inflammation', 'Neutrophils or lymphocytes not available');
  }

  const nlr = round(neutrophils / lymphocytes, 2);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (nlr < 3) {
    status = 'optimal';
    interpretation = 'Normal - low systemic inflammation';
  } else if (nlr < 5) {
    status = 'borderline';
    interpretation = 'Mildly elevated inflammation';
  } else {
    status = 'high';
    interpretation = 'Elevated - significant systemic inflammation';
  }

  return {
    name: 'NLR (Neutrophil-Lymphocyte Ratio)',
    value: nlr,
    interpretation,
    category: 'Inflammation',
    status,
    reference_range: '< 3.0',
    formula: 'Neutrophils / Lymphocytes',
  };
}

// 17. PLR (Platelet-Lymphocyte Ratio)
export function calculatePLR(lab: ExtractedLabValues): CalculatedIndex {
  const platelets = lab.platelets;
  const lymphocytes = lab.lymphocytes;

  if (!platelets || !lymphocytes) {
    return notCalculated('PLR', 'Inflammation', 'Platelets or lymphocytes not available');
  }

  const plr = round(platelets / lymphocytes, 0);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (plr < 150) {
    status = 'optimal';
    interpretation = 'Normal range';
  } else if (plr < 250) {
    status = 'borderline';
    interpretation = 'Mildly elevated - monitor for inflammation';
  } else {
    status = 'high';
    interpretation = 'Elevated - may indicate chronic inflammation';
  }

  return {
    name: 'PLR (Platelet-Lymphocyte Ratio)',
    value: plr,
    interpretation,
    category: 'Inflammation',
    status,
    reference_range: '< 150',
    formula: 'Platelets / Lymphocytes',
  };
}

// 18. SII (Systemic Immune-Inflammation Index)
export function calculateSII(lab: ExtractedLabValues): CalculatedIndex {
  const platelets = lab.platelets;
  const neutrophils = lab.neutrophils;
  const lymphocytes = lab.lymphocytes;

  if (!platelets || !neutrophils || !lymphocytes) {
    return notCalculated('SII', 'Inflammation', 'Platelets, neutrophils, or lymphocytes not available');
  }

  const sii = round((platelets * neutrophils) / lymphocytes, 0);
  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (sii < 500) {
    status = 'optimal';
    interpretation = 'Low systemic inflammation';
  } else if (sii < 900) {
    status = 'borderline';
    interpretation = 'Moderate systemic inflammation';
  } else {
    status = 'high';
    interpretation = 'High systemic inflammation';
  }

  return {
    name: 'SII (Systemic Immune-Inflammation Index)',
    value: sii,
    interpretation,
    category: 'Inflammation',
    status,
    reference_range: '< 500',
    formula: '(Platelets × Neutrophils) / Lymphocytes',
  };
}

// 19. Biological Age Estimate
export function calculateBiologicalAge(lab: ExtractedLabValues, bio: PatientBiometrics): CalculatedIndex {
  const age = lab.age;
  if (!age) {
    return notCalculated('Biological Age', 'Longevity', 'Chronological age not available');
  }

  let ageModifier = 0;
  let factorsConsidered = 0;

  // BMI impact
  const bmiResult = calculateBMI(bio);
  if (bmiResult.status !== 'not_calculated') {
    factorsConsidered++;
    const bmi = bmiResult.value as number;
    if (bmi >= 25 && bmi < 30) ageModifier += 1;
    else if (bmi >= 30 && bmi < 35) ageModifier += 3;
    else if (bmi >= 35) ageModifier += 5;
    else if (bmi < 18.5) ageModifier += 1;
  }

  // Blood pressure
  if (bio.vital_signs?.systolic_bp) {
    factorsConsidered++;
    const sbp = bio.vital_signs.systolic_bp;
    if (sbp >= 140) ageModifier += 3;
    else if (sbp >= 130) ageModifier += 1;
    else if (sbp < 90) ageModifier += 1;
  }

  // Smoking
  if (bio.lifestyle?.smoking_status) {
    factorsConsidered++;
    if (bio.lifestyle.smoking_status === 'current') ageModifier += 5;
    else if (bio.lifestyle.smoking_status === 'former') ageModifier += 2;
  }

  // Glucose/HbA1c
  if (lab.hba1c) {
    factorsConsidered++;
    if (lab.hba1c >= 6.5) ageModifier += 4;
    else if (lab.hba1c >= 5.7) ageModifier += 2;
  }

  // Lipids
  if (lab.ldl) {
    factorsConsidered++;
    if (lab.ldl >= 160) ageModifier += 2;
    else if (lab.ldl >= 130) ageModifier += 1;
  }

  // Kidney function
  const egfrResult = calculateEGFR(lab);
  if (egfrResult.status !== 'not_calculated') {
    factorsConsidered++;
    const egfr = egfrResult.value as number;
    if (egfr < 60) ageModifier += 4;
    else if (egfr < 90) ageModifier += 1;
  }

  // Inflammation
  const nlrResult = calculateNLR(lab);
  if (nlrResult.status !== 'not_calculated') {
    factorsConsidered++;
    const nlr = nlrResult.value as number;
    if (nlr >= 5) ageModifier += 2;
    else if (nlr >= 3) ageModifier += 1;
  }

  if (factorsConsidered < 3) {
    return notCalculated('Biological Age', 'Longevity', 'Insufficient data for reliable estimate');
  }

  const biologicalAge = round(age + ageModifier, 0);
  const ageDiff = ageModifier;

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (ageDiff <= 0) {
    status = 'optimal';
    interpretation = `Biological age appears ${Math.abs(ageDiff)} years younger than chronological age`;
  } else if (ageDiff <= 3) {
    status = 'normal';
    interpretation = 'Biological age is close to chronological age';
  } else if (ageDiff <= 6) {
    status = 'borderline';
    interpretation = `Biological age appears ${ageDiff} years older - room for improvement`;
  } else {
    status = 'high';
    interpretation = `Biological age appears ${ageDiff} years older - lifestyle modifications recommended`;
  }

  return {
    name: 'Biological Age Estimate',
    value: biologicalAge,
    unit: 'years',
    interpretation: `${interpretation} (based on ${factorsConsidered} health factors)`,
    category: 'Longevity',
    status,
    reference_range: `≤ ${age} years`,
  };
}

// 20. Longevity Score (0-100)
export function calculateLongevityScore(lab: ExtractedLabValues, bio: PatientBiometrics): CalculatedIndex {
  let score = 100;
  let factorsConsidered = 0;
  const deductions: string[] = [];

  // BMI
  const bmiResult = calculateBMI(bio);
  if (bmiResult.status !== 'not_calculated') {
    factorsConsidered++;
    const bmi = bmiResult.value as number;
    if (bmi >= 30) { score -= 10; deductions.push('BMI ≥30'); }
    else if (bmi >= 25) { score -= 5; deductions.push('BMI 25-30'); }
    else if (bmi < 18.5) { score -= 5; deductions.push('BMI <18.5'); }
  }

  // Blood Pressure
  if (bio.vital_signs?.systolic_bp) {
    factorsConsidered++;
    const sbp = bio.vital_signs.systolic_bp;
    if (sbp >= 160) { score -= 15; deductions.push('BP ≥160'); }
    else if (sbp >= 140) { score -= 10; deductions.push('BP 140-159'); }
    else if (sbp >= 130) { score -= 5; deductions.push('BP 130-139'); }
  }

  // Smoking
  if (bio.lifestyle?.smoking_status) {
    factorsConsidered++;
    if (bio.lifestyle.smoking_status === 'current') { score -= 15; deductions.push('Current smoker'); }
    else if (bio.lifestyle.smoking_status === 'former') { score -= 5; deductions.push('Former smoker'); }
  }

  // HbA1c/Glucose
  if (lab.hba1c) {
    factorsConsidered++;
    if (lab.hba1c >= 8) { score -= 15; deductions.push('HbA1c ≥8'); }
    else if (lab.hba1c >= 6.5) { score -= 10; deductions.push('HbA1c 6.5-8'); }
    else if (lab.hba1c >= 5.7) { score -= 3; deductions.push('HbA1c 5.7-6.4'); }
  }

  // LDL
  if (lab.ldl) {
    factorsConsidered++;
    if (lab.ldl >= 190) { score -= 10; deductions.push('LDL ≥190'); }
    else if (lab.ldl >= 160) { score -= 7; deductions.push('LDL 160-189'); }
    else if (lab.ldl >= 130) { score -= 3; deductions.push('LDL 130-159'); }
  }

  // HDL (bonus for good)
  if (lab.hdl) {
    factorsConsidered++;
    if (lab.hdl >= 60) { score += 3; } // Bonus
    else if (lab.hdl < 40) { score -= 8; deductions.push('HDL <40'); }
  }

  // Triglycerides
  if (lab.triglycerides) {
    factorsConsidered++;
    if (lab.triglycerides >= 500) { score -= 10; deductions.push('TG ≥500'); }
    else if (lab.triglycerides >= 200) { score -= 5; deductions.push('TG 200-499'); }
    else if (lab.triglycerides >= 150) { score -= 2; deductions.push('TG 150-199'); }
  }

  // eGFR
  const egfrResult = calculateEGFR(lab);
  if (egfrResult.status !== 'not_calculated') {
    factorsConsidered++;
    const egfr = egfrResult.value as number;
    if (egfr < 30) { score -= 15; deductions.push('eGFR <30'); }
    else if (egfr < 60) { score -= 10; deductions.push('eGFR 30-59'); }
    else if (egfr < 90) { score -= 3; deductions.push('eGFR 60-89'); }
  }

  // Liver (AST/ALT)
  if (lab.ast && lab.alt) {
    factorsConsidered++;
    if (lab.ast > 100 || lab.alt > 100) { score -= 8; deductions.push('Elevated liver enzymes'); }
    else if (lab.ast > 40 || lab.alt > 45) { score -= 3; deductions.push('Mildly elevated liver enzymes'); }
  }

  // Inflammation (NLR)
  const nlrResult = calculateNLR(lab);
  if (nlrResult.status !== 'not_calculated') {
    factorsConsidered++;
    const nlr = nlrResult.value as number;
    if (nlr >= 5) { score -= 8; deductions.push('NLR ≥5'); }
    else if (nlr >= 3) { score -= 3; deductions.push('NLR 3-5'); }
  }

  // Medical history penalties
  if (bio.medical_history?.heart_disease) { score -= 10; deductions.push('Heart disease history'); factorsConsidered++; }
  if (bio.medical_history?.kidney_disease) { score -= 8; deductions.push('Kidney disease history'); factorsConsidered++; }
  if (bio.medical_history?.diabetes) { score -= 5; deductions.push('Diabetes history'); factorsConsidered++; }

  // Family history (smaller impact)
  if (bio.family_history?.heart_disease) { score -= 3; deductions.push('Family history: heart disease'); factorsConsidered++; }
  if (bio.family_history?.stroke) { score -= 2; deductions.push('Family history: stroke'); factorsConsidered++; }
  if (bio.family_history?.cancer) { score -= 2; deductions.push('Family history: cancer'); factorsConsidered++; }

  if (factorsConsidered < 5) {
    return notCalculated('Longevity Score', 'Longevity', 'Insufficient data for reliable score');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let status: CalculatedIndex['status'] = 'normal';
  let interpretation = '';

  if (score >= 90) {
    status = 'optimal';
    interpretation = 'Excellent longevity profile';
  } else if (score >= 75) {
    status = 'normal';
    interpretation = 'Good longevity profile with minor areas to improve';
  } else if (score >= 60) {
    status = 'borderline';
    interpretation = 'Moderate longevity profile - attention needed';
  } else if (score >= 40) {
    status = 'low';
    interpretation = 'Below average - significant lifestyle changes recommended';
  } else {
    status = 'low';
    interpretation = 'Low score - urgent attention to health factors needed';
  }

  const deductionSummary = deductions.length > 0
    ? `. Key factors: ${deductions.slice(0, 5).join(', ')}${deductions.length > 5 ? ` and ${deductions.length - 5} more` : ''}`
    : '';

  return {
    name: 'Longevity Score',
    value: round(score, 0),
    unit: '/100',
    interpretation: `${interpretation}${deductionSummary}`,
    category: 'Longevity',
    status,
    reference_range: '≥ 75 (good), ≥ 90 (excellent)',
  };
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export function calculateAllIndices(lab: ExtractedLabValues, bio: PatientBiometrics): CalculatedIndex[] {
  return [
    calculateBMI(bio),
    calculateBSA(bio),
    calculateCreatinineClearance(lab, bio),
    calculateEGFR(lab),
    calculateCKDStage(lab),
    calculateBUNCreatinineRatio(lab),
    calculateASTALTRatio(lab),
    calculateFIB4(lab),
    calculateNonHDLCholesterol(lab),
    calculateRemnantCholesterol(lab),
    calculateAIP(lab),
    calculateTGHDLRatio(lab),
    calculateTyGIndex(lab),
    calculateEAG(lab),
    calculateMentzerIndex(lab),
    calculateNLR(lab),
    calculatePLR(lab),
    calculateSII(lab),
    calculateBiologicalAge(lab, bio),
    calculateLongevityScore(lab, bio),
  ];
}

// Filter out N/A calculations for display
export function getCalculatedIndices(lab: ExtractedLabValues, bio: PatientBiometrics): CalculatedIndex[] {
  return calculateAllIndices(lab, bio).filter(idx => idx.status !== 'not_calculated');
}
