"use client";
import { X } from "lucide-react";

export default function AnalysisDetailModal({ analysis, onClose }: any) {
  if (!analysis) return null;

  const { fileUrl, aiResult, title, createdAt } = analysis;

  return (
    <div className="fixed inset-0 bg-brand-warm-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-soft-xl overflow-hidden border border-brand-sand/30">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-sand/30">
          <h2 className="font-heading text-xl text-brand-charcoal">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl border border-brand-sand/40 text-brand-stone hover:bg-brand-parchment transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <img src={fileUrl} className="w-full rounded-2xl shadow-soft" />

          <div>
            <h3 className="font-semibold text-brand-charcoal mb-1">Summary</h3>
            <p className="text-brand-stone text-sm">{aiResult.summary}</p>
          </div>

          <div>
            <h3 className="font-semibold text-brand-charcoal mb-1">Suggestions</h3>
            <p className="text-brand-stone text-sm">{aiResult.suggestions}</p>
          </div>

          <div>
            <h3 className="font-semibold text-brand-charcoal mb-1">
              Optimized Prompt
            </h3>
            <p className="text-brand-stone text-sm">{aiResult.optimizedPrompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
