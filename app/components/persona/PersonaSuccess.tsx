// components/persona/PersonaSuccess.tsx
"use client";

export default function PersonaSuccess() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🎉</div>

        <h1 className="text-2xl font-bold text-stone-900">Persona Complete!</h1>

        <p className="mt-3 text-sm text-stone-600 leading-relaxed">
          Reopen the extension to start using <strong>Rasphia</strong>.
        </p>

        <p className="mt-6 text-xs text-stone-400">
          You can edit your persona anytime from settings.
        </p>
      </div>
    </div>
  );
}
