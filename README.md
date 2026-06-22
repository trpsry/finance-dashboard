# FinanceDashboard

Mobile-first finance dashboard split into:

- `frontend/` - React + Vite standalone web app for GitHub Pages
- `code.gs` - Google Apps Script backend API and legacy HTML-service backend
- `index.html` - legacy GAS UI kept for compatibility

## Backend ที่ใช้อยู่

- GAS Web App: https://script.google.com/macros/s/AKfycbxrmUfdb-eYY-m6vHJqvgKPGKETbhEPnntrzOXbAlWpIpJ_3LQhrbxEfBdOQAWYyLsM/exec
- Google Sheet DB: https://docs.google.com/spreadsheets/d/1UJCOHcxXriobWl-IvbdruR0sbd9SszNohaCddxbLM7c/edit

โครงชีตหลัก:

- `Transactions` - รายจ่ายที่บันทึกจากช่อง all-in-one
- `MonthlyIncome` - รายรับจริงรายเดือน
- `DebtSchedule` - ยอดหนี้ ShopeePay, ShopeecrAsh, กสิกร
- `Categories` - หมวดรายจ่ายที่ frontend อ่านไปทำ chips/dropdown
- `FixedExpenses` - ค่าใช้จ่ายคงที่ที่ใช้คำนวณสรุป
- `Settings` - ค่า config เช่น รายรับประมาณการ, timezone, payday

## ใช้งาน frontend ในเครื่อง

```bash
cd frontend
npm install
npm run dev
```

แอปตั้งค่า GAS Web App URL ตัวล่าสุดไว้แล้ว ถ้าต้องการเปลี่ยนให้เปิดหน้า `ตั้งค่า` ในเว็บ

## ตั้งค่า GAS backend

1. เปิด Apps Script project เดิมของ FinanceDashboard
2. อัปเดต `code.gs` จากไฟล์นี้
3. Deploy เป็น Web App
4. ตั้งค่า execution เป็น `Me` และ access เป็น `Anyone`
5. คัดลอก Web App URL ที่ลงท้าย `/exec`
6. เปิดหน้า frontend แล้วไปที่ `ตั้งค่า` เพื่อกรอก URL

อย่าใส่ secret หรือ token จริงใน frontend เพราะ GitHub Pages เป็น static public web ได้ ถึง repo จะ private ก็ตาม

## GitHub Pages

Workflow อยู่ที่ `.github/workflows/pages.yml` และจะ:

1. ติดตั้ง dependency ใน `frontend`
2. รัน test
3. build Vite
4. deploy `frontend/dist` ไป GitHub Pages

ใน GitHub repository ให้ตั้งค่า Pages source เป็น GitHub Actions

## Commands

```bash
cd frontend
npm test -- --run
npm run build
```

ตรวจ syntax `code.gs` ในเครื่อง:

```bash
node -e "const fs=require('fs'),vm=require('vm'); new vm.Script(fs.readFileSync('code.gs','utf8')); console.log('code.gs script OK');"
```
