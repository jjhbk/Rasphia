// ===============================
// GLOBAL BASE RULES
// ===============================
export const BASE_RULES = `
You MUST NOT identify, guess, or infer identity.
Do NOT infer gender, age, ethnicity, attractiveness, or facial traits.
Ignore background people, animals, scenery, and unrelated objects.
Analyze ONLY the subject relevant to the tool type.

All inferences must be:
- visual-only
- surface-level
- probabilistic, not absolute

Return ONLY valid JSON.
No prose. No explanations.

The optimizedPrompt MUST be suitable for downstream
product discovery, comparison, and recommendation systems.
`;

// ===============================
// SKIN RULES
// ===============================
export const SKIN_RULES = `
Focus ONLY on visible, non-identifiable skin surface characteristics.

Observe and infer:
- texture uniformity (smooth, uneven, rough)
- pore visibility (low, medium, high)
- oil or shine distribution (none, T-zone, overall)
- dryness or flaking
- redness or irritation
- pigmentation irregularities
- acne or post-acne marks (if visible)

Do NOT diagnose medical conditions.

Emphasize:
- dominant skin concerns
- relative severity
- implications for skincare products
`;

// ===============================
// HAIR RULES
// ===============================
export const HAIR_RULES = `
Focus ONLY on hair strands and visible scalp.

Infer:
- dryness vs oiliness balance
- frizz level
- breakage or split ends
- apparent density (low, medium, high)
- shine level
- dandruff or scalp flaking if visible

Do NOT infer medical causes or hair loss diagnoses.

Translate observations into:
- care priorities
- styling vs treatment needs
`;

// ===============================
// BODY RULES
// ===============================
export const BODY_RULES = `
Focus ONLY on non-identifying body composition indicators.

Visually infer:
- overall silhouette category
- relative fat distribution
- muscle definition visibility
- waist-to-hip balance
- abdomen prominence or flatness
- posture cues if visible

Do NOT:
- guess gender
- describe face
- estimate age
- infer health conditions

All estimates must be approximate and range-based.

Strongly prioritize implications for:
- clothing fit
- fabric choice
- cut and silhouette suitability
`;

// ===============================
// PRODUCT RULES
// ===============================
export const PRODUCT_RULES = `
Focus ONLY on the product itself.

Infer:
- product category
- functional purpose
- dominant colors
- materials
- form factor
- branding text if clearly visible

Do NOT guess brand if unclear.

Output should support:
- product matching
- alternatives
- recommendations
`;

// ===============================
// HOME RULES
// ===============================
export const HOME_RULES = `
Analyze ONLY the interior space shown.

Infer:
- dominant interior aesthetic styles
- primary materials
- color palette tendencies
- decor density (minimal, moderate, layered)
- lighting temperature and mood
- spatial organization

Avoid assumptions about lifestyle, income, or people.

Focus on attributes useful for
home decor, furniture, and lifestyle products.
`;

// ===============================
// OUTPUT FORMATS
// ===============================
export const OUTPUT_FORMATS = {
  skin: `
{
  "summary": "",
  "issuesObserved": [],
  "severity": {
    "oiliness": "",
    "dryness": "",
    "redness": ""
  },
  "skinTypeGuess": "",
  "confidence": 0.0,
  "productImplications": [],
  "optimizedPrompt": ""
}
`,

  hair: `
{
  "summary": "",
  "issuesObserved": [],
  "scalpCondition": "",
  "hairTypeGuess": "",
  "confidence": 0.0,
  "productImplications": [],
  "optimizedPrompt": ""
}
`,

  body: `
{
  "summary": "",
  "silhouette": "",
  "estimatedBodyFatRange": "",
  "indicatorsUsed": [],
  "fitImplications": [],
  "confidence": 0.0,
  "optimizedPrompt": ""
}
`,

  similar: `
{
  "summary": "",
  "attributes": [],
  "confidence": 0.0,
  "optimizedPrompt": ""
}
`,

  default: `
{
  "summary": "",
  "confidence": 0.0,
  "suggestions": "",
  "optimizedPrompt": ""
}
`,

  home: `
{
  "summary": "",
  "aesthetic": [],
  "materials": [],
  "colors": [],
  "decorElements": [],
  "lightingStyle": "",
  "confidence": 0.0,
  "optimizedPrompt": "",
  "photoUrls": []
}
`,
};
