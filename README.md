# 📅 Scriptable Eventkalender

Ein leistungsfähiger Eventkalender für iOS, speziell entwickelt für die Nutzung in [Scriptable](https://scriptable.app/). Importiere Events direkt über Eventim-Links, speichere sie lokal, zeige sie im Widget an und exportiere sie bei Bedarf direkt in deinen iOS-Kalender.

---

## 🚀 Funktionen

- 🔗 **Eventim-Link-Import:** Automatische Erkennung von Titel, Datum, Uhrzeit, Ort, Stadt.
- 📆 **Kalenderintegration:** Eintrag direkt in den gewählten iOS-Kalender möglich.
- ✏️ **Bearbeiten & Löschen:** Events können nachträglich bearbeitet oder entfernt werden.
- 🧠 **Duplikatprüfung:** Schutz vor doppelten Einträgen.
- 📂 **iCloud-Speicherung:** Lokale Speicherung in `iCloud/Scriptable/EventCalendar`.
- 📱 **Widget-Anzeige:** Kompakte Darstellung kommender Events – Größe abhängig vom Widget.
- 🌐 **Event öffnen:** Link zum Event direkt im Browser aufrufbar.
- 🔄 **Unterscheidung zwischen „Interesse“ und „Ticket“**
- 🗓️ **Kalenderauswahl wird gespeichert** und bei Exporten wiederverwendet.

---

## 📷 Screenshots

folgen

---

## 🛠 Installation

1. Öffne Scriptable auf deinem iPhone.
2. Erstelle ein neues Script.
3. Kopiere den gesamten Inhalt aus `EventCalendarWidget.js` hinein.
4. Optional: Erstelle ein Widget auf deinem Homescreen mit diesem Script.
5. Um Events hinzuzufügen, das Script manuell starten.

---

## 🔧 Benötigte Rechte

Beim ersten Start wirst du nach dem Zugriff auf den Kalender gefragt. Diese müssen zugelassen werden, um alle Funktionen zu verwenden.

---

## 🗃 Speicherort

- Events: `iCloud Drive/Scriptable/EventCalendar/events.json`
- Kalenderauswahl: `iCloud Drive/Scriptable/EventCalendar/selectedCalendar.txt`

---

## ⌨️ Tastenkürzel (bei manueller Nutzung)

| Aktion                  | Beschreibung                                 |
|-------------------------|----------------------------------------------|
| ➕ Neues Event           | Importiere einen Eventim-Link oder manuell   |
| 📋 Kommende anzeigen    | Nur zukünftige Events                        |
| 📜 Alle anzeigen        | Kommende und vergangene Events               |
| 🗑️ Alle löschen         | Löscht alle gespeicherten Events             |

---

## 🌍 English Summary

A local Scriptable-based event calendar widget and manager for iOS. Events can be imported from Eventim, stored in iCloud, viewed in a table or widget, and exported to the iOS calendar.

---

## 📄 Lizenz

Copyright (c) 2025 Sascha Ewertz

Dieses Script ist urheberrechtlich geschützt. Die Nutzung ist ausschließlich für private und nicht-kommerzielle Zwecke gestattet.

Es ist nicht erlaubt, dieses Script oder daraus abgeleitete Versionen ganz oder teilweise:
- kommerziell zu nutzen,
- weiterzuverkaufen,
- in kommerzielle Produkte zu integrieren,
- oder ohne ausdrückliche schriftliche Genehmigung des Urhebers zu verbreiten.

Der Urheber behält sich alle Rechte vor.

Bei Fragen oder Lizenzanfragen: sascha.ewertz@gmail.com