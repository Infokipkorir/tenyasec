import { useState, useEffect, useRef } from "react";

// ─── SUPABASE CONFIG ────────────────────────────────────────────────
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here";

// ─── Minimal Supabase client ────────────────────────────────────────
const supabase = {
  async query(table, method = "GET", body = null, filter = "") {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filter}`;
    const res = await fetch(url, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: method === "POST" ? "return=representation" : "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return method === "DELETE" ? null : res.json();
  },
  from(table) {
    return {
      select: (cols = "*") => supabase.query(table, "GET", null, `?select=${cols}&order=created_at.desc`),
      insert: (data) => supabase.query(table, "POST", data),
      update: (data, id) => supabase.query(table, "PATCH", data, `?id=eq.${id}`),
      delete: (id) => supabase.query(table, "DELETE", null, `?id=eq.${id}`),
    };
  },
};

// ─── SQL to create tables (run in Supabase SQL editor) ──────────────
// CREATE TABLE messages (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   name text NOT NULL, email text NOT NULL,
//   phone text, subject text, message text NOT NULL,
//   status text DEFAULT 'unread', created_at timestamptz DEFAULT now()
// );
// CREATE TABLE social_accounts (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   platform text NOT NULL, handle text, connected boolean DEFAULT false,
//   access_token text, created_at timestamptz DEFAULT now()
// );
// CREATE TABLE content_posts (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   title text, content text, platforms text[], status text DEFAULT 'draft',
//   scheduled_at timestamptz, created_at timestamptz DEFAULT now()
// );

// ─── CLAUDE API ─────────────────────────────────────────────────────
async function generateContent(prompt, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt || "You are a professional security company social media manager for Tenya Security Group Ltd. Write compelling, professional content that emphasizes integrity, excellence, and trust.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── STYLES ─────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Jost:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --gold: #C9A84C;
    --gold-light: #E8C97A;
    --navy: #0B1524;
    --navy-mid: #132035;
    --navy-light: #1E3050;
    --slate: #8BA4BF;
    --text: #F0EDE8;
    --text-muted: #8BA4BF;
    --border: rgba(201,168,76,0.2);
    --border-light: rgba(255,255,255,0.08);
  }
  body { font-family: 'Jost', sans-serif; background: var(--navy); color: var(--text); }
  .serif { font-family: 'Cormorant Garamond', serif; }
  
  /* NAV */
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(11,21,36,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
  .nav-inner { max-width: 1280px; margin: 0 auto; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 72px; }
  .nav-logo { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .logo-icon { width: 40px; height: 40px; }
  .nav-brand-name { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 600; letter-spacing: 0.05em; color: var(--text); }
  .nav-links { display: flex; align-items: center; gap: 2rem; }
  .nav-links a { font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); text-decoration: none; transition: color 0.2s; cursor: pointer; }
  .nav-links a:hover { color: var(--gold); }
  .nav-cta { padding: 8px 20px; border: 1px solid var(--gold); color: var(--gold); font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; background: transparent; font-family: 'Jost', sans-serif; transition: all 0.2s; }
  .nav-cta:hover { background: var(--gold); color: var(--navy); }

  /* HERO */
  .hero { min-height: 100vh; display: flex; align-items: center; position: relative; overflow: hidden; padding-top: 72px; }
  .hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0B1524 0%, #132035 50%, #0f1e34 100%); }
  .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(201,168,76,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.05) 1px, transparent 1px); background-size: 60px 60px; }
  .hero-inner { position: relative; max-width: 1280px; margin: 0 auto; padding: 0 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border: 1px solid var(--border); font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.5rem; }
  .hero-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(3rem, 5vw, 4.5rem); font-weight: 600; line-height: 1.05; margin-bottom: 1rem; }
  .hero-title em { font-style: italic; color: var(--gold); display: block; }
  .hero-tagline { font-size: 0.85rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.5rem; }
  .hero-desc { font-size: 1rem; line-height: 1.7; color: var(--text-muted); margin-bottom: 2.5rem; font-weight: 300; }
  .hero-btns { display: flex; gap: 1rem; flex-wrap: wrap; }
  .btn-primary { padding: 14px 32px; background: var(--gold); color: var(--navy); font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; border: none; cursor: pointer; font-family: 'Jost', sans-serif; font-weight: 600; transition: all 0.2s; }
  .btn-primary:hover { background: var(--gold-light); }
  .btn-outline { padding: 14px 32px; background: transparent; color: var(--text); font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid var(--border-light); cursor: pointer; font-family: 'Jost', sans-serif; transition: all 0.2s; }
  .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
  .hero-visual { position: relative; display: flex; justify-content: center; }
  .shield-wrap { position: relative; }
  
  /* STATS BAR */
  .stats-bar { background: var(--navy-mid); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .stats-inner { max-width: 1280px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
  .stat-item { text-align: center; padding: 1.5rem; }
  .stat-num { font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; font-weight: 700; color: var(--gold); }
  .stat-label { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; }

  /* SECTIONS */
  section { padding: 6rem 2rem; }
  .section-inner { max-width: 1280px; margin: 0 auto; }
  .section-tag { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 1rem; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 600; line-height: 1.1; margin-bottom: 1.5rem; }
  .section-title span { color: var(--gold); font-style: italic; }
  .section-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; font-weight: 300; max-width: 520px; }

  /* SERVICES */
  .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5px; background: var(--border); margin-top: 4rem; }
  .service-card { background: var(--navy); padding: 2.5rem; position: relative; overflow: hidden; transition: background 0.3s; cursor: default; }
  .service-card:hover { background: var(--navy-mid); }
  .service-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transition: transform 0.3s; }
  .service-card:hover::after { transform: scaleX(1); }
  .service-icon { width: 48px; height: 48px; margin-bottom: 1.5rem; }
  .service-title { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 600; margin-bottom: 0.75rem; }
  .service-desc { font-size: 0.85rem; line-height: 1.7; color: var(--text-muted); font-weight: 300; }

  /* CONTACT FORM */
  .contact-section { background: var(--navy-mid); }
  .contact-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 4rem; }
  .form-group { margin-bottom: 1.25rem; }
  .form-group label { display: block; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
  .form-group input, .form-group textarea, .form-group select { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); padding: 12px 16px; color: var(--text); font-family: 'Jost', sans-serif; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
  .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--gold); }
  .form-group textarea { height: 120px; resize: none; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-msg { margin-top: 0.5rem; font-size: 0.8rem; }
  .form-msg.success { color: #4CAF50; }
  .form-msg.error { color: #f44336; }

  /* FOOTER */
  footer { background: #070f1a; border-top: 1px solid var(--border); padding: 3rem 2rem; }
  .footer-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; }
  .footer-brand p { font-size: 0.85rem; line-height: 1.7; color: var(--text-muted); font-weight: 300; margin-top: 1rem; }
  .footer-col h4 { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.25rem; }
  .footer-col a { display: block; font-size: 0.85rem; color: var(--text-muted); text-decoration: none; margin-bottom: 0.6rem; cursor: pointer; transition: color 0.2s; }
  .footer-col a:hover { color: var(--text); }
  .footer-bottom { max-width: 1280px; margin: 2rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
  .footer-bottom p { font-size: 0.75rem; color: var(--text-muted); }
  .admin-btn { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); background: transparent; border: 1px solid var(--border-light); padding: 6px 14px; cursor: pointer; font-family: 'Jost', sans-serif; transition: all 0.2s; }
  .admin-btn:hover { color: var(--gold); border-color: var(--gold); }

  /* ADMIN */
  .admin-layout { min-height: 100vh; display: flex; background: #080f1a; }
  .sidebar { width: 260px; background: var(--navy); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; overflow-y: auto; }
  .sidebar-logo { padding: 1.5rem; border-bottom: 1px solid var(--border); }
  .sidebar-logo p { font-size: 0.65rem; letter-spacing: 0.1em; color: var(--text-muted); margin-top: 2px; }
  .sidebar-nav { padding: 1rem 0; flex: 1; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 1.5rem; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; transition: all 0.2s; border-left: 2px solid transparent; }
  .nav-item:hover { background: rgba(201,168,76,0.05); color: var(--text); }
  .nav-item.active { background: rgba(201,168,76,0.08); color: var(--gold); border-left-color: var(--gold); }
  .nav-icon { font-size: 16px; }
  .sidebar-footer { padding: 1.5rem; border-top: 1px solid var(--border); }
  .admin-main { margin-left: 260px; flex: 1; padding: 2rem; }
  .page-header { margin-bottom: 2rem; }
  .page-header h1 { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 600; }
  .page-header p { font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; font-weight: 500; }
  .badge.unread { background: rgba(201,168,76,0.15); color: var(--gold); }
  .badge.read { background: rgba(139,164,191,0.15); color: var(--slate); }
  .badge.replied { background: rgba(76,175,80,0.15); color: #4CAF50; }
  
  /* CARDS */
  .card { background: var(--navy); border: 1px solid var(--border-light); padding: 1.5rem; margin-bottom: 1rem; }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
  .card-meta { font-size: 0.75rem; color: var(--text-muted); }
  .msg-name { font-weight: 500; font-size: 0.95rem; }
  .msg-subject { font-size: 0.85rem; color: var(--text-muted); margin-top: 2px; }
  .msg-body { font-size: 0.85rem; line-height: 1.6; color: var(--text-muted); margin-top: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 0.75rem; }
  .action-btn { padding: 6px 14px; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid var(--border-light); background: transparent; color: var(--text-muted); cursor: pointer; font-family: 'Jost', sans-serif; transition: all 0.2s; margin-left: 6px; }
  .action-btn:hover { border-color: var(--gold); color: var(--gold); }
  .action-btn.danger:hover { border-color: #f44336; color: #f44336; }
  
  /* METRICS ROW */
  .metrics-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .metric-card { background: var(--navy); border: 1px solid var(--border-light); padding: 1.25rem; }
  .metric-card .label { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
  .metric-card .value { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: var(--gold); margin-top: 4px; }
  
  /* SOCIAL */
  .platform-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .platform-card { background: var(--navy); border: 1px solid var(--border-light); padding: 1.5rem; display: flex; align-items: center; gap: 1rem; }
  .platform-icon { width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .platform-info { flex: 1; }
  .platform-name { font-weight: 500; font-size: 0.95rem; }
  .platform-handle { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
  .connect-btn { padding: 8px 16px; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid; cursor: pointer; font-family: 'Jost', sans-serif; transition: all 0.2s; }
  .connect-btn.connected { border-color: #4CAF50; color: #4CAF50; background: rgba(76,175,80,0.08); }
  .connect-btn.connect { border-color: var(--gold); color: var(--gold); background: transparent; }
  .connect-btn.connect:hover { background: rgba(201,168,76,0.1); }

  /* CONTENT CREATOR */
  .content-creator { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; }
  .ai-controls { background: var(--navy); border: 1px solid var(--border-light); padding: 1.5rem; }
  .ai-controls h3 { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; margin-bottom: 1rem; }
  .prompt-area { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); padding: 12px; color: var(--text); font-family: 'Jost', sans-serif; font-size: 0.85rem; resize: none; outline: none; height: 100px; transition: border-color 0.2s; }
  .prompt-area:focus { border-color: var(--gold); }
  .platform-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 1rem 0; }
  .check-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-muted); cursor: pointer; padding: 6px 10px; border: 1px solid var(--border-light); }
  .check-item.checked { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.05); }
  .tone-select { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); padding: 10px 12px; color: var(--text); font-family: 'Jost', sans-serif; font-size: 0.85rem; outline: none; margin-bottom: 1rem; }
  .generated-content { background: var(--navy); border: 1px solid var(--border-light); padding: 1.5rem; }
  .generated-content h3 { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; margin-bottom: 1rem; }
  .content-output { background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); padding: 1rem; min-height: 200px; font-size: 0.85rem; line-height: 1.7; color: var(--text-muted); white-space: pre-wrap; word-break: break-word; }
  .loading-pulse { animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border-light); margin-bottom: 1.5rem; }
  .tab { padding: 10px 20px; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
  .tab.active { color: var(--gold); border-bottom-color: var(--gold); }
  
  /* ADMIN LOGIN */
  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--navy); }
  .login-card { width: 400px; background: var(--navy-mid); border: 1px solid var(--border); padding: 3rem; }
  .login-card h2 { font-family: 'Cormorant Garamond', serif; font-size: 2rem; margin-bottom: 0.5rem; }
  .login-card p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2rem; }

  /* TOAST */
  .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 12px 20px; background: var(--navy-mid); border: 1px solid; font-size: 0.85rem; z-index: 999; animation: slideIn 0.3s ease; }
  .toast.success { border-color: #4CAF50; color: #4CAF50; }
  .toast.error { border-color: #f44336; color: #f44336; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  /* POSTS HISTORY */
  .post-item { background: var(--navy); border: 1px solid var(--border-light); padding: 1.25rem; margin-bottom: 0.75rem; }
  .post-platforms { display: flex; gap: 6px; margin-top: 8px; }
  .platform-pill { padding: 2px 8px; font-size: 0.65rem; background: rgba(201,168,76,0.1); color: var(--gold); border: 1px solid var(--border); }
  .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  @media (max-width: 900px) {
    .hero-inner, .contact-grid, .footer-inner { grid-template-columns: 1fr; }
    .services-grid { grid-template-columns: 1fr; }
    .stats-inner, .metrics-row { grid-template-columns: repeat(2, 1fr); }
    .hero-visual { display: none; }
    .sidebar { display: none; }
    .admin-main { margin-left: 0; }
    .content-creator { grid-template-columns: 1fr; }
    .platform-grid { grid-template-columns: 1fr; }
  }
`;

// ─── COMPONENTS ─────────────────────────────────────────────────────

function ShieldSVG() {
  return (
    <svg viewBox="0 0 320 380" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 320, filter: "drop-shadow(0 0 40px rgba(201,168,76,0.15))" }}>
      <path d="M160 20L40 70V180C40 270 160 360 160 360C160 360 280 270 280 180V70L160 20Z" fill="rgba(19,32,53,0.8)" stroke="#C9A84C" strokeWidth="1.5" />
      <path d="M160 48L65 88V178C65 252 160 332 160 332C160 332 255 252 255 178V88L160 48Z" fill="rgba(11,21,36,0.6)" stroke="rgba(201,168,76,0.3)" strokeWidth="1" />
      <path d="M130 180L150 200L195 155" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="178" r="38" fill="none" stroke="rgba(201,168,76,0.25)" strokeWidth="1" />
      <circle cx="160" cy="178" r="52" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="1" strokeDasharray="4 4" />
      <text x="160" y="280" textAnchor="middle" fill="rgba(201,168,76,0.5)" fontSize="9" fontFamily="Jost" letterSpacing="3">INTEGRITY · EXCELLENCE</text>
    </svg>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── PUBLIC WEBSITE ──────────────────────────────────────────────────

function PublicWebsite({ onAdminClick }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  const services = [
    { icon: "🛡️", title: "Manned Guarding", desc: "Professional security officers trained to the highest standards, providing physical presence and deterrence for your premises around the clock." },
    { icon: "📷", title: "CCTV & Surveillance", desc: "State-of-the-art surveillance systems with remote monitoring capabilities, ensuring comprehensive coverage of all critical areas." },
    { icon: "🚗", title: "Mobile Patrols", desc: "Regular mobile patrol services providing cost-effective security coverage across multiple sites with rapid response capabilities." },
    { icon: "🔐", title: "Access Control", desc: "Advanced access management systems that control and monitor entry to sensitive areas while maintaining detailed audit trails." },
    { icon: "🔍", title: "Risk Assessment", desc: "Comprehensive security audits and vulnerability assessments to identify weaknesses and develop robust mitigation strategies." },
    { icon: "🏢", title: "Corporate Security", desc: "Executive protection, visitor management, and workplace security solutions tailored for corporate environments." },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    try {
      await supabase.from("messages").insert({ ...form, status: "unread" });
      setFormMsg({ type: "success", text: "Your message has been received. We'll respond within 24 hours." });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setFormMsg({ type: "error", text: "Failed to send. Please try again or call us directly." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <div className="nav-logo">
            <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
              <path d="M20 3L5 9V20C5 30 20 37 20 37C20 37 35 30 35 20V9L20 3Z" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" strokeWidth="1.5" />
              <path d="M14 20L18 24L27 15" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="nav-brand-name">TENYA SECURITY GROUP</span>
          </div>
          <div className="nav-links">
            <a onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>Services</a>
            <a onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>About</a>
            <a onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>Contact</a>
            <button className="nav-cta" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>Get a Quote</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">🛡 Kenya's Trusted Security Partner</div>
            <p className="hero-tagline">Integrity With Excellence</p>
            <h1 className="hero-title">
              Securing What<br /><em>Matters Most</em><br />To You
            </h1>
            <p className="hero-desc">
              Tenya Security Group Ltd delivers world-class security solutions across Kenya, combining cutting-edge technology with highly trained professionals to protect your assets, people, and peace of mind.
            </p>
            <div className="hero-btns">
              <button className="btn-primary" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>Request a Consultation</button>
              <button className="btn-outline" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>Our Services</button>
            </div>
          </div>
          <div className="hero-visual">
            <ShieldSVG />
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stats-inner">
          {[["500+", "Clients Protected"], ["24/7", "Round-the-Clock Coverage"], ["15+", "Years of Excellence"], ["1,200+", "Security Personnel"]].map(([num, label]) => (
            <div className="stat-item" key={label}>
              <div className="stat-num">{num}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <section id="services" style={{ background: "var(--navy)" }}>
        <div className="section-inner">
          <p className="section-tag">What We Offer</p>
          <h2 className="section-title">Comprehensive Security <span>Solutions</span></h2>
          <p className="section-desc">From physical guarding to advanced surveillance systems, we deliver integrated security services tailored to your unique requirements.</p>
          <div className="services-grid">
            {services.map((s) => (
              <div className="service-card" key={s.title}>
                <div className="service-icon">{s.icon}</div>
                <h3 className="service-title">{s.title}</h3>
                <p className="service-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ background: "var(--navy-mid)" }}>
        <div className="section-inner">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
            <div>
              <p className="section-tag">About Tenya Security Group</p>
              <h2 className="section-title">Built on a Foundation of <span>Trust</span></h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: "1.5rem", fontWeight: 300 }}>
                Tenya Security Group Ltd was established with a singular vision: to raise the standard of security services in Kenya. We believe that true security goes beyond physical barriers — it begins with integrity.
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.8, fontWeight: 300 }}>
                Our team of certified professionals brings decades of combined experience in military, law enforcement, and private security. Every officer undergoes rigorous vetting, comprehensive training, and continuous professional development.
              </p>
              <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
                {[["ISO 9001", "Certified Quality"], ["NIS", "Licensed & Regulated"], ["PSIRA", "Accredited Members"]].map(([cert, desc]) => (
                  <div key={cert}>
                    <div style={{ color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 700 }}>{cert}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.05em", marginTop: 2 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--border)" }}>
              {["Integrity First", "Client-Centric Approach", "Rapid Response", "Continuous Innovation", "Proven Track Record", "Transparent Reporting"].map((v) => (
                <div key={v} style={{ background: "var(--navy)", padding: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "var(--gold)" }}>▸</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 400 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="contact-section">
        <div className="section-inner">
          <div className="contact-grid">
            <div>
              <p className="section-tag">Get In Touch</p>
              <h2 className="section-title">Let's Discuss Your <span>Security Needs</span></h2>
              <p className="section-desc" style={{ marginBottom: "2.5rem" }}>Our consultants are ready to assess your security requirements and design a customized solution that fits your budget and objectives.</p>
              {[["📍", "Location", "Nairobi, Kenya — Serving All Regions"], ["📞", "Phone", "+254 700 000 000"], ["✉️", "Email", "info@tenyasecurity.co.ke"], ["🕐", "Hours", "24/7 Emergency Response"]].map(([icon, label, val]) => (
                <div key={label} style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18, marginTop: 2 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 ..." />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="How can we help?" />
                </div>
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Describe your security requirements..." />
              </div>
              {formMsg && <p className={`form-msg ${formMsg.type}`}>{formMsg.text}</p>}
              <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                {submitting && <span className="spinner" />}
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-brand-name" style={{ fontSize: "1rem" }}>TENYA SECURITY GROUP LTD</div>
            <p>Providing integrated security solutions with unwavering commitment to integrity and excellence across Kenya and East Africa.</p>
          </div>
          <div className="footer-col">
            <h4>Services</h4>
            <a>Manned Guarding</a>
            <a>CCTV & Surveillance</a>
            <a>Mobile Patrols</a>
            <a>Access Control</a>
            <a>Risk Assessment</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a>About Us</a>
            <a>Our Team</a>
            <a>Certifications</a>
            <a>Careers</a>
            <a>News</a>
          </div>
          <div className="footer-col">
            <h4>Follow Us</h4>
            {["LinkedIn", "Facebook", "Twitter / X", "Instagram"].map(s => <a key={s}>{s}</a>)}
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 Tenya Security Group Ltd. All rights reserved. | Integrity With Excellence</p>
          <button className="admin-btn" onClick={onAdminClick}>Admin Portal →</button>
        </div>
      </footer>
    </>
  );
}

// ─── ADMIN LOGIN ─────────────────────────────────────────────────────

function AdminLogin({ onLogin }) {
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");

  function handleLogin(e) {
    e.preventDefault();
    // Replace with real auth
    if (creds.username === "admin" && creds.password === "tenya2024") {
      onLogin();
    } else {
      setErr("Invalid credentials. (demo: admin / tenya2024)");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <svg viewBox="0 0 40 40" fill="none" style={{ width: 40, height: 40, marginBottom: "1.5rem" }}>
          <path d="M20 3L5 9V20C5 30 20 37 20 37C20 37 35 30 35 20V9L20 3Z" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" strokeWidth="1.5" />
          <path d="M14 20L18 24L27 15" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2>Admin Portal</h2>
        <p>Tenya Security Group Management System</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input required value={creds.username} onChange={e => setCreds(p => ({ ...p, username: e.target.value }))} placeholder="admin" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input required type="password" value={creds.password} onChange={e => setCreds(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
          </div>
          {err && <p style={{ color: "#f44336", fontSize: "0.8rem", marginBottom: "1rem" }}>{err}</p>}
          <button className="btn-primary" type="submit" style={{ width: "100%" }}>Access Dashboard</button>
        </form>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("messages");
  const [messages, setMessages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [socialPlatforms, setSocialPlatforms] = useState([
    { id: "facebook", name: "Facebook", icon: "📘", color: "#1877F2", connected: false, handle: "" },
    { id: "instagram", name: "Instagram", icon: "📸", color: "#E1306C", connected: false, handle: "" },
    { id: "twitter", name: "Twitter / X", icon: "🐦", color: "#1DA1F2", connected: false, handle: "" },
    { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#0A66C2", connected: false, handle: "" },
    { id: "tiktok", name: "TikTok", icon: "🎵", color: "#010101", connected: false, handle: "" },
    { id: "youtube", name: "YouTube", icon: "▶️", color: "#FF0000", connected: false, handle: "" },
  ]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiTopic, setAiTopic] = useState("general");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["facebook", "instagram"]);
  const [generatedContent, setGeneratedContent] = useState({});
  const [generating, setGenerating] = useState(false);
  const [contentTab, setContentTab] = useState("create");

  useEffect(() => {
    if (tab === "messages") loadMessages();
    if (tab === "content") loadPosts();
  }, [tab]);

  async function loadMessages() {
    setLoading(true);
    try {
      const data = await supabase.from("messages").select("*");
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages(getMockMessages());
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts() {
    try {
      const data = await supabase.from("content_posts").select("*");
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    }
  }

  function getMockMessages() {
    return [
      { id: "1", name: "James Kamau", email: "james@company.co.ke", phone: "+254 712 345 678", subject: "Manned Guarding Inquiry", message: "We need security guards for our office complex in Westlands. Please send us a quote for 3 guards on 8-hour shifts.", status: "unread", created_at: new Date().toISOString() },
      { id: "2", name: "Sarah Omondi", email: "sarah@hotel.co.ke", phone: "+254 722 987 654", subject: "CCTV Installation", message: "We're looking to upgrade our surveillance system for a 150-room hotel. Could you arrange a site visit?", status: "read", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "3", name: "Peter Njoroge", email: "peter@logistics.co.ke", phone: "+254 733 111 222", subject: "Mobile Patrol Services", message: "We have a warehouse facility in Industrial Area that requires regular mobile patrols during night hours.", status: "replied", created_at: new Date(Date.now() - 172800000).toISOString() },
    ];
  }

  async function markRead(id) {
    try { await supabase.from("messages").update({ status: "read" }, id); } catch {}
    setMessages(p => p.map(m => m.id === id ? { ...m, status: "read" } : m));
    showToast("Marked as read", "success");
  }

  async function markReplied(id) {
    try { await supabase.from("messages").update({ status: "replied" }, id); } catch {}
    setMessages(p => p.map(m => m.id === id ? { ...m, status: "replied" } : m));
    showToast("Marked as replied", "success");
  }

  async function deleteMsg(id) {
    try { await supabase.from("messages").delete(id); } catch {}
    setMessages(p => p.filter(m => m.id !== id));
    showToast("Message deleted", "success");
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function togglePlatform(id) {
    setSelectedPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function generateAIContent() {
    if (!aiPrompt.trim()) { showToast("Please enter a prompt", "error"); return; }
    setGenerating(true);
    setGeneratedContent({});

    const systemPrompt = `You are a professional social media manager for Tenya Security Group Ltd — a premium security company in Kenya with the tagline "Integrity With Excellence". Write ${aiTone} content that builds trust and highlights professionalism. Keep content relevant to security services.`;

    const platformInstructions = {
      facebook: "Write a detailed Facebook post (2-3 paragraphs) with emojis. Include a call-to-action.",
      instagram: "Write an Instagram caption (short, punchy, with relevant hashtags like #TenyaSecurity #IntegrityWithExcellence #SecurityKenya).",
      twitter: "Write a tweet under 280 characters. Impactful and concise.",
      linkedin: "Write a professional LinkedIn post (formal tone, industry insights, thought leadership).",
      tiktok: "Write a TikTok video script hook and caption (15-30 seconds, energetic, trending style).",
      youtube: "Write a YouTube video title, description, and key talking points.",
    };

    const newContent = {};
    for (const pid of selectedPlatforms) {
      try {
        const text = await generateContent(
          `Topic: ${aiPrompt}\nAdditional context: ${aiTopic}\n\n${platformInstructions[pid] || "Write a social media post."}`,
          systemPrompt
        );
        newContent[pid] = text;
        setGeneratedContent({ ...newContent });
      } catch {
        newContent[pid] = "⚠️ Generation failed. Check your Claude API connection.";
        setGeneratedContent({ ...newContent });
      }
    }
    setGenerating(false);

    try {
      await supabase.from("content_posts").insert({
        title: aiPrompt.slice(0, 60),
        content: JSON.stringify(newContent),
        platforms: selectedPlatforms,
        status: "draft",
      });
      loadPosts();
    } catch {}
  }

  async function saveDraft() {
    try {
      await supabase.from("content_posts").insert({ title: aiPrompt.slice(0, 60), content: JSON.stringify(generatedContent), platforms: selectedPlatforms, status: "draft" });
      showToast("Saved to drafts!", "success");
      loadPosts();
    } catch {
      showToast("Save failed — check Supabase connection", "error");
    }
  }

  function connectPlatform(id) {
    const handle = prompt(`Enter your ${id} page handle or URL:`);
    if (handle) {
      setSocialPlatforms(p => p.map(pl => pl.id === id ? { ...pl, connected: true, handle } : pl));
      showToast(`${id} connected!`, "success");
    }
  }

  function disconnectPlatform(id) {
    setSocialPlatforms(p => p.map(pl => pl.id === id ? { ...pl, connected: false, handle: "" } : pl));
    showToast(`${id} disconnected`, "success");
  }

  const unread = messages.filter(m => m.status === "unread").length;
  const connectedCount = socialPlatforms.filter(p => p.connected).length;

  const navItems = [
    { id: "messages", label: "Messages", icon: "✉️", badge: unread },
    { id: "social", label: "Social Accounts", icon: "🌐" },
    { id: "content", label: "Content Creator", icon: "✍️" },
    { id: "overview", label: "Overview", icon: "📊" },
  ];

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="nav-brand-name" style={{ fontSize: "0.85rem" }}>TENYA SECURITY</div>
          <p>Admin Dashboard</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(n => (
            <div key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.badge > 0 && <span style={{ marginLeft: "auto", background: "rgba(201,168,76,0.2)", color: "var(--gold)", fontSize: "0.65rem", padding: "2px 7px", borderRadius: 3 }}>{n.badge}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="action-btn" onClick={onLogout} style={{ width: "100%", textAlign: "center" }}>← Exit Admin</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            <div className="page-header">
              <h1>Overview</h1>
              <p>Tenya Security Group — Management Console</p>
            </div>
            <div className="metrics-row">
              <div className="metric-card"><div className="label">Total Messages</div><div className="value">{messages.length}</div></div>
              <div className="metric-card"><div className="label">Unread</div><div className="value" style={{ color: "#E8C97A" }}>{unread}</div></div>
              <div className="metric-card"><div className="label">Connected Platforms</div><div className="value">{connectedCount}</div></div>
              <div className="metric-card"><div className="label">Content Drafts</div><div className="value">{posts.length}</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="card">
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", marginBottom: "1rem" }}>Recent Messages</h3>
                {messages.slice(0, 3).map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-light)", fontSize: "0.85rem" }}>
                    <span>{m.name}</span>
                    <span className={`badge ${m.status}`}>{m.status}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", marginBottom: "1rem" }}>Connected Platforms</h3>
                {socialPlatforms.filter(p => p.connected).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No platforms connected yet. Go to Social Accounts.</p>
                ) : socialPlatforms.filter(p => p.connected).map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", fontSize: "0.85rem" }}>
                    <span>{p.icon}</span><span>{p.name}</span>
                    <span style={{ marginLeft: "auto", color: "#4CAF50", fontSize: "0.75rem" }}>● Connected</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* MESSAGES */}
        {tab === "messages" && (
          <>
            <div className="page-header">
              <h1>Messages</h1>
              <p>{messages.length} total · {unread} unread — from your website contact form</p>
            </div>
            <div className="metrics-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="metric-card"><div className="label">Unread</div><div className="value">{messages.filter(m => m.status === "unread").length}</div></div>
              <div className="metric-card"><div className="label">Read</div><div className="value">{messages.filter(m => m.status === "read").length}</div></div>
              <div className="metric-card"><div className="label">Replied</div><div className="value" style={{ color: "#4CAF50" }}>{messages.filter(m => m.status === "replied").length}</div></div>
            </div>
            {loading ? <p style={{ color: "var(--text-muted)" }}><span className="spinner" />Loading messages...</p> :
              messages.length === 0 ? <div className="empty-state">No messages yet. Messages from your website contact form will appear here.</div> :
                messages.map(m => (
                  <div className="card" key={m.id}>
                    <div className="card-header">
                      <div>
                        <div className="msg-name">{m.name}</div>
                        <div className="msg-subject">{m.email} {m.phone ? `· ${m.phone}` : ""}</div>
                        {m.subject && <div className="msg-subject" style={{ color: "var(--text)", marginTop: 4 }}>Re: {m.subject}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span className={`badge ${m.status}`}>{m.status}</span>
                        <span className="card-meta">{new Date(m.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="msg-body">{m.message}</div>
                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: 4 }}>
                      {m.status === "unread" && <button className="action-btn" onClick={() => markRead(m.id)}>Mark Read</button>}
                      {m.status !== "replied" && <button className="action-btn" onClick={() => markReplied(m.id)}>Mark Replied</button>}
                      <button className="action-btn" onClick={() => window.open(`mailto:${m.email}?subject=Re: ${m.subject || "Your Inquiry"}`)}>Reply by Email</button>
                      <button className="action-btn danger" onClick={() => deleteMsg(m.id)}>Delete</button>
                    </div>
                  </div>
                ))
            }
          </>
        )}

        {/* SOCIAL ACCOUNTS */}
        {tab === "social" && (
          <>
            <div className="page-header">
              <h1>Social Media Accounts</h1>
              <p>Connect your platforms for content distribution and boosting</p>
            </div>
            <div style={{ background: "var(--navy)", border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>OAuth Integration Required</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>For production, implement OAuth flows (Facebook Graph API, Twitter OAuth 2.0, LinkedIn API) and store access tokens securely in Supabase. The connect buttons below simulate the flow.</p>
              </div>
            </div>
            <div className="platform-grid">
              {socialPlatforms.map(pl => (
                <div className="platform-card" key={pl.id}>
                  <div className="platform-icon" style={{ background: `${pl.color}20`, border: `1px solid ${pl.color}40` }}>
                    <span style={{ fontSize: 22 }}>{pl.icon}</span>
                  </div>
                  <div className="platform-info">
                    <div className="platform-name">{pl.name}</div>
                    <div className="platform-handle">{pl.connected ? `@${pl.handle}` : "Not connected"}</div>
                    {pl.connected && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(76,175,80,0.1)", color: "#4CAF50", border: "1px solid rgba(76,175,80,0.3)" }}>Publish</span>
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(201,168,76,0.1)", color: "var(--gold)", border: "1px solid var(--border)" }}>Boost</span>
                      </div>
                    )}
                  </div>
                  {pl.connected ? (
                    <button className="connect-btn connected" onClick={() => disconnectPlatform(pl.id)}>✓ Connected</button>
                  ) : (
                    <button className="connect-btn connect" onClick={() => connectPlatform(pl.id)}>+ Connect</button>
                  )}
                </div>
              ))}
            </div>
            {connectedCount > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", marginBottom: "1rem" }}>Boosting Settings</h3>
                <div className="card">
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Configure audience targeting and budget for content boosting across connected platforms.</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Target Location</label>
                      <input defaultValue="Nairobi, Kenya" placeholder="City, Country" />
                    </div>
                    <div className="form-group">
                      <label>Daily Budget (KES)</label>
                      <input type="number" defaultValue="500" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <select className="tone-select" style={{ margin: 0 }}>
                      <option>Business Owners & Decision Makers</option>
                      <option>Property Managers & Real Estate</option>
                      <option>Corporate HR & Procurement</option>
                      <option>NGOs & International Organizations</option>
                    </select>
                  </div>
                  <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={() => showToast("Boost settings saved!", "success")}>Save Boost Settings</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* CONTENT CREATOR */}
        {tab === "content" && (
          <>
            <div className="page-header">
              <h1>AI Content Creator</h1>
              <p>Generate compelling security content powered by Claude AI</p>
            </div>
            <div className="tabs">
              <div className={`tab ${contentTab === "create" ? "active" : ""}`} onClick={() => setContentTab("create")}>Create Content</div>
              <div className={`tab ${contentTab === "drafts" ? "active" : ""}`} onClick={() => { setContentTab("drafts"); loadPosts(); }}>Saved Drafts ({posts.length})</div>
              <div className={`tab ${contentTab === "templates" ? "active" : ""}`} onClick={() => setContentTab("templates")}>Templates</div>
            </div>

            {contentTab === "create" && (
              <div className="content-creator">
                <div className="ai-controls">
                  <h3>Content Brief</h3>
                  <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                    <label>Topic / Main Idea</label>
                    <textarea className="prompt-area" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="E.g. 'Why businesses in Nairobi need professional security during the festive season' or 'Tips for choosing the right security company'" />
                  </div>
                  <div className="form-group">
                    <label>Content Type</label>
                    <select className="tone-select" value={aiTopic} onChange={e => setAiTopic(e.target.value)}>
                      <option value="general">General Brand Awareness</option>
                      <option value="promo">Service Promotion</option>
                      <option value="tips">Security Tips & Education</option>
                      <option value="testimonial">Client Success Story</option>
                      <option value="recruitment">Recruitment Post</option>
                      <option value="anniversary">Company Milestone</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tone</label>
                    <select className="tone-select" value={aiTone} onChange={e => setAiTone(e.target.value)}>
                      <option value="professional">Professional & Authoritative</option>
                      <option value="friendly">Friendly & Approachable</option>
                      <option value="urgent">Urgent & Action-Oriented</option>
                      <option value="educational">Educational & Informative</option>
                      <option value="celebratory">Celebratory & Proud</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Target Platforms</label>
                    <div className="platform-checks">
                      {socialPlatforms.map(pl => (
                        <div key={pl.id} className={`check-item ${selectedPlatforms.includes(pl.id) ? "checked" : ""}`} onClick={() => togglePlatform(pl.id)}>
                          <span>{pl.icon}</span>
                          <span>{pl.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={generateAIContent} disabled={generating}>
                    {generating && <span className="spinner" />}
                    {generating ? "Generating..." : "✦ Generate with AI"}
                  </button>
                </div>

                <div className="generated-content">
                  <h3>Generated Content</h3>
                  {selectedPlatforms.length === 0 ? (
                    <div className="empty-state">Select at least one platform to generate content</div>
                  ) : Object.keys(generatedContent).length === 0 && !generating ? (
                    <div className="empty-state" style={{ borderTop: "none", paddingTop: "2rem" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✦</div>
                      <p>Fill in your brief and click Generate.<br />AI will create tailored content for each selected platform.</p>
                    </div>
                  ) : (
                    <>
                      {selectedPlatforms.map(pid => {
                        const pl = socialPlatforms.find(p => p.id === pid);
                        return (
                          <div key={pid} style={{ marginBottom: "1.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "0.8rem", color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                              <span>{pl?.icon}</span> {pl?.name}
                            </div>
                            <div className={`content-output ${generating && !generatedContent[pid] ? "loading-pulse" : ""}`}>
                              {generatedContent[pid] || (generating ? "Generating content…" : "")}
                            </div>
                            {generatedContent[pid] && (
                              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                                <button className="action-btn" onClick={() => { navigator.clipboard.writeText(generatedContent[pid]); showToast("Copied!", "success"); }}>Copy</button>
                                {pl?.connected && <button className="action-btn">Publish Now</button>}
                                {pl?.connected && <button className="action-btn">Schedule</button>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {Object.keys(generatedContent).length > 0 && !generating && (
                        <button className="btn-primary" style={{ marginTop: "0.5rem" }} onClick={saveDraft}>Save All to Drafts</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {contentTab === "drafts" && (
              <div>
                {posts.length === 0 ? (
                  <div className="empty-state">No drafts yet. Generate content and save drafts.</div>
                ) : posts.map(p => {
                  let parsed = {};
                  try { parsed = JSON.parse(p.content || "{}"); } catch {}
                  return (
                    <div className="post-item" key={p.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{p.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 3 }}>{new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className="badge unread">{p.status}</span>
                      </div>
                      <div className="post-platforms">
                        {(p.platforms || []).map(pid => {
                          const pl = socialPlatforms.find(x => x.id === pid);
                          return <span key={pid} className="platform-pill">{pl?.icon} {pl?.name}</span>;
                        })}
                      </div>
                      {Object.entries(parsed).slice(0, 1).map(([pid, txt]) => (
                        <div key={pid} style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.75rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", maxHeight: 80, overflow: "hidden" }}>{txt?.slice(0, 200)}...</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {contentTab === "templates" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                {[
                  { title: "Security Tip Tuesday", desc: "Weekly safety tip for businesses", prompt: "Share a practical security tip for businesses operating in Nairobi CBD" },
                  { title: "Client Spotlight", desc: "Showcase a successful security deployment", prompt: "Write about how Tenya Security successfully secured a major client event with professional crowd management" },
                  { title: "Festive Season Alert", desc: "Crime prevention during holidays", prompt: "Warn businesses about increased security risks during the festive season and how Tenya can help" },
                  { title: "Team Highlight", desc: "Showcase your professional officers", prompt: "Highlight the professionalism and training standards of Tenya Security Group officers" },
                  { title: "Service Launch", desc: "Announce a new service offering", prompt: "Announce Tenya's new executive protection service for high-net-worth individuals in Nairobi" },
                  { title: "Industry Insights", desc: "Thought leadership content", prompt: "Share insights on the growing importance of integrated security solutions for Kenyan businesses in 2024" },
                ].map(t => (
                  <div className="card" key={t.title} style={{ cursor: "pointer" }} onClick={() => { setAiPrompt(t.prompt); setContentTab("create"); }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", marginBottom: "4px" }}>{t.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>{t.desc}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gold)" }}>Use Template →</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("website"); // website | login | admin

  return (
    <>
      <style>{css}</style>
      {view === "website" && <PublicWebsite onAdminClick={() => setView("login")} />}
      {view === "login" && <AdminLogin onLogin={() => setView("admin")} />}
      {view === "admin" && <AdminDashboard onLogout={() => setView("website")} />}
    </>
  );
}
