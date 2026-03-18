"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { useRouter } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "แผงควบคุม" },
  { href: "/history", label: "ประวัติ" },
  { href: "/devices", label: "อุปกรณ์" },
  { href: "/settings", label: "การตั้งค่า" },
];

export default function Navbar() {
  const pathname = usePathname();
  const logout = useUserStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    if (confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      logout();
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 lucid-glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary flex items-center justify-center rounded-xl text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">shield_with_heart</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Guardian AI</h2>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${
                pathname === link.href
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-gray-500 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/30 border border-white/40">
            <span className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-xs text-gray-700 uppercase tracking-wider font-semibold">
              ระบบปลอดภัย
            </span>
          </div>
          <button className="p-2.5 rounded-full hover:bg-white/40 transition-colors">
            <span className="material-symbols-outlined text-2xl opacity-70">notifications</span>
          </button>
          <Link href="/settings" className="p-2.5 rounded-full hover:bg-white/40 transition-colors">
            <span className="material-symbols-outlined text-2xl opacity-70">settings</span>
          </Link>
          <button onClick={handleLogout} className="logout-btn hidden md:flex">
            <span className="material-symbols-outlined text-sm">logout</span>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </header>
  );
}
