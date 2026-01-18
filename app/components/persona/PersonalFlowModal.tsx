"use client";
import React, { useMemo } from "react";

import SkinFlow from "./steps/SkinFlow";
import HairFlow from "./steps/HairFlow";
import BodyFlow from "./steps/BodyFlow";
import StyleFlow from "./steps/StyleFlow";
import TasteFlow from "./steps/TasteFlow";
import LifestyleFlow from "./steps/LifestyleFlow";

export default function PersonaFlowModal({
  type,
  isOpen,
  onClose,
  onSave,
  userEmail,
}: {
  type: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  userEmail: string | null;
}) {
  if (!isOpen) return null;

  const commonProps = useMemo(
    () => ({ onClose, onSave, userEmail }),
    [onClose, onSave, userEmail]
  );

  // Map keys to components (all mounted once)
  const flows = {
    // skin: <SkinFlow {...commonProps} />,
    // hair: <HairFlow {...commonProps} />,
    body: <BodyFlow {...commonProps} />,
    style: <StyleFlow {...commonProps} />,
    //taste: <TasteFlow {...commonProps} />,
    lifestyle: <LifestyleFlow {...commonProps} />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100"
        >
          ✕
        </button>

        {/* Render ALL flows but hide the inactive ones */}
        {Object.keys(flows).map((key) => (
          <div
            key={key}
            style={{
              display: key === type ? "block" : "none",
            }}
          >
            {flows[key as keyof typeof flows]}
          </div>
        ))}
      </div>
    </div>
  );
}
