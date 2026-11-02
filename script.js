function $(id) { return document.getElementById(id); }

/* ---------- Supabase ---------- */
const SUPABASE_URL = "https://uhnldxkigrfefrkdfcbb.supabase.co";
const SUPABASE_KEY = "sb_publishable_RVYOTMyzJJVVsFHuXSdExQ_u-UZS_pj";

let sb = null;
try {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  sb = null;
}

// If already logged in, go straight to the dashboard
if (sb) {
  sb.auth.getSession().then(function (res) {
    if (res.data && res.data.session) {
      window.location.href = "dashboard.html";
    }
  });
}

/* ---------- Sound (made in code, no file needed) ---------- */
let audioCtx;

function playClick(on) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(on ? 1800 : 1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    const len = Math.floor(audioCtx.sampleRate * 0.05);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.value = 0.3;
    noise.connect(ng);
    ng.connect(audioCtx.destination);
    noise.start(t);

    if (on) {
      const o2 = audioCtx.createOscillator();
      const g2 = audioCtx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(660, t + 0.08);
      g2.gain.setValueAtTime(0.0001, t + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.12, t + 0.13);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o2.connect(g2);
      g2.connect(audioCtx.destination);
      o2.start(t + 0.08);
      o2.stop(t + 0.65);
    }
  } catch (e) {}
}

/* ---------- Lamp ---------- */
let isOn = false;

function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function toggleLamp() {
  isOn = !isOn;
  document.body.classList.toggle("lit", isOn);

  const hint = $("hint");
  hint.textContent = isOn
    ? "Light is on ✨ Fill in your details"
    : "Tap the lamp to switch on the light 💡";
  hint.classList.toggle("on", isOn);

  restart($("cord"), "swing");
  restart($("lamp"), "sway");
  playClick(isOn);
  if (navigator.vibrate) navigator.vibrate(25);
}

/* ---------- Form helpers ---------- */
function showMsg(text, type) {
  const m = $("msg");
  m.textContent = text;
  m.className = "msg " + type;
}

function clearMsg() {
  const m = $("msg");
  m.textContent = "";
  m.className = "msg";
}

function showTab(tab) {
  const isLogin = tab === "login";
  $("loginForm").classList.toggle("hidden", !isLogin);
  $("registerForm").classList.toggle("hidden", isLogin);
  $("tabLogin").classList.toggle("active", isLogin);
  $("tabRegister").classList.toggle("active", !isLogin);
  $("tabs").classList.toggle("right", !isLogin);
  clearMsg();
}

function togglePw(id, btn) {
  const input = $(id);
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "🙈" : "👁️";
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function fail(text) {
  showMsg(text, "error");
  restart(document.querySelector(".card"), "shake");
}

function setLoading(btn, loading, text) {
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.textContent = text;
    btn.classList.add("loading");
  } else {
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.classList.remove("loading");
  }
}

function friendlyError(error) {
  const m = (error && error.message) ? error.message : "Something went wrong.";
  if (m.indexOf("Invalid login credentials") !== -1) return "Wrong email or password.";
  if (m.indexOf("Email not confirmed") !== -1) return "Please confirm your email first. Check your inbox.";
  if (m.indexOf("already registered") !== -1) return "This email is already registered. Please login.";
  if (m.toLowerCase().indexOf("rate limit") !== -1) return "Too many attempts. Please wait a few minutes and try again.";
  return m;
}

/* ---------- Login ---------- */
async function handleLogin(e) {
  e.preventDefault();
  const email = $("loginEmail").value.trim();
  const pw = $("loginPassword").value;

  if (!sb) { fail("Could not connect. Check your internet and refresh."); return false; }
  if (!validEmail(email)) { fail("Please enter a valid email address."); return false; }
  if (pw.length < 6) { fail("Password must be at least 6 characters."); return false; }

  const btn = $("loginBtn");
  clearMsg();
  setLoading(btn, true, "Signing in...");
  const result = await sb.auth.signInWithPassword({ email: email, password: pw });
  setLoading(btn, false);

  if (result.error) { fail(friendlyError(result.error)); return false; }

  showMsg("Login successful ✅ Opening your page...", "success");
  setTimeout(function () { window.location.href = "dashboard.html"; }, 900);
  return false;
}

/* ---------- Register ---------- */
async function handleRegister(e) {
  e.preventDefault();
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const phone = $("regPhone").value.trim();
  const pw = $("regPassword").value;
  const confirm = $("regConfirm").value;

  if (!sb) { fail("Could not connect. Check your internet and refresh."); return false; }
  if (name.length < 2) { fail("Please enter your full name."); return false; }
  if (!validEmail(email)) { fail("Please enter a valid email address."); return false; }
  if (phone.length < 8) { fail("Please enter a valid phone number."); return false; }
  if (pw.length < 6) { fail("Password must be at least 6 characters."); return false; }
  if (pw !== confirm) { fail("Passwords do not match."); return false; }

  const btn = $("regBtn");
  clearMsg();
  setLoading(btn, true, "Creating account...");
  const result = await sb.auth.signUp({
    email: email,
    password: pw,
    options: { data: { full_name: name, phone: phone } }
  });
  setLoading(btn, false);

  if (result.error) { fail(friendlyError(result.error)); return false; }

  const user = result.data.user;
  if (user && user.identities && user.identities.length === 0) {
    fail("This email is already registered. Please login.");
    return false;
  }

  if (result.data.session) {
    showMsg("Account created ✅ Opening your page...", "success");
    setTimeout(function () { window.location.href = "dashboard.html"; }, 900);
  } else {
    showMsg("Account created ✅ Check your email to confirm, then login.", "success");
  }
  return false;
}

function forgot(e) {
  e.preventDefault();
  showMsg("Password reset is coming in the next update.", "info");
}