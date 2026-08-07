"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { ArrowRight } from "lucide-react";

declare global {
  interface Window {
    FB?: {
      init: (input: Record<string, unknown>) => void;
      login: (
        callback: (response: {
          status?: string;
          authResponse?: { code?: string };
        }) => void,
        options?: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type MetaEmbeddedSignupButtonProps = {
  className?: string;
  fallbackHref?: string;
  label?: string;
  successPath?: string;
};

type RuntimeMetaConfig = {
  enabled: boolean;
  appId: string;
  configId: string;
  successPath: string;
};

export default function MetaEmbeddedSignupButton({
  className = "",
  fallbackHref = "/merchant/onboarding",
  label = "Start with Meta",
  successPath,
}: MetaEmbeddedSignupButtonProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkRequested, setSdkRequested] = useState(false);
  const [pending, setPending] = useState(false);
  const [config, setConfig] = useState<RuntimeMetaConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/meta/embedded-signup/config", {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json()) as Partial<RuntimeMetaConfig>;
        if (cancelled) return;
        setConfig({
          enabled: Boolean(data.enabled),
          appId: String(data.appId || "").trim(),
          configId: String(data.configId || "").trim(),
          successPath: String(data.successPath || "/merchant/onboarding").trim(),
        });
      } catch {
        if (cancelled) return;
        setConfig({
          enabled: false,
          appId: "",
          configId: "",
          successPath: "/merchant/onboarding",
        });
      } finally {
        if (!cancelled) setConfigLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const metaEnabled = Boolean(config?.enabled && config.appId && config.configId);

  useEffect(() => {
    if (!metaEnabled || sdkReady) return;
    setSdkRequested(true);
  }, [metaEnabled, sdkReady]);

  useEffect(() => {
    if (!sdkRequested || !metaEnabled || sdkReady) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | null = null;

    const tryInit = () => {
      if (cancelled || !window.FB || !config?.appId) return;
      window.FB.init({
        appId: config.appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: "v25.0",
      });
      setSdkReady(true);
      setErrorText("");
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    tryInit();

    timer = window.setInterval(() => {
      attempts += 1;
      tryInit();
      if (attempts >= 20 && timer) {
        window.clearInterval(timer);
        timer = null;
        if (!cancelled && !window.FB) {
          setErrorText(
            "Meta SDK could not load in this browser session. Refresh once and try again."
          );
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  }, [config?.appId, metaEnabled, sdkReady, sdkRequested]);

  const buttonText = useMemo(() => {
    if (pending) return "Opening Meta...";
    if (!configLoaded) return "Loading Meta signup...";
    if (metaEnabled && !sdkReady) return "Loading Meta signup...";
    if (metaEnabled) return label;
    return "Meta signup coming live";
  }, [configLoaded, label, metaEnabled, pending, sdkReady]);

  const handleFallback = () => {
    window.location.href = fallbackHref;
  };

  const handleClick = () => {
    setErrorText("");

    if (!metaEnabled) {
      handleFallback();
      return;
    }
    if (!sdkReady || !window.FB) {
      setErrorText("Meta signup is still loading. Try again in a moment.");
      return;
    }

    setPending(true);

    window.FB.login(
      (response) => {
        setPending(false);

        const code = String(response?.authResponse?.code || "").trim();
        if (code) {
          const nextUrl = new URL(
            successPath || config?.successPath || "/merchant/onboarding",
            window.location.origin
          );
          nextUrl.searchParams.set("meta_signup", "success");
          nextUrl.searchParams.set("code", code);
          window.location.href = nextUrl.toString();
          return;
        }

        setErrorText("Meta did not return an authorization code. Please try again.");
      },
      {
        config_id: config?.configId || "",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: 3,
        },
      }
    );
  };

  return (
    <>
      {sdkRequested ? (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={() => {
            if (window.FB && config?.appId) {
              window.FB.init({
                appId: config.appId,
                autoLogAppEvents: true,
                xfbml: false,
                version: "v25.0",
              });
              setSdkReady(true);
            }
          }}
          onError={() => {
            setErrorText(
              "Meta SDK failed to load. Check browser blocking settings and try again."
            );
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !configLoaded}
        className={`inline-flex items-center justify-center gap-3 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
          metaEnabled
            ? "bg-stone-900 text-white shadow-xl shadow-stone-500/30 hover:-translate-y-0.5 hover:bg-stone-800"
            : "bg-white/80 text-stone-900 shadow-md ring-1 ring-stone-200 hover:bg-white"
        } ${pending || !configLoaded ? "cursor-wait opacity-80" : ""} ${className}`.trim()}
      >
        <span>{buttonText}</span>
        <ArrowRight className="h-4 w-4" />
      </button>
      {errorText ? (
        <p className="mt-2 text-center text-xs text-amber-700">{errorText}</p>
      ) : null}
    </>
  );
}
