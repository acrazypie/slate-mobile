// The Summary tab: hours for the week or month (SummaryPanel), with the
// earnings line when pay is set. Opens on today's week and month.

import { useI18n } from '../i18n/I18n';
import { SummaryPanel } from './SummaryPanel';

export function SummaryScreen() {
  const { t } = useI18n();
  return (
    <div className="screen page page--grouped">
      <header className="page__head">
        <h1 className="h-page">{t.summary.title}<span className="acc">.</span></h1>
      </header>
      <div className="pad-x">
        <SummaryPanel anchor={new Date()} />
      </div>
    </div>
  );
}
