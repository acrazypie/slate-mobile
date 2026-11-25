import './styles/fonts.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/ios.css';
import './styles/android.css';
import './native/platform';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { repo } from './app/store';
import { applyAppearance } from './app/theme';
import { I18nProvider } from './i18n/I18n';
import { CalendarProvider } from './calendar/CalendarProvider';
import { GoogleProvider } from './google/GoogleProvider';
import { ToastProvider } from './ui/controls';
import { App } from './app/App';

async function boot() {
  await repo.load();
  applyAppearance(repo.getSnapshot().settings);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <ToastProvider>
          <GoogleProvider>
          <CalendarProvider>
            <App />
          </CalendarProvider>
          </GoogleProvider>
        </ToastProvider>
      </I18nProvider>
    </StrictMode>,
  );
}

void boot();
