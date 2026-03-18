"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileLinks = [
  { href: "/dashboard", icon: "dashboard", label: "แผงควบคุม" },
  { href: "/history", icon: "history", label: "ประวัติ" },
  { href: "/devices", icon: "memory", label: "อุปกรณ์" },
  { href: "/settings", icon: "settings", label: "ตั้งค่า" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" id="mobileNav">
      <div className="nav-items">
        {mobileLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-item ${pathname === link.href ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
