let fm = FileManager.iCloud();
let events = [];
let selectedEvent = null;

async function createDirectory() {
  const baseDir = fm.joinPath(fm.documentsDirectory(), "EventCalendar");
  const filePath = fm.joinPath(baseDir, "events.json");
  const calendarFile = fm.joinPath(baseDir, "selectedCalendar.txt");

  if (fm.fileExists(baseDir) && !fm.isDirectory(baseDir)) fm.remove(baseDir);
  if (!fm.fileExists(baseDir)) fm.createDirectory(baseDir);
  if (!fm.fileExists(filePath)) fm.writeString(filePath, "[]");
  if (!fm.fileExists(calendarFile)) fm.writeString(calendarFile, "");

  return { baseDir, filePath, calendarFile };
}

const { filePath, calendarFile } = await createDirectory();

async function loadEvents() {
  if (!fm.fileExists(filePath)) return;

  try {
    await fm.downloadFileFromiCloud(filePath);
    events = JSON.parse(fm.readString(filePath));

    let changed = 0;
    for (let e of events) {
      const cleaned = {
        title: decodeHtmlEntities(e.title),
        city: decodeHtmlEntities(e.city ?? ""),
        venue: decodeHtmlEntities(e.venue ?? "")
      };
      if (e.title !== cleaned.title || e.city !== cleaned.city || e.venue !== cleaned.venue) {
        e.title = cleaned.title;
        e.city = cleaned.city;
        e.venue = cleaned.venue;
        changed++;
      }
    }

    if (changed > 0) {
      fm.writeString(filePath, JSON.stringify(events, null, 2));
      console.log(`🧼 ${changed} Event(s) bereinigt`);
    }

    console.log("📂 Events geladen:", events.length);
  } catch (e) {
    console.log("❌ Fehler beim Neuladen:", e);
  }
}
await loadEvents();

function decodeHtmlEntities(text) {
  const entities = {
    'auml': 'ä', 'ouml': 'ö', 'uuml': 'ü', 'Auml': 'Ä',
    'Ouml': 'Ö', 'Uuml': 'Ü', 'szlig': 'ß', 'amp': '&',
    'quot': '"', 'apos': "'", 'lt': '<', 'gt': '>'
  };
  return text.replace(/&([a-zA-Z]+);/g, (match, key) => entities[key] || match);
}


function formatGermanDate(dateStr) {
  const d = new Date(dateStr);
  return `${formatDateInput(d)} – ${formatTimeInput(d)} Uhr`;
}

function formatDateInput(date) {
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}

function formatTimeInput(date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

async function editEvent(index) {
  const e = events[index];
  if (!e) {
    console.log("❌ Ungültiger Event-Index:", index);
    return;
  }

  const safePrompt = async (alert, label) => {
    const result = await alert.present();
    console.log(`📤 ${label} Auswahl:`, result);
    return result === -1 ? null : result;
  };

  const titlePrompt = new Alert();
  titlePrompt.title = "Titel bearbeiten";
  titlePrompt.addTextField("Titel", e.title);
  titlePrompt.addCancelAction("Abbrechen");
  titlePrompt.addAction("Weiter");
  if (await safePrompt(titlePrompt, "Titel") === null) return;
  e.title = titlePrompt.textFieldValue(0)?.trim();

  const ortPrompt = new Alert();
  ortPrompt.title = "Ort bearbeiten";
  ortPrompt.addTextField("Veranstaltungsort", e.venue ?? "");
  ortPrompt.addTextField("Stadt", e.city ?? "");
  ortPrompt.addCancelAction("Abbrechen");
  ortPrompt.addAction("Weiter");
  if (await safePrompt(ortPrompt, "Ort") === null) return;
  e.venue = ortPrompt.textFieldValue(0)?.trim() ?? "";
  e.city = ortPrompt.textFieldValue(1)?.trim() ?? "";

  const currentDate = new Date(e.date);
const defaultDate = formatDateInput(currentDate);
const defaultTime = formatTimeInput(currentDate);

  const datePrompt = new Alert();
  datePrompt.title = "Neues Datum (TT.MM.JJJJ)";
  datePrompt.addTextField("Datum", defaultDate);
  datePrompt.addCancelAction("Abbrechen");
  datePrompt.addAction("Weiter");
  if (await safePrompt(datePrompt, "Datum") === null) return;
  const dateInput = datePrompt.textFieldValue(0)?.trim();

  const timePrompt = new Alert();
  timePrompt.title = "Neue Uhrzeit (HH:MM)";
  timePrompt.addTextField("Uhrzeit", defaultTime);
  timePrompt.addCancelAction("Abbrechen");
  timePrompt.addAction("Weiter");
  if (await safePrompt(timePrompt, "Uhrzeit") === null) return;
  const timeInput = timePrompt.textFieldValue(0)?.trim();

  const validDate = /^\d{2}\.\d{2}\.\d{4}$/.test(dateInput);
  const validTime = /^\d{2}:\d{2}$/.test(timeInput);

  if (!validDate || !validTime) {
    console.log("❌ Eingabeformat ungültig:", { dateInput, timeInput });
    const alert = new Alert();
    alert.title = "Ungültige Eingabe";
    alert.message = `Datum: "${dateInput}"\nUhrzeit: "${timeInput}"\n\nFormat: TT.MM.JJJJ und HH:MM`;
    alert.addCancelAction("OK");
    await alert.present();
    return;
  }

  const [day, month, year] = dateInput.split(".");
  const newDate = new Date(`${year}-${month}-${day}T${timeInput}`);
  if (isNaN(newDate.getTime())) {
    console.log("❌ Kann Datum nicht parsen:", `${year}-${month}-${day}T${timeInput}`);
    return;
  }
  e.date = newDate.toISOString();

  const statusPrompt = new Alert();
  statusPrompt.title = "Status ändern:";
  statusPrompt.addAction("✅ Ticket");
  statusPrompt.addAction("⭐️ Interesse");
  const statusRes = await safePrompt(statusPrompt, "Status");
  if (statusRes === null) return;
  e.status = statusRes === 0 ? "ticket" : "interesse";

  events[index] = e;
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
try {
  console.log("💾 Speichere Events nach:", filePath);
  fm.writeString(filePath, JSON.stringify(events, null, 2));
  console.log("✅ Event gespeichert:", e.title);
} catch (err) {
  console.log("❌ Fehler beim Speichern:", err.message);
  const alert = new Alert();
  alert.title = "Fehler beim Speichern";
  alert.message = err.message;
  alert.addCancelAction("OK");
  await alert.present();
}
}

async function showMainMenu() {
  // 🗂 Aktuellen Kalender ermitteln (wenn gespeichert)
  let currentCalendarName = null;
  if (Keychain.contains("preferredCalendar")) {
    const savedId = Keychain.get("preferredCalendar");
    const calendars = await Calendar.forEvents();
    const match = calendars.find(c => c.identifier === savedId);
    if (match) currentCalendarName = match.title;
  }

  // 📋 Menü zusammenstellen
  let menu = new Alert();
  menu.title = "🎫 Eventkalender";
  menu.addAction("➕ Neues Event hinzufügen");
  menu.addAction("📋 Kommende Events anzeigen");
  menu.addAction("📤 Kommende Events teilen");
  menu.addAction("📜 Alle Events anzeigen");
  menu.addAction("⚙️ Einstellungen");
  menu.addCancelAction("Abbrechen");

  let choice = await menu.present();

  if (choice === 0) {
    await addEvent();
    await showMainMenu();
  } else if (choice === 1) {
    await showEvents(true);
    await showMainMenu();
  } else if (choice === 2) {
    await shareEvents();
    await showMainMenu();
  } else if (choice === 3) {
    await showEvents(false);
    await showMainMenu();
  }else if (choice === 4) {
  await showSettingsMenu(); 
  await showMainMenu(); 
}

  Script.complete(); // wirklich nur hier, wenn „Abbrechen“
}

async function showSettingsMenu() {
  let settings = new Alert();
  settings.title = "⚙️ Einstellungen";
  settings.addAction("📅 Kalender wählen / ändern"); // 0
  settings.addDestructiveAction("🗑 Alle Events löschen"); // 1
  settings.addAction("ℹ️ Info & Version"); // 2
  settings.addCancelAction("Zurück");

  let choice = await settings.present();

 if (choice === 0) {
  await chooseCalendar();
  await showSettingsMenu(); 
  return;
} else if (choice === 1) {
    let confirm = new Alert();
    confirm.title = "Wirklich löschen?";
    confirm.message = "Alle gespeicherten Events unwiderruflich entfernen?";
    confirm.addDestructiveAction("Ja, löschen");
    confirm.addCancelAction("Abbrechen");
    let del = await confirm.present();
    if (del === 0) {
      events = [];
      fm.writeString(filePath, "[]");
    }
    return true;
  } else if (choice === 2) {
  await showInfoTable();
  await showSettingsMenu();
  return;
  }

  return false; // bei "Zurück"
}

async function chooseCalendar() {
  const key = "preferredCalendar";
  const calendars = await Calendar.forEvents();
  const writable = calendars.filter(c => !c.isReadOnly);

  if (!writable.length) {
    let alert = new Alert();
    alert.title = "Keine Kalender gefunden";
    alert.message = "Es sind keine schreibbaren Kalender verfügbar.";
    alert.addCancelAction("OK");
    await alert.present();
    return false;
  }

  if (Keychain.contains(key)) {
    const currentId = Keychain.get(key);
    const current = writable.find(c => c.identifier === currentId);

    let a = new Alert();
    a.title = "Gespeicherter Kalender:";
    a.message = current ? `📅 ${current.title}` : "Unbekannter Kalender";

    a.addAction("✅ Beibehalten"); // 0
    a.addAction("📂 Neuen Kalender wählen"); // 1
    a.addDestructiveAction("🗑️ Löschen"); // 2
    a.addCancelAction("Abbrechen"); // -1

    let res = await a.present();
    if (res === -1 || res === 0) return false;
    if (res === 2) {
      Keychain.remove(key);
      let msg = new Alert();
      msg.title = "Kalender entfernt";
      msg.message = "Beim nächsten Eintrag wirst du wieder gefragt.";
      msg.addCancelAction("OK");
      await msg.present();
      return true;
    }
    // res === 1 → neuen Kalender wählen
  }

  let choose = new Alert();
  choose.title = "Kalender wählen:";
  writable.forEach(c => choose.addAction(c.title));
  choose.addCancelAction("Abbrechen");
  let i = await choose.present();

  if (i === -1) return false;

  const selected = writable[i];
  Keychain.set(key, selected.identifier);

  let confirm = new Alert();
  confirm.title = "Kalender gespeichert";
  confirm.message = `📅 ${selected.title} wird nun verwendet.`;
  confirm.addCancelAction("OK");
  await confirm.present();
  return true;
}

async function showEvents(onlyFuture = true) {
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now);
  const past = events.filter(e => new Date(e.date) < now);

  const sections = onlyFuture
    ? [{ title: "🎫 Kommende Events", list: upcoming }]
    : [
        { title: "🎫 Kommende Events", list: upcoming },
        { title: "🔙 Vergangene Events", list: past }
      ];

  let t = new UITable();
  t.showSeparators = true;

  for (let section of sections) {
    if (section.list.length === 0) continue;



// Leere Zeile VOR jeder Sektion
let spacerBefore = new UITableRow();
spacerBefore.height = section.title.includes("Vergangene") ? 12 : 12;
t.addRow(spacerBefore);

let sectionHeader = new UITableRow();
sectionHeader.isHeader = true;
let headerText = sectionHeader.addText(section.title);

if (section.title.includes("Vergangene")) {
  headerText.titleFont = Font.boldSystemFont(24);
  headerText.titleColor = Color.red();
} else {
  headerText.titleFont = Font.boldSystemFont(24); // auch kommende etwas größer
  headerText.titleColor = Color.blue();
}
t.addRow(sectionHeader);

// Leere Zeile NACH jeder Sektion
let spacerAfter = new UITableRow();
spacerAfter.height = section.title.includes("Vergangene") ? 12 : 12;
t.addRow(spacerAfter);
 
    let grouped = {};
    for (let e of section.list) {
      let d = new Date(e.date);
      let key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }

    for (let key of Object.keys(grouped).sort()) {
      let d = new Date(`${key}-01T00:00:00`);
      let header = new UITableRow();
      header.isHeader = true;
      let monthTitle = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      if (section.title.includes("Vergangene")) {
        let h = header.addText(monthTitle + " (vergangen)");
        h.titleColor = Color.gray();
      } else {
        header.addText(monthTitle);
      }
      t.addRow(header);

      for (let e of grouped[key]) {
        let row = new UITableRow();
        row.height = 80;

        let date = new Date(e.date);
        const isPast = date < now;

        // Icon anpassen
        let icon = e.status === "ticket" ? "✅" : "⭐️";
        if (!onlyFuture && isPast) icon = "🕰️";

        let cleanTitle = decodeHtmlEntities(e.title);
        let place = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "));
        let dateStr = formatGermanDate(e.date);

        // Titel-Zelle
        let titleCell = UITableCell.text(cleanTitle);
        titleCell.titleFont = Font.boldSystemFont(14);
        titleCell.titleColor = isPast ? Color.gray() : Color.white();
        titleCell.widthWeight = 3;
        row.addCell(titleCell);

        // Untertitel-Zelle
        let subtitleCell = UITableCell.text(`${place}\n${dateStr}`);
        subtitleCell.titleFont = Font.systemFont(10);
        subtitleCell.titleColor = isPast ? Color.gray() : Color.lightGray();
        subtitleCell.widthWeight = 5;
        row.addCell(subtitleCell);

        // Icon-Zelle
        let iconCell = UITableCell.text(icon);
        iconCell.titleFont = Font.systemFont(14);
        iconCell.titleColor = isPast ? Color.gray() : Color.white();
        iconCell.rightAligned();
        iconCell.widthWeight = 1;
        row.addCell(iconCell);


        // Hintergrund für vergangene Events
        if (!onlyFuture && isPast) {
          row.backgroundColor = new Color("#1a1a1a");
        }

        row.onSelect = async () => {
  selectedEvent = e;
};

        t.addRow(row);
}
}
}
  
  await t.present();

if (selectedEvent) {
  await showEventMenu(selectedEvent);
}
}

async function showEventMenu(e) {
  const eventIndex = events.indexOf(e);
  if (eventIndex === -1) return;

  let a = new Alert();
  a.title = decodeHtmlEntities(e.title);
  a.message = `${formatGermanDate(e.date)}\n📍 ${e.city} – ${e.venue}`;
  a.addAction("🌐 Website öffnen");
  a.addAction("📆 Zum Kalender hinzufügen");
  a.addDestructiveAction("🗑 Löschen");
  a.addAction("📝 Bearbeiten");
  a.addAction("📲 Event teilen");
  a.addCancelAction("Zurück");

  let res = await a.present();

  if (res === 0) {
    Safari.openInApp(e.url, true);
  } else if (res === 1) {
    await exportToCalendar(e);
  } else if (res === 2) {
    events.splice(eventIndex, 1);
    fm.writeString(filePath, JSON.stringify(events, null, 2));
    await loadEvents();
    await showEvents(); // zeigt neu an
  } else if (res === 3) {
    await editEvent(eventIndex);
    await loadEvents();
    await showEvents();
  } else if (res === 4) {
    await shareSingleEvent(eventIndex);
  }
}

async function exportToCalendar(e) {
  try {
    let calendar = await getWritableCalendar();
    if (!calendar) throw new Error("Kein gültiger Kalender gewählt.");

    // 📅 Startdatum parsen
    let startDate = new Date(e.date);

    // ⏱ Dauer wählen
    const durationPrompt = new Alert();
    durationPrompt.title = "Wie lange dauert das Event?";
    durationPrompt.addAction("1 Stunde");
    durationPrompt.addAction("2 Stunden");
    durationPrompt.addAction("3 Stunden");
    durationPrompt.addAction("4 Stunden");
    durationPrompt.addAction("Ganztägig");
    durationPrompt.addCancelAction("Abbrechen");
    const durationChoice = await durationPrompt.present();

    if (durationChoice === -1) return;

    // 📅 Event vorbereiten
    let event = new CalendarEvent();
    event.calendar = calendar;
    event.title = `🎉 ${decodeHtmlEntities(e.title)}`;
    event.location = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(", "));
    event.startDate = startDate;
    event.url = e.url;

    if (durationChoice === 4) {
  // Ganztägig korrekt setzen: 00:00 bis 00:00 nächsten Tag
  event.isAllDay = true;

  const dayStart = new Date(startDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  event.startDate = dayStart;
  event.endDate = dayEnd;
} else {
  const durationHours = [1, 2, 3,4][durationChoice];
  event.endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
}

    // 📝 Beschreibung
    const dateString = formatGermanDate(e.date);
    event.notes = `🎫 ${decodeHtmlEntities(e.title)}

📅 Datum & Uhrzeit:
${dateString}

📍 Ort:
${decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "))}

🔗 Event-Link:
${e.url}

📌 Status:
${e.status === "ticket" ? "✅ Ticket vorhanden" : "⭐️ Interesse"}

—
📲 Erstellt mit deinem persönlichen Eventkalender`;

    await event.save();

    let info = new Alert();
    info.title = "Kalendereintrag erstellt ✅";
    info.message = `„${event.title}“ wurde im Kalender „${calendar.title}“ gespeichert.`;
    info.addCancelAction("OK");
    await info.present();
  } catch (err) {
    let error = new Alert();
    error.title = "Fehler beim Eintragen";
    error.message = err.message;
    error.addCancelAction("OK");
    await error.present();
  }
  Script.complete();
}

async function addEvent() {
  let clipboard = Pasteboard.paste();
  let urlFromClipboard = null;
  let suggestedTitle = "";

  if (typeof clipboard === "string") {
    let match = clipboard.match(/https?:\/\/[^\s]+/);
    if (match) {
      urlFromClipboard = match[0];
      suggestedTitle = clipboard.split(urlFromClipboard)[0].trim();
    }
  }

  let input = new Alert();
  input.title = "Event hinzufügen";
  input.message = "Füge den Eventim-Link ein:";
  input.addTextField("Eventim-Link", urlFromClipboard ?? "");
  input.addCancelAction("Abbrechen");
  input.addAction("OK");
  let result = await input.present();
  console.log("📋 AddEvent Input Ergebnis:", result);
  if (result === -1) return;

  let url = input.textFieldValue(0).trim();
  if (!url.startsWith("http")) return;

  let html;
  try {
    html = await new Request(url).loadString();
    console.log("🌐 URL geladen:", url);
  } catch {
    return;
  }

  let title = suggestedTitle || "Unbenannt", city = "", venue = "", autoDate = null;

  let titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    let raw = titleMatch[1].replace(" | Tickets – eventim.de", "").replace("&amp;", "&").trim();
    title = raw.split(" in ")[0].trim();
  }

  let ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (ogTitleMatch) {
    let content = ogTitleMatch[1];
    if (content.includes(" @ ") && content.includes(" | ")) {
      let match = content.match(/^(.*?) @ (.*?) \| (.*?) - /);
      if (match) {
        title = match[1].trim();
        venue = match[2].trim();
        city = match[3].trim();
      }
    }
    
  }

  let dateMatch = html.match(/event-detail-date__date">([^<]+)/);
  let timeMatch = html.match(/event-detail-date__time">([^<]+)/);
  if (dateMatch && timeMatch) {
    let [day, month, year] = dateMatch[1].trim().split(".");
    let time = timeMatch[1].trim();
    autoDate = new Date(`${year}-${month}-${day}T${time}`);
  }

  let descMatch = html.match(/<meta name="description" content="[^"]*?(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})/);
  if (!autoDate && descMatch) {
    let [_, dateStr, timeStr] = descMatch;
    let [day, month, year] = dateStr.split(".");
    autoDate = new Date(`${year}-${month}-${day}T${timeStr}`);
  }

  let date = null;
  if (autoDate) {
    console.log("📅 autoDate:", autoDate.toISOString());
    let confirm = new Alert();
    confirm.title = "Datum gefunden:";
    confirm.message = autoDate.toLocaleString("de-DE");
    confirm.addAction("Ja");
    confirm.addCancelAction("Nein");
    if ((await confirm.present()) === 0) date = autoDate;
  }

  if (!date) {
    let defaultDate = autoDate ? formatDateInput(autoDate) : "05.11.1993";
let defaultTime = autoDate ? formatTimeInput(autoDate) : "20:00";

    let dateAlert = new Alert();
    dateAlert.title = "Datum eingeben";
    dateAlert.addTextField(defaultDate);
    dateAlert.addCancelAction("Abbrechen");
    dateAlert.addAction("Weiter");
    if ((await dateAlert.present()) === -1) return;
    let [d, m, y] = dateAlert.textFieldValue(0).split(".");

    let timeAlert = new Alert();
    timeAlert.title = "Uhrzeit eingeben";
    timeAlert.addTextField(defaultTime);
    timeAlert.addCancelAction("Abbrechen");
    timeAlert.addAction("OK");
    if ((await timeAlert.present()) === -1) return;
    let t = timeAlert.textFieldValue(0);
    date = new Date(`${y}-${m}-${d}T${t}`);
  }

  let s = new Alert();
  s.title = "Status:";
  s.addAction("✅ Ticket");
  s.addAction("⭐️ Interesse");
  let status = (await s.present()) === 0 ? "ticket" : "interesse";

  if (events.find(ev => ev.date === date.toISOString() || ev.url === url)) {
    let dup = new Alert();
    dup.title = "⚠️ Event existiert bereits!";
    dup.addCancelAction("OK");
    await dup.present();
    return;
  }

  events.push({
  title: decodeHtmlEntities(title),
  url,
  date: date.toISOString(),
  status,
  city: decodeHtmlEntities(city),
  venue: decodeHtmlEntities(venue)
});
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  fm.writeString(filePath, JSON.stringify(events, null, 2));
  

  let done = new Alert();
  done.message = "✅ Event gespeichert";
  done.addCancelAction("OK");
  await done.present();
  Script.complete();
}

async function getWritableCalendar(forceNew = false) {
  const key = "preferredCalendar";
  const savedId = Keychain.contains(key) ? Keychain.get(key) : null;

  const calendars = await Calendar.forEvents();
  const writable = calendars.filter(c => !c.isReadOnly);

  if (!writable.length) throw new Error("Keine schreibbaren Kalender gefunden.");

  // Wenn ein Kalender gespeichert ist und nicht neu gewählt werden soll
  if (savedId && !forceNew) {
    const found = writable.find(c => c.identifier === savedId);
    if (found) return found;
  }

  // Auswahldialog anzeigen
  const alert = new Alert();
  alert.title = "Kalender auswählen";
  for (let c of writable) alert.addAction(c.title);
  alert.addCancelAction("Abbrechen");

  const choice = await alert.present();
  if (choice === -1) return null;

  const selected = writable[choice];
  Keychain.set(key, selected.identifier);
  return selected;
}

async function shareSingleEvent(index) {
  const e = events[index];
  if (!e) return;

  const title = decodeHtmlEntities(e.title);
  const dateStr = formatGermanDate(e.date);
  const location = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "));
  const url = e.url || "";

  const message = `🎫 ${title}\n📅 ${dateStr}\n📍 ${location}${url ? `\n🔗 ${url}` : ""}`;

  try {
    console.log("📤 Teile Nachricht:", message);
    await ShareSheet.present([message]); // << Kein "new"
    console.log("✅ Teilen abgeschlossen");
  } catch (err) {
    console.error("❌ Fehler beim Teilen:", err);
    let a = new Alert();
    a.title = "Fehler beim Teilen";
    a.message = err.toString();
    a.addCancelAction("OK");
    await a.present();
  }
}

async function shareEvents() {
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now);

  if (!upcomingEvents.length) {
    let a = new Alert();
    a.title = "Keine Events gefunden";
    a.message = "Es wurden keine kommenden Events gefunden.";
    a.addCancelAction("OK");
    await a.present();
    return;
  }

  try {
    const line = "———————————————";
    const list = upcomingEvents
      .map(e => {
        const dateStr = formatGermanDate(e.date);
        const title = decodeHtmlEntities(e.title);
        const place = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "));
        const status = e.status === "ticket" ? "✅" : "⭐️";
        const url = e.url ? `\n🔗 ${e.url}` : "";

        return `${status} ${title}\n📍 ${place}\n📅 ${dateStr}${url}`;
      })
      .join(`\n\n${line}\n\n`);

    await ShareSheet.present([list]);
    console.log("✅ Nur zukünftige Events wurden geteilt.");
  } catch (err) {
    console.error("❌ Fehler beim Teilen:", err);
    let a = new Alert();
    a.title = "Fehler beim Teilen";
    a.message = err.toString();
    a.addCancelAction("OK");
    await a.present();
  }
}

async function showInfoTable() {
  const t = new UITable();
  t.showSeparators = true;

  const versionTapKey = "eventkalender_version_taps";
  const emojis = ["🎫", "🎟", "🎉", "🚀", "🪄"];
  const headerEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  // 🟦 Header
  let header = new UITableRow();
  let title = header.addText(`${headerEmoji} Eventkalender`);
  title.centerAligned();
  title.titleFont = Font.boldSystemFont(20);
  t.addRow(header);

  // 📦 Version
  const versionRow = new UITableRow();
  const versionText = versionRow.addText("📦 Version: 1.3.0");
  versionText.centerAligned();
  versionText.titleColor = Color.gray();
  versionRow.onSelect = async () => {
    let count = parseInt(Keychain.get(versionTapKey) || "0");
    count++;
    Keychain.set(versionTapKey, count.toString());
    if (count >= 5) {
      let egg = new Alert();
      egg.title = "🪄 Easteregg aktiviert!";
      egg.message = "Du hast das geheime Menü entdeckt. Glückwunsch, Power-User! 🚀";
      egg.addCancelAction("Nice!");
      await egg.present();
      Keychain.set(versionTapKey, "0");
    }
  };
  t.addRow(versionRow);

  // 👨‍💻 Autor
  let authorRow = new UITableRow();
  let authorText = authorRow.addText("👨‍💻 Entwickler: Sascha Ewertz");
  authorText.centerAligned();
  authorText.titleColor = Color.lightGray();
  t.addRow(authorRow);

  // 🔹 Trenner
  let separatorRow = new UITableRow();
  separatorRow.addText(" ");
  separatorRow.backgroundColor = new Color("#444");
  separatorRow.height = 1;
  t.addRow(separatorRow);

  // 📋 Funktionen
  const features = [
    ["🗓", "Event-Verwaltung für Termine"],
    ["📆", "Kalender-Export"],
    ["📤", "WhatsApp- & Messenger-Sharing"],
    ["🔄", "Automatische Sortierung"],
    ["🔒", "Favorisierter Kalender"],
    ["💡", "Zukunft & vergangene Events"],
  ];

  for (let [icon, text] of features) {
    let row = new UITableRow();
    let cell = row.addText(`${icon}  ${text}`);
    cell.leftAligned();
    row.cellSpacing = 10;
    t.addRow(row);
  }

  // 🔹 Trenner
  separatorRow = new UITableRow();
  separatorRow.addText(" ");
  separatorRow.backgroundColor = new Color("#444");
  separatorRow.height = 1;
  t.addRow(separatorRow);

  // 🔚 Footer-Buttons
  const footer = new UITableRow();
  const gitButton = UITableCell.button("🌐 GitHub");
  const changeLogButton = UITableCell.button("📝 Release Notes");
  const backButton = UITableCell.button("⬅️ Zurück");

  gitButton.centerAligned();
  changeLogButton.centerAligned();
  backButton.centerAligned();

  footer.addCell(gitButton);
  footer.addCell(changeLogButton);
  footer.addCell(backButton);
  t.addRow(footer);

  gitButton.onTap = async () => {
    Safari.openInApp("https://github.com/Kyrinja/Event-Kalender-Scriptable", true);
  };

  changeLogButton.onTap = async () => {
    let alert = new Alert();
    alert.title = "📝 Release Notes";
    const localPath = fm.joinPath(fm.documentsDirectory(), "EventCalendar/changelog.txt");
    let content = fm.fileExists(localPath) ? fm.readString(localPath) : "";
    if (!content) {
      try {
        const req = new Request("https://raw.githubusercontent.com/Kyrinja/Event-Kalender-Scriptable/main/CHANGELOG");
        content = await req.loadString();
      } catch (e) {
        content = "❌ Changelog konnte nicht geladen werden.";
      }
    }
    alert.message = content;
    alert.addCancelAction("OK");
    await alert.present();
  };

  backButton.onTap = async () => {
    t.dismiss();
    await showSettingsMenu();
  };

  await t.present(false); // Kein automatischer Script.complete()
}

async function createWidget() {
  let w = new ListWidget();
  w.backgroundColor = new Color("#1c1c1e");
  w.setPadding(12, 15, 12, 15);

  // Oberer Titel
  let head = w.addText("🎟️ Eventkalender");
  head.font = Font.boldSystemFont(config.widgetFamily === "large" ? 18 :
  config.widgetFamily === "medium" ? 15 : 13
);
  head.textColor = Color.white();
  head.centerAlignText();
  let divider = w.addText("─".repeat(config.widgetFamily === "large" ? 25 :
  config.widgetFamily === "medium" ? 25 : 10
));
divider.font = Font.systemFont(12);
divider.textColor = Color.red();
divider.centerAlignText();
  w.addSpacer(6);

  let now = new Date();
  let upcoming = events.filter(e => new Date(e.date) >= now);
  if (upcoming.length === 0) {
    w.addText("Keine Events").font = Font.boldSystemFont(16);
    return w;
  }

  // Filter aus Widget Parameter
  let param = (args.widgetParameter || "").toLowerCase().split(/[ ,]+/);
  let statusFilter = param.includes("ticket") ? "ticket" : param.includes("interesse") ? "interesse" : null;
  let timeFilter = param.includes("alle") && param.includes("alle") ? "alle" : param.includes("monat") ? "monat" : param.includes("woche") ? "woche" : "heute";

  let statusLabel = statusFilter === "ticket" ? "Tickets" : statusFilter === "interesse" ? "Interesse" : "Alle";
  let rangeLabel = {
    heute: "Heute",
    woche: "Diese Woche",
    monat: "Dieser Monat",
    alle: "Alle Zeiten"
  }[timeFilter];

  // Filter anwenden
let filtered = events.filter(e => {
  let d = new Date(e.date);
  d.setSeconds(0, 0); // optional, um Vergleich stabiler zu machen

  if (statusFilter && e.status !== statusFilter) return false;

  if (timeFilter === "heute") {
    return d.toDateString() === now.toDateString();
  }
  if (timeFilter === "woche") {
    let weekFromNow = new Date(now); weekFromNow.setDate(now.getDate() + 7);
    return d >= now && d <= weekFromNow;
  }
  if (timeFilter === "monat") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (timeFilter === "alle") {
    return d >= new Date().setHours(0, 0, 0, 0); // nur heute und zukünftig
  }

  return false;
});

  if (filtered.length === 0) {
    w.addText("Keine passenden Events").font = Font.mediumSystemFont(12);
    return w;
  }

  let count = config.widgetFamily === "large" ? 4 : config.widgetFamily === "medium" ? 2 : 1;
  for (let i = 0; i < Math.min(filtered.length, count); i++) {
    let e = filtered[i];
    let date = new Date(e.date);
    const isToday = date.toDateString() === now.toDateString();
const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
const iconBase = e.status === "ticket" ? "✅" : "⭐️";
const icon = isToday ? `🔴 ${iconBase}` : isTomorrow ? `🟠 ${iconBase}` : iconBase;

const daysDiff = Math.floor((date - now) / (1000 * 60 * 60 * 24));
const countdown =
  isToday ? "heute" :
  isTomorrow ? "morgen" :
  daysDiff === 1 ? "in 1 Tag" :
  daysDiff > 1 ? `in ${daysDiff} Tagen` : "";
  
    let place = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "));

    let dateText = date.toLocaleDateString("de-DE", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric"
}) + " – " + date.toLocaleTimeString("de-DE", {
  hour: "2-digit", minute: "2-digit"
}) + " Uhr";

if (countdown) dateText += ` · ${countdown}`;

let dateLine = w.addText("📅  " + dateText);
dateLine.font = Font.mediumSystemFont(config.widgetFamily === "large" ? 11 :
  config.widgetFamily === "medium" ? 8 : 6
);
dateLine.textColor = Color.gray();
w.addSpacer(4);

    let titleLine = w.addText(`${icon} ${decodeHtmlEntities(e.title)}`);
titleLine.font = Font.mediumSystemFont(config.widgetFamily === "large" ? 13 :
  config.widgetFamily === "medium" ? 11 : 8
);
titleLine.textColor = Color.white();
titleLine.lineLimit = config.widgetFamily === "small" ? 1 : 2;
titleLine.minimumScaleFactor = 0.9;
w.addSpacer(4);

    if (place) {
      let loc = w.addText("📍 " + place);
      loc.font = Font.systemFont(
  config.widgetFamily === "large" ? 11 :
  config.widgetFamily === "medium" ? 9 : 6
);
      loc.textColor = Color.lightGray();
    }
let dashCount = config.widgetFamily === "large" ? 52 : config.widgetFamily === "medium" ? 52 : 20;
let divider = w.addText("─".repeat(dashCount));
divider.font = Font.systemFont(6);
divider.textColor = Color.darkGray();
divider.centerAlignText();
w.addSpacer(4);
  }

w.addSpacer(6);

  let footer = w.addText(`🔍 ${statusLabel} – ${rangeLabel}`);
  footer.font = Font.systemFont(8);
  footer.textColor = Color.gray();
  footer.centerAlignText();

  w.url = URLScheme.forRunningScript();
  return w;
}

// 🎬 Hauptlogik
if (config.runsInWidget) {
  let widget = await createWidget();
  Script.setWidget(widget);
  Script.complete();
} else {
  if (args.queryParameters.open === "calendar") {
    await showEvents(true);
  } else {
    await showMainMenu();
  }
}