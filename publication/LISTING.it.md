# Descrizione proposta per ATN — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Riepilogo

Riassumi, traduci ed etichetta le email selezionate; automazione facoltativa per i nuovi messaggi in arrivo.

## Descrizione

Mail AI Assist aiuta a elaborare le email selezionate in Thunderbird: riassunti, traduzioni, suggerimenti di etichette, riscrittura del testo selezionato durante la composizione ed esportazione locale. Non esegue scansioni autonome dell’intera casella. Riassunti ed etichette automatici riguardano solo i nuovi messaggi in arrivo negli account per cui abiliti esplicitamente ciascuna funzione.

## Funzionalità

Il clic destro nel corpo del messaggio, anche su link e immagini, apre Assistente IA. Senza selezione viene elaborato l’intero messaggio. Con una selezione, riepilogo e traduzione inviano solo quel testo, senza oggetto né resto del corpo.

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

Supporta autorizzazione ChatGPT, Gemini API e Claude API.

Il permesso nativeMessaging collega Thunderbird al programma locale installato separatamente (local.mail_ai_assist). Scambia oggetto/corpo richiesto o testo selezionato, impostazioni di fornitore/modello/lingua, credenziali inserite, risultati IA, cache e contenuti/percorsi di esportazione. EML include intestazioni originali e allegati. Il programma gestisce autenticazione, richieste HTTPS, credenziali protette, cache, esportazione e apertura di applicazioni. Il testo pertinente viene inviato al servizio IA o di traduzione scelto; l’esportazione locale non chiama l’IA. Windows usa DPAPI, macOS la crittografia basata sul Portachiavi. Cache ed esportazioni sono leggibili localmente. Si applicano condizioni e costi del fornitore.

[Informativa sulla privacy](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md)

## Installazione ed esportazione

Servono Thunderbird 148 o successivo e il programma separato: Windows x64 (MSI), oppure macOS 13+ su Apple Silicon o Intel (PKG distinti). Scaricare da GitHub Releases, installare e riavviare Thunderbird. I pacchetti macOS non sono firmati né autenticati da Apple; i test completi sono ancora da eseguire. Linux non è supportato. ATN aggiorna l’estensione; Windows mantiene l’aggiornamento separato del programma, i pacchetti macOS pubblicati richiedono aggiornamenti manuali.

[GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)

Licenza: MIT

Assistenza: it@live.cn

https://github.com/lvbeck/mail-ai-assist/releases/latest
