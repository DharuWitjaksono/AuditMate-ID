const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendButton = document.getElementById('send-button');
const welcomeState = document.getElementById('welcome-state');
const toast = document.getElementById('toast');

// Riwayat hanya disimpan selama halaman ini terbuka; tidak dikirim ke penyimpanan permanen.
let conversation = [];
let toastTimer;

const icons = {
  assistant: '<span class="brand-mark mini"><span></span><span></span><span></span></span>',
  user: 'A'
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2500);
}

function formatTime() {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function hideWelcome() {
  if (welcomeState) welcomeState.hidden = true;
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(role, text, options = {}) {
  hideWelcome();
  const row = document.createElement('article');
  row.className = `message-row ${role === 'user' ? 'user' : 'assistant'}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  if (role === 'user') avatar.textContent = 'A';
  else avatar.innerHTML = icons.assistant;

  const main = document.createElement('div');
  main.className = 'message-main';
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const name = document.createElement('span');
  name.textContent = role === 'user' ? 'Anda' : 'AuditMate';
  const time = document.createElement('time');
  time.textContent = formatTime();
  meta.append(name, time);

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (options.error) {
    bubble.classList.add('error-note');
    bubble.textContent = text;
  } else {
    // Teks AI ditampilkan sebagai teks biasa agar konten balasan tidak dieksekusi sebagai HTML.
    bubble.textContent = text;
  }
  main.append(meta, bubble);

  if (role !== 'user' && !options.error) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-button';
    copy.textContent = 'Salin jawaban';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Jawaban berhasil disalin.');
      } catch {
        showToast('Clipboard tidak tersedia di browser ini.');
      }
    });
    actions.append(copy);
    main.append(actions);
  }

  row.append(avatar, main);
  chatBox.append(row);
  scrollToBottom();
  return row;
}

function showTyping() {
  hideWelcome();
  const row = document.createElement('article');
  row.className = 'message-row assistant';
  row.id = 'typing-indicator';
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = icons.assistant;
  const main = document.createElement('div');
  main.className = 'message-main';
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = 'AuditMate sedang menyusun jawaban…';
  const bubble = document.createElement('div');
  bubble.className = 'typing-bubble';
  bubble.innerHTML = '<span></span><span></span><span></span>';
  main.append(meta, bubble);
  row.append(avatar, main);
  chatBox.append(row);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || sendButton.disabled) return;

  appendMessage('user', message);
  conversation.push({ role: 'user', text: message });
  input.value = '';
  resizeInput();
  sendButton.disabled = true;
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Server mengirim respons yang tidak dapat dibaca.');
    }

    if (!response.ok) {
      const serverMessage = typeof data?.error === 'string' ? data.error : `Permintaan gagal (HTTP ${response.status}).`;
      throw new Error(serverMessage);
    }
    if (typeof data?.result !== 'string' || !data.result.trim()) {
      throw new Error('Respons server belum berisi jawaban. Periksa backend /api/chat.');
    }

    conversation.push({ role: 'model', text: data.result });
    removeTyping();
    appendMessage('assistant', data.result);
  } catch (error) {
    // Batalkan giliran yang gagal agar riwayat berikutnya tetap berpasangan.
    if (conversation.at(-1)?.role === 'user' && conversation.at(-1)?.text === message) {
      conversation.pop();
    }
    removeTyping();
    const messageText = error instanceof TypeError
      ? 'Belum dapat terhubung ke server. Pastikan backend AuditMate berjalan di port yang benar, lalu coba lagi.'
      : (error.message || 'Terjadi kesalahan saat memproses pertanyaan.');
    appendMessage('assistant', messageText, { error: true });
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

function resizeInput() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener('input', resizeInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => sendMessage(button.dataset.prompt || ''));
});

function resetChat() {
  if (sendButton.disabled) {
    showToast('Tunggu jawaban selesai sebelum memulai percakapan baru.');
    return;
  }
  conversation = [];
  chatBox.querySelectorAll('.message-row').forEach((node) => node.remove());
  if (welcomeState) welcomeState.hidden = false;
  input.value = '';
  resizeInput();
  input.focus();
  closeMobileMenu();
  showToast('Percakapan baru siap dimulai.');
}

document.getElementById('new-chat').addEventListener('click', resetChat);
document.getElementById('clear-chat').addEventListener('click', resetChat);

function closeMobileMenu() {
  document.body.classList.remove('menu-open');
}

document.getElementById('mobile-menu').addEventListener('click', () => {
  document.body.classList.toggle('menu-open');
});
document.getElementById('mobile-scrim').addEventListener('click', closeMobileMenu);

const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('auditmate-theme');
if (savedTheme === 'dark') document.body.classList.add('dark');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('auditmate-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

const navMessages = {
  panduan: 'Panduan audit akan tersedia pada pengembangan berikutnya. Untuk sekarang, tanyakan topik panduan melalui chat.',
  checklist: 'Checklist dapat dibuat melalui chat. Contoh: “Buatkan checklist audit kas dan setara kas.”'
};
document.querySelectorAll('[data-nav]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.nav;
    if (target === 'chat') {
      closeMobileMenu();
      input.focus();
      return;
    }
    showToast(navMessages[target] || 'Fitur ini belum tersedia.');
    closeMobileMenu();
  });
});

document.getElementById('help-button').addEventListener('click', () => {
  showToast('Ajukan pertanyaan audit melalui kolom chat. Jawaban AI tetap perlu diverifikasi.');
});
document.getElementById('profile-button').addEventListener('click', () => {
  showToast('AuditMate ID · Asisten edukasi akuntansi dan audit.');
});
document.getElementById('insight-menu').addEventListener('click', () => {
  showToast('Pilih salah satu topik di panel ini untuk memulai diskusi.');
});

// Pintasan desktop: Ctrl/Cmd + K untuk percakapan baru.
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    resetChat();
  }
  if (event.key === 'Escape') closeMobileMenu();
});
