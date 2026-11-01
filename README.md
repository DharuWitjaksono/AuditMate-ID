# AuditMate ID

Chatbot edukasi akuntansi dan audit menggunakan Node.js, Express, dan Gemini API. Frontend berada di folder `public/` dan disajikan oleh Express.

## Desain UI

Versi UI ini menggunakan pendekatan Apple-inspired yang lebih tenang dan fungsional: tipografi system-native, sidebar translucent, toolbar minimal, aksen biru, permukaan putih/abu netral, hierarki informasi yang lebih jelas, dan panel pendamping yang sederhana. Pada perangkat Apple, font stack akan memprioritaskan SF Pro jika tersedia; pada perangkat lain akan memakai system UI font setempat.

Desain ini bukan salinan antarmuka resmi Apple. UI tetap berbasis HTML, CSS, dan JavaScript biasa.

## 1. Persiapan

Pastikan Node.js 20 atau lebih baru sudah terpasang. Buka terminal Git Bash di folder proyek.

```bash
npm install
cp .env.example .env
```

Buka file `.env`, lalu isi `GEMINI_API_KEY` dengan API key baru dari Google AI Studio. Jangan mengirim API key ke chat, jangan menaruhnya di folder `public`, dan jangan mengunggah file `.env` ke GitHub.

```env
GEMINI_API_KEY=API_KEY_BARU_MILIK_ANDA
GEMINI_MODEL=gemini-3.5-flash
PORT=3000
```

## 2. Jalankan aplikasi

```bash
npm run dev
```

Buka browser ke `http://localhost:3000`.

## 3. Uji backend dengan Postman

Import file `postman/AuditMate-ID-Backend.postman_collection.json` ke Postman.

Urutan pengujian:
1. `Health Check` — seharusnya HTTP 200 dan `apiKeyConfigured: true`.
2. `Chat - Single Message` — seharusnya HTTP 200 dengan properti `result` berisi jawaban.
3. `Chat - Invalid Body` — seharusnya HTTP 400.

Contoh request:

```json
{
  "conversation": [
    { "role": "user", "text": "Apa perbedaan audit internal dan audit eksternal?" }
  ]
}
```

Contoh bentuk response sukses:

```json
{ "result": "...jawaban AuditMate ID..." }
```

## 4. Struktur proyek

```text
AuditMate_ID_Project/
├── index.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── postman/
│   └── AuditMate-ID-Backend.postman_collection.json
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Catatan

- UI redesign hanya mengubah `public/index.html` dan `public/style.css`; perilaku chat pada `public/script.js` serta kontrak backend `/api/chat` dipertahankan.
- Riwayat percakapan disimpan sementara di browser selama halaman masih terbuka; belum menggunakan database.
- API key hanya dibaca backend dari `.env`.
- Aplikasi ini prototipe edukasi lokal. Jangan mempublikasikan endpoint tanpa menambahkan autentikasi, pembatasan penggunaan, dan perlindungan operasional yang sesuai.
- Jawaban AI bukan opini audit resmi. Verifikasi standar, regulasi, dan rujukan primer sebelum digunakan untuk keputusan profesional.
- `generateContent` dipakai untuk mempertahankan alur dan payload dari materi kelas. Migrasi API dapat dilakukan setelah tugas dikumpulkan.
