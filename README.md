# Aku Mw Magang (`pweb-react-c01-2026`)

Laporan dan dokumentasi praktikum Pemrograman Web Modul 5 (Fundamental React dengan TypeScript). Aplikasi ini dibuat untuk membantu Kapten melacak pencarian magang dari awal sampai dapat offer: mencari lowongan dan menghitung kecocokan skill, mencatat status lamaran dengan aturan perpindahan yang ketat, menyiapkan checklist serta latihan interview berwaktu, sampai membandingkan dua offer secara objektif.

## Daftar isi

1. [Cara menjalankan](#cara-menjalankan)
2. [Cara reset dan backup data](#cara-reset-dan-backup-data)
3. [Tech stack dan batasan library](#tech-stack-dan-batasan-library)
4. [Fitur utama](#fitur-utama)
5. [Fitur tambahan](#fitur-tambahan)
6. [Arsitektur dan alur state](#arsitektur-dan-alur-state)
7. [Struktur folder](#struktur-folder)
8. [Skema data dan aturan main](#skema-data-dan-aturan-main)
9. [Sumber data dan API](#sumber-data-dan-api)
10. [Daftar testcase](#daftar-testcase)

## Cara menjalankan

Pastikan Node.js (v20 atau v24 LTS) sudah terpasang di perangkat, lalu jalankan perintah berikut:

```bash
git clone https://github.com/umarhyl/pweb-react-c01-2026.git
cd pweb-react-c01-2026
npm install
npm run dev
```

Setelah server jalan, buka `http://localhost:5173` di browser.

Perintah untuk cek tipe, lint, dan build:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run preview
```

## Cara reset dan backup data

Semua data tersimpan otomatis di `localStorage` browser pada tiga key:

- `aku-mw-magang:applications` untuk daftar lamaran, lampiran CV lokal, checklist, dan riwayat aktivitas.
- `aku-mw-magang:kapten-skills` untuk daftar skill milik Kapten.
- `aku-mw-magang:theme` untuk preferensi tema terang atau gelap.

Kalau ingin mengosongkan data sebelum demo atau pindah perangkat, ada dua cara:

1. Lewat tombol `Backup Data` di navbar atas. Di dalam dialog `BackupDataModal`, pilih `Unduh` untuk export semua lamaran dan skill ke file `aku-mw-magang-backup-YYYY-MM-DD.json`, pilih `Pilih File` untuk import file backup, atau pilih `Reset` untuk mengosongkan lamaran dan mengembalikan daftar skill ke nilai awal (`React`, `TypeScript`, `CSS`, `Git`, `REST API`).
2. Lewat Browser DevTools (`F12`), buka tab Application lalu Local Storage, hapus ketiga key di atas, atau jalankan `localStorage.clear(); location.reload();` di Console.

## Tech stack dan batasan library

Aplikasi dibangun memakai React 19, TypeScript (`strict: true`, `noImplicitAny: true`, tanpa `any`), Vite template `react-ts`, Tailwind CSS v4, font lokal (`Inter`, `W95FA`, `VT323`), ikon pixel-art lokal, dan `lucide-react`.

Sesuai ketentuan modul, proyek ini tidak memakai library state management eksternal (Redux, Zustand, TanStack Query) maupun library form (React Hook Form, Formik). Semua state, fetch API, validasi form, timer, dan penyimpanan lokal ditulis langsung memakai React Hooks bawaan dan custom hooks sendiri.

## Fitur utama

### 1. Profil skill Kapten dan eksplorasi lowongan

Kapten dapat menambah atau menghapus skill miliknya (default awal 5 skill: `React`, `TypeScript`, `CSS`, `Git`, `REST API`). Input kosong dan skill duplikat (case-insensitive) ditolak, dan daftarnya disimpan ke `localStorage`.

Daftar lowongan diambil lewat `useEffect`, `fetch()`, dan `AbortController` di `JobExplorer.tsx` bersama `src/services/jobService.ts`. Tampilan menangani state loading, state error (dengan tombol `Coba Lagi` dan tombol pindah ke fallback lokal), serta state kosong. Kolom pencarian memakai custom hook `useDebounce(keyword, 400)` dan bisa dipadukan dengan filter kategori serta pengurutan berdasarkan Skill Match. Tiap kartu menampilkan skor kecocokan (hijau >= 70%, kuning 40-69%, merah < 40%), pembedaan skill cocok vs missing skill, dan tombol simpan ke Wishlist yang berubah menjadi `Sudah Dilamar` (disabled) jika lowongan sudah ada di daftar lamaran.

### 2. Form tambah lamaran manual

`ApplicationFormModal.tsx` adalah controlled form penuh untuk Perusahaan, Posisi/Role, Mode Kerja (`Remote`, `Hybrid`, `Onsite`), Status Awal (`WISHLIST` atau `APPLIED`), dan Required Skills (dipisah koma). Ketika Status Awal dipilih `APPLIED`, input `cvVersion` dan `appliedDate` muncul otomatis dan wajib diisi. Submit menolak input kosong serta duplikat pasangan `company + role`, lalu memfokuskan kursor ke input pertama yang bermasalah memakai `useRef`.

### 3. War Room pipeline, ghosting, dan bentrok jadwal

`WarRoomPipeline.tsx` menampilkan seluruh lamaran Kapten lengkap dengan status, versi CV, progress checklist (`X/Y`), dan Skill Match %. Filter gabungan mencakup pencarian teks, filter status, toggle `Rawan Ghosting`, dan sorting (`Terbaru`, `Jadwal Interview Terdekat`, `Offer Tertinggi`).

Untuk keperluan pengujian saat demo, setiap lamaran berstatus `APPLIED` atau `SCREENING` memiliki tombol `Simulasi +15 Hari` yang memundurkan `lastUpdatedAt` sebanyak 15 hari agar badge Rawan Ghosting langsung muncul. Jika ada minimal 2 lamaran `INTERVIEW` yang jadwalnya berselisih kurang dari 60 menit, `ConflictBanner.tsx` tampil di bagian atas halaman berdasarkan seluruh data lamaran, tetap muncul meski tab atau filter status lain sedang aktif.

### 4. Detail lamaran: state machine, checklist, dan activity log

`ApplicationDetailModal.tsx` hanya menampilkan tombol status tujuan yang diizinkan oleh `getAllowedNextStatuses()` di `src/utils/stateMachine.ts`. Perpindahan ke `APPLIED`, `INTERVIEW`, dan `OFFER` memunculkan input syarat masing-masing lalu divalidasi dengan `validateStatusTransition()`.

Di dalam modal yang sama terdapat nested checklist (tambah item, centang selesai, hapus item, progress bar `X/Y`) yang seluruh pembaruannya dibuat immutable memakai `map`, `filter`, dan spread operator. Setiap pembuatan lamaran, perpindahan status, simulasi +15 hari, dan catatan manual Kapten langsung tercatat ke `activityLogs[]`.

### 5. Interview prep timer

`InterviewPrepTimer.tsx` menyediakan 6 pertanyaan latihan interview magang IT dengan countdown `02:00` per soal, tombol Mulai/Jeda, Reset, Soal Sebelumnya, dan Lanjut (otomatis reset ke `02:00`). Interval dibersihkan di cleanup `useEffect` (`return () => clearInterval(...)`) agar timer berhenti ketika modal ditutup dan tidak berlipat ganda saat dibuka kembali.

### 6. Undo delete 5 detik dan persistensi localStorage

Menghapus lamaran memunculkan `UndoToast.tsx` selama 5 detik. Jika tombol Undo ditekan sebelum waktu habis, lamaran kembali utuh beserta checklist, lampiran CV, dan activity log-nya. Timer diatur lewat custom hook `useUndoDelete.ts` yang menyimpan ID `setTimeout` dan `setInterval` di `useRef`, sehingga penghapusan dua lamaran berturut-turut dalam kurang dari 5 detik otomatis membatalkan timer sebelumnya memakai `clearTimeout`.

### 7. Dashboard statistik dan Offer Comparator

`StatsDashboard.tsx` menghitung 5 metrik sebagai derived state langsung dari `applications`: Total Lamaran, Response Rate %, Interview Rate %, Rawan Ghosting, dan Offer Diterima.

`OfferComparator.tsx` aktif jika terdapat minimal 2 lamaran berstatus `OFFER`. Kapten dapat memilih Offer A dan Offer B untuk melihat perbandingan uang saku (bobot 50%), mode kerja (bobot 25%), kecocokan skill (bobot 25%), total skor berbobot, dan badge `Rekomendasi Terbaik`. Jika offer masih kurang dari 2, halaman menampilkan empty state dengan tombol kembali ke Pipeline.

## Fitur tambahan

Di luar 7 fitur wajib, aplikasi menambahkan beberapa fitur pendukung tanpa library eksternal:

1. Dark Mode dengan `useLocalStorage` (`aku-mw-magang:theme`), mengubah tema halaman terang/gelap dan tetap tersimpan setelah refresh.
2. Export dan Import backup JSON melalui `BackupDataModal.tsx` dan `src/utils/backupJson.ts`, dilengkapi validasi skema runtime (`unknown` narrowing), penolakan ID atau pasangan `company + role` duplikat, serta tombol Reset data.
3. Keyboard shortcut `/` memakai `useRef` di `JobExplorer.tsx` dan `WarRoomPipeline.tsx` untuk langsung memfokuskan search bar (otomatis nonaktif jika sedang mengetik di input atau ada modal terbuka).
4. Upload, preview, dan unduh file CV lokal (`.pdf`, `.doc`, `.docx`, batas 500 KB) memakai `FileReader` di `src/utils/cvFile.ts`. Nama file otomatis mengisi `cvVersion` dan ikut terbawa saat Export/Import JSON.
5. Pop-up detail lowongan (`JobDetailModal.tsx`) dengan deskripsi posisi, link ke portal asli perusahaan, dan tombol `Catat Applied` untuk prefill form lamaran.
6. Pembaca soal suara pada `InterviewPrepTimer.tsx` memakai Web Speech API (`speechSynthesis`) dan chime waktu habis (`AudioContext`), ikut dihentikan saat modal unmount.

## Arsitektur dan alur state

State utama (`applications`, `kaptenSkills`, `theme`) diletakkan di `src/App.tsx` lalu diturunkan ke komponen anak lewat props dan callback (lifting state up). Tiga custom hook dipakai untuk memisahkan logika yang berulang:

- `useLocalStorage<T>` membaca nilai awal dari `localStorage` secara lazy di `useState` dan menyinkronkannya kembali lewat `useEffect`.
- `useDebounce<T>` menunda perubahan nilai pencarian selama 400ms dengan cleanup `clearTimeout`.
- `useUndoDelete` mengelola timer toast Undo 5 detik memakai `useRef` agar aman saat hapus beruntun dan bersih saat unmount.

Semua angka turunan (Match Score %, bentrok jadwal, status Rawan Ghosting, 5 kartu statistik, dan skor Offer Comparator) dihitung langsung dari state sumber melalui `useMemo` dan fungsi murni di `src/utils/`, tidak disimpan sebagai `useState` terpisah.

## Struktur folder

```text
pweb-react-c01-2026/
├── index.html
├── public/
│   ├── favicon.ico
│   └── magang-fallback.json
└── src/
    ├── assets/
    │   └── retro/
    │       ├── fonts/
    │       ├── icons/
    │       ├── background.jpg
    │       ├── footer-kapten-horizon.jpg
    │       ├── hero-kapten-world.jpg
    │       └── index.ts
    ├── components/
    │   ├── ApplicationDetailModal.tsx
    │   ├── ApplicationFormModal.tsx
    │   ├── BackupDataModal.tsx
    │   ├── ConflictBanner.tsx
    │   ├── InterviewPrepTimer.tsx
    │   ├── JobDetailModal.tsx
    │   ├── JobExplorer.tsx
    │   ├── OfferComparator.tsx
    │   ├── SkillProfile.tsx
    │   ├── StatsDashboard.tsx
    │   ├── UndoToast.tsx
    │   ├── WarRoomPipeline.tsx
    │   └── index.ts
    ├── hooks/
    │   ├── useDebounce.ts
    │   ├── useLocalStorage.ts
    │   ├── useUndoDelete.ts
    │   └── index.ts
    ├── services/
    │   ├── jobService.ts
    │   └── index.ts
    ├── types/
    │   ├── application.ts
    │   ├── job.ts
    │   └── index.ts
    ├── utils/
    │   ├── applicationHelpers.ts
    │   ├── backupJson.ts
    │   ├── cvFile.ts
    │   ├── scheduleConflict.ts
    │   ├── skillMatch.ts
    │   ├── stateMachine.ts
    │   └── index.ts
    ├── App.tsx
    ├── index.css
    └── main.tsx
```

## Skema data dan aturan main

Objek `Application` di `src/types/application.ts` menyimpan `id`, `company`, `role`, `workMode`, `status`, `requiredSkills`, `lastUpdatedAt`, `checklist`, `activityLogs`, serta field opsional `jobUrl`, `cvVersion`, `cvAttachment`, `appliedDate`, `interviewDateTime`, dan `salaryOffer`.

| Aturan | Implementasi di kode |
| :--- | :--- |
| Anti-duplikat lamaran | Pasangan `company + role` sama (case-insensitive) ditolak di `isDuplicateApplication` (`applicationHelpers.ts`). |
| Transisi status ketat | `WISHLIST -> APPLIED`; `APPLIED -> SCREENING \| REJECTED \| GHOSTED`; `SCREENING -> INTERVIEW \| REJECTED \| GHOSTED`; `INTERVIEW -> OFFER \| REJECTED \| GHOSTED`; `GHOSTED -> SCREENING`; `OFFER` dan `REJECTED` final (`stateMachine.ts`). |
| Syarat pindah status | Ke `APPLIED` wajib `cvVersion` & `appliedDate`; ke `INTERVIEW` wajib `interviewDateTime` valid; ke `OFFER` wajib `salaryOffer > 0` & `workMode` (`validateStatusTransition`). |
| Rawan Ghosting | Status `APPLIED` atau `SCREENING` yang tidak berubah > 14 hari (`isGhostingRisk`). |
| Bentrok jadwal interview | Minimal 2 lamaran `INTERVIEW` berselisih < 60 menit dicek dari seluruh data (`findInterviewConflicts`). |
| Skill Match Score (%) | `Math.round((jumlahCocok / totalRequired) * 100)`, case-insensitive (`calculateSkillMatch`). |
| Undo Delete | Toast 5 detik; hapus 2x berturut-turut membersihkan timer lama via `useRef` dan `clearTimeout` (`useUndoDelete.ts`). |
| Skor Offer Comparator | `(Normalisasi Gaji x 50%) + (Skor Mode Kerja x 25%) + (Skill Match % x 25%)`, skor mode Remote 100, Hybrid 75, Onsite 50 (`compareOffers`). |

## Sumber data dan API

| Sumber | Alamat atau file | Keterangan |
| :--- | :--- | :--- |
| Live API | `https://remotive.com/api/remote-jobs?category=software-dev&limit=30` | Endpoint publik tanpa API key; field `tags` dibaca sebagai `requiredSkills`. |
| Fallback lokal | `public/magang-fallback.json` (`/magang-fallback.json`) | 15 lowongan magang tech Indonesia dengan struktur `{ "jobs": [...] }` yang sama dengan Remotive API. |

## Daftar testcase

| No | Skenario | Hasil yang diverifikasi |
| :--- | :--- | :--- |
| 1 | Fetch & Offline Error | State loading muncul lalu lowongan tampil; saat DevTools Offline dan klik Coba Lagi, pesan error dan tombol Fallback Lokal muncul. |
| 2 | Skill Match Live | Tambah skill `Docker` di Profil Kapten langsung menaikkan skor Match lowongan yang meminta Docker. |
| 3 | Debounce Search | Ketik cepat di pencarian hanya menyaring setelah jeda sekitar 400ms; shortcut `/` langsung memfokuskan search bar. |
| 4 | Anti-Duplikat & Focus | Simpan 1 lowongan mengubah tombol menjadi `Sudah Dilamar`; input `company + role` sama di Form Manual ditolak dan fokus otomatis via `useRef`. |
| 5 | State Machine | Alur `WISHLIST -> APPLIED -> SCREENING -> INTERVIEW -> OFFER` berjalan sesuai syarat field; `WISHLIST` tidak bisa langsung ke `OFFER`. |
| 6 | Simulasi Ghosting | Klik `Simulasi +15 Hari` pada status `APPLIED`/`SCREENING` memunculkan badge Rawan Ghosting dan menaikkan kartu statistik. |
| 7 | Bentrok Interview | 2 lamaran `INTERVIEW` berselisih 30 menit menampilkan Banner Bentrok di atas halaman meski filter status lain dipilih. |
| 8 | Checklist & Refresh | Tambah 2 checklist dan centang 1 (`1/2`), lalu refresh (`F5`), semua data tetap utuh di `localStorage`. |
| 9 | Timer Cleanup | Mulai Interview Prep Timer lalu tutup dan buka lagi modal; tidak ada error console dan hitungan detik tetap normal. |
| 10 | Undo & Comparator | Hapus 1 lamaran lalu klik Undo < 5 detik mengembalikan data utuh; 2 lamaran `OFFER` dibandingkan otomatis di Offer Comparator. |
