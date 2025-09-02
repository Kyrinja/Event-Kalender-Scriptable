# 📅 Scriptable Eventkalender
Ein leistungsfähiger Eventkalender für iOS, speziell entwickelt für die Nutzung in [Scriptable](https://scriptable.app).  
Importiere Events direkt über Eventim-Links, speichere sie lokal in iCloud, zeige sie im Widget an und exportiere sie bei Bedarf direkt in deinen iOS-Kalender.

---

## 🚀 Funktionen
- 🔗 **Eventim-Link-Import**: Automatische Erkennung von Titel, Datum, Uhrzeit, Ort und Stadt.
- 📆 **Kalenderintegration**: Export direkt in den gewählten iOS-Kalender, inkl. Dauerwahl (1–4h oder ganztägig).
- ✏️ **Bearbeiten & Löschen**: Events können nachträglich angepasst oder entfernt werden.
- 🧠 **Duplikatprüfung**: Schutz vor doppelten Einträgen (Datum oder URL).
- 📂 **iCloud-Speicherung**: Lokale Speicherung in `iCloud/Scriptable/EventCalendar/`.
- 📱 **Widget-Anzeige**: Darstellung kommender Events – je nach Widgetgröße unterschiedlich viele Events.
- 🌐 **Direkt öffnen**: Event-Link kann direkt im Browser aufgerufen werden.
- 🔄 **Status-Verwaltung**: Unterscheidung zwischen „⭐️ Interesse“ und „✅ Ticket“.
- 🗓️ **Kalenderauswahl**: Auswahl wird gespeichert und für künftige Exporte automatisch genutzt.
- 🧼 **Automatische Bereinigung**: HTML-Entities (&amp;, &quot; etc.) werden beim Laden automatisch korrigiert.
- ℹ️ **Info-Menü**: Version, Entwickler, Featureliste & Easteregg.

---

## 📷 Screenshots


---

## 🛠 Installation
1. Scriptable auf dem iPhone öffnen.
2. Neues Script erstellen.
3. Den gesamten Inhalt von `EventCalendarWidget.js` einfügen.
4. Optional: Widget auf dem Homescreen mit diesem Script anlegen.
5. Events hinzufügen über manuelles Starten des Scripts (Eventim-Link aus der Zwischenablage wird erkannt).

---

## 🔧 Benötigte Rechte
Beim ersten Start wird Zugriff auf den iOS-Kalender benötigt.  
Bitte zulassen, um Export-Funktionen nutzen zu können.

---

## 🗃 Speicherort
- **Events:** `iCloud Drive/Scriptable/EventCalendar/events.json`
- **Kalenderauswahl:** `iCloud Drive/Scriptable/EventCalendar/selectedCalendar.txt`

---

## ⌨️ Menü-Übersicht (bei manueller Nutzung)

| Aktion                 | Beschreibung                          |
|-------------------------|--------------------------------------|
| ➕ Neues Event          | Importiere einen Eventim-Link oder manuell |
| 📋 Kommende anzeigen    | Nur zukünftige Events anzeigen        |
| 📜 Alle anzeigen        | Kommende **und** vergangene Events    |
| 📤 Events teilen        | Alle kommenden Events in Liste teilen |
| ⚙️ Einstellungen        | Kalender wählen, löschen, Info-Ansicht |
| 🗑️ Alle löschen         | Entfernt alle gespeicherten Events    |

---

## 🌍 English Summary
A local Scriptable-based event calendar widget and manager for iOS.  
Features include importing events from Eventim, storing them in iCloud, viewing them in a table or widget, editing/deleting entries, and exporting them to the iOS calendar.

---

## 📄 Lizenz
Copyright (c) 2025 **Sascha Ewertz**

Dieses Script ist urheberrechtlich geschützt.  
Die Nutzung ist ausschließlich für **private und nicht-kommerzielle Zwecke** gestattet.

Es ist **nicht erlaubt**, dieses Script oder daraus abgeleitete Versionen ganz oder teilweise:
- kommerziell zu nutzen,
- weiterzuverkaufen,
- in kommerzielle Produkte zu integrieren,
- oder ohne ausdrückliche schriftliche Genehmigung des Urhebers zu verbreiten.

Alle Rechte vorbehalten.  
📧 Lizenzanfragen: **sascha.ewertz@gmail.com**