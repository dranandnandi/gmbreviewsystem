/**
 * Composite Health Scores Module for Longevity Reports
 *
 * 12 high-impact composite scores that summarize multiple biomarkers
 * into easy-to-understand health domain scores.
 */

import type {
  ExtractedLabValues,
  PatientBiometrics,
  CompositeScore,
  CalculatedIndex,
} from './clinical-calculations.ts';

import {
  calculateBMI,
  calculateEGFR,
  calculateASTALTRatio,
  calculateFIB4,
  calculateNLR,
  calculatePLR,
  calculateSII,
  calculateTyGIndex,
  calculateAIP,
  calculateTGHDLRatio,
  calculateLongevityScore,
  calculateBiologicalAge,
} from './clinical-calculations.ts';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function round(value: number, decimals = 0): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function interpretationFromGrade(grade: string, domain: string): string {
  switch (grade) {
    case 'A':
      return `Excellent ${domain.toLowerCase()} - keep up the good work`;
    case 'B':
      return `Good ${domain.toLowerCase()} with minor areas to optimize`;
    case 'C':
      return `Average ${domain.toLowerCase()} - some attention needed`;
    case 'D':
      return `Below average ${domain.toLowerCase()} - improvements recommended`;
    case 'F':
      return `${domain} needs urgent attention - consult your doctor`;
    default:
      return `${domain} could not be fully assessed`;
  }
}

// ============================================================================
// 1. CARDIOVASCULAR HEALTH SCORE
// ============================================================================

export function calculateCardiovascularScore(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // Lipids (40 points)
  if (lab.ldl !== undefined) {
    factorsUsed.push('LDL');
    if (lab.ldl >= 190) { score -= 20; recommendations.push('Consider discussing statin therapy with your doctor'); }
    else if (lab.ldl >= 160) { score -= 15; }
    else if (lab.ldl >= 130) { score -= 8; }
    else if (lab.ldl >= 100) { score -= 3; }
  } else { factorsMissing.push('LDL'); }

  if (lab.hdl !== undefined) {
    factorsUsed.push('HDL');
    if (lab.hdl < 40) { score -= 12; recommendations.push('Increase exercise to boost HDL'); }
    else if (lab.hdl < 50) { score -= 6; }
    else if (lab.hdl >= 60) { score += 5; } // Bonus
  } else { factorsMissing.push('HDL'); }

  if (lab.triglycerides !== undefined) {
    factorsUsed.push('Triglycerides');
    if (lab.triglycerides >= 500) { score -= 15; recommendations.push('Reduce simple carbs and alcohol'); }
    else if (lab.triglycerides >= 200) { score -= 8; }
    else if (lab.triglycerides >= 150) { score -= 3; }
  } else { factorsMissing.push('Triglycerides'); }

  // Blood pressure (20 points)
  if (bio.vital_signs?.systolic_bp !== undefined) {
    factorsUsed.push('Blood Pressure');
    const sbp = bio.vital_signs.systolic_bp;
    if (sbp >= 180) { score -= 20; recommendations.push('Urgent: blood pressure needs immediate attention'); }
    else if (sbp >= 160) { score -= 15; recommendations.push('Reduce sodium intake and manage stress'); }
    else if (sbp >= 140) { score -= 10; }
    else if (sbp >= 130) { score -= 5; }
  } else { factorsMissing.push('Blood Pressure'); }

  // HbA1c/Glucose (15 points)
  if (lab.hba1c !== undefined) {
    factorsUsed.push('HbA1c');
    if (lab.hba1c >= 8) { score -= 15; }
    else if (lab.hba1c >= 6.5) { score -= 10; }
    else if (lab.hba1c >= 5.7) { score -= 4; }
  } else if (lab.fasting_glucose !== undefined) {
    factorsUsed.push('Fasting Glucose');
    if (lab.fasting_glucose >= 126) { score -= 12; }
    else if (lab.fasting_glucose >= 100) { score -= 5; }
  } else { factorsMissing.push('HbA1c/Glucose'); }

  // BMI (10 points)
  const bmiResult = calculateBMI(bio);
  if (bmiResult.status !== 'not_calculated') {
    factorsUsed.push('BMI');
    const bmi = bmiResult.value as number;
    if (bmi >= 35) { score -= 10; recommendations.push('Weight management important for heart health'); }
    else if (bmi >= 30) { score -= 7; }
    else if (bmi >= 25) { score -= 3; }
  } else { factorsMissing.push('BMI'); }

  // Smoking (15 points)
  if (bio.lifestyle?.smoking_status !== undefined) {
    factorsUsed.push('Smoking Status');
    if (bio.lifestyle.smoking_status === 'current') { score -= 15; recommendations.push('Quitting smoking is the best thing you can do for your heart'); }
    else if (bio.lifestyle.smoking_status === 'former') { score -= 5; }
  } else { factorsMissing.push('Smoking Status'); }

  // eGFR bonus consideration
  const egfrResult = calculateEGFR(lab);
  if (egfrResult.status !== 'not_calculated') {
    factorsUsed.push('Kidney Function (eGFR)');
    const egfr = egfrResult.value as number;
    if (egfr < 60) { score -= 10; }
    else if (egfr < 90) { score -= 3; }
  }

  if (factorsUsed.length < 3) {
    return {
      name: 'Cardiovascular Health Score',
      emoji: '❤️',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate cardiovascular score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Cardiovascular Health Score',
    emoji: '❤️',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Cardiovascular health'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 2. METABOLIC HEALTH SCORE
// ============================================================================

export function calculateMetabolicScore(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // Glucose/HbA1c (30 points)
  if (lab.hba1c !== undefined) {
    factorsUsed.push('HbA1c');
    if (lab.hba1c >= 9) { score -= 30; recommendations.push('Diabetes management needs attention'); }
    else if (lab.hba1c >= 7) { score -= 20; }
    else if (lab.hba1c >= 6.5) { score -= 12; }
    else if (lab.hba1c >= 5.7) { score -= 5; recommendations.push('Pre-diabetes range - lifestyle modifications recommended'); }
  } else { factorsMissing.push('HbA1c'); }

  if (lab.fasting_glucose !== undefined) {
    factorsUsed.push('Fasting Glucose');
    if (lab.fasting_glucose >= 200) { score -= 20; }
    else if (lab.fasting_glucose >= 126) { score -= 12; }
    else if (lab.fasting_glucose >= 100) { score -= 5; }
  }

  // Lipids (25 points)
  if (lab.triglycerides !== undefined) {
    factorsUsed.push('Triglycerides');
    if (lab.triglycerides >= 500) { score -= 15; }
    else if (lab.triglycerides >= 200) { score -= 8; }
    else if (lab.triglycerides >= 150) { score -= 3; }
  } else { factorsMissing.push('Triglycerides'); }

  if (lab.hdl !== undefined && lab.triglycerides !== undefined) {
    factorsUsed.push('TG/HDL Ratio');
    const ratio = lab.triglycerides / lab.hdl;
    if (ratio >= 4) { score -= 10; recommendations.push('Consider reducing refined carbohydrates'); }
    else if (ratio >= 3) { score -= 5; }
  }

  // Liver function (15 points)
  if (lab.alt !== undefined) {
    factorsUsed.push('ALT');
    if (lab.alt > 100) { score -= 10; }
    else if (lab.alt > 45) { score -= 5; }
  } else { factorsMissing.push('ALT'); }

  if (lab.ast !== undefined) {
    factorsUsed.push('AST');
    if (lab.ast > 100) { score -= 5; }
  }

  // BMI (20 points)
  const bmiResult = calculateBMI(bio);
  if (bmiResult.status !== 'not_calculated') {
    factorsUsed.push('BMI');
    const bmi = bmiResult.value as number;
    if (bmi >= 35) { score -= 20; recommendations.push('Metabolic health improves significantly with weight loss'); }
    else if (bmi >= 30) { score -= 12; }
    else if (bmi >= 25) { score -= 6; }
  } else { factorsMissing.push('BMI'); }

  // TyG Index
  const tygResult = calculateTyGIndex(lab);
  if (tygResult.status !== 'not_calculated') {
    factorsUsed.push('TyG Index');
    const tyg = tygResult.value as number;
    if (tyg >= 9) { score -= 10; recommendations.push('High insulin resistance - discuss with your doctor'); }
    else if (tyg >= 8.5) { score -= 5; }
  }

  if (factorsUsed.length < 3) {
    return {
      name: 'Metabolic Health Score',
      emoji: '🩸',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate metabolic score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Metabolic Health Score',
    emoji: '🩸',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Metabolic health'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 3. KIDNEY HEALTH SCORE
// ============================================================================

export function calculateKidneyScore(lab: ExtractedLabValues, _bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // eGFR (40 points)
  const egfrResult = calculateEGFR(lab);
  if (egfrResult.status !== 'not_calculated') {
    factorsUsed.push('eGFR');
    const egfr = egfrResult.value as number;
    if (egfr < 15) { score -= 40; recommendations.push('Urgent: kidney specialist consultation needed'); }
    else if (egfr < 30) { score -= 30; }
    else if (egfr < 45) { score -= 20; }
    else if (egfr < 60) { score -= 12; recommendations.push('Monitor kidney function regularly'); }
    else if (egfr < 90) { score -= 5; }
  } else { factorsMissing.push('eGFR'); }

  // Creatinine (20 points)
  if (lab.creatinine !== undefined) {
    factorsUsed.push('Creatinine');
    // Using typical reference: Male < 1.2, Female < 1.0
    const threshold = lab.sex === 'Female' ? 1.0 : 1.2;
    if (lab.creatinine > threshold * 2) { score -= 20; }
    else if (lab.creatinine > threshold * 1.5) { score -= 12; }
    else if (lab.creatinine > threshold) { score -= 5; }
  } else { factorsMissing.push('Creatinine'); }

  // BUN/Urea (15 points)
  if (lab.bun !== undefined) {
    factorsUsed.push('BUN');
    if (lab.bun > 40) { score -= 15; }
    else if (lab.bun > 25) { score -= 8; }
    else if (lab.bun > 20) { score -= 3; }
  } else { factorsMissing.push('BUN'); }

  // Uric Acid (10 points)
  if (lab.uric_acid !== undefined) {
    factorsUsed.push('Uric Acid');
    const threshold = lab.sex === 'Female' ? 6.0 : 7.0;
    if (lab.uric_acid > threshold + 2) { score -= 10; recommendations.push('High uric acid - reduce purine-rich foods'); }
    else if (lab.uric_acid > threshold) { score -= 5; }
  }

  // Electrolytes (15 points)
  if (lab.potassium !== undefined) {
    factorsUsed.push('Potassium');
    if (lab.potassium > 5.5 || lab.potassium < 3.5) { score -= 10; }
    else if (lab.potassium > 5.0 || lab.potassium < 3.8) { score -= 5; }
  }

  if (lab.sodium !== undefined) {
    factorsUsed.push('Sodium');
    if (lab.sodium < 130 || lab.sodium > 150) { score -= 8; }
    else if (lab.sodium < 135 || lab.sodium > 145) { score -= 3; }
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Kidney Health Score',
      emoji: '🧬',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate kidney health score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Kidney Health Score',
    emoji: '🧬',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Kidney health'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 4. LIVER HEALTH SCORE
// ============================================================================

export function calculateLiverScore(lab: ExtractedLabValues, _bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // AST (20 points)
  if (lab.ast !== undefined) {
    factorsUsed.push('AST');
    if (lab.ast > 200) { score -= 20; recommendations.push('Significantly elevated AST - liver evaluation needed'); }
    else if (lab.ast > 100) { score -= 12; }
    else if (lab.ast > 40) { score -= 5; }
  } else { factorsMissing.push('AST'); }

  // ALT (20 points)
  if (lab.alt !== undefined) {
    factorsUsed.push('ALT');
    if (lab.alt > 200) { score -= 20; }
    else if (lab.alt > 100) { score -= 12; }
    else if (lab.alt > 45) { score -= 5; recommendations.push('Slightly elevated ALT - consider reducing alcohol and fatty foods'); }
  } else { factorsMissing.push('ALT'); }

  // ALP (15 points)
  if (lab.alp !== undefined) {
    factorsUsed.push('ALP');
    if (lab.alp > 200) { score -= 15; }
    else if (lab.alp > 130) { score -= 8; }
  }

  // GGT (15 points)
  if (lab.ggt !== undefined) {
    factorsUsed.push('GGT');
    const threshold = lab.sex === 'Female' ? 38 : 55;
    if (lab.ggt > threshold * 3) { score -= 15; recommendations.push('Elevated GGT - consider liver ultrasound'); }
    else if (lab.ggt > threshold * 2) { score -= 10; }
    else if (lab.ggt > threshold) { score -= 5; }
  }

  // Bilirubin (15 points)
  if (lab.bilirubin_total !== undefined) {
    factorsUsed.push('Bilirubin');
    if (lab.bilirubin_total > 3) { score -= 15; }
    else if (lab.bilirubin_total > 1.5) { score -= 8; }
    else if (lab.bilirubin_total > 1.2) { score -= 3; }
  }

  // Albumin (15 points)
  if (lab.albumin !== undefined) {
    factorsUsed.push('Albumin');
    if (lab.albumin < 2.5) { score -= 15; }
    else if (lab.albumin < 3.5) { score -= 8; }
  }

  // FIB-4 Score
  const fib4Result = calculateFIB4(lab);
  if (fib4Result.status !== 'not_calculated') {
    factorsUsed.push('FIB-4 Score');
    const fib4 = fib4Result.value as number;
    if (fib4 >= 2.67) { score -= 15; recommendations.push('FIB-4 suggests possible fibrosis - discuss with hepatologist'); }
    else if (fib4 >= 1.3) { score -= 5; }
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Liver Health Score',
      emoji: '🧪',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate liver health score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Liver Health Score',
    emoji: '🧪',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Liver health'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 5. INFLAMMATION SCORE
// ============================================================================

export function calculateInflammationScore(lab: ExtractedLabValues, _bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // NLR (25 points)
  const nlrResult = calculateNLR(lab);
  if (nlrResult.status !== 'not_calculated') {
    factorsUsed.push('NLR');
    const nlr = nlrResult.value as number;
    if (nlr >= 6) { score -= 25; recommendations.push('High inflammation - discuss anti-inflammatory diet with doctor'); }
    else if (nlr >= 4) { score -= 15; }
    else if (nlr >= 3) { score -= 8; }
  } else { factorsMissing.push('NLR'); }

  // PLR (20 points)
  const plrResult = calculatePLR(lab);
  if (plrResult.status !== 'not_calculated') {
    factorsUsed.push('PLR');
    const plr = plrResult.value as number;
    if (plr >= 300) { score -= 20; }
    else if (plr >= 200) { score -= 10; }
    else if (plr >= 150) { score -= 5; }
  }

  // SII (25 points)
  const siiResult = calculateSII(lab);
  if (siiResult.status !== 'not_calculated') {
    factorsUsed.push('SII');
    const sii = siiResult.value as number;
    if (sii >= 1200) { score -= 25; }
    else if (sii >= 900) { score -= 15; }
    else if (sii >= 500) { score -= 8; }
  }

  // CRP (20 points)
  if (lab.crp !== undefined) {
    factorsUsed.push('CRP');
    if (lab.crp > 10) { score -= 20; recommendations.push('High CRP indicates significant inflammation'); }
    else if (lab.crp > 3) { score -= 12; }
    else if (lab.crp > 1) { score -= 5; }
  } else { factorsMissing.push('CRP'); }

  // ESR (10 points)
  if (lab.esr !== undefined) {
    factorsUsed.push('ESR');
    const threshold = lab.sex === 'Female' ? 20 : 15;
    if (lab.esr > threshold * 3) { score -= 10; }
    else if (lab.esr > threshold * 2) { score -= 5; }
    else if (lab.esr > threshold) { score -= 2; }
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Inflammation Score',
      emoji: '🛡️',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate inflammation score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Inflammation Score',
    emoji: '🛡️',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Inflammation profile'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 6. ANEMIA & BLOOD HEALTH SCORE
// ============================================================================

export function calculateAnemiaScore(lab: ExtractedLabValues, _bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // Hemoglobin (35 points)
  if (lab.hemoglobin !== undefined) {
    factorsUsed.push('Hemoglobin');
    const threshold = lab.sex === 'Female' ? 12 : 13;
    if (lab.hemoglobin < threshold - 4) { score -= 35; recommendations.push('Severe anemia - needs urgent evaluation'); }
    else if (lab.hemoglobin < threshold - 2) { score -= 20; recommendations.push('Moderate anemia - discuss iron supplements'); }
    else if (lab.hemoglobin < threshold) { score -= 10; }
    else if (lab.hemoglobin > 17) { score -= 8; }
  } else { factorsMissing.push('Hemoglobin'); }

  // RBC (15 points)
  if (lab.rbc !== undefined) {
    factorsUsed.push('RBC');
    const threshold = lab.sex === 'Female' ? 4.0 : 4.5;
    if (lab.rbc < threshold - 1) { score -= 15; }
    else if (lab.rbc < threshold) { score -= 5; }
  }

  // MCV (10 points)
  if (lab.mcv !== undefined) {
    factorsUsed.push('MCV');
    if (lab.mcv < 70) { score -= 10; recommendations.push('Microcytic anemia - check iron and hemoglobin variants'); }
    else if (lab.mcv < 80) { score -= 5; }
    else if (lab.mcv > 100) { score -= 8; recommendations.push('Macrocytic anemia - check B12 and folate'); }
  }

  // Iron Studies (20 points)
  if (lab.ferritin !== undefined) {
    factorsUsed.push('Ferritin');
    if (lab.ferritin < 15) { score -= 15; recommendations.push('Low ferritin - iron supplementation likely needed'); }
    else if (lab.ferritin < 30) { score -= 8; }
    else if (lab.ferritin > 500) { score -= 10; recommendations.push('Very high ferritin - may need evaluation'); }
  } else { factorsMissing.push('Ferritin'); }

  if (lab.iron !== undefined) {
    factorsUsed.push('Serum Iron');
    if (lab.iron < 50) { score -= 8; }
  }

  // B12 & Folate (20 points)
  if (lab.vitamin_b12 !== undefined) {
    factorsUsed.push('Vitamin B12');
    if (lab.vitamin_b12 < 200) { score -= 12; recommendations.push('Low B12 - supplementation recommended'); }
    else if (lab.vitamin_b12 < 300) { score -= 5; }
  } else { factorsMissing.push('Vitamin B12'); }

  if (lab.folate !== undefined) {
    factorsUsed.push('Folate');
    if (lab.folate < 3) { score -= 8; recommendations.push('Low folate - increase leafy greens or supplement'); }
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Anemia & Blood Health Score',
      emoji: '🩺',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate blood health score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Anemia & Blood Health Score',
    emoji: '🩺',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Blood health'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 7. NUTRITION SCORE
// ============================================================================

export function calculateNutritionScore(lab: ExtractedLabValues, _bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // Albumin (25 points)
  if (lab.albumin !== undefined) {
    factorsUsed.push('Albumin');
    if (lab.albumin < 2.5) { score -= 25; recommendations.push('Low albumin indicates protein deficiency'); }
    else if (lab.albumin < 3.5) { score -= 12; }
  } else { factorsMissing.push('Albumin'); }

  // Vitamin D (25 points)
  if (lab.vitamin_d !== undefined) {
    factorsUsed.push('Vitamin D');
    if (lab.vitamin_d < 10) { score -= 25; recommendations.push('Severe vitamin D deficiency - supplementation needed'); }
    else if (lab.vitamin_d < 20) { score -= 15; }
    else if (lab.vitamin_d < 30) { score -= 8; recommendations.push('Suboptimal vitamin D - consider supplementation'); }
  } else { factorsMissing.push('Vitamin D'); }

  // B12 (15 points)
  if (lab.vitamin_b12 !== undefined) {
    factorsUsed.push('Vitamin B12');
    if (lab.vitamin_b12 < 200) { score -= 15; }
    else if (lab.vitamin_b12 < 300) { score -= 5; }
  }

  // Folate (10 points)
  if (lab.folate !== undefined) {
    factorsUsed.push('Folate');
    if (lab.folate < 3) { score -= 10; }
    else if (lab.folate < 5) { score -= 4; }
  }

  // Iron Profile (15 points)
  if (lab.ferritin !== undefined) {
    factorsUsed.push('Ferritin');
    if (lab.ferritin < 15) { score -= 10; }
    else if (lab.ferritin < 30) { score -= 5; }
  }

  // Hemoglobin (10 points as proxy)
  if (lab.hemoglobin !== undefined) {
    factorsUsed.push('Hemoglobin');
    const threshold = lab.sex === 'Female' ? 12 : 13;
    if (lab.hemoglobin < threshold - 2) { score -= 10; }
    else if (lab.hemoglobin < threshold) { score -= 4; }
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Nutrition Score',
      emoji: '💪',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate nutrition score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Nutrition Score',
    emoji: '💪',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Nutritional status'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 8. BONE HEALTH SCORE
// ============================================================================

export function calculateBoneHealthScore(lab: ExtractedLabValues, _bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // Vitamin D (40 points)
  if (lab.vitamin_d !== undefined) {
    factorsUsed.push('Vitamin D');
    if (lab.vitamin_d < 10) { score -= 40; recommendations.push('Severe vitamin D deficiency - affects bone health significantly'); }
    else if (lab.vitamin_d < 20) { score -= 25; }
    else if (lab.vitamin_d < 30) { score -= 12; recommendations.push('Optimal vitamin D is 30-50 ng/mL for bone health'); }
  } else { factorsMissing.push('Vitamin D'); }

  // Calcium (30 points)
  if (lab.calcium !== undefined) {
    factorsUsed.push('Calcium');
    if (lab.calcium < 8.0) { score -= 30; recommendations.push('Low calcium - may need supplementation'); }
    else if (lab.calcium < 8.5) { score -= 15; }
    else if (lab.calcium > 10.5) { score -= 12; recommendations.push('Elevated calcium - further evaluation may be needed'); }
  } else { factorsMissing.push('Calcium'); }

  // Phosphorus (15 points)
  if (lab.phosphorus !== undefined) {
    factorsUsed.push('Phosphorus');
    if (lab.phosphorus < 2.5 || lab.phosphorus > 5) { score -= 10; }
    else if (lab.phosphorus < 3 || lab.phosphorus > 4.5) { score -= 4; }
  }

  // ALP (15 points)
  if (lab.alp !== undefined) {
    factorsUsed.push('ALP');
    if (lab.alp > 200) { score -= 12; recommendations.push('Elevated ALP - may indicate bone turnover issues'); }
    else if (lab.alp > 130) { score -= 5; }
    else if (lab.alp < 40) { score -= 8; }
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Bone Health Score',
      emoji: '🦴',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate bone health score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Bone Health Score',
    emoji: '🦴',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Bone health'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 9. DIABETES RISK SCORE
// ============================================================================

export function calculateDiabetesRiskScore(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // HbA1c (40 points)
  if (lab.hba1c !== undefined) {
    factorsUsed.push('HbA1c');
    if (lab.hba1c >= 6.5) { score -= 40; recommendations.push('HbA1c in diabetes range - follow your diabetes management plan'); }
    else if (lab.hba1c >= 5.7) { score -= 20; recommendations.push('Pre-diabetes range - lifestyle modifications can prevent progression'); }
    else if (lab.hba1c >= 5.4) { score -= 8; }
  } else { factorsMissing.push('HbA1c'); }

  // Fasting Glucose (25 points)
  if (lab.fasting_glucose !== undefined) {
    factorsUsed.push('Fasting Glucose');
    if (lab.fasting_glucose >= 126) { score -= 25; }
    else if (lab.fasting_glucose >= 100) { score -= 12; }
    else if (lab.fasting_glucose >= 95) { score -= 5; }
  } else { factorsMissing.push('Fasting Glucose'); }

  // TyG Index (15 points)
  const tygResult = calculateTyGIndex(lab);
  if (tygResult.status !== 'not_calculated') {
    factorsUsed.push('TyG Index');
    const tyg = tygResult.value as number;
    if (tyg >= 9) { score -= 15; }
    else if (tyg >= 8.5) { score -= 8; }
  }

  // BMI (10 points)
  const bmiResult = calculateBMI(bio);
  if (bmiResult.status !== 'not_calculated') {
    factorsUsed.push('BMI');
    const bmi = bmiResult.value as number;
    if (bmi >= 35) { score -= 10; recommendations.push('Weight loss significantly reduces diabetes risk'); }
    else if (bmi >= 30) { score -= 6; }
    else if (bmi >= 25) { score -= 3; }
  }

  // Triglycerides (5 points)
  if (lab.triglycerides !== undefined) {
    factorsUsed.push('Triglycerides');
    if (lab.triglycerides >= 200) { score -= 5; }
  }

  // Family history (5 points)
  if (bio.family_history?.diabetes) {
    factorsUsed.push('Family History');
    score -= 5;
  }

  if (factorsUsed.length < 2) {
    return {
      name: 'Diabetes Risk Score',
      emoji: '🍬',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate diabetes risk score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Diabetes Risk Score',
    emoji: '🍬',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Diabetes risk profile'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 10. FATTY LIVER RISK SCORE
// ============================================================================

export function calculateFattyLiverRiskScore(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore {
  let score = 100;
  const factorsUsed: string[] = [];
  const factorsMissing: string[] = [];
  const recommendations: string[] = [];

  // AST/ALT Ratio (25 points)
  const deritisResult = calculateASTALTRatio(lab);
  if (deritisResult.status !== 'not_calculated') {
    factorsUsed.push('AST/ALT Ratio');
    const ratio = deritisResult.value as number;
    if (ratio >= 2) { score -= 20; recommendations.push('AST/ALT ratio suggests possible alcoholic liver disease'); }
    else if (ratio >= 1) { score -= 8; }
  } else { factorsMissing.push('AST/ALT'); }

  // ALT elevation (20 points)
  if (lab.alt !== undefined) {
    factorsUsed.push('ALT');
    if (lab.alt > 100) { score -= 20; }
    else if (lab.alt > 60) { score -= 12; }
    else if (lab.alt > 45) { score -= 6; recommendations.push('Mildly elevated ALT - reduce fatty foods and alcohol'); }
  }

  // Triglycerides (20 points)
  if (lab.triglycerides !== undefined) {
    factorsUsed.push('Triglycerides');
    if (lab.triglycerides >= 300) { score -= 20; recommendations.push('High triglycerides associated with fatty liver'); }
    else if (lab.triglycerides >= 200) { score -= 12; }
    else if (lab.triglycerides >= 150) { score -= 5; }
  } else { factorsMissing.push('Triglycerides'); }

  // Glucose/HbA1c (15 points)
  if (lab.hba1c !== undefined) {
    factorsUsed.push('HbA1c');
    if (lab.hba1c >= 6.5) { score -= 15; }
    else if (lab.hba1c >= 5.7) { score -= 8; }
  } else if (lab.fasting_glucose !== undefined) {
    factorsUsed.push('Fasting Glucose');
    if (lab.fasting_glucose >= 126) { score -= 12; }
    else if (lab.fasting_glucose >= 100) { score -= 5; }
  }

  // BMI (15 points)
  const bmiResult = calculateBMI(bio);
  if (bmiResult.status !== 'not_calculated') {
    factorsUsed.push('BMI');
    const bmi = bmiResult.value as number;
    if (bmi >= 35) { score -= 15; recommendations.push('Obesity is a major risk factor for fatty liver'); }
    else if (bmi >= 30) { score -= 10; }
    else if (bmi >= 25) { score -= 5; }
  } else { factorsMissing.push('BMI'); }

  // GGT (5 points)
  if (lab.ggt !== undefined) {
    factorsUsed.push('GGT');
    if (lab.ggt > 100) { score -= 5; }
  }

  if (factorsUsed.length < 3) {
    return {
      name: 'Fatty Liver Risk Score',
      emoji: '🫀',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate fatty liver risk score',
      factors_used: factorsUsed,
      factors_missing: factorsMissing,
      recommendations: [],
    };
  }

  score = Math.max(0, Math.min(100, round(score)));

  return {
    name: 'Fatty Liver Risk Score',
    emoji: '🫀',
    score,
    grade: gradeFromScore(score),
    interpretation: interpretationFromGrade(gradeFromScore(score), 'Fatty liver risk'),
    factors_used: factorsUsed,
    factors_missing: factorsMissing,
    recommendations,
  };
}

// ============================================================================
// 11. BIOLOGICAL AGE ESTIMATE (Composite Version)
// ============================================================================

export function calculateBiologicalAgeComposite(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore {
  const bioAgeResult = calculateBiologicalAge(lab, bio);

  if (bioAgeResult.status === 'not_calculated') {
    return {
      name: 'Biological Age Estimate',
      emoji: '⏳',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to estimate biological age',
      factors_used: [],
      factors_missing: ['Age', 'Multiple biomarkers'],
      recommendations: [],
    };
  }

  const estimatedAge = bioAgeResult.value as number;
  const chronoAge = lab.age || 0;
  const diff = estimatedAge - chronoAge;

  let score = 80;
  const recommendations: string[] = [];

  if (diff <= -5) { score = 100; }
  else if (diff <= -2) { score = 95; }
  else if (diff <= 0) { score = 90; }
  else if (diff <= 2) { score = 80; }
  else if (diff <= 5) { score = 65; recommendations.push('Lifestyle improvements can help reverse biological aging'); }
  else if (diff <= 8) { score = 50; recommendations.push('Multiple risk factors contributing to accelerated aging'); }
  else { score = 35; recommendations.push('Significant attention to health factors needed'); }

  return {
    name: 'Biological Age Estimate',
    emoji: '⏳',
    score,
    grade: gradeFromScore(score),
    interpretation: `Estimated biological age: ${estimatedAge} years (chronological: ${chronoAge}). ${diff <= 0 ? 'Aging slower than expected!' : `Appears ${diff} years older than chronological age.`}`,
    factors_used: ['BMI', 'Blood Pressure', 'Smoking', 'HbA1c', 'LDL', 'eGFR', 'NLR'].filter(() => true),
    factors_missing: [],
    recommendations,
  };
}

// ============================================================================
// 12. LONGEVITY SCORE (Composite Version)
// ============================================================================

export function calculateLongevityComposite(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore {
  const longevityResult = calculateLongevityScore(lab, bio);

  if (longevityResult.status === 'not_calculated') {
    return {
      name: 'Longevity Score',
      emoji: '🌿',
      score: 0,
      grade: 'N/A',
      interpretation: 'Insufficient data to calculate longevity score',
      factors_used: [],
      factors_missing: ['Multiple biomarkers', 'Biometrics'],
      recommendations: [],
    };
  }

  const score = longevityResult.value as number;
  const recommendations: string[] = [];

  if (score < 60) {
    recommendations.push('Focus on key modifiable factors: weight, blood pressure, glucose control');
  }
  if (score < 75) {
    recommendations.push('Regular health checkups recommended to track progress');
  }
  if (bio.lifestyle?.smoking_status === 'current') {
    recommendations.push('Smoking cessation is the single most impactful change for longevity');
  }

  return {
    name: 'Longevity Score',
    emoji: '🌿',
    score,
    grade: gradeFromScore(score),
    interpretation: longevityResult.interpretation,
    factors_used: ['Height', 'Weight', 'Blood Pressure', 'Smoking', 'HbA1c', 'Lipids', 'Kidney Function', 'Liver Function', 'Inflammation', 'Medical History', 'Family History'],
    factors_missing: [],
    recommendations,
  };
}

// ============================================================================
// MAIN FUNCTION: Calculate All Composite Scores
// ============================================================================

export function calculateAllCompositeScores(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore[] {
  return [
    calculateCardiovascularScore(lab, bio),
    calculateMetabolicScore(lab, bio),
    calculateKidneyScore(lab, bio),
    calculateLiverScore(lab, bio),
    calculateInflammationScore(lab, bio),
    calculateAnemiaScore(lab, bio),
    calculateNutritionScore(lab, bio),
    calculateBoneHealthScore(lab, bio),
    calculateDiabetesRiskScore(lab, bio),
    calculateFattyLiverRiskScore(lab, bio),
    calculateBiologicalAgeComposite(lab, bio),
    calculateLongevityComposite(lab, bio),
  ];
}

// Filter out N/A scores for display
export function getCalculableCompositeScores(lab: ExtractedLabValues, bio: PatientBiometrics): CompositeScore[] {
  return calculateAllCompositeScores(lab, bio).filter(score => score.grade !== 'N/A');
}
