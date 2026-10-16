# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist aiuta a elaborare le email selezionate in Thunderbird: riassunti, traduzioni, suggerimenti di etichette, riscrittura del testo selezionato durante la composizione ed esportazione locale. Non esegue scansioni autonome dell’intera casella. Riassunti ed etichette automatici riguardano solo i nuovi messaggi in arrivo negli account per cui abiliti esplicitamente ciascuna funzione.

## Funzionalità

- **Riassunti:** Estrai i punti principali e le attività da svolgere dal messaggio selezionato. La lingua del riassunto è indipendente da quelle dell’interfaccia e della traduzione; per impostazione predefinita segue il sistema.
- **Traduzione:** Scegli le lingue di origine e destinazione oppure rileva automaticamente quella di origine. Configura Google Cloud Translation, Microsoft Azure Translator o DeepL con la tua chiave API. Senza un servizio configurato viene usato il modello IA selezionato.
- **Etichette e alias:** Riutilizza preferibilmente le etichette Thunderbird esistenti per evitare duplicati simili. Modifica i suggerimenti manuali prima di confermarli. Associa, ad esempio, `Project Alpha` e `Project Beta` all’etichetta esistente `Projects`. Le regole confrontano nomi completi ignorando maiuscole, minuscole e spazi superflui.
- **Riscrittura del testo selezionato:** Seleziona il testo mentre componi o rispondi, controlla l’anteprima e conferma la sostituzione. L’estensione non invia mai email automaticamente.
- **Esportazione locale:** TXT esporta il contenuto con la possibilità di escludere risposte citate e inoltri. EML conserva il messaggio originale completo, codifica, intestazioni, formattazione e allegati, senza filtrare le citazioni. L’esportazione non usa l’IA né consuma token. Scegli cartella e applicazione desktop; il file viene selezionato nel gestore file per trascinarlo o allegarlo manualmente a una chat. Non viene allegato o inviato automaticamente e rimane disponibile dopo la chiusura della finestra.
- **Cache persistente:** Riassunti e traduzioni corrispondenti vengono riutilizzati alla riapertura, anche dopo il riavvio di Thunderbird. Riprova richiede un nuovo risultato e aggiorna la cache. Nelle impostazioni puoi vedere le dimensioni, aprire la cartella o svuotarla; i file esportati si eliminano separatamente.
- **Dieci lingue dell’interfaccia:** inglese, tedesco, francese, italiano, spagnolo, portoghese, cinese semplificato e tradizionale, giapponese e coreano.

## Automazione facoltativa per i nuovi messaggi

Riassunti ed etichette automatici sono **disattivati per impostazione predefinita in tutti gli account**. Abilitali separatamente dal menu dell’assistente IA facendo clic destro sull’account. Vengono elaborati solo i nuovi messaggi ricevuti nella posta in arrivo degli account abilitati, senza scansione della cronologia; i messaggi già contrassegnati come spam vengono ignorati.

I riassunti automatici vengono salvati nella cache per consultarli in seguito. Le etichette automatiche vengono applicate direttamente usando etichette esistenti e alias, senza confermare ogni messaggio come per i suggerimenti manuali. L’automazione usa il fornitore, il modello e la lingua di output scelti, invia il contenuto al servizio e ne consuma la quota. Il limite predefinito per i riassunti automatici è di 100 tentativi per account al giorno, modificabile nelle impostazioni. Contano anche i tentativi falliti o annullati. Il limite non riguarda le etichette automatiche.

Riassunti, traduzioni ed etichette elaborano oggetto e corpo del messaggio, non il contenuto degli allegati. Verifica i risultati dell’IA prima di usarli.

## Fornitori e privacy

Supporta autorizzazione ChatGPT, Gemini API e Claude API. Per tradurre: Google Cloud Translation, Azure Translator o DeepL; senza servizio configurato usa il modello IA scelto. Nessun cambio di fornitore dopo un errore. Accesso e costi dipendono dal fornitore. I contenuti pertinenti passano tramite il programma Windows al servizio scelto. Credenziali protette con DPAPI; cache ed esportazioni leggibili localmente. Vedi [privacy](publication/PRIVACY.md).

## Installazione ed esportazione

Windows e macOS usano lo stesso XPI Thunderbird e un programma ausiliario installato separatamente per il sistema operativo.

### Download · v0.12.26

- [Windows x64 · MSI](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-x64.msi)
- [macOS Apple Silicon (arm64) · PKG](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-arm64-unsigned.pkg)
- [macOS Intel (x64) · PKG](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26-macos-x64-unsigned.pkg)
- [Thunderbird · XPI](https://github.com/lvbeck/mail-ai-assist/releases/download/v0.12.26/Mail-AI-Assist-0.12.26.xpi)

Scarica qui sotto il programma ausiliario per il tuo sistema e il file XPI di Thunderbird. Installa il programma ausiliario, poi il file XPI da Thunderbird → Componenti aggiuntivi e temi → Estensioni → menu ingranaggio → Installa componente aggiuntivo da file. Riavvia Thunderbird.

I PKG per macOS 13+ non sono firmati né autenticati tramite notarizzazione. I test completi di installazione, accesso e integrazione con Thunderbird su Mac reali sono ancora da eseguire. Gli aggiornamenti automatici macOS non sono attivi.

Installa l’estensione da ATN dopo la pubblicazione o manualmente tramite XPI. Minimo dichiarato: Thunderbird 128; verifica le versioni effettive. TXT può escludere citazioni; EML conserva originale e allegati. Cartella configurabile, file mostrati per aggiunta manuale e conservati alla chiusura. Pulizia disponibile nelle impostazioni.

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

Carica separatamente i file di dist/github-release/v0.12.26/ come allegati della Release, non solo un ZIP. Invia lo XPI ATN con On this site. Vedi [revisione](publication/REVIEW-NOTES.md), [descrizione](publication/LISTING.md), [procedura](publication/GITHUB-RELEASE.md). Gli script non inviano, pubblicano o installano automaticamente. Non versionare chiavi, credenziali, posta o cache; .gitignore non elimina segreti già registrati. MIT: [LICENSE](LICENSE).

## Supporto macOS · 0.12.26

I pacchetti Mac includono Mail-AI-Assist.xpi accanto a setup-guide.html in /Library/Application Support/MailAiAssist. Dopo l’installazione, la guida si apre quando possibile per l’utente connesso al desktop. Altrimenti apri questa cartella nel Finder. Installa manualmente il file XPI in Thunderbird e conferma le autorizzazioni.

I PKG per macOS 13+ non sono firmati né autenticati tramite notarizzazione. I test completi di installazione, accesso e integrazione con Thunderbird su Mac reali sono ancora da eseguire. Gli aggiornamenti automatici macOS non sono attivi.

[compilazione e test macOS](installer/macos/README.md)
