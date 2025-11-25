"use client";
import React from "react";
import {
  ScanFace,
  Scissors,
  Dumbbell,
  Package,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface AnalysisSidebarProps {
  onOpenAnalysis: (tool: string) => void;
  onAttachToChat: (analysisId: string) => void;
  recentAnalyses: any[];
  onOpenAnalysisDetails: (id: string) => void;
  onOpenAnalysisList: () => void;
}

export default function AnalysisSidebar({
  onOpenAnalysis,
  onAttachToChat,
  recentAnalyses,
  onOpenAnalysisDetails,
  onOpenAnalysisList,
}: AnalysisSidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-transparent">
      {/* HEADER */}
      <div className="p-5 border-b border-stone-200/50">
        <h2 className="text-sm font-semibold text-stone-800 tracking-wide flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          Concierge Tools
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {/* TOOLS GRID */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <ToolCard
            label="Skin Analysis"
            imageSrc="/Skin.png"
            onClick={() => onOpenAnalysis("skin")}
          />
          <ToolCard
            label="Hair Care"
            imageSrc="/Hair.png"
            onClick={() => onOpenAnalysis("hair")}
          />
          <ToolCard
            label="Body Fit"
            imageSrc="/Body.png"
            onClick={() => onOpenAnalysis("body")}
          />
          <ToolCard
            label="Visual Match"
            imageSrc="/Match.png"
            onClick={() => onOpenAnalysis("similar")}
          />
        </div>

        {/* RECENT ANALYSES */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Recent Analysis
            </h3>
            <button
              onClick={onOpenAnalysisList}
              className="text-xs text-amber-700 hover:text-amber-800 font-medium px-2 py-1 rounded-full hover:bg-amber-50/50 transition-colors bg-transparent border-none"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recentAnalyses.length === 0 ? (
               <div className="p-6 text-center rounded-2xl bg-white/40 border border-stone-200/50 border-dashed">
                  <p className="text-xs text-stone-400">No analyses yet.</p>
               </div>
            ) : (
                recentAnalyses.slice(0, 5).map((a) => (
                  <div
                    key={a.analysisId}
                    className="group bg-white/60 border border-stone-200/50 rounded-2xl p-3 hover:shadow-md hover:bg-white hover:border-amber-200 transition-all cursor-pointer backdrop-blur-sm"
                    onClick={() => onOpenAnalysisDetails(a.analysisId)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                        <img
                          src={a.fileUrl}
                          className="h-full w-full object-cover"
                          alt="Thumbnail"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {a.title || a.type}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-end border-t border-stone-100 pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                       <button
                          onClick={(e) => {
                             e.stopPropagation();
                             onAttachToChat(a.analysisId);
                          }}
                          className="text-[10px] flex items-center gap-1 text-stone-600 hover:text-amber-700 font-medium px-2 py-1 rounded-full hover:bg-stone-50 transition-colors"
                       >
                          Insert to chat <ArrowUpRight className="h-3 w-3" />
                       </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// SIMPLIFIED TOOL CARD
function ToolCard({
  label,
  imageSrc,
  onClick,
}: {
  label: string;
  imageSrc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-2 group rounded-2xl transition-all h-32 hover:scale-105 active:scale-95"
    >
      <img 
        src={imageSrc} 
        alt={label}
        className="h-[67px] w-24 object-cover rounded-2xl shadow-md border border-stone-100 group-hover:border-amber-200 transition-all"
      />
      <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-full group-hover:bg-amber-100 transition-colors">
        {label}
      </span>
    </button>
  );
}
