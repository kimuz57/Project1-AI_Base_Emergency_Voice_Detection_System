"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// 1. Import ไอคอนรูปตา (Eye) และตาปิด (EyeOff) จาก Lucide
import { Eye, EyeOff } from "lucide-react"; 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State ควบคุมการแสดงรหัสผ่าน
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // กันหน้าเว็บ Refresh
    setLoading(true);

    try {
      // 1. ส่งข้อมูลไปที่ API Route ที่เราจะสร้าง (ขั้นตอนถัดไป)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // 2. ถ้า Login ผ่าน (Status 200)
        alert("เข้าสู่ระบบสำเร็จ!");
        router.push("/dashboard"); // ไปหน้าแรก หรือหน้า Dashboard
      } else {
        // 3. ถ้า Login ไม่ผ่าน (Status 401 หรืออื่นๆ)
        alert(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-white to-pink-200 p-4 font-sans">
      
      {/* กล่องกระจก (Glass Box) */}
      <div className="w-full max-w-md p-8 bg-white/30 backdrop-blur-xl border border-white/40 rounded-[40px] shadow-[0_0_25px_rgba(0,0,0,0.05)] overflow-hidden relative">
        
        {/* แสงวาวที่มุมกล่อง */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-slate-800 text-center mb-2">Welcome Back</h1>
          <p className="text-slate-500 text-center mb-8 text-sm font-medium">Voice detection system</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Email */}
            <div>
              <label className="text-slate-700 text-xs mb-1.5 block ml-1 font-semibold">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@up.ac.th"
                className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 outline-none focus:ring-2 ring-blue-300 transition-all font-medium"
              />
            </div>

            {/* Input Password */}
            <div>
              <label className="text-slate-700 text-xs mb-1.5 block ml-1 font-semibold">Password</label>
              <div className="relative">
                {/* 2. เปลี่ยน Type ของ Input ตาม State showPassword */}
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl text-slate-800 outline-none focus:ring-2 ring-blue-300 transition-all pr-12 font-medium" // เพิ่ม pr-12 เพื่อเว้นที่ให้ไอคอน
                />
                
                {/* 3. ปุ่มกดแสดง/ซ่อน (วางทับใน Input) */}
                <button
                  type="button" // สำคัญมาก! กันมันไป Submit ฟอร์ม
                  onClick={() => setShowPassword(!showPassword)} // สลับค่า true/false
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {/* 4. แสดงไอคอนตาม State showPassword */}
                  {showPassword ? (
                    <EyeOff size={20} strokeWidth={2.5} /> // ไอคอนตาปิด (เมื่อกำลังโชว์รหัส)
                  ) : (
                    <Eye size={20} strokeWidth={2.5} />    // ไอคอนตาเปิด (เมื่อกำลังซ่อนรหัส)
                  )}
                </button>
              </div>
            </div>

            {/* ปุ่ม Login */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all mt-4 disabled:bg-blue-300"
            >
              {loading ? "Checking..." : "Login"}
            </button>
          </form>

          {/* ปุ่มกลับหน้าหลัก */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link 
              href="/" 
              className="text-slate-400 hover:text-blue-600 text-sm font-medium transition-colors duration-300 flex items-center justify-center gap-2"
            >
              <span>←</span> Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
