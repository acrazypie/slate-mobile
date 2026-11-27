import { useEffect, useState } from 'react';
import { useSettings, repo } from './store';
import { applyAppearance, iconKeyFor, onSystemThemeChange } from './theme';
import { useI18n } from '../i18n/I18n';
import { hideSplash, setHapticsEnabled, setRootBackHandler, haptics, syncStatusBar } from '../native/platform';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { ShiftsScreen } from '../screens/ShiftsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Onboarding } from '../screens/Onboarding';
import { startNotifications } from '../notify/notifications';
import { syncAppIconOnStart } from '../native/appIcon';
import { Icon, type IconName } from '../ui/icons';
import { useToast } from '../ui/controls';

type Tab = 'calendar' | 'shifts' | 'summary' | 'settings';
const TABS: { id: Tab; icon: IconName }[] = [
  { id: 'calendar', icon: 'calendar' },
  { id: 'shifts', icon: 'briefcase' },
  { id: 'summary', icon: 'chart' },
  { id: 'settings', icon: 'settings' },
];

export function App() {
  const settings = useSettings();
  const { t } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('calendar');

  useEffect(() => {
    applyAppearance(settings);
    return onSystemThemeChange(() => applyAppearance(repo.getSnapshot().settings));
  }, [settings.theme, settings.accent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);

  // The launcher icon follows the saved choice (Android; see syncAppIconOnStart).
  useEffect(() => {
    const s = repo.getSnapshot().settings;
    syncAppIconOnStart(iconKeyFor(s.accent, s.oled));
  }, []);

  // Reminders, the new-version notice and taps on them; reschedules after every change.
  useEffect(() => startNotifications(() => setTab('settings')), []);

  // Other screens ask for a tab with a 'slate:navigate' event (see goToTab in SummaryPanel).
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: Tab }>).detail?.tab;
      if (tab) setTab(tab);
    };
    window.addEventListener('slate:navigate', onNavigate);
    return () => window.removeEventListener('slate:navigate', onNavigate);
  }, []);

  useEffect(() => {
    hideSplash(() => syncStatusBar(document.documentElement.dataset.theme !== 'light'));
    if (repo.loadProblem) toast(t.settings.loadProblem, 'warn');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Android back with no sheet open: other tabs go back to the calendar.
  useEffect(() => {
    setRootBackHandler(() => {
      if (tab !== 'calendar') {
        setTab('calendar');
        return true;
      }
      return false;
    });
  }, [tab]);

  if (!settings.onboarded) return <Onboarding onDone={(connected) => setTab(connected ? 'calendar' : 'calendar')} />;

  return (
    <div className="app" data-tab={tab}>
      <main className="app__main">
        {tab === 'calendar' && <CalendarScreen onGoToShifts={() => setTab('shifts')} />}
        {tab === 'shifts' && <ShiftsScreen />}
        {tab === 'summary' && <SummaryScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <nav className="tabbar" aria-label={t.nav.calendar}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`tabbar__item${tab === x.id ? ' active' : ''}`}
            aria-current={tab === x.id ? 'page' : undefined}
            onClick={() => {
              if (tab !== x.id) haptics.tick();
              setTab(x.id);
            }}
          >
            <span className="tabbar__icon"><Icon name={x.icon} /></span>
            <span>{t.nav[x.id]}</span>
          </button>
        ))}
      </nav>
      <div className="tabfade" aria-hidden="true" />
    </div>
  );
}
