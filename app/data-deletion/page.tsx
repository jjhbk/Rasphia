import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | Rasphia",
  description:
    "How to request deletion of your personal data for WhatsApp Business interactions with Rasphia.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      <div className="relative overflow-hidden bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            WhatsApp Business
          </div>
          <h1 className="font-heading text-5xl text-brand-charcoal">
            Data Deletion Instructions
          </h1>
          <p className="mt-4 text-brand-stone max-w-2xl">
            If you have interacted with Rasphia on WhatsApp and want your personal
            data removed from our systems, follow the steps below.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 space-y-8">
        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">
            1. Send Your Request
          </h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            Email us at{" "}
            <a
              href="mailto:support@rasphia.com?subject=Data%20Deletion%20Request"
              className="text-brand-terracotta hover:underline font-medium"
            >
              support@rasphia.com
            </a>{" "}
            using the subject line <strong>Data Deletion Request</strong>.
          </p>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">
            2. Include These Details
          </h2>
          <ul className="space-y-2 text-brand-stone text-sm">
            {[
              "Your full name",
              "Your WhatsApp phone number in international format (for example, +1XXXXXXXXXX)",
              "A short statement that you want your data deleted",
              "Any email address used with Rasphia (if applicable)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-terracotta flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">
            3. Verification And Deletion Timeline
          </h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            We may contact you to verify account ownership before deletion. Once
            verified, we will delete your eligible personal data from Rasphia
            systems within <strong>30 days</strong> and send a confirmation.
          </p>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">
            4. Important Note
          </h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            This process removes data controlled by Rasphia. Data retained by Meta
            or WhatsApp may need to be managed from your Meta or WhatsApp account
            settings.
          </p>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">
            Contact
          </h2>
          <p className="text-brand-stone text-sm">
            Questions about deletion requests:{" "}
            <a
              href="mailto:support@rasphia.com"
              className="text-brand-terracotta hover:underline font-medium"
            >
              support@rasphia.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
