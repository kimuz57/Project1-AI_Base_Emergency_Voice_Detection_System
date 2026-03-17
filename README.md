Guardian AI — ระบบตรวจจับเสียงฉุกเฉินอัจฉริยะ
AI-Based Emergency Voice Detection System

ระบบตรวจจับเสียงฉุกเฉินอัจฉริยะที่ใช้ปัญญาประดิษฐ์ในการวิเคราะห์เสียง สามารถระบุเสียงขอความช่วยเหลือ เสียงกรีดร้อง หรือเสียงอันตรายต่าง ๆ ได้แบบเรียลไทม์ พร้อมแจ้งเตือนผู้ดูแลทันที

ภาพรวมโปรเจค
รายการ รายละเอียด
ชื่อโปรเจค Guardian AI — Emergency Voice Detection
ประเภท Web Application (Frontend)
ภาษา HTML, CSS, JavaScript
Framework TailwindCSS (CDN)
ดีไซน์ Lucid Glassmorphism / Apple-inspired
โครงสร้างไฟล์
AI_voice_detection/
├── login.html # หน้าเข้าสู่ระบบ
├── register.html # หน้าสร้างบัญชีผู้ใช้ใหม่
├── dashboard.html # แผงควบคุมหลัก — เฝ้าฟังเสียงแบบเรียลไทม์
├── history.html # ประวัติเหตุการณ์ — ไทม์ไลน์บันทึกกิจกรรม
├── devide.html # จัดการอุปกรณ์ ESP32 Node
├── setting.html # หน้าตั้งค่าระบบ
├── style.css # สไตล์ชีทหลัก (Lucid Glass + Animations)
├── script.js # JavaScript หลัก (Navigation, Animations, Handlers)
└── README.md # ไฟล์นี้
รายละเอียดแต่ละหน้า
Login (login.html)
หน้าเข้าสู่ระบบสำหรับผู้ดูแล
ฟอร์มกรอกอีเมลและรหัสผ่าน พร้อมปุ่มแสดง/ซ่อนรหัสผ่าน
ลิงก์ไปหน้าสมัครบัญชีใหม่ (register.html)
เมื่อล็อกอินสำเร็จจะนำไปยัง dashboard.html
Register (register.html)
ฟอร์มสมัครบัญชี: ชื่อ-นามสกุล, อีเมล, รหัสผ่าน
ลิงก์กลับไปหน้าเข้าสู่ระบบ (login.html)
เมื่อสมัครสำเร็จจะนำไปยังหน้าเข้าสู่ระบบ
Dashboard (dashboard.html)
แผงควบคุมหลัก — ศูนย์กลางเฝ้าระวังเสียง
แสดงสถานะไมโครโฟนและการรับฟังแบบเรียลไทม์
แถบแจ้งเตือนวิกฤตพร้อมปุ่มส่งความช่วยเหลือ
แสดงระดับเดซิเบล, เหตุการณ์ล่าสุด
สถานะอุปกรณ์ (Node ห้องนั่งเล่น, ครัว, นอกชาน)
อนิเมชัน Waveform เคลื่อนไหวอัตโนมัติ
History (history.html)
ไทม์ไลน์ประวัติเหตุการณ์ แบบสองคอลัมน์
บันทึก: เสียงกระแทก, เสียงไม่รู้จัก, น้ำรั่ว, สัตว์เลี้ยง
ปุ่มกรองตามประเภท: ทั้งหมด / เสียง / การเคลื่อนไหว
ช่องค้นหาเหตุการณ์
Devices (devide.html)
จัดการอุปกรณ์ ESP32 ทั้งหมดในโครงข่าย
แสดงสถานะ: ออนไลน์ / ออฟไลน์ / คำเตือน
ข้อมูล: ความแรงสัญญาณ (dBm), อุณหภูมิ
Sidebar Navigation เชื่อมต่อทุกหน้า
ปุ่มลงทะเบียนอุปกรณ์ใหม่
Settings (setting.html)
หน้าตั้งค่าระบบ
แจ้งเตือนวิกฤตและสถานะอุปกรณ์
แผนที่กิจกรรมตามโซน
ปุ่มตรวจสอบสุขภาพระบบ
ฟีเจอร์ด้านดีไซน์
Lucid Glassmorphism
Glass Card — การ์ดโปร่งแสงเบลอพื้นหลัง (backdrop-filter: blur)
Glass Shimmer — เอฟเฟกต์แสงวาบเมื่อ hover
Glass Reflection — แสงสะท้อนตามตำแหน่งเมาส์
Ambient Orbs — ลูกกลมลอยเรืองแสงในพื้นหลัง
Animations
Page Transitions — เฟดเข้า-ออก เมื่อเปลี่ยนหน้า
Glass Entrance — การ์ดค่อย ๆ ปรากฏพร้อมเบลอ
Scroll Reveal — เนื้อหาเลื่อนขึ้นเมื่อเข้าสู่ viewport
Waveform — แท่งเสียงเคลื่อนไหวสุ่มอัตโนมัติ
Hover Glow — เงาเรืองแสงเมื่อ hover บนการ์ด
Alert Pulse — แถบแจ้งเตือนกระพริบ
การเชื่อมต่อระหว่างหน้า
login.html ←→ register.html
↓ (เข้าสู่ระบบ)
dashboard.html ←→ history.html ←→ devide.html ←→ setting.html
↑**\*\***\_\_\_**\*\***↑**\*\***\_\_\_\_**\*\***↑**\*\***\_\_\_**\*\***↑
(Navigation Bar)
วิธีเปิดใช้งาน
Clone repository
git clone https://github.com/your-username/AI_voice_detection.git
เปิดไฟล์ login.html ในเบราว์เซอร์
ล็อกอินเพื่อเข้าสู่แผงควบคุม
หมายเหตุ: โปรเจคนี้เป็น Frontend เท่านั้น ยังไม่มี Backend ระบบล็อกอินใช้การจำลองการทำงาน (simulate)

เทคโนโลยีที่ใช้
HTML5 — โครงสร้างเว็บ
TailwindCSS — Utility-first CSS framework (CDN)
Vanilla CSS — Custom Lucid Glass Styles + Animations
JavaScript (ES6+) — DOM Manipulation, Intersection Observer, Event Handling
Google Material Symbols — ไอคอน
Google Fonts (Inter) — Typography
