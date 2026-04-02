import type { Metadata } from "next";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deletion Request Status | Rasphia",
  description: "Track the status of your Meta/Facebook data deletion request.",
};

type Props = {
  params: Promise<{ code: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default async function DataDeletionStatusPage({ params }: Props) {
  const { code } = await params;
  const request = await prisma.analysis.findUnique({
    where: { analysisId: code },
    select: { analysisId: true, payload: true, createdAt: true, updatedAt: true },
  });

  const payload = isRecord(request?.payload) ? request?.payload : null;
  const status = String(payload?.status || (request ? "received" : "not_found"));

  return (
    <div className="min-h-screen bg-brand-cream text-brand-charcoal font-body">
      <div className="relative overflow-hidden bg-brand-parchment border-b border-brand-sand/40">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-parchment via-brand-cream to-brand-sand/20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-xs text-brand-stone uppercase tracking-widest mb-6">
            Data Request
          </div>
          <h1 className="font-heading text-5xl text-brand-charcoal">Deletion Request Status</h1>
          <p className="mt-4 text-brand-stone max-w-2xl">
            This page confirms the current status of your data deletion request.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 space-y-8">
        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">Request Summary</h2>
          <div className="space-y-2 text-sm text-brand-stone">
            <p>
              <span className="font-medium text-brand-charcoal">Confirmation code:</span> {code}
            </p>
            <p>
              <span className="font-medium text-brand-charcoal">Status:</span>{" "}
              {status === "not_found" ? "Not found" : "Received and processing"}
            </p>
            {request?.createdAt ? (
              <p>
                <span className="font-medium text-brand-charcoal">Received at:</span>{" "}
                {new Date(request.createdAt).toUTCString()}
              </p>
            ) : null}
            {request?.updatedAt ? (
              <p>
                <span className="font-medium text-brand-charcoal">Last updated:</span>{" "}
                {new Date(request.updatedAt).toUTCString()}
              </p>
            ) : null}
          </div>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">What Happens Next</h2>
          <p className="text-brand-stone text-sm leading-relaxed">
            We review and process deletion requests in line with our legal obligations
            and platform policies. If certain records must be retained for compliance,
            fraud prevention, or dispute handling, we retain only what is required.
          </p>
        </div>

        <div className="bg-white/60 border border-brand-sand/30 rounded-2xl p-8 shadow-soft">
          <h2 className="font-heading text-xl text-brand-charcoal mb-4">Need Help?</h2>
          <p className="text-brand-stone text-sm">
            Contact us at{" "}
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
