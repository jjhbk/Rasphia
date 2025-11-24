// /app/privacy/page.tsx
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F8F4EF] text-stone-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF4E1] via-[#F8F1EA] to-[#F1E3D3]" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 lg:px-8">
          <h1 className="font-serif text-5xl text-stone-900">Privacy Policy</h1>
          <p className="mt-6 text-lg text-stone-700">
            Your privacy matters deeply to us. This policy explains how Rasphia
            collects, uses, and protects your information.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-stone-900">
            1. Information We Collect
          </h2>
          <ul className="mt-4 list-disc pl-6 text-stone-700">
            <li>Messages and prompts you send to the AI concierge</li>
            <li>Preferences, browsing interactions, and selection patterns</li>
            <li>Device metadata and essential analytics</li>
            <li>Order-related information when placing an order</li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold text-stone-900">
            2. How We Use Your Information
          </h2>
          <ul className="mt-4 list-disc pl-6 text-stone-700">
            <li>To curate personalized product picks</li>
            <li>To improve recommendations and user experience</li>
            <li>To process orders and manage customer support</li>
            <li>To protect platform integrity and enhance performance</li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold text-stone-900">
            3. Data Sharing
          </h2>
          <p className="mt-4 text-stone-700">
            We never sell personal information. Limited data may be shared with
            trusted partners strictly for secure payments, logistics, or
            operational purposes.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-stone-900">
            4. Your Rights
          </h2>
          <ul className="mt-4 list-disc pl-6 text-stone-700">
            <li>Request deletion of your stored data</li>
            <li>Request a copy of your information</li>
            <li>Opt-out of non-essential analytics</li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold text-stone-900">
            5. Contact Us
          </h2>
          <p className="mt-4 text-stone-700">
            For any privacy concerns, reach us at:
            <br /> <strong>support@rasphia.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
