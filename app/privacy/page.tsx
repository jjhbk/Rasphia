import Navbar from "@/app/components/Navbar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      <Navbar />
      {/* Hero */}
      <div className="relative overflow-hidden bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            Legal
          </div>
          <h1 className="font-heading text-5xl text-brand-charcoal">Privacy Policy</h1>
          <p className="mt-4 text-brand-stone">
            Your privacy matters deeply to us. This policy explains how Rasphia
            collects, uses, and protects your information.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 space-y-10">
        {[
          {
            title: "1. Information We Collect",
            items: [
              "Messages and prompts you send to the AI concierge",
              "Preferences, browsing interactions, and selection patterns",
              "Device metadata and essential analytics",
              "Order-related information when placing an order",
            ],
          },
          {
            title: "2. How We Use Your Information",
            items: [
              "To curate personalized product picks",
              "To improve recommendations and user experience",
              "To process orders and manage customer support",
              "To protect platform integrity and enhance performance",
            ],
          },
          {
            title: "4. Your Rights",
            items: [
              "Request deletion of your stored data",
              "Request a copy of your information",
              "Opt-out of non-essential analytics",
            ],
          },
        ].map((section) => (
          <div key={section.title} className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
            <h2 className="font-heading text-xl text-brand-charcoal mb-4">{section.title}</h2>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-brand-stone text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-terracotta flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">3. Data Sharing</h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            We never sell personal information. Limited data may be shared with
            trusted partners strictly for secure payments, logistics, or operational
            purposes.
          </p>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">5. Contact Us</h2>
          <p className="text-brand-stone text-sm">
            For any privacy concerns, reach us at{" "}
            <a
              href="mailto:rasphia.ai@gmail.com"
              className="text-brand-terracotta hover:underline font-medium"
            >
              rasphia.ai@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
