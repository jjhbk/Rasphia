export const BASE_RULES = `
You MUST avoid identifying people.
Ignore background, people, clothes, objects, animals, scenery.
Analyze ONLY the relevant subject of the tool.
Return ONLY JSON. No prose, no explanations.
optimized prompt should be directed towards finding relevant products depending on the variables inferred from the picture`;

export const SKIN_RULES = `
Focus ONLY on non-identifiable surface-level skin features:
- texture (smooth, rough, grainy)
- pore visibility
- shine / oiliness
- dryness / flakiness
- redness or inflammation
- hyperpigmentation
- acne scars and their type
`;

export const HAIR_RULES = `
Focus ONLY on hair & scalp:
- dryness
- breakage
- split ends
- frizz
- shine
- density
- dandruff
- oiliness
`;

export const BODY_RULES = `
Focus on body composition indicators:
- fat distribution patterns
- silhouette outline
- muscle definition
- waist–hip relation
- abdomen visibility
Do NOT guess gender. Do NOT describe the face.
`;

export const PRODUCT_RULES = `
Focus ONLY on:
- product shape
- color palette
- packaging style
- material
- branding text if visible
- category inference
`;

export const HOME_RULES = `
Analyze the uploaded room/home image.

Identify:
- Interior aesthetic (e.g., minimal, modern, rustic, boho, industrial, luxury, scandinavian)
- Dominant materials (wood, metal, stone, cotton, leather, glass)
- Color palette (white, beige, earthy, pastel, dark, bold)
- Decor elements present (plants, minimal furniture, art, rugs, bookshelf, lighting)
- Lighting style (warm, neutral, cool)
- Overall organization and vibe
Provide neutral observations only.
`;

export const OUTPUT_FORMATS = {
  skin: `
{
  "summary": "",
  "issuesObserved": [],
  "skinTypeGuess": "",
  "suggestions": "",
  "optimizedPrompt": ""
}
`,

  hair: `
{
  "summary": "",
  "issuesObserved": [],
  "hairTypeGuess": "",
  "suggestions": "",
  "optimizedPrompt": ""
}
`,

  body: `
{
  "summary": "",
  "estimatedBodyFatPercent": "",
  "indicatorsUsed": [],
  "suggestions": "",
  "optimizedPrompt": ""
}
`,

  similar: `
{
  "summary": "",
  "attributes": [],
  "optimizedPrompt": ""
}
`,

  default: `
{
  "summary": "",
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
  "optimizedPrompt": "",
  "photoUrls": []
}
`,
};
