# Aku Mw Magang — Praktikum Pemrograman Web Modul 5 (`pweb-react-c01-2026`)

Aplikasi Frontend React untuk membantu Kapten mengelola seluruh proses pencarian magang secara terarah:

1. **Eksplorasi Lowongan** — Menjelajahi lowongan dari Remotive API maupun dataset fallback lokal, menghitung **Skill Match Score (%)** secara langsung, dan menyimpan lowongan ke daftar lamaran.
2. **War Room Lamaran** — Melacak status lamaran dengan aturan *State Machine* yang ketat, nested checklist persiapan, activity log, timer latihan interview, deteksi **Rawan Ghosting (> 14 hari)**, dan peringatan **Bentrok Jadwal Interview (< 60 menit)**.
3. **Offer Comparator** — Membandingkan dua tawaran magang (`OFFER`) secara objektif berdasarkan gaji, mode kerja, dan kecocokan skill.

---

## Tech Stack & Aturan Teknis

- **React 19** + **TypeScript** (`strict: true`, tanpa tipe `any`)
- **Vite** (template `react-ts`)
- **Tailwind CSS v4** + `lucide-react`
- **Tanpa library state/form eksternal** (tidak menggunakan Redux, Zustand, TanStack Query, React Hook Form, maupun Formik). Seluruh state, fetch, form, timer, dan persistensi lokal dibangun dengan React Hooks bawaan & Custom Hooks buatan sendiri.

---

## Cara Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev

# 3. Cek TypeScript (wajib lolos tanpa error)
npx tsc --noEmit

# 4. Cek ESLint
npm run lint

# 5. Build production
npm run build
```

---

## Struktur Folder

```text
pweb-react-c01-2026/
├── public/
│   └── magang-fallback.json     # 15 lowongan magang tech Indonesia (format Remotive API)
└── src/
    ├── components/              # Komponen UI modular
    ├── hooks/                   # Custom Hooks (useLocalStorage<T>, useDebounce<T>)
    ├── services/                # Fetch Remotive API & fallback lokal (jobService.ts)
    ├── types/                   # Interface & union types TypeScript
    │   ├── application.ts       # Application, ApplicationStatus, WorkMode, ChecklistItem, ActivityLog
    │   ├── job.ts               # JobListing, RemotiveApiResponse, JobDataSource
    │   └── index.ts             # Barrel export tipe
    ├── utils/                   # Fungsi murni (pure functions, immutable)
    │   ├── stateMachine.ts      # Aturan transisi status & validasi syarat pindah status
    │   ├── skillMatch.ts        # Hitung Skill Match Score (%), matched/missing skills, cek duplikat skill
    │   ├── scheduleConflict.ts  # Deteksi bentrok jadwal interview (< 60 menit)
    │   ├── applicationHelpers.ts# Anti-duplikat lamaran, deteksi Rawan Ghosting (> 14 hari), Offer Comparator
    │   └── index.ts             # Barrel export helper
    ├── App.tsx
    └── main.tsx
```

---

## Dataset & Sumber API

| Sumber | Alamat / Path | Keterangan |
| :--- | :--- | :--- |
| **Utama (Live API)** | `https://remotive.com/api/remote-jobs?category=software-dev&limit=30` | Gratis, tanpa API key, mendukung CORS. Field `tags` digunakan sebagai `requiredSkills`. |
| **Fallback Lokal** | `/magang-fallback.json` (`public/magang-fallback.json`) | 15 lowongan magang tech Indonesia dengan struktur root `{ "jobs": [...] }` yang identik dengan Remotive API. |

---

## Ringkasan Aturan Main (Diimplementasikan di `src/utils/`)

| Aturan | Implementasi |
| :--- | :--- |
| **Transisi Status Ketat** | `WISHLIST -> APPLIED`; `APPLIED -> SCREENING \| REJECTED \| GHOSTED`; `SCREENING -> INTERVIEW \| REJECTED \| GHOSTED`; `INTERVIEW -> OFFER \| REJECTED \| GHOSTED`; `GHOSTED -> SCREENING`; `OFFER` & `REJECTED` bersifat final (`stateMachine.ts`). |
| **Syarat Pindah Status** | Ke `APPLIED`: wajib `cvVersion` & `appliedDate`. Ke `INTERVIEW`: wajib `interviewDateTime` valid. Ke `OFFER`: wajib `salaryOffer > 0` & `workMode` (`validateStatusTransition`). |
| **Skill Match Score (%)** | `Math.round((jumlahCocok / totalRequired) * 100)`, *case-insensitive*, dengan level `high` (>= 70%), `medium` (40–69%), `low` (< 40%) (`skillMatch.ts`). |
| **Bentrok Jadwal Interview** | Deteksi `>= 2` lamaran berstatus `INTERVIEW` dengan selisih `< 60` menit dari seluruh data (`scheduleConflict.ts`). |
| **Anti-Duplikat Lamaran** | Menolak pasangan `company + role` yang sama tanpa membedakan huruf besar/kecil (`isDuplicateApplication`). |
| **Rawan Ghosting** | Status `APPLIED` atau `SCREENING` yang tidak berubah `> 14` hari (`isGhostingRisk`). |
| **Skor Offer Comparator** | `(Normalisasi Gaji × 50%) + (Skor Mode Kerja × 25%) + (Skill Match % × 25%)`, dengan skor mode: Remote `100`, Hybrid `75`, Onsite `50` (`compareOffers`). |
