"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PERSONA_STEPS, PersonaStep } from "../steps";
import PersonaFlowModal from "@/app/components/persona/PersonalFlowModal";
import { getNextIncompleteStep, isPersonaComplete } from "../utils";
import { UserProfile } from "@/app/types";
import { useSession } from "next-auth/react";
import PersonaSuccess from "@/app/components/persona/PersonaSuccess";

function PersonaProgress({ persona }: any) {
  return (
    <div className="mt-6 flex justify-center gap-2">
      {PERSONA_STEPS.map((step: any) => {
        const done = Boolean(persona?.[step]?.updatedAt);
        return (
          <div
            key={step}
            className={`h-2 w-8 rounded-full ${
              done ? "bg-amber-600" : "bg-stone-300"
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
  const { data: session, status } = useSession();
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
  // -----------------------------
  // Fetch persona (SSOT)
  // -----------------------------
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

  // -----------------------------
  // Start / Continue wizard
  // -----------------------------
  function startWizard() {
    const next = getNextIncompleteStep(persona);
    setActiveStep(next);
    setModalOpen(true);
  }

  // -----------------------------
  // When a flow saves data
  // -----------------------------
  async function handleFlowSave(payload: any) {
    // 1. Save patch
    await fetch("/api/persona/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 2. Fetch fresh persona (SSOT)
    const updatedPersona = await fetchPersona();

    // 3. Decide next step
    const next = getNextIncompleteStep(updatedPersona);

    if (next) {
      setActiveStep(next);
      setModalOpen(true);
    } else {
      // Wizard complete
      setActiveStep(null);
      setModalOpen(false);
    }
  }
  if (loading) {
    return <div className="text-sm text-stone-500">Loading persona…</div>;
  }

  if (isPersonaComplete(persona)) {
    return <PersonaSuccess />;
  }

  return (
    <>
      {/* ENTRY POINT */}
      <div className="text-center mt-12">
        <h1 className="text-3xl font-bold text-stone-900">
          Let Rasphia Understand You
        </h1>

        <p className="mt-2 text-sm text-stone-600">
          A few quick steps. Mostly photos. We do the thinking.
        </p>

        <button
          onClick={startWizard}
          className="mt-8 px-8 py-4 rounded-full bg-amber-600 text-white font-medium shadow-lg"
        >
          ✨ Build My Persona
        </button>

        <PersonaProgress persona={persona} />
      </div>

      {/* MODAL */}
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
