# Slate app: design notes

Mockups for the Capacitor version of Slate (iOS and Android). The renders are in
`docs/mockups/{ios,android}/*.png`, side by side in `docs/mockups/index.html`.
The HTML/CSS behind them is in `docs/mockups/src/`:

| File | What it is |
|---|---|
| `tokens.css` | DESIGN.md tokens, the Slate accent, block colours, shared components (rows, grid cards, switch, chips, HUD) |
| `ios.css` / `android.css` | Platform chrome: bars, tab/navigation bar, sheets, lists, pickers, system dialogs |
| `build.mjs` | Generates `src/ios/*.html` and `src/android/*.html` from shared templates and sample data |
| `render.mjs` | Screenshots each page at 3x with headless Chromium (`PW=<path to playwright-core> node render.mjs [filter]`) |

The CSS is reference code: class names and values can be lifted into the app,
but the layout uses absolute positioning to fake device frames and is not meant
to ship.

Copy is Italian, taken from `lib/i18n/dictionaries/it.ts` where it existed.

---

## 1. Accent: "Gesso" (chalk citron)

| Token | Dark | Light |
|---|---|---|
| `--accent` | `#d4ee5e` | `#5a7000` |
| `--accent-lo` | `rgba(212,238,94,.10)` | `rgba(90,112,0,.07)` |
| `--accent-md` | `rgba(212,238,94,.22)` | `rgba(90,112,0,.15)` |
| `--accent-hi` | `rgba(212,238,94,.36)` | `rgba(90,112,0,.28)` |
| `--accent-ink` | `#0a0a0a` | `#ffffff` |

Contrast: `#d4ee5e` on `#0a0a0a` is 15.3:1; `#5a7000` on `#fafafa` is 5.4:1 and
white ink on `#5a7000` is 5.6:1, so the light accent works for text and for
filled buttons.

Why this colour:

- **Nothing else on the grid is this hue.** In Slate the colour of a block
  carries meaning (category or shift). The accent marks app chrome only: today,
  the now line, the active tab, the FAB and primary buttons, switches, the
  accent word in titles. It has to be impossible to confuse with a block. The
  block and shift palette in `lib/types.ts` covers violet, apricot, sand, dune,
  cacao, raspberry, teal and sky blue; the yellow-green range around 70° is
  empty.
- **It stays clear of the other apps' accents.** Portfolio green `#4ade80` sits
  at about 142°, sudoku blue and colorPaletteGenerator mandarin are far away.
  Citron reads as yellow-green, not green.
- **It fits the name.** Chalk on slate: a bright mark on a near-black board.

The user-configurable accent from the web app stays, but **presets that equal a
block colour are dropped** (Albicocca, Verde acqua, Azzurro, Viola, Lampone and
anything else in `COLOR_PALETTE` / `CATEGORY_COLORS`), so the accent can never be
mistaken for a block. Settings shows Gesso `#d4ee5e` (default), Ambra `#e0b84c`,
Salvia `#8bc48a`, Rosa `#e58fb4` and the custom colour swatch. A custom accent
should derive `-lo/-md/-hi` from the same hue with the alphas above, and pick
`--accent-ink` by luminance (as `lib/accent.ts` already does). For the light
theme, darken the chosen accent until it reaches 4.5:1 on `#fafafa`.

All other tokens are DESIGN.md as written (neutrals, `--warn`, `--ok`, fonts,
easing).

---

## 2. Type

| Role | Font | Size |
|---|---|---|
| Large title (iOS) / large app bar title (Android) | Syne 700 | 34px, tracking -0.03em. One accent word or accent full stop **only** on the three tab titles (Calendario, Turni, Impostazioni) and the onboarding display; never on sheets, sub-pages or empty states |
| Inline/collapsed title | Syne 700 | 17px (iOS), 22px (Android) |
| Onboarding display | Syne 700 | 50–52px, line-height 0.9 |
| Sheet title | Syne 700 | 17px centered (iOS), 22px left (Android) |
| Row name | Syne 700 | 16–17px |
| Settings row label | DM Mono 400 | 14px (iOS), 15px (Android) |
| Meta, times, notes | DM Mono 400 | 11.5–13px, `--mid`, `tabular-nums` |
| Eyebrow / tag | DM Mono 400 | 11px uppercase, tracking 0.2em, `--accent`. Only when it carries information (`Settimana 48, 23–29 nov`, `Passo 1 di 2`); no filler eyebrows |
| Section / form label | DM Mono 400 (iOS), system 600 14px in `--accent` (Android) | 12px **sentence case**, tracking 0.01em, `--mid`. Uppercase stays only for `.tag` and the weekday heads (LUN, MAR…) |
| Grid card text (week) | DM Mono 400 | 9px tracking -0.035em, time 8.5px |
| Buttons, tab labels, segmented controls (both platforms) | System font (SF Pro / Roboto), 600 | 15–16px buttons, 10px iOS tab, 12px Android nav |

The system font is used only for native controls, following the sudoku app.
The renders use Inter as a stand-in for SF Pro/Roboto; the app should use
`-apple-system, Roboto, system-ui`.

Every number (times, dates, hours) uses `font-variant-numeric: tabular-nums`.

---

## 3. Calendar items

Three kinds of thing share the grid. They differ by **fill**, not just colour,
so they stay distinct for colour-blind users and in the light theme.

| Kind | Fill | Edge | Text |
|---|---|---|---|
| **Slate block** | `color-mix(block colour 20%, --bg)` (26% in light) | 3px solid left bar in the block colour (`inset 3px 0 0`); in light the bar is mixed 78% with black | Title `--text`, time `--mid` |
| **Shift** | `color-mix(shift colour 11%, --bg)` (14% light) | 1px **dashed** outline, shift colour at 70% | Title `--text`, time `--mid` |
| **Device-calendar event** | none: `--bg` plus a 45° hatch, 1px lines every 6px, calendar colour at 30% (40% light; 13% on large day-view cards so text stays readable) | 1px **solid** outline, calendar colour at 55% | Title `--mid`, time `--dim` (day view: title `--text` at 75%) |

Shared card specs:

- Radius 6px in the week grid, 10px in the day view. 2px inset from the column
  lines.
- Week grid: padding `3px 2px 3px 5px`, 1.5px inset, title clamps to **2 lines**
  with `overflow-wrap: anywhere` + `hyphens: auto` (long words break, ellipsis
  on the last line), time shows only when the card is taller than ~52px.
- Device events: the title and time sit on a small solid `--bg` patch so the
  hatch never runs through text; title at `--text` 82% opacity.
- The all-day strip has no label in the gutter. Times in compact form (`09–11`,
  `14:30–17`).
- Day view: meta row in sentence case (category icon in block colour +
  `Lezione, ogni settimana`, or `Università (Google)` for device events), Syne 17px title, mono 12px time
  range + duration + repeat icon.
- Overlap: keep the web rule (`layoutOverlaps`, shifts take the left half when a
  day has both shifts and events).
- All-day device events: an 18px hatched chip in the all-day strip under the day
  header.
- **Now line**: 1px `--accent-hi` across the week, 2px `--accent` over today's
  column, with a 8px accent square (the quadratino) at its start. In the day
  view a 16px accent pill in the hour gutter shows the time (`15:20`).
- **Today**: day number in a 30px accent circle with `--accent-ink`, weekday in
  accent, column tinted `rgba(accent, .035)`.
- Day header shows the planned hours per day (`4h30`) in 9px `--dim`.
- A legend (`Blocco`, `Turno`, `Calendario`) sits above the day view grid.

Month view: each day gets up to 3 squares of 5px (radius 1.5px): filled for
blocks, dashed outline for shifts, solid outline for device events. The selected
week is a row with `--accent-lo` and 10px end radii. Below the grid, a summary
(no extra header): two-cell HUD (week hours, month hours in accent, each with a 2px progress bar)
and 30px rows per category (square, name, 3px bar in the category colour,
hours right-aligned).

---

## 4. Device calendar sync

Replaces Google Calendar. Suggested plugin: a Capacitor calendar plugin backed by
EventKit (iOS) and CalendarContract (Android).

**Flow**

1. First launch shows the pre-permission explainer (`07-permission`): mark,
   tag `Passo 1 di 2`, display title "La tua settimana, a blocchi.", a
   small preview of the three card styles, three rows (not numbered) explaining
   what happens, then `Collega il calendario` (primary) and `Non ora` (text).
2. Only after the tap does the app call the system prompt (`07b`). On iOS ask
   for full access (`requestFullAccessToEvents`); if the user only wants to
   write, iOS 17 write-only access is enough for the copy feature. Purpose
   string: "Slate mostra i tuoi eventi accanto ai blocchi e, se lo scegli,
   copia i blocchi in un calendario «Slate». Nulla lascia il telefono."
3. Step 2 of 2 (not rendered) is the calendar picker (`06c`), reused from
   Settings.
4. `Non ora` lands on the empty week (`08`). Settings keeps the way back in.

**Settings section "Calendari del dispositivo"**

- `Accesso al calendario`: status (`Completo` with a `--ok` square, or
  `Non consentito` with a button that opens system settings).
- `Calendari mostrati` → picker: calendars grouped by account (iCloud, Google,
  On this phone), each with a hatched colour square and a checkmark (iOS) or
  checkbox (Android). Read-only calendars say `Sola lettura`.
- `Copia i blocchi` switch: Slate writes its blocks into a dedicated calendar.
- `Destinazione`: defaults to a calendar named "Slate" that the app creates.
  That calendar is never shown as device events (it would duplicate the
  blocks); the picker says so.
- Footnote: shifts are not copied, nothing leaves the phone.

Device events are read-only inside Slate; tapping one opens a small sheet with
details and "Apri in Calendario".

---

## 5. Backup

No cloud, so Settings gets a `Backup` group:

- `Esporta backup`: writes a `.json` (blocks, shifts, assignments, settings) and
  opens the share sheet. Meta line says what is in it. Leading icon in accent.
- `Importa backup`: file picker, then a confirmation sheet ("Sostituisce i dati
  di questo telefono").
- `Ultimo backup`: date and time of the last export.
- Footnote: "Slate non ha un cloud: i dati vivono solo su questo telefono."
- `Elimina tutti i dati` at the bottom of Settings, in `--warn`, with a
  confirmation.

---

## 6. Platform differences

| | iOS | Android |
|---|---|---|
| Frame | 390×844, status 54px (Dynamic Island), home indicator 34px | 412×915, status 40px (punch hole), gesture inset 24px, edge-to-edge |
| Top of screen | 44px glass buttons (`Oggi`, summary, accent `+`), large Syne title below that collapses into an inline 17px title on a `--nav-bg` blur bar with a hairline | 64px top app bar: Syne 22px title with an 10px accent eyebrow, 48px icon buttons (today, summary, overflow). Settings/Shifts use a large flexible app bar (34px title) that collapses to a solid `--m3-c` bar |
| View switcher | Capsule segmented control, 34px, track `rgba(118,118,128,.2)`, thumb `#2a2a2e` (white in light), system font 13px 600, sentence case | M3 segmented buttons, 40px, 1px outline, selected segment in secondary container with a check icon, system font 13px |
| Main nav | Floating glass capsule tab bar: inset 20px, 22px from bottom, 62px tall, radius 31px, blur 24px saturate 180%. Active item: `--accent-md` pill, accent icon + label | M3 navigation bar: 80px + gesture inset, `--m3-c` background, 64×32 pill indicator in secondary container |
| New block | Accent round `+` in the nav bar | FAB 56px, radius 16px, `--accent` fill (square on the week grid, extended "Nuovo" / "Nuovo turno" elsewhere). The FAB has the only non-toast shadow in the system |
| Sheets | Grabber 36×5, radius 26px, top at 64px (large detent), the screen behind scales to 0.92 and dims. Bar: round ✕ left, centered Syne title, accent round ✓ right | Modal bottom sheet, drag handle 32×4, radius 28px, scrim 50%. Bar: ✕, left-aligned Syne title, filled `Salva` pill |
| Forms | Title as a large Syne input with accent caret; values in grouped rows; date/time as tinted pills that expand into an inline wheel (band `rgba(118,118,128,.2)`, radius 10, selected value in Syne) | Outlined text fields (56px, radius 8, 2px accent when focused, floating label); filter chips radius 8; M3 time picker dialog with a 24h dial (inner ring 12–23), selected value in an accent circle |
| Settings | Inset groups: margin 16px, radius 16px, `--group-bg` (`#151517` dark, white on `#f2f2f5` light), 52px rows, hairline inset to 52px, chevrons in `--dim`. Section labels mono sentence case `--mid` | Separated tonal list items (2px gap, outer radius 20px, inner 4px), 64px min height, 40px round icon container, label + subtitle. Section labels in accent |
| Switch | 51×31 pill, `--line-hi` off, `--accent` on with `--accent-ink` knob (white knob in light) | 52×32 M3 switch: outlined off with a 16px knob, `--accent` on with a 24px `--accent-ink` knob |
| Shifts list | DESIGN.md hairline rows (no index numbers: the list is not a sequence; dashed colour glyph, Syne name, meta, accent chevron) | Tonal list items with a 40px dashed glyph and the next date on the right |
| System permission | iOS alert (OS-drawn) | Android permission dialog (OS-drawn) |

### Android tonal tokens (derived from the accent hue)

| Token | Dark | Light |
|---|---|---|
| `--m3-c-low` (sheets) | `#111214` | `#f4f4f6` |
| `--m3-c` (nav bar, list items) | `#161719` | `#efeff2` |
| `--m3-c-high` (dialogs) | `#1c1d20` | `#e9e9ed` |
| `--m3-c-highest` (icon circles, inputs) | `#25262a` | `#e2e2e7` |
| `--m3-sec` (secondary container) | `#2c3314` | `#e1eac0` |
| `--m3-on-sec` | `#e2f1a3` | `#1d2400` |
| `--m3-outline` | `#8d8d96` | `#74747e` |

### iOS tokens

| Token | Dark | Light |
|---|---|---|
| `--group-bg` | `#151517` | `#ffffff` (page `#f2f2f5`) |
| `--glass` | `rgba(28,28,31,.66)` | `rgba(255,255,255,.72)` |
| `--glass-line` | `rgba(255,255,255,.12)` | `rgba(0,0,0,.07)` |
| `--sheet-bg` | `#111113` | `#fafafa` |

---

## 7. Component specs (shared)

- **Rows**: DESIGN.md rows, min-height 58px; 52px in iOS groups; 64px Android
  list items; 30px summary rows in the month view.
- **Chips**: 34px, pill (iOS) / radius 8 (Android), category dot 8×8 radius 2;
  selected = `--accent-md` fill + `--accent-hi` border (iOS) or secondary
  container + check (Android).
- **Colour swatches**: 30px circles (32px Android, 25–28px for the accent row),
  selected ring `0 0 0 2px --bg, 0 0 0 4px colour` with a dark 8px square in the
  middle.
- **Time tiles** (shift editor): radius 14–16px, 1px `--line-hi`; the active
  tile gets a 1.5px accent ring and `--accent-lo` fill; value in Syne 32px.
- **Empty state**: mark (3×3 quadratini), plain Syne title ("Settimana libera"),
  lede "Nessun blocco questa settimana. Tocca un'ora vuota per aggiungerne
  uno." (device events may still show, so it talks about blocks), primary
  `Nuovo blocco` and
  ghost `Crea un turno`. The grid stays visible at 55% behind a vertical fade.
- **Motion**: DESIGN.md `--ease` for everything; sheets 0.4s; switch and
  segmented thumb with `--spring`; native sheet/alert/picker motion is left to
  the OS where the control is native.
- **Safe areas**: `env(safe-area-inset-top/bottom)`; content scrolls under the
  iOS tab bar (with a fade from transparent to `--bg`) and under the
  translucent iOS nav bar.

---

## 8. Open points

- Copy (decided): Slate's own items are **blocco / blocchi** (`Nuovo blocco`,
  `64 blocchi`); "evento" is used only for device-calendar events.
- Meta strings avoid `A · B` joins; use commas or parentheses
  (`09:00–13:00, 4h`, `Università (Google)`). The language row keeps
  `IT · Italiano` as DESIGN.md specifies (code + native name).
- iOS 26 "Liquid Glass" is approximated with blur + translucent fills; real
  native tab bars may look different under Capacitor unless a native tab bar
  plugin is used.
