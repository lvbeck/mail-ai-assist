# ATN-Beschreibungsvorschlag — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Kurzbeschreibung

Ausgewählte E-Mails zusammenfassen, übersetzen und verschlagworten; neue Nachrichten optional automatisch verarbeiten.

## Beschreibung

Mail AI Assist unterstützt Sie bei ausgewählten E-Mails in Thunderbird: Nachrichten zusammenfassen oder übersetzen, Schlagwörter vorschlagen, markierten Text beim Verfassen überarbeiten und E-Mails lokal exportieren. Das Add-on durchsucht nicht selbstständig das gesamte Postfach. Automatische Zusammenfassungen und Schlagwörter werden nur für neue Posteingangsnachrichten in Konten erstellt, für die Sie die jeweilige Funktion ausdrücklich aktivieren.

## Funktionen

Im Nachrichtentext, auch auf Links und Bildern, öffnet ein Rechtsklick den KI-Assistenten. Ohne Textauswahl wird die ganze Nachricht verarbeitet. Bei einer Auswahl senden Zusammenfassung und Übersetzung nur diesen Text, ohne Betreff und restlichen Inhalt.

- **Zusammenfassungen:** Erfassen Sie die wichtigsten Punkte und Aufgaben einer ausgewählten Nachricht. Die Ausgabesprache ist unabhängig von der Oberflächen- und Übersetzungssprache; standardmäßig folgt sie der Systemsprache.
- **Übersetzung:** Wählen Sie Quell- und Zielsprache oder lassen Sie die Quellsprache automatisch erkennen. Google Cloud Translation, Microsoft Azure Translator und DeepL lassen sich mit eigenen API-Schlüsseln nutzen. Ohne konfigurierten Übersetzungsdienst wird das ausgewählte KI-Modell verwendet.
- **Schlagwörter und Aliasse:** Vorhandene Thunderbird-Schlagwörter werden bevorzugt, um ähnliche Neuanlagen zu vermeiden. Manuelle Vorschläge können vor der Bestätigung bearbeitet werden. Ordnen Sie beispielsweise `Project Alpha` und `Project Beta` dem vorhandenen Schlagwort `Projects` zu. Regeln vergleichen vollständige Namen und ignorieren Groß-/Kleinschreibung sowie überzählige Leerzeichen.
- **Markierten Text überarbeiten:** Markieren Sie Text beim Verfassen oder Antworten, prüfen Sie die Vorschau und bestätigen Sie das Ersetzen. Das Add-on versendet niemals automatisch E-Mails.
- **Lokaler Export:** TXT exportiert den Inhalt und kann zitierte Antworten und Weiterleitungen ausschließen. EML bewahrt die vollständige Originalnachricht mit Kodierung, Kopfzeilen, Formatierung und Anhängen; Zitate bleiben enthalten. Der Export nutzt keine KI und verbraucht keine Token. Wählen Sie Ordner und Desktop-Anwendung; die Datei wird im Dateimanager markiert, damit Sie sie manuell in einen Chat ziehen oder anhängen können. Kein automatisches Anhängen oder Senden. Beim Schließen bleiben Dateien erhalten.
- **Dauerhafter Cache:** Passende Zusammenfassungen und Übersetzungen werden beim erneuten Öffnen wiederverwendet, auch nach einem Thunderbird-Neustart. „Erneut versuchen“ fordert ein neues Ergebnis an und aktualisiert den Cache. In den Einstellungen können Sie Größe anzeigen, den Ordner öffnen oder den Cache leeren; Exporte lassen sich separat bereinigen.
- **Zehn Oberflächensprachen:** Englisch, Deutsch, Französisch, Italienisch, Spanisch, Portugiesisch, vereinfachtes und traditionelles Chinesisch, Japanisch und Koreanisch.

## Optionale Automatisierung für neue Nachrichten

Automatische Zusammenfassungen und Schlagwörter sind für alle Konten **standardmäßig deaktiviert**. Aktivieren Sie beide Funktionen unabhängig voneinander über das KI-Assistent-Menü beim Rechtsklick auf ein Konto. Nur neu eingegangene Posteingangsnachrichten aktivierter Konten werden verarbeitet. Alte Nachrichten werden nicht durchsucht; bereits als Junk markierte Nachrichten werden übersprungen.

Automatische Zusammenfassungen werden zur späteren Anzeige zwischengespeichert. Automatische Schlagwörter werden anhand bestehender Schlagwörter und Aliasregeln direkt angewendet, ohne Einzelbestätigung wie bei manuellen Vorschlägen. Dabei werden der gewählte Anbieter, das Modell und die jeweilige Ausgabesprache verwendet; Nachrichteninhalte werden an diesen Dienst übermittelt und dessen Kontingent wird verbraucht. Für automatische Zusammenfassungen gelten standardmäßig 100 Versuche pro Konto und Tag, in den Einstellungen anpassbar. Fehlgeschlagene oder abgebrochene Versuche zählen mit. Dieses Limit gilt nicht für automatische Schlagwörter.

Zusammenfassung, Übersetzung und Verschlagwortung verarbeiten Betreff und Nachrichtentext, nicht den Inhalt von Anhängen. Prüfen Sie KI-Ergebnisse, da sie Fehler enthalten können.

## Anbieter und Datenschutz

ChatGPT-Autorisierung, Gemini API und Claude API werden unterstützt.

Die Berechtigung nativeMessaging verbindet Thunderbird mit dem separat installierten lokalen Hilfsprogramm (local.mail_ai_assist). Ausgetauscht werden angeforderter Betreff/Nachrichtentext oder ausgewählter Text, Anbieter-/Modell-/Spracheinstellungen, eingegebene Zugangsdaten, KI-Ergebnisse, Cachedaten sowie Exportinhalte und Pfade. EML umfasst Originalkopfzeilen und Anhänge. Das Hilfsprogramm übernimmt Anmeldung, HTTPS-Anfragen, geschützte Zugangsdaten, Cache, Dateiexport und das Öffnen von Desktop-Apps. Relevanter Text geht an den gewählten KI- oder Übersetzungsdienst; der lokale Export ruft keine KI auf. Windows nutzt DPAPI, macOS eine auf dem Schlüsselbund basierende Verschlüsselung. Cache und Exporte sind lokal lesbar. Bedingungen und Kosten des Anbieters gelten.

[Datenschutz](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md)

## Installation und Export

Erforderlich sind Thunderbird 148 oder neuer und ein separat installiertes Hilfsprogramm: Windows x64 (MSI) oder macOS 13+ auf Apple Silicon oder Intel (separate PKGs). Von GitHub Releases herunterladen, installieren und Thunderbird neu starten. macOS-Pakete sind weder signiert noch notarisiert; vollständige Praxistests stehen noch aus. Linux wird derzeit nicht unterstützt. ATN aktualisiert die Erweiterung; Windows behält den separaten Helper-Updater, veröffentlichte macOS-Pakete werden manuell aktualisiert.

[GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)

Lizenz: MIT

Support: it@live.cn

https://github.com/lvbeck/mail-ai-assist/releases/latest
