import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "./providers/SessionProvider"; // <-- our wrapper client provider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rasphia",
  description: "AI-powered gift curator",
};

// 👇 this is essential to avoid AsyncStorage bug
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ✅ wrap everything inside the client-side provider */}
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
