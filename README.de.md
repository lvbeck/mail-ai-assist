# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist unterstützt Sie bei ausgewählten E-Mails in Thunderbird: Nachrichten zusammenfassen oder übersetzen, Schlagwörter vorschlagen, markierten Text beim Verfassen überarbeiten und E-Mails lokal exportieren. Das Add-on durchsucht nicht selbstständig das gesamte Postfach. Automatische Zusammenfassungen und Schlagwörter werden nur für neue Posteingangsnachrichten in Konten erstellt, für die Sie die jeweilige Funktion ausdrücklich aktivieren.

## Funktionen

- **Zusammenfassungen:** Erfassen Sie die wichtigsten Punkte und Aufgaben einer ausgewählten Nachricht. Die Ausgabesprache ist unabhängig von der Oberflächen- und Übersetzungssprache; standardmäßig folgt sie der Systemsprache.
- **Übersetzung:** Wählen Sie Quell- und Zielsprache oder lassen Sie die Quellsprache automatisch erkennen. Google Cloud Translation, Microsoft Azure Translator und DeepL lassen sich mit eigenen API-Schlüsseln nutzen. Ohne konfigurierten Übersetzungsdienst wird das ausgewählte KI-Modell verwendet.
- **Schlagwörter und Aliasse:** Vorhandene Thunderbird-Schlagwörter werden bevorzugt, um ähnliche Neuanlagen zu vermeiden. Manuelle Vorschläge können vor der Bestätigung bearbeitet werden. Ordnen Sie beispielsweise `ZUB Helena` und `Helena Ultra` dem vorhandenen Schlagwort `Helena` zu. Regeln vergleichen vollständige Namen und ignorieren Groß-/Kleinschreibung sowie überzählige Leerzeichen.
- **Markierten Text überarbeiten:** Markieren Sie Text beim Verfassen oder Antworten, prüfen Sie die Vorschau und bestätigen Sie das Ersetzen. Das Add-on versendet niemals automatisch E-Mails.
- **Lokaler Export:** TXT exportiert den Inhalt und kann zitierte Antworten und Weiterleitungen ausschließen. EML bewahrt die vollständige Originalnachricht mit Kodierung, Kopfzeilen, Formatierung und Anhängen; Zitate bleiben enthalten. Der Export nutzt keine KI und verbraucht keine Token. Wählen Sie Ordner und Desktop-Anwendung; die Datei wird im Dateimanager markiert, damit Sie sie manuell in einen Chat ziehen oder anhängen können. Kein automatisches Anhängen oder Senden. Beim Schließen bleiben Dateien erhalten.
- **Dauerhafter Cache:** Passende Zusammenfassungen und Übersetzungen werden beim erneuten Öffnen wiederverwendet, auch nach einem Thunderbird-Neustart. „Erneut versuchen“ fordert ein neues Ergebnis an und aktualisiert den Cache. In den Einstellungen können Sie Größe anzeigen, den Ordner öffnen oder den Cache leeren; Exporte lassen sich separat bereinigen.
- **Zehn Oberflächensprachen:** Englisch, Deutsch, Französisch, Italienisch, Spanisch, Portugiesisch, vereinfachtes und traditionelles Chinesisch, Japanisch und Koreanisch.

## Optionale Automatisierung für neue Nachrichten

Automatische Zusammenfassungen und Schlagwörter sind für alle Konten **standardmäßig deaktiviert**. Aktivieren Sie beide Funktionen unabhängig voneinander über das KI-Assistent-Menü beim Rechtsklick auf ein Konto. Nur neu eingegangene Posteingangsnachrichten aktivierter Konten werden verarbeitet. Alte Nachrichten werden nicht durchsucht; bereits als Junk markierte Nachrichten werden übersprungen.

Automatische Zusammenfassungen werden zur späteren Anzeige zwischengespeichert. Automatische Schlagwörter werden anhand bestehender Schlagwörter und Aliasregeln direkt angewendet, ohne Einzelbestätigung wie bei manuellen Vorschlägen. Dabei werden der gewählte Anbieter, das Modell und die jeweilige Ausgabesprache verwendet; Nachrichteninhalte werden an diesen Dienst übermittelt und dessen Kontingent wird verbraucht. Für automatische Zusammenfassungen gelten standardmäßig 100 Versuche pro Konto und Tag, in den Einstellungen anpassbar. Fehlgeschlagene oder abgebrochene Versuche zählen mit. Dieses Limit gilt nicht für automatische Schlagwörter.

Zusammenfassung, Übersetzung und Verschlagwortung verarbeiten Betreff und Nachrichtentext, nicht den Inhalt von Anhängen. Prüfen Sie KI-Ergebnisse, da sie Fehler enthalten können.

## Anbieter und Datenschutz

ChatGPT-Autorisierung, Gemini API und Claude API werden unterstützt. Übersetzungen können Google Cloud Translation, Azure Translator oder DeepL verwenden; ohne konfigurierten Übersetzungsdienst wird das gewählte KI-Modell genutzt. Fehler lösen keinen Anbieterwechsel aus. Berechtigung und Kosten richten sich nach dem Anbieter. Relevante Inhalte gelangen über das Windows-Hilfsprogramm zum gewählten Dienst. Zugangsdaten sind mit DPAPI geschützt, Cache und Exporte lokal lesbar. Siehe [Datenschutz](publication/PRIVACY.md).

## Installation und Export

Windows-x64-Hilfsprogramm erforderlich: MSI unter [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases) herunterladen, installieren und Thunderbird neu starten. Erweiterung nach Veröffentlichung über ATN oder manuell als XPI installieren. Mindestversion laut Manifest: Thunderbird 128; Zielversionen praktisch testen. Links bedeuten keine erfolgte Veröffentlichung. TXT kann Zitate auslassen; EML erhält Original und Anhänge. Exportordner ist wählbar; Dateien werden zum manuellen Anhängen angezeigt und beim Schließen behalten. Verwaltete Exporte lassen sich in den Einstellungen löschen.

## Updates und Migration

ATN aktualisiert die Erweiterung, GitHub Releases liefert MSI und signierte helper-updates.json. Tags verwenden vVERSION; die neueste Veröffentlichung muss die Update-Datei enthalten. Begrenzte HTTPS-Weiterleitungen sind nur innerhalb dieses Repositories und zu release-assets.githubusercontent.com erlaubt. RSA-Signatur, Größe und SHA-256 werden geprüft. Alte Hilfsprogramme erhalten diese Änderung nicht automatisch: neues MSI einmal manuell installieren. Die selbst gehostete Erweiterung durch die ATN-XPI mit gleicher ID ersetzen; Einstellungsübernahme hängt von Thunderbird ab. Installationsumfang bleibt erhalten.

## Entwicklung

extension/: Erweiterung; helper/: Hilfsprogramm; tests/, installer/, scripts/, publication/. dist/ und work/ sind nicht versionierte Ausgabe-/Temporärordner. Node.js 22+ und Python 3.10+ erforderlich. Tests und XPI benötigen keine npm-Pakete. Nur für neue Icons: npm install und npm run icons.

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## MSI erstellen

Windows x64, MSVC C++ Build Tools/Windows SDK, WiX 4.0.6 mit UI/Util und separater Node-Laufzeitordner mit node.exe und NODE-LICENSE.txt erforderlich. Befehle im Repository-Stamm ausführen; WIX_EXE und VCVARS64 überschreiben die Erkennung. Eigene Pfade und den vorhandenen DPAPI-Schlüssel verwenden; keinen Ersatzschlüssel für bestehende Installationen erzeugen.

```powershell
dotnet tool install wix --version 4.0.6 --tool-path work/wix-tools
.\work\wix-tools\wix.exe extension add WixToolset.UI.wixext/4.0.6
.\work\wix-tools\wix.exe extension add WixToolset.Util.wixext/4.0.6
$env:MAIL_AI_RUNTIME_DIR = 'D:\build-tools\mail-ai-runtime'
$env:MAIL_AI_SIGNING_KEY_FILE = 'D:\private\update-signing-key.dpapi'
python installer/build-release.py
python installer/finalize-release.py
node installer/verify-release.mjs
```

## Veröffentlichung

Dateien aus dist/github-release/v0.12.24/ einzeln als Release-Anhänge hochladen, nicht nur als ZIP. ATN-XPI separat mit On this site einreichen. Siehe [Review](publication/REVIEW-NOTES.md), [Beschreibung](publication/LISTING.md), [Ablauf](publication/GITHUB-RELEASE.md). Skripte pushen, veröffentlichen oder installieren nichts automatisch. Keine Schlüssel, Zugangsdaten, E-Mails oder Caches einchecken; .gitignore entfernt keine bereits eingecheckten Geheimnisse. MIT: [LICENSE](LICENSE).
