"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PERSONA_STEPS, PersonaStep } from "../steps";
import PersonaFlowModal from "@/app/components/persona/PersonalFlowModal";
import { getNextIncompleteStep, isPersonaComplete } from "../utils";
import { UserProfile } from "@/app/types";
import { useSession } from "next-auth/react";
import PersonaSuccess from "@/app/components/persona/PersonaSuccess";
import BrandLogo from "@/app/components/brand/BrandLogo";

function PersonaProgress({ persona }: any) {
  return (
    <div className="mt-6 flex justify-center gap-2">
      {PERSONA_STEPS.map((step: any) => {
        const done = Boolean(persona?.[step]?.updatedAt);
        return (
          <div
            key={step}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              done ? "bg-brand-terracotta" : "bg-brand-sand"
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
        const [profileRes] = await Promise.all([
          fetch(`/api/user/get-profile?email=${encodeURIComponent(userEmail)}`),
        ]);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream font-body">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size={40} />
          <p className="text-sm text-brand-stone">Loading persona…</p>
        </div>
      </div>
    );
  }

  if (isPersonaComplete(persona)) {
    return <PersonaSuccess />;
  }

  return (
    <>
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6 font-body">
        <div className="text-center max-w-sm">
          <BrandLogo size={56} className="mx-auto mb-6" />
          <h1 className="font-heading text-3xl text-brand-charcoal">
            Let Rasphia Understand You
          </h1>
          <p className="mt-3 text-sm text-brand-stone leading-relaxed">
            A few quick steps. Mostly photos. We do the thinking.
          </p>

          <button
            onClick={startWizard}
            className="mt-8 px-8 py-3.5 rounded-2xl bg-brand-charcoal text-brand-cream text-sm font-medium hover:bg-brand-warm-black transition-colors shadow-soft-md"
          >
            Build My Taste Graph
          </button>

          <PersonaProgress persona={persona} />
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
