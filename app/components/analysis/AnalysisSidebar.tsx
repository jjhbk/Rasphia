"use client";
import React from "react";
import { ArrowUpRight, Clock } from "lucide-react";

interface AnalysisSidebarProps {
  onOpenAnalysis: (tool: string) => void;
  onAttachToChat: (analysisId: string) => void;
  recentAnalyses: any[];
  onOpenAnalysisDetails: (id: string) => void;
  onOpenAnalysisList: () => void;
}

const TOOLS = [
  { key: "skin",    label: "Skin",          imageSrc: "/Skin.png" },
  { key: "hair",    label: "Hair",          imageSrc: "/Hair.png" },
  { key: "body",    label: "Body Fit",      imageSrc: "/Body.png" },
  { key: "similar", label: "Visual Match",  imageSrc: "/Match.png" },
];

export default function AnalysisSidebar({
  onOpenAnalysis,
  onAttachToChat,
  recentAnalyses,
  onOpenAnalysisDetails,
  onOpenAnalysisList,
}: AnalysisSidebarProps) {
  return (
    <aside className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.25em] text-brand-stone/60">
          Concierge Tools
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {/* Tools grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {TOOLS.map((tool) => (
            <button
              key={tool.key}
              onClick={() => onOpenAnalysis(tool.key)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-brand-sand/40 bg-white shadow-soft hover:shadow-soft-md hover:-translate-y-0.5 transition-all"
            >
              <div className="h-16 overflow-hidden">
                <img
                  src={tool.imageSrc}
                  alt={tool.label}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
              </div>
              <div className="px-3 py-2">
                <span className="text-[11px] font-medium text-brand-charcoal">
                  {tool.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Recent analyses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-medium uppercase tracking-wider text-brand-stone/50">
              Recent
            </h4>
            {recentAnalyses.length > 0 && (
              <button
                onClick={onOpenAnalysisList}
                className="text-[11px] text-brand-terracotta hover:text-brand-coral font-medium transition-colors"
              >
                View all
              </button>
            )}
          </div>

          {recentAnalyses.length === 0 ? (
            <div className="py-8 text-center rounded-2xl border border-dashed border-brand-sand/40">
              <Clock className="h-6 w-6 text-brand-sand mx-auto mb-2" />
              <p className="text-xs text-brand-stone/50">No analyses yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAnalyses.slice(0, 5).map((a) => (
                <div
                  key={a.analysisId}
                  onClick={() => onOpenAnalysisDetails(a.analysisId)}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-brand-sand/30 bg-white cursor-pointer hover:border-brand-sand hover:shadow-soft transition-all"
                >
                  <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 border border-brand-sand/20">
                    <img
                      src={a.fileUrl}
                      alt="Thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-brand-charcoal truncate">
                      {a.title || a.type}
                    </p>
                    <p className="text-[10px] text-brand-stone/50 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttachToChat(a.analysisId);
                    }}
                    className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-brand-stone/40 hover:text-brand-terracotta hover:bg-brand-parchment transition-colors opacity-0 group-hover:opacity-100"
                    title="Insert to chat"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
