import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">ยินดีต้อนรับสู่หน้าหลัก</h1>
      
      {/* ใช้ Link แทน <a> เพื่อความเร็วระดับเทพ */}
      <Link 
        href="/login" 
        className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ไปที่หน้า Login
      </Link>
    </main>
  );
}
