// components/persona/PersonaSuccess.tsx
"use client";

export default function PersonaSuccess() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 bg-brand-cream font-body">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-full bg-brand-parchment flex items-center justify-center mx-auto mb-6">
          <span className="text-brand-terracotta text-3xl">✓</span>
        </div>

        <h1 className="font-heading text-2xl text-brand-charcoal">Taste Graph Complete</h1>

        <p className="mt-3 text-sm text-brand-stone leading-relaxed">
          Reopen the extension to start using <strong>Rasphia</strong>.
        </p>

        <p className="mt-6 text-xs text-brand-stone/50">
          You can edit your taste graph anytime from settings.
        </p>
      </div>
    </div>
  );
}
