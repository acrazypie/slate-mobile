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

export function SettingsScreen() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const data = useData();
  const toast = useToast();
  const cal = useDeviceCalendar();
  const [page, setPage] = useState<'main' | 'calendars'>('main');
  const [version, setVersion] = useState('');
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<SlateData | null>(null);
  const [importText, setImportText] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useBackHandler(page !== 'main', () => setPage('main'));
  useEffect(() => {
    void appVersion().then(setVersion);
    void kv.get(LAST_EXPORT_KEY).then(setLastExport);
  }, []);

  if (page === 'calendars') return <CalendarPicker onBack={() => setPage('main')} />;

  const set = (patch: Parameters<typeof repo.updateSettings>[0]) => void repo.updateSettings(patch);
  const setCal = (patch: Partial<typeof settings.calendar>) => set({ calendar: { ...settings.calendar, ...patch } });

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

  return (
    <div className="screen page page--grouped">
      <header className="page__head">
        <h1 className="h-page">{t.settings.title}<span className="acc">.</span></h1>
      </header>

      <Group label={t.settings.appearance}>
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
            {(['day', 'week', 'month'] as const).map((v) => <option key={v} value={v}>{t.views[v]}</option>)}
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
      <input ref={fileInput} type="file" accept="application/json,.json,text/plain" hidden onChange={(e) => void onFile(e.target.files?.[0])} />

      <Group label={t.settings.about} footer={t.settings.privacyNote}>
        <Row icon="info" name="Slate" hint={<>{t.settings.aboutText}<br />{t.settings.fonts}</>} value={version} />
      </Group>

      <Group>
        <Row name={t.settings.erase} danger onClick={() => setConfirmErase(true)} />
      </Group>

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
