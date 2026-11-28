# Google Play listing: Slate

Paste the text blocks as they are (Play shows plain text, so there's no Markdown inside them).

## App name (30 max)

```
Slate
```

## Short description (80 max)

```
Time-block planner: study, work and classes on one timeline, kept on your phone.
```

## Full description (4000 max)

```
Slate lays out your week as coloured blocks: study, work, classes and anything else. Keep a set of reusable shifts, copy your plan into your phone calendar, and see the hours at a glance.

DAY, WEEK, MONTH AND AGENDA
One timeline for the day, the week, the month and the next seven days. The day view opens first, with the current time marked.

BLOCKS AND SHIFTS
Create a block with a title, category, colour, start time, duration and notes. Define a shift once, such as "Morning 09:00 to 13:00", and place it on any day. Overnight shifts are supported. Repeat blocks weekly or monthly, and delete one occurrence, the rest of a series, or the whole series.

ROTATIONS
Describe a repeating pattern of shifts, such as 2-2-4, and place it on the calendar for a chosen number of weeks.

REMINDERS
Get a notification a few minutes before a block or a shift. Reminders are scheduled on your phone. Nothing is sent from a server.

SUMMARY
Hours per category and per shift for the week or the month, overtime, and optional pay from your hourly rate. Add reports and export a PDF to share.

YOUR CALENDARS, IF YOU WANT THEM
Slate can show events from the calendars on your phone next to your blocks, read-only. It can also copy your blocks and shifts into a calendar named Slate.

YOUR DATA STAYS ON YOUR PHONE
There is no Slate account and no server that stores your plans. Export a backup file whenever you want and import it on another phone. Slate has no ads and no tracking.

Light and dark themes, a choice of accent colours with matching home-screen icons, OLED black, and six languages: English, Italiano, Español, Français, Nederlands and 日本語.
```

## Italiano (it-IT)

Play Console → Main store listing → Manage translations → add Italian (it-IT). Graphics: `it/`.

Short description (80 max):

```
Pianificatore a blocchi: studio, lavoro e lezioni su una timeline, sul telefono.
```

Full description (4000 max):

```
Slate disegna la tua settimana come blocchi colorati: studio, lavoro, lezioni e tutto il resto. Tieni un insieme di turni riutilizzabili, copia il piano nel calendario del telefono e vedi le ore a colpo d'occhio.

GIORNO, SETTIMANA, MESE E AGENDA
Una sola timeline per il giorno, la settimana, il mese e i sette giorni successivi. La vista giorno si apre per prima, con l'ora attuale evidenziata.

BLOCCHI E TURNI
Crea un blocco con titolo, categoria, colore, ora di inizio, durata e note. Definisci un turno una volta, per esempio "Mattina 09:00-13:00", e mettilo in qualsiasi giorno. I turni notturni sono supportati. Ripeti i blocchi ogni settimana o ogni mese, ed elimina una sola occorrenza, il resto della serie o l'intera serie.

ROTAZIONI
Descrivi uno schema di turni che si ripete, per esempio 2-2-4, e mettilo nel calendario per il numero di settimane che scegli.

PROMEMORIA
Ricevi una notifica pochi minuti prima di un blocco o di un turno. I promemoria sono programmati sul telefono. Non vengono inviati da alcun server.

RIEPILOGO
Ore per categoria e per turno, per la settimana o il mese, straordinari e, se vuoi, la paga dalla tariffa oraria. Aggiungi report ed esporta un PDF da condividere.

I TUOI CALENDARI, SE LI VUOI
Slate può mostrare accanto ai blocchi gli eventi dei calendari del telefono, in sola lettura. Può anche copiare blocchi e turni in un calendario chiamato Slate.

I TUOI DATI RESTANO SUL TELEFONO
Non esiste un account Slate né un server che conserva i tuoi piani. Esporta un file di backup quando vuoi e importalo su un altro telefono. Slate non ha pubblicità né tracciamento.

Temi chiaro e scuro, una scelta di colori d'accento con icone coordinate sulla schermata Home, nero OLED e sei lingue: English, Italiano, Español, Français, Nederlands e 日本語.
```

## Category, contact and privacy

- Category: Productivity. Tags: Planner, Calendar, Time management.
- Contact email: the address you want shown publicly (required).
- Website: https://slate.egenesio.com
- Privacy policy URL (required): https://slate.egenesio.com/privacy
- Terms: https://slate.egenesio.com/terms

## Permissions to explain in Play Console

These need a declaration in Play Console, not just a store graphic:
- Calendar (READ_CALENDAR, WRITE_CALENDAR): reads the phone calendars you pick and writes blocks into a calendar named Slate. Used only on the device.
- Exact alarms (from the notifications plugin): for reminders at the exact time.
- Notifications: for reminders.
- REQUEST_INSTALL_PACKAGES: the in-app update check on the GitHub build. See the note in the developer guide before a Play release; Play generally doesn't allow an app to install other apps.
