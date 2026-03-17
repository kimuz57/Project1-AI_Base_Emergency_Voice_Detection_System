"use client";

import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import AmbientOrbs from "@/components/AmbientOrbs";
import GlassCard from "@/components/GlassCard";
import AlertBanner from "@/components/AlertBanner";
import WaveformAnimation from "@/components/WaveformAnimation";

export default function DashboardPage() {
  useAuth();
  const { connect } = useWebSocket();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientOrbs />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-10 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          {/* Alert Banner */}
          <AlertBanner
            title="การแจ้งเตือนวิกฤต"
            description="ตรวจพบเสียงขอความช่วยเหลือในห้องนั่งเล่น"
          />

          {/* Main Detection Visualization */}
          <GlassCard className="p-10 md:p-16 flex flex-col items-center justify-center min-h-[400px] md:min-h-[540px] relative overflow-hidden deep-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="size-28 md:size-36 rounded-full lucid-glass-inner flex items-center justify-center mb-10 transition-transform duration-700 hover:scale-110">
                <span className="material-symbols-outlined text-5xl md:text-6xl text-primary drop-shadow-[0_0_10px_rgba(43,108,238,0.3)]">
                  mic
                </span>
              </div>
              <span className="text-xs text-primary font-bold uppercase tracking-[0.25em] mb-6">กำลังรับฟัง...</span>
              <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">&quot;ช่วยเหลือ&quot;</h1>
              <p className="text-lg text-gray-500/80">ระดับความมั่นใจ 92%</p>
            </div>
            <WaveformAnimation />
          </GlassCard>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassCard className="p-8 flex items-center gap-6">
              <div className="size-16 rounded-2xl lucid-glass-inner flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-3xl">volume_up</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">ระดับเดซิเบล</p>
                <p className="text-2xl font-semibold">
                  74 dB <span className="text-base text-green-500 font-semibold ml-2">ปกติ</span>
                </p>
              </div>
            </GlassCard>
            <GlassCard className="p-8 flex items-center gap-6">
              <div className="size-16 rounded-2xl lucid-glass-inner flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-3xl">event_available</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">เหตุการณ์ล่าสุด</p>
                <p className="text-2xl font-semibold">4 วันที่แล้ว</p>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-10">
          {/* System Activity */}
          <GlassCard className="p-8 deep-shadow" hover={false}>
            <h3 className="text-2xl font-semibold mb-8 tracking-tight">กิจกรรมของระบบ</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between py-5 border-b border-white/20">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-gray-500 text-2xl">keyboard_voice</span>
                  <span className="text-base font-medium">การจดจำเสียง</span>
                </div>
                <span className="text-xs text-green-500 uppercase tracking-widest font-bold">เปิดใช้งาน</span>
              </div>
              <div className="flex items-center justify-between py-5 border-b border-white/20">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-gray-500 text-2xl">sensors</span>
                  <span className="text-base font-medium">เซนเซอร์ตรวจจับ</span>
                </div>
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">สแตนด์บาย</span>
              </div>
            </div>

            <div className="mt-10">
              <p className="text-xs text-gray-500 uppercase tracking-[0.15em] mb-6 font-bold">โครงข่ายอุปกรณ์</p>
              <div className="space-y-5">
                {[
                  { name: "โหนดห้องนั่งเล่น", ping: "12ms", online: true },
                  { name: "เซนเซอร์ห้องครัว", ping: "18ms", online: true },
                  { name: "ฮับนอกชาน", ping: "ออฟไลน์", online: false },
                ].map((node) => (
                  <div key={node.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span
                        className={`size-2.5 rounded-full ${
                          node.online
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                            : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]"
                        }`}
                      />
                      <span className={`text-base font-medium ${node.online ? "text-gray-700" : "text-gray-400"}`}>
                        {node.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        node.online ? "text-gray-500" : "text-red-400 font-bold uppercase text-[10px]"
                      }`}
                    >
                      {node.ping}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Map View */}
          <div className="relative overflow-hidden rounded-3xl h-64 lucid-glass deep-shadow floating-layer">
            <div
              className="absolute inset-0 bg-cover bg-center grayscale brightness-90 transition-transform duration-1000 hover:scale-105"
              style={{
                backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAxBCCJoxB5R2JXH9edpCNLHJdJ48GBRurFgS8q52N813-zf4PG_NNzt0gGS9jY3xMDW7lnAB6g2IZ9zZXVZqvdkK0Z4-HZDBHfubdivtJlx3SWEMnoznPEP8QX5meO0eVebHEA3QbVGM-y6v6h5-X3ZB8H-v9xOCbunce4k5U0Y3TDtDpbTmiTAO_gVhOtyJGUPTS4Lob3Sz_eyeXaNrRFQ_OD8Q1avSG9Ccb-Oy9IpaS_G8lVkCFJYgTk5AWLfo0YppXgcnQM30A")`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent flex flex-col justify-end p-8">
              <h4 className="text-gray-900 text-xl mb-1 font-semibold">กิจกรรมตามโซน</h4>
              <p className="text-sm text-gray-700 font-medium">กำลังตรวจสอบฮับซานฟรานซิสโก</p>
            </div>
            <div className="absolute top-6 right-6 size-11 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-xl">location_on</span>
            </div>
          </div>

          <button className="w-full py-5 rounded-2xl lucid-glass text-gray-900 font-bold border border-white/40 hover:bg-white/50 transition-all active:scale-[0.97] deep-shadow">
            ตรวจสอบสุขภาพของระบบ
          </button>
        </div>
      </main>

      <footer className="py-12 mt-auto border-t border-white/10">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs uppercase tracking-[0.2em] font-bold">
          <p>© 2024 Guardian AI</p>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">lock</span>
            <p>สภาพแวดล้อมที่เป็นส่วนตัวและปลอดภัย</p>
          </div>
        </div>
      </footer>

      <MobileNav />
    </div>
  );
}
