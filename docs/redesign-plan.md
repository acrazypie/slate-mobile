# Slate redesign plan: your system, with a few SuperShift ideas

Goal: keep the look you already built (DESIGN.md and `docs/design-notes.md`) and bring in the
useful parts of SuperShift: cycles of shifts, breaks, pay, search and printing. The ideas are
reimagined for Slate's rules (hairlines, one accent, Syne and DM Mono, local only). Nothing is
copied from SuperShift's screens, icons, copy or assets.

## 1. What stays (non-negotiable)

- **Gesso accent** `#d4ee5e` (light `#5a7000`) as the only accent; one accent word per title.
- **Syne 700 + DM Mono**, self-hosted; mono never bold; `tabular-nums` on every number.
- **Hairlines, not cards.** Rows separated by 1px `--line`. Shadows only on toasts and menus.
- **Three kinds of thing on the grid, told apart by fill, not only colour**: block (solid fill
  + left bar), shift (dashed outline), device event (hatched). This matters for the new features.
- Motion: `--ease`, 2–4px moves, `prefers-reduced-motion` respected.

## 2. The problems to solve (from the code and the current screens)

1. Shifts are only a list of definitions and per-day placements. Repeating work patterns mean
   placing every day by hand.
2. Hours are shown, but not what they are worth, and breaks do not exist.
3. The summary is a bar list. It answers "how many hours", not "what is this week worth".
4. Finding a past shift or block means scrolling the calendar.
5. There is no way to hand a schedule to someone who is not using Slate, other than a JSON backup.

## 3. Reimagined features and how they look

| Idea (SuperShift) | Slate version | Visual language |
|---|---|---|
| Rotations (repeating shift patterns) | **Cycles**: a repeating run of days you can see at once | A horizontal strip of day cells, 7–28 wide, wrapping in rows of 7. Each cell: day number in mono, the shift's colour as a 3px bottom bar (or hatched for off). Tap a cell to pick a shift or "off" in a bottom sheet. The strip is the editor and the preview. Placing a cycle = a Syne line "Dal lun 7 dic, per 4 settimane" and one accent button. |
| Unpaid breaks | **Break as a notch** inside the shift card | The shift keeps its dashed outline; the break is a thin band (`--line` hatch, 1px lines every 4px) on the card at the break position. Default position: halfway. The band is the only hatch on shifts, so it does not clash with device events (which use 45°, 6px). In the editor, the break is a stepper in 5-minute steps and the note reads "7h30 pagate". |
| Earnings and overtime report | **Pay ledger** in the summary | One Syne number in accent for earnings (large, `clamp`), underneath a single 2px bar split into regular (`--text` 30%) and overtime (accent). Labels in mono caps: `ORDINARIE 40h`, `STRAORDINARIO 5h30`. Hidden until a rate is set, so the default screen stays quiet. |
| Count by shift type | Rows in the summary, same as categories today | Existing `srow` component; add the shift names as rows. |
| Extra-pay conditions (night, weekend premiums) | Later phase: a rate multiplier per shift, shown as a small `×1.25` chip on the shift row | Chip style from DESIGN.md §3 (mono, tiny, accent hairline border). |
| Holidays | A "giorno festivo" mark on the day header, in `--gold` (not accent) | Keeps the accent for the user's own things. |
| Alarms per shift | Settings › Shifts › Reminder, one time offset, no per-shift sound picker | Switch and row from the current settings screen. Native plugin needed. |
| Search | Search icon in the calendar header opens a full-height sheet with one mono input | Results as rows (index, title in Syne, date and time in mono meta). Tapping jumps to the day. |
| Printable schedule | "Stampa" action in the summary: a print-only page with the month grid, hairlines, no colour fills | Designed as a static HTML page with print CSS; shared with Capacitor Share as PDF from the webview's print. No SuperShift layout. |
| Calendar file export (.ics) | Settings › Backup › "Calendario (.ics)" next to JSON | Same share sheet as the backup. |
| Sharing with people | Not in Slate (no accounts) | Covered by printable export and .ics. |

## 4. Screen by screen

**Calendar (week / day / month).** No layout change. Shifts gain the break notch. The header
gets a search icon (44px target). The now-line and today marker are unchanged.

**Shifts tab.** Title stays "Turni" with the accent word. The month HUD becomes
`turni` · `ore pagate` · (when a rate is set) `guadagno`. Below the shift list, a **Cicli**
section (eyebrow in accent when empty, section label in mono sentence case otherwise) with the
cycle rows. Each cycle row shows its strip in miniature (7 cells at 10px) so it reads at a glance.

**Cycle editor (bottom sheet, 16px radius).** Title field, length as a segmented control
(7 · 14 · 28 and "altro"), the strip, then "Posiziona nel calendario": start date, length in
weeks, accent button. A ghost button deletes. Save is in the sheet header, as for shifts.

**Summary sheet.** Week / month switch, two HUD cells (hours, and earnings when set), the
category and shift rows, and a "Stampa" ghost button at the bottom.

**Settings.** A "Pagamento" group (rate, currency, overtime limit, multiplier) is already built.
Next: a "Promemoria" group for alarms, and "Calendario (.ics)" under Backup.

## 5. Tokens to add (one addendum to DESIGN.md, no existing value changes)

```css
--hatch-unpaid: repeating-linear-gradient(90deg, var(--line-hi) 0 1px, transparent 1px 4px);
--cycle-off:    var(--dim);          /* off days in a cycle strip */
--pay-regular:  var(--text);         /* at 30% in the ledger bar */
--pay-overtime: var(--accent);
--holiday:      var(--gold);         /* holiday mark, not accent */
```

The strip cells use `--bg-raise` for the cell fill and `--line` for their outline. Shift colours
come from the existing palette, so they keep the same meaning as in the calendar.

## 6. Accessibility rules for the new parts

- Every cycle cell says its day number and shift name in text (`aria-label`). Colour is never the
  only signal: off days show `—`, shift days show the shift's initial in mono.
- The break notch has a text equivalent in the card's `aria-label` ("pausa 30 min").
- Targets: cycle cells are at least 36px wide and 44px tall on phones, with a visible focus ring
  (`:focus-visible`, accent outline).
- `--dim` text only for decorative labels (cell indices), never for the pay numbers.

## 7. How to work on it (design plugins and skills)

These are the skills available in this environment that fit each step. Run them in this order:

1. `design:design-system`: audit the tokens and add the addendum in section 5; check naming.
2. `frontend-design:frontend-design`: confirm the direction (what is distinctive about Slate)
   before any new screen is built.
3. `design:ux-copy`: review the new Italian and English strings in `src/i18n/dictionaries/`.
4. `design:design-critique` and `ui-design-review:ui-review`: run on screenshots of the week
   view, the shifts tab and the cycle editor (`npm run dev`, then `?platform=android` and
   `?platform=ios`). These list what to fix, most important first.
5. `ui-design-review:ui-polish`: apply the fixes the review picks.
6. `design:accessibility-review`: check section 6 against the built screens.
7. `mobile-app-design:ios-screens` and `mobile-app-design:ios-flows`: iOS conventions for the
   cycle editor sheet and the search sheet. The UXKIN-backed comparisons need the `uxkin`
   plugin authorised via `/mcp`; the skills still work without it, using platform conventions.
8. `design:design-handoff`: a spec for the cycle strip and the pay ledger once they are stable.

Not run yet: the skills above need screenshots of the current app, and this change did not
capture any. Starting with step 4 is the quickest way to get a list of real problems.

## 8. Phases

1. **Tokens and audit.** Addendum in DESIGN.md; critique of the current screens.
2. **Breaks in the calendar.** Notch on shift cards, break stepper (done in data and editor).
3. **Cycles.** Strip editor, placement, miniature strips in the list (data and placement done).
4. **Pay ledger.** Summary ledger and print view (earnings and overtime data done).
5. **Search, .ics export, reminders.** Reminders need the native notifications plugin.

## 9. Open questions for you

- Keep the Italian names for new things ("Cicli", "Pagamento", "Stampa"), or use English on
  every language?
- Is the break always halfway, or should you be able to set where it falls?
- Do you want the earnings number visible on the Calendar header, or only in the summary?
