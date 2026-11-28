# Android: shift icons, month view fixes and month display settings

Repo: `acrazypie/slate-mobile`, branch `android-redesign-timeline` (head `a663c2a`).
Matching web work is on `acrazypie/slate`, branch `origin` (head `ebf1f41` or later). The web app is the reference for behaviour and wording. Do not change the web repo from this task.

Develop on `android-redesign-timeline`. Push with `git push -u origin android-redesign-timeline`. Do not open a PR unless asked.

Run `npx tsc --noEmit` and the unit tests before pushing. If a test fails only because of the timezone, run it with `TZ=Europe/Rome`.

---

## 1. Shift icons (five per shift)

Every shift has one icon. The default is **day**.

| key | label (en) | icon (lucide name, outline style) | meaning |
|---|---|---|---|
| `day` | Day | `sun` | default |
| `early` | Early | `sunrise` | early shift |
| `afternoon` | Afternoon | `sunset` | afternoon shift |
| `night` | Night | `moon` | night shift |
| `flexible` | Flexible | `clock` | flexible hours |

The icons are line icons, not emoji. Use the same 24 px, 1.7 stroke outline style as the existing icons in `src/ui/icons.tsx` (the icon paths are in that file as SVG path strings). The paths for `sun`, `sunrise`, `sunset`, `moon` and `clock` come from lucide (https://lucide.dev, ISC licence): copy their path data into `src/ui/icons.tsx` the same way the other icons are stored.

Data:
- Add an `icon` text field to the Shift record in `src/data/schema.ts`. Valid values are the five keys above.
- A shift saved without an icon (any shift made before this change) shows the `day` icon. Normalise unknown or missing values to `day` when reading.
- Backup export and import carry the field. Old backup files without it import with `day`.

Shift form (`src/sheets/ShiftSheet.tsx`):
- Add an **Icon** group above **Colour**. Five buttons in one row, each with the icon above its label. The selected one uses the accent fill, the same as the colour selection.
- A new shift starts on `day`. Editing a shift shows its saved icon.
- The icon is saved with the rest of the form.

---

## 2. Month view: shift display settings

Two new settings, next to the existing month style choice in Settings (Default view):

**Shifts in the detailed month view** (`monthDetailedShift`, default `compact`)
- **Compact**: the shift is a chip with its title and hours, as now.
- **Full**: the whole day cell is filled with the colour of the day's first shift. The cell shows the day number and that shift's icon, centred. The events of that day are not drawn in this mode. The day number and icon use dark text on light colours and white text on dark colours (same rule as the web: `textOn` in `lib/monthStyle.ts`: luminance `(0.299r + 0.587g + 0.114b)/255 > 0.6` means dark text). A today cell keeps a ring around its number, not a filled circle.

**Shifts in the compact month view** (`monthCompactShift`, default `dot`)
- **Dot**: the square-per-item style, as now.
- **Line**: each shift on the day is drawn as a thick bar (about 6 px tall, rounded ends) in the shift's colour, along the bottom of the day cell, inset about 4 px from the cell edges. Up to three bars per cell. Events of that day stay as small dots above the bars.

Strings: add these keys in all languages Android supports (copy wording from the web `shiftDisplay` block in `lib/i18n/dictionaries/*.ts`):
`shiftDisplay.icon`, `day`, `early`, `afternoon`, `night`, `flexible`, `detailedTitle`, `compactTitle`, `detailedCompact`, `detailedFull`, `compactDot`, `compactLine`, `detailedHint`, `compactHint`.

Settings:
- Add the two keys to the settings schema with defaults `compact` and `dot`. Store them with the other month settings.
- Show the two choices under the month style choice in `src/screens/SettingsScreen.tsx`, each with its hint text. Use the existing segmented-control component.

---

## 3. Month view: detailed view must fit the screen

On a phone (tested at 390 × 844) the detailed month showed the top weekday row scrolling away. The whole month must fit the space between the header and the tab bar, with no scrolling.

- `src/screens/MonthView.tsx` already uses `gridTemplateRows: repeat(rows, minmax(0, 1fr))`. Check that no ancestor allows scrolling in detailed mode, and that the weekday row stays fixed.
- Cells must not grow past their row: clip overflow inside each cell. Keep the title and time text on one line each (truncate).
- Test: the month container's scroll height must equal its visible height in detailed mode, for a 6-row month, on a small phone and a large phone.

## 4. Month view: compact view has no blank space

On the web the compact month had a large empty gap between the last week row and the day list below it, because the week rows stretched to fill the screen. On Android, make sure the week rows take only the height they need in compact mode, so the selected day's list sits directly under the grid. The list itself may scroll.

Check the same for Android's compact `MonthView` (the `compact` branch).

## 5. Space under the tab bar

The tab bar sits too close to the bottom edge. The iPhone home indicator (and Android's gesture bar) sits right on the labels.

- Add space below the tab labels: about 12 px on top of the system inset. On iPhone the web uses `padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem)`.
- Android: the `.tabbar` rule in `src/styles/android.css` already uses `padding: 12px 8px var(--sb)`. Check on a device with gesture navigation and with three-button navigation that the labels clear the bar by a visible margin. If not, add the difference, not more than 16 px.
- Keep the tab bar's background and the page's last row unchanged.

## 6. Check: the compact month's plus button

On the web the plus button in the compact month used to add an event straight away. It now opens the same "What do you want to add? Event / Shift" choice as the calendar. On Android, check that the plus button in the compact month does the same. If it adds an event directly, change it to the same choice sheet the calendar uses.

---

## Acceptance checks

- A new shift defaults to the day icon. Saving a shift with another icon shows that icon in the month view (full mode) and in the shift sheet when reopened.
- Old shifts without an icon show the day icon everywhere.
- Detailed month, compact style: the grid never scrolls; a 6-row month fits.
- Detailed month, full style: a day with a shift is filled with its colour, shows its icon, and shows no event chips. The day number and icon are readable on every colour in the shift colour palette.
- Compact month, line style: a shift shows as a bar at the bottom of its day; an event shows as a dot. No empty band between the grid and the day list.
- Compact month, dot style: as before.
- Settings: both new choices are saved and applied when the calendar is opened again.
- Tab bar labels sit clear of the home indicator / gesture bar on iPhone and Android.
- Backup export then import keeps the icon of every shift.
- Strings exist in every language the app ships.

## Notes on the web choices

- The web chose `early` = sunrise, `afternoon` = sunset, `flexible` = clock. These are the only two icons not named in the brief. Keep them the same on Android unless the owner asks otherwise.
- The web's "line" style draws one bar per shift, up to three, and keeps events as dots above the bars.
- The web's "full" style uses the first shift of the day when a day has more than one.
