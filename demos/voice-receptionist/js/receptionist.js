/* voice-receptionist FIX-VOICE1 — neural pre-recorded WAV/MP3 + smart speechSynthesis fallback */
const HOURS = ["Thu 10:00", "Thu 11:30", "Thu 15:00", "Fri 09:30", "Fri 14:00"];
let slots = Object.fromEntries(HOURS.map((h) => [h, true]));

const BOOKED_AUDIO = {
  "Thu 10:00": "audio/booked_thu_1000.mp3",
  "Thu 11:30": "audio/booked_thu_1130.mp3",
  "Thu 15:00": "audio/booked_thu_1500.mp3",
  "Fri 09:30": "audio/booked_fri_0930.mp3",
  "Fri 14:00": "audio/booked_fri_1400.mp3",
};

const LINE_AUDIO = {
  greet: "audio/greet.mp3",
  hours: "audio/hours.mp3",
  cancel: "audio/cancel.mp3",
  fallback: "audio/fallback.mp3",
  no_slots_Thu: "audio/no_slots_thu.mp3",
  no_slots_Fri: "audio/no_slots_fri.mp3",
};

let currentAudio = null;
let bestVoice = null;

function pickBestVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const prefer = /natural|neural|google|premium|enhanced|samantha|ava|jenny|emma|michelle|aria|guy|sara/i;
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : voices;
  return pool.find((v) => prefer.test(v.name)) || pool.find((v) => /en-US/i.test(v.lang)) || pool[0];
}

function refreshVoice() {
  bestVoice = pickBestVoice();
}

if ("speechSynthesis" in window) {
  refreshVoice();
  speechSynthesis.onvoiceschanged = refreshVoice;
}

function speakFallback(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1.05;
  if (!bestVoice) refreshVoice();
  if (bestVoice) u.voice = bestVoice;
  u.lang = (bestVoice && bestVoice.lang) || "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function speakLine(key, fallbackText) {
  if (currentAudio) {
    try { currentAudio.pause(); } catch (_) {}
    currentAudio = null;
  }
  if ("speechSynthesis" in window) speechSynthesis.cancel();

  const src = LINE_AUDIO[key] || BOOKED_AUDIO[key];
  if (!src) {
    speakFallback(fallbackText);
    return;
  }
  const audio = new Audio(src);
  currentAudio = audio;
  audio.onerror = () => speakFallback(fallbackText);
  audio.play().catch(() => speakFallback(fallbackText));
}

function parseIntent(text) {
  const t = (text || "").toLowerCase();
  if (/hello|hi|bonjour|hey/.test(t)) return { type: "greet" };
  if (/cancel|annul/.test(t)) return { type: "cancel" };
  if (/hour|open|horaire/.test(t)) return { type: "hours" };
  if (/appoint|rdv|book|reserv|jeudi|thursday|vendredi|friday|slot|rendez/.test(t)) {
    let day = /fri|vendredi/.test(t) ? "Fri" : "Thu";
    const available = HOURS.filter((h) => h.startsWith(day) && slots[h]);
    return { type: "book", day, available };
  }
  return { type: "fallback" };
}

function handle(text) {
  const intent = parseIntent(text);
  let reply = "";
  let lineKey = "fallback";
  let booked = null;
  if (intent.type === "greet") {
    reply = "Hello! I can book a demo appointment. Try: I want a slot on Thursday.";
    lineKey = "greet";
  } else if (intent.type === "hours") {
    reply = "We are open Monday to Friday, 9 to 18, Europe/Madrid.";
    lineKey = "hours";
  } else if (intent.type === "book") {
    if (!intent.available.length) {
      reply = `No free slots left on ${intent.day}. Try another day.`;
      lineKey = "no_slots_" + intent.day;
    } else {
      booked = intent.available[0];
      slots[booked] = false;
      reply = `Booked ${booked} for you. You'll get a calendar note in this demo board.`;
      lineKey = booked; // maps via BOOKED_AUDIO
    }
  } else if (intent.type === "cancel") {
    reply = "Tell me which time to free, or refresh the page to reset the demo board.";
    lineKey = "cancel";
  } else {
    reply = "I can help with appointments. Say: book Thursday, or ask for opening hours.";
    lineKey = "fallback";
  }
  return { reply, lineKey, booked, slots: { ...slots } };
}

function renderBoard() {
  const el = document.getElementById("board");
  el.innerHTML = HOURS.map((h) => `<div class="slot ${slots[h] ? "free" : "busy"}">${h} · ${slots[h] ? "free" : "booked"}</div>`).join("");
}

function addChat(role, text) {
  const c = document.getElementById("chat");
  const d = document.createElement("div");
  d.className = "bubble " + role;
  d.textContent = text;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function runText(text) {
  addChat("user", text);
  const { reply, lineKey, booked } = handle(text);
  addChat("bot", reply);
  speakLine(lineKey, reply);
  renderBoard();
  if (booked) {
    const log = document.getElementById("log");
    log.textContent = `Calendar demo: added "${booked}" (local only, not a real calendar).`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderBoard();
  document.getElementById("send").onclick = () => {
    const v = document.getElementById("q").value.trim();
    if (!v) return;
    document.getElementById("q").value = "";
    runText(v);
  };
  document.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => runText(b.dataset.say)));
  const mic = document.getElementById("mic");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    mic.disabled = true;
    mic.title = "Speech recognition not supported — use Chrome/Edge or type";
    document.getElementById("micHint").textContent = "Voice input needs Chrome/Edge. Text mode works everywhere.";
  } else {
    const rec = new SR();
    rec.lang = "en-US";
    rec.onresult = (e) => runText(e.results[0][0].transcript);
    mic.onclick = () => {
      rec.start();
      mic.textContent = "Listening…";
      setTimeout(() => (mic.textContent = "🎤 Speak"), 4000);
    };
  }
  runText("hello");
});
