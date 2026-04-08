"use client";

import { usePathname } from "next/navigation";

type FloatingWhatsAppButtonProps = {
  phoneNumber: string;
  label?: string;
  className?: string;
  hideOnStorefront?: boolean;
  defaultMessage?: string;
};

function normalizePhoneForWa(input: string) {
  return String(input || "").replace(/[^\d]/g, "");
}

export default function FloatingWhatsAppButton({
  phoneNumber,
  label = "Chat on WhatsApp",
  className = "",
  hideOnStorefront = false,
  defaultMessage,
}: FloatingWhatsAppButtonProps) {
  const pathname = usePathname();
  const normalizedPhone = normalizePhoneForWa(phoneNumber);

  if (!normalizedPhone) return null;
  if (hideOnStorefront && pathname?.startsWith("/storefronts/")) return null;

  const href = defaultMessage
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(defaultMessage)}`
    : `https://wa.me/${normalizedPhone}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-3 text-sm font-medium text-white shadow-soft-lg transition-all hover:scale-105 hover:bg-green-600 ${className}`}
      aria-label={label}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="h-4 w-4"
        fill="currentColor"
      >
        <path d="M19.11 17.35c-.27-.14-1.62-.8-1.87-.89-.25-.09-.43-.14-.62.14-.18.27-.71.89-.87 1.07-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.33-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.41.12-.54.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.14-.62-1.5-.84-2.06-.22-.53-.44-.45-.62-.46h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.84c.14.18 1.92 2.92 4.65 4.1.65.28 1.16.44 1.56.56.65.21 1.24.18 1.71.11.52-.08 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.06-.11-.25-.18-.52-.32Z" />
        <path d="M16.03 3.2C8.92 3.2 3.2 8.92 3.2 16.03c0 2.27.6 4.49 1.74 6.44L3.2 28.8l6.5-1.7a12.7 12.7 0 0 0 6.33 1.73h.01c7.11 0 12.83-5.72 12.83-12.83S23.14 3.2 16.03 3.2Zm0 23.47h-.01a10.7 10.7 0 0 1-5.44-1.49l-.39-.23-3.86 1.01 1.03-3.77-.25-.39a10.67 10.67 0 1 1 8.92 4.87Z" />
      </svg>
      {label}
    </a>
  );
}
