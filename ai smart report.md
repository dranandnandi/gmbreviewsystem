# Smart Report Infographic Generation with Claude Haiku 4.5 & Gamma API

## Overview

This guide documents how to implement an intelligent pathology report infographic generation system similar to our LIMS smart report feature. The system:

1. **Parses PDF reports** using Claude Haiku 4.5 (fast, cost-effective vision model)
2. **Generates structured layout prompts** for infographic rendering
3. **Creates visual reports** using Gamma AI API
4. **Supports trend analysis and longevity reports** for multi-date data

---

## Smart Report Content Guidance

Apply the same quality rules used for AI review generation to smart reports:

1. **Use complete context**
   - Combine every reliable source field before generating the report: extracted PDF data, patient demographics, lab info, doctor name, prior reports, historical trend data, and lab branding metadata.
   - Do not let one field override another unless the newer source is explicitly verified as more accurate.
   - Preserve source attribution when the same marker appears in multiple reports or labs.

2. **Enforce factual grounding**
   - Explain only tests, values, dates, reference ranges, trends, and domains present in the extracted data.
   - Do not invent diagnoses, symptoms, medications, doctor advice, lifestyle habits, procedures, or missing biomarkers.
   - If a result is missing, unclear, or not comparable across dates, label it as unavailable instead of guessing.

3. **Avoid generic marketing or wellness language**
   - Avoid phrases like "excellent health profile", "world-class report", "complete transformation", "highly recommended", "perfectly healthy", and "optimal lifestyle".
   - Use simple, clinical, patient-friendly wording such as "within range", "above the reference range", "needs clinician review", "changed compared with the previous report", and "not enough data to compare".

4. **Vary layout and explanations**
   - Rotate visual layouts across sections so repeated reports do not look templated.
   - Vary section openings between summary-first, abnormal-first, trend-first, and domain-first structures.
   - Keep repeated clinical wording consistent for safety, but vary non-clinical sentence structure for readability.

5. **Separate interpretation from advice**
   - The report can summarize what the numbers show.
   - Any recommendation must be framed as "discuss with your clinician" unless it is a neutral operational action such as "repeat test date unavailable".

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INPUT LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│  PDF Upload → Claude Haiku 4.5 → Structured Data                    │
│              (Vision Model)       (JSON)                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  1. Patient Demographics Extraction                                  │
│  2. Test Results Parsing (Name, Value, Unit, Reference Range)       │
│  3. Abnormal Value Detection                                        │
│  4. Historical Trend Matching (if prior reports available)          │
│  5. Longevity Domain Classification                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       OUTPUT LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│  A. Smart Report (Single Report)                                    │
│  B. Trend Analysis Report (Multi-date Comparison)                   │
│  C. Longevity Report (Domain-grouped Health Dashboard)              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RENDERING LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Gamma AI API → PDF Generation → Storage → Delivery                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Reference

### 1. Claude Anthropic API (PDF Parsing)

**Endpoint:** `https://api.anthropic.com/v1/messages`

**Model:** `claude-haiku-4-5-20251001` (optimal for vision + cost efficiency)

**Request Format:**
```typescript
interface AnthropicPDFRequest {
  model: 'claude-haiku-4-5-20251001';
  max_tokens: 8192;
  messages: [
    {
      role: 'user';
      content: [
        {
          type: 'document';
          source: {
            type: 'base64';
            media_type: 'application/pdf';
            data: string; // Base64 encoded PDF
          };
        },
        {
          type: 'text';
          text: string; // Extraction prompt
        }
      ];
    }
  ];
}
```

**Response Format:**
```typescript
interface AnthropicResponse {
  id: string;
  content: [
    {
      type: 'text';
      text: string; // JSON string with extracted data
    }
  ];
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

**Pricing (as of 2026):**
- Input: $0.80 / MTok
- Output: $4.00 / MTok
- PDF pages: ~1500 tokens per page average

### 2. Gamma AI API (Report Generation)

**Base URL:** `https://public-api.gamma.app/v1.0`

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generations` | POST | Initiate document generation |
| `/generations/{id}` | GET | Poll generation status |

**Generation Request:**
```typescript
interface GammaGenerationRequest {
  textMode: 'generate';
  inputText: string;           // Markdown/structured content
  format: 'document';          // or 'presentation'
  themeId: string;             // Visual theme ID
  cardSplit: 'auto' | 'inputTextBreaks';
  additionalInstructions: string;
  exportAs: 'pdf';
  sharingOptions: {
    workspaceAccess: 'edit';
    externalAccess: 'view';
  };
  imageOptions: {
    source: 'noImages' | 'aiGenerated' | 'stock';
  };
}
```

**Polling Response:**
```typescript
interface GammaGenerationStatus {
  generationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportUrl?: string;    // PDF URL when complete
  url?: string;          // Gamma editor URL
  pdfUrl?: string;       // Alternative PDF URL field
}
```

**Theme IDs (Medical/Professional):**
- `wbpgwj9c0ty5wbo` - Clean Medical (recommended)
- `modern-medical` - Modern healthcare style
- `clinical-clean` - Clinical report style

### 3. PDF.co API (PDF Manipulation)

**Base URL:** `https://api.pdf.co/v1`

**Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `/pdf/convert/from/html` | HTML to PDF conversion |
| `/pdf/edit/add` | Add images/annotations to PDF |
| `/pdf/merge` | Merge multiple PDFs |

**HTML to PDF:**
```typescript
interface PDFCoHTMLRequest {
  html: string;
  name: string;
  paperSize: 'A4';
  margins: string;  // '0px 0px 0px 0px' for full bleed
  async: false;
  printBackground: true;
}
```

**Add Images/Overlays:**
```typescript
interface PDFCoEditRequest {
  url: string;  // Source PDF URL
  images: Array<{
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pages: string;  // '0-' for all pages
  }>;
  name: string;
}
```

---

## Implementation Code

### Step 1: PDF Extraction with Claude Haiku 4.5

```typescript
// supabase/functions/parse-pathology-pdf/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PDF_EXTRACTION_PROMPT = `You are extracting structured data from a pathology/laboratory report PDF.

Extract and return a JSON object with the following structure:

{
  "patient": {
    "name": "string",
    "age": "string",
    "sex": "Male|Female",
    "report_date": "YYYY-MM-DD",
    "doctor_name": "string or null"
  },
  "lab_info": {
    "name": "string",
    "address": "string or null",
    "phone": "string or null"
  },
  "test_sections": [
    {
      "section_name": "e.g., Complete Blood Count, Liver Function Test",
      "category": "e.g., Hematology, Biochemistry",
      "tests": [
        {
          "test_name": "string",
          "value": "string (exactly as shown)",
          "unit": "string",
          "reference_range": "string",
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
      "reference_range": "string",
      "direction": "high|low"
    }
  ]
}

IMPORTANT RULES:
1. Extract ALL test values - do not skip any
2. Preserve exact values and units as shown in the report
3. Determine abnormal status by comparing value to reference range
4. Mark a value as abnormal ONLY if it falls outside the reference range
5. Include the unit even if it appears after the value
6. If reference range uses < or > notation, handle appropriately
7. Group tests under their correct section headers
8. Do NOT infer symptoms, diagnoses, medications, procedures, or advice that are not printed in the report
9. If patient, doctor, lab, value, unit, or reference range is unclear, use null or "not available" rather than guessing
10. Preserve every report date exactly enough to support trend comparison later

Return ONLY the JSON object, no additional text.`;

async function extractFromPDF(pdfBase64: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: PDF_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const textContent = result.content[0]?.text || '';
  
  // Parse JSON from response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdf_base64, pdf_url } = await req.json();
    
    let pdfData: string;
    
    if (pdf_base64) {
      pdfData = pdf_base64;
    } else if (pdf_url) {
      // Fetch PDF and convert to base64
      const pdfResponse = await fetch(pdf_url);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      pdfData = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    } else {
      throw new Error('Either pdf_base64 or pdf_url is required');
    }

    const extractedData = await extractFromPDF(pdfData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PDF parsing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 2: Generate Infographic Layout Prompt

```typescript
// supabase/functions/generate-infographic-prompt/index.ts

interface ExtractedReport {
  patient: {
    name: string;
    age: string;
    sex: string;
    report_date: string;
    doctor_name: string | null;
  };
  test_sections: Array<{
    section_name: string;
    category: string;
    tests: Array<{
      test_name: string;
      value: string;
      unit: string;
      reference_range: string;
      is_abnormal: boolean;
      abnormal_direction: 'high' | 'low' | null;
    }>;
  }>;
  abnormal_summary: Array<{
    section: string;
    test_name: string;
    value: string;
    reference_range: string;
    direction: string;
  }>;
}

interface LayoutSection {
  title: string;
  layout_type: string;
  data: Array<{
    label: string;
    value: string;
    unit: string;
    reference_range: string;
    is_abnormal: boolean;
    abnormal_direction: string | null;
  }>;
  abnormal_in_section: string[];
}

// Layout type rotation to avoid repetition
const LAYOUT_TYPES = [
  'bar_stats',
  'circle_stats', 
  'gauge_chart',
  'icons_with_text',
  'bullet_chart',
  'funnel',
  'timeline',
  'card_grid',
];

function selectLayoutType(sectionIndex: number, testCount: number): string {
  // Avoid repeating consecutive layouts
  const baseIndex = sectionIndex % LAYOUT_TYPES.length;
  
  // For sections with many tests, prefer bar/table layouts
  if (testCount > 10) return 'bar_stats';
  if (testCount <= 3) return 'gauge_chart';
  
  return LAYOUT_TYPES[baseIndex];
}

function generateLayoutPrompt(report: ExtractedReport): string {
  let prompt = '';
  
  // Header Section (15% of page reserved)
  prompt += `# INFOGRAPHIC REPORT LAYOUT\n\n`;
  prompt += `## Content Grounding Rules\n`;
  prompt += `Use only the patient data, test values, units, reference ranges, dates, lab details, and trend data included below.\n`;
  prompt += `Do not add diagnoses, symptoms, medications, lifestyle advice, procedures, or biomarkers that are not present in the data.\n`;
  prompt += `Use patient-friendly clinical language. Avoid marketing phrases such as "excellent health profile", "perfectly healthy", "world-class", or "complete transformation".\n`;
  prompt += `If a value or comparison is missing, write "not available" instead of guessing.\n\n`;
  prompt += `---\n\n`;
  prompt += `## Page Header (Reserve 15% top space)\n`;
  prompt += `Patient: ${report.patient.name}\n`;
  prompt += `Age/Sex: ${report.patient.age} / ${report.patient.sex}\n`;
  prompt += `Report Date: ${report.patient.report_date}\n`;
  if (report.patient.doctor_name) {
    prompt += `Referring Doctor: ${report.patient.doctor_name}\n`;
  }
  prompt += `\n---\n\n`;
  
  // Abnormal Summary Section (Always first after header)
  if (report.abnormal_summary.length > 0) {
    prompt += `## ABNORMAL VALUES SUMMARY (Highlight with red/amber)\n\n`;
    prompt += `Layout: Alert Card with Icons\n\n`;
    
    const groupedAbnormal: Record<string, string[]> = {};
    report.abnormal_summary.forEach(item => {
      if (!groupedAbnormal[item.section]) {
        groupedAbnormal[item.section] = [];
      }
      const arrow = item.direction === 'high' ? '↑' : '↓';
      groupedAbnormal[item.section].push(
        `**${item.test_name}**: ${item.value} ${arrow} (Ref: ${item.reference_range})`
      );
    });
    
    Object.entries(groupedAbnormal).forEach(([section, items]) => {
      prompt += `### ${section}\n`;
      items.forEach(item => prompt += `- ${item}\n`);
      prompt += `\n`;
    });
    
    prompt += `---\n\n`;
  } else {
    prompt += `## ALL RESULTS NORMAL ✓\n\n`;
    prompt += `All extracted test values are within the provided reference ranges. Do not describe the patient as perfectly healthy.\n\n`;
    prompt += `---\n\n`;
  }
  
  // Individual Test Sections
  report.test_sections.forEach((section, index) => {
    const layoutType = selectLayoutType(index, section.tests.length);
    
    prompt += `## ${section.section_name}\n\n`;
    prompt += `Layout Type: ${layoutType}\n`;
    prompt += `Category: ${section.category}\n\n`;
    
    // Test data
    section.tests.forEach(test => {
      const abnormalMarker = test.is_abnormal 
        ? ` **[${test.abnormal_direction?.toUpperCase()}]**`
        : '';
      prompt += `- ${test.test_name}: ${test.value} ${test.unit}${abnormalMarker}\n`;
      prompt += `  Reference: ${test.reference_range}\n`;
    });
    
    // Section abnormal summary
    const sectionAbnormals = section.tests.filter(t => t.is_abnormal);
    if (sectionAbnormals.length > 0) {
      prompt += `\n**Abnormal in this section:** `;
      prompt += sectionAbnormals.map(t => `${t.test_name}: ${t.value}`).join(', ');
      prompt += `\n`;
    }
    
    prompt += `\n---\n\n`;
  });
  
  return prompt;
}

// Export for use
export { generateLayoutPrompt, ExtractedReport };
```

### Step 3: Trend Analysis Generation

```typescript
// supabase/functions/generate-trend-analysis/index.ts

interface TrendDataPoint {
  date: string;
  value: string;
  source?: 'internal' | 'external';
}

interface AnalyteTrendData {
  test_name: string;
  unit: string;
  reference_range: string;
  data_points: TrendDataPoint[];
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  clinical_significance: string;
}

interface TrendAnalysisReport {
  patient: {
    name: string;
    age: string;
    sex: string;
  };
  analysis_period: {
    from: string;
    to: string;
  };
  analytes: AnalyteTrendData[];
}

function calculateTrendDirection(points: TrendDataPoint[]): AnalyteTrendData['trend_direction'] {
  if (points.length < 2) return 'stable';
  
  const values = points.map(p => parseFloat(p.value)).filter(v => !isNaN(v));
  if (values.length < 2) return 'stable';
  
  // Calculate linear regression slope
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, i) => sum + i * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgValue = sumY / n;
  const percentChange = (slope * n) / avgValue * 100;
  
  // Determine trend based on slope
  if (Math.abs(percentChange) < 5) return 'stable';
  
  // Check for fluctuation (high variance)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / n;
  const cv = (Math.sqrt(variance) / avgValue) * 100;
  if (cv > 20) return 'fluctuating';
  
  return slope > 0 ? 'increasing' : 'decreasing';
}

function generateTrendAnalysisPrompt(report: TrendAnalysisReport): string {
  let prompt = '';
  
  prompt += `# TREND ANALYSIS REPORT\n\n`;
  prompt += `## Patient Information\n`;
  prompt += `- Name: ${report.patient.name}\n`;
  prompt += `- Age/Sex: ${report.patient.age} / ${report.patient.sex}\n`;
  prompt += `- Analysis Period: ${report.analysis_period.from} to ${report.analysis_period.to}\n\n`;
  prompt += `---\n\n`;
  
  // Group by trend significance
  const significant = report.analytes.filter(a => 
    a.trend_direction === 'increasing' || a.trend_direction === 'decreasing'
  );
  const stable = report.analytes.filter(a => a.trend_direction === 'stable');
  const fluctuating = report.analytes.filter(a => a.trend_direction === 'fluctuating');
  
  if (significant.length > 0) {
    prompt += `## Parameters with Significant Trends\n\n`;
    prompt += `Layout: Timeline or Line Chart\n\n`;
    
    significant.forEach(analyte => {
      const arrow = analyte.trend_direction === 'increasing' ? '📈' : '📉';
      prompt += `### ${analyte.test_name} ${arrow}\n\n`;
      prompt += `Trend: ${analyte.trend_direction.toUpperCase()}\n`;
      prompt += `Unit: ${analyte.unit} | Reference: ${analyte.reference_range}\n\n`;
      prompt += `Data Points:\n`;
      analyte.data_points.forEach(dp => {
        prompt += `- ${dp.date}: ${dp.value} ${analyte.unit}\n`;
      });
      prompt += `\nClinical Note: ${analyte.clinical_significance}\n\n`;
    });
    prompt += `---\n\n`;
  }
  
  if (fluctuating.length > 0) {
    prompt += `## Parameters with Fluctuating Values\n\n`;
    prompt += `Layout: Scatter Plot or Range Chart\n\n`;
    
    fluctuating.forEach(analyte => {
      prompt += `### ${analyte.test_name} 📊\n\n`;
      prompt += `Pattern: Variable/Fluctuating\n`;
      analyte.data_points.forEach(dp => {
        prompt += `- ${dp.date}: ${dp.value}\n`;
      });
      prompt += `\n`;
    });
    prompt += `---\n\n`;
  }
  
  if (stable.length > 0) {
    prompt += `## Stable Parameters\n\n`;
    prompt += `Layout: Compact Card Grid\n\n`;
    stable.forEach(analyte => {
      const latest = analyte.data_points[analyte.data_points.length - 1];
      prompt += `- ${analyte.test_name}: ${latest.value} ${analyte.unit} ✓ (Stable)\n`;
    });
  }
  
  return prompt;
}

export { generateTrendAnalysisPrompt, TrendAnalysisReport, calculateTrendDirection };
```

### Step 4: Longevity Report Generation

```typescript
// supabase/functions/generate-longevity-report/index.ts

// Longevity domain classifications
const LONGEVITY_DOMAINS: Record<string, string[]> = {
  'Metabolic': [
    'glucose', 'fasting glucose', 'hba1c', 'glycated hemoglobin',
    'triglycerides', 'cholesterol', 'ldl', 'hdl', 'vldl',
    'insulin', 'c-peptide', 'uric acid'
  ],
  'Cardiovascular': [
    'cholesterol', 'ldl', 'hdl', 'triglycerides',
    'hscrp', 'crp', 'homocysteine', 'lipoprotein',
    'apolipoprotein', 'fibrinogen', 'bnp', 'nt-probnp'
  ],
  'Cognitive/Neurological': [
    'vitamin b12', 'b12', 'folate', 'folic acid',
    'tsh', 'thyroid', 't3', 't4', 'free t4',
    'homocysteine', 'vitamin d', 'ferritin'
  ],
  'Inflammatory': [
    'crp', 'hscrp', 'esr', 'sed rate',
    'interleukin', 'tnf', 'wbc', 'neutrophils'
  ],
  'Hormonal': [
    'testosterone', 'estrogen', 'estradiol', 'progesterone',
    'lh', 'fsh', 'dhea', 'cortisol', 'prolactin',
    'tsh', 'free t3', 'free t4', 'igf-1'
  ],
  'Nutritional': [
    'vitamin d', 'vitamin b12', 'folate', 'iron',
    'ferritin', 'tibc', 'transferrin', 'calcium',
    'magnesium', 'zinc', 'selenium', 'vitamin a', 'vitamin e'
  ],
  'Renal Function': [
    'creatinine', 'bun', 'urea', 'egfr', 'gfr',
    'uric acid', 'cystatin c', 'albumin'
  ],
  'Hepatic Function': [
    'alt', 'sgpt', 'ast', 'sgot', 'alp',
    'ggt', 'bilirubin', 'albumin', 'protein'
  ]
};

interface LongevityTestResult {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  is_abnormal: boolean;
  domain: string;
  longevity_insight?: string;
}

function classifyTestByDomain(testName: string): string {
  const normalizedName = testName.toLowerCase();
  
  for (const [domain, keywords] of Object.entries(LONGEVITY_DOMAINS)) {
    if (keywords.some(keyword => normalizedName.includes(keyword))) {
      return domain;
    }
  }
  
  return 'General Health';
}

function generateLongevityPrompt(
  patient: { name: string; age: string; sex: string },
  tests: LongevityTestResult[]
): string {
  // Group tests by domain
  const domainGroups: Record<string, LongevityTestResult[]> = {};
  
  tests.forEach(test => {
    const domain = test.domain || classifyTestByDomain(test.test_name);
    if (!domainGroups[domain]) {
      domainGroups[domain] = [];
    }
    domainGroups[domain].push({ ...test, domain });
  });
  
  let prompt = '';
  
  prompt += `# LONGEVITY HEALTH DASHBOARD\n\n`;
  prompt += `## Patient Profile\n`;
  prompt += `- Name: ${patient.name}\n`;
  prompt += `- Age: ${patient.age}\n`;
  prompt += `- Sex: ${patient.sex}\n\n`;
  prompt += `---\n\n`;
  
  // Domain-specific sections
  const domainOrder = [
    'Metabolic', 'Cardiovascular', 'Cognitive/Neurological',
    'Inflammatory', 'Hormonal', 'Nutritional',
    'Renal Function', 'Hepatic Function', 'General Health'
  ];
  
  const layoutTypes = [
    'radial_gauge', 'progress_bars', 'health_score_card',
    'indicator_grid', 'status_badges', 'comparison_chart'
  ];
  
  domainOrder.forEach((domain, index) => {
    const domainTests = domainGroups[domain];
    if (!domainTests || domainTests.length === 0) return;
    
    const abnormalCount = domainTests.filter(t => t.is_abnormal).length;
    const statusEmoji = abnormalCount === 0 ? '✅' : abnormalCount === 1 ? '⚠️' : '🔴';
    
    prompt += `## ${domain} ${statusEmoji}\n\n`;
    prompt += `Layout: ${layoutTypes[index % layoutTypes.length]}\n`;
    prompt += `Status: ${abnormalCount === 0 ? 'Optimal' : abnormalCount === 1 ? 'Attention Needed' : 'Review Required'}\n\n`;
    
    domainTests.forEach(test => {
      const marker = test.is_abnormal ? ' **[ATTENTION]**' : '';
      prompt += `- ${test.test_name}: ${test.value} ${test.unit}${marker}\n`;
      prompt += `  Reference: ${test.reference_range}\n`;
      if (test.longevity_insight) {
        prompt += `  Insight: ${test.longevity_insight}\n`;
      }
    });
    
    prompt += `\n---\n\n`;
  });
  
  // Longevity Score Summary
  const totalTests = tests.length;
  const optimalTests = tests.filter(t => !t.is_abnormal).length;
  const longevityScore = Math.round((optimalTests / totalTests) * 100);
  
  prompt += `## LONGEVITY SCORE\n\n`;
  prompt += `Layout: Large Circular Score Display\n\n`;
  prompt += `**Score: ${longevityScore}/100**\n\n`;
  prompt += `- Tests in Optimal Range: ${optimalTests}/${totalTests}\n`;
  prompt += `- Areas Needing Attention: ${totalTests - optimalTests}\n\n`;
  
  if (longevityScore >= 90) {
    prompt += `*Excellent! Your biomarkers indicate optimal health patterns.*\n`;
  } else if (longevityScore >= 70) {
    prompt += `*Good overall health with some areas for improvement.*\n`;
  } else {
    prompt += `*Several markers need attention. Consult with your healthcare provider.*\n`;
  }
  
  return prompt;
}

export { generateLongevityPrompt, classifyTestByDomain, LONGEVITY_DOMAINS };
```

### Step 5: Gamma AI Integration

```typescript
// supabase/functions/generate-gamma-report/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GAMMA_API_KEY = Deno.env.get('GAMMA_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GAMMA_INSTRUCTIONS = `
Create a professional health report infographic with these requirements:

CONTENT GROUNDING:
1. Use only the patient data, lab data, test values, dates, reference ranges, and trend data in the input text
2. Do not invent diagnoses, symptoms, medications, procedures, lifestyle habits, missing biomarkers, or doctor advice
3. If a value, range, date, or trend is unavailable, label it "not available" or omit the comparison
4. Separate facts from interpretation; phrase clinical next steps as "discuss with your clinician"
5. Never say the patient is "perfectly healthy" or imply a diagnosis from one abnormal marker

LAYOUT RULES:
1. Reserve 15% at top of each page for header space
2. Use clean, medical-appropriate color scheme
3. Abnormal values should be highlighted in red/amber
4. Normal values should use green/blue accents
5. Each section should have a clear visual boundary

VISUAL COMPONENTS:
- Use gauge charts for single values with reference ranges
- Use bar charts for comparing multiple related values
- Use trend lines for historical data
- Use card grids for compact summary views
- Include icons for test categories
- Rotate section structures between summary-first, abnormal-first, trend-first, and domain-first layouts where data supports it

DO NOT INCLUDE:
- Stock photos or AI-generated images
- Signatures or doctor names
- Page numbers on first page
- Decorative backgrounds that obscure data
- Generic marketing phrases like "excellent health profile", "world-class", "perfectly healthy", "complete transformation", or "highly recommended"

ACCESSIBILITY:
- Ensure sufficient color contrast
- Use clear, readable fonts (minimum 11pt)
- Include value labels directly on charts
`;

interface GammaGenerationOptions {
  inputText: string;
  reportType: 'smart_report' | 'trend_analysis' | 'longevity_report';
  themeId?: string;
}

async function initiateGammaGeneration(options: GammaGenerationOptions): Promise<string> {
  const { inputText, reportType, themeId } = options;
  
  const response = await fetch('https://public-api.gamma.app/v1.0/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': GAMMA_API_KEY!,
      'accept': 'application/json',
    },
    body: JSON.stringify({
      textMode: 'generate',
      inputText,
      format: 'document',
      themeId: themeId || 'wbpgwj9c0ty5wbo',
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gamma API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.generationId;
}

async function pollGammaGeneration(generationId: string, maxAttempts = 60): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch(
      `https://public-api.gamma.app/v1.0/generations/${generationId}`,
      {
        method: 'GET',
        headers: {
          'X-API-KEY': GAMMA_API_KEY!,
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) continue;

    const status = await response.json();
    
    if (status.status === 'completed') {
      return status.exportUrl || status.pdfUrl;
    }
    
    if (status.status === 'failed' || status.status === 'error') {
      throw new Error(`Gamma generation failed: ${JSON.stringify(status)}`);
    }
  }

  throw new Error('Gamma generation timed out');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      layout_prompt, 
      report_type = 'smart_report',
      theme_id 
    } = await req.json();

    if (!layout_prompt) {
      throw new Error('layout_prompt is required');
    }

    console.log(`[GAMMA] Starting ${report_type} generation...`);
    
    // Initiate generation
    const generationId = await initiateGammaGeneration({
      inputText: layout_prompt,
      reportType: report_type,
      themeId: theme_id,
    });

    console.log(`[GAMMA] Generation ID: ${generationId}`);

    // Poll for completion
    const pdfUrl = await pollGammaGeneration(generationId);

    console.log(`[GAMMA] PDF ready: ${pdfUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
        generation_id: generationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GAMMA] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Step 6: Complete Pipeline Orchestrator

```typescript
// supabase/functions/generate-pathology-infographic/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerationRequest {
  pdf_base64?: string;
  pdf_url?: string;
  report_type: 'smart_report' | 'trend_analysis' | 'longevity_report';
  historical_data?: Array<{
    date: string;
    tests: Array<{
      test_name: string;
      value: string;
      unit: string;
    }>;
  }>;
  output_format: 'pdf' | 'json';
  include_branding?: boolean;
  lab_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const request: GenerationRequest = await req.json();
    
    console.log('='.repeat(60));
    console.log(`[PIPELINE] Starting ${request.report_type} generation`);
    console.log('='.repeat(60));

    // Step 1: Extract data from PDF
    console.log('[STEP 1] Parsing PDF with Claude Haiku...');
    
    const parseResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/parse-pathology-pdf`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_base64: request.pdf_base64,
          pdf_url: request.pdf_url,
        }),
      }
    );

    const parseResult = await parseResponse.json();
    if (!parseResult.success) {
      throw new Error(`PDF parsing failed: ${parseResult.error}`);
    }

    const extractedData = parseResult.data;
    console.log('[STEP 1] Extracted data:', {
      patient: extractedData.patient.name,
      sections: extractedData.test_sections.length,
      abnormals: extractedData.abnormal_summary.length,
    });

    // Step 2: Generate appropriate layout prompt
    console.log('[STEP 2] Generating layout prompt...');
    
    let layoutPrompt: string;
    
    switch (request.report_type) {
      case 'trend_analysis':
        // Merge historical data with current
        const trendData = mergeHistoricalData(extractedData, request.historical_data);
        layoutPrompt = generateTrendPrompt(trendData);
        break;
        
      case 'longevity_report':
        layoutPrompt = generateLongevityPrompt(extractedData);
        break;
        
      default:
        layoutPrompt = generateSmartReportPrompt(extractedData);
    }

    console.log('[STEP 2] Layout prompt generated, length:', layoutPrompt.length);

    // If only JSON output requested, return here
    if (request.output_format === 'json') {
      return new Response(
        JSON.stringify({
          success: true,
          extracted_data: extractedData,
          layout_prompt: layoutPrompt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Generate PDF with Gamma
    console.log('[STEP 3] Generating PDF with Gamma...');
    
    const gammaResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-gamma-report`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layout_prompt: layoutPrompt,
          report_type: request.report_type,
        }),
      }
    );

    const gammaResult = await gammaResponse.json();
    if (!gammaResult.success) {
      throw new Error(`Gamma generation failed: ${gammaResult.error}`);
    }

    let finalPdfUrl = gammaResult.pdf_url;

    // Step 4: Add branding if requested
    if (request.include_branding && request.lab_id) {
      console.log('[STEP 4] Adding lab branding...');
      
      const brandedUrl = await addLabBranding(
        supabase,
        finalPdfUrl,
        request.lab_id
      );
      
      if (brandedUrl) {
        finalPdfUrl = brandedUrl;
      }
    }

    // Step 5: Upload to storage
    console.log('[STEP 5] Uploading to storage...');
    
    const storageUrl = await uploadToStorage(
      supabase,
      finalPdfUrl,
      request.report_type,
      extractedData.patient.name
    );

    console.log('='.repeat(60));
    console.log('[PIPELINE] Complete!');
    console.log('='.repeat(60));

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: storageUrl || finalPdfUrl,
        gamma_url: gammaResult.pdf_url,
        extracted_data: extractedData,
        report_type: request.report_type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PIPELINE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
function generateSmartReportPrompt(data: any): string {
  // Implementation from Step 2
  return ''; // See generateLayoutPrompt function above
}

function generateTrendPrompt(data: any): string {
  // Implementation from Step 3
  return ''; // See generateTrendAnalysisPrompt function above
}

function generateLongevityPrompt(data: any): string {
  // Implementation from Step 4  
  return ''; // See generateLongevityPrompt function above
}

function mergeHistoricalData(current: any, historical: any[]): any {
  // Merge current extraction with historical data for trend analysis
  return current;
}

async function addLabBranding(
  supabase: any,
  pdfUrl: string,
  labId: string
): Promise<string | null> {
  // Fetch lab branding assets and overlay using PDF.co
  const { data: assets } = await supabase
    .from('lab_branding_assets')
    .select('asset_type, file_url, imagekit_url')
    .eq('lab_id', labId)
    .eq('is_default', true);

  if (!assets || assets.length === 0) return null;

  const header = assets.find((a: any) => a.asset_type === 'header');
  const footer = assets.find((a: any) => a.asset_type === 'footer');

  if (!header && !footer) return null;

  // Call PDF.co to overlay branding
  const PDFCO_API_KEY = Deno.env.get('PDFCO_API_KEY');
  if (!PDFCO_API_KEY) return null;

  const images: any[] = [];
  
  if (header) {
    images.push({
      url: header.imagekit_url || header.file_url,
      x: 0,
      y: 0,
      width: 595,
      height: 100,
      pages: '0-',
    });
  }

  if (footer) {
    images.push({
      url: footer.imagekit_url || footer.file_url,
      x: 0,
      y: 742,
      width: 595,
      height: 100,
      pages: '0-',
    });
  }

  const response = await fetch('https://api.pdf.co/v1/pdf/edit/add', {
    method: 'POST',
    headers: {
      'x-api-key': PDFCO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: pdfUrl,
      images,
      name: 'branded_report.pdf',
    }),
  });

  const result = await response.json();
  return result.url || null;
}

async function uploadToStorage(
  supabase: any,
  pdfUrl: string,
  reportType: string,
  patientName: string
): Promise<string | null> {
  try {
    const pdfResponse = await fetch(pdfUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();

    const timestamp = Date.now();
    const safeName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `infographic-reports/${reportType}/${safeName}_${timestamp}.pdf`;

    const { error } = await supabase.storage
      .from('reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('reports').getPublicUrl(storagePath);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}
```

---

## Frontend Integration

### React Hook for Report Generation

```typescript
// src/hooks/useInfographicGenerator.ts

import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';

interface GenerationOptions {
  pdfFile?: File;
  pdfUrl?: string;
  reportType: 'smart_report' | 'trend_analysis' | 'longevity_report';
  historicalData?: any[];
  includeBranding?: boolean;
  labId?: string;
}

interface GenerationResult {
  success: boolean;
  pdfUrl?: string;
  extractedData?: any;
  error?: string;
}

export const useInfographicGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (
    options: GenerationOptions
  ): Promise<GenerationResult> => {
    setLoading(true);
    setError(null);
    setProgress('Preparing...');

    try {
      let pdfBase64: string | undefined;

      // Convert file to base64 if provided
      if (options.pdfFile) {
        setProgress('Reading PDF file...');
        pdfBase64 = await fileToBase64(options.pdfFile);
      }

      setProgress('Parsing report with AI...');

      const { data, error: invokeError } = await supabase.functions.invoke(
        'generate-pathology-infographic',
        {
          body: {
            pdf_base64: pdfBase64,
            pdf_url: options.pdfUrl,
            report_type: options.reportType,
            historical_data: options.historicalData,
            output_format: 'pdf',
            include_branding: options.includeBranding,
            lab_id: options.labId,
          },
        }
      );

      if (invokeError) throw invokeError;

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setProgress('Complete!');
      setLoading(false);

      return {
        success: true,
        pdfUrl: data.pdf_url,
        extractedData: data.extracted_data,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate report';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  return {
    generateReport,
    loading,
    progress,
    error,
  };
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
```

### Usage Component

```tsx
// src/components/InfographicGenerator.tsx

import React, { useState } from 'react';
import { useInfographicGenerator } from '../hooks/useInfographicGenerator';

export const InfographicGenerator: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<'smart_report' | 'trend_analysis' | 'longevity_report'>('smart_report');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const { generateReport, loading, progress, error } = useInfographicGenerator();

  const handleGenerate = async () => {
    if (!selectedFile) return;

    const result = await generateReport({
      pdfFile: selectedFile,
      reportType,
      includeBranding: true,
    });

    if (result.success && result.pdfUrl) {
      setResultUrl(result.pdfUrl);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pathology Report Infographic Generator</h1>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Upload Pathology Report (PDF)
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="block w-full border rounded p-2"
        />
      </div>

      {/* Report Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Report Type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as any)}
          className="block w-full border rounded p-2"
        >
          <option value="smart_report">Smart Report (Single Visit)</option>
          <option value="trend_analysis">Trend Analysis (Multi-Visit)</option>
          <option value="longevity_report">Longevity Health Dashboard</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!selectedFile || loading}
        className="w-full bg-blue-600 text-white py-3 rounded font-semibold disabled:opacity-50"
      >
        {loading ? progress : 'Generate Infographic'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Result Display */}
      {resultUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Generated Report</h2>
          <div className="border rounded p-4">
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View/Download PDF
            </a>
            <iframe
              src={resultUrl}
              className="w-full h-96 mt-4 border rounded"
              title="Generated Report"
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Environment Variables Required

```bash
# Claude/Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# Gamma AI API
GAMMA_API_KEY=sk-gamma-...

# PDF.co API (for branding overlay)
PDFCO_API_KEY=...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Cost Estimation

| Component | Cost per Report |
|-----------|----------------|
| Claude Haiku 4.5 (5-page PDF) | ~$0.006 |
| Gamma AI Generation | ~$0.10 |
| PDF.co Branding Overlay | ~$0.01 |
| **Total** | **~$0.12/report** |

---

## Best Practices

1. **PDF Parsing**
   - Handle multi-page PDFs by passing all pages to Claude
   - Validate extracted JSON structure before proceeding
   - Cache parsed results for re-generation requests
   - Treat unclear fields as unavailable; do not guess missing values, dates, units, or patient details
   - Preserve all source report dates and lab names so trend reports can attribute each value

2. **Layout Generation**
   - Rotate layout types to avoid visual repetition
   - Always show abnormal values prominently
   - Reserve header space on every page
   - Add content grounding rules at the top of every generated prompt
   - Avoid wellness marketing language; use plain clinical wording tied to the extracted data

3. **Trend Analysis**
   - Require minimum 2 data points for trend calculation
   - Classify trends as increasing/decreasing only with >5% change
   - Include source attribution (internal vs external labs)
   - Do not compare values when units, analyte names, or reference contexts do not match reliably

4. **Longevity Reports**
   - Map tests to physiological domains using keyword matching
   - Calculate overall health score based on optimal ranges
   - Group related markers together
   - Explain domain scores as summaries of available markers, not diagnoses or guarantees

5. **Error Handling**
   - Implement retry logic for Gamma API (polling)
   - Fallback to extracted data JSON if PDF generation fails
   - Log all API calls for debugging

6. **Quality Verification**
   - Generate 10 reports from the same sample data and verify layouts vary without changing facts
   - Check that no report invents symptoms, diagnoses, medicines, procedures, or missing tests
   - Check that banned phrases such as "perfectly healthy", "excellent health profile", and "complete transformation" do not appear
   - Verify every abnormal callout maps back to a real extracted value and reference range

---

## Related Files in LIMS Codebase

| File | Purpose |
|------|---------|
| [generate-smart-report-v2/index.ts](../supabase/functions/generate-smart-report-v2/index.ts) | Main smart report generation |
| [ai-result-intelligence/index.ts](../supabase/functions/ai-result-intelligence/index.ts) | AI analysis for patient summaries |
| [useTrendGraphs.ts](../src/hooks/useTrendGraphs.ts) | Trend data calculation hook |
| [SMART_REPORT_GAMMA_PDFCO_PLAN.md](./SMART_REPORT_GAMMA_PDFCO_PLAN.md) | Original implementation plan |



# Infographic API Quick Reference Card

## 1. Claude Haiku 4.5 - PDF Parsing

```bash
POST https://api.anthropic.com/v1/messages
```

**Headers:**
```
Content-Type: application/json
x-api-key: YOUR_ANTHROPIC_KEY
anthropic-version: 2023-06-01
```

**Request Body:**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 8192,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "document",
          "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": "BASE64_ENCODED_PDF"
          }
        },
        {
          "type": "text",
          "text": "Extract patient info and test results as JSON..."
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "id": "msg_xxx",
  "content": [{"type": "text", "text": "{\"patient\": {...}, \"test_sections\": [...]}"}],
  "usage": {"input_tokens": 1500, "output_tokens": 800}
}
```

---

## 2. Gamma AI - Report Generation

### Initiate Generation

```bash
POST https://public-api.gamma.app/v1.0/generations
```

**Headers:**
```
Content-Type: application/json
X-API-KEY: YOUR_GAMMA_KEY
accept: application/json
```

**Request Body:**
```json
{
  "textMode": "generate",
  "inputText": "# Report Title\n\n## Section 1\n...",
  "format": "document",
  "themeId": "wbpgwj9c0ty5wbo",
  "cardSplit": "auto",
  "additionalInstructions": "Create clean medical infographic...",
  "exportAs": "pdf",
  "sharingOptions": {
    "workspaceAccess": "edit",
    "externalAccess": "view"
  },
  "imageOptions": {
    "source": "noImages"
  }
}
```

**Response:**
```json
{
  "generationId": "gen_xxxxx"
}
```

### Poll Status

```bash
GET https://public-api.gamma.app/v1.0/generations/{generationId}
```

**Response (completed):**
```json
{
  "generationId": "gen_xxxxx",
  "status": "completed",
  "exportUrl": "https://gamma.app/export/xxx.pdf",
  "url": "https://gamma.app/docs/xxx"
}
```

---

## 3. PDF.co - Branding Overlay

```bash
POST https://api.pdf.co/v1/pdf/edit/add
```

**Headers:**
```
Content-Type: application/json
x-api-key: YOUR_PDFCO_KEY
```

**Request Body:**
```json
{
  "url": "https://source-pdf-url.pdf",
  "images": [
    {
      "url": "https://header-image.png",
      "x": 0,
      "y": 0,
      "width": 595,
      "height": 100,
      "pages": "0-"
    },
    {
      "url": "https://footer-image.png",
      "x": 0,
      "y": 742,
      "width": 595,
      "height": 100,
      "pages": "0-"
    }
  ],
  "name": "branded_report.pdf"
}
```

**Response:**
```json
{
  "url": "https://pdf.co/output/branded_report.pdf",
  "pageCount": 3,
  "error": false
}
```

---

## 4. Extracted Data Schema

```typescript
interface ExtractedPathologyReport {
  patient: {
    name: string;
    age: string;
    sex: "Male" | "Female";
    report_date: string;  // YYYY-MM-DD
    doctor_name: string | null;
  };
  
  lab_info: {
    name: string;
    address: string | null;
    phone: string | null;
  };
  
  test_sections: Array<{
    section_name: string;      // "Complete Blood Count"
    category: string;          // "Hematology"
    tests: Array<{
      test_name: string;       // "Hemoglobin"
      value: string;           // "12.5"
      unit: string;            // "g/dL"
      reference_range: string; // "13.0 - 17.0"
      is_abnormal: boolean;
      abnormal_direction: "high" | "low" | null;
    }>;
  }>;
  
  abnormal_summary: Array<{
    section: string;
    test_name: string;
    value: string;
    reference_range: string;
    direction: "high" | "low";
  }>;
}
```

---

## 5. Layout Prompt Template

```markdown
# INFOGRAPHIC REPORT LAYOUT

## Page Header (Reserve 15% top space)
Patient: John Doe
Age/Sex: 45 / Male
Report Date: 2026-07-01
Referring Doctor: Dr. Smith

---

## ABNORMAL VALUES SUMMARY (Highlight with red/amber)

Layout: Alert Card with Icons

### Liver Function
- **SGPT**: 125 U/L ↑ (Ref: 16-63)
- **SGOT**: 85 U/L ↑ (Ref: 15-37)

### CBC
- **Hemoglobin**: 11.2 g/dL ↓ (Ref: 13-17)

---

## Complete Blood Count

Layout Type: gauge_chart
Category: Hematology

- Hemoglobin: 11.2 g/dL **[LOW]**
  Reference: 13.0 - 17.0
- RBC Count: 4.5 million/μL
  Reference: 4.5 - 5.5
- WBC Count: 7500 /μL
  Reference: 4000 - 11000

**Abnormal in this section:** Hemoglobin: 11.2 g/dL

---
```

---

## 6. Longevity Domain Keywords

| Domain | Keywords |
|--------|----------|
| Metabolic | glucose, hba1c, triglycerides, cholesterol, insulin, uric acid |
| Cardiovascular | ldl, hdl, hscrp, homocysteine, lipoprotein, bnp |
| Cognitive | b12, folate, tsh, vitamin d, ferritin |
| Inflammatory | crp, esr, interleukin, tnf, wbc |
| Hormonal | testosterone, estrogen, lh, fsh, cortisol, dhea |
| Nutritional | vitamin d, iron, calcium, magnesium, zinc |
| Renal | creatinine, bun, egfr, cystatin c |
| Hepatic | alt, ast, alp, ggt, bilirubin, albumin |

---

## 7. Trend Calculation

```typescript
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-3);
  const older = values.slice(-6, -3);
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (Math.abs(percentChange) < 5) return 'stable';
  return percentChange > 0 ? 'increasing' : 'decreasing';
}
```

---

## 8. Cost Calculator

```
PDF Parsing (Haiku):
  Input:  pages × 1500 tokens × $0.80/MTok
  Output: ~800 tokens × $4.00/MTok
  
Example (5 pages):
  Input:  7,500 × 0.0008 = $0.006
  Output: 800 × 0.004   = $0.0032
  Total: ~$0.01

Gamma Generation: ~$0.10/report
PDF.co Overlay:    ~$0.01/operation

TOTAL per report: ~$0.12
```

---

## 9. Error Codes

| API | Code | Meaning |
|-----|------|---------|
| Anthropic | 400 | Invalid request (check base64 encoding) |
| Anthropic | 429 | Rate limited (implement backoff) |
| Gamma | failed | Generation error (check input text) |
| PDF.co | 401 | Invalid API key |
| PDF.co | 422 | Invalid PDF URL |

---

## 10. Quick Start Checklist

- [ ] Get Anthropic API key (claude.ai/settings)
- [ ] Get Gamma API key (gamma.app/developer)
- [ ] Get PDF.co API key (pdf.co/account)
- [ ] Set environment variables
- [ ] Deploy edge functions
- [ ] Test with sample PDF
- [ ] Configure lab branding assets
- [ ] Enable storage bucket policies
