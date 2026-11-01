import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const MAX_MESSAGES = 30;
const MAX_TEXT_LENGTH = 8000;

const SYSTEM_INSTRUCTION = `
Anda adalah AuditMate ID, asisten edukasi akuntansi dan audit.

ATURAN UTAMA:
1. Jawab selalu dalam Bahasa Indonesia yang alami, jelas, dan mudah dipahami.
2. Bantu pengguna memahami konsep akuntansi dan audit, istilah, contoh pembelajaran, serta checklist sederhana.
3. Anda adalah asisten edukasi, bukan auditor profesional dan bukan pemberi opini audit resmi atau nasihat hukum/perpajakan.
4. Jangan mengarang standar, peraturan, nomor paragraf, kutipan, nama lembaga, atau referensi.
5. Jika pertanyaan bergantung pada standar atau regulasi tertentu, jelaskan bahwa pengguna perlu memastikan versi dan yurisdiksi yang berlaku. Jangan menyatakan nomor standar atau paragraf jika tidak yakin.
6. Bedakan fakta umum, ilustrasi, dan asumsi. Nyatakan secara terbuka bila informasi tidak cukup atau Anda tidak yakin.
7. Untuk contoh atau checklist, beri label sebagai contoh pembelajaran yang perlu disesuaikan dengan konteks.
8. Jangan mengaku telah membaca dokumen atau sumber yang tidak diberikan di percakapan.
9. Utamakan jawaban ringkas, terstruktur, dan relevan dengan pertanyaan pengguna.
`;

let ai;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'AuditMate ID',
    model: MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post('/api/chat', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: 'API key Gemini belum dikonfigurasi. Isi GEMINI_API_KEY di file .env lalu mulai ulang server.'
    });
  }

  const conversation = req.body?.conversation;
  if (!Array.isArray(conversation) || conversation.length === 0) {
    return res.status(400).json({ error: 'conversation wajib berupa array dan tidak boleh kosong.' });
  }
  if (conversation.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `Percakapan terlalu panjang. Maksimal ${MAX_MESSAGES} pesan per permintaan.` });
  }

  for (let i = 0; i < conversation.length; i += 1) {
    const item = conversation[i];
    if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string' || !item.text.trim()) {
      return res.status(400).json({ error: `Format pesan ke-${i + 1} tidak valid. Setiap pesan harus memiliki role user/model dan text.` });
    }
    if (item.text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `Pesan ke-${i + 1} terlalu panjang. Batas ${MAX_TEXT_LENGTH} karakter.` });
    }
    if (i === 0 && item.role !== 'user') {
      return res.status(400).json({ error: 'Percakapan harus dimulai dengan pesan user.' });
    }
    if (i > 0 && item.role === conversation[i - 1].role) {
      return res.status(400).json({ error: 'Role pesan harus bergantian antara user dan model.' });
    }
  }
  if (conversation[conversation.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Pesan terakhir harus berasal dari user.' });
  }

  const contents = conversation.map(({ role, text }) => ({
    role,
    parts: [{ text: text.trim() }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const result = response.text;
    if (typeof result !== 'string' || !result.trim()) {
      return res.status(502).json({ error: 'Gemini tidak mengembalikan jawaban teks. Silakan coba lagi.' });
    }

    return res.json({ result: result.trim() });
  } catch (error) {
    console.error('Gemini API error:', error?.status || '', error?.message || error);
    const status = Number(error?.status);

    if (status === 429) {
      return res.status(429).json({ error: 'Batas penggunaan Gemini tercapai. Periksa kuota API atau coba lagi nanti.' });
    }
    if (status === 401 || status === 403) {
      return res.status(502).json({ error: 'Gemini menolak autentikasi. Periksa API key dan akses model di Google AI Studio.' });
    }
    if (status === 400) {
      return res.status(502).json({ error: 'Permintaan ke Gemini tidak dapat diproses. Periksa konfigurasi model dan format percakapan.' });
    }
    return res.status(502).json({ error: 'Layanan Gemini sedang gagal dihubungi. Periksa koneksi dan coba lagi.' });
  }
});

// Frontend disajikan dari folder public pada origin yang sama.
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Format JSON request tidak valid.' });
  }
  console.error('Server error:', err);
  return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`AuditMate ID berjalan di http://localhost:${PORT}`);
  console.log(`Model Gemini: ${MODEL}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('PERINGATAN: GEMINI_API_KEY belum diisi. Endpoint chat belum dapat digunakan.');
  }
});
