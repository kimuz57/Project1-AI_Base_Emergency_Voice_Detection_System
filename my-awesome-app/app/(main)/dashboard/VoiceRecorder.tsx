"use client";

import { useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Mic, Square, Play, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"; // ใช้ Lucide Icons

export default function VoiceRecorder() {
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ฟังก์ชันจัดการเมื่ออัดเสียงเสร็จ
  const handleStopRecording = async (blobUrl: string, blob: Blob) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // 1. เตรียมข้อมูลเพื่อส่ง (Multipart Form Data)
      const formData = new FormData();
      formData.append("audio_file", blob, "recording.webm"); // ส่งเป็นไฟล์ WebM (ปกติเบราว์เซอร์ใช้อันนี้)

      // 2. ส่งไฟล์เสียงไปยัง Backend Python (สมมติว่าเป็น http://localhost:5000)
      const response = await fetch("http://localhost:5000/analyze-audio", {
        method: "POST",
        body: formData,
        // สำคัญ: ห้ามใส่ Content-Type: multipart/form-data เอง เบราว์เซอร์จะจัดการให้
      });

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Backend");
      }

      const data = await response.json();
      
      // 3. แสดงผลลัพธ์จากการวิเคราะห์
      setAnalysisResult(data.status); // สมมติ Backend ส่ง { status: 'help' หรือ 'normal' }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดที่ไม่รู้จัก");
    } finally {
      setIsLoading(false);
    }
  };

  // ใช้ useReactMediaRecorder Hook
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true, // อัดเสียงอย่างเดียว
    onStop: handleStopRecording, // คอลแบ็กเมื่อกดหยุด
  });

  return (
    <main className="min-h-screen p-8 bg-slate-50 font-sans">
      {/* Header */}
      <div className="mb-12 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Voice detection system</h1>
        <p className="text-slate-600 mt-2 font-medium">แผงควบคุมการรับเสียงและวิเคราะห์สถานการณ์</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* กล่องอัดเสียง (Recording Card) */}
        <div className="bg-white p-8 rounded-[40px] shadow-[0_0_20px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center justify-center space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">เครื่องรับเสียง</h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">กดปุ่มสีฟ้าเพื่อเริ่มอัดเสียงขอความช่วยเหลือ</p>
          </div>

          {/* สถานะการอัดเสียง */}
          <div className="flex items-center gap-3 bg-slate-100 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700">
            {status === "idle" && <Mic size={18} />}
            {status === "recording" && <Mic size={18} className="text-red-500 animate-pulse" />}
            {status === "stopped" && <Square size={18} />}
            Status: {status}
          </div>

          {/* กลุ่มปุ่มควบคุม */}
          <div className="flex items-center gap-6">
            {/* ปุ่มเริ่มอัดเสียง */}
            <button
              onClick={startRecording}
              disabled={status === "recording" || isLoading}
              className={`p-6 rounded-full shadow-lg transition-all ${
                status === "recording"
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              }`}
            >
              <Mic size={32} />
            </button>

            {/* ปุ่มหยุดอัดเสียง */}
            <button
              onClick={stopRecording}
              disabled={status !== "recording" || isLoading}
              className={`p-6 rounded-full shadow-lg transition-all ${
                status !== "recording"
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700 active:scale-95"
              }`}
            >
              <Square size={32} />
            </button>
          </div>

          {/* เครื่องเล่นเสียงที่อัดเสร็จแล้ว (เพื่อตรวจสอบ) */}
          {mediaBlobUrl && status === "stopped" && (
            <div className="w-full flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Play size={20} className="text-blue-500" />
              <audio src={mediaBlobUrl} controls className="w-full flex-1 h-10" />
            </div>
          )}
        </div>

        {/* กล่องผลลัพธ์ (Analysis Results) */}
        <div className="bg-white p-8 rounded-[40px] shadow-[0_0_20px_rgba(0,0,0,0.03)] border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">ผลการวิเคราะห์</h2>

          <div className="h-full flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200">
            {/* กำลังโหลด */}
            {isLoading && (
              <div className="text-center text-slate-500 flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <p className="font-semibold text-lg">กำลังตัดช่วงเงียบและวิเคราะห์เสียง...</p>
              </div>
            )}

            {/* ผลลัพธ์: ปกติ */}
            {analysisResult === "normal" && !isLoading && (
              <div className="text-center text-green-600 flex flex-col items-center gap-5">
                <CheckCircle size={64} strokeWidth={1.5} />
                <p className="font-bold text-xl">สถานการณ์ปกติ</p>
                <p className="text-slate-500 text-sm font-medium">ไม่พบเสียงร้องขอความช่วยเหลือในไฟล์</p>
              </div>
            )}

            {/* ผลลัพธ์: อันตราย */}
            {analysisResult === "help" && !isLoading && (
              <div className="text-center text-red-600 flex flex-col items-center gap-5">
                <AlertTriangle size={64} strokeWidth={1.5} />
                <p className="font-bold text-2xl animate-pulse">ตรวจพบเสียงขอความช่วยเหลือ!</p>
                <p className="text-slate-500 text-sm font-medium">กรุณาตรวจสอบทันที</p>
              </div>
            )}

            {/* ข้อผิดพลาด */}
            {error && (
              <div className="text-center text-amber-600 flex flex-col items-center gap-5">
                <AlertTriangle size={64} strokeWidth={1.5} />
                <p className="font-bold text-xl">เกิดข้อผิดพลาด</p>
                <p className="text-slate-500 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* รอรับข้อมูล */}
            {!isLoading && !analysisResult && !error && (
              <div className="text-center text-slate-400">
                <Mic size={48} className="mx-auto" />
                <p className="mt-4 font-semibold text-lg">กรุณาอัดเสียงเพื่อเริ่มการวิเคราะห์</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}