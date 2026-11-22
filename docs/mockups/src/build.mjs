// Generates the static mockup pages: src/ios/*.html and src/android/*.html.
// Run: node build.mjs   (then: node render.mjs to turn them into PNGs)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/* ─── icons (lucide-style outlines) ─────────────────────────────── */
const P = {
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calDays: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  calCheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  arrowL: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  studio: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  lezione: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  lavoro: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  altro: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c.93 0 1.5-.75 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99a1.5 1.5 0 0 1 1.5-1.5H16a6 6 0 0 0 6-6c0-4.97-4.48-9-10-9z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
  notes: '<path d="M3 6h18M3 12h12M3 18h16"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  arrowUR: '<path d="M7 17 17 7M7 7h10v10"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${P[n]}</svg>`;

/* ─── data ──────────────────────────────────────────────────────── */
const CAT = {
  studio: { name: 'Studio', c: 'var(--c-studio)', hex: '#BB86FC' },
  lavoro: { name: 'Lavoro', c: 'var(--c-lavoro)', hex: '#E49C69' },
  lezione: { name: 'Lezione', c: 'var(--c-lezione)', hex: '#FFD9A0' },
  altro: { name: 'Altro', c: 'var(--c-altro)', hex: '#CF6679' },
};
const CALS = {
  personale: { name: 'Personale', c: '#7AA7D9', acct: 'iCloud' },
  famiglia: { name: 'Famiglia', c: '#E58FB4', acct: 'iCloud' },
  uni: { name: 'Università', c: '#8BC48A', acct: 'Google' },
};
const WD = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const WD1 = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const DATES = [23, 24, 25, 26, 27, 28, 29];
const TODAY = 2;
const NOW = 15 * 60 + 20;

const ITEMS = [
  { k: 'block', d: 0, s: '09:00', e: '11:00', t: 'Analisi 1', cat: 'lezione', rec: 1 },
  { k: 'block', d: 0, s: '14:00', e: '16:00', t: 'Ripasso', cat: 'studio' },
  { k: 'device', d: 0, s: '17:30', e: '18:15', t: 'Dentista', cal: 'personale' },
  { k: 'shift', d: 1, s: '09:00', e: '13:00', t: 'Mattina', c: '#6BB6A3' },
  { k: 'block', d: 1, s: '15:00', e: '17:00', t: 'Fisica', cat: 'studio' },
  { k: 'block', d: 1, s: '18:30', e: '19:30', t: 'Palestra', cat: 'altro', rec: 1 },
  { k: 'block', d: 2, s: '10:00', e: '12:00', t: 'Fisica', cat: 'lezione', rec: 1 },
  { k: 'device', d: 2, s: '12:30', e: '13:15', t: 'Call relatore', cal: 'uni' },
  { k: 'block', d: 2, s: '14:30', e: '17:00', t: 'Progetto', cat: 'studio' },
  { k: 'block', d: 3, s: '09:00', e: '10:30', t: 'Tutorato', cat: 'lavoro' },
  { k: 'shift', d: 3, s: '14:00', e: '19:00', t: 'Pomeriggio', c: '#F2C299' },
  { k: 'block', d: 4, s: '09:00', e: '11:00', t: 'Analisi 1', cat: 'lezione', rec: 1 },
  { k: 'device', d: 4, s: '13:00', e: '14:00', t: 'Pranzo Luca', cal: 'personale' },
  { k: 'block', d: 4, s: '18:30', e: '19:30', t: 'Palestra', cat: 'altro', rec: 1 },
  { k: 'shift', d: 5, s: '09:00', e: '13:00', t: 'Mattina', c: '#6BB6A3' },
  { k: 'block', d: 6, s: '10:00', e: '12:00', t: 'Ripasso', cat: 'studio' },
  { k: 'device', d: 6, s: '19:30', e: '21:00', t: 'Cena', cal: 'famiglia' },
];
const ALLDAY = [{ d: 4, t: 'Compleanno Giulia', cal: 'famiglia' }];
const DAY_HOURS = ['4h', '7h', '4h30', '6h30', '3h', '4h', '2h'];

const min = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const colorOf = (it) => it.k === 'block' ? CAT[it.cat].c : it.k === 'shift' ? it.c : CALS[it.cal].c;

/* ─── shared chrome ─────────────────────────────────────────────── */
const sbarIos = () => `<div class="sbar"><span>9:41</span><div class="island"></div><div class="icons">
<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.4 1.4 10.8.4 8 .4S2.6 1.4.6 3.5l1.2 1.2C3.4 3.1 5.6 2.2 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.5L12.9 6C11.6 4.7 9.9 4 8 4S4.4 4.7 3.1 6l1.2 1.3C5.3 6.3 6.6 5.8 8 5.8zM8 9.4c.6 0 1.1.2 1.5.6L8 11.6 6.5 10c.4-.4.9-.6 1.5-.6z"/></svg>
<svg viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><rect x="25" y="4.5" width="1.6" height="4" rx=".8" opacity=".4"/></svg>
</div></div>`;
const sbarAnd = () => `<div class="sbar"><span>9:41</span><div class="cam"></div><div class="icons">
<svg viewBox="0 0 16 12"><path d="M8 12 0 3.5C2.2 1.4 5 .2 8 .2s5.8 1.2 8 3.3z"/></svg>
<svg viewBox="0 0 12 12"><path d="M12 0v12H0z"/></svg>
<svg viewBox="0 0 8 14"><rect x="2.5" y="0" width="3" height="1.5" rx=".5"/><rect x="0" y="1.5" width="8" height="12.5" rx="1.5"/></svg>
<span class="pct">84%</span></div></div>`;

const tabsIos = (on) => `<nav class="tabbar">
<a class="${on === 'cal' ? 'on' : ''}">${ic('calDays')}Calendario</a>
<a class="${on === 'shifts' ? 'on' : ''}">${ic('briefcase')}Turni</a>
<a class="${on === 'set' ? 'on' : ''}">${ic('gear')}Impostazioni</a></nav>`;
const navAnd = (on) => `<nav class="navbar-m3">
<a class="${on === 'cal' ? 'on' : ''}"><span class="pill">${ic('calDays')}</span>Calendario</a>
<a class="${on === 'shifts' ? 'on' : ''}"><span class="pill">${ic('briefcase')}</span>Turni</a>
<a class="${on === 'set' ? 'on' : ''}"><span class="pill">${ic('gear')}</span>Impostazioni</a></nav>`;

const segIos = (on, labels = ['Giorno', 'Settimana', 'Mese']) => `<div class="seg">${labels.map((s) => `<span class="${s === on ? 'on' : ''}">${s}</span>`).join('')}</div>`;
const segAnd = (on) => `<div class="segb">${['Giorno', 'Settimana', 'Mese'].map((s) => `<span class="${s === on ? 'on' : ''}">${s === on ? ic('check') : ''}${s}</span>`).join('')}</div>`;

/* ─── week grid ─────────────────────────────────────────────────── */
function weekGrid({ from = 8, to = 21, hourH = 42, empty = false, faint = false, allday = true }) {
  const off = 8;
  const y = (m) => off + ((m - from * 60) / 60) * hourH;
  const H = off + (to - from) * hourH;
  const days = DATES.map((n, i) => `<div class="days__d ${i === TODAY ? 'today' : ''} ${i > 4 ? 'we' : ''}">
    <span class="days__wd">${WD[i]}</span><span class="days__n">${n}</span>${empty ? '' : `<span class="days__hrs">${DAY_HOURS[i]}</span>`}</div>`).join('');
  const ad = DATES.map((_, i) => {
    const e = ALLDAY.find((a) => a.d === i);
    return `<div>${e && allday ? `<div class="adchip" style="--c:${CALS[e.cal].c}">${e.t}</div>` : ''}</div>`;
  }).join('');
  let hours = '';
  for (let h = from; h <= to; h++) hours += `<div class="grid__h" style="top:${y(h * 60)}px"><span>${String(h).padStart(2, '0')}</span></div>`;
  const cols = DATES.map((_, i) => {
    const items = empty ? [] : ITEMS.filter((it) => it.d === i);
    const evs = items.map((it) => {
      const top = y(min(it.s)), h = y(min(it.e)) - top - 1;
      const showTime = h > 52;
      const tm = `${it.s.replace(':00', '')}–${it.e.replace(':00', '')}`;
      return `<div class="ev ev--${it.k}" style="--c:${colorOf(it)};top:${top + 1}px;height:${h}px"><b>${it.t}</b>${showTime ? `<small>${tm}</small>` : ''}</div>`;
    }).join('');
    return `<div class="grid__col ${i === TODAY ? 'today' : ''}">${evs}</div>`;
  }).join('');
  const nowY = y(NOW);
  const colW = `(100% / 7)`;
  const now = empty ? '' : `<div class="now" style="top:${nowY}px"><div class="now__today" style="left:calc(${colW} * ${TODAY});width:calc(${colW})"></div></div>`;
  return `<div class="days"><div></div>${days}</div>
  <div class="allday"><span class="allday__lbl"></span>${ad}</div>
  <div class="grid" style="height:${H}px;${faint ? 'opacity:.55' : ''}"><div class="grid__hours">${hours}</div><div class="grid__cols">${cols}</div>${now}</div>`;
}

/* ─── day view column ───────────────────────────────────────────── */
function dayGrid({ from = 9, to = 18, hourH = 64 }) {
  const off = 10;
  const y = (m) => off + ((m - from * 60) / 60) * hourH;
  const H = off + (to - from) * hourH;
  let hours = '';
  for (let h = from; h <= to; h++) hours += `<div class="grid__h" style="top:${y(h * 60)}px"><span>${String(h).padStart(2, '0')}:00</span></div>`;
  const items = ITEMS.filter((it) => it.d === TODAY);
  const cards = items.map((it) => {
    const top = y(min(it.s)), h = y(min(it.e)) - top - 2;
    const dur = (min(it.e) - min(it.s));
    const durS = dur % 60 ? `${Math.floor(dur / 60) ? Math.floor(dur / 60) + 'h ' : ''}${dur % 60}m` : `${dur / 60}h`;
    if (it.k === 'device') {
      const cal = CALS[it.cal];
      return `<div class="dcard ev--device" style="--c:${cal.c};top:${top + 1}px;height:${h}px"><div class="eb">${ic('cal')}${cal.name} (${cal.acct})</div><div class="t" style="font-size:15px;margin-top:5px">${it.t} <span class="tm" style="display:inline;font-size:12px">${it.s}–${it.e}</span></div></div>`;
    }
    const cat = CAT[it.cat];
    return `<div class="dcard ev--block" style="--c:${cat.c};top:${top + 1}px;height:${h}px"><div class="eb">${ic(it.cat)}${cat.name}${it.rec ? ', ogni settimana' : ''}</div><div class="t">${it.t}</div><div class="tm">${it.s}–${it.e}, ${durS}${it.rec ? ` ${ic('repeat')}` : ''}</div></div>`;
  }).join('');
  const notes = ``;
  const nowY = y(NOW);
  return `<div class="grid" style="--gutter:52px;height:${H}px;border-top:0"><div class="grid__hours">${hours}</div>
  <div style="position:absolute;inset:0 0 0 52px;border-left:1px solid var(--line)">${cards}${notes}</div>
  <div class="now" style="top:${nowY}px;--gutter:52px"><div class="now__lbl">15:20</div><div class="now__today" style="left:0;right:0"></div></div></div>`;
}

const weekStrip = (pad = 16) => `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:0 ${pad}px">${DATES.map((n, i) => `
  <div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:7px 0 8px;border-radius:999px;${i === TODAY ? 'background:var(--accent);color:var(--accent-ink)' : ''}">
  <span style="font:400 10px/1 var(--mono);letter-spacing:.12em;${i === TODAY ? '' : `color:${i > 4 ? 'var(--dim)' : 'var(--mid)'}`}">${WD1[i]}</span>
  <span style="font:700 17px/1 var(--syne);letter-spacing:-.02em;${i > 4 && i !== TODAY ? 'color:var(--dim)' : ''}">${n}</span>
  <span style="width:4px;height:4px;border-radius:1px;background:${i === TODAY ? 'var(--accent-ink)' : 'var(--mid)'};opacity:${[1, 1, 1, 1, 1, 1, 1][i] ? (i === TODAY ? .7 : .5) : 0}"></span></div>`).join('')}</div>`;

const dayLegend = () => `<div class="legend"><span><i class="lb"></i>Blocco</span><span><i class="ls"></i>Turno</span><span><i class="ld"></i>Calendario</span></div>`;

/* ─── month ─────────────────────────────────────────────────────── */
function monthGrid(cell = 44) {
  // Mon-first, Nov 2026: Oct 26 … Dec 6
  const start = [26, 27, 28, 29, 30, 31];
  const cells = [];
  for (const n of start) cells.push({ n, out: 1 });
  cells.push({ n: 1 });
  for (let n = 2; n <= 30; n++) cells.push({ n });
  for (let n = 1; n <= 6; n++) cells.push({ n, out: 1 });
  const pat = {
    // date → squares: [type, colour]
    2: [['b', 'lezione'], ['b', 'studio']], 3: [['s', '#6BB6A3'], ['b', 'studio'], ['b', 'altro']], 4: [['b', 'lezione'], ['d', 'uni'], ['b', 'studio']],
    5: [['b', 'lavoro'], ['s', '#F2C299']], 6: [['b', 'lezione'], ['b', 'altro']], 7: [['s', '#6BB6A3']], 8: [['b', 'studio']],
    9: [['b', 'lezione'], ['b', 'studio'], ['d', 'personale']], 10: [['s', '#6BB6A3'], ['b', 'studio']], 11: [['b', 'lezione'], ['b', 'studio']],
    12: [['b', 'lavoro'], ['s', '#F2C299']], 13: [['b', 'lezione'], ['d', 'personale'], ['b', 'altro']], 14: [['s', '#6BB6A3']],
    16: [['b', 'lezione'], ['b', 'studio']], 17: [['s', '#6BB6A3'], ['b', 'studio'], ['b', 'altro']], 18: [['b', 'lezione'], ['b', 'studio']],
    19: [['b', 'lavoro'], ['s', '#F2C299']], 20: [['b', 'lezione'], ['b', 'altro']], 21: [['s', '#6BB6A3'], ['d', 'famiglia']], 22: [['b', 'studio']],
    23: [['b', 'lezione'], ['b', 'studio'], ['d', 'personale']], 24: [['s', '#6BB6A3'], ['b', 'studio'], ['b', 'altro']], 25: [['b', 'lezione'], ['d', 'uni'], ['b', 'studio']],
    26: [['b', 'lavoro'], ['s', '#F2C299']], 27: [['b', 'lezione'], ['d', 'personale'], ['b', 'altro']], 28: [['s', '#6BB6A3']], 29: [['b', 'studio'], ['d', 'famiglia']],
    30: [['b', 'lezione']],
  };
  return `<div class="mwd">${WD1.map((d, i) => `<span style="${i > 4 ? 'color:var(--dim)' : ''}">${d}</span>`).join('')}</div>
  <div class="mgrid" style="--mcell:${cell}px">${cells.map((c, i) => {
    const wk = !c.out && c.n >= 23 && c.n <= 29;
    const sq = !c.out && pat[c.n] ? pat[c.n].map(([t, k]) => {
      const col = t === 'b' ? CAT[k].c : t === 'd' ? CALS[k].c : k;
      return `<i class="${t === 'b' ? '' : t}" style="--c:${col}"></i>`;
    }).join('') : '';
    return `<div class="mcell ${c.out ? 'out' : ''} ${!c.out && c.n === 25 ? 'today' : ''} ${wk ? 'wk' : ''} ${wk && c.n === 23 ? 'first' : ''} ${wk && c.n === 29 ? 'last' : ''}"><span class="n">${c.n}</span><span class="sq">${sq}</span></div>`;
  }).join('')}</div>`;
}

function summary() {
  const rows = [
    ['Studio', 'var(--c-studio)', 8.5, '8h 30', ''],
    ['Lezione', 'var(--c-lezione)', 6, '6h', ''],
    ['Lavoro', 'var(--c-lavoro)', 1.5, '1h 30', ''],
    ['Altro', 'var(--c-altro)', 2, '2h', ''],
    ['Turni', 'var(--c-shift)', 13, '13h', 's'],
  ];
  return `<div class="hud"><div class="hud__c"><span class="label">Questa settimana</span><div class="hud__v">31<small>h</small></div><div class="bar"><i style="width:78%"></i></div></div>
  <div class="hud__c"><span class="label">Novembre</span><div class="hud__v acc">121<small>h</small></div><div class="bar"><i style="width:64%"></i></div></div></div>
  ${rows.map(([n, c, v, s, k]) => `<div class="srow"><span class="k ${k}" style="--c:${c}"></span><span class="n">${n}</span><span class="b"><i style="--c:${c};width:${(v / 13) * 100}%"></i></span><span class="v">${s}</span></div>`).join('')}`;
}

/* ─── page shell ────────────────────────────────────────────────── */
function page(platform, theme, body, cls = '') {
  return `<!doctype html>
<html lang="it" data-platform="${platform}" data-theme="${theme}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Slate ${platform}</title>
<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../${platform}.css"></head>
<body><div class="phone ${cls}">${body}</div></body></html>`;
}

/* ═══════════════════════════ iOS screens ═══════════════════════════ */
const ios = {};

const iosWeekBody = (opts = {}) => `${sbarIos()}
<div class="navbar"><span class="gbtn">Oggi</span><div class="end"><span class="gbtn round">${ic('chart')}</span><span class="gbtn round accent">${ic('plus')}</span></div></div>
<div class="ltitle"><span class="tag">Settimana 48, 23–29 nov</span><h1 class="h-page">Novembre <span class="acc">2026</span></h1></div>
<div style="position:absolute;top:184px;left:20px;right:20px">${segIos('Settimana')}</div>
<div style="position:absolute;top:230px;left:0;right:0">${weekGrid({ from: 8, to: 21, hourH: 42, ...opts })}</div>
${tabsIos('cal')}<div class="homeind"></div>`;

ios['01-week-dark'] = ['dark', iosWeekBody()];
ios['01-week-light'] = ['light', iosWeekBody()];

ios['02-day-dark'] = ['dark', `${sbarIos()}
<div class="navbar inline"><span class="gbtn">Oggi</span><div class="navbar__title" style="top:${54 + 13}px">Mercoledì 25<small>Novembre 2026</small></div><div class="end"><span class="gbtn round accent">${ic('plus')}</span></div></div>
<div style="position:absolute;top:118px;left:20px;right:20px">${segIos('Giorno')}</div>
<div style="position:absolute;top:164px;left:0;right:0">${weekStrip(14)}</div>
<div style="position:absolute;top:240px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center"><span class="label" style="white-space:nowrap">4h 30 <span class="dim">oggi</span></span>${dayLegend()}</div>
<div style="position:absolute;top:268px;left:0;right:16px">${dayGrid({ from: 9, to: 18, hourH: 62 })}</div>
${tabsIos('cal')}<div class="homeind"></div>`];

ios['03-month-dark'] = ['dark', `${sbarIos()}
<div class="navbar"><span class="gbtn">Oggi</span><div class="end"><span class="gbtn round accent">${ic('plus')}</span></div></div>
<div class="ltitle"><h1 class="h-page">Novembre <span class="acc">2026</span></h1></div>
<div style="position:absolute;top:184px;left:20px;right:20px">${segIos('Mese')}</div>
<div style="position:absolute;top:230px;left:12px;right:12px">${monthGrid(38)}</div>
<div style="position:absolute;top:498px;left:20px;right:20px">
${summary()}</div>
<div class="tabfade" style="height:110px"></div>
${tabsIos('cal')}<div class="homeind"></div>`];

const iosBlockSheet = (withWheel) => `<div class="behind">${iosWeekBody()}</div><div class="scrim" style="background:rgba(0,0,0,.25)"></div>
<div style="position:absolute;inset:0;z-index:85">${sbarIos()}</div>
<div class="sheet">
  <div class="sheet__bar"><span class="gbtn round">${ic('x')}</span><div class="navbar__title" style="top:32px">Nuovo blocco</div><span class="gbtn round accent">${ic('check')}</span></div>
  <div class="sheet__body">
  <div class="titlein">Ripasso Fisica<span class="caret"></span></div>
  <span class="flabel label">Categoria</span>
  <div class="field" style="display:flex;gap:6px">${Object.entries(CAT).map(([k, c]) => `<span class="chip ${k === 'studio' ? 'sel' : ''}" style="--c:${c.c};padding:0 11px;font-size:12px"><span class="dot"></span>${c.name}</span>`).join('')}</div>
  ${withWheel ? '' : `<span class="flabel label">Colore</span>
  <div class="field swatches">${['#BB86FC', '#E49C69', '#FFD9A0', '#F2C299', '#5C3B2E', '#CF6679', '#6BB6A3', '#7AA7D9'].map((h, i) => `<span class="sw ${i === 0 ? 'sel' : ''}" style="--c:${h}"></span>`).join('')}</div>`}
  <div style="height:18px"></div>
  <div class="grp noicon">
    <div class="irow"><span class="nm">Giorno</span><span class="vl" style="background:var(--seg-track);color:var(--text);padding:7px 11px;border-radius:999px">Mer 25 nov</span></div>
    <div class="irow"><span class="nm">Inizio</span><span class="vl" style="background:${withWheel ? 'var(--accent-md)' : 'var(--seg-track)'};color:${withWheel ? 'var(--accent)' : 'var(--text)'};padding:7px 11px;border-radius:999px">14:30</span></div>
    ${withWheel ? `<div class="wheel"><div class="wheel__col"><span>12</span><span>13</span><span class="on">14</span><span>15</span><span>16</span></div><div class="wheel__col"><span>20</span><span>25</span><span class="on">30</span><span>35</span><span>40</span></div></div>` : ''}
    <div class="irow"><span class="nm">Durata</span><span class="vl" style="background:var(--seg-track);color:var(--text);padding:7px 11px;border-radius:999px">2h 30</span></div>
    <div class="irow"><span class="nm">Fine</span><span class="vl">17:00</span></div>
  </div>
  <div style="height:14px"></div>
  <div class="grp noicon">
    <div class="irow"><span class="nm">Ripetizione</span><span class="vl">Settimanale ${ic('chevR', 'ch')}</span></div>
    <div class="irow"><span class="nm">Fine ripetizione</span><span class="vl">19 dic ${ic('chevR', 'ch')}</span></div>
    ${withWheel ? '' : `<div class="irow" style="align-items:flex-start;min-height:74px"><span class="nm" style="color:var(--mid)">Note (opzionale)<small style="color:var(--text);font-size:13px;margin-top:6px">Capitoli 4–5, esercizi pari</small></span></div>`}
  </div>
  <p class="grp-f" style="display:flex;gap:8px;align-items:flex-start">${ic('calCheck')}<span>Verrà copiato anche nel calendario «Slate» del telefono.</span></p>
  </div>
</div>
<div class="homeind" style="z-index:90"></div>`;

ios['04-block-sheet-dark'] = ['dark', iosBlockSheet(false), 'sheeted'];
ios['04b-time-picker-dark'] = ['dark', iosBlockSheet(true), 'sheeted'];

const SHIFTS = [
  { t: 'Mattina', s: '09:00', e: '13:00', d: '4h', c: '#6BB6A3', next: 'Prossimo: sab 28' },
  { t: 'Pomeriggio', s: '14:00', e: '19:00', d: '5h', c: '#F2C299', next: 'Prossimo: gio 26' },
  { t: 'Chiusura', s: '17:00', e: '22:30', d: '5h 30', c: '#7AA7D9', next: 'Nessuno questo mese' },
  { t: 'Notte', s: '22:00', e: '06:00', d: '8h', c: '#BB86FC', next: 'Prossimo: mar 1 dic', on: 1 },
];
const shiftGlyph = (c) => `<span style="width:26px;height:26px;border-radius:7px;border:1.5px dashed ${c};background:color-mix(in srgb, ${c} 14%, transparent);flex-shrink:0"></span>`;

ios['05-shifts-dark'] = ['dark', `${sbarIos()}
<div class="navbar"><span></span><div class="end"><span class="gbtn round accent">${ic('plus')}</span></div></div>
<div class="ltitle"><h1 class="h-page">I tuoi <span class="acc">turni.</span></h1>
<p class="lede" style="margin-top:12px;font-size:13px">Crea qui i tuoi turni, poi inseriscili nei giorni dal calendario.</p></div>
<div style="position:absolute;top:266px;left:20px;right:20px">
  <div class="hud"><div class="hud__c"><span class="label">A novembre</span><div class="hud__v">12<small>turni</small></div></div><div class="hud__c"><span class="label">Ore di turno</span><div class="hud__v acc">49<small>h</small></div></div></div>
  <div style="height:22px"></div>
  <div class="rows">${SHIFTS.map((s, i) => `<div class="row">${shiftGlyph(s.c)}<div class="row__main"><div class="row__name">${s.t}</div><div class="row__meta">${s.s}–${s.e}${s.on ? ' <span class="dim">(giorno dopo)</span>' : ''}, ${s.d}</div></div><span class="row__end">${ic('chevR', 'row__arrow')}</span></div>`).join('')}</div>
  <p class="note" style="margin-top:18px">${ic('info')}<span>Per inserire un turno, tocca un'ora vuota nel calendario e scegli «Aggiungi un turno».</span></p>
</div>
${tabsIos('shifts')}<div class="homeind"></div>`];

const shiftsIosBody = ios['05-shifts-dark'][1];
ios['05b-shift-editor-dark'] = ['dark', `<div class="behind">${shiftsIosBody}</div><div class="scrim" style="background:rgba(0,0,0,.25)"></div>
<div style="position:absolute;inset:0;z-index:85">${sbarIos()}</div>
<div class="sheet">
  <div class="sheet__bar"><span class="gbtn round">${ic('x')}</span><div class="navbar__title" style="top:32px">Modifica turno</div><span class="gbtn round accent">${ic('check')}</span></div>
  <div class="titlein">Mattina<span class="caret"></span></div>
  <span class="flabel label">Colore</span>
  <div class="field swatches">${['#6BB6A3', '#7AA7D9', '#BB86FC', '#E49C69', '#FFD9A0', '#F2C299', '#5C3B2E', '#CF6679'].map((h, i) => `<span class="sw ${i === 0 ? 'sel' : ''}" style="--c:${h}"></span>`).join('')}</div>
  <span class="flabel label">Orario</span>
  <div class="field tiles"><div class="tile sel"><span class="label">Inizio</span><div class="v">09:00</div></div><span class="mid">→</span><div class="tile"><span class="label">Fine</span><div class="v">13:00</div></div></div>
  <div class="field" style="margin-top:12px;display:flex;justify-content:space-between" ><span class="small">Durata <span style="color:var(--text)">4h</span></span><span class="small">Stesso giorno</span></div>
  <div style="height:18px"></div>
  <div class="grp noicon">
    <div class="irow"><span class="nm">Inserito in<small>Novembre 2026</small></span><span class="vl">9 giorni ${ic('chevR', 'ch')}</span></div>
  </div>
  <p class="grp-f" style="display:flex;gap:8px">${ic('info')}<span>Le modifiche valgono per tutti i giorni in cui questo turno è inserito.</span></p>
  <div style="height:22px"></div>
  <div class="grp noicon"><div class="irow" style="justify-content:center"><span class="nm warnrow" style="flex:0;white-space:nowrap">Elimina turno</span></div></div>
</div><div class="homeind" style="z-index:90"></div>`, 'sheeted'];

const ACCENTS = ['#D4EE5E', '#E0B84C', '#8BC48A', '#E58FB4']; // Gesso, ambra, salvia, rosa: none is a block colour
const accentSw = (size = 26, gap = 7) => `<div class="swatches" style="gap:${gap}px;flex-wrap:nowrap">${ACCENTS.map((h, i) => `<span class="sw ${i === 0 ? 'sel' : ''}" style="--c:${h};width:${size}px;height:${size}px"></span>`).join('')}<span class="sw custom" style="width:${size}px;height:${size}px"></span></div>`;

const iosSettingsTop = (theme) => `${sbarIos()}
<div class="navbar"><span></span></div>
<div class="ltitle" style="top:62px"><h1 class="h-page">Impostazioni<span class="acc">.</span></h1></div>
<div style="position:absolute;top:124px;left:0;right:0">
<span class="grp-h label">Aspetto</span>
<div class="grp">
  <div class="irow stack"><div style="display:flex;align-items:center;gap:12px"><span class="ic">${ic(theme === 'light' ? 'sun' : 'moon')}</span><span class="nm">Tema</span></div>${segIos(theme === 'light' ? 'Chiaro' : 'Scuro', ['Chiaro', 'Scuro', 'Sistema'])}</div>
  <div class="irow stack"><div style="display:flex;align-items:center;gap:12px"><span class="ic">${ic('palette')}</span><span class="nm">Colore principale<small>Gesso</small></span></div>${accentSw(25, 6)}</div>
  <div class="irow"><span class="ic">${ic('layout')}</span><span class="nm">Vista predefinita</span><span class="vl">Settimana ${ic('chevR', 'ch')}</span></div>
  <div class="irow"><span class="ic">${ic('globe')}</span><span class="nm">Lingua</span><span class="vl">IT · Italiano ${ic('chevR', 'ch')}</span></div>
</div>
<span class="grp-h label">Calendari del dispositivo</span>
<div class="grp">
  <div class="irow"><span class="ic">${ic('lock')}</span><span class="nm">Accesso al calendario</span><span class="vl"><span style="width:7px;height:7px;border-radius:2px;background:var(--ok)"></span>Completo</span></div>
  <div class="irow"><span class="ic">${ic('eye')}</span><span class="nm">Calendari mostrati</span><span class="vl">3 di 6 ${ic('chevR', 'ch')}</span></div>
  <div class="irow"><span class="ic">${ic('calCheck')}</span><span class="nm">Copia i blocchi</span><span class="switch on"></span></div>
  <div class="irow"><span class="ic">${ic('cal')}</span><span class="nm">Destinazione</span><span class="vl"><span class="calc" style="--c:var(--accent);width:10px;height:10px;border-radius:3px;background:var(--accent)"></span>Slate ${ic('chevR', 'ch')}</span></div>
</div>
<p class="grp-f">I calendari scelti compaiono accanto ai tuoi blocchi. Se la copia è attiva, ogni blocco viene scritto in «Slate». I turni non vengono copiati.</p>
</div>
<div class="tabfade" style="height:100px"></div>
${tabsIos('set')}<div class="homeind"></div>`;

ios['06-settings-dark'] = ['dark', iosSettingsTop('dark'), 'grouped'];
ios['06-settings-light'] = ['light', iosSettingsTop('light'), 'grouped'];

ios['06b-settings-backup-dark'] = ['dark', `${sbarIos()}
<div class="navbar inline"><span></span><div class="navbar__title" style="top:${54 + 18}px">Impostazioni</div></div>
<div style="position:absolute;top:96px;left:0;right:0">
<div class="grp" style="opacity:.9">
  <div class="irow"><span class="ic">${ic('calCheck')}</span><span class="nm">Copia i blocchi</span><span class="switch on"></span></div>
  <div class="irow"><span class="ic">${ic('cal')}</span><span class="nm">Destinazione</span><span class="vl"><span style="width:10px;height:10px;border-radius:3px;background:var(--accent)"></span>Slate ${ic('chevR', 'ch')}</span></div>
</div>
<p class="grp-f">I calendari scelti compaiono accanto ai tuoi blocchi. Se la copia è attiva, ogni blocco viene scritto in «Slate». I turni non vengono copiati.</p>
<span class="grp-h label">Backup</span>
<div class="grp">
  <div class="irow"><span class="ic" style="color:var(--accent)">${ic('upload')}</span><span class="nm">Esporta backup<small>64 blocchi, 4 turni e le impostazioni in un file .json</small></span>${ic('share', 'ch')}</div>
  <div class="irow"><span class="ic">${ic('download')}</span><span class="nm">Importa backup<small>Sostituisce i dati di questo telefono</small></span>${ic('chevR', 'ch')}</div>
  <div class="irow"><span class="ic">${ic('history')}</span><span class="nm">Ultimo backup</span><span class="vl">14 nov, 21:08</span></div>
</div>
<p class="grp-f">Slate non ha un cloud: i dati vivono solo su questo telefono. Salva il backup in File, Drive o dove preferisci.</p>
<span class="grp-h label">Informazioni</span>
<div class="grp">
  <div class="irow"><span class="ic">${ic('info')}</span><span class="nm">Versione</span><span class="vl">1.0.0 (12)</span></div>
  <div class="irow"><span class="ic">${ic('shield')}</span><span class="nm">Privacy<small>Nessun account, nessun tracker</small></span>${ic('chevR', 'ch')}</div>
  <div class="irow"><span class="ic">${ic('file')}</span><span class="nm">Licenze</span>${ic('chevR', 'ch')}</div>
  <div class="irow"><span class="ic">${ic('arrowUR')}</span><span class="nm">egenesio.com</span>${ic('arrowUR', 'ch')}</div>
</div>
<div style="height:16px"></div>
<div class="grp noicon"><div class="irow" style="justify-content:center"><span class="nm warnrow" style="flex:0;white-space:nowrap">Elimina tutti i dati</span></div></div>
</div>
<div class="tabfade" style="height:100px"></div>
${tabsIos('set')}<div class="homeind"></div>`, 'grouped'];

const calRow = (name, c, on, sub = '') => `<div class="irow"><span class="ic"><span style="width:12px;height:12px;border-radius:3px;border:1.5px solid ${c};background:repeating-linear-gradient(135deg, ${c}99 0 1px, transparent 1px 4px)"></span></span><span class="nm">${name}${sub ? `<small>${sub}</small>` : ''}</span>${on ? ic('check', 'check') : ''}</div>`;
ios['06c-device-calendars-dark'] = ['dark', `${sbarIos()}
<div class="navbar"><span class="gbtn back">${ic('chevL')}Impostazioni</span></div>
<div class="ltitle" style="top:110px"><h1 class="h-page">Calendari da mostrare</h1>
<p class="lede" style="margin-top:12px;font-size:13px">Gli eventi di questi calendari compaiono accanto ai tuoi blocchi, tratteggiati. Si modificano nell'app Calendario.</p></div>
<div style="position:absolute;top:252px;left:0;right:0">
<span class="grp-h label">iCloud</span>
<div class="grp">${calRow('Personale', '#7AA7D9', 1)}${calRow('Famiglia', '#E58FB4', 1)}${calRow('Lavoro', '#E0B84C', 0)}</div>
<span class="grp-h label">Google</span>
<div class="grp">${calRow('Università', '#8BC48A', 1)}${calRow('Festività in Italia', '#8d8d96', 0, 'Sola lettura')}</div>
<span class="grp-h label">Sul telefono</span>
<div class="grp"><div class="irow"><span class="ic"><span style="width:12px;height:12px;border-radius:3px;background:var(--accent)"></span></span><span class="nm">Slate<small>Riceve i blocchi copiati. Non compare in Slate, così non li vedi due volte.</small></span></div></div>
</div>
<div class="tabfade" style="height:100px"></div>
${tabsIos('set')}<div class="homeind"></div>`, 'grouped'];

const illu = (h = 128) => {
  // a tiny three-day preview of the three kinds of item
  const col = (x, items) => items.map(([k, top, ht, c, t]) => `<div class="ev ev--${k}" style="--c:${c};left:${x}%;right:auto;width:31%;top:${top}px;height:${ht}px"><b>${t}</b></div>`).join('');
  return `<div class="illu" style="height:${h}px">
  ${[0, 1, 2, 3].map((r) => `<div style="position:absolute;left:0;right:0;top:${12 + r * 30}px;border-top:1px solid var(--line)"></div>`).join('')}
  ${col(2, [['block', 14, 44, 'var(--c-lezione)', 'Analisi 1'], ['device', 64, 28, '#7AA7D9', 'Dentista']])}
  ${col(35, [['shift', 10, 60, '#6BB6A3', 'Mattina'], ['block', 76, 40, 'var(--c-studio)', 'Fisica']])}
  ${col(68, [['device', 18, 30, '#8BC48A', 'Call relatore'], ['block', 54, 56, 'var(--c-studio)', 'Progetto']])}
  </div>`;
};
const welcomeRows = () => `<div class="rows">
  <div class="row" style="min-height:62px"><div class="row__main"><div class="row__name" style="font-size:16px">I tuoi calendari, accanto</div><div class="row__meta">Gli eventi del telefono appaiono tratteggiati tra i blocchi.</div></div></div>
  <div class="row" style="min-height:62px"><div class="row__main"><div class="row__name" style="font-size:16px">Copia i blocchi, se vuoi</div><div class="row__meta">Slate può scriverli in un calendario «Slate».</div></div></div>
  <div class="row" style="min-height:62px"><div class="row__main"><div class="row__name" style="font-size:16px">Tutto resta qui</div><div class="row__meta">Nessun account. I dati restano sul telefono.</div></div></div></div>`;
const markEl = () => `<div class="mark"><i class="a"></i><i></i><i></i><i></i><i class="a"></i><i></i><i class="a"></i><i></i><i></i></div>`;

const iosWelcome = `${sbarIos()}
<div style="position:absolute;top:76px;left:24px;right:24px">
  ${markEl()}
  <span class="tag" style="display:block;margin-top:22px">Passo 1 di 2</span>
  <h1 class="h-display" style="font-size:50px;margin-top:12px">La tua<br>settimana,<br>a <span class="acc">blocchi.</span></h1>
  <div style="margin-top:24px">${illu(124)}</div>
  <div style="margin-top:14px">${welcomeRows()}</div>
</div>
<div style="position:absolute;left:24px;right:24px;bottom:44px;display:grid;gap:8px">
  <span class="btn btn--wide">${ic('cal')}Collega il calendario</span>
  <span class="btn btn--wide btn--ghost" style="box-shadow:none;color:var(--mid)">Non ora</span>
</div><div class="homeind"></div>`;
ios['07-permission-dark'] = ['dark', iosWelcome];
ios['07b-permission-system-dark'] = ['dark', `${iosWelcome}<div class="scrim" style="background:rgba(0,0,0,.5)"></div>
<div class="alert"><div class="alert__b"><h3>Consentire a “Slate” l'accesso completo al tuo Calendario?</h3><p>Slate mostra i tuoi eventi accanto ai blocchi e, se lo scegli, copia i blocchi in un calendario «Slate». Nulla lascia il telefono.</p></div>
<div class="alert__btns"><span>Non consentire</span><span class="pri">Consenti accesso completo</span></div></div>`];

ios['08-empty-dark'] = ['dark', `${iosWeekBody({ empty: true, faint: true })}
<div style="position:absolute;z-index:5;left:0;right:0;top:330px;padding:44px 28px 36px;background:linear-gradient(transparent, var(--bg) 14%, var(--bg) 86%, transparent);text-align:center;display:flex;flex-direction:column;align-items:center">
  ${markEl()}
  <h2 class="h-page" style="margin-top:18px">Settimana libera</h2>
  <p class="lede" style="margin-top:12px;font-size:13px">Nessun blocco questa settimana. Tocca un'ora vuota per aggiungerne uno.</p>
  <div style="display:flex;gap:8px;margin-top:22px"><span class="btn" style="min-height:48px;padding:0 20px">${ic('plus')}Nuovo blocco</span><span class="btn btn--ghost" style="min-height:48px;padding:0 20px">Crea un turno</span></div>
</div>`];

/* ═════════════════════════ Android screens ═════════════════════════ */
const and = {};

const andWeekBody = (opts = {}) => `${sbarAnd()}
<div class="appbar"><div class="appbar__t"><small>Settimana 48</small>Novembre <span class="acc">2026</span></div>
<span class="ibtn">${ic('calCheck')}</span><span class="ibtn">${ic('chart')}</span><span class="ibtn">${ic('more')}</span></div>
<div style="position:absolute;top:112px;left:16px;right:16px">${segAnd('Settimana')}</div>
<div style="position:absolute;top:164px;left:0;right:0">${weekGrid({ from: 8, to: 21, hourH: 44, ...opts })}</div>
${opts.empty ? '' : `<span class="fab sq">${ic('plus')}</span>`}
${navAnd('cal')}<div class="gesture"></div>`;

and['01-week-dark'] = ['dark', andWeekBody()];
and['01-week-light'] = ['light', andWeekBody()];

and['02-day-dark'] = ['dark', `${sbarAnd()}
<div class="appbar"><div class="appbar__t"><small>Oggi</small>Mercoledì 25</div>
<span class="ibtn">${ic('calCheck')}</span><span class="ibtn">${ic('chart')}</span><span class="ibtn">${ic('more')}</span></div>
<div style="position:absolute;top:112px;left:16px;right:16px">${segAnd('Giorno')}</div>
<div style="position:absolute;top:164px;left:0;right:0">${weekStrip(12)}</div>
<div style="position:absolute;top:240px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center"><span class="label" style="white-space:nowrap">4h 30 <span class="dim">oggi</span></span>${dayLegend()}</div>
<div style="position:absolute;top:268px;left:0;right:16px">${dayGrid({ from: 9, to: 18, hourH: 62 })}</div>
<span class="fab">${ic('plus')}Nuovo</span>
${navAnd('cal')}<div class="gesture"></div>`];

and['03-month-dark'] = ['dark', `${sbarAnd()}
<div class="appbar"><div class="appbar__t">Novembre <span class="acc">2026</span></div>
<span class="ibtn">${ic('calCheck')}</span><span class="ibtn">${ic('more')}</span></div>
<div style="position:absolute;top:112px;left:16px;right:16px">${segAnd('Mese')}</div>
<div style="position:absolute;top:166px;left:12px;right:12px">${monthGrid(44)}</div>
<div style="position:absolute;top:480px;left:16px;right:16px;padding:16px 16px 6px;border-radius:24px;background:var(--m3-c)">
${summary().replace(/class="srow"/g, 'class="srow" style="border-bottom-color:var(--line)"')}</div>
${navAnd('cal')}<div class="gesture"></div>`];

const andBlockSheet = () => `${andWeekBody()}<div class="scrim"></div>
<div class="sheet">
  <div class="sheet__bar"><span class="ibtn">${ic('x')}</span><span class="h-dialog">Nuovo blocco</span><span class="fbtn">Salva</span></div>
  <div style="height:14px"></div>
  <div class="tf big focus"><span class="fl">Titolo</span>Ripasso Fisica<span class="caret" style="margin-left:2px"></span></div>
  <span class="slabel label">Categoria</span>
  <div style="display:flex;gap:8px;padding:0 16px">${Object.entries(CAT).map(([k, c]) => `<span class="chip ${k === 'studio' ? 'sel' : ''}" style="--c:${c.c}">${k === 'studio' ? ic('check') : '<span class="dot"></span>'}${c.name}</span>`).join('')}</div>
  <span class="slabel label">Colore</span>
  <div class="swatches" style="padding:0 20px;gap:12px">${['#BB86FC', '#E49C69', '#FFD9A0', '#F2C299', '#5C3B2E', '#CF6679', '#6BB6A3', '#7AA7D9'].map((h, i) => `<span class="sw ${i === 0 ? 'sel' : ''}" style="--c:${h};width:32px;height:32px"></span>`).join('')}</div>
  <div style="height:26px"></div>
  <div class="tfrow"><div class="tf"><span class="fl">Giorno</span>Mer 25 nov<span class="trail">${ic('cal')}</span></div><div class="tf"><span class="fl">Inizio</span>14:30<span class="trail">${ic('clock')}</span></div></div>
  <div style="height:16px"></div>
  <div class="tfrow"><div class="tf"><span class="fl">Durata</span>2h 30<span class="trail">${ic('chevD')}</span></div><div class="tf"><span class="fl">Ripetizione</span>Settimanale<span class="trail">${ic('chevD')}</span></div></div>
  <div style="height:16px"></div>
  <div class="tf"><span class="fl">Fine ripetizione</span>Fino al 19 dic 2026<span class="trail">${ic('cal')}</span></div>
  <div style="height:16px"></div>
  <div class="tf" style="height:84px;align-items:flex-start;padding-top:16px"><span class="fl">Note (opzionale)</span>Capitoli 4–5, esercizi pari</div>
  <p class="lfoot" style="display:flex;gap:8px;padding:14px 20px">${ic('calCheck')}<span>Verrà copiato anche nel calendario «Slate» del telefono.</span></p>
</div><div class="gesture" style="z-index:90"></div>`;
and['04-block-sheet-dark'] = ['dark', andBlockSheet()];

function dial() {
  const R1 = 104, R2 = 68, c = 128;
  let out = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    out += `<span style="left:${c + R1 * Math.cos(a)}px;top:${c + R1 * Math.sin(a)}px">${String(i === 0 ? 0 : i).padStart(2, '0')}</span>`;
    const h = i === 0 ? 12 : i + 12;
    out += `<span class="in ${h === 14 ? 'on' : ''}" style="left:${c + R2 * Math.cos(a)}px;top:${c + R2 * Math.sin(a)}px">${h}</span>`;
  }
  const a = (2 * 30 - 90) * Math.PI / 180;
  return `<div class="dial">${out}<div class="sel" style="left:${c + R2 * Math.cos(a)}px;top:${c + R2 * Math.sin(a)}px"></div><div class="hand" style="width:${R2}px;transform:rotate(${2 * 30 - 90}deg)"></div><div class="ctr"></div></div>`;
}
and['04b-time-picker-dark'] = ['dark', `${andBlockSheet()}<div class="scrim" style="z-index:88;background:rgba(0,0,0,.45)"></div>
<div class="dlg"><span class="label">Ora di inizio</span>
<div class="tp-time"><span class="tp-box on">14</span><span class="tp-colon">:</span><span class="tp-box">30</span></div>
${dial()}
<div class="dlg__acts"><span class="ibtn kb">${ic('keyboard')}</span><span class="tbtn">Annulla</span><span class="tbtn">OK</span></div></div>`];

const andShiftsBody = `${sbarAnd()}
<div class="appbar"><span style="flex:1"></span><span class="ibtn">${ic('more')}</span></div>
<div class="appbar-lg"><h1 class="h-page">I tuoi <span class="acc">turni.</span></h1>
<p class="lede" style="margin-top:12px;font-size:13px">Crea qui i tuoi turni, poi inseriscili nei giorni dal calendario.</p></div>
<div style="position:absolute;top:244px;left:16px;right:16px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div style="background:var(--m3-c);border-radius:20px;padding:14px 16px"><span class="label">A novembre</span><div class="hud__v">12<small>turni</small></div></div>
    <div style="background:var(--m3-sec);border-radius:20px;padding:14px 16px"><span class="label" style="color:var(--m3-on-sec);opacity:.8">Ore di turno</span><div class="hud__v" style="color:var(--m3-on-sec)">49<small style="color:var(--m3-on-sec);opacity:.7">h</small></div></div>
  </div>
</div>
<span class="lsec tag" style="position:absolute;top:346px">Salvati</span>
<div class="lgrp" style="position:absolute;top:388px;left:0;right:0">${SHIFTS.map((s, i) => `<div class="litem" style="min-height:72px">${shiftGlyph(s.c).replace('26px;height:26px', '40px;height:40px').replace('border-radius:7px', 'border-radius:12px')}<div class="nm"><span style="font:700 17px/1.2 var(--syne);letter-spacing:-.01em">${s.t}</span><small>${s.s}–${s.e}${s.on ? ' (giorno dopo)' : ''}, ${s.d}</small></div><span class="vl" style="font-size:11px;text-align:right">${s.next.replace('Prossimo: ', '')}</span></div>`).join('')}</div>
<span class="fab">${ic('plus')}Nuovo turno</span>
${navAnd('shifts')}<div class="gesture"></div>`;
and['05-shifts-dark'] = ['dark', andShiftsBody];

and['05b-shift-editor-dark'] = ['dark', `${andShiftsBody}<div class="scrim"></div>
<div class="sheet" style="top:300px">
  <div class="sheet__bar"><span class="ibtn">${ic('x')}</span><span class="h-dialog">Modifica turno</span><span class="fbtn">Salva</span></div>
  <div style="height:14px"></div>
  <div class="tf big"><span class="fl">Nome del turno</span>Mattina</div>
  <span class="slabel label">Colore</span>
  <div class="swatches" style="padding:0 20px;gap:12px">${['#6BB6A3', '#7AA7D9', '#BB86FC', '#E49C69', '#FFD9A0', '#F2C299', '#5C3B2E', '#CF6679'].map((h, i) => `<span class="sw ${i === 0 ? 'sel' : ''}" style="--c:${h};width:32px;height:32px"></span>`).join('')}</div>
  <span class="slabel label">Orario</span>
  <div class="tiles" style="padding:0 16px"><div class="tile sel" style="border-radius:16px"><span class="label">Inizio</span><div class="v">09:00</div></div><span class="mid">→</span><div class="tile" style="border-radius:16px"><span class="label">Fine</span><div class="v">13:00</div></div></div>
  <div style="margin:12px 20px 0;display:flex;justify-content:space-between"><span class="small">Durata <span style="color:var(--text)">4h</span></span><span class="small">Stesso giorno</span></div>
  <p class="lfoot" style="display:flex;gap:8px;padding:18px 20px 0">${ic('info')}<span>Le modifiche valgono per tutti i giorni in cui questo turno è inserito.</span></p>
  <div style="padding:22px 16px 0"><span class="btn btn--wide btn--ghost" style="min-height:48px;color:var(--warn);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--warn) 50%, transparent)">${ic('trash')}Elimina turno</span></div>
</div><div class="gesture" style="z-index:90"></div>`];

const andSegTheme = (theme) => `<div class="segb"><span class="${theme === 'light' ? 'on' : ''}">${theme === 'light' ? ic('check') : ''}Chiaro</span><span class="${theme === 'dark' ? 'on' : ''}">${theme === 'dark' ? ic('check') : ''}Scuro</span><span>Sistema</span></div>`;
const andSettingsTop = (theme) => `${sbarAnd()}
<div class="appbar"><span style="flex:1"></span></div>
<div class="appbar-lg" style="top:72px"><h1 class="h-page">Impostazioni<span class="acc">.</span></h1></div>
<div style="position:absolute;top:150px;left:0;right:0">
<span class="lsec tag">Aspetto</span>
<div class="lgrp">
  <div class="litem stack"><div style="display:flex;align-items:center;gap:16px"><span class="ic">${ic(theme === 'light' ? 'sun' : 'moon')}</span><span class="nm">Tema</span></div>${andSegTheme(theme)}</div>
  <div class="litem stack"><div style="display:flex;align-items:center;gap:16px"><span class="ic">${ic('palette')}</span><span class="nm">Colore principale<small>Gesso</small></span></div>${accentSw(28)}</div>
  <div class="litem"><span class="ic">${ic('layout')}</span><span class="nm">Vista predefinita<small>Settimana</small></span></div>
  <div class="litem"><span class="ic">${ic('globe')}</span><span class="nm">Lingua<small>IT · Italiano</small></span></div>
</div>
<span class="lsec tag">Calendari del dispositivo</span>
<div class="lgrp">
  <div class="litem"><span class="ic">${ic('eye')}</span><span class="nm">Calendari mostrati<small>3 di 6 calendari</small></span>${ic('chevR', 'mid')}</div>
  <div class="litem"><span class="ic">${ic('calCheck')}</span><span class="nm">Copia i blocchi<small>Nel calendario «Slate» del telefono</small></span><span class="switch on"></span></div>
</div>
</div>
${navAnd('set')}<div class="gesture"></div>`;
and['06-settings-dark'] = ['dark', andSettingsTop('dark')];
and['06-settings-light'] = ['light', andSettingsTop('light')];

and['06b-settings-backup-dark'] = ['dark', `${sbarAnd()}
<div class="appbar solid"><div class="appbar__t">Impostazioni</div></div>
<div style="position:absolute;top:96px;left:0;right:0">
<div class="lgrp">
  <div class="litem"><span class="ic">${ic('calCheck')}</span><span class="nm">Copia i blocchi<small>Nel calendario «Slate» del telefono</small></span><span class="switch on"></span></div>
  <div class="litem"><span class="ic">${ic('cal')}</span><span class="nm">Calendario di destinazione<small>Slate, sul telefono</small></span>${ic('chevR', 'mid')}</div>
</div>
<p class="lfoot">I turni non vengono copiati. Nulla lascia il telefono.</p>
<span class="lsec tag">Backup</span>
<div class="lgrp">
  <div class="litem"><span class="ic" style="background:var(--m3-sec);color:var(--m3-on-sec)">${ic('upload')}</span><span class="nm">Esporta backup<small>64 blocchi, 4 turni e le impostazioni in un file .json</small></span>${ic('share', 'mid')}</div>
  <div class="litem"><span class="ic">${ic('download')}</span><span class="nm">Importa backup<small>Sostituisce i dati di questo telefono</small></span>${ic('chevR', 'mid')}</div>
  <div class="litem"><span class="ic">${ic('history')}</span><span class="nm">Ultimo backup<small>14 nov, 21:08</small></span></div>
</div>
<p class="lfoot">Slate non ha un cloud: i dati vivono solo su questo telefono.</p>
<span class="lsec tag">Informazioni</span>
<div class="lgrp">
  <div class="litem"><span class="ic">${ic('info')}</span><span class="nm">Versione<small>1.0.0 (12)</small></span></div>
  <div class="litem"><span class="ic">${ic('shield')}</span><span class="nm">Privacy<small>Nessun account, nessun tracker</small></span>${ic('chevR', 'mid')}</div>
  <div class="litem"><span class="ic">${ic('file')}</span><span class="nm">Licenze</span>${ic('chevR', 'mid')}</div>
</div>
<div style="padding:18px 16px 0"><span class="btn btn--wide btn--ghost" style="min-height:48px;color:var(--warn);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--warn) 50%, transparent)">Elimina tutti i dati</span></div>
</div>
${navAnd('set')}<div class="gesture"></div>`];

const andCal = (name, c, on, sub = '') => `<div class="litem" style="min-height:60px"><span style="width:14px;height:14px;margin:0 13px;border-radius:4px;border:1.5px solid ${c};background:repeating-linear-gradient(135deg, ${c}99 0 1px, transparent 1px 4px)"></span><span class="nm">${name}${sub ? `<small>${sub}</small>` : ''}</span><span class="cbox ${on ? 'on' : ''}">${on ? ic('check') : ''}</span></div>`;
and['06c-device-calendars-dark'] = ['dark', `${sbarAnd()}
<div class="appbar"><span class="ibtn">${ic('arrowL')}</span><span style="flex:1"></span></div>
<div class="appbar-lg" style="top:104px"><h1 class="h-page">Calendari da mostrare</h1>
<p class="lede" style="margin-top:12px;font-size:13px">Gli eventi di questi calendari compaiono accanto ai tuoi blocchi, tratteggiati. Si modificano nell'app Calendario.</p></div>
<div style="position:absolute;top:296px;left:0;right:0">
<span class="lsec tag">Account Google</span>
<div class="lgrp">${andCal('Personale', '#7AA7D9', 1)}${andCal('Famiglia', '#E58FB4', 1)}${andCal('Università', '#8BC48A', 1)}${andCal('Festività in Italia', '#8d8d96', 0, 'Sola lettura')}</div>
<span class="lsec tag">Sul telefono</span>
<div class="lgrp">${andCal('Lavoro', '#E0B84C', 0)}<div class="litem" style="min-height:60px"><span style="width:14px;height:14px;margin:0 13px;border-radius:4px;background:var(--accent)"></span><span class="nm">Slate<small>Riceve i blocchi copiati. Non compare in Slate, così non li vedi due volte.</small></span></div></div>
</div>
${navAnd('set')}<div class="gesture"></div>`];

const andWelcome = `${sbarAnd()}
<div style="position:absolute;top:72px;left:24px;right:24px">
  ${markEl()}
  <span class="tag" style="display:block;margin-top:22px">Passo 1 di 2</span>
  <h1 class="h-display" style="font-size:52px;margin-top:12px">La tua<br>settimana,<br>a <span class="acc">blocchi.</span></h1>
  <div style="margin-top:26px">${illu(132)}</div>
  <div style="margin-top:16px">${welcomeRows()}</div>
</div>
<div style="position:absolute;left:24px;right:24px;bottom:44px;display:grid;gap:8px">
  <span class="btn btn--wide">${ic('cal')}Collega il calendario</span>
  <span class="btn btn--wide btn--ghost" style="box-shadow:none;color:var(--mid)">Non ora</span>
</div><div class="gesture"></div>`;
and['07-permission-dark'] = ['dark', andWelcome];
and['07b-permission-system-dark'] = ['dark', `${andWelcome}<div class="scrim" style="background:rgba(0,0,0,.6)"></div>
<div class="pdlg">${ic('cal')}<h3>Consentire a <b>Slate</b> di accedere al tuo calendario?</h3><div class="pb"><span class="pri">Consenti</span><span>Non consentire</span></div></div>`];

and['08-empty-dark'] = ['dark', `${andWeekBody({ empty: true, faint: true })}
<div style="position:absolute;z-index:5;left:0;right:0;top:300px;padding:44px 28px 36px;background:linear-gradient(transparent, var(--bg) 14%, var(--bg) 86%, transparent);text-align:center;display:flex;flex-direction:column;align-items:center">
  ${markEl()}
  <h2 class="h-page" style="margin-top:18px">Settimana libera</h2>
  <p class="lede" style="margin-top:12px;font-size:13px">Nessun blocco questa settimana. Tocca un'ora vuota per aggiungerne uno.</p>
  <div style="display:flex;gap:8px;margin-top:22px"><span class="btn" style="min-height:48px;padding:0 20px">${ic('plus')}Nuovo blocco</span><span class="btn btn--ghost" style="min-height:48px;padding:0 20px">Crea un turno</span></div>
</div>`];

/* ─── write ─────────────────────────────────────────────────────── */
const out = { ios, android: and };
const list = {};
for (const [plat, screens] of Object.entries(out)) {
  mkdirSync(join(here, plat), { recursive: true });
  list[plat] = [];
  for (const [name, [theme, body, cls]] of Object.entries(screens)) {
    writeFileSync(join(here, plat, `${name}.html`), page(plat, theme, body, cls));
    list[plat].push(name);
  }
}
writeFileSync(join(here, 'screens.json'), JSON.stringify(list, null, 2));
console.log(`built ${list.ios.length} iOS + ${list.android.length} Android pages`);
