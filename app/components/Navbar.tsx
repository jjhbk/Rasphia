"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import {
  Store,
  LayoutDashboard,
  LogOut,
  LogIn,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import BrandLogo from "./brand/BrandLogo";

interface NavbarProps {
  /** Shown on dark background sections */
  variant?: "light" | "dark";
  /** Suppress the navbar (e.g. full-bleed landing) */
  hidden?: boolean;
  /** Extra class on the nav element */
  className?: string;
}

interface NavLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
  external?: boolean;
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export default function Navbar({ hidden = false, className = "" }: NavbarProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (hidden) return null;

  const isAuthed = status === "authenticated";
  const user = session?.user;

  const navLinks: NavLink[] = [
    {
      label: "Discover",
      href: "/storefronts",
      icon: <Store className="h-3.5 w-3.5" />,
    },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href) ?? false;
  }

  return (
    <>
      <nav className={`rasphia-navbar ${className}`}>
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <BrandLogo size={28} showWordmark wordmarkClassName="text-[15px] font-semibold" />
        </Link>

        {/* Primary Links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive(link.href)
                  ? "bg-white text-brand-charcoal shadow-soft border border-brand-sand/40"
                  : "text-brand-stone hover:text-brand-charcoal hover:bg-white/60"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full skeleton" />
          ) : isAuthed ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/70 transition-colors border border-transparent hover:border-brand-sand/40"
              >
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="avatar avatar-sm rounded-full border border-brand-sand/40"
                    style={{ width: 30, height: 30 }}
                  />
                ) : (
                  <span className="avatar avatar-sm bg-brand-terracotta/10 text-brand-terracotta text-xs font-semibold">
                    {getInitials(user?.name, user?.email)}
                  </span>
                )}
                <span className="hidden sm:block text-sm font-medium text-brand-charcoal max-w-[120px] truncate">
                  {user?.name?.split(" ")[0] ?? user?.email}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-brand-stone transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-card-sm py-1 z-50 animate-scale-in">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-brand-sand/30">
                    <p className="text-sm font-semibold text-brand-charcoal truncate">
                      {user?.name ?? "Guest"}
                    </p>
                    <p className="text-xs text-brand-stone truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <DropdownLink
                      href="/"
                      icon={<Sparkles className="h-4 w-4" />}
                      label="Shopping"
                      active={pathname === "/"}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <DropdownLink
                      href="/storefronts"
                      icon={<Store className="h-4 w-4" />}
                      label="Storefronts"
                      active={isActive("/storefronts")}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <DropdownLink
                      href="/admin"
                      icon={<LayoutDashboard className="h-4 w-4" />}
                      label="Dashboard"
                      active={isActive("/admin")}
                      onClick={() => setUserMenuOpen(false)}
                    />
                  </div>

                  <div className="border-t border-brand-sand/30 py-1 mt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-brand-stone hover:text-red-600 hover:bg-red-50/60 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
          )}
        </div>
      </nav>
      {/* Push content below fixed navbar */}
      <div className="rasphia-navbar-spacer" />
    </>
  );
}

function DropdownLink({
  href,
  icon,
  label,
  active,
  external,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        active
          ? "text-brand-charcoal font-medium bg-brand-parchment/60"
          : "text-brand-stone hover:text-brand-charcoal hover:bg-brand-parchment/40"
      }`}
    >
      {icon}
      {label}
      {external && <ExternalLink className="h-3 w-3 ml-auto opacity-50" />}
    </Link>
  );
}
