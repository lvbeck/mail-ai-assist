# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist aggiunge a Thunderbird riassunti, traduzione, suggerimenti di etichette, riscrittura del testo selezionato ed esportazione locale. La versione 0.12.24 prepara download GitHub e aggiornamenti ATN.

## Funzioni

Lingua dei riassunti indipendente. Riassunti e traduzioni persistono nella cache; Riprova li rigenera. Riassunti ed etichette automatici sono disattivati per impostazione predefinita e attivabili per account sui nuovi messaggi in arrivo. Limite iniziale: 100 tentativi di riassunto per account al giorno. Riutilizzo di etichette e alias. La riscrittura richiede anteprima e conferma; nessun invio automatico.

## Fornitori e privacy

Supporta autorizzazione ChatGPT, Gemini API e Claude API. Per tradurre: Google Cloud Translation, Azure Translator o DeepL; senza servizio configurato usa il modello IA scelto. Nessun cambio di fornitore dopo un errore. Accesso e costi dipendono dal fornitore. I contenuti pertinenti passano tramite il programma Windows al servizio scelto. Credenziali protette con DPAPI; cache ed esportazioni leggibili localmente. Vedi [privacy](publication/PRIVACY.md).

## Installazione ed esportazione

Serve il programma Windows x64: scarica il MSI da [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), installa e riavvia Thunderbird. Installa l’estensione da ATN dopo la pubblicazione o manualmente tramite XPI. Minimo dichiarato: Thunderbird 128; verifica le versioni effettive. I collegamenti non implicano una pubblicazione già avvenuta. TXT può escludere citazioni; EML conserva originale e allegati. Cartella configurabile, file mostrati per aggiunta manuale e conservati alla chiusura. Pulizia disponibile nelle impostazioni.

## Aggiornamenti e migrazione

ATN aggiorna l’estensione; GitHub Releases ospita MSI e helper-updates.json firmato. Tag vVERSION; l’ultima release deve contenere il manifesto. Reindirizzamenti HTTPS limitati al repository e a release-assets.githubusercontent.com, mantenendo verifiche RSA, dimensione e SHA-256. Per i vecchi programmi installa manualmente il nuovo MSI una volta. Sostituisci lo XPI precedente con quello ATN dello stesso ID; mantenimento delle impostazioni secondo Thunderbird. Resta il flusso di installazione per utente o macchina.

## Sviluppo

extension/: estensione; helper/: programma locale; tests/, installer/, scripts/, publication/. dist/ e work/ non sono versionati. Servono Node.js 22+ e Python 3.10+. Test e XPI senza dipendenze npm; npm install e npm run icons solo per rigenerare le icone.

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## Compilazione MSI

Servono Windows x64, MSVC C++ Build Tools/Windows SDK, WiX 4.0.6 UI/Util e una cartella Node autonoma con node.exe e NODE-LICENSE.txt. Esegui dalla radice. WIX_EXE e VCVARS64 possono specificare gli strumenti. Adatta i percorsi e usa la chiave DPAPI esistente; non sostituirla per installazioni esistenti.

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

## Pubblicazione

Carica separatamente i file di dist/github-release/v0.12.24/ come allegati della Release, non solo un ZIP. Invia lo XPI ATN con On this site. Vedi [revisione](publication/REVIEW-NOTES.md), [descrizione](publication/LISTING.md), [procedura](publication/GITHUB-RELEASE.md). Gli script non inviano, pubblicano o installano automaticamente. Non versionare chiavi, credenziali, posta o cache; .gitignore non elimina segreti già registrati. MIT: [LICENSE](LICENSE).
