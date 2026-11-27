# Aku Mw Kelar - Praktikum Pemrograman Web Modul 5 (`pweb-react-c01-2026`)

Aplikasi Frontend React untuk membantu Kapten mengelola seluruh proses pencarian magang secara terarah, mulai dari eksplorasi lowongan, pelacakan pipeline lamaran, latihan interview berwaktu, hingga perbandingan offer.

---

## Cara Menjalankan Project

Pastikan **Node.js (v20/v24 LTS)** sudah terpasang, lalu jalankan perintah berikut di dalam folder `pweb-react-c01-2026`:

```bash
# 1. Clone repository
git clone https://github.com/umarhyl/pweb-react-c01-2026.git
cd pweb-react-c01-2026

# 2. Install dependencies
npm install

# 3. Jalankan development server (buka http://localhost:5173)
npm run dev
```

### Perintah Validasi & Build

```bash
# Cek TypeScript strict mode (wajib lolos tanpa error)
npx tsc --noEmit

# Cek ESLint
npm run lint

# Build production ke folder dist/
npm run build

# Preview hasil build production secara lokal
npm run preview
```

### Cara Reset & Backup Data (`localStorage`)

Aplikasi menyimpan data secara otomatis di `localStorage` dengan key:
- `aku-mw-magang:applications` (daftar seluruh lamaran, lampiran CV lokal, checklist, dan activity log)
- `aku-mw-magang:kapten-skills` (daftar skill Kapten)

Untuk me-reset atau mencadangkan data (misalnya sebelum demo ulang):
1. **Lewat tombol `Backup Data` di navbar atas (paling cepat)**: buka jendela **Backup & Kelola Data** (`BackupDataModal`) untuk memilih:
   - **Unduh (Export JSON)**: mengunduh seluruh lamaran & profil skill sebagai file `aku-mw-magang-backup-YYYY-MM-DD.json`.
   - **Pilih File (Import JSON)**: memulihkan data dari file backup `.json` dengan validasi skema runtime ketat (menolak JSON rusak, status tidak sah, ID duplikat, dan pasangan `company + role` duplikat).
   - **Reset**: mengosongkan seluruh lamaran & mengembalikan skill Kapten ke default (`React, TypeScript, CSS, Git, REST API`) setelah konfirmasi.
2. **Lewat Browser DevTools**: buka `F12` -> tab **Application** -> **Local Storage** -> hapus key `aku-mw-magang:applications` & `aku-mw-magang:kapten-skills` (atau jalankan `localStorage.clear(); location.reload();` di Console).

---

## Fitur Nilai Tambahan (Bonus)

Tanpa melanggar aturan library (tanpa Redux, Zustand, TanStack Query, React Hook Form, maupun Formik), kelompok kami menambahkan fitur bonus yang relevan untuk alur kerja Kapten dan demo praktikum:

1. **Export / Import Backup JSON + Reset Data (`src/utils/backupJson.ts`, `src/components/BackupDataModal.tsx`)**:
   - Export dan Import seluruh state `applications` (termasuk `checklist`, `activityLogs`, `jobUrl`, & `cvAttachment`) dan `kaptenSkills` memakai `Blob` dan `FileReader` bawaan browser dengan validasi runtime ketat (`unknown` narrowing, tanpa `any`).
2. **Keyboard Shortcut `/` Fokus Search Bar via `useRef`**:
   - Menekan tombol **`/`** (ketika tidak sedang mengetik di input dan tidak ada modal terbuka) langsung memfokuskan kolom pencarian di tab **Eksplorasi** (`JobExplorer.tsx`) maupun tab **War Room** (`WarRoomPipeline.tsx`) dengan cleanup `removeEventListener` di `useEffect`.
3. **Upload, Preview & Unduh File CV Lokal (`src/utils/cvFile.ts`)**:
   - Di Form Tambah Lamaran Manual (`APPLIED`) dan transisi status ke `APPLIED`, Kapten bisa mengunggah file CV lokal (`.pdf`, `.doc`, `.docx`, maks. 500 KB) memakai `FileReader`. Nama file otomatis mengisi `cvVersion`, tersimpan di `localStorage`, ikut ter-backup di Export/Import JSON, serta dilengkapi tombol **Preview** & **Unduh** di Detail Lamaran.
4. **Pop-up Detail Lowongan, Quick Apply & Voice Interview Reader**:
   - `JobDetailModal` menampilkan deskripsi posisi, analisis kecocokan skill, link portal asli perusahaan, dan aksi cepat **Catat Applied** yang otomatis mem-prefill form lamaran.
   - `InterviewPrepTimer` dilengkapi pembacaan soal otomatis memakai Web Speech API (`speechSynthesis`) + chime akhir waktu (`AudioContext`) yang ikut dibersihkan saat panel ditutup (unmount).

---

## Ringkasan 7 Fitur Utama

1. **Profil Skill Kapten & Eksplorasi Lowongan**:
   - Manajemen daftar skill Kapten (default 5 skill: `React`, `TypeScript`, `CSS`, `Git`, `REST API`), menolak skill duplikat, dan tersimpan di `localStorage`.
   - Pengambilan data lowongan dengan `useEffect` + `fetch()` + `AbortController`, lengkap dengan state Loading, Error (tombol Coba Lagi & Fallback Lokal), dan Empty state.
   - Pencarian dengan Custom Hook `useDebounce(keyword, 400)`, filter kategori, dan pengurutan berdasarkan Skill Match tertinggi/terendah.
   - Badge Match Score (%) (hijau >= 70%, kuning 40-69%, merah < 40%), pembedaan skill cocok vs missing skill, dan tombol Simpan ke Wishlist yang otomatis disabled bertuliskan `"Sudah Dilamar"` jika sudah ada di pipeline.
2. **Form Tambah Lamaran Manual**:
   - Controlled form penuh (`value` + `onChange`) untuk Perusahaan, Posisi/Role, Mode Kerja (`Remote`/`Hybrid`/`Onsite`), Status Awal (`WISHLIST`/`APPLIED`), dan Required Skills (dipisah koma).
   - Input kondisional `cvVersion` dan `appliedDate` muncul dan wajib diisi saat Status Awal = `APPLIED`.
   - Validasi input kosong & anti-duplikat (`company + role`, case-insensitive) dengan auto-focus ke input pertama yang error memakai `useRef`.
3. **War Room Pipeline, Ghosting & Bentrok Jadwal**:
   - Menampilkan kartu lamaran beserta status, versi CV, progress checklist (`X/Y`), dan Skill Match %.
   - Filter gabungan: pencarian teks, filter status, toggle `"Rawan Ghosting"`, dan sorting (`Terbaru`, `Jadwal Interview Terdekat`, `Offer Tertinggi`).
   - Tombol `"Simulasi +15 Hari"` pada status `APPLIED`/`SCREENING` untuk memundurkan `lastUpdatedAt` 15 hari saat uji demo.
   - Banner Peringatan Bentrok Jadwal global di bagian atas halaman jika ada >= 2 lamaran `INTERVIEW` berselisih < 60 menit (dihitung dari seluruh data meskipun filter/tab lain sedang aktif).
4. **Detail Lamaran (State Machine, Nested Checklist & Activity Log)**:
   - Transisi status ketat mengikuti Diagram State Machine dengan input kondisional saat pindah ke `APPLIED`, `INTERVIEW`, dan `OFFER`.
   - Nested checklist (tambah, centang selesai, hapus) lengkap dengan progress bar dan update secara immutable.
   - Riwayat aktivitas (`activityLogs[]`) yang tercatat otomatis saat pembuatan/perpindahan status serta form catatan manual Kapten.
5. **Interview Prep Timer**:
   - 6 pertanyaan latihan interview magang IT di dalam detail lamaran.
   - Countdown timer `02:00` per soal dengan tombol Mulai/Jeda, Reset, Soal Sebelumnya, dan Lanjut (otomatis reset ke `02:00`).
   - Cleanup `useEffect` dengan `return () => clearInterval(...)` agar timer berhenti bersih saat modal ditutup (unmount).
6. **Undo Delete (5 Detik) & Persistensi Local Storage**:
   - Toast Undo selama 5 detik saat lamaran dihapus, mengembalikan data utuh beserta checklist dan activity log.
   - Manajemen timer memakai `useRef` dan `clearTimeout` agar penghapusan beruntun dalam < 5 detik membersihkan timer sebelumnya.
   - Seluruh state `applications` dan `kaptenSkills` disimpan memakai Custom Hook `useLocalStorage<T>`.
7. **Dashboard Statistik & Offer Comparator**:
   - 5 kartu statistik yang dihitung sebagai derived state: Total Lamaran, Response Rate %, Interview Rate %, Rawan Ghosting, dan Offer Diterima.
   - Offer Comparator untuk membandingkan 2 lamaran berstatus `OFFER` (Offer A vs Offer B) berdasarkan bobot Uang Saku 50%, Mode Kerja 25%, dan Kecocokan Skill 25% beserta badge `"Rekomendasi Terbaik"`.

---

## Tech Stack & Aturan Teknis

- **React 19** + **TypeScript** (`strict: true`, tanpa tipe `any`)
- **Vite** (template `react-ts`)
- **Tailwind CSS v4** + font lokal (`Inter`, `W95FA`, `VT323`) + aset ikon pixel-art lokal + `lucide-react`
- **Tanpa library state/form eksternal** (tidak menggunakan Redux, Zustand, TanStack Query, React Hook Form, maupun Formik). Seluruh state, fetch, form, timer, dan penyimpanan lokal ditulis dengan React Hooks bawaan dan Custom Hooks buatan sendiri.

---

## Struktur Folder

```text
pweb-react-c01-2026/
├── index.html
├── public/
│   ├── favicon.ico                    # Favicon aplikasi
│   └── magang-fallback.json           # 15 lowongan magang tech Indonesia (format Remotive API)
└── src/
    ├── assets/
    │   └── retro/                     # Wallpaper, ilustrasi hero/footer, font lokal, & 19 ikon pixel-art
    ├── components/
    │   ├── ApplicationDetailModal.tsx # Fitur 4 & 5: State Machine, Checklist, Activity Log, Prep Timer
    │   ├── ApplicationFormModal.tsx   # Fitur 2: Form manual terkontrol + auto-focus useRef + upload CV
    │   ├── BackupDataModal.tsx        # Bonus: Dialog Export/Import JSON & Reset data
    │   ├── ConflictBanner.tsx         # Fitur 3: Banner peringatan bentrok jadwal interview
    │   ├── InterviewPrepTimer.tsx     # Fitur 5: Timer 02:00 + cleanup + Web Speech Reader
    │   ├── JobDetailModal.tsx         # Bonus: Pop-up detail lowongan & Quick Apply
    │   ├── JobExplorer.tsx            # Fitur 1: Fetch AbortController, debounce search, filter & sort
    │   ├── OfferComparator.tsx        # Fitur 7: Perbandingan 2 Offer berbobot
    │   ├── SkillProfile.tsx           # Fitur 1: Manajemen skill Kapten & switch sumber data
    │   ├── StatsDashboard.tsx         # Fitur 7: 5 kartu statistik (derived state)
    │   ├── UndoToast.tsx              # Fitur 6: Notifikasi Undo Delete 5 detik
    │   ├── WarRoomPipeline.tsx        # Fitur 3: Pipeline lamaran, filter gabungan & Simulasi +15 Hari
    │   └── index.ts                   # Barrel export komponen
    ├── hooks/
    │   ├── useDebounce.ts             # Custom Hook debounce (400ms)
    │   ├── useLocalStorage.ts         # Custom Hook persistensi localStorage generik
    │   ├── useUndoDelete.ts           # Custom Hook timer Undo Delete berbasis useRef
    │   └── index.ts                   # Barrel export hooks
    ├── services/
    │   ├── jobService.ts              # Fetch Remotive Live API & fallback lokal dengan AbortSignal
    │   └── index.ts                   # Barrel export services
    ├── types/
    │   ├── application.ts             # Application, ApplicationStatus, WorkMode, ChecklistItem, ActivityLog, CvAttachment
    │   ├── job.ts                     # JobListing, RemotiveApiResponse, JobDataSource
    │   └── index.ts                   # Barrel export tipe
    ├── utils/
    │   ├── stateMachine.ts            # Aturan transisi status & validasi syarat pindah status
    │   ├── skillMatch.ts              # Hitung Skill Match Score (%), matched/missing skills, duplikat skill
    │   ├── scheduleConflict.ts        # Deteksi bentrok jadwal interview (< 60 menit)
    │   ├── applicationHelpers.ts      # Anti-duplikat lamaran, Rawan Ghosting (> 14 hari), Offer Comparator
    │   ├── backupJson.ts              # Bonus: Export & validasi Import backup JSON
    │   ├── cvFile.ts                  # Bonus: Validasi, baca, & preview file CV lokal (FileReader)
    │   └── index.ts                   # Barrel export helper
    ├── App.tsx                        # Komponen utama, navigasi tab, & state terpusat
    ├── index.css                      # Token tema & Tailwind CSS v4
    └── main.tsx
```

---

## Dataset & Sumber API

| Sumber | Alamat / Path | Keterangan |
| :--- | :--- | :--- |
| **Utama (Live API)** | `https://remotive.com/api/remote-jobs?category=software-dev&limit=30` | Gratis, tanpa API key, mendukung CORS. Field `tags` digunakan sebagai `requiredSkills`. |
| **Fallback Lokal** | `/magang-fallback.json` (`public/magang-fallback.json`) | 15 lowongan magang tech Indonesia dengan struktur root `{ "jobs": [...] }` yang sama dengan Remotive API. |

---

## Ringkasan Aturan Main

| Aturan | Ketentuan & Implementasi |
| :--- | :--- |
| **Anti-Duplikat Lamaran** | Pasangan `company + role` yang sama (case-insensitive) ditolak di Eksplorasi, Form Manual, maupun Import JSON (`isDuplicateApplication`). |
| **Transisi Status Ketat** | `WISHLIST -> APPLIED`; `APPLIED -> SCREENING \| REJECTED \| GHOSTED`; `SCREENING -> INTERVIEW \| REJECTED \| GHOSTED`; `INTERVIEW -> OFFER \| REJECTED \| GHOSTED`; `GHOSTED -> SCREENING`; `OFFER` dan `REJECTED` bersifat final (`stateMachine.ts`). |
| **Syarat Pindah Status** | Ke `APPLIED`: wajib `cvVersion` & `appliedDate`. Ke `INTERVIEW`: wajib `interviewDateTime` valid. Ke `OFFER`: wajib `salaryOffer > 0` & `workMode` (`validateStatusTransition`). |
| **Rawan Ghosting** | Status `APPLIED` atau `SCREENING` yang tidak berubah > 14 hari otomatis menampilkan badge Rawan Ghosting sebagai derived state (`isGhostingRisk`). |
| **Bentrok Jadwal Interview** | >= 2 lamaran berstatus `INTERVIEW` yang berselisih < 60 menit memunculkan banner bentrok dari seluruh data (`findInterviewConflicts`). |
| **Skill Match Score (%)** | `Math.round((jumlahCocok / totalRequired) * 100)`, case-insensitive, dengan kategori hijau (>= 70%), kuning (40-69%), dan merah (< 40%) (`calculateSkillMatch`). |
| **Undo Delete (5 Detik)** | Menghapus lamaran memunculkan toast Undo 5 detik; penghapusan beruntun membersihkan timer lama melalui `useRef` + `clearTimeout` (`useUndoDelete`). |
| **Skor Offer Comparator** | `(Normalisasi Gaji x 50%) + (Skor Mode Kerja x 25%) + (Skill Match % x 25%)`, dengan skor mode: Remote `100`, Hybrid `75`, Onsite `50` (`compareOffers`). |

---

## Daftar Testcase Verifikasi

1. **Fetch & Offline Error**: Loading tampil lalu daftar lowongan muncul; saat DevTools Offline dan klik Coba Lagi, pesan error + tombol Fallback Lokal muncul.
2. **Skill Match Live**: Menambah skill `"Docker"` di Profil Kapten langsung menaikkan persentase Match lowongan yang meminta Docker.
3. **Debounce Search**: Mengetik cepat di kolom pencarian hanya menyaring setelah jeda ~400ms (plus shortcut `/` fokus ke search bar).
4. **Anti-Duplikat & Auto-Focus**: Lowongan tersimpan berubah menjadi `"Sudah Dilamar"`; input `company + role` sama di Form Manual ditolak dengan fokus otomatis via `useRef`.
5. **State Machine**: Alur `WISHLIST -> APPLIED -> SCREENING -> INTERVIEW -> OFFER` berjalan sesuai syarat field; `WISHLIST` tidak bisa langsung ke `OFFER`.
6. **Simulasi Ghosting**: Klik `"Simulasi +15 Hari"` pada status `APPLIED`/`SCREENING` memunculkan badge Rawan Ghosting dan menambah angka statistik.
7. **Bentrok Interview**: 2 lamaran `INTERVIEW` berselisih 30 menit menampilkan Banner Bentrok secara global meski filter status lain aktif.
8. **Checklist & Refresh**: Menambah 2 checklist dan mencentang 1 (`1/2`) tetap utuh setelah refresh halaman (`F5`).
9. **Timer Cleanup**: Menjalankan Interview Prep Timer lalu menutup dan membuka ulang modal tidak menimbulkan error console dan hitungan detik tetap normal.
10. **Undo & Offer Comparator**: Menghapus lamaran lalu klik Undo < 5 detik mengembalikan data utuh; memindahkan 2 lamaran ke `OFFER` menampilkan skor berbobot di Offer Comparator.
