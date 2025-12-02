"use client";

import { useEffect, useState } from "react";

export default function usePersona(email: string | null) {
  const [persona, setPersona] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!email) return;
    setLoading(true);

    const res = await fetch(`/api/persona/get?email=${email}`);
    const json = await res.json();

    setPersona(json.persona || {});
    setLoading(false);
  }

  async function update(patch: any) {
    if (!email) return;

    const updated = { ...(persona || {}), ...patch };

    await fetch("/api/persona/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, persona: updated }),
    });

    setPersona(updated);
  }

  useEffect(() => {
    load();
  }, [email]);

  return { persona, loading, update };
}
