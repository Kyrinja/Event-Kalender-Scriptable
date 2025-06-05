let fm = FileManager.iCloud();

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

let events = [];
if (fm.fileExists(filePath)) {
  try {
    await fm.downloadFileFromiCloud(filePath);
    events = JSON.parse(fm.readString(filePath));
  } catch (e) {
    console.log("❌ Fehler beim Laden der Events:", e);
  }
}

function decodeHtmlEntities(text) {
  const entities = {
    '&auml;': 'ä', '&ouml;': 'ö', '&uuml;': 'ü', '&Auml;': 'Ä', '&Ouml;': 'Ö', '&Uuml;': 'Ü',
    '&szlig;': 'ß', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>'
  };
  return text.replace(/&[a-zA-Z]+;/g, match => entities[match] || match);
}

function formatGermanDate(str) {
  return new Date(str).toLocaleString("de-DE", {
    weekday: "short", year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

async function getWritableCalendar() {
  if (fm.fileExists(calendarFile)) {
    let savedId = fm.readString(calendarFile);
    let all = await Calendar.forEvents();
    let found = all.find(c => c.identifier === savedId);
    if (found && !found.isReadOnly) return found;
    else fm.remove(calendarFile); // ungültigen Cache löschen
  }

  let calendars = (await Calendar.forEvents()).filter(c => !c.isReadOnly);
  let picker = new Alert();
  picker.title = "🗓 Kalender wählen";
  for (let cal of calendars) picker.addAction(cal.title);
  picker.addCancelAction("Abbrechen");
  let choice = await picker.presentAlert();
  if (choice === -1) return null;

  let selected = calendars[choice];
  fm.writeString(calendarFile, selected.identifier);
  return selected;
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
  let result = await input.presentAlert();
  if (result === -1) return;

  let url = input.textFieldValue(0).trim();
  if (!url.startsWith("http")) return;

  let html;
  try {
    html = await new Request(url).loadString();
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
    let confirm = new Alert();
    confirm.title = "Datum gefunden:";
    confirm.message = autoDate.toLocaleString("de-DE");
    confirm.addAction("Ja");
    confirm.addCancelAction("Nein");
    if ((await confirm.presentAlert()) === 0) date = autoDate;
  }

  if (!date) {
    let defaultDate = autoDate ? `${autoDate.getDate().toString().padStart(2, '0')}.${(autoDate.getMonth() + 1).toString().padStart(2, '0')}.${autoDate.getFullYear()}` : "20.09.2025";
    let defaultTime = autoDate ? `${autoDate.getHours().toString().padStart(2, '0')}:${autoDate.getMinutes().toString().padStart(2, '0')}` : "20:00";

    let dateAlert = new Alert();
    dateAlert.title = "Datum eingeben";
    dateAlert.addTextField(defaultDate);
    dateAlert.addCancelAction("Abbrechen");
    dateAlert.addAction("Weiter");
    if ((await dateAlert.presentAlert()) === -1) return;
    let [d, m, y] = dateAlert.textFieldValue(0).split(".");

    let timeAlert = new Alert();
    timeAlert.title = "Uhrzeit eingeben";
    timeAlert.addTextField(defaultTime);
    timeAlert.addCancelAction("Abbrechen");
    timeAlert.addAction("OK");
    if ((await timeAlert.presentAlert()) === -1) return;
    let t = timeAlert.textFieldValue(0);
    date = new Date(`${y}-${m}-${d}T${t}`);
  }

  let s = new Alert();
  s.title = "Status:";
  s.addAction("✅ Ticket");
  s.addAction("⭐️ Interesse");
  let status = (await s.presentAlert()) === 0 ? "ticket" : "interesse";

  if (events.find(ev => ev.date === date.toISOString() || ev.url === url)) {
    let dup = new Alert();
    dup.title = "⚠️ Event existiert bereits!";
    dup.addCancelAction("OK");
    await dup.presentAlert();
    return;
  }

  events.push({ title, url, date: date.toISOString(), status, city, venue });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  fm.writeString(filePath, JSON.stringify(events, null, 2));

  let done = new Alert();
  done.message = "✅ Event gespeichert";
  done.addCancelAction("OK");
  await done.presentAlert();
}
async function showMainMenu() {
  let menu = new Alert();
  menu.title = "🎫 Eventkalender";
  menu.addAction("➕ Neues Event hinzufügen");
  menu.addAction("📋 Kommende Events anzeigen");
  menu.addAction("📜 Alle Events anzeigen");
  menu.addDestructiveAction("🗑️ Alle Events löschen");
  menu.addCancelAction("Abbrechen");

  let choice = await menu.presentAlert();

  if (choice === 0) await addEvent();
  else if (choice === 1) await showEvents(true);
  else if (choice === 2) await showEvents(false);
  else if (choice === 3) {
    let confirm = new Alert();
    confirm.title = "Wirklich löschen?";
    confirm.message = "Alle gespeicherten Events unwiderruflich entfernen?";
    confirm.addDestructiveAction("Ja, löschen");
    confirm.addCancelAction("Abbrechen");
    if ((await confirm.presentAlert()) === 0) {
      events = [];
      fm.writeString(filePath, "[]");
    }
  }
}

async function showEvents(onlyFuture = true) {
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now);
  const past = events.filter(e => new Date(e.date) < now);

  const sections = onlyFuture
    ? [{ title: "Kommende Events", list: upcoming }]
    : [
        { title: "Kommende Events", list: upcoming },
        { title: "🔙 Vergangene Events", list: past }
      ];

  let t = new UITable();
  t.showSeparators = true;

  for (let section of sections) {
    if (section.list.length === 0) continue;

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
      header.addText(d.toLocaleDateString("de-DE", { month: "long", year: "numeric" }));
      t.addRow(header);

      for (let e of grouped[key]) {
        let row = new UITableRow();
        row.height = 80;

        let date = new Date(e.date);
        let isPast = date < now;
        let icon = e.status === "ticket" ? "✅" : "⭐️";
        if (!onlyFuture && isPast) icon = "🔙 " + icon;

        let cleanTitle = decodeHtmlEntities(e.title);
        let place = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "));
        let dateStr = formatGermanDate(e.date) + " Uhr";

        let titleCell = UITableCell.text(cleanTitle);
        titleCell.titleFont = Font.boldSystemFont(14);
        titleCell.titleColor = isPast ? Color.gray() : Color.white();
        titleCell.widthWeight = 3;
        row.addCell(titleCell);

        let subtitleCell = UITableCell.text(`${place}\n${dateStr}`);
        subtitleCell.titleFont = Font.systemFont(10);
        subtitleCell.titleColor = isPast ? Color.gray() : Color.lightGray();
        subtitleCell.widthWeight = 5;
        row.addCell(subtitleCell);

        let iconCell = UITableCell.text(icon);
        iconCell.titleFont = Font.systemFont(14);
        iconCell.titleColor = isPast ? Color.gray() : Color.white();
        iconCell.rightAligned();
        iconCell.widthWeight = 1;
        row.addCell(iconCell);

        row.onSelect = async () => {
          let a = new Alert();
          a.title = cleanTitle;
          a.message = `${formatGermanDate(e.date)}\n📍 ${e.city} – ${e.venue}`;
          a.addAction("🌐 Öffnen");
          a.addAction("📆 In Kalender eintragen");
          a.addDestructiveAction("🗑 Löschen");
          a.addAction("📝 Bearbeiten");
          a.addCancelAction("Zurück");

          let res = await a.presentAlert();
          if (res === 0) Safari.openInApp(e.url, true);
          else if (res === 1) await exportToCalendar(e);
          else if (res === 2) {
            events = events.filter(ev => !(ev.date === e.date && ev.url === e.url));
            fm.writeString(filePath, JSON.stringify(events, null, 2));
            await showEvents(onlyFuture);
          } else if (res === 3) {
            await editEvent(e);
            fm.writeString(filePath, JSON.stringify(events, null, 2));
            await showEvents(onlyFuture);
          }
        };

        t.addRow(row);
      }
    }
  }

  await t.present();
}

async function exportToCalendar(e) {
  try {
    let calendar = await getWritableCalendar();
    if (!calendar) throw new Error("Kein gültiger Kalender gewählt.");

    let event = new CalendarEvent();
    event.calendar = calendar;
    event.title = decodeHtmlEntities(e.title);
    event.location = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(", "));
    event.startDate = new Date(e.date);
    event.endDate = new Date(new Date(e.date).getTime() + 2 * 60 * 60 * 1000);
    event.url = e.url;

    await event.save();

    let info = new Alert();
    info.message = `✅ Event wurde im Kalender „${calendar.title}“ gespeichert.`;
    info.addCancelAction("OK");
    await info.presentAlert();
  } catch (err) {
    let error = new Alert();
    error.title = "Fehler beim Eintragen";
    error.message = err.message;
    error.addCancelAction("OK");
    await error.presentAlert();
  }
}

async function editEvent(e) {
  let titlePrompt = new Alert();
  titlePrompt.title = "Titel bearbeiten";
  titlePrompt.addTextField("Titel", e.title);
  titlePrompt.addCancelAction("Abbrechen");
  titlePrompt.addAction("Weiter");
  if ((await titlePrompt.presentAlert()) === -1) return;
  e.title = titlePrompt.textFieldValue(0);

  let ortPrompt = new Alert();
  ortPrompt.title = "Ort bearbeiten";
  ortPrompt.addTextField("Veranstaltungsort", e.venue);
  ortPrompt.addTextField("Stadt", e.city);
  ortPrompt.addCancelAction("Abbrechen");
  ortPrompt.addAction("Weiter");
  if ((await ortPrompt.presentAlert()) === -1) return;
  e.venue = ortPrompt.textFieldValue(0);
  e.city = ortPrompt.textFieldValue(1);

  let currentDate = new Date(e.date);
  let datePrompt = new Alert();
  datePrompt.title = "Neues Datum (TT.MM.JJJJ)";
  datePrompt.addTextField("Datum", currentDate.toLocaleDateString("de-DE"));
  datePrompt.addCancelAction("Abbrechen");
  datePrompt.addAction("Weiter");
  if ((await datePrompt.presentAlert()) === -1) return;
  let [d, m, y] = datePrompt.textFieldValue(0).split(".");

  let timePrompt = new Alert();
  timePrompt.title = "Neue Uhrzeit (HH:MM)";
  timePrompt.addTextField("Uhrzeit", currentDate.toTimeString().slice(0,5));
  timePrompt.addCancelAction("Abbrechen");
  timePrompt.addAction("Weiter");
  if ((await timePrompt.presentAlert()) === -1) return;
  let t = timePrompt.textFieldValue(0);

  let newDate = new Date(`${y}-${m}-${d}T${t}`);
  e.date = newDate.toISOString();

  let statusPrompt = new Alert();
  statusPrompt.title = "Status ändern:";
  statusPrompt.addAction("✅ Ticket");
  statusPrompt.addAction("⭐️ Interesse");
  let newStatus = (await statusPrompt.presentAlert()) === 0 ? "ticket" : "interesse";
  e.status = newStatus;
}

async function createWidget() {
  let w = new ListWidget();
  w.backgroundColor = new Color("#1c1c1e");
  w.setPadding(12, 15, 12, 15);

  let head = w.addText("🎫 Kommende Events");
  head.font = Font.mediumSystemFont(13);
  head.textColor = Color.gray();
  head.centerAlignText();

  let now = new Date();
  let upcoming = events.filter(e => new Date(e.date) >= now);
  if (upcoming.length === 0) {
    w.addText("Keine Events").font = Font.boldSystemFont(16);
    return w;
  }

  let count = config.widgetFamily === "large" ? 4 : config.widgetFamily === "medium" ? 2 : 1;

  for (let i = 0; i < Math.min(upcoming.length, count); i++) {
    let e = upcoming[i];
    let date = new Date(e.date);
    let icon = e.status === "ticket" ? "✅" : "⭐️";
    let place = decodeHtmlEntities([e.venue, e.city].filter(Boolean).join(" – "));

    let dateLine = w.addText(date.toLocaleDateString("de-DE", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric"
    }) + " – " + date.toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit"
    }) + " Uhr");
    dateLine.font = Font.mediumSystemFont(11);
    dateLine.textColor = Color.gray();

    let titleLine = w.addText(`${icon} ${decodeHtmlEntities(e.title)}`);
    titleLine.font = Font.boldSystemFont(14);
    titleLine.textColor = Color.white();
    titleLine.lineLimit = 2;

    if (place) {
      let loc = w.addText("📍 " + place);
      loc.font = Font.systemFont(11);
      loc.textColor = Color.lightGray();
    }

    if (i < count - 1) w.addSpacer(8);
  }

  w.url = URLScheme.forRunningScript();
  return w;
}
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