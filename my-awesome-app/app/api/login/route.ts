// app/api/login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // ดึงกุญแจฐานข้อมูลมาจาก lib/db.ts

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. ค้นหา User ใน Database (สมมติชื่อตารางคือ users)
    const [rows]: any = await db.query(
      "SELECT * FROM users WHERE email = ? AND password = ?", 
      [email, password]
    );

    // 2. ตรวจสอบผลลัพธ์
    if (rows.length > 0) {
      // ถ้าเจอ User ให้ตอบกลับพร้อมสถานะ OK
      return NextResponse.json({ 
        message: "Login Success", 
        user: { id: rows[0].id, name: rows[0].name } 
      }, { status: 200 });
    } else {
      // ถ้าไม่เจอ
      return NextResponse.json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}