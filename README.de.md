# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist bietet Thunderbird Zusammenfassungen, Übersetzung, Schlagwortvorschläge, Überarbeitung markierter Texte und lokalen E-Mail-Export. Version 0.12.24 bereitet GitHub-Downloads und ATN-Updates vor.

## Funktionen

Die Sprache der Zusammenfassung ist unabhängig einstellbar. Zusammenfassungen und Übersetzungen werden dauerhaft zwischengespeichert; Wiederholen erzeugt neue Ergebnisse. Automatische Zusammenfassungen und Schlagwörter sind standardmäßig aus und pro Konto für neue Posteingangsnachrichten aktivierbar. Standardlimit: 100 Zusammenfassungsversuche pro Konto und Tag. Vorhandene Schlagwörter und Aliasregeln werden berücksichtigt. Textänderungen erfordern Vorschau und Bestätigung; kein automatischer Versand.

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
