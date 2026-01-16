// persona/steps.ts
export const PERSONA_STEPS = [
  "body",
  "skin",
  "hair",
  "style",
  "taste",
  "lifestyle",
  "home",
] as const;

export type PersonaStep = (typeof PERSONA_STEPS)[number];
