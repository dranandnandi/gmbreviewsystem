-- Add biometrics JSONB column to report_requests for clinical calculations
-- This stores user-provided health data needed for longevity and composite scores

ALTER TABLE report_requests
ADD COLUMN IF NOT EXISTS biometrics JSONB DEFAULT NULL;

-- Add calculated_indices column to store computed clinical values
ALTER TABLE report_requests
ADD COLUMN IF NOT EXISTS calculated_indices JSONB DEFAULT NULL;

-- Comment explaining the biometrics structure
COMMENT ON COLUMN report_requests.biometrics IS 'Patient biometrics for clinical calculations: {
  anthropometry: { height_cm, weight_kg },
  vital_signs: { systolic_bp, diastolic_bp, pulse_rate },
  lifestyle: { smoking_status, smokeless_tobacco, alcohol_consumption },
  medical_history: { diabetes, hypertension, dyslipidemia, thyroid_disorder, heart_disease, kidney_disease },
  family_history: { diabetes, heart_disease, hypertension, stroke, cancer }
}';

COMMENT ON COLUMN report_requests.calculated_indices IS 'Computed clinical indices and composite scores: {
  individual_indices: { bmi, bsa, creatinine_clearance, egfr, ... },
  composite_scores: { cardiovascular_health, metabolic_health, longevity_score, ... }
}';
