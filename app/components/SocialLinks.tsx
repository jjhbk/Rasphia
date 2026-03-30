import React from "react";
import {
  FaDiscord,
  FaInstagram,
  FaReddit,
  FaFacebook,
  FaLinkedin,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const SOCIAL_LINKS = [
  { name: "Discord",   href: "https://discord.gg/kQaGhWQ3",                           icon: FaDiscord },
  { name: "Instagram", href: "https://www.instagram.com/rasphia.ai/",                  icon: FaInstagram },
  { name: "Reddit",    href: "https://www.reddit.com/r/Rasphia/",                      icon: FaReddit },
  { name: "X",         href: "https://x.com/rasphia_ai",                               icon: FaXTwitter },
  { name: "Facebook",  href: "https://www.facebook.com/profile.php?id=61586842196963", icon: FaFacebook },
  { name: "LinkedIn",  href: "https://www.linkedin.com/company/rasphia",               icon: FaLinkedin },
];

export default function SocialLinks() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {SOCIAL_LINKS.map(({ name, href, icon: Icon }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          className="text-brand-stone/50 hover:text-brand-charcoal transition-all hover:scale-110"
        >
          <Icon size={20} />
        </a>
      ))}
    </div>
  );
}
