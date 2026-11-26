import { useEffect, useRef, useState } from 'react';
import { kv, repo, useData, useSettings } from '../app/store';
import { ACCENT_OPTIONS } from '../app/theme';
import { useI18n } from '../i18n/I18n';
import { fill, formatDate } from '../i18n/format';
import { LOCALES, LOCALE_NAMES, isLocale } from '../i18n/config';
import { appVersion, haptics, isNative, platform } from '../native/platform';
import { exportBackup, LAST_EXPORT_KEY, readFile } from '../backup/backup';
import { SlateRepository, type ImportError } from '../data/repository';
import type { MonthStyle, SlateData, ThemeSetting } from '../data/schema';
import type { ViewMode } from '../lib/types';
import { useDeviceCalendar } from '../calendar/CalendarProvider';
import { Group, Row, Segmented, Swatches, Switch, useToast } from '../ui/controls';
import { Dialog, useBackHandler } from '../ui/Sheet';
import { Icon } from '../ui/icons';
import { CalendarPicker } from './CalendarPicker';
import { useUpdate } from '../update/useUpdate';
import { LEAD_OPTIONS } from '../notify/plan';
import { leadLabel, permission, requestPermission, type PermissionState } from '../notify/notifications';
import type { NotificationSettings } from '../data/schema';
import { AccountScreen } from './AccountScreen';
import { AppIconPicker } from './AppIconPicker';
import { SummaryRangePage } from './SummaryRangePage';

/** The pages of Settings: the main list, one page per section, and the two full pages. */
type Page = 'main' | 'appearance' | 'pay' | 'phone' | 'backup' | 'updates' | 'about' | 'calendars' | 'account' | 'notifications' | 'summary';
const SECTION_PAGES: Page[] = ['appearance', 'pay', 'phone', 'notifications', 'summary', 'backup', 'updates', 'about'];

export function SettingsScreen() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const data = useData();
  const toast = useToast();
  const cal = useDeviceCalendar();
  const [page, setPage] = useState<Page>('main');
  const [version, setVersion] = useState('');
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<SlateData | null>(null);
  const [importText, setImportText] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const update = useUpdate();
  const fileInput = useRef<HTMLInputElement>(null);

  useBackHandler(page !== 'main', () => setPage(page === 'calendars' ? 'phone' : 'main'));
  useEffect(() => {
    void appVersion().then(setVersion);
    void kv.get(LAST_EXPORT_KEY).then(setLastExport);
  }, []);
  // Opening the Updates page always checks now, so the page never sits on "checking".
  useEffect(() => {
    if (page === 'updates') void update.check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (page === 'calendars') return <CalendarPicker onBack={() => setPage('phone')} />;
  if (page === 'account') return <AccountScreen onBack={() => setPage('main')} />;

  const set = (patch: Parameters<typeof repo.updateSettings>[0]) => void repo.updateSettings(patch);
  const setCal = (patch: Partial<typeof settings.calendar>) => set({ calendar: { ...settings.calendar, ...patch } });
  const setNotify = (patch: Partial<NotificationSettings>) => set({ notifications: { ...settings.notifications, ...patch } });

  const importMessage = (e: ImportError) =>
    e.kind === 'notJson' ? t.settings.errNotJson : e.kind === 'notSlate' ? t.settings.errNotSlate : e.kind === 'tooNew' ? t.settings.errTooNew : fill(t.settings.errInvalid, { detail: e.detail });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFile(file);
      const parsed = SlateRepository.parseBackup(text, settings);
      if (!parsed.ok) {
        haptics.warning();
        toast(importMessage(parsed.error), 'warn');
        return;
      }
      setImportText(text);
      setPendingImport(parsed.data);
    } catch {
      toast(t.settings.errNotJson, 'warn');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const accessLabel = {
    full: t.calendarSync.statusFull,
    writeOnly: t.calendarSync.statusWriteOnly,
    prompt: t.calendarSync.statusUnknown,
    denied: t.calendarSync.statusDenied,
    unavailable: t.calendarSync.unavailableShort,
  }[cal.access];
  const visibleCount = settings.calendar.visibleCalendarIds === null ? cal.calendars.filter((c) => c.id !== cal.slateCalendarId).length : settings.calendar.visibleCalendarIds.filter((id) => cal.calendars.some((c) => c.id === id)).length;
  const writable = cal.calendars.filter((c) => c.writable);
  const accentName = (hex: string) => {
    const o = ACCENT_OPTIONS.find((x) => x.value === hex.toUpperCase());
    return o ? t.colors[o.name] : t.settings.customColor;
  };

  const sectionText: Record<Exclude<Page, 'main' | 'calendars' | 'account'>, { title: string; lede: string }> = {
    appearance: { title: t.settingsPages.appearance.title, lede: t.settingsPages.appearance.lede },
    notifications: { title: t.settingsPages.notifications.title, lede: t.settingsPages.notifications.lede },
    summary: { title: t.settingsPages.summary.title, lede: t.settingsPages.summary.lede },
    pay: { title: t.settingsPages.pay.title, lede: t.settingsPages.pay.lede },
    phone: { title: t.settingsPages.phone.title, lede: t.settingsPages.phone.lede },
    backup: { title: t.settingsPages.backup.title, lede: t.settingsPages.backup.lede },
    updates: { title: t.settingsPages.updates.title, lede: t.settingsPages.updates.lede },
    about: { title: t.settingsPages.about.title, lede: t.settingsPages.about.lede },
  };

  return (
    <div className="screen page page--grouped">
      {page === 'main' && (
        <>
          <header className="page__head">
            <h1 className="h-page">{t.settings.title}{platform !== 'android' && <span className="acc">.</span>}</h1>
          </header>
            <div className="settings-groups">
              <Group label={t.settings.appearance}>
                <Row icon="moon" name={t.settingsPages.appearance.title} chevron onClick={() => setPage('appearance')} />
                <Row icon="bell" name={t.settingsPages.notifications.title} chevron onClick={() => setPage('notifications')} />
              </Group>
              <Group label={t.settingsGroups.calendars}>
                <Row icon="lock" name={t.account.title} hint={settings.google.enabled ? t.account.googleOn : t.account.googleOff} chevron onClick={() => setPage('account')} />
                <Row icon="calendar" name={t.settingsPages.phone.title} chevron onClick={() => setPage('phone')} />
              </Group>
              <Group label={t.settingsGroups.work}>
                <Row icon="chart" name={t.settingsPages.summary.title} chevron onClick={() => setPage('summary')} />
                <Row icon="layout" name={t.settingsPages.pay.title} chevron onClick={() => setPage('pay')} />
              </Group>
              <Group label={t.settingsGroups.data}>
                <Row icon="upload" name={t.settingsPages.backup.title} chevron onClick={() => setPage('backup')} />
                <Row icon="refresh" name={t.settingsPages.updates.title} chevron onClick={() => setPage('updates')} />
                <Row icon="info" name={t.settingsPages.about.title} chevron onClick={() => setPage('about')} />
              </Group>
            </div>
        </>
      )}
      {SECTION_PAGES.includes(page) && page !== 'main' && (
        <>
          <div className="page__bar page__bar--back">
            <button type="button" className="gbtn back" onClick={() => setPage('main')}>
              <Icon name="chevronLeft" /> <span>{t.settings.title}</span>
            </button>
          </div>
          <header className="page__head">
            <h1 className="h-page">{sectionText[page as keyof typeof sectionText].title}</h1>
            <p className="lede">{sectionText[page as keyof typeof sectionText].lede}</p>
          </header>
        </>
      )}

      {page === 'appearance' && (
      <Group label={t.settings.appearance}>
        <Row icon="palette" name={t.appIcon.label} hint={t.appIcon.hint} stack>
          <AppIconPicker value={settings.appIcon} />
        </Row>
        <Row icon="moon" name={t.settings.theme} stack>
          <Segmented<ThemeSetting>
            label={t.settings.theme}
            value={settings.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'light', label: t.settings.themeLight },
              { value: 'dark', label: t.settings.themeDark },
              { value: 'system', label: t.settings.themeSystem },
            ]}
          />
        </Row>
        <Row icon="palette" name={t.settings.accent} hint={accentName(settings.accent)} stack>
          <Swatches colors={ACCENT_OPTIONS.map((o) => o.value)} value={settings.accent} onChange={(accent) => set({ accent })} names={accentName} custom={t.settings.customColor} />
        </Row>
        <Row icon="layout" name={t.settings.defaultView}>
          <select className="row-select" value={settings.defaultView} onChange={(e) => set({ defaultView: e.target.value as ViewMode })} aria-label={t.settings.defaultView}>
            {(['day', 'week', 'month', 'agenda'] as const).map((v) => <option key={v} value={v}>{t.views[v]}</option>)}
          </select>
          <Icon name="chevronRight" className="irow__ch" />
        </Row>
        <Row icon="layout" name={t.settings.monthStyle}>
          <select className="row-select" value={settings.monthStyle} onChange={(e) => set({ monthStyle: e.target.value as MonthStyle })} aria-label={t.settings.monthStyle}>
            <option value="compact">{t.settings.monthCompact}</option>
            <option value="detailed">{t.settings.monthDetailed}</option>
          </select>
          <Icon name="chevronRight" className="irow__ch" />
        </Row>
        <Row icon="globe" name={t.settings.language}>
          <select className="row-select" value={settings.locale ?? ''} onChange={(e) => set({ locale: isLocale(e.target.value) ? e.target.value : null })} aria-label={t.settings.language}>
            <option value="">{t.settings.languageSystem}</option>
            {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()} · {LOCALE_NAMES[l]}</option>)}
          </select>
          <Icon name="chevronRight" className="irow__ch" />
        </Row>
        {isNative && (
          <Row icon="vibrate" name={t.settings.haptics} hint={t.settings.hapticsHint}>
            <Switch checked={settings.haptics} onChange={(haptics) => set({ haptics })} label={t.settings.haptics} />
          </Row>
        )}
      </Group>
      )}

      {page === 'pay' && (
      <Group label={t.pay.title} footer={t.pay.hint}>
        <Row icon="globe" name={t.pay.rate}>
          <input
            className="row-select"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="—"
            aria-label={t.pay.rate}
            value={settings.pay.hourlyRate ?? ''}
            onChange={(e) => set({ pay: { ...settings.pay, hourlyRate: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) } })}
          />
        </Row>
        <Row icon="globe" name={t.pay.currency}>
          <input
            className="row-select"
            type="text"
            maxLength={4}
            placeholder="€"
            aria-label={t.pay.currency}
            value={settings.pay.currency}
            onChange={(e) => set({ pay: { ...settings.pay, currency: e.target.value } })}
          />
        </Row>
        <Row icon="clock" name={t.pay.overtimeAfter}>
          <select
            className="row-select"
            value={settings.pay.overtimeAfterHours ?? ''}
            onChange={(e) => set({ pay: { ...settings.pay, overtimeAfterHours: e.target.value === '' ? null : Number(e.target.value) } })}
            aria-label={t.pay.overtimeAfter}
          >
            <option value="">{t.pay.overtimeOff}</option>
            {[35, 38, 40, 42, 48].map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </Row>
        <Row icon="layout" name={t.pay.multiplier}>
          <select
            className="row-select"
            value={settings.pay.overtimeMultiplier}
            onChange={(e) => set({ pay: { ...settings.pay, overtimeMultiplier: Number(e.target.value) } })}
            aria-label={t.pay.multiplier}
          >
            {[1.25, 1.5, 2, 2.5].map((m) => <option key={m} value={m}>×{m}</option>)}
          </select>
        </Row>
      </Group>
      )}


      {page === 'phone' && (
      <Group label={t.calendarSync.title} footer={cal.access === 'unavailable' ? t.calendarSync.unavailable : cal.access === 'full' ? <>{t.calendarSync.pushHint}<br /><br />{t.calendarSync.footer}</> : t.calendarSync.footer}>
        <Row icon="lock" name={t.calendarSync.accessRow} value={<><i className={`dot dot--${cal.access}`} />{accessLabel}</>} />
        {(cal.access === 'prompt' || cal.access === 'writeOnly' || cal.access === 'denied') && (
          <Row name={cal.access === 'prompt' ? t.calendarSync.explainerRead : cal.access === 'writeOnly' ? t.calendarSync.writeOnlyHint : t.calendarSync.deniedHint} stack>
            {/* Android can ask once more after a denial; if the user ticked "don't ask again"
                the system shows nothing and the state stays denied. iOS never re-asks. */}
            {(cal.access === 'prompt' || (cal.access === 'denied' && platform === 'android')) && (
              <button type="button" className="btn btn--small" onClick={async () => {
                const a = await cal.request();
                if (a === 'full') setCal({ showDeviceEvents: true });
              }}>
                <Icon name="calendar" /> {t.calendarSync.allow}
              </button>
            )}
          </Row>
        )}
        {cal.access === 'full' && (
          <>
            <Row icon="eye" name={t.calendarSync.showEvents}>
              <Switch checked={settings.calendar.showDeviceEvents} onChange={(v) => setCal({ showDeviceEvents: v })} label={t.calendarSync.showEvents} />
            </Row>
            {settings.calendar.showDeviceEvents && (
              <Row icon="calendar" name={t.calendarSync.visible} value={fill(t.calendarSync.countOf, { n: visibleCount, total: cal.calendars.filter((c) => c.id !== cal.slateCalendarId).length })} chevron onClick={() => setPage('calendars')} />
            )}
            <Row icon="calendarCheck" name={t.calendarSync.push}>
              <Switch checked={settings.calendar.push} onChange={(v) => setCal({ push: v })} label={t.calendarSync.push} />
            </Row>
            {settings.calendar.push && (
              <>
                <Row icon="calendar" name={t.calendarSync.target}>
                  <select className="row-select" value={settings.calendar.targetCalendarId ?? ''} onChange={(e) => setCal({ targetCalendarId: e.target.value || null })} aria-label={t.calendarSync.target}>
                    <option value="">{t.calendarSync.targetSlate}</option>
                    {writable.filter((c) => c.id !== cal.slateCalendarId || settings.calendar.targetCalendarId === c.id).map((c) => <option key={c.id} value={c.id}>{c.name}{c.account ? ` (${c.account})` : ''}</option>)}
                  </select>
                  <Icon name="chevronRight" className="irow__ch" />
                </Row>
                <Row icon="briefcase" name={t.calendarSync.pushShifts}>
                  <Switch checked={settings.calendar.pushShifts} onChange={(v) => setCal({ pushShifts: v })} label={t.calendarSync.pushShifts} />
                </Row>
                <Row
                  icon="refresh"
                  name={cal.status.syncing ? t.calendarSync.syncing : t.calendarSync.syncNow}
                  hint={cal.status.error ? fill(t.calendarSync.syncError, { error: cal.status.error }) : cal.status.lastSync ? fill(t.calendarSync.lastSync, { time: `${formatDate(locale, new Date(cal.status.lastSync), 'dayMonth')}, ${new Date(cal.status.lastSync).toTimeString().slice(0, 5)}` }) : t.calendarSync.monthlyNote}
                  onClick={async () => {
                    const n = await cal.sync();
                    if (n !== null) toast(fill(t.calendarSync.synced, { count: n }));
                  }}
                />
                <Row icon="trash" name={t.calendarSync.removeAll} danger onClick={() => setConfirmRemove(true)} />
              </>
            )}
          </>
        )}
      </Group>
      )}

      {page === 'backup' && (
      <Group label={t.settings.backup} footer={t.settings.backupFooter}>
        <Row
          icon="upload"
          name={t.settings.export}
          hint={fill(t.settings.exportMeta, { blocks: data.blocks.length, shifts: data.shifts.length })}
          chevron
          onClick={async () => {
            try {
              if ((await exportBackup()) === 'shared') {
                setLastExport(new Date().toISOString());
                haptics.success();
              }
            } catch (err) {
              console.error(err);
              toast(t.settings.exportFail, 'warn');
            }
          }}
        />
        <Row icon="download" name={t.settings.import} hint={t.settings.importHint} chevron onClick={() => fileInput.current?.click()} />
        <Row icon="clock" name={t.settings.lastBackup} value={lastExport ? formatDate(locale, new Date(lastExport), 'dayMonth') + ' ' + new Date(lastExport).toTimeString().slice(0, 5) : '—'} />
      </Group>
      )}
      <input ref={fileInput} type="file" accept="application/json,.json,text/plain" hidden onChange={(e) => void onFile(e.target.files?.[0])} />

      {page === 'notifications' && (
        <NotificationsPage settings={settings.notifications} setNotify={setNotify} />
      )}

      {page === 'summary' && <SummaryRangePage />}

      {page === 'updates' && update.status.kind !== 'unsupported' && (
        <Group label={t.update.title} footer={t.update.footer}>
          <Row
            icon={update.status.kind === 'upToDate' ? 'check' : 'refresh'}
            name={
              update.status.kind === 'upToDate' ? t.update.latest
              : update.status.kind === 'available' || update.status.kind === 'needsPermission' ? fill(t.update.available, { version: update.status.update.version })
              : update.status.kind === 'installing' ? fill(t.update.installing, { percent: update.status.total ? Math.round((update.status.received / update.status.total) * 100) : 0 })
              : update.status.kind === 'checking' || update.status.kind === 'idle' ? t.update.checking
              : update.status.kind === 'error' ? fill(t.update.error, { message: update.status.message })
              : t.update.checking
            }
            hint={
              update.status.kind === 'upToDate' ? `v${update.status.version.split(' ')[0]}`
              : update.status.kind === 'needsPermission' ? t.update.needsPermission
              : undefined
            }
          >
            {(update.status.kind === 'available' || update.status.kind === 'needsPermission') && (
              <button type="button" className="btn" onClick={() => void update.install()}>{t.update.install}</button>
            )}
            {update.status.kind === 'upToDate' && <Icon name="check" className="update-latest" />}
            {update.status.kind !== 'installing' && (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={update.status.kind === 'checking' || update.status.kind === 'idle'}
                onClick={() => void update.check()}
              >
                {t.update.check}
              </button>
            )}
          </Row>
        </Group>
      )}

      {page === 'about' && (
      <>
      <Group label={t.settings.about} footer={t.settings.privacyNote}>
        <Row icon="info" name="Slate" hint={<>{t.settings.aboutText}<br />{t.settings.fonts}</>} value={version} />
      </Group>
      <Group>
        <Row icon="info" name={t.settings.legalTerms} chevron onClick={() => openLegal('terms')} />
        <Row icon="lock" name={t.settings.legalPrivacy} chevron onClick={() => openLegal('privacy')} />
        <Row icon="layout" name={t.settings.legalWebsite} chevron onClick={() => window.open(LEGAL_URL, '_blank', 'noopener')} />
      </Group>
      </>
      )}

      {page === 'backup' && (
        <Group>
          <Row name={t.settings.erase} danger onClick={() => setConfirmErase(true)} />
        </Group>
      )}

      <Dialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title={t.settings.importTitle}
        message={pendingImport && fill(t.settings.importConfirm, { blocks: pendingImport.blocks.length, shifts: pendingImport.shifts.length, assignments: pendingImport.assignments.length })}
        actions={[{
          label: t.settings.importAction,
          kind: 'danger',
          onClick: async () => {
            const res = await repo.importBackup(importText);
            setPendingImport(null);
            if (res.ok) {
              haptics.success();
              toast(t.settings.importDone);
            } else toast(importMessage(res.error), 'warn');
          },
        }]}
      />
      <Dialog
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        title={t.settings.erase}
        message={t.settings.eraseConfirm}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: async () => { await repo.eraseAll(); setConfirmErase(false); haptics.warning(); toast(t.settings.eraseDone); } }]}
      />
      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={t.calendarSync.removeAll}
        message={t.calendarSync.removeConfirm}
        actions={[{ label: t.common.delete, kind: 'danger', onClick: async () => { setConfirmRemove(false); await repo.updateSettings({ calendar: { ...settings.calendar, push: false } }); await cal.removePushed(); toast(t.calendarSync.removed); } }]}
      />
    </div>
  );
}

/** The website's Terms and Privacy pages, opened outside the app. */
const LEGAL_URL = 'https://slate.egenesio.com';
function openLegal(page: 'terms' | 'privacy') {
  window.open(`${LEGAL_URL}/${page}`, '_blank', 'noopener');
}

/** Settings › Notifications: the master switch, the default lead time, and what sends notices. */
function NotificationsPage({ settings, setNotify }: { settings: NotificationSettings; setNotify: (patch: Partial<NotificationSettings>) => void }) {
  const { t } = useI18n();
  const [perm, setPerm] = useState<PermissionState>('unsupported');
  const refresh = () => void permission().then(setPerm);
  useEffect(refresh, [settings.enabled]);
  const permText = perm === 'granted' ? t.notify.granted : perm === 'denied' ? t.notify.denied : t.notify.ask;
  return (
    <>
      <Group footer={t.notify.masterHint}>
        <Row icon="bell" name={t.notify.master}>
          <Switch
            label={t.notify.master}
            checked={settings.enabled}
            onChange={async (enabled) => {
              setNotify({ enabled });
              if (enabled && perm === 'prompt') await requestPermission();
              refresh();
            }}
          />
        </Row>
        {settings.enabled && perm !== 'unsupported' && (
          <Row icon="info" name={perm === 'granted' ? t.notify.granted : t.notify.denied} hint={perm === 'granted' ? undefined : permText}>
            {perm === 'prompt' && (
              <button type="button" className="btn" onClick={async () => { await requestPermission(); refresh(); }}>{t.notify.allow}</button>
            )}
          </Row>
        )}
      </Group>

      {settings.enabled && (
        <>
          <Group footer={t.notify.leadHint}>
            <Row icon="clock" name={t.notify.lead} stack>
              <select className="row-select" value={settings.leadMinutes} onChange={(e) => setNotify({ leadMinutes: Number(e.target.value) })} aria-label={t.notify.lead}>
                {LEAD_OPTIONS.map((m) => <option key={m} value={m}>{leadLabel(m, t)}</option>)}
              </select>
            </Row>
          </Group>
          <Group>
            <Row icon="calendar" name={t.notify.events}>
              <Switch label={t.notify.events} checked={settings.events} onChange={(events) => setNotify({ events })} />
            </Row>
            <Row icon="layout" name={t.notify.shifts}>
              <Switch label={t.notify.shifts} checked={settings.shifts} onChange={(shifts) => setNotify({ shifts })} />
            </Row>
          </Group>
          <Group>
            <Row icon="refresh" name={t.notify.newVersion}>
              <Switch label={t.notify.newVersion} checked={settings.newVersion} onChange={(newVersion) => setNotify({ newVersion })} />
            </Row>
            <Row icon="info" name={t.notify.donate} hint={t.notify.donateHint}>
              <Switch label={t.notify.donate} checked={settings.donate} onChange={(donate) => setNotify({ donate })} />
            </Row>
          </Group>
        </>
      )}
    </>
  );
}
