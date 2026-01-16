import { PERSONA_STEPS, PersonaStep } from "./steps";

export function isStepComplete(persona: any, step: PersonaStep): boolean {
  return Boolean(persona?.[step]?.updatedAt);
}

export function getNextIncompleteStep(persona: any): PersonaStep | null {
  return PERSONA_STEPS.find((step) => !isStepComplete(persona, step)) ?? null;
}

// persona/utils/isPersonaComplete.ts

export function isPersonaComplete(persona: any) {
  return PERSONA_STEPS.every((step) => Boolean(persona?.[step]?.updatedAt));
}
