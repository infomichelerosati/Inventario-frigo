Una PWA (Progressive Web App) per la gestione delle scorte e delle scadenze alimentari, 100% offline, privata e basata sulla scansione dei codici a barre.

Sviluppato da Michele Rosati.

💡 Descrizione

Questo progetto nasce dall'esigenza di tracciare in modo semplice e veloce i prodotti alimentari presenti in dispensa o in frigorifero. L'obiettivo principale è evitare gli sprechi, tenendo sotto controllo le date di scadenza.

L'app funziona interamente sul dispositivo dell'utente: non richiede registrazione e non invia alcun dato a un server esterno. Tutta l'anagrafica dei prodotti e l'inventario sono salvati localmente nel browser tramite IndexedDB.

✨ Funzionalità Principali

📱 Installabile (PWA): L'app può essere installata sulla Home Screen del dispositivo per un accesso rapido, proprio come un'app nativa.

📶 100% Offline: Grazie a un Service Worker, l'app è completamente funzionante anche senza connessione internet.

📸 Scansione Barcode: Utilizza la fotocamera del dispositivo (tramite QuaggaJS) per scansionare i codici a barre (EAN) dei prodotti.

🗃️ Anagrafica Prodotti:

Se un prodotto scansionato è sconosciuto, l'app chiede di inserirlo nell'anagrafica.

Salva nome, brand e immagine del prodotto (scattando una foto e comprimendola al volo).

🛒 Gestione Inventario:

Traccia ogni singolo articolo caricato, associandolo alla sua data di scadenza.

🚨 Alert Scadenze: Una dashboard principale mostra immediatamente i prodotti in scadenza imminente (entro 7 giorni) o già scaduti.

🔍 Ricerca Manuale: Permette di cercare prodotti nell'anagrafica per nome o brand, senza dover scansionare il codice.

🔒 Privacy Totale: Tutti i dati (anagrafica, foto, inventario) risiedono esclusivamente nel database IndexedDB del browser dell'utente.

🚀 Tecnologie Utilizzate

HTML5

Tailwind CSS (caricato tramite CDN)

JavaScript (ES6+ Modules)

Progressive Web App (PWA):

Service Worker (per cache offline e logica di aggiornamento)

Web App Manifest (per l'installabilità)

IndexedDB: Il database NoSQL del browser, usato come unico storage.

QuaggaJS: Libreria per la scansione e il riconoscimento dei codici a barre in tempo reale.

Font Awesome: (caricato tramite CDN) per le icone.

📦 Installazione e Test Locale

Per testare l'app in locale, non è sufficiente aprire il file index.html con un doppio click (ovvero tramite file:///...).

Le moderne API web, come il Service Worker e l'accesso alla Fotocamera (getUserMedia), richiedono che la pagina sia servita da un server web (anche locale), in un contesto "sicuro" (http://localhost).

Metodo 1: Python (Veloce)

Se hai Python installato, apri un terminale nella cartella del progetto e lancia:

# Per Python 3.x
python -m http.server


Apri il browser e visita: http://localhost:8000

Metodo 2: VS Code (Consigliato)

Se usi Visual Studio Code, installa l'estensione "Live Server" di Ritwick Dey.
Fai click con il tasto destro sul file index.html e scegli "Open with Live Server".

📱 Test su Mobile (Fotocamera e HTTPS)

Per testare l'accesso alla fotocamera sul tuo smartphone, l'app deve essere servita in HTTPS.

Il modo più semplice per farlo è caricare i file su GitHub Pages:

Carica tutti i file (inclusa la cartella images/) nel tuo repository GitHub.

Vai su Settings > Pages.

Seleziona il branch main (o master) e la cartella /(root).

Salva.

Dopo pochi minuti, la tua PWA sarà live all'indirizzo https://tuo-username.github.io/nome-repository/ e potrai testare la fotocamera e l'installazione sul cellulare.
