// Static site generator for sampay: renders every page in fr (root), en and rn
// from the copy dictionaries in ./i18n, into ../dist.
import { mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fr from "./i18n/fr.mjs";
import en from "./i18n/en.mjs";
import rn from "./i18n/rn.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");
const SITE = process.env.SITE_URL || "https://sampay.vercel.app";
const LANGS = [
  { code: "fr", prefix: "", short: "FR", name: "Français", t: fr },
  { code: "rn", prefix: "/rn", short: "RN", name: "Kirundi", t: rn },
  { code: "en", prefix: "/en", short: "EN", name: "English", t: en },
];
const PAGES = ["", "features", "merchants", "security", "about", "help", "legal"];

/* ── helpers ─────────────────────────────────────────────────────────── */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const C = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>';
const pad = (i) => String(i + 1).padStart(2, "0");
const map = (a, f) => (a || []).map(f).join("");
let L; // current language record
const href = (page, hash = "") => (L.prefix + (page ? `/${page}/` : "/")) .replace(/^\/\//, "/") + hash;

const I = {
  phone: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l14 9-14 9V3z"/></svg>',
  globe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  signal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/></svg>',
  bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  finger: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--ink-accent);flex:none"><path d="M12 10a2 2 0 0 0-2 2c0 1 0 3.5-1 6M14 13.1c0 2.4 0 5.9-1 8.9M17.3 21c.1-.6.4-2.3.5-3M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .1-5.4 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .3-2M8.6 22c.2-.7.4-1.4.5-2.1M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>',
  shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--ink-accent);flex:none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  pdf: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--ink-accent);flex:none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>',
  lock: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--ink-accent)"><rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  check: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  bank: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;color:var(--ink-accent)"><path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-7 10 7z"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  moon: '<svg class="moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>',
  sun: '<svg class="sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
};

// Illustrative QR pattern (not scannable) — same generator as the design.
function qr(seed) {
  const n = 21; let s = seed; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const finder = (r, c, R, C) => { const y = r - R, x = c - C; if (y < 0 || x < 0 || y > 6 || x > 6) return null; return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4); };
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let v = finder(r, c, 0, 0); if (v === null) v = finder(r, c, 0, n - 7); if (v === null) v = finder(r, c, n - 7, 0);
    if (v === null) { const sep = (r <= 7 && c <= 7) || (r <= 7 && c >= n - 8) || (r >= n - 8 && c <= 7); v = sep ? false : (r === 6 ? c % 2 === 0 : c === 6 ? r % 2 === 0 : rnd() > 0.52); }
    if (v) d += `M${c} ${r}h1v1h-1z`;
  }
  return `<div class="qr"><svg viewBox="0 0 21 21" shape-rendering="crispEdges" aria-hidden="true"><path fill="#1d1f20" d="${d}"/></svg></div>`;
}

/* ── shared blocks ───────────────────────────────────────────────────── */
const head = (t) => `<span class="kicker">${esc(t)}</span><div class="rule"></div>`;
const phone = (inner, cls = "") => `<div class="phone ${cls}"><div class="screen">${inner}</div></div>`;
const ph = (t) => `<span class="tag-ph">${esc(t.ph)}</span>`;
const soon = (t) => `<span class="tag tag-soon">${esc(t.soonTag)}</span>`;
const stores = (t, light = false) => {
  const cls = light ? "btn btn-store btn-light bp light-corners" : "btn btn-primary btn-store bp";
  return `<div class="btn-row">
    <a href="${href("", "#download")}" class="${cls}">${I.phone}<span><span class="k">${esc(t.store.k1)}</span><span class="v">App Store</span></span>${C}</a>
    <a href="${href("", "#download")}" class="${cls}">${I.play}<span><span class="k">${esc(t.store.k2)}</span><span class="v">Google Play</span></span>${C}</a>
    <a href="${href("", "#download")}" class="btn btn-lg ${light ? "btn-outline-light" : ""}">${I.globe}${esc(t.store.web)}</a>
  </div>`;
};

/* phone screens */
const S = {
  home: (t) => `
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:8px"><span class="avatar">AN</span><b style="font-size:13px">${esc(t.phone.hello)}</b></div>${I.bell}
    </div>
    <div class="scr-box" style="margin-top:20px;padding:14px">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600">${esc(t.phone.total)}</div>
      <div class="scr-amt num" style="margin-top:4px">283 500 <span style="font-size:16px">BIF</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--color-divider)">
        <div><div style="font-size:10px;color:var(--muted)">${esc(t.phone.available)}</div><b class="num" style="font-size:14px">248 500</b></div>
        <div><div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--muted)"><span class="dot" style="width:6px;height:6px"></span>${esc(t.phone.pending)}</div><b class="num" style="font-size:14px;color:var(--muted)">35 000</b></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px">
      ${map(t.phone.actions, ([g, l]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:5px"><span style="width:40px;height:40px;border:1px solid var(--color-divider);display:grid;place-items:center;background:var(--color-bg);font-family:var(--font-heading);font-weight:600;font-size:15px;color:var(--ink-accent)">${g}</span><span style="font-size:10px">${esc(l)}</span></div>`)}
    </div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-top:18px">${esc(t.phone.recent)}</div>
    ${map(t.phone.tx, (x) => `<div class="scr-row"><div><b>${esc(x.n)}</b><small>${esc(x.s)}</small></div><b class="num">${esc(x.a)}</b></div>`)}`,
  account: (t) => `
    <div class="scr-title">${esc(t.scr.s0.title)}</div>
    <div class="scr-lbl" style="margin-top:16px">${esc(t.scr.s0.phone)}</div>
    <div style="display:flex;gap:6px;margin-top:6px"><span class="scr-box" style="margin:0;font-weight:600">+257</span><span class="scr-box acc num" style="margin:0;flex:1">79 41 22 18</span></div>
    <div class="scr-lbl" style="margin-top:18px">${esc(t.scr.s0.otp)}</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-top:6px">${map(["4","8","2","9","1","6"], (d) => `<span class="num" style="aspect-ratio:1/1.2;border:1px solid var(--color-divider);background:var(--color-bg);display:grid;place-items:center;font-weight:600;font-size:16px">${d}</span>`)}</div>
    <div class="scr-box" style="display:flex;align-items:center;gap:12px;margin-top:22px;padding:12px">${I.finger}<div><b>${esc(t.scr.s0.bio)}</b><div style="font-size:10px;color:var(--muted)">${esc(t.scr.s0.bioSub)}</div></div></div>
    <div class="scr-lbl" style="margin-top:18px">${esc(t.scr.s0.pin)}</div>
    <div class="pin-dots" style="gap:10px;margin-top:8px"><span style="width:12px;height:12px"></span><span style="width:12px;height:12px"></span><span style="width:12px;height:12px"></span><span class="empty" style="width:12px;height:12px;animation:none"></span></div>`,
  wallet: (t) => `
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600">${esc(t.phone.total)}</div>
    <div class="scr-amt num" style="font-size:34px">283 500 <span style="font-size:16px">BIF</span></div>
    <div style="margin-top:16px;border:1px solid var(--color-divider);background:var(--color-bg)">
      <div style="padding:14px;border-bottom:1px solid var(--color-divider)"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${esc(t.phone.available)}</span><span>${esc(t.scr.s1.now)}</span></div><div class="num" style="font-family:var(--font-heading);font-weight:600;font-size:24px">248 500 BIF</div></div>
      <div style="padding:14px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span style="display:flex;align-items:center;gap:5px"><span class="dot" style="width:6px;height:6px"></span>${esc(t.phone.pending)}</span><span>${esc(t.scr.s1.eta)}</span></div><div class="num" style="font-family:var(--font-heading);font-weight:600;font-size:24px;color:var(--muted)">35 000 BIF</div></div>
    </div>
    <div style="height:6px;background:var(--color-bg);border:1px solid var(--color-divider);margin-top:14px;display:flex"><span style="width:88%;background:var(--color-accent)"></span></div>
    <p style="font-size:11px;line-height:1.5;color:var(--muted);margin-top:12px">${esc(t.scr.s1.note)}</p>`,
  topup: (t) => `
    <div class="scr-title">${esc(t.scr.topup.title)}</div>
    <div style="display:flex;gap:6px;margin-top:14px"><span class="scr-chip on">${esc(t.scr.topup.in)}</span><span class="scr-chip">${esc(t.scr.topup.out)}</span></div>
    <div class="scr-lbl">${esc(t.scr.topup.from)}</div>
    ${map(t.scr.topup.sources, (s, i) => `<div class="scr-box ${i === 0 ? "acc" : ""}" style="display:flex;justify-content:space-between;align-items:center"><div><b>${esc(s[0])}</b><div style="font-size:10px;color:var(--muted)">${esc(s[1])}</div></div><span style="width:14px;height:14px;border-radius:50%;border:1.5px solid var(--color-accent);${i === 0 ? "background:var(--color-accent);box-shadow:inset 0 0 0 3px var(--color-bg)" : ""}"></span></div>`)}
    <div class="scr-lbl">${esc(t.scr.topup.amount)}</div>
    <div class="scr-amt num">50 000 <span style="font-size:16px">BIF</span></div>
    <div class="scr-btn">${esc(t.scr.topup.btn)}</div>`,
  send: (t) => `
    <div class="scr-title">${esc(t.scr.s2.title)}</div>
    <div class="scr-lbl">${esc(t.demo.to)}</div>
    <div class="scr-box num">+257 68 30 51 07</div>
    <div class="scr-box hl" style="display:flex;align-items:center;gap:10px;margin-top:10px"><span class="avatar" style="background:var(--color-bg)">JN</span><div style="flex:1"><b>Jean-Claude Ndayishimiye</b><div style="font-size:10px;color:var(--ink-accent)">✓ ${esc(t.demo.confirmed)}</div></div></div>
    <div class="scr-lbl">${esc(t.demo.amount)}</div>
    <div class="scr-amt num">20 000 BIF</div>
    <div style="font-size:11px;color:var(--muted)">${esc(t.demo.fee)}</div>
    <div class="scr-btn">${esc(t.scr.s2.btn)}</div>`,
  qr: (t) => `
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="scr-title">${esc(t.scr.s3.title)}</span><span class="tag tag-accent" style="font-size:10px;padding:3px 8px">${esc(t.scr.s3.dyn)}</span></div>
    <div style="margin:16px auto 0;width:100%;max-width:190px">${qr(7)}</div>
    <div class="num" style="text-align:center;margin-top:12px;font-family:var(--font-heading);font-weight:600;font-size:22px">12 500 BIF</div>
    <div style="text-align:center;font-size:11px;color:var(--muted)">${esc(t.scr.s3.exp)} <b class="num" style="color:var(--color-text)">04:52</b></div>
    <div class="scr-box" style="display:flex;align-items:center;gap:8px;margin-top:14px">${I.shield}<div><b>Boutique Mama Divine</b><div style="font-size:10px;color:var(--muted)">${esc(t.scr.s3.verified)}</div></div></div>`,
  bills: (t) => `
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="scr-title">${esc(t.scr.bills.title)}</span>${soon(t)}</div>
    <div class="scr-box" style="display:flex;align-items:center;gap:8px;color:var(--muted);margin-top:12px">${I.search}${esc(t.scr.bills.search)}</div>
    ${map(t.scr.bills.items, (x) => `<div class="scr-row"><div><b>${esc(x[0])}</b><small>${esc(x[1])}</small></div><span style="font-size:10px;color:var(--ink-accent);font-weight:600">${esc(x[2])}</span></div>`)}
    <div class="scr-box acc" style="margin-top:auto"><b>${esc(t.scr.bills.sched)}</b><div style="font-size:10px;color:var(--muted)">${esc(t.scr.bills.schedSub)}</div></div>`,
  history: (t) => `
    <div class="scr-title">${esc(t.scr.s4.title)}</div>
    <div class="scr-box" style="display:flex;align-items:center;gap:8px;color:var(--muted);margin-top:12px">${I.search}${esc(t.scr.s4.search)}</div>
    <div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap">${map(t.scr.s4.filters, (f, i) => `<span class="scr-chip ${i === 0 ? "on" : ""}">${esc(f)}</span>`)}</div>
    ${map(t.scr.s4.rows, (x) => `<div class="scr-row"><div><b>${esc(x.n)}</b><small>${esc(x.s)}</small></div><b class="num">${esc(x.a)}</b></div>`)}
    <div class="scr-box" style="margin-top:auto;border:1px dashed var(--color-accent);display:flex;align-items:center;gap:10px">${I.pdf}<div><b>${esc(t.scr.s4.pdf)}</b><div class="num" style="font-size:10px;color:var(--muted)">ID · SP-7Q4K-29XD-B1</div></div></div>`,
  lang: (t) => `
    <div class="scr-title">${esc(t.scr.s5.title)}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      ${map(LANGS, (o) => `<div class="scr-box" style="margin:0;display:flex;align-items:center;justify-content:space-between;padding:12px;${o.code === L.code ? "border-color:var(--color-accent)" : ""}"><div><b style="font-size:13px">${o.name}</b><div style="font-size:10px;color:var(--muted)">${{ fr: "Bonjour", rn: "Amahoro", en: "Hello" }[o.code]}</div></div><span style="width:16px;height:16px;border-radius:50%;border:1.5px solid var(--color-accent);${o.code === L.code ? "background:var(--color-accent);" : ""}box-shadow:inset 0 0 0 3px var(--color-bg)"></span></div>`)}
    </div>
    <p style="font-size:11px;line-height:1.5;color:var(--muted);margin-top:14px">${esc(t.scr.s5.note)}</p>`,
  control: (t) => `
    <div class="scr-title">${esc(t.scr.control.title)}</div>
    <div style="margin-top:12px">
      ${map(t.scr.control.rows, (r) => `<div class="scr-row"><div><b>${esc(r[0])}</b><small>${esc(r[1])}</small></div><span style="width:30px;height:16px;border:1px solid ${r[2] ? "var(--color-accent)" : "var(--color-divider)"};background:${r[2] ? "var(--color-accent)" : "var(--color-bg)"};position:relative;flex:none"><span style="position:absolute;top:2px;${r[2] ? "right:2px" : "left:2px"};width:10px;height:10px;background:${r[2] ? "var(--color-bg)" : "var(--color-text)"}"></span></span></div>`)}
    </div>
    <div class="scr-box" style="margin-top:auto;border-color:var(--color-text);text-align:center;font-family:var(--font-heading);font-weight:600;font-size:15px;text-transform:uppercase">${esc(t.scr.control.freeze)}</div>`,
  save: (t) => `
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="scr-title">${esc(t.scr.save.title)}</span>${soon(t)}</div>
    <div class="scr-box hl" style="margin-top:14px"><b>${esc(t.scr.save.group)}</b><div style="font-size:10px;color:var(--muted)">${esc(t.scr.save.members)}</div>
      <div class="scr-amt num" style="font-size:24px;margin-top:8px">360 000 BIF</div>
      <div style="height:6px;background:var(--color-bg);border:1px solid var(--color-divider);margin-top:8px;display:flex"><span style="width:60%;background:var(--color-accent)"></span></div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px">${esc(t.scr.save.goal)}</div></div>
    <div class="scr-lbl">${esc(t.scr.save.next)}</div>
    ${map(t.scr.save.rows, (x) => `<div class="scr-row"><div><b>${esc(x[0])}</b><small>${esc(x[1])}</small></div><b class="num">${esc(x[2])}</b></div>`)}`,
  merchant: (t) => `
    <div class="scr-title">${esc(t.scr.merch.title)}</div>
    <div class="scr-box" style="margin-top:12px;padding:14px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600">${esc(t.scr.merch.today)}</div><div class="scr-amt num">184 500 <span style="font-size:16px">BIF</span></div><div style="font-size:10px;color:var(--muted)">${esc(t.scr.merch.count)}</div></div>
    ${map(t.scr.merch.rows, (x) => `<div class="scr-row"><div><b>${esc(x[0])}</b><small>${esc(x[1])}</small></div><b class="num">${esc(x[2])}</b></div>`)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto"><div class="scr-btn" style="margin:0">${esc(t.scr.merch.qr)}</div><div class="scr-btn" style="margin:0;background:var(--color-bg);color:var(--color-text);border:1px solid var(--color-divider)">${esc(t.scr.merch.out)}</div></div>`,
};

const qrStand = (t) => `
  <div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:min(240px,64vw);background:var(--color-bg);border:1.5px solid var(--color-text);padding:18px 18px 16px;box-shadow:var(--shadow-lg);display:flex;flex-direction:column;align-items:center;gap:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%"><span style="font-family:var(--font-heading);font-weight:600;font-size:18px">SamPay</span><span style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-accent);font-weight:600">${esc(t.merch.static)}</span></div>
      <div style="width:100%">${qr(42)}</div>
      <div style="font-family:var(--font-heading);font-weight:600;font-size:20px;text-transform:uppercase;text-align:center;line-height:1.1">${esc(t.merch.scan)}</div>
      <div style="width:100%;border-top:1px dashed var(--color-divider);padding-top:10px;text-align:center"><b style="font-size:13px">Boutique Mama Divine</b><div style="font-size:11px;color:var(--muted)">Kamenge · ${esc(t.merch.verified)}</div></div>
    </div>
    <div aria-hidden="true" style="width:min(150px,40vw);height:26px;border:1.5px solid var(--color-text);border-top:0;background:var(--color-surface)"></div>
    <div aria-hidden="true" style="width:min(220px,58vw);height:8px;border:1.5px solid var(--color-text);background:var(--color-surface)"></div>
  </div>`;

/* ── layout ──────────────────────────────────────────────────────────── */
function layout(page, t, body) {
  const meta = t.meta[page || "home"];
  const navItems = ["features", "merchants", "security", "about", "help"];
  const canon = (lg) => SITE + (lg.prefix + (page ? `/${page}/` : "/")).replace(/^\/\//, "/");
  const langSeg = `<div class="seg" role="group" aria-label="${esc(t.langLabel)}">${map(LANGS, (o) => `<a href="${(o.prefix + (page ? `/${page}/` : "/")).replace(/^\/\//, "/")}" hreflang="${o.code}" lang="${o.code}" data-lang="${o.code}" ${o.code === L.code ? 'aria-current="true"' : ""}><span aria-hidden="true">${o.short}</span><span class="sr">${o.name}</span></a>`)}</div>`;
  const favicon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1d2d3d"/><rect x="5" y="5" width="22" height="22" fill="none" stroke="#f2f2f3" stroke-width="1.5"/><text x="16" y="23" text-anchor="middle" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="18" fill="#f2f2f3">S</text></svg>');
  return `<!doctype html>
<html lang="${L.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta[0])}</title>
<meta name="description" content="${esc(meta[1])}">
<link rel="canonical" href="${canon(L)}">
${map(LANGS, (o) => `<link rel="alternate" hreflang="${o.code}" href="${canon(o)}">\n`)}<link rel="alternate" hreflang="x-default" href="${canon(LANGS[0])}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SamPay">
<meta property="og:title" content="${esc(meta[0])}">
<meta property="og:description" content="${esc(meta[1])}">
<meta property="og:url" content="${canon(L)}">
<meta name="theme-color" content="#1d2d3d">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600&family=Barlow:wght@400;500;600&display=swap">
<script>(function(){var d=document.documentElement;d.className+=" js";var t=null;try{t=localStorage.getItem("sampay-theme")}catch(e){}if(!t)t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-theme",t)})();</script>
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="site-header">
  <nav class="nav" aria-label="${esc(t.nav.label)}">
    <a href="${href("")}" class="brand" aria-label="SamPay — ${esc(t.nav.home)}"><span class="logo bp"><span>S</span><i class="c tl"></i><i class="c br"></i></span><span class="brand-name">SamPay</span></a>
    <div class="nav-links">${map(navItems, (k) => `<a href="${href(k)}" ${k === page ? 'aria-current="page"' : ""}>${esc(t.nav[k])}</a>`)}</div>
    ${langSeg}
    <button type="button" class="btn btn-icon theme-btn" data-theme-toggle aria-label="${esc(t.themeLabel)}" title="${esc(t.themeLabel)}">${I.moon}${I.sun}</button>
    <a href="${href("", "#download")}" class="btn btn-primary bp nav-cta" style="min-height:40px;padding:9px 16px">${esc(t.nav.cta)}${C}</a>
    <button type="button" class="btn btn-icon menu-btn" aria-expanded="false" aria-controls="mobile-menu" aria-label="${esc(t.nav.menu)}">${I.menu}</button>
  </nav>
  <div id="mobile-menu" class="mobile-menu">
    <a class="mm" href="${href("")}"><span style="font:inherit;color:inherit">${esc(t.nav.home)}</span><span>01</span></a>
    ${map(navItems, (k, i) => `<a class="mm" href="${href(k)}" ${k === page ? 'aria-current="page"' : ""}><span style="font:inherit;color:inherit">${esc(t.nav[k])}</span><span>${pad(i + 1)}</span></a>`)}
    <a href="${href("", "#download")}" class="btn btn-primary bp" style="margin-top:20px;min-height:48px">${esc(t.nav.cta)}${C}</a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <div style="display:flex;align-items:center;gap:10px"><span class="logo bp"><span>S</span><i class="c tl"></i><i class="c br"></i></span><span class="brand-name">SamPay</span></div>
        <p class="body" style="margin-top:16px">${esc(t.foot.tag)}</p>
        <p class="small" style="margin-top:10px">${esc(t.foot.founder)}</p>
        <div style="margin-top:20px">${langSeg}</div>
      </div>
      ${map(t.foot.cols, (col) => `<div><div class="foot-h">${esc(col.h)}</div><div class="foot-links">${map(col.links, ([label, pg, hash]) => `<a href="${href(pg, hash || "")}">${esc(label)}</a>`)}</div></div>`)}
      <div>
        <div class="foot-h">${esc(t.foot.contact)}</div>
        <div class="foot-links">
          <a href="mailto:support@sampay.bi">support@sampay.bi</a>
          <a href="tel:+25700000000" class="num">+257 00 00 00 00</a>
          <span class="small">${esc(t.foot.contactPh)}</span>
        </div>
      </div>
    </div>
    <div class="foot-base"><span>© 2026 SamPay. ${esc(t.foot.rights)}</span><span>${esc(t.foot.made)}</span></div>
  </div>
</footer>
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

const pageHero = (t, kicker, title, sub, extra = "") => `
<section class="page-hero">
  <div class="tri" aria-hidden="true"></div>
  <div class="wrap">
    <nav class="crumbs" aria-label="${esc(t.crumbs)}"><a href="${href("")}">SamPay</a><span aria-hidden="true">/</span><span>${esc(kicker)}</span></nav>
    <h1 class="h1-page">${esc(title)}</h1>
    <p class="lead mt-m">${esc(sub)}</p>
    ${extra}
  </div>
</section>`;

const compStrip = (t) => `
<section class="comp" aria-label="${esc(t.comp.label)}">
  <div class="wrap">
    <div style="display:flex;gap:14px;align-items:flex-start;flex:1 1 420px">${I.bank}
      <div><p style="font-size:16px;line-height:1.5;font-weight:500">${esc(t.comp.text)}</p>
      <p class="small" style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${ph(t)}${esc(t.comp.licence)}</p></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 20px">${map(t.comp.links, (l, i) => `<a href="${href("legal", ["#terms", "#privacy", "#aml"][i])}" style="font-size:14px;font-weight:500;min-height:32px;display:inline-flex;align-items:center">${esc(l)}</a>`)}</div>
  </div>
</section>`;

const download = (t) => `
<section id="download" class="band" style="position:relative;overflow:hidden" aria-labelledby="dl-h">
  <div class="band-tri" aria-hidden="true"></div>
  <div class="wrap split" style="position:relative;padding-top:clamp(72px,10vw,120px);padding-bottom:clamp(72px,10vw,120px)">
    <div>
      <h2 id="dl-h" style="font-size:clamp(40px,6vw,80px);line-height:.98;max-width:14ch">${esc(t.final.title)}</h2>
      <p class="lead mt-m">${esc(t.final.sub)}</p>
      <div class="mt-l">${stores(t, true)}</div>
      <p class="small mt-m" style="color:var(--on-dark-muted)">${esc(t.final.note)}</p>
    </div>
    <div style="display:flex;justify-content:center">
      <figure class="bp light-corners" style="padding:22px;display:flex;flex-direction:column;align-items:center;gap:14px;border-color:color-mix(in srgb,#f2f2f3 30%,transparent)">${C}
        <div style="width:min(200px,56vw)">${qr(2026)}</div>
        <figcaption style="font-size:14px;font-weight:600;text-align:center">${esc(t.final.qr)}</figcaption>
        <span style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--on-dark-muted)">${esc(t.final.qrPh)}</span>
      </figure>
    </div>
  </div>
</section>`;

const faqList = (items, start = 0) => `<div class="faq">${map(items, (q, i) => `
  <details ${i === 0 && start === 0 ? "open" : ""}><summary><span class="n">${pad(start + i)}</span><span class="q">${esc(q.q)}</span><span class="pm" aria-hidden="true">+</span></summary><div class="a">${esc(q.a)}</div></details>`)}</div>`;

const ctaBand = (t, title, sub, btn, link) => `
<section class="section tight">
  <div class="wrap">
    <div class="bp" style="padding:clamp(28px,4vw,48px);display:flex;flex-wrap:wrap;gap:24px 48px;align-items:center;justify-content:space-between">${C}
      <div style="flex:1 1 380px"><h2 class="h3">${esc(title)}</h2><p class="body mt-s">${esc(sub)}</p></div>
      <a href="${link}" class="btn btn-primary btn-lg bp">${esc(btn)} ${I.arrow}${C}</a>
    </div>
  </div>
</section>`;

/* demo (home + features) */
const demo = (t) => `
<figure class="bp" data-demo data-caps='${esc(JSON.stringify(t.demo.caps))}' style="padding:clamp(28px,4vw,44px) 20px 20px;display:flex;flex-direction:column;align-items:center;gap:16px">${C}
  <span class="fig-label">Fig. 03 — ${esc(t.demo.title)}</span>
  <div class="phone sm" style="margin-top:16px"><div class="screen" aria-live="polite">
    <div class="demo-bars"><span class="on"></span><span></span><span></span><span></span></div>
    <div data-frame style="display:flex;flex-direction:column;flex:1">
      <div class="scr-lbl" style="margin:0">${esc(t.demo.to)}</div>
      <div class="scr-box acc num" style="font-size:15px">+257 79 41 22 1<span style="animation:sp-pulse 1s infinite">|</span></div>
      <div class="keypad">${map(["1","2","3","4","5","6","7","8","9","+","0","⌫"], (k) => `<span>${k}</span>`)}</div>
    </div>
    <div data-frame hidden style="flex-direction:column;flex:1">
      <div class="scr-box hl" style="display:flex;align-items:center;gap:10px;margin:0"><span class="avatar" style="background:var(--color-bg)">AN</span><div><b style="font-size:13px">Aline Niyonkuru</b><div style="font-size:10px;color:var(--ink-accent)">✓ ${esc(t.demo.confirmed)}</div></div></div>
      <div class="scr-lbl" style="margin-top:18px">${esc(t.demo.amount)}</div>
      <div class="scr-amt num" style="font-size:36px">15 000 <span style="font-size:16px">BIF</span></div>
      <div style="font-size:11px;color:var(--muted)">${esc(t.demo.fee)}</div>
      <div class="scr-btn">${esc(t.demo.pay)}</div>
    </div>
    <div data-frame hidden style="flex:1;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center">
      ${I.lock}<b style="font-size:14px">${esc(t.demo.pin)}</b>
      <div class="pin-dots"><span></span><span></span><span></span><span class="empty"></span></div>
    </div>
    <div data-frame hidden style="flex-direction:column;flex:1">
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;margin-top:8px"><span style="width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--color-accent);color:var(--color-bg)">${I.check}</span><div style="font-family:var(--font-heading);font-weight:600;font-size:20px;text-transform:uppercase;margin-top:6px">${esc(t.demo.sent)}</div></div>
      <div style="margin-top:14px;border:1px dashed var(--color-divider);background:var(--color-bg);padding:12px;display:flex;flex-direction:column;gap:7px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">${esc(t.demo.toShort)}</span><b>Aline N.</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">${esc(t.demo.amount)}</span><b class="num">15 000 BIF</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">${esc(t.demo.date)}</span><span class="num">19/10/2026 · 09:42</span></div>
        <div style="border-top:1px solid var(--color-divider);padding-top:7px;font-size:10px;color:var(--muted)">${esc(t.demo.ref)}</div>
        <b class="num" style="letter-spacing:.04em">SP-3HXN-80KD-V7</b>
      </div>
    </div>
  </div></div>
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center">
    <span data-caption style="font-size:14px;color:var(--muted);min-width:20ch;text-align:center">${esc(t.demo.caps[0])}</span>
    <button type="button" class="btn" data-demo-toggle data-pause="${esc(t.demo.pause)}" data-play="${esc(t.demo.play)}" style="min-height:40px">${esc(t.demo.pause)}</button>
  </div>
</figure>`;

const steps = (t) => `<ol class="steps">${map(t.how.steps, (s, i) => `
  <li class="bp ${i === 0 ? "on" : ""}" data-step data-reveal style="cursor:pointer">${C}<span class="sn num">${pad(i)}</span><span class="st">${esc(s.t)}</span><span class="sd">${esc(s.d)}</span></li>`)}</ol>`;

/* countries explorer */
const COUNTRIES = [
  { id: "bi", flag: "🇧🇮", cur: "BIF", live: true, area: "3 / 3 / 4 / 4" },
  { id: "cd", flag: "🇨🇩", cur: "CDF", area: "1 / 1 / 5 / 3" },
  { id: "rw", flag: "🇷🇼", cur: "RWF", area: "2 / 3 / 3 / 4" },
  { id: "tz", flag: "🇹🇿", cur: "TZS", area: "2 / 4 / 5 / 6" },
  { id: "ug", flag: "🇺🇬", cur: "UGX", area: "1 / 3 / 2 / 5" },
];
const countries = (t) => {
  const nm = (c) => t.ctry.names[c.id];
  const attrs = (c) => `data-c="${c.id}" data-name="${esc(nm(c))}" ${c.live ? "data-live" : ""} aria-pressed="false"`;
  return `
<div class="split top" data-countries data-current="cd" style="margin-top:56px">
  <figure class="bp" style="padding:clamp(20px,3vw,32px)">${C}
    <div class="map">
      ${map(COUNTRIES, (c) => `<button type="button" class="tile ${c.live ? "live" : ""}" style="grid-area:${c.area}" ${attrs(c)} aria-label="${esc(nm(c))} — ${esc(c.live ? t.ctry.live : t.ctry.soon)}"><span class="tn">${esc(nm(c))}</span><span class="tc num">${c.cur}</span></button>`)}
      <span class="lake" style="grid-area:4 / 3 / 5 / 4">${esc(t.ctry.lake1)}</span>
      <span class="lake" style="grid-area:1 / 5 / 2 / 6">${esc(t.ctry.lake2)}</span>
    </div>
    <figcaption class="small" style="margin-top:14px;font-size:11px;letter-spacing:.04em">Fig. 05 — ${esc(t.ctry.fig)}</figcaption>
  </figure>
  <div>
    <ul style="border-top:1px solid var(--color-divider)">
      ${map(COUNTRIES, (c) => `<li><button type="button" class="c-row" ${attrs(c)}><span style="font-size:20px" aria-hidden="true">${c.flag}</span><span class="cn">${esc(nm(c))}</span><span class="small num">${c.cur}</span><span class="tag ${c.live ? "tag-accent" : "tag-outline"}">${esc(c.live ? t.ctry.live : t.ctry.soon)}</span></button></li>`)}
    </ul>
    <div class="bp c-panel" style="margin-top:32px;padding:24px">${C}
      <div data-cpanel="live" hidden>
        <div class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase;font-size:24px">${esc(t.ctry.liveTitle)}</div>
        <p class="body" style="margin:8px 0 16px">${esc(t.ctry.liveSub)}</p>
        <a href="${href("", "#download")}" class="btn btn-primary bp">${esc(t.nav.cta)}${C}</a>
      </div>
      <div data-cpanel="wait">
        <form data-local>
          <label for="wl-email" style="display:block;font-family:var(--font-heading);font-weight:600;font-size:24px;text-transform:uppercase;line-height:1.1">${esc(t.ctry.wait)} <span data-cname>${esc(t.ctry.names.cd)}</span></label>
          <p class="body" style="margin:8px 0 16px">${esc(t.ctry.waitSub)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px"><input id="wl-email" class="input" type="email" required autocomplete="email" placeholder="${esc(t.ctry.email)}" style="flex:1 1 220px"><button type="submit" class="btn btn-primary bp" style="min-height:48px">${esc(t.ctry.btn)}${C}</button></div>
        </form>
        <div class="form-ok" role="status"><span style="font-family:var(--font-heading);font-weight:600;font-size:24px;text-transform:uppercase">✓ ${esc(t.ctry.done)} <span data-cname>${esc(t.ctry.names.cd)}</span></span><span class="body">${esc(t.ctry.okSub)}</span><button type="button" class="btn btn-ghost" data-again style="align-self:flex-start">${esc(t.ctry.again)}</button></div>
      </div>
    </div>
  </div>
</div>`;
};

const merchantForm = (t) => `
<div id="apply" class="bp" style="margin-top:clamp(56px,7vw,88px);padding:clamp(24px,4vw,48px);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:32px 56px">${C}
  <div>
    <h3 class="h3">${esc(t.merch.form.title)}</h3>
    <p class="body mt-s" style="max-width:40ch">${esc(t.merch.form.sub)}</p>
    <p class="small mt-m" style="max-width:40ch">${esc(t.merch.form.privacy)}</p>
  </div>
  <div>
    <form data-local class="form-grid">
      <div class="field"><label for="m-biz">${esc(t.merch.form.biz)}</label><input id="m-biz" class="input" required autocomplete="organization" placeholder="${esc(t.merch.form.bizPh)}"></div>
      <div class="field"><label for="m-name">${esc(t.merch.form.owner)}</label><input id="m-name" class="input" required autocomplete="name"></div>
      <div class="field"><label for="m-phone">${esc(t.merch.form.phone)}</label><div class="prefix"><span>+257</span><input id="m-phone" class="input num" required type="tel" inputmode="tel" autocomplete="tel-national" pattern="[0-9 ]{8,11}" placeholder="79 00 00 00"></div></div>
      <div class="field"><label for="m-prov">${esc(t.merch.form.province)}</label><select id="m-prov" class="input" required><option value="">${esc(t.merch.form.choose)}</option>${map(["Buhumuza", "Bujumbura", "Burunga", "Butanyerera", "Gitega"], (p) => `<option>${p}</option>`)}</select></div>
      <fieldset class="field full" style="border:0;padding:0;margin:0"><legend class="lbl" style="font-size:13px;margin-bottom:8px;color:color-mix(in srgb,var(--color-text) 70%,transparent)">${esc(t.merch.form.type)}</legend>
        <div style="display:flex;flex-wrap:wrap;gap:10px 20px">${map(t.merch.form.types, (ty, i) => `<label class="radio"><input type="radio" name="m-type" value="${esc(ty)}" ${i === 0 ? "required" : ""}><span class="rd"></span>${esc(ty)}</label>`)}</div>
      </fieldset>
      <div class="full" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><button type="submit" class="btn btn-primary btn-lg bp">${esc(t.merch.form.submit)}${C}</button><span class="small">${esc(t.merch.form.req)}</span></div>
    </form>
    <div class="form-ok" role="status"><span class="h3" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(t.merch.form.ok)}</span><span class="body">${esc(t.merch.form.okSub)}</span><button type="button" class="btn btn-ghost" data-again style="align-self:flex-start">${esc(t.merch.form.again)}</button></div>
  </div>
</div>`;

/* ── pages ───────────────────────────────────────────────────────────── */
const P = {};

P[""] = (t) => {
  const tabsScreens = ["account", "wallet", "send", "qr", "history", "lang"];
  return `
<section id="top" style="position:relative;overflow:hidden;border-bottom:1px solid var(--color-divider)">
  <div class="tri" aria-hidden="true"></div>
  <div class="wrap split" style="position:relative;padding-top:clamp(40px,7vw,96px);padding-bottom:clamp(56px,8vw,104px);gap:clamp(48px,6vw,80px)">
    <div>
      <span class="tag tag-accent" style="padding:6px 12px;font-size:13px"><span class="dot"></span>${esc(t.badge)}</span>
      <h1 class="h1" style="margin-top:24px;max-width:11ch"><span style="display:block">${esc(t.hero.l1)}</span><span style="display:block;color:var(--ink-accent)">${esc(t.hero.l2)}</span></h1>
      <p class="lead" style="margin-top:28px;max-width:46ch">${esc(t.hero.sub)}</p>
      <div class="mt-l">${stores(t)}</div>
      <p class="small" style="display:flex;align-items:center;gap:8px;margin-top:20px;font-size:14px">${I.signal}${esc(t.hero.note)}</p>
    </div>
    <div class="stage" style="padding:24px 0">
      <div class="halo" aria-hidden="true"></div>
      <figure class="bp" style="padding:clamp(20px,3vw,36px) clamp(28px,5vw,56px)">${C}
        <span style="position:absolute;top:-22px;left:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600">Fig. 01 — ${esc(t.phone.fig)}</span>
        <div class="float">${phone(S.home(t))}</div>
        <figcaption class="small" style="margin-top:16px;font-size:11px;text-align:center">${esc(t.demoData)}</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="strip" aria-label="${esc(t.trust.label)}"><div class="wrap">
  <span class="kicker" style="font-size:12px;color:var(--muted)">${esc(t.trust.label)}</span>
  <div style="display:flex;flex-wrap:wrap;gap:8px">${map(t.trust.items, (p) => `<span class="pill">${esc(p)}</span>`)}</div>
  <span class="small" style="font-size:12px;flex:1 1 220px;text-align:right">${esc(t.trust.note)}</span>
</div></section>

<section class="section" aria-labelledby="problem-h"><div class="wrap">
  ${head(t.problem.kicker)}
  <h2 id="problem-h" class="h2" data-reveal>${esc(t.problem.title)}</h2>
  <div class="cards mt-xl">${map(t.problem.stats, (s) => `<div class="bp card" data-reveal style="min-height:220px">${C}<span class="n">${esc(s.n)}</span><span class="stat-v num">${esc(s.v)}</span><span style="font-size:17px;line-height:1.4;max-width:24ch">${esc(s.l)}</span></div>`)}</div>
  <p class="small" style="margin-top:20px;display:flex;gap:8px;align-items:baseline">${ph(t)}${esc(t.problem.src)}</p>
  <div class="split end" style="margin-top:64px">
    <p class="lead" style="font-size:17px">${esc(t.problem.interop)}</p>
    <p data-reveal style="font-family:var(--font-heading);font-weight:600;font-size:clamp(34px,4.6vw,60px);line-height:1;text-transform:uppercase;color:var(--ink-accent)">${esc(t.problem.line)}</p>
  </div>
</div></section>

<section id="features" class="section" aria-labelledby="features-h"><div class="wrap">
  ${head(t.features.kicker)}
  <div class="split end"><h2 id="features-h" class="h2" style="max-width:20ch">${esc(t.features.title)}</h2><p class="lead">${esc(t.features.sub)}</p></div>
  <div class="split top mt-xl">
    <div class="tabs" role="tablist" aria-orientation="vertical" aria-label="${esc(t.features.kicker)}" data-tabs>
      ${map(t.features.items, (f, i) => `<button type="button" role="tab" class="tab" id="ftab-${i}" aria-selected="${i === 0}" aria-controls="fpanel-${i}" ${i ? 'tabindex="-1"' : ""} data-fig="Fig. 02.${i + 1}"><span class="n">${pad(i)}</span><span class="t">${esc(f.t)}</span><span class="d">${esc(f.d)}</span></button>`)}
      <a href="${href("features")}" class="btn btn-primary bp btn-lg" style="margin-top:28px;align-self:flex-start">${esc(t.features.all)} ${I.arrow}${C}</a>
    </div>
    <figure class="bp glow sticky" style="padding:clamp(28px,4vw,48px) 20px;display:grid;place-items:center">${C}
      <span class="fig-label num" data-tab-label>Fig. 02.1</span>
      ${map(tabsScreens, (k, i) => `<div id="fpanel-${i}" role="tabpanel" aria-labelledby="ftab-${i}" class="panel" ${i ? "hidden" : ""}>${phone(S[k](t))}</div>`)}
    </figure>
  </div>
</div></section>

<section class="section" aria-labelledby="more-h"><div class="wrap">
  ${head(t.more.kicker)}
  <h2 id="more-h" class="h2">${esc(t.more.title)}</h2>
  <div class="cards mt-xl">${map(t.fp.sections, (s, i) => `<a href="${href("features", "#" + s.id)}" class="bp card" data-reveal style="text-decoration:none;color:var(--color-text)">${C}<span class="n">F-${pad(i)}${s.soon ? " · " + esc(t.soonTag) : ""}</span><span class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(s.t)}</span><span class="d">${esc(s.short)}</span><span class="more" style="color:var(--ink-accent)">${esc(t.more.link)} ${I.arrow}</span></a>`)}</div>
</div></section>

<section id="how" class="section" aria-labelledby="how-h"><div class="wrap">
  ${head(t.how.kicker)}
  <h2 id="how-h" class="h2" style="max-width:20ch">${esc(t.how.title)}</h2>
  <div class="split mt-xl">${steps(t)}${demo(t)}</div>
</div></section>

<section id="merchants" class="section" aria-labelledby="merch-h"><div class="wrap">
  ${head(t.merch.kicker)}
  <div class="split">
    <div>
      <h2 id="merch-h" class="h2" style="max-width:16ch">${esc(t.merch.title)}</h2>
      <p class="lead mt-m" style="font-size:17px">${esc(t.merch.sub)}</p>
      <div class="list-rows mt-l">${map(t.merch.benefits, (b) => `<div data-reveal><span class="n">${esc(b.n)}</span><span class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(b.t)}</span><span class="d">${esc(b.d)}</span></div>`)}</div>
      <div class="btn-row mt-l"><a href="${href("merchants", "#apply")}" class="btn btn-primary btn-lg bp">${esc(t.merch.form.title)}${C}</a><a href="${href("merchants")}" class="btn btn-lg">${esc(t.merch.more)} ${I.arrow}</a></div>
    </div>
    <figure class="bp hatch stage">${C}<span class="fig-label">Fig. 04 — ${esc(t.merch.fig)}</span><div style="margin-top:12px">${qrStand(t)}</div></figure>
  </div>
</div></section>

<section id="security" class="band section" aria-labelledby="sec-h"><div class="wrap">
  ${head(t.sec.kicker)}
  <div class="split end"><h2 id="sec-h" class="h2" style="max-width:18ch">${esc(t.sec.title)}</h2><p class="lead" style="font-size:17px">${esc(t.sec.sub)}</p></div>
  <div class="grid-lines mt-xl">${map(t.sec.items, (s) => `<div data-reveal><span class="n">${esc(s.n)}</span><span class="t">${esc(s.t)}</span><span class="d">${esc(s.d)}</span></div>`)}</div>
  <a href="${href("security")}" class="btn btn-lg btn-light mt-l">${esc(t.sec.more)} ${I.arrow}</a>
</div></section>

<section id="countries" class="section" aria-labelledby="ctry-h"><div class="wrap">
  ${head(t.ctry.kicker)}
  <h2 id="ctry-h" class="h2" style="max-width:20ch">${esc(t.ctry.title)}</h2>
  <p class="lead mt-m" style="font-size:17px;max-width:56ch">${esc(t.ctry.sub)}</p>
  ${countries(t)}
</div></section>

${compStrip(t)}

<section id="faq" class="section" aria-labelledby="faq-h"><div class="wrap split top">
  <div class="sticky">
    ${head(t.faq.kicker)}
    <h2 id="faq-h" class="h2" style="max-width:14ch">${esc(t.faq.title)}</h2>
    <p class="body mt-m" style="max-width:36ch">${esc(t.faq.sub)} <a href="mailto:support@sampay.bi">support@sampay.bi</a></p>
    <a href="${href("help")}" class="btn btn-lg mt-m">${esc(t.faq.all)} ${I.arrow}</a>
  </div>
  ${faqList(t.faq.items)}
</div></section>

${download(t)}`;
};

P.features = (t) => {
  const fp = t.fp;
  const screens = { account: "account", wallet: "wallet", money: "topup", send: "send", qr: "qr", bills: "bills", history: "history", access: "lang", control: "control", save: "save" };
  return `
${pageHero(t, t.nav.features, fp.title, fp.sub, `<div class="toc">${map(fp.sections, (s, i) => `<a href="#${s.id}"><span>${pad(i)}</span>${esc(s.t)}</a>`)}</div>`)}
<div class="wrap">
  ${map(fp.sections, (s, i) => `
  <section id="${s.id}" class="feat ${i % 2 ? "flip" : ""}" aria-labelledby="${s.id}-h">
    <div>
      <span class="kicker">F-${pad(i)} · ${esc(s.k)} ${s.soon ? soon(t) : ""}</span>
      <h2 id="${s.id}-h" class="h2 mt-s" style="max-width:18ch">${esc(s.t)}</h2>
      <p class="lead mt-m" style="font-size:17px">${esc(s.d)}</p>
      <ul class="feat-list">${map(s.items, (it) => `<li><b>${esc(it[0])}${it[2] ? ` <span class="tag-ph" style="margin-left:6px;vertical-align:2px">${esc(it[2])}</span>` : ""}</b><span>${esc(it[1])}</span></li>`)}</ul>
    </div>
    <figure class="bp glow feat-fig">${C}<span class="fig-label">Fig. F-${pad(i)}</span>${s.id === "region"
      ? `<div style="width:100%;max-width:420px"><ul style="border-top:1px solid var(--color-divider)">${map(COUNTRIES, (c) => `<li class="c-row" style="cursor:default"><span style="font-size:20px" aria-hidden="true">${c.flag}</span><span class="cn">${esc(t.ctry.names[c.id])}</span><span class="small num">${c.cur}</span><span class="tag ${c.live ? "tag-accent" : "tag-outline"}">${esc(c.live ? t.ctry.live : t.ctry.soon)}</span></li>`)}</ul><a href="${href("about", "#countries")}" class="btn btn-primary bp mt-m">${esc(fp.regionCta)} ${I.arrow}${C}</a></div>`
      : phone(S[screens[s.id]](t))}</figure>
  </section>`)}
</div>
<section class="section" style="border-top:1px solid var(--color-divider)" aria-labelledby="how-h"><div class="wrap">
  ${head(t.how.kicker)}
  <h2 id="how-h" class="h2" style="max-width:20ch">${esc(t.how.title)}</h2>
  <div class="split mt-xl">${steps(t)}${demo(t)}</div>
</div></section>
<section class="section" style="border-top:1px solid var(--color-divider)" aria-labelledby="plat-h"><div class="wrap">
  ${head(fp.plat.kicker)}
  <h2 id="plat-h" class="h2">${esc(fp.plat.title)}</h2>
  <div class="cards mt-xl">${map(fp.plat.items, (p) => `<div class="bp card" data-reveal>${C}<span class="n">${esc(p[0])}</span><span class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(p[1])}</span><span class="d">${esc(p[2])}</span></div>`)}</div>
</div></section>
${download(t)}`;
};

P.merchants = (t) => {
  const m = t.mp;
  return `
${pageHero(t, t.nav.merchants, m.title, m.sub, `<div class="btn-row mt-l"><a href="#apply" class="btn btn-primary btn-lg bp">${esc(t.merch.form.title)}${C}</a><a href="#how-m" class="btn btn-lg">${esc(m.howBtn)}</a></div>`)}
<section class="section" aria-labelledby="who-h"><div class="wrap">
  ${head(m.who.kicker)}
  <h2 id="who-h" class="h2">${esc(m.who.title)}</h2>
  <div class="cards mt-xl">${map(m.who.items, (w, i) => `<div class="bp card" data-reveal>${C}<span class="n">W-${pad(i)}</span><span class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(w[0])}</span><span class="d">${esc(w[1])}</span></div>`)}</div>
</div></section>
<section class="section" aria-labelledby="tools-h"><div class="wrap">
  ${head(m.tools.kicker)}
  <div class="split top">
    <div>
      <h2 id="tools-h" class="h2" style="max-width:16ch">${esc(m.tools.title)}</h2>
      <ul class="feat-list">${map(m.tools.items, (it) => `<li><b>${esc(it[0])}${it[2] ? ` <span class="tag-ph" style="margin-left:6px;vertical-align:2px">${esc(it[2])}</span>` : ""}</b><span>${esc(it[1])}</span></li>`)}</ul>
    </div>
    <div style="display:grid;gap:40px">
      <figure class="bp hatch stage">${C}<span class="fig-label">Fig. M-01 — ${esc(t.merch.fig)}</span><div style="margin-top:12px">${qrStand(t)}</div></figure>
      <figure class="bp glow stage">${C}<span class="fig-label">Fig. M-02 — ${esc(m.tools.fig2)}</span>${phone(S.merchant(t))}</figure>
    </div>
  </div>
</div></section>
<section id="how-m" class="section" aria-labelledby="mhow-h"><div class="wrap">
  ${head(m.how.kicker)}
  <h2 id="mhow-h" class="h2">${esc(m.how.title)}</h2>
  <ol class="steps mt-xl">${map(m.how.steps, (s, i) => `<li class="bp" data-reveal>${C}<span class="sn num">${pad(i)}</span><span class="st">${esc(s[0])}</span><span class="sd">${esc(s[1])}</span></li>`)}</ol>
  ${merchantForm(t)}
</div></section>
<section class="band section" aria-labelledby="mtrust-h"><div class="wrap">
  ${head(m.trust.kicker)}
  <h2 id="mtrust-h" class="h2">${esc(m.trust.title)}</h2>
  <div class="grid-lines mt-xl">${map(m.trust.items, (s, i) => `<div data-reveal><span class="n">T-${pad(i)}</span><span class="t">${esc(s[0])}</span><span class="d">${esc(s[1])}</span></div>`)}</div>
</div></section>
<section class="section" aria-labelledby="mfaq-h"><div class="wrap split top">
  <div>${head(t.faq.kicker)}<h2 id="mfaq-h" class="h2" style="max-width:14ch">${esc(m.faqTitle)}</h2></div>
  ${faqList(m.faq)}
</div></section>
${download(t)}`;
};

P.security = (t) => {
  const s = t.sp;
  return `
${pageHero(t, t.nav.security, t.sec.title, s.sub)}
<section class="band section" aria-labelledby="sec-h"><div class="wrap">
  ${head(t.sec.kicker)}
  <h2 id="sec-h" class="h2" style="max-width:18ch">${esc(s.basicsTitle)}</h2>
  <div class="grid-lines mt-xl">${map(t.sec.items, (x) => `<div data-reveal><span class="n">${esc(x.n)}</span><span class="t">${esc(x.t)}</span><span class="d">${esc(x.d)}</span></div>`)}</div>
</div></section>
<section class="section" aria-labelledby="core-h"><div class="wrap">
  ${head(s.core.kicker)}
  <div class="split end"><h2 id="core-h" class="h2" style="max-width:18ch">${esc(s.core.title)}</h2><p class="lead" style="font-size:17px">${esc(s.core.sub)}</p></div>
  <div class="cards wide mt-xl">${map(s.core.items, (x, i) => `<div class="bp card" data-reveal>${C}<span class="n">C-${pad(i)}</span><span class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(x[0])}</span><span class="d">${esc(x[1])}</span><span class="small" style="margin-top:auto;padding-top:10px;border-top:1px dashed var(--color-divider)"><b style="color:var(--ink-accent)">${esc(s.techLabel)}</b> ${esc(x[2])}</span></div>`)}</div>
  <div class="bp mt-xl" style="padding:clamp(24px,4vw,40px)">${C}
    <h3 class="h4">${esc(s.life.title)}</h3>
    <p class="body mt-s" style="max-width:60ch">${esc(s.life.sub)}</p>
    <div class="lifecycle">${map(s.life.states, (st, i) => `${i ? "<i>→</i>" : ""}<span class="${i === 3 ? "ok" : ""}">${esc(st)}</span>`)}<i>/</i><span>${esc(s.life.alt[0])}</span><i>/</i><span>${esc(s.life.alt[1])}</span></div>
  </div>
</div></section>
<section class="section" aria-labelledby="data-h"><div class="wrap split top">
  <div>${head(s.data.kicker)}<h2 id="data-h" class="h2" style="max-width:16ch">${esc(s.data.title)}</h2><p class="lead mt-m" style="font-size:17px">${esc(s.data.sub)}</p></div>
  <ul class="feat-list">${map(s.data.items, (it) => `<li><b>${esc(it[0])}</b><span>${esc(it[1])}</span></li>`)}</ul>
</div></section>
<section class="section" aria-labelledby="team-h"><div class="wrap split top">
  <div>${head(s.team.kicker)}<h2 id="team-h" class="h2" style="max-width:16ch">${esc(s.team.title)}</h2><p class="lead mt-m" style="font-size:17px">${esc(s.team.sub)}</p></div>
  <ul class="feat-list">${map(s.team.items, (it) => `<li><b>${esc(it[0])}</b><span>${esc(it[1])}</span></li>`)}</ul>
</div></section>
<section class="section" aria-labelledby="tips-h"><div class="wrap">
  ${head(s.tips.kicker)}
  <h2 id="tips-h" class="h2">${esc(s.tips.title)}</h2>
  <div class="cards mt-xl">${map(s.tips.items, (x, i) => `<div class="bp card" data-reveal>${C}<span class="n">P-${pad(i)}</span><span class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(x[0])}</span><span class="d">${esc(x[1])}</span></div>`)}</div>
</div></section>
${ctaBand(t, s.report.title, s.report.sub, s.report.btn, href("help", "#contact"))}
${compStrip(t)}
${download(t)}`;
};

P.about = (t) => {
  const a = t.ap;
  return `
${pageHero(t, t.nav.about, a.title, a.sub)}
<section class="section" aria-labelledby="story-h"><div class="wrap split top">
  <div>${head(a.story.kicker)}<h2 id="story-h" class="h2" style="max-width:16ch">${esc(a.story.title)}</h2></div>
  <div style="display:grid;gap:18px">${map(a.story.paras, (p) => `<p class="lead" style="font-size:17px;max-width:60ch">${esc(p)}</p>`)}</div>
</div></section>
<section class="section" aria-labelledby="stats-h"><div class="wrap">
  ${head(t.problem.kicker)}
  <h2 id="stats-h" class="h2" data-reveal>${esc(t.problem.title)}</h2>
  <div class="cards mt-xl">${map(t.problem.stats, (s) => `<div class="bp card" data-reveal style="min-height:200px">${C}<span class="n">${esc(s.n)}</span><span class="stat-v num">${esc(s.v)}</span><span style="font-size:17px;line-height:1.4;max-width:24ch">${esc(s.l)}</span></div>`)}</div>
  <p class="small" style="margin-top:20px;display:flex;gap:8px;align-items:baseline">${ph(t)}${esc(t.problem.src)}</p>
</div></section>
<section class="band section" aria-labelledby="values-h"><div class="wrap">
  ${head(a.values.kicker)}
  <h2 id="values-h" class="h2">${esc(a.values.title)}</h2>
  <div class="grid-lines mt-xl">${map(a.values.items, (v, i) => `<div data-reveal><span class="n">V-${pad(i)}</span><span class="t">${esc(v[0])}</span><span class="d">${esc(v[1])}</span></div>`)}</div>
</div></section>
<section class="section" aria-labelledby="founder-h"><div class="wrap split">
  <figure class="bp hatch stage" style="min-height:320px">${C}<span class="fig-label">Fig. A-01</span>
    <div style="text-align:center"><div class="bp" style="width:120px;height:120px;margin:0 auto;display:grid;place-items:center;border-color:var(--color-text);font-family:var(--font-heading);font-weight:600;font-size:48px;background:var(--color-bg)">SN<i class="c tl"></i><i class="c br"></i></div><div class="h4" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase;margin-top:18px">Sam Ntaco</div><div class="small">${esc(a.founder.role)}</div></div>
  </figure>
  <div>${head(a.founder.kicker)}<h2 id="founder-h" class="h2" style="max-width:18ch">${esc(a.founder.title)}</h2><p class="lead mt-m" style="font-size:17px">${esc(a.founder.text)}</p></div>
</div></section>
<section id="countries" class="section" aria-labelledby="ctry-h"><div class="wrap">
  ${head(t.ctry.kicker)}
  <h2 id="ctry-h" class="h2" style="max-width:20ch">${esc(t.ctry.title)}</h2>
  <p class="lead mt-m" style="font-size:17px;max-width:56ch">${esc(t.ctry.sub)}</p>
  ${countries(t)}
  <h3 class="h4 mt-xl">${esc(a.markets.title)}</h3>
  <div class="table-wrap mt-m"><table class="table"><thead><tr>${map(a.markets.head, (h) => `<th scope="col">${esc(h)}</th>`)}</tr></thead><tbody>
    ${map(a.markets.rows, (r) => `<tr>${map(r, (c, i) => i === 0 ? `<th scope="row" style="text-align:left;font-weight:600;padding:12px;border-bottom:1px solid color-mix(in srgb,var(--color-text) 8%,transparent)">${esc(c)}</th>` : `<td>${esc(c)}</td>`)}</tr>`)}
  </tbody></table></div>
  <p class="small mt-s" style="display:flex;gap:8px;align-items:baseline">${ph(t)}${esc(a.markets.note)}</p>
</div></section>
<section class="section" aria-labelledby="reg-h"><div class="wrap split top">
  <div>${head(a.reg.kicker)}<h2 id="reg-h" class="h2" style="max-width:16ch">${esc(a.reg.title)}</h2></div>
  <ul class="feat-list">${map(a.reg.items, (it) => `<li><b>${esc(it[0])}</b><span>${esc(it[1])}</span></li>`)}</ul>
</div></section>
${ctaBand(t, a.partner.title, a.partner.sub, a.partner.btn, href("help", "#contact"))}
${download(t)}`;
};

P.help = (t) => {
  const h = t.hp;
  let n = 0;
  return `
${pageHero(t, t.nav.help, h.title, h.sub, `<div class="toc">${map(h.groups, (g, i) => `<a href="#${g.id}"><span>${pad(i)}</span>${esc(g.t)}</a>`)}<a href="#contact"><span>${pad(h.groups.length)}</span>${esc(h.contact.kicker)}</a></div>`)}
<section class="section"><div class="wrap">
  ${map(h.groups, (g) => { const html = `<div id="${g.id}" class="faq-group split top" style="scroll-margin-top:96px"><div><span class="kicker">${esc(g.t)}</span><div class="rule"></div><p class="body" style="max-width:34ch">${esc(g.d)}</p></div>${faqList(g.items, n)}</div>`; n += g.items.length; return html; })}
</div></section>
<section id="contact" class="section" aria-labelledby="contact-h"><div class="wrap">
  ${head(h.contact.kicker)}
  <div class="split top">
    <div>
      <h2 id="contact-h" class="h2" style="max-width:14ch">${esc(h.contact.title)}</h2>
      <p class="lead mt-m" style="font-size:17px">${esc(h.contact.sub)}</p>
      <ul class="feat-list">${map(h.contact.channels, (c) => `<li><b>${esc(c[0])}</b><span>${esc(c[1])}</span></li>`)}</ul>
      <p class="small mt-s" style="display:flex;gap:8px;align-items:baseline">${ph(t)}${esc(t.foot.contactPh)}</p>
    </div>
    <div class="bp" style="padding:clamp(24px,4vw,40px)">${C}
      <form data-local class="form-grid">
        <div class="field"><label for="c-name">${esc(h.contact.form.name)}</label><input id="c-name" class="input" required autocomplete="name"></div>
        <div class="field"><label for="c-phone">${esc(h.contact.form.phone)}</label><input id="c-phone" class="input num" required type="tel" inputmode="tel" autocomplete="tel"></div>
        <div class="field full"><label for="c-topic">${esc(h.contact.form.topic)}</label><select id="c-topic" class="input" required><option value="">${esc(t.merch.form.choose)}</option>${map(h.contact.form.topics, (o) => `<option>${esc(o)}</option>`)}</select></div>
        <div class="field full"><label for="c-msg">${esc(h.contact.form.msg)}</label><textarea id="c-msg" class="input" required></textarea></div>
        <p class="small full">${esc(h.contact.form.warn)}</p>
        <div class="full"><button type="submit" class="btn btn-primary btn-lg bp">${esc(h.contact.form.submit)}${C}</button></div>
      </form>
      <div class="form-ok" role="status"><span class="h3" style="font-family:var(--font-heading);font-weight:600;text-transform:uppercase">${esc(h.contact.form.ok)}</span><span class="body">${esc(h.contact.form.okSub)}</span><button type="button" class="btn btn-ghost" data-again style="align-self:flex-start">${esc(t.merch.form.again)}</button></div>
    </div>
  </div>
</div></section>
${download(t)}`;
};

P.legal = (t) => {
  const g = t.lp;
  return `
${pageHero(t, g.kicker, g.title, g.sub, `<div class="toc">${map(g.docs, (d, i) => `<a href="#${d.id}"><span>${pad(i)}</span>${esc(d.t)}</a>`)}</div>`)}
<section class="section"><div class="wrap">
  <div class="notice prose">${esc(g.notice)}</div>
  <div class="prose">
    ${map(g.docs, (d) => `<h2 id="${d.id}" style="scroll-margin-top:96px">${esc(d.t)}</h2>${map(d.parts, (p) => `<h3>${esc(p[0])}</h3><p>${esc(p[1])}</p>`)}`)}
  </div>
</div></section>
${compStrip(t)}`;
};

/* ── build ───────────────────────────────────────────────────────────── */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, "static"), OUT, { recursive: true });
let count = 0;
for (const lang of LANGS) {
  L = lang;
  for (const page of PAGES) {
    const file = join(OUT, lang.prefix, page, "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, layout(page, lang.t, P[page](lang.t)));
    count++;
  }
}
// 404 page in French, with links in every language.
L = LANGS[0];
writeFileSync(join(OUT, "404.html"), layout("", fr, `
<section class="page-hero"><div class="tri" aria-hidden="true"></div><div class="wrap">
  <span class="kicker">404</span><div class="rule"></div>
  <h1 class="h1-page">${esc(fr.notFound.title)}</h1>
  <p class="lead mt-m">${esc(fr.notFound.sub)} · ${esc(en.notFound.sub)}</p>
  <div class="btn-row mt-l"><a class="btn btn-primary btn-lg bp" href="/">${esc(fr.notFound.btn)}${C}</a><a class="btn btn-lg" href="/en/">${esc(en.notFound.btn)}</a><a class="btn btn-lg" href="/rn/">${esc(rn.notFound.btn)}</a></div>
</div></section>`).replace(/<link rel="canonical"[^>]*>\n/, ""));
console.log(`Built ${count} pages + 404 into dist/`);
