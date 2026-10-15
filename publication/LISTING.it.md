# Descrizione proposta per ATN — Mail AI Assist

[English](LISTING.md) · [Deutsch](LISTING.de.md) · [Français](LISTING.fr.md) · [Italiano](LISTING.it.md) · [Español](LISTING.es.md) · [Português](LISTING.pt.md) · [简体中文](LISTING.zh-CN.md) · [繁體中文](LISTING.zh-TW.md) · [日本語](LISTING.ja.md) · [한국어](LISTING.ko.md)

## Riepilogo

Riassumi, traduci ed etichetta le email selezionate; automazione facoltativa per i nuovi messaggi in arrivo.

## Descrizione

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

Supporta autorizzazione ChatGPT, Gemini API e Claude API. Per tradurre: Google Cloud Translation, Azure Translator o DeepL; senza servizio configurato usa il modello IA scelto. Nessun cambio di fornitore dopo un errore. Accesso e costi dipendono dal fornitore. I contenuti pertinenti passano tramite il programma Windows al servizio scelto. Credenziali protette con DPAPI; cache ed esportazioni leggibili localmente. Vedi [privacy](https://github.com/lvbeck/mail-ai-assist/blob/main/publication/PRIVACY.md).

## Installazione ed esportazione

Serve il programma Windows x64: scarica il MSI da [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases), installa e riavvia Thunderbird. Installa l’estensione da ATN dopo la pubblicazione o manualmente tramite XPI. Minimo dichiarato: Thunderbird 128; verifica le versioni effettive. I collegamenti non implicano una pubblicazione già avvenuta. TXT può escludere citazioni; EML conserva originale e allegati. Cartella configurabile, file mostrati per aggiunta manuale e conservati alla chiusura. Pulizia disponibile nelle impostazioni.

Licenza: MIT

Assistenza: it@live.cn

Programma ausiliario Windows: https://github.com/lvbeck/mail-ai-assist/releases/latest
