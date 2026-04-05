"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PERSONA_STEPS, PersonaStep } from "../steps";
import PersonaFlowModal from "@/app/components/persona/PersonalFlowModal";
import { getNextIncompleteStep, isPersonaComplete } from "../utils";
import { UserProfile } from "@/app/types";
import { useSession } from "next-auth/react";
import PersonaSuccess from "@/app/components/persona/PersonaSuccess";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Navbar from "@/app/components/Navbar";
import { CheckCircle2, ChevronRight, User, Layers, MapPin, Camera, Wand2, Heart } from "lucide-react";

type StepMeta = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

const STEP_META: Record<string, StepMeta> = {
  skin:      { key: "skin",      label: "Skin",      description: "Skin type, tone & concerns",        icon: Camera, color: "text-rose-600",   bg: "bg-rose-50 border-rose-200" },
  hair:      { key: "hair",      label: "Hair",      description: "Hair type, density & goals",        icon: Wand2,  color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  body:      { key: "body",      label: "Body",      description: "Frame, proportions & activity",     icon: User,   color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  style:     { key: "style",     label: "Style",     description: "Archetypes, palette & occasions",   icon: Layers, color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  taste:     { key: "taste",     label: "Taste",     description: "Gifting, décor & scent preferences",icon: Heart,  color: "text-pink-600",   bg: "bg-pink-50 border-pink-200" },
  lifestyle: { key: "lifestyle", label: "Lifestyle", description: "Work, fitness & travel habits",     icon: MapPin, color: "text-teal-600",   bg: "bg-teal-50 border-teal-200" },
};

function PersonaProgress({ persona }: { persona: any }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mt-6">
      {PERSONA_STEPS.map((step) => {
        const done = Boolean(persona?.[step]?.updatedAt);
        return (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all ${
              done ? "w-8 bg-brand-terracotta" : "w-5 bg-brand-sand"
            }`}
          />
        );
      })}
    </div>
  );
}

const initialUser: UserProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  wishlist: [],
};

export default function PersonaWizard() {
  const [persona, setPersona] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<PersonaStep | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const { data: session } = useSession();

  useEffect(() => {
    const userEmail = session?.user?.email ?? "";
    const userName = session?.user?.name ?? "";
    if (!userEmail) return;
    const loadUserData = async () => {
      try {
        const profileRes = await fetch(`/api/user/get-profile?email=${encodeURIComponent(userEmail)}`);
        if (!profileRes.ok) throw new Error("Failed to fetch user data");
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

  const fetchPersona = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/persona/get`);
    const json = await res.json();
    const freshPersona = json?.persona ?? {};
    setPersona(freshPersona);
    setLoading(false);
    return freshPersona;
  }, []);

  useEffect(() => {
    fetchPersona();
  }, [fetchPersona]);

  useEffect(() => {
    if (!loading && persona) {
      const next = getNextIncompleteStep(persona);
      if (next) {
        setActiveStep(next);
        setModalOpen(true);
      }
    }
  }, [loading, persona]);

  function startWizard() {
    const next = getNextIncompleteStep(persona);
    setActiveStep(next);
    setModalOpen(true);
  }

  function startStep(step: PersonaStep) {
    setActiveStep(step);
    setModalOpen(true);
  }

  async function handleFlowSave(payload: any) {
    await fetch("/api/persona/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updatedPersona = await fetchPersona();
    const next = getNextIncompleteStep(updatedPersona);
    if (next) {
      setActiveStep(next);
      setModalOpen(true);
    } else {
      setActiveStep(null);
      setModalOpen(false);
    }
  }

  const completedCount = PERSONA_STEPS.filter(
    (s) => persona?.[s]?.updatedAt
  ).length;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-brand-cream font-body">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-brand-terracotta/30 border-t-brand-terracotta animate-spin" />
            <p className="text-sm text-brand-stone">Loading persona…</p>
          </div>
        </div>
      </>
    );
  }

  if (isPersonaComplete(persona)) {
    return <PersonaSuccess />;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-brand-hero font-body">
        {/* Hero */}
        <div className="relative border-b border-brand-sand/30 bg-brand-parchment/50">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 right-[-5%] h-72 w-72 rounded-full bg-brand-clay/12 blur-[80px]" />
          </div>
          <div className="relative mx-auto max-w-2xl px-6 py-12 text-center">
            <BrandLogo size={40} className="mx-auto mb-5" />
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-sand/50 border border-brand-sand text-[11px] text-brand-stone uppercase tracking-widest mb-4">
              Build Your Taste Graph
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl text-brand-charcoal leading-tight">
              Let Rasphia understand you
            </h1>
            <p className="mt-3 text-brand-stone leading-relaxed max-w-sm mx-auto">
              A few quick steps. Mostly choices. We use this to recommend things that actually fit your life.
            </p>

            {/* Progress */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5">
                {PERSONA_STEPS.map((step) => {
                  const done = Boolean(persona?.[step]?.updatedAt);
                  return (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all ${
                        done ? "w-8 bg-brand-terracotta" : "w-5 bg-brand-sand"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-brand-stone/60 ml-1">
                {completedCount}/{PERSONA_STEPS.length} done
              </span>
            </div>

            <button
              onClick={startWizard}
              className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors shadow-soft-md"
            >
              {completedCount === 0 ? "Start Building" : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Steps grid */}
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-stone/50 mb-4">
            Your sections
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PERSONA_STEPS.map((step) => {
              const meta = STEP_META[step];
              const done = Boolean(persona?.[step]?.updatedAt);
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <button
                  key={step}
                  onClick={() => startStep(step)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:shadow-soft group ${
                    done
                      ? "bg-white border-brand-sand/30 shadow-soft"
                      : "bg-white/50 border-brand-sand/20 hover:bg-white/80"
                  }`}
                >
                  <div className={`h-11 w-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${done ? "text-brand-charcoal" : "text-brand-stone"}`}>
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-brand-stone/50 mt-0.5">{meta.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-brand-stone/30 group-hover:text-brand-stone/60 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PersonaFlowModal
        isOpen={modalOpen}
        type={activeStep}
        onClose={() => {
          setModalOpen(false);
          setActiveStep(null);
        }}
        onSave={handleFlowSave}
        userEmail={currentUser.email}
      />
    </>
  );
}
