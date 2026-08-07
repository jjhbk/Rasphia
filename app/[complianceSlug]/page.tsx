import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import AboutPage from "@/app/about/page";
import ContactUsPage from "@/app/contact/page";
import PrivacyPolicyPage from "@/app/privacy/page";
import TermsOfServicePage from "@/app/terms/page";

const ABOUT_ALIASES = new Set(["about-us", "sobre-nosotros", "team"]);
const CONTACT_ALIASES = new Set([
  "contact-us",
  "contactus",
  "contacto",
  "contatti",
  "kontakt",
  "reach-us",
  "get-in-touch",
]);
const SUPPORT_ALIASES = new Set(["support", "help"]);
const LEGAL_ALIASES = new Set(["legal", "impressum"]);
const PRIVACY_ALIASES = new Set(["privacy-policy"]);
const TERMS_ALIASES = new Set(["terms-of-service"]);
const PRICING_ALIASES = new Set(["pricing"]);

type Params = {
  complianceSlug: string;
};

function ComplianceShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      <Navbar />
      <div className="relative overflow-hidden bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            {props.eyebrow}
          </div>
          <h1 className="font-heading text-5xl text-brand-charcoal">{props.title}</h1>
          <p className="mt-4 text-brand-stone max-w-2xl">{props.description}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 space-y-8">{props.children}</div>
    </div>
  );
}

function SupportPage() {
  return (
    <ComplianceShell
      eyebrow="Support"
      title="Customer Support"
      description="Get help with orders, WhatsApp conversations, storefront questions, and account-related requests."
    >
      <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft space-y-4">
        <p className="text-brand-stone text-sm leading-relaxed">
          Rasphia support is available for shopping assistance, merchant onboarding,
          order tracking, payment questions, refunds, replacements, cancellations,
          and privacy-related requests.
        </p>
        <p className="text-brand-stone text-sm leading-relaxed">
          For direct help, use our contact page or email{" "}
          <a
            href="mailto:rasphia.ai@gmail.com"
            className="text-brand-terracotta hover:underline font-medium"
          >
            rasphia.ai@gmail.com
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/contact" className="btn btn-primary btn-lg">
            Contact Support
          </Link>
          <Link href="/privacy" className="btn btn-secondary btn-lg">
            Privacy Policy
          </Link>
          <Link href="/terms" className="btn btn-ghost btn-lg">
            Terms of Service
          </Link>
        </div>
      </div>
    </ComplianceShell>
  );
}

function PricingPage() {
  return (
    <ComplianceShell
      eyebrow="Pricing"
      title="Pricing & Commercial Information"
      description="Rasphia pricing may vary by merchant, storefront, catalog, service scope, and partner configuration."
    >
      <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft space-y-4">
        <p className="text-brand-stone text-sm leading-relaxed">
          Rasphia supports merchant-specific catalogs and conversational commerce
          workflows. Product pricing, shipping, taxes, and payment options are shown
          within the relevant shopping flow or storefront context.
        </p>
        <p className="text-brand-stone text-sm leading-relaxed">
          If you need commercial details, onboarding information, or partnership
          pricing, please contact us directly.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/contact" className="btn btn-primary btn-lg">
            Request Pricing
          </Link>
          <Link href="/merchant" className="btn btn-secondary btn-lg">
            Merchant Information
          </Link>
        </div>
      </div>
    </ComplianceShell>
  );
}

function LegalPage() {
  return (
    <ComplianceShell
      eyebrow="Legal"
      title="Legal & Company Information"
      description="Access Rasphia legal documents, support contacts, privacy details, and service terms in one place."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft space-y-3">
          <h2 className="font-heading text-xl text-brand-charcoal">Privacy</h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            Learn how Rasphia collects, uses, and protects personal information.
          </p>
          <Link href="/privacy" className="btn btn-secondary">
            View Privacy Policy
          </Link>
        </div>
        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft space-y-3">
          <h2 className="font-heading text-xl text-brand-charcoal">Terms</h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            Read the terms that govern Rasphia web and WhatsApp interactions.
          </p>
          <Link href="/terms" className="btn btn-secondary">
            View Terms of Service
          </Link>
        </div>
      </div>

      <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft space-y-3">
        <h2 className="font-heading text-xl text-brand-charcoal">Contact</h2>
        <p className="text-brand-stone text-sm leading-relaxed">
          For legal, privacy, compliance, or support questions, contact{" "}
          <a
            href="mailto:rasphia.ai@gmail.com"
            className="text-brand-terracotta hover:underline font-medium"
          >
            rasphia.ai@gmail.com
          </a>
          .
        </p>
      </div>
    </ComplianceShell>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { complianceSlug } = await params;

  if (ABOUT_ALIASES.has(complianceSlug)) {
    return {
      title: "About Rasphia",
      description: "Learn about Rasphia, our story, and how our AI shopping assistant works.",
    };
  }

  if (CONTACT_ALIASES.has(complianceSlug) || SUPPORT_ALIASES.has(complianceSlug)) {
    return {
      title: "Contact Rasphia",
      description: "Get in touch with Rasphia for support, partnerships, and account questions.",
    };
  }

  if (LEGAL_ALIASES.has(complianceSlug)) {
    return {
      title: "Legal Information | Rasphia",
      description: "Access Rasphia privacy, terms, and legal contact information.",
    };
  }

  if (PRICING_ALIASES.has(complianceSlug)) {
    return {
      title: "Pricing | Rasphia",
      description: "Commercial and pricing information for Rasphia services and storefront experiences.",
    };
  }

  if (PRIVACY_ALIASES.has(complianceSlug)) {
    return {
      title: "Privacy Policy | Rasphia",
      description: "Read the Rasphia privacy policy.",
    };
  }

  if (TERMS_ALIASES.has(complianceSlug)) {
    return {
      title: "Terms of Service | Rasphia",
      description: "Read the Rasphia terms of service.",
    };
  }

  return {};
}

export default async function ComplianceAliasPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { complianceSlug } = await params;

  if (ABOUT_ALIASES.has(complianceSlug)) {
    return <AboutPage />;
  }

  if (CONTACT_ALIASES.has(complianceSlug)) {
    return <ContactUsPage />;
  }

  if (SUPPORT_ALIASES.has(complianceSlug)) {
    return <SupportPage />;
  }

  if (LEGAL_ALIASES.has(complianceSlug)) {
    return <LegalPage />;
  }

  if (PRICING_ALIASES.has(complianceSlug)) {
    return <PricingPage />;
  }

  if (PRIVACY_ALIASES.has(complianceSlug)) {
    return <PrivacyPolicyPage />;
  }

  if (TERMS_ALIASES.has(complianceSlug)) {
    return <TermsOfServicePage />;
  }

  notFound();
}
