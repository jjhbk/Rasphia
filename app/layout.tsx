import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import AuthSessionProvider from "./providers/SessionProvider";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = localFont({
  src: [
    {
      path: "../public/fonts/Fraunces-Variable.ttf",
      style: "normal",
    },
  ],
  variable: "--font-heading",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "Rasphia — Shop the Vibe",
  description:
    "Shopping that knows you. Persona-driven discovery for the things that fit your life.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${fraunces.variable} font-body antialiased`}
      >
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
