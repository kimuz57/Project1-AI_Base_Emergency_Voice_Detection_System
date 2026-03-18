"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// 1. นำเข้า Component อัดเสียงแบบ "ข้าม" การทำ Server-Side Rendering (ssr: false)
const VoiceRecorder = dynamic(() => import("./VoiceRecorder"), {
  ssr: false,
  // 2. ระหว่างที่เบราว์เซอร์กำลังโหลด Library อัดเสียง ให้แสดงหน้าต่างโหลดรอ
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
      <p className="text-slate-500 font-medium">กำลังเตรียมระบบรับเสียง...</p>
    </div>
  ),
});

export default function DashboardPage() {
  return <VoiceRecorder />;
}