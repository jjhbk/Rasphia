import type { Metadata } from "next";
import Navbar from "@/app/components/Navbar";

export const metadata: Metadata = {
  title: "Terms of Service | Rasphia",
  description:
    "Terms of Service for Rasphia, including WhatsApp Business communication terms.",
};

export default function TermsOfServicePage() {
  const sections: { title: string; content: string[] }[] = [
    {
      title: "1. Acceptance Of Terms",
      content: [
        "By using Rasphia, including our WhatsApp Business services, you agree to these Terms of Service.",
        "If you do not agree, please do not use the service.",
      ],
    },
    {
      title: "2. Service Description",
      content: [
        "Rasphia provides shopping assistance, recommendations, and related customer support through web and WhatsApp channels.",
        "Features may change, improve, or be discontinued from time to time.",
      ],
    },
    {
      title: "3. User Responsibilities",
      content: [
        "You agree to provide accurate information when contacting us or placing orders.",
        "You agree not to misuse the platform, attempt unauthorized access, or send harmful or unlawful content.",
      ],
    },
    {
      title: "4. WhatsApp Business Communications",
      content: [
        "By messaging Rasphia on WhatsApp, you consent to receive replies related to your requests, orders, and support queries.",
        "Message frequency depends on your interactions. Standard carrier and data charges may apply.",
      ],
    },
    {
      title: "5. Privacy And Data",
      content: [
        "Your use of Rasphia is also governed by our Privacy Policy and Data Deletion Instructions.",
        "You may request data deletion by contacting us at rasphia.ai@gmail.com.",
      ],
    },
    {
      title: "6. Intellectual Property",
      content: [
        "All Rasphia branding, content, and platform materials are owned by or licensed to Rasphia.",
        "You may not reproduce, copy, or distribute content without prior written permission.",
      ],
    },
    {
      title: "7. Disclaimers",
      content: [
        "Services are provided on an as-is and as-available basis without guarantees of uninterrupted availability.",
        "Product recommendations are informational and should be evaluated by users based on their own needs.",
      ],
    },
    {
      title: "8. Limitation Of Liability",
      content: [
        "To the maximum extent permitted by law, Rasphia is not liable for indirect, incidental, special, or consequential damages.",
        "Our total liability for any claim related to service use is limited to the amount paid by you for the relevant service, if any.",
      ],
    },
    {
      title: "9. Updates To Terms",
      content: [
        "We may update these Terms of Service periodically.",
        "Continued use of Rasphia after updates means you accept the revised terms.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      <Navbar />
      <div className="relative overflow-hidden bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            Legal
          </div>
          <h1 className="font-heading text-5xl text-brand-charcoal">Terms of Service</h1>
          <p className="mt-4 text-brand-stone max-w-2xl">
            These terms govern your use of Rasphia services, including interactions
            through WhatsApp Business.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 space-y-8">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft"
          >
            <h2 className="font-heading text-xl text-brand-charcoal mb-4">{section.title}</h2>
            <ul className="space-y-2">
              {section.content.map((item) => (
                <li key={item} className="flex items-start gap-3 text-brand-stone text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-terracotta flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">10. Contact</h2>
          <p className="text-brand-stone text-sm">
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:rasphia.ai@gmail.com"
              className="text-brand-terracotta hover:underline font-medium"
            >
              rasphia.ai@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
