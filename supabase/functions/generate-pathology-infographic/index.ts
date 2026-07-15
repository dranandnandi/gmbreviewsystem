import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import {
  type PatientBiometrics,
  type ExtractedLabValues,
  type CalculatedIndex,
  type CompositeScore,
  calculateAllIndices,
} from './clinical-calculations.ts';
import {
  getCalculableCompositeScores,
} from './composite-scores.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReportType = 'smart_report' | 'trend_analysis' | 'longitivity_report';

interface GenerateRequest {
  request_id: string;
  patient_name: string;
  report_type: ReportType;
  summary_language?: string;
  notes?: string;
  letterhead_url?: string;
  uploaded_report_urls: string[];
  biometrics?: PatientBiometrics;
}

interface ExtractedTest {
  test_name: string;
  canonical_key?: keyof ExtractedLabValues | null;
  value: string;
  unit?: string;
  reference_range?: string;
  source_flag?: string | null;
  is_abnormal?: boolean;
  abnormal_direction?: 'high' | 'low' | null;
}

interface ExtractedSection {
  section_name: string;
  category?: string;
  tests: ExtractedTest[];
}

interface ExtractedReport {
  patient?: {
    name?: string;
    age?: string;
    sex?: string;
    report_date?: string;
    doctor_name?: string | null;
  };
  lab_info?: {
    name?: string;
    address?: string | null;
    phone?: string | null;
  };
  test_sections?: ExtractedSection[];
  abnormal_summary?: Array<{
    section: string;
    test_name: string;
    value: string;
    reference_range?: string;
    direction: 'high' | 'low';
  }>;
  patient_summary?: PatientSummary | null;
}

interface PatientSummary {
  health_status?: string;
  normal_findings_detailed?: Array<{
    test_name: string;
    value: string;
    what_it_measures: string;
    your_result_means: string;
  }>;
  abnormal_findings?: Array<{
    test_name: string;
    value: string;
    status: 'high' | 'low' | 'critical' | 'abnormal';
    what_it_measures: string;
    explanation: string;
    what_to_do: string;
    trend?: 'improving' | 'worsening' | 'stable' | 'new';
  }>;
  needs_consultation?: boolean;
  consultation_recommendation?: string;
  health_tips?: string[];
  summary_message?: string;
  language?: string;
}

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_EXTRACTION_MAX_TOKENS = 12000;
const DEFAULT_SUMMARY_MAX_TOKENS = 4096;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  bn: 'Bengali (বাংলা)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  ml: 'Malayalam (മലയാളം)',
  or: 'Odia (ଓଡ଼ିଆ)',
  as: 'Assamese (অসমীয়া)',
};

const CANONICAL_LAB_KEYS = [
  'hemoglobin',
  'rbc',
  'wbc',
  'platelets',
  'mcv',
  'mch',
  'mchc',
  'rdw',
  'neutrophils',
  'lymphocytes',
  'monocytes',
  'eosinophils',
  'basophils',
  'hematocrit',
  'creatinine',
  'bun',
  'urea',
  'uric_acid',
  'ast',
  'alt',
  'alp',
  'ggt',
  'bilirubin_total',
  'bilirubin_direct',
  'albumin',
  'total_protein',
  'total_cholesterol',
  'hdl',
  'ldl',
  'vldl',
  'triglycerides',
  'fasting_glucose',
  'random_glucose',
  'hba1c',
  'insulin',
  'iron',
  'ferritin',
  'tibc',
  'transferrin_saturation',
  'vitamin_d',
  'vitamin_b12',
  'folate',
  'calcium',
  'phosphorus',
  'magnesium',
  'sodium',
  'potassium',
  'chloride',
  'crp',
  'esr',
  'tsh',
  't3',
  't4',
  'free_t3',
  'free_t4',
] as const satisfies readonly (keyof ExtractedLabValues)[];

const CANONICAL_LAB_KEY_SET = new Set<string>(CANONICAL_LAB_KEYS);

const PDF_EXTRACTION_PROMPT = `You are extracting structured data from pathology/laboratory report PDFs.

Return ONLY a JSON object with this structure:
{
  "patient": {
    "name": "string or null",
    "age": "string or null",
    "sex": "Male|Female|null",
    "report_date": "YYYY-MM-DD or original date text or null",
    "doctor_name": "string or null"
  },
  "lab_info": {
    "name": "string or null",
    "address": "string or null",
    "phone": "string or null"
  },
  "test_sections": [
    {
      "section_name": "string",
      "category": "string",
      "tests": [
        {
          "test_name": "string",
          "canonical_key": "one allowed key from the canonical key list below, or null",
          "value": "string exactly as shown",
          "unit": "string or null",
          "reference_range": "string or null",
          "source_flag": "explicit flag/status exactly as printed in source report, e.g. N/H/L/Normal/High/Low, or null",
          "is_abnormal": boolean,
          "abnormal_direction": "high|low|null"
        }
      ]
    }
  ],
  "abnormal_summary": [
    {
      "section": "string",
      "test_name": "string",
      "value": "string",
      "reference_range": "string or null",
      "direction": "high|low"
    }
  ]
}

Canonical key list for calculation mapping:
${CANONICAL_LAB_KEYS.join(', ')}

Rules:
1. Extract all visible test values; do not skip sections.
2. Preserve exact values, units, dates, and reference ranges.
3. Extract source_flag only when the uploaded report visibly prints a flag/status for that exact test row. Do not create one from reference ranges.
4. Mark abnormal only when the value is outside the provided reference range.
5. Do not infer symptoms, diagnoses, medications, procedures, lifestyle advice, or missing biomarkers.
6. If a field is unclear or absent, use null rather than guessing.
7. Preserve source dates and lab names for trend comparison.
8. For canonical_key, map common lab synonyms to the allowed key list. Examples: "Creatinine, Serum" -> "creatinine", "S. Creat" -> "creatinine", "LDL Cholesterol, Direct" -> "ldl", "Lymphocytes (Abs)" -> "lymphocytes", "Granulocyte Absolute" -> "neutrophils", "Total WBC Count" -> "wbc".
9. Use canonical_key null for display-only values, qualitative values, ratios that are already reported, or tests not represented in the allowed list.
10. Do not invent a canonical_key outside the allowed list.`;

const GAMMA_INSTRUCTIONS = `
Create a professional, patient-friendly medical smart report that is complete but compact.

CONTENT GROUNDING:
1. Use only the patient data, lab data, test values, dates, reference ranges, and trend data in the input.
2. Do not invent diagnoses, symptoms, medications, procedures, lifestyle habits, missing biomarkers, or doctor advice.
3. If a value, range, date, or trend is unavailable, label it "not available" or omit the comparison.
4. Separate facts from interpretation; phrase clinical next steps as "discuss with your clinician".
5. Never say the patient is "perfectly healthy" or imply a diagnosis from one abnormal marker.
6. Do not omit any supplied lab value. Every supplied test row must appear in the final report.

LAYOUT:
- Reserve top space for patient and report metadata.
- Put all test values in compact tables grouped by source section.
- In lab tables, use compact source flags only: N, H, L. Do not print full status words in narrow flag columns.
- Show a flag legend only for flags present in the uploaded report data. Never invent normal/high/low flags or legend entries.
- Keep interpretation as short callouts; do not turn every normal value into a paragraph.
- Highlight abnormal values in red/amber.
- Use green/blue accents for values within range.
- Rotate section structures between summary-first, abnormal-first, trend-first, and domain-first layouts where data supports it.
- Avoid generic marketing phrases like "excellent health profile", "world-class", "complete transformation", or "highly recommended".
`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function logStage(stage: string, details?: Record<string, unknown>) {
  console.log(`[generate-pathology-infographic] ${stage}`, details ? JSON.stringify(details) : '');
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'patient';
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function extractJson(text: string): ExtractedReport {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]);
  }
}

function parseJsonObject<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]) as T;
  }
}

function getTargetLanguage(languageCode?: string) {
  const normalized = (languageCode || 'en').toLowerCase();
  return {
    code: normalized,
    name: LANGUAGE_NAMES[normalized] || LANGUAGE_NAMES.en,
  };
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;

  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildPatientInfo(data: ExtractedReport, input: GenerateRequest) {
  const patient = data.patient || {};
  const lab = data.lab_info || {};
  return [
    `Patient Name: ${patient.name || input.patient_name || 'not available'}`,
    `Age: ${patient.age || 'not available'}`,
    `Sex: ${patient.sex || 'not available'}`,
    `Report Date: ${patient.report_date || 'not available'}`,
    `Doctor: ${patient.doctor_name || 'not available'}`,
    `Lab: ${lab.name || 'not available'}`,
    input.notes ? `Request Notes: ${input.notes}` : '',
  ].filter(Boolean).join('\n');
}

function buildTestResultsSection(data: ExtractedReport) {
  return (data.test_sections || []).map((section) => {
    const tests = (section.tests || []).map((test) => {
      const sourceFlag = compactSourceFlag(test.source_flag);
      const abnormality = test.is_abnormal
        ? (test.abnormal_direction || 'abnormal').toUpperCase()
        : 'within range';
      return `- ${test.test_name}: ${test.value} ${test.unit || ''} | Ref: ${test.reference_range || 'not available'} | source flag: ${sourceFlag || 'not printed'} | abnormality: ${abnormality}`;
    }).join('\n');
    return `Section: ${section.section_name || 'Report Section'}\n${tests}`;
  }).join('\n\n');
}

function buildAbnormalFindingsForPrompt(data: ExtractedReport) {
  const abnormalSummary = data.abnormal_summary || [];
  if (abnormalSummary.length === 0) {
    return 'Abnormal Findings: none detected from provided flags/reference ranges.';
  }

  return [
    'Abnormal Findings:',
    ...abnormalSummary.map((item) =>
      `- ${item.test_name}: ${item.value} | status: ${item.direction} | Ref: ${item.reference_range || 'not available'} | Section: ${item.section}`
    ),
  ].join('\n');
}

function compactSourceFlag(sourceFlag?: string | null): string {
  const flag = (sourceFlag || '').trim();
  if (!flag) return '';

  const normalized = flag.toLowerCase();
  if (['n', 'normal', 'within normal limit', 'within normal limits', 'within range'].includes(normalized)) return 'N';
  if (['h', 'high', 'hi', 'above', 'above range'].includes(normalized)) return 'H';
  if (['l', 'low', 'lo', 'below', 'below range'].includes(normalized)) return 'L';
  if (['c', 'critical'].includes(normalized)) return 'C';
  if (flag.length <= 3) return flag.toUpperCase();
  return '';
}

function buildSourceFlagLegend(flags: Set<string>): string {
  const legendParts: string[] = [];
  if (flags.has('N')) legendParts.push('N = normal');
  if (flags.has('H')) legendParts.push('H = high');
  if (flags.has('L')) legendParts.push('L = low');
  if (flags.has('C')) legendParts.push('C = critical');
  return legendParts.length > 0 ? `Source flag legend: ${legendParts.join(', ')}.` : '';
}

function buildPatientSummaryPrompt(data: ExtractedReport, input: GenerateRequest) {
  const language = getTargetLanguage(input.summary_language);
  const patientInfo = buildPatientInfo(data, input);
  const testResultsSection = buildTestResultsSection(data);
  const abnormalFindingsForPrompt = buildAbnormalFindingsForPrompt(data);
  const historyNote = input.report_type === 'trend_analysis'
    ? 'History Note: If prior values are not provided, mark trend as "new" instead of guessing.'
    : 'History Note: No historical comparison is available unless explicitly present in the extracted data.';

  return `
You are a healthcare communicator creating a simple, reassuring summary of lab results for a patient.

LANGUAGE: Write in ${language.name}. Keep medical terms (CBC, Hemoglobin, HIV, HBsAg, etc.) in English.

FLAG RULES (authoritative):
- flag H/high = abnormal high | flag L/low = abnormal low | flag C/critical = critical | flag N/null = normal
- Do NOT re-evaluate numeric flags.
- EXCEPTION - qualitative results (text values, no flag): use your clinical knowledge of the analyte to determine normality. Example: HIV "Reactive" = abnormal; HBsAg "Reactive" = abnormal; Platelets "Detected" = normal (expected). Judge by what a normal result for that specific analyte should be.

Patient Information:
${patientInfo}

Test Results:
${testResultsSection}
${abnormalFindingsForPrompt}
${historyNote}

Respond with a JSON object (text in ${language.name}, medical terms in English):
{
  "health_status": "1-2 sentence overall status",
  "normal_findings_detailed": [
    { "test_name": "English term", "value": "value+unit", "what_it_measures": "1 sentence", "your_result_means": "1 sentence" }
  ],
  "abnormal_findings": [
    { "test_name": "English term", "value": "value+unit", "status": "high|low|critical|abnormal", "what_it_measures": "1 sentence", "explanation": "1-2 sentences", "what_to_do": "1 sentence", "trend": "improving|worsening|stable|new" }
  ],
  "needs_consultation": true|false,
  "consultation_recommendation": "1 sentence",
  "health_tips": ["tip1", "tip2", "tip3"],
  "summary_message": "1-2 sentence warm closing",
  "language": "${language.code}"
}

Rules:
1. Medical terms must stay in English for accuracy.
2. Explanations must be in ${language.name}.
3. Use separate arrays for normal and abnormal findings.
4. Include what each finding measures and what the patient's result means.
5. Give practical health tips personalized to the available results.
6. Keep the tone warm and reassuring.
7. Do not invent diagnoses, medicines, symptoms, procedures, or values.
8. If data is missing, say it is not available instead of guessing.

Return ONLY the JSON object, no additional text.
`;
}

function buildFallbackReport(input: GenerateRequest): ExtractedReport {
  return {
    patient: {
      name: input.patient_name,
      report_date: new Date().toISOString().slice(0, 10),
    },
    lab_info: {},
    test_sections: [
      {
        section_name: 'Uploaded Reports',
        category: 'Source Files',
        tests: input.uploaded_report_urls.map((url, index) => ({
          test_name: `Uploaded file ${index + 1}`,
          value: url,
          unit: '',
          reference_range: 'not available',
          source_flag: null,
          is_abnormal: false,
          abnormal_direction: null,
        })),
      },
    ],
    abnormal_summary: [],
  };
}

// Map of common test name variations to standardized keys
const TEST_NAME_MAP: Record<string, keyof ExtractedLabValues> = {
  // Hematology
  'hemoglobin': 'hemoglobin', 'hb': 'hemoglobin', 'hgb': 'hemoglobin',
  'rbc': 'rbc', 'rbc count': 'rbc', 'red blood cell': 'rbc', 'red blood cells': 'rbc', 'red blood cell count': 'rbc', 'red blood corpuscles': 'rbc',
  'wbc': 'wbc', 'wbc count': 'wbc', 'white blood cell': 'wbc', 'white blood cells': 'wbc', 'tlc': 'wbc', 'total leucocyte count': 'wbc',
  'platelet': 'platelets', 'platelets': 'platelets', 'platelet count': 'platelets', 'plt': 'platelets',
  'mcv': 'mcv', 'mean corpuscular volume': 'mcv',
  'mch': 'mch', 'mean corpuscular hemoglobin': 'mch',
  'mchc': 'mchc', 'mean corpuscular hemoglobin concentration': 'mchc',
  'rdw': 'rdw', 'rdw-cv': 'rdw', 'red cell distribution width': 'rdw',
  'neutrophil': 'neutrophils', 'neutrophils': 'neutrophils', 'neutrophil count': 'neutrophils', 'neut': 'neutrophils', 'neutrophils %': 'neutrophils', 'neutrophils absolute': 'neutrophils', 'granulocyte': 'neutrophils', 'granulocytes': 'neutrophils', 'granulocyte absolute': 'neutrophils', 'granulocytes absolute': 'neutrophils', 'granulocyte count': 'neutrophils',
  'lymphocyte': 'lymphocytes', 'lymphocytes': 'lymphocytes', 'lymphocyte count': 'lymphocytes', 'lymph': 'lymphocytes', 'lymphocytes %': 'lymphocytes', 'lymphocytes absolute': 'lymphocytes', 'lymphocytes abs': 'lymphocytes', 'lymphocyte absolute': 'lymphocytes',
  'monocyte': 'monocytes', 'monocytes': 'monocytes', 'mono': 'monocytes',
  'eosinophil': 'eosinophils', 'eosinophils': 'eosinophils', 'eos': 'eosinophils',
  'basophil': 'basophils', 'basophils': 'basophils', 'baso': 'basophils',
  'hematocrit': 'hematocrit', 'hct': 'hematocrit', 'pcv': 'hematocrit', 'packed cell volume': 'hematocrit',

  // Renal
  'creatinine': 'creatinine', 'serum creatinine': 'creatinine', 's. creatinine': 'creatinine', 'creat': 'creatinine',
  'bun': 'bun', 'blood urea nitrogen': 'bun',
  'urea': 'urea', 'blood urea': 'urea', 's. urea': 'urea',
  'uric acid': 'uric_acid', 's. uric acid': 'uric_acid', 'serum uric acid': 'uric_acid',

  // Liver
  'ast': 'ast', 'sgot': 'ast', 'aspartate aminotransferase': 'ast', 'aspartate transaminase': 'ast',
  'alt': 'alt', 'sgpt': 'alt', 'alanine aminotransferase': 'alt', 'alanine transaminase': 'alt',
  'alp': 'alp', 'alkaline phosphatase': 'alp', 'alk phos': 'alp',
  'ggt': 'ggt', 'gamma gt': 'ggt', 'gamma-glutamyl transferase': 'ggt', 'ggtp': 'ggt',
  'bilirubin total': 'bilirubin_total', 'total bilirubin': 'bilirubin_total', 's. bilirubin total': 'bilirubin_total', 'bilirubin': 'bilirubin_total',
  'bilirubin direct': 'bilirubin_direct', 'direct bilirubin': 'bilirubin_direct', 'conjugated bilirubin': 'bilirubin_direct',
  'albumin': 'albumin', 'serum albumin': 'albumin', 's. albumin': 'albumin',
  'total protein': 'total_protein', 'serum protein': 'total_protein', 's. protein': 'total_protein', 'protein total': 'total_protein',

  // Lipids
  'total cholesterol': 'total_cholesterol', 'cholesterol': 'total_cholesterol', 'cholesterol total': 'total_cholesterol', 's. cholesterol': 'total_cholesterol',
  'hdl': 'hdl', 'hdl cholesterol': 'hdl', 'hdl-c': 'hdl', 'hdl-cholesterol': 'hdl',
  'ldl': 'ldl', 'ldl cholesterol': 'ldl', 'ldl-c': 'ldl', 'ldl-cholesterol': 'ldl', 'ldl cholesterol direct': 'ldl',
  'vldl': 'vldl', 'vldl cholesterol': 'vldl', 'vldl-c': 'vldl',
  'triglyceride': 'triglycerides', 'triglycerides': 'triglycerides', 'tg': 'triglycerides', 'trigs': 'triglycerides',

  // Metabolic
  'fasting glucose': 'fasting_glucose', 'fasting blood sugar': 'fasting_glucose', 'fbs': 'fasting_glucose', 'glucose fasting': 'fasting_glucose', 'fasting plasma glucose': 'fasting_glucose',
  'random glucose': 'random_glucose', 'random blood sugar': 'random_glucose', 'rbs': 'random_glucose', 'glucose random': 'random_glucose',
  'hba1c': 'hba1c', 'glycated hemoglobin': 'hba1c', 'glycosylated hemoglobin': 'hba1c', 'a1c': 'hba1c', 'hemoglobin a1c': 'hba1c',
  'insulin': 'insulin', 'fasting insulin': 'insulin', 's. insulin': 'insulin',

  // Iron Studies
  'iron': 'iron', 'serum iron': 'iron', 's. iron': 'iron',
  'ferritin': 'ferritin', 'serum ferritin': 'ferritin', 's. ferritin': 'ferritin',
  'tibc': 'tibc', 'total iron binding capacity': 'tibc',
  'transferrin saturation': 'transferrin_saturation', 'transferrin sat': 'transferrin_saturation', 'tsat': 'transferrin_saturation',

  // Vitamins
  'vitamin d': 'vitamin_d', 'vit d': 'vitamin_d', '25-oh vitamin d': 'vitamin_d', '25-hydroxy vitamin d': 'vitamin_d', 'vitamin d3': 'vitamin_d', 'vit d3': 'vitamin_d',
  'vitamin b12': 'vitamin_b12', 'vit b12': 'vitamin_b12', 'b12': 'vitamin_b12', 'cyanocobalamin': 'vitamin_b12',
  'folate': 'folate', 'folic acid': 'folate', 'serum folate': 'folate',

  // Minerals
  'calcium': 'calcium', 'serum calcium': 'calcium', 's. calcium': 'calcium', 'total calcium': 'calcium',
  'phosphorus': 'phosphorus', 'serum phosphorus': 'phosphorus', 's. phosphorus': 'phosphorus', 'phosphate': 'phosphorus', 'inorganic phosphorus': 'phosphorus',
  'magnesium': 'magnesium', 'serum magnesium': 'magnesium', 's. magnesium': 'magnesium',
  'sodium': 'sodium', 'serum sodium': 'sodium', 's. sodium': 'sodium', 'na': 'sodium',
  'potassium': 'potassium', 'serum potassium': 'potassium', 's. potassium': 'potassium', 'k': 'potassium',
  'chloride': 'chloride', 'serum chloride': 'chloride', 's. chloride': 'chloride', 'cl': 'chloride',

  // Inflammatory
  'crp': 'crp', 'c-reactive protein': 'crp', 'hs-crp': 'crp', 'high sensitivity crp': 'crp',
  'esr': 'esr', 'erythrocyte sedimentation rate': 'esr', 'sed rate': 'esr',

  // Thyroid
  'tsh': 'tsh', 'thyroid stimulating hormone': 'tsh', 's. tsh': 'tsh',
  't3': 't3', 'total t3': 't3', 'triiodothyronine': 't3',
  't4': 't4', 'total t4': 't4', 'thyroxine': 't4',
  'free t3': 'free_t3', 'ft3': 'free_t3',
  'free t4': 'free_t4', 'ft4': 'free_t4',
};

const DERIVED_OR_DISPLAY_ONLY_TESTS = new Set([
  'total cholesterol hdl ratio',
  'ldl hdl ratio',
]);

function normalizeTestNameForMapping(name: string) {
  return name
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, ' $1 ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[,+:;/\\|-]/g, ' ')
    .replace(/\bserum\b/g, ' ')
    .replace(/\bs\b/g, ' ')
    .replace(/\bdirect\b/g, ' ')
    .replace(/\bcount\b/g, ' count ')
    .replace(/\babs\b/g, ' absolute ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveLabValueKey(testName: string): keyof ExtractedLabValues | undefined {
  const normalized = normalizeTestNameForMapping(testName);
  if (!normalized || DERIVED_OR_DISPLAY_ONLY_TESTS.has(normalized)) return undefined;

  const candidates = [
    testName.toLowerCase().trim(),
    normalized,
    normalized.replace(/\babsolute\b/g, '').replace(/\s+/g, ' ').trim(),
    normalized.replace(/\bcount\b/g, '').replace(/\s+/g, ' ').trim(),
  ];

  for (const candidate of candidates) {
    const key = TEST_NAME_MAP[candidate];
    if (key) return key;
  }

  if (normalized.includes('creatinine')) return 'creatinine';
  if (normalized.includes('total cholesterol')) return 'total_cholesterol';
  if (/\bhdl\b/.test(normalized)) return 'hdl';
  if (/\bldl\b/.test(normalized)) return 'ldl';
  if (/\bvldl\b/.test(normalized)) return 'vldl';
  if (normalized.includes('triglyceride') || /\btg\b/.test(normalized)) return 'triglycerides';
  if (normalized.includes('granulocyte')) return 'neutrophils';
  if (normalized.includes('lymphocyte')) return 'lymphocytes';
  if (/\brbc\b/.test(normalized)) return 'rbc';
  if (/\bwbc\b/.test(normalized)) return 'wbc';
  if (normalized.includes('red blood cell')) return 'rbc';
  if (normalized.includes('white blood cell')) return 'wbc';
  if (normalized.includes('platelet')) return 'platelets';
  if (normalized.includes('corpuscular volume')) return 'mcv';
  if (normalized.includes('corpuscular hemoglobin concentration')) return 'mchc';
  if (normalized.includes('corpuscular hemoglobin')) return 'mch';

  return undefined;
}

function extractNumericValue(value: string): number | undefined {
  const cleaned = value.replace(/,/g, '').replace(/[<>]/g, '').trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;

  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractLabValuesFromReport(data: ExtractedReport): ExtractedLabValues {
  const labValues: ExtractedLabValues = {};

  // Extract age and sex from patient info
  if (data.patient?.age) {
    const ageMatch = data.patient.age.match(/(\d+)/);
    if (ageMatch) {
      labValues.age = parseInt(ageMatch[1], 10);
    }
  }

  if (data.patient?.sex) {
    const sex = data.patient.sex.toLowerCase();
    if (sex.includes('male') && !sex.includes('female')) {
      labValues.sex = 'Male';
    } else if (sex.includes('female')) {
      labValues.sex = 'Female';
    }
  }

  // Extract values from test sections
  let aiMappedCount = 0;
  let fallbackMappedCount = 0;
  let unmappedNumericCount = 0;

  for (const section of data.test_sections || []) {
    for (const test of section.tests || []) {
      const aiCanonicalKey = typeof test.canonical_key === 'string' && CANONICAL_LAB_KEY_SET.has(test.canonical_key)
        ? test.canonical_key as keyof ExtractedLabValues
        : undefined;
      const fallbackKey = aiCanonicalKey ? undefined : resolveLabValueKey(test.test_name);
      const mappedKey = aiCanonicalKey || fallbackKey;

      if (mappedKey && test.value) {
        const numValue = extractNumericValue(test.value);
        if (numValue !== undefined) {
          (labValues as Record<string, number | string>)[mappedKey] = numValue;
          if (aiCanonicalKey) {
            aiMappedCount++;
          } else {
            fallbackMappedCount++;
          }
        }
      } else if (test.value && extractNumericValue(test.value) !== undefined) {
        unmappedNumericCount++;
      }
    }
  }

  (labValues as ExtractedLabValues & {
    __mapping_stats?: {
      ai_mapped_count: number;
      fallback_mapped_count: number;
      unmapped_numeric_count: number;
    };
  }).__mapping_stats = {
    ai_mapped_count: aiMappedCount,
    fallback_mapped_count: fallbackMappedCount,
    unmapped_numeric_count: unmappedNumericCount,
  };

  return labValues;
}

async function extractWithClaude(pdfBuffers: ArrayBuffer[]): Promise<ExtractedReport> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY secret');

  const documentParts = pdfBuffers.map((buffer) => ({
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: arrayBufferToBase64(buffer),
    },
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: getPositiveIntegerEnv('ANTHROPIC_EXTRACTION_MAX_TOKENS', DEFAULT_EXTRACTION_MAX_TOKENS),
      messages: [
        {
          role: 'user',
          content: [
            ...documentParts,
            { type: 'text', text: PDF_EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.content?.find((part: { type: string }) => part.type === 'text')?.text || '';
  return extractJson(text);
}

async function generatePatientSummaryWithClaude(data: ExtractedReport, input: GenerateRequest): Promise<PatientSummary> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY secret');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: getPositiveIntegerEnv('ANTHROPIC_SUMMARY_MAX_TOKENS', DEFAULT_SUMMARY_MAX_TOKENS),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildPatientSummaryPrompt(data, input),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic summary API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.content?.find((part: { type: string }) => part.type === 'text')?.text || '';
  return parseJsonObject<PatientSummary>(text);
}

interface CalculationsResult {
  individual_indices: CalculatedIndex[];
  not_calculated_indices: CalculatedIndex[];
  composite_scores: CompositeScore[];
}

function buildLayoutPrompt(data: ExtractedReport, input: GenerateRequest, calculations?: CalculationsResult) {
  const sections = data.test_sections || [];
  const abnormals = data.abnormal_summary || [];
  const patient = data.patient || {};
  const lab = data.lab_info || {};
  const summary = data.patient_summary || null;
  const language = getTargetLanguage(input.summary_language);

  const lines: string[] = [
    '# SMART REPORT LAYOUT',
    '',
    '## Content Grounding Rules',
    'Use only the patient data, test values, units, reference ranges, dates, lab details, and trend data included below.',
    'Do not add diagnoses, symptoms, medications, lifestyle advice, procedures, or biomarkers that are not present in the data.',
    'Do not omit any lab value listed under "Complete Lab Values". Present every test row in the final report.',
    'Use patient-friendly clinical language. Avoid marketing phrases such as "excellent health profile", "perfectly healthy", "world-class", or "complete transformation".',
    'If a value or comparison is missing, write "not available" instead of guessing.',
    'Keep the report compact: use tables for values and short callouts for interpretation.',
    '',
    '---',
    '',
    '## Page Header',
    `Patient: ${patient.name || input.patient_name || 'not available'}`,
    `Age/Sex: ${patient.age || 'not available'} / ${patient.sex || 'not available'}`,
    `Report Date: ${patient.report_date || 'not available'}`,
    `Lab: ${lab.name || 'not available'}`,
    `Report Type: ${input.report_type}`,
    `Summary Language: ${language.name}`,
    input.notes ? `Request Notes: ${input.notes}` : '',
    '',
    '---',
  ].filter(Boolean);

  if (summary) {
    lines.push(
      '',
      `## Patient Summary (${language.name})`,
      'Use this as a short summary block, not as repeated long paragraphs.',
      summary.health_status ? `Overall Status: ${summary.health_status}` : '',
      summary.summary_message ? `Message: ${summary.summary_message}` : '',
      `Needs Consultation: ${summary.needs_consultation ? 'Yes' : 'No'}`,
      summary.consultation_recommendation ? `Consultation Recommendation: ${summary.consultation_recommendation}` : '',
      '',
      '### Abnormal Findings Explained (brief callouts)',
    );

    if (summary.abnormal_findings?.length) {
      summary.abnormal_findings.forEach((item) => {
        lines.push(`- ${item.test_name}: ${item.value} [${item.status}] - ${item.explanation}`);
        lines.push(`  Discuss: ${item.what_to_do}`);
      });
    } else {
      lines.push('- No abnormal findings were explained from the extracted data.');
    }

    lines.push('', '### Normal Findings Summary');
    if (summary.normal_findings_detailed?.length) {
      summary.normal_findings_detailed.slice(0, 5).forEach((item) => {
        lines.push(`- ${item.test_name}: ${item.value} - ${item.your_result_means}`);
      });
    } else {
      lines.push('- Normal findings summary not available.');
    }

    if (summary.health_tips?.length) {
      lines.push('', '### Grounded Health Tips', ...summary.health_tips.slice(0, 3).map((tip) => `- ${tip}`));
    }

    lines.push('', '---');
  }

  if (abnormals.length > 0) {
    lines.push('', '## Abnormal Values Summary', 'Layout: Compact alert cards with clear HIGH/LOW labels', '');
    for (const item of abnormals) {
      lines.push(`- ${item.section}: ${item.test_name} ${item.value} [${item.direction.toUpperCase()}] (Ref: ${item.reference_range || 'not available'})`);
    }
    lines.push('', '---');
  } else {
    lines.push('', '## Results Within Provided Reference Ranges', 'All extracted test values are within the provided reference ranges. Do not describe the patient as perfectly healthy.', '', '---');
  }

  lines.push(
    '',
    '## Complete Lab Values',
    'Layout: Compact tables grouped by section. This section is mandatory and must include every test row below.',
    'Flag column rule: use only compact source flags printed in the uploaded report (N/H/L/C). Leave the flag blank when the source report did not print a flag for that test. Do not generate flags from reference ranges.',
    ''
  );

  const sourceFlags = new Set<string>();
  sections.forEach((section, index) => {
    lines.push('', `### ${section.section_name || `Section ${index + 1}`}`, 'Table Columns: Test | Result | Unit | Flag | Reference Range', `Category: ${section.category || 'not available'}`, '');
    for (const test of section.tests || []) {
      const flag = compactSourceFlag(test.source_flag);
      if (flag) sourceFlags.add(flag);
      lines.push(`- ${test.test_name} | ${test.value} | ${test.unit || 'not available'} | ${flag} | ${test.reference_range || 'not available'}`);
    }
  });
  const sourceFlagLegend = buildSourceFlagLegend(sourceFlags);
  if (sourceFlagLegend) lines.push('', sourceFlagLegend);
  lines.push('', '---');

  // Add Clinical Calculations Section (for longevity reports or when calculations are available)
  if (calculations && (calculations.individual_indices.length > 0 || calculations.composite_scores.length > 0)) {
    lines.push('', '## Clinical Calculations & Health Indices');
    lines.push('Layout: Health Dashboard with Score Cards');
    lines.push('');

    // Add individual calculated indices
    if (calculations.individual_indices.length > 0) {
      lines.push('### Calculated Clinical Indices');
      lines.push('');

      // Group by category
      const byCategory: Record<string, CalculatedIndex[]> = {};
      for (const idx of calculations.individual_indices) {
        if (!byCategory[idx.category]) {
          byCategory[idx.category] = [];
        }
        byCategory[idx.category].push(idx);
      }

      for (const [category, indices] of Object.entries(byCategory)) {
        lines.push(`**${category}**`);
        for (const idx of indices) {
          const statusIcon = idx.status === 'optimal' ? '✓' : idx.status === 'borderline' ? '⚠' : idx.status === 'high' || idx.status === 'low' ? '!' : '';
          lines.push(`- ${idx.name}: ${idx.value}${idx.unit ? ' ' + idx.unit : ''} ${statusIcon}`);
          lines.push(`  ${idx.interpretation}`);
          if (idx.reference_range) {
            lines.push(`  Reference: ${idx.reference_range}`);
          }
        }
        lines.push('');
      }
      lines.push('---');
    }

    // Add composite health scores (especially for longevity reports)
    if (calculations.composite_scores.length > 0) {
      lines.push('');
      lines.push('### Composite Health Scores');
      lines.push('Layout: Score Cards with Grades A-F');
      lines.push('');

      for (const score of calculations.composite_scores) {
        lines.push(`**${score.emoji} ${score.name}: ${score.score}/100 (Grade ${score.grade})**`);
        lines.push(`  ${score.interpretation}`);
        if (score.factors_used.length > 0) {
          lines.push(`  Based on: ${score.factors_used.slice(0, 6).join(', ')}${score.factors_used.length > 6 ? '...' : ''}`);
        }
        if (score.recommendations.length > 0) {
          lines.push(`  Recommendations:`);
          for (const rec of score.recommendations.slice(0, 2)) {
            lines.push(`    • ${rec}`);
          }
        }
        lines.push('');
      }
      lines.push('---');
    }
  }

  return lines.join('\n');
}

function buildCompactLayoutPrompt(data: ExtractedReport, input: GenerateRequest, calculations?: CalculationsResult) {
  const sections = data.test_sections || [];
  const abnormals = data.abnormal_summary || [];
  const patient = data.patient || {};
  const lab = data.lab_info || {};
  const summary = data.patient_summary || null;
  const language = getTargetLanguage(input.summary_language);

  const lines: string[] = [
    '# SMART REPORT LAYOUT',
    '',
    '## Content Grounding Rules',
    'Use only the patient data, test values, units, reference ranges, dates, lab details, calculated indices, and trend data included below.',
    'Do not add diagnoses, symptoms, medications, lifestyle advice, procedures, or biomarkers that are not present in the data.',
    'Do not omit any lab value listed under "Complete Lab Values". Present every test row in the final report.',
    'Use compact tables for values and short callouts for interpretation.',
    'If a value or comparison is missing, write "not available" instead of guessing.',
    'Avoid marketing phrases such as "excellent health profile", "perfectly healthy", "world-class", or "complete transformation".',
    '',
    '## Required Report Structure',
    '1. Patient header and report metadata.',
    '2. Short patient summary.',
    '3. Abnormal value highlights.',
    '4. Calculated clinical indices, when available.',
    '5. Complete Lab Values table grouped by original report section. This is mandatory.',
    '6. Short clinical disclaimer.',
    '',
    '## Page Header',
    `Patient: ${patient.name || input.patient_name || 'not available'}`,
    `Age/Sex: ${patient.age || 'not available'} / ${patient.sex || 'not available'}`,
    `Report Date: ${patient.report_date || 'not available'}`,
    `Doctor: ${patient.doctor_name || 'not available'}`,
    `Lab: ${lab.name || 'not available'}`,
    `Report Type: ${input.report_type}`,
    `Summary Language: ${language.name}`,
    input.notes ? `Request Notes: ${input.notes}` : '',
    '',
    '---',
  ].filter(Boolean);

  if (summary) {
    lines.push(
      '',
      `## Patient Summary (${language.name})`,
      summary.health_status ? `Overall Status: ${summary.health_status}` : '',
      summary.summary_message ? `Message: ${summary.summary_message}` : '',
      `Needs Consultation: ${summary.needs_consultation ? 'Yes' : 'No'}`,
      summary.consultation_recommendation ? `Consultation Recommendation: ${summary.consultation_recommendation}` : '',
      '',
      '### Abnormal Findings Explained (brief callouts)',
    );

    if (summary.abnormal_findings?.length) {
      for (const item of summary.abnormal_findings) {
        lines.push(`- ${item.test_name}: ${item.value} [${item.status}] - ${item.explanation}`);
        lines.push(`  Discuss: ${item.what_to_do}`);
      }
    } else {
      lines.push('- No abnormal findings were explained from the extracted data.');
    }

    lines.push('', '### Normal Findings Summary');
    if (summary.normal_findings_detailed?.length) {
      for (const item of summary.normal_findings_detailed.slice(0, 5)) {
        lines.push(`- ${item.test_name}: ${item.value} - ${item.your_result_means}`);
      }
    } else {
      lines.push('- Normal findings summary not available.');
    }

    if (summary.health_tips?.length) {
      lines.push('', '### Grounded Health Tips');
      for (const tip of summary.health_tips.slice(0, 3)) {
        lines.push(`- ${tip}`);
      }
    }

    lines.push('', '---');
  }

  if (abnormals.length > 0) {
    lines.push('', '## Abnormal Values Summary', 'Layout: Compact alert cards with clear HIGH/LOW labels', '');
    for (const item of abnormals) {
      lines.push(`- ${item.section}: ${item.test_name} ${item.value} [${item.direction.toUpperCase()}] (Ref: ${item.reference_range || 'not available'})`);
    }
    lines.push('', '---');
  } else {
    lines.push('', '## Results Within Provided Reference Ranges', 'All extracted test values are within the provided reference ranges. Do not describe the patient as perfectly healthy.', '', '---');
  }

  if (calculations && calculations.individual_indices.length > 0) {
    lines.push('', '## Clinical Calculations & Health Indices', 'Layout: Compact score cards grouped by category', '');

    const byCategory: Record<string, CalculatedIndex[]> = {};
    for (const idx of calculations.individual_indices) {
      if (!byCategory[idx.category]) byCategory[idx.category] = [];
      byCategory[idx.category].push(idx);
    }

    for (const [category, indices] of Object.entries(byCategory)) {
      lines.push(`### ${category}`);
      lines.push('Table Columns: Index | Value | Status | Interpretation | Reference');
      for (const idx of indices) {
        lines.push(`- ${idx.name} | ${idx.value}${idx.unit ? ' ' + idx.unit : ''} | ${idx.status.toUpperCase()} | ${idx.interpretation} | ${idx.reference_range || 'not available'}`);
      }
      lines.push('');
    }
    lines.push('---');
  }

  if (calculations && calculations.composite_scores.length > 0) {
    lines.push('', '## Composite Health Scores', 'Layout: Score cards with grades A-F', '');
    for (const score of calculations.composite_scores) {
      lines.push(`- ${score.name}: ${score.score}/100 (Grade ${score.grade}) - ${score.interpretation}`);
      if (score.factors_used.length > 0) {
        lines.push(`  Based on: ${score.factors_used.slice(0, 6).join(', ')}${score.factors_used.length > 6 ? '...' : ''}`);
      }
    }
    lines.push('', '---');
  }

  if (calculations && calculations.not_calculated_indices.length > 0) {
    lines.push('', '## Calculation Availability Notes');
    lines.push('Use only if there is space; keep compact. Do not let this replace the complete lab values table.');
    for (const idx of calculations.not_calculated_indices.slice(0, 8)) {
      lines.push(`- ${idx.name}: ${idx.interpretation}`);
    }
    lines.push('', '---');
  }

  lines.push(
    '',
    '## Complete Lab Values',
    'Layout: Compact tables grouped by section. Mandatory: include every test row below.',
    'Flag column rule: use only compact source flags printed in the uploaded report (N/H/L/C). Leave the flag blank when the source report did not print a flag for that test. Do not generate flags from reference ranges.',
    ''
  );

  const sourceFlags = new Set<string>();
  sections.forEach((section, index) => {
    lines.push(`### ${section.section_name || `Section ${index + 1}`}`);
    lines.push('Table Columns: Test | Result | Unit | Flag | Reference Range');
    lines.push(`Category: ${section.category || 'not available'}`);
    for (const test of section.tests || []) {
      const flag = compactSourceFlag(test.source_flag);
      if (flag) sourceFlags.add(flag);
      lines.push(`- ${test.test_name} | ${test.value} | ${test.unit || 'not available'} | ${flag} | ${test.reference_range || 'not available'}`);
    }
    lines.push('');
  });
  const sourceFlagLegend = buildSourceFlagLegend(sourceFlags);
  if (sourceFlagLegend) lines.push(sourceFlagLegend, '');

  return lines.join('\n');
}

async function generateWithGamma(layoutPrompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('GAMMA_API_KEY');
  if (!apiKey) return null;

  const start = await fetch('https://public-api.gamma.app/v1.0/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      accept: 'application/json',
    },
    body: JSON.stringify({
      textMode: 'generate',
      inputText: layoutPrompt,
      format: 'document',
      themeId: Deno.env.get('GAMMA_THEME_ID') || 'wbpgwj9c0ty5wbo',
      cardSplit: 'auto',
      additionalInstructions: GAMMA_INSTRUCTIONS,
      exportAs: 'pdf',
      sharingOptions: {
        workspaceAccess: 'edit',
        externalAccess: 'view',
      },
      imageOptions: {
        source: 'noImages',
      },
    }),
  });

  if (!start.ok) {
    const text = await start.text();
    throw new Error(`Gamma API error ${start.status}: ${text}`);
  }

  const started = await start.json();
  const generationId = started.generationId || started.id;
  if (!generationId) throw new Error('Gamma did not return a generation id');

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll = await fetch(`https://public-api.gamma.app/v1.0/generations/${generationId}`, {
      headers: {
        'X-API-KEY': apiKey,
        accept: 'application/json',
      },
    });
    if (!poll.ok) continue;

    const status = await poll.json();
    if (status.status === 'completed') {
      return status.exportUrl || status.pdfUrl || null;
    }
    if (status.status === 'failed' || status.status === 'error') {
      throw new Error(`Gamma generation failed: ${JSON.stringify(status)}`);
    }
  }

  throw new Error('Gamma generation timed out');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildFallbackHtml(data: ExtractedReport, input: GenerateRequest) {
  const patient = data.patient || {};
  const lab = data.lab_info || {};
  const abnormals = data.abnormal_summary || [];
  const summary = data.patient_summary || null;
  const language = getTargetLanguage(input.summary_language);

  const abnormalHtml = abnormals.length === 0
    ? '<p>All extracted test values are within the provided reference ranges. This does not mean the patient is perfectly healthy.</p>'
    : `<ul>${abnormals.map((item) => `<li><strong>${escapeHtml(item.test_name)}</strong>: ${escapeHtml(item.value)} <span class="abnormal">[${escapeHtml(item.direction.toUpperCase())}]</span> Ref: ${escapeHtml(item.reference_range || 'not available')}</li>`).join('')}</ul>`;

  const sourceFlags = new Set<string>();
  const sectionHtml = (data.test_sections || []).map((section) => `
    <section>
      <h2>${escapeHtml(section.section_name || 'Report Section')}</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Value</th>
            <th>Reference Range</th>
            <th>Flag</th>
          </tr>
        </thead>
        <tbody>
          ${(section.tests || []).map((test) => {
            const flag = compactSourceFlag(test.source_flag);
            if (flag) sourceFlags.add(flag);
            return `
              <tr>
                <td>${escapeHtml(test.test_name)}</td>
                <td>${escapeHtml(`${test.value} ${test.unit || ''}`.trim())}</td>
                <td>${escapeHtml(test.reference_range || 'not available')}</td>
                <td class="${flag === 'H' || flag === 'L' || flag === 'C' ? 'abnormal' : 'normal'}">${escapeHtml(flag)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  `).join('');

  const sourceFlagLegend = buildSourceFlagLegend(sourceFlags);

  const summaryHtml = summary ? `
    <section>
      <h2>Patient Summary (${escapeHtml(language.name)})</h2>
      ${summary.health_status ? `<p><strong>Overall status:</strong> ${escapeHtml(summary.health_status)}</p>` : ''}
      ${summary.summary_message ? `<p>${escapeHtml(summary.summary_message)}</p>` : ''}
      <p><strong>Needs consultation:</strong> ${summary.needs_consultation ? 'Yes' : 'No'}</p>
      ${summary.consultation_recommendation ? `<p><strong>Recommendation:</strong> ${escapeHtml(summary.consultation_recommendation)}</p>` : ''}
      ${summary.abnormal_findings?.length ? `
        <h3>Abnormal Findings Explained</h3>
        <ul>
          ${summary.abnormal_findings.map((item) => `
            <li>
              <strong>${escapeHtml(item.test_name)}</strong>: ${escapeHtml(item.value)} <span class="abnormal">[${escapeHtml(item.status)}]</span><br />
              ${escapeHtml(item.what_it_measures)} ${escapeHtml(item.explanation)} ${escapeHtml(item.what_to_do)}
            </li>
          `).join('')}
        </ul>
      ` : ''}
      ${summary.normal_findings_detailed?.length ? `
        <h3>Normal Findings Explained</h3>
        <ul>
          ${summary.normal_findings_detailed.slice(0, 12).map((item) => `
            <li>
              <strong>${escapeHtml(item.test_name)}</strong>: ${escapeHtml(item.value)}<br />
              ${escapeHtml(item.what_it_measures)} ${escapeHtml(item.your_result_means)}
            </li>
          `).join('')}
        </ul>
      ` : ''}
      ${summary.health_tips?.length ? `
        <h3>Health Tips</h3>
        <ul>${summary.health_tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
      ` : ''}
    </section>
  ` : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; }
    h1 { color: #253179; margin-bottom: 4px; }
    h2 { color: #253179; border-bottom: 1px solid #dbe3ff; padding-bottom: 6px; margin-top: 24px; }
    .meta { color: #4b5563; font-size: 12px; line-height: 1.5; }
    .notice { background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; padding: 10px; border-radius: 6px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
    h3 { color: #374151; margin-bottom: 4px; }
    li { margin-bottom: 6px; }
    th { background: #eef2ff; text-align: left; }
    th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; }
    .abnormal { color: #b91c1c; font-weight: 700; }
    .normal { color: #047857; font-weight: 700; }
    .footer { margin-top: 28px; color: #6b7280; font-size: 10px; }
  </style>
</head>
<body>
  <h1>Smart Pathology Report</h1>
  <div class="meta">
    <div><strong>Patient:</strong> ${escapeHtml(patient.name || input.patient_name || 'not available')}</div>
    <div><strong>Report Date:</strong> ${escapeHtml(patient.report_date || 'not available')}</div>
    <div><strong>Age/Sex:</strong> ${escapeHtml(patient.age || 'not available')} / ${escapeHtml(patient.sex || 'not available')}</div>
    <div><strong>Lab:</strong> ${escapeHtml(lab.name || 'not available')}</div>
    <div><strong>Report Type:</strong> ${escapeHtml(input.report_type)}</div>
    <div><strong>Summary Language:</strong> ${escapeHtml(language.name)}</div>
  </div>
  <div class="notice">This report summarizes extracted values only. It does not provide a diagnosis. Discuss clinical next steps with your clinician.</div>
  ${summaryHtml}
  <section>
    <h2>Abnormal Values Summary</h2>
    ${abnormalHtml}
  </section>
  ${sectionHtml}
  ${sourceFlagLegend ? `<div class="footer">${escapeHtml(sourceFlagLegend)}</div>` : ''}
  <div class="footer">Generated from uploaded source reports using grounded extraction rules. Missing or unclear values are not guessed.</div>
</body>
</html>`;
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp)(?:\?|#|$)/i.test(url);
}

function buildBrandedPageHtml(data: ExtractedReport, input: GenerateRequest, pageKind: 'first' | 'last') {
  const patient = data.patient || {};
  const lab = data.lab_info || {};
  const sections = data.test_sections || [];
  const language = getTargetLanguage(input.summary_language);
  const letterheadUrl = input.letterhead_url || '';
  const backgroundStyle = letterheadUrl && isImageUrl(letterheadUrl) ? `
    #page-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 210mm;
      height: 297mm;
      z-index: 0;
      background-image: url('${letterheadUrl}');
      background-size: 210mm 297mm;
      background-repeat: no-repeat;
    }
  ` : '';

  const testChips = sections.slice(0, 12).map((section) =>
    `<span class="test-chip">${escapeHtml(section.section_name || 'Report Section')}</span>`
  ).join('');

  const title = pageKind === 'first' ? 'Smart Health Report' : 'Report Closing Summary';
  const closing = pageKind === 'last'
    ? `<div class="closing-box">
        <h2>Important Note</h2>
        <p>This AI-enhanced report is a patient-friendly summary of extracted laboratory values. It is not a diagnosis. Please consult your physician for medical interpretation and treatment decisions.</p>
        <p class="warm">${escapeHtml(data.patient_summary?.summary_message || 'Thank you for trusting us with your health report.')}</p>
      </div>`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; width: 210mm; min-height: 297mm; font-family: Arial, sans-serif; color: #1f2937; }
    ${backgroundStyle}
    .cover-page { position: relative; z-index: 1; padding: 42px; padding-top: ${letterheadUrl ? '250px' : '42px'}; padding-bottom: ${letterheadUrl ? '140px' : '42px'}; min-height: 297mm; box-sizing: border-box; }
    .lab-section { margin-bottom: 28px; display: ${letterheadUrl ? 'none' : 'block'}; }
    .lab-name { font-size: 26px; font-weight: 700; color: #1e40af; }
    .lab-contact { color: #475569; font-size: 12px; margin-top: 4px; }
    .report-title { margin: 28px 0; }
    h1 { font-size: 34px; color: #1f2937; margin: 0 0 10px; }
    h2 { color: #1e40af; margin-top: 0; }
    .smart-badge { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 8px 20px; border-radius: 25px; display: inline-block; font-size: 13px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .info-card { background: rgba(248,250,252,0.96); border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; }
    .info-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e5e7eb; padding: 8px 0; font-size: 12px; }
    .info-row span:first-child { color: #64748b; }
    .info-row span:last-child { font-weight: 600; text-align: right; }
    .test-scope { margin-top: 28px; background: rgba(255,255,255,0.94); border: 1px solid #dbeafe; border-radius: 10px; padding: 18px; }
    .test-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .test-chip { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1px solid #93c5fd; padding: 8px 12px; border-radius: 8px; font-size: 11px; }
    .closing-box { margin-top: 40px; background: rgba(255,255,255,0.95); border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; line-height: 1.55; }
    .warm { font-weight: 600; color: #1e40af; }
    .disclaimer { position: absolute; bottom: 42px; left: 42px; right: 42px; color: #64748b; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  ${letterheadUrl && isImageUrl(letterheadUrl) ? '<div id="page-bg"></div>' : ''}
  <div class="cover-page">
    <div class="lab-section">
      <div class="lab-name">${escapeHtml(lab.name || 'Laboratory')}</div>
      <div class="lab-contact">${escapeHtml([lab.address, lab.phone].filter(Boolean).join(' | ') || 'Lab details not available')}</div>
    </div>
    <div class="report-title">
      <h1>${escapeHtml(title)}</h1>
      <span class="smart-badge">AI Enhanced Analysis</span>
    </div>
    <div class="info-grid">
      <div class="info-card">
        <h2>Patient Information</h2>
        <div class="info-row"><span>Name</span><span>${escapeHtml(patient.name || input.patient_name || 'not available')}</span></div>
        <div class="info-row"><span>Age/Gender</span><span>${escapeHtml(patient.age || 'not available')} / ${escapeHtml(patient.sex || 'not available')}</span></div>
        <div class="info-row"><span>Language</span><span>${escapeHtml(language.name)}</span></div>
      </div>
      <div class="info-card">
        <h2>Report Details</h2>
        <div class="info-row"><span>Report Date</span><span>${escapeHtml(patient.report_date || 'not available')}</span></div>
        <div class="info-row"><span>Doctor</span><span>${escapeHtml(patient.doctor_name || 'not available')}</span></div>
        <div class="info-row"><span>Report Type</span><span>${escapeHtml(input.report_type)}</span></div>
      </div>
    </div>
    ${pageKind === 'first' ? `
      <div class="test-scope">
        <h2>Tests Included</h2>
        <div class="test-list">${testChips || '<span class="test-chip">Extracted report values</span>'}</div>
      </div>
    ` : closing}
    <div class="disclaimer">This AI-enhanced report provides a patient-friendly summary. Please consult your physician for medical interpretation.</div>
  </div>
</body>
</html>`;
}

async function convertHtmlToPdfCo(html: string, name: string) {
  const apiKey = Deno.env.get('PDFCO_API_KEY');
  if (!apiKey) {
    throw new Error('PDFCO_API_KEY is required for branded first/last pages');
  }

  const response = await fetch('https://api.pdf.co/v1/pdf/convert/from/html', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      html,
      name,
      paperSize: 'A4',
      margins: '0px 0px 0px 0px',
      async: false,
      printBackground: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PDF.co branded page error ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (result.error || !result.url) {
    throw new Error(result.message || 'PDF.co did not return branded page URL');
  }

  return result.url as string;
}

async function mergePdfUrlsWithPdfCo(urls: string[], name: string) {
  const apiKey = Deno.env.get('PDFCO_API_KEY');
  if (!apiKey) {
    throw new Error('PDFCO_API_KEY is required to merge branded pages');
  }

  const response = await fetch('https://api.pdf.co/v1/pdf/merge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      url: urls.join(','),
      name,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PDF.co merge error ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (result.error || !result.url) {
    throw new Error(result.message || 'PDF.co did not return merged PDF URL');
  }

  return result.url as string;
}

async function addFirstAndLastBrandedPages(generatedReportUrl: string, data: ExtractedReport, input: GenerateRequest) {
  if (!input.letterhead_url) return generatedReportUrl;

  if (!isImageUrl(input.letterhead_url)) {
    console.warn('[generate-pathology-infographic] Letterhead URL is not an image. Branded page content will render without a CSS background. Use PNG/JPG A4 letterhead for full-page background branding.');
  }

  logStage('branded_pages_start', {
    request_id: input.request_id,
    letterhead_url: input.letterhead_url,
    image_background: isImageUrl(input.letterhead_url),
    content_top_padding_px: 250,
    content_bottom_padding_px: 140,
  });

  const firstPageUrl = await convertHtmlToPdfCo(
    buildBrandedPageHtml(data, input, 'first'),
    `smart-report-first-page-${input.request_id}.pdf`
  );
  const lastPageUrl = await convertHtmlToPdfCo(
    buildBrandedPageHtml(data, input, 'last'),
    `smart-report-last-page-${input.request_id}.pdf`
  );

  const mergedUrl = await mergePdfUrlsWithPdfCo(
    [firstPageUrl, generatedReportUrl, lastPageUrl],
    `smart-report-branded-${input.request_id}.pdf`
  );

  logStage('branded_pages_done', { merged_url: mergedUrl });
  return mergedUrl;
}

async function generateFallbackPdfWithPdfCo(data: ExtractedReport, input: GenerateRequest) {
  const apiKey = Deno.env.get('PDFCO_API_KEY');
  if (!apiKey) {
    throw new Error('Configure GAMMA_API_KEY or PDFCO_API_KEY to generate Smart Report PDFs');
  }

  const response = await fetch('https://api.pdf.co/v1/pdf/convert/from/html', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      html: buildFallbackHtml(data, input),
      name: `smart-report-${input.request_id}.pdf`,
      paperSize: 'A4',
      margins: '24px 24px 24px 24px',
      async: false,
      printBackground: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PDF.co HTML-to-PDF error ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (result.error || !result.url) {
    throw new Error(result.message || 'PDF.co did not return a PDF URL');
  }

  return result.url as string;
}

async function uploadPdfToStorage(supabase: any, requestId: string, patientName: string, pdfBytes: ArrayBuffer | Uint8Array) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `smart-reports/${requestId}/${sanitizeFilePart(patientName)}-${timestamp}.pdf`;
  const { error } = await supabase.storage
    .from('reports')
    .upload(filename, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload generated PDF: ${error.message}`);

  const { data } = supabase.storage.from('reports').getPublicUrl(filename);
  return data.publicUrl;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ success: false, error: 'Supabase function secrets are not configured' }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);
  let input: GenerateRequest | null = null;

  try {
    const parsedInput = await req.json() as GenerateRequest;
    input = parsedInput;
    logStage('request_received', {
      request_id: parsedInput.request_id,
      patient_name: parsedInput.patient_name,
      report_type: parsedInput.report_type,
      uploaded_count: parsedInput.uploaded_report_urls?.length || 0,
      has_letterhead: Boolean(parsedInput.letterhead_url),
      has_biometrics: Boolean(parsedInput.biometrics),
      has_anthropic_key: Boolean(Deno.env.get('ANTHROPIC_API_KEY')),
      has_gamma_key: Boolean(Deno.env.get('GAMMA_API_KEY')),
      has_pdfco_key: Boolean(Deno.env.get('PDFCO_API_KEY')),
      has_service_key: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
    });

    if (!parsedInput.request_id) return jsonResponse({ success: false, error: 'request_id is required' }, 400);
    if (!parsedInput.uploaded_report_urls?.length) return jsonResponse({ success: false, error: 'At least one uploaded report URL is required' }, 400);

    logStage('mark_processing', { request_id: parsedInput.request_id });
    await serviceClient.from('report_requests').update({ status: 'processing' }).eq('id', parsedInput.request_id);

    const pdfBuffers: ArrayBuffer[] = [];
    for (const url of parsedInput.uploaded_report_urls) {
      if (!url.toLowerCase().includes('.pdf')) continue;
      logStage('download_pdf_start', { url });
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download uploaded report: ${response.status} ${response.statusText}`);
      pdfBuffers.push(await response.arrayBuffer());
      logStage('download_pdf_done', { url, pdf_count: pdfBuffers.length });
    }

    if (pdfBuffers.length === 0) {
      throw new Error('Smart report generation currently requires at least one uploaded PDF file');
    }

    let extractedData: ExtractedReport;
    let extractionWarning: string | null = null;
    let summaryWarning: string | null = null;
    try {
      logStage('claude_extract_start', { pdf_count: pdfBuffers.length });
      extractedData = await extractWithClaude(pdfBuffers);
      logStage('claude_extract_done', {
        sections: extractedData.test_sections?.length || 0,
        abnormal_count: extractedData.abnormal_summary?.length || 0,
      });
    } catch (error) {
      extractionWarning = error instanceof Error ? error.message : 'AI extraction failed';
      console.warn('[generate-pathology-infographic] Claude extraction warning:', extractionWarning);
      extractedData = buildFallbackReport(parsedInput);
    }

    try {
      logStage('patient_summary_start', {
        language: parsedInput.summary_language || 'en',
        target_language: getTargetLanguage(parsedInput.summary_language).name,
      });
      extractedData.patient_summary = await generatePatientSummaryWithClaude(extractedData, parsedInput);
      logStage('patient_summary_done', {
        language: extractedData.patient_summary?.language || parsedInput.summary_language || 'en',
        normal_count: extractedData.patient_summary?.normal_findings_detailed?.length || 0,
        abnormal_count: extractedData.patient_summary?.abnormal_findings?.length || 0,
      });
    } catch (error) {
      summaryWarning = error instanceof Error ? error.message : 'Patient summary generation failed';
      console.warn('[generate-pathology-infographic] Patient summary warning:', summaryWarning);
    }

    // Calculate clinical indices and composite scores
    let calculations: CalculationsResult | undefined;
    let calculationsWarning: string | null = null;
    try {
      logStage('clinical_calculations_start', {
        has_biometrics: Boolean(parsedInput.biometrics),
        report_type: parsedInput.report_type,
      });

      // Extract lab values from parsed report data
      const labValues = extractLabValuesFromReport(extractedData);
      const mappingStats = (labValues as ExtractedLabValues & {
        __mapping_stats?: {
          ai_mapped_count: number;
          fallback_mapped_count: number;
          unmapped_numeric_count: number;
        };
      }).__mapping_stats;
      const biometrics = parsedInput.biometrics || {};

      logStage('lab_values_extracted', {
        extracted_values_count: Object.keys(labValues).filter((k) =>
          k !== '__mapping_stats' && labValues[k as keyof ExtractedLabValues] !== undefined
        ).length,
        ai_mapped_count: mappingStats?.ai_mapped_count || 0,
        fallback_mapped_count: mappingStats?.fallback_mapped_count || 0,
        unmapped_numeric_count: mappingStats?.unmapped_numeric_count || 0,
        has_age: Boolean(labValues.age),
        has_sex: Boolean(labValues.sex),
      });

      // Calculate individual indices and keep diagnostics for missing inputs.
      const allIndividualIndices = calculateAllIndices(labValues, biometrics);
      const individualIndices = allIndividualIndices.filter((idx) => idx.status !== 'not_calculated');
      const notCalculatedIndices = allIndividualIndices.filter((idx) => idx.status === 'not_calculated');

      // Calculate composite scores (especially for longevity reports)
      const compositeScores = parsedInput.report_type === 'longitivity_report'
        ? getCalculableCompositeScores(labValues, biometrics)
        : [];

      calculations = {
        individual_indices: individualIndices,
        not_calculated_indices: notCalculatedIndices,
        composite_scores: compositeScores,
      };

      logStage('clinical_calculations_done', {
        individual_indices_count: individualIndices.length,
        not_calculated_indices_count: notCalculatedIndices.length,
        composite_scores_count: compositeScores.length,
      });

      // Save calculated indices to database
      if (individualIndices.length > 0 || compositeScores.length > 0) {
        await serviceClient
          .from('report_requests')
          .update({
            calculated_indices: calculations,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parsedInput.request_id);
      }
    } catch (error) {
      calculationsWarning = error instanceof Error ? error.message : 'Clinical calculations failed';
      console.warn('[generate-pathology-infographic] Clinical calculations warning:', calculationsWarning);
    }

    const layoutPrompt = buildCompactLayoutPrompt(extractedData, parsedInput, calculations);
    let generatedUrl: string | null = null;
    let generationWarning: string | null = null;
    try {
      logStage('gamma_generation_start', { layout_chars: layoutPrompt.length });
      generatedUrl = await generateWithGamma(layoutPrompt);
      logStage('gamma_generation_done', { generated_url: generatedUrl });
    } catch (error) {
      generationWarning = error instanceof Error ? error.message : 'Gamma generation failed';
      console.warn('[generate-pathology-infographic] Gamma generation warning:', generationWarning);
    }

    if (!generatedUrl) {
      logStage('pdfco_fallback_start');
      generatedUrl = await generateFallbackPdfWithPdfCo(extractedData, parsedInput);
      logStage('pdfco_fallback_done', { generated_url: generatedUrl });
    }

    generatedUrl = await addFirstAndLastBrandedPages(generatedUrl, extractedData, parsedInput);

    logStage('download_generated_pdf_start', { generated_url: generatedUrl });
    const generatedPdf = await fetch(generatedUrl);
    if (!generatedPdf.ok) {
      throw new Error(`Failed to download generated PDF: ${generatedPdf.status} ${generatedPdf.statusText}`);
    }
    const generatedBytes = await generatedPdf.arrayBuffer();
    logStage('upload_generated_pdf_start', { bytes: generatedBytes.byteLength });
    generatedUrl = await uploadPdfToStorage(serviceClient, parsedInput.request_id, parsedInput.patient_name, generatedBytes);
    logStage('upload_generated_pdf_done', { generated_url: generatedUrl });

    await serviceClient
      .from('report_requests')
      .update({
        status: 'completed',
        generated_report_url: generatedUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.request_id);
    logStage('request_completed', { request_id: parsedInput.request_id });

    return jsonResponse({
      success: true,
      generated_report_url: generatedUrl,
      extracted_data: extractedData,
      calculated_indices: calculations,
      extraction_warning: extractionWarning,
      summary_warning: summaryWarning,
      generation_warning: generationWarning,
      calculations_warning: calculationsWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-pathology-infographic] Error:', {
      request_id: input?.request_id,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (input?.request_id) {
      await serviceClient
        .from('report_requests')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', input.request_id);
    }
    return jsonResponse({ success: false, error: message }, 500);
  }
});
