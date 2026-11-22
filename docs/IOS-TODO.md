# iOS: what's needed to continue

Everything for iOS is in the repo (`ios/` project, Swift Package Manager
plugins including `@ebarooni/capacitor-calendar`, usage strings in
`Info.plist`), but it has **never been built or run**: iOS builds need macOS +
Xcode, and this project is developed on Linux. The UI was only checked in the
iOS look of the desktop web preview (`npm run dev`), not on a device.

## What I need from you

| Need | For | Required now? |
|---|---|---|
| A Mac (or a `macos-latest` GitHub runner) with **Xcode 26+** | building, Simulator testing | Yes |
| Free Apple ID signed into Xcode | running on your own iPhone (7-day builds) | Optional |
| **Apple Developer Program** membership | TestFlight, App Store | Only before release |
| App Store Connect record for `com.egenesio.slate` | TestFlight / release | Only before release |

## Steps on the Mac

```bash
git clone <slate-app repo> && cd slate-app
npm ci
npm run ios          # build web → cap sync → opens Xcode
```

In Xcode: pick an iPhone simulator → Run. No CocoaPods step (SPM).

## Checks still to do on iOS

- [ ] App launches, splash hides once the first screen appears.
- [ ] Status bar icons follow the theme (light icons on dark, dark on light) and flip when toggling.
- [ ] Dynamic Island / home indicator: header below the island, floating tab bar above the indicator, sheets padded (`env(safe-area-inset-*)`).
- [ ] No text selection / callouts on long press, no rubber-band bounce (`overscroll-behavior: none`).
- [ ] **Calendar permission**: first launch → "Connect your calendar" → system alert shows the full-access purpose string. Try all three answers:
      Allow Full Access (events appear, picker lists iCloud/Google/… calendars),
      Add Events Only (Settings shows "Add events only" + the explanation; copy is disabled),
      Don't Allow (Settings shows "Denied" and how to enable it in iOS Settings).
- [ ] Copy blocks on: a "Slate" calendar is created (in the default source) and filled; editing / deleting a block updates it; "Remove blocks from the calendar" empties it.
      If `createCalendar` fails on accounts without a local source, choose an existing writable calendar as destination and note it here.
- [ ] Coming back to the app after editing the "Slate" calendar in Apple Calendar: Slate's version wins again.
- [ ] All-day events from iCloud land on the right day (the code assumes local midnight on iOS, UTC on Android).
- [ ] Settings › Export opens the share sheet (Save to Files works; cancelling shows no error); Import picks that file, shows the confirmation, replaces data.
- [ ] Native `<input type="date|time">` open the iOS wheels; `<select>` opens the picker.
- [ ] Haptics on a real iPhone (save, delete, view switch, toggles).
- [ ] Swipe left/right changes day / week / month and doesn't fight the iOS back-swipe (there is no navigation stack, so it shouldn't).

## Known iOS-specific risks

- If bounce still appears, set `WKWebView.scrollView.bounces = false` in a small view-controller tweak.
- Status bar style needs `UIViewControllerBasedStatusBarAppearance = YES` (default in the generated Info.plist).
- `backdrop-filter` on the glass tab bar costs GPU on older iPhones; drop the blur if scrolling the week stutters.
