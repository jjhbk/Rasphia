"use client";

import React, { useEffect, useState } from "react";
import {
  Camera,
  Wand2,
  User,
  Heart,
  MapPin,
  Layers,
  Eye,
  Home,
} from "lucide-react";
import usePersona from "@/hooks/userPersona";
import PersonaFlowModal from "@/app/components/persona/PersonalFlowModal";
import { UserProfile } from "@/app/types";
import { useSession } from "next-auth/react";

const SECTIONS = [
  { key: "home", label: "Home Profile", icon: Home },
  { key: "skin", label: "Skin Profile", icon: Camera },
  { key: "hair", label: "Hair Profile", icon: Wand2 },
  { key: "body", label: "Body Profile", icon: User },
  { key: "style", label: "Style", icon: Layers },
  { key: "taste", label: "Taste", icon: Heart },
  { key: "lifestyle", label: "Lifestyle", icon: MapPin },
];
const initialUser: UserProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  wishlist: [],
};

export default function PersonaPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const { data: session, status } = useSession();

  /* ------------------------------------------------------------------
     Persona Hook
  ------------------------------------------------------------------ */
  const {
    persona,
    loading: personaLoading,
    update: updatePersona,
  } = usePersona(currentUser.email);

  /* ------------------------------------------------------------------
     Local UI State
  ------------------------------------------------------------------ */
  const [personaOpenType, setPersonaOpenType] = useState<string | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  function handleOpenPersonaFlow(type: string) {
    setPersonaOpenType(type);
    setIsPersonaModalOpen(true);
  }

  async function handlePersonaSave(patch: any) {
    await updatePersona(patch);
    setIsPersonaModalOpen(false);
  }

  /* ------------------------------------------------------------------
     Completion Logic
  ------------------------------------------------------------------ */
  function isPersonaSectionComplete(section: any): boolean {
    if (!section || typeof section !== "object") return false;

    if (section.updatedAt) return true;

    return Object.values(section).some((value) => {
      if (value === null) return false;
      if (value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  }
  useEffect(() => {
    const userEmail = session?.user?.email ?? "";
    const userName = session?.user?.name ?? "";
    if (!userEmail) return;

    const loadUserData = async () => {
      try {
        const [profileRes] = await Promise.all([
          fetch(`/api/user/get-profile?email=${encodeURIComponent(userEmail)}`),
        ]);

        if (!profileRes.ok) {
          throw new Error("Failed to fetch user data or orders or chats");
        }

        const profile = await profileRes.json();

        setCurrentUser({
          name: profile?.name || userName,
          email: profile?.email || userEmail,
          phone: profile?.phone || "",
          address: profile?.address || "",
          wishlist: profile?.wishlist || [],
        });
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [session]);
  /* ------------------------------------------------------------------
     Render
  ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* --------------------------------------------------------------
         Header
      -------------------------------------------------------------- */}
      <header className="px-6 pt-10 pb-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-900">
          Your Personal Style Persona
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-xl">
          Build your complete persona to unlock personalized fashion, grooming,
          and lifestyle recommendations.
        </p>
      </header>

      {/* --------------------------------------------------------------
         Main Content
      -------------------------------------------------------------- */}
      <main className="px-6 pb-32 max-w-4xl mx-auto">
        {personaLoading ? (
          <div className="text-sm text-stone-500">Loading persona…</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const done = isPersonaSectionComplete(persona?.[s.key]);

              return (
                <button
                  key={s.key}
                  onClick={() => handleOpenPersonaFlow(s.key)}
                  className={`flex items-center justify-between p-5 rounded-3xl transition-all
                    ${
                      done
                        ? "bg-white border border-amber-100 shadow-md hover:shadow-lg"
                        : "bg-white/70 border border-stone-200 hover:bg-white"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-50">
                      <Icon className="h-6 w-6 text-amber-600" />
                    </div>

                    <div className="text-left">
                      <div className="text-base font-semibold text-stone-800">
                        {s.label}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {done ? "Completed" : "Tap to complete"}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`h-3 w-3 rounded-full ${
                      done ? "bg-amber-600" : "bg-stone-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* --------------------------------------------------------------
         Sticky Footer CTA
      -------------------------------------------------------------- */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-stone-500 max-w-md">
            Your persona powers AI try-ons, product picks, and styling insights
            across Rasphia.
          </p>

          <a
            href="/persona"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 text-white text-sm font-medium shadow-lg hover:bg-amber-700 transition"
          >
            <Eye className="h-4 w-4" />
            View Complete Persona
          </a>
        </div>
      </div>

      {/* --------------------------------------------------------------
         Persona Flow Modal
      -------------------------------------------------------------- */}
      <PersonaFlowModal
        type={personaOpenType}
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        onSave={handlePersonaSave}
        userEmail={currentUser.email}
      />
    </div>
  );
}
