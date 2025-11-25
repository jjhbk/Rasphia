"use client";
import { X, ChevronRight } from "lucide-react";

export default function AnalysisListModal({
  analyses,
  onClose,
  onOpenAnalysisDetails,
}: any) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/70">
          <h2 className="font-serif text-xl text-stone-900">All Analyses</h2>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 hover:scale-105 transition"
            aria-label="Close analyses list"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-4">
          {analyses.map((a: any) => (
            <div
              key={a.analysisId}
              onClick={() => onOpenAnalysisDetails(a.analysisId)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-white/70 bg-white/80 hover:bg-white cursor-pointer transition shadow-sm shadow-amber-100/40"
            >
              <img
                src={a.fileUrl}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs opacity-60">
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
