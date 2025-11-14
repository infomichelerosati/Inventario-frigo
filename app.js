// Elementi DOM
const stopScanBtn = document.getElementById('stop-scan-btn');
const scannerView = document.getElementById('scanner-view');

const inventoryList = document.getElementById('inventory-list');
const alertsListWrapper = document.getElementById('alerts-list-wrapper');
const emptyInventoryMsg = document.getElementById('empty-inventory-msg');

// Viste Principali
const inventoryDisplay = document.getElementById('inventory-display');
const searchView = document.getElementById('search-view');

// Barra di Navigazione
const navInventoryBtn = document.getElementById('nav-inventory-btn');
const navScanBtn = document.getElementById('nav-scan-btn');
const navSearchBtn = document.getElementById('nav-search-btn');

// Elementi Ricerca
const searchInput = document.getElementById('search-input');
const searchResultsList = document.getElementById('search-results-list');

// Modali Anagrafica e Istanza
const addProductModal = document.getElementById('add-product-modal');
const addProductForm = document.getElementById('add-product-form');
const productBarcodeInput = document.getElementById('product-barcode');
const productNameInput = document.getElementById('product-name');
const productBrandInput = document.getElementById('product-brand');
const productImageUpload = document.getElementById('product-image-upload'); // Input file
const cancelAddProductBtn = document.getElementById('cancel-add-product');

const addInstanceModal = document.getElementById('add-instance-modal');
const addInstanceForm = document.getElementById('add-instance-form');
const instanceNameSpan = document.getElementById('instance-name');
const instanceBarcodeSpan = document.getElementById('instance-barcode');
const instanceExpiryInput = document.getElementById('instance-expiry');
const cancelAddInstanceBtn = document.getElementById('cancel-add-instance');

// Modal Dettagli Prodotto
const productDetailModal = document.getElementById('product-detail-modal');
const closeProductDetailModalBtn = document.getElementById('close-product-detail-modal');
const detailProductName = document.getElementById('detail-product-name');
const detailProductImage = document.getElementById('detail-product-image');
const detailProductBrand = document.getElementById('detail-product-brand');
const detailProductBarcode = document.getElementById('detail-product-barcode');
const detailInstancesList = document.getElementById('detail-instances-list');

// Nuovo Modal di Conferma
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmBtnCancel = document.getElementById('confirm-btn-cancel');
const confirmBtnConfirm = document.getElementById('confirm-btn-confirm');
let confirmResolve = null; // Promise per il modal di conferma

// Canvas per ridimensionamento immagini
const imageCanvas = document.getElementById('temp-canvas'); // Usiamo un canvas nascosto per questo

// Service Worker Update
const updatePromptModal = document.getElementById('update-prompt-modal');
const updateButton = document.getElementById('update-button');
let deferredPrompt; // Per gestire il prompt di aggiornamento della PWA

// Variabili globali per IndexedDB
let db;

// --- 1. FUNZIONI DI UTILITÀ ---

/**
 * Formatta una data in stringa 'GG/MM/AAAA'
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Calcola i giorni rimanenti alla scadenza
 * @param {Date} expiryDate
 * @returns {number}
 */
function getDaysUntilExpiry(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignora l'ora
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0); // Ignora l'ora
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Nasconde tutti i modali
 */
function hideModals() {
    addProductModal.classList.add('hidden');
    addInstanceModal.classList.add('hidden');
    productDetailModal.classList.add('hidden'); // Nasconde anche il nuovo modal
    confirmModal.classList.add('hidden'); // Nasconde il modal di conferma
    // Resetta i form se necessario
    addProductForm.reset();
    addInstanceForm.reset();
    // Pulisce l'input file dell'immagine
    productImageUpload.value = '';
}

/**
 * Mostra un modal di conferma personalizzato.
 * @param {string} title Titolo del modal.
 * @param {string} message Messaggio di conferma.
 * @returns {Promise<boolean>} Risolve true se confermato, false se annullato.
 */
function showConfirmation(title, message) {
    return new Promise((resolve) => {
        confirmResolve = resolve; // Salva la funzione 'resolve' della promise
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmModal.classList.remove('hidden');
    });
}


/**
 * Ridimensiona un'immagine Blob utilizzando un canvas.
 * @param {File} file Il file immagine originale.
 * @param {number} maxWidth La larghezza massima desiderata.
 * @param {number} maxHeight L'altezza massima desiderata.
 * @param {number} quality La qualità JPEG (0-1, es. 0.7).
 * @returns {Promise<Blob>} Una Promise che risolve con l'immagine ridimensionata come Blob.
 */
function resizeImage(file, maxWidth, maxHeight, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = imageCanvas; // Usiamo il canvas globale
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;

                // Calcola le nuove dimensioni mantenendo le proporzioni
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Disegna l'immagine ridimensionata sul canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Esporta il canvas come Blob
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

// --- 2. LOGICA SERVICE WORKER E PWA ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registrato con successo:', registration);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // C'è un nuovo Service Worker e uno vecchio è attivo
                            updatePromptModal.classList.remove('hidden');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Registrazione ServiceWorker fallita:', error);
            });
    });

    updateButton.addEventListener('click', () => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload(); // Ricarica la pagina per attivare il nuovo SW
        }
    });
}

// --- 3. LOGICA DI SCANSIONE BARCODE ---

let isScanning = false; // Flag per lo stato dello scanner

/**
 * Avvia lo scanner QuaggaJS.
 */
function startScanner() {
    if (isScanning) return; // Non riavviare se già in scansione

    scannerView.classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); // Blocca lo scroll del body
    isScanning = true;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: "environment", // Usa la fotocamera posteriore
                aspectRatio: { min: 1, max: 2 }
            },
        },
        decoder: {
            readers: ["ean_reader"], // Supporto EAN (EAN-13, UPC, EAN-8)
            debug: {
                showCanvas: true,
                showPatches: true,
                showFoundPatches: true,
                showSkeleton: true,
                showLabels: true,
                showPatchLabels: true,
                showRemainingPatchLabels: true,
                boxFromPatches: {
                    showTransformed: true,
                    showTransformedBox: true,
                    showEnv: true
                },
                showLine: true,
                showPoint: true
            }
        },
        locate: true, // Prova a localizzare il codice a barre
    }, function (err) {
        if (err) {
            console.error(err);
            // alert('Impossibile avviare la fotocamera. Assicurati di aver dato i permessi.');
            showConfirmation('Errore Fotocamera', 'Impossibile avviare la fotocamera. Assicurati di aver dato i permessi.');
            stopScanner(); // Ferma lo scanner in caso di errore
            return;
        }
        console.log("Inizializzazione Quagga completata. Inizio scansione.");
        Quagga.start();
        // Aggiungi la linea di scansione dinamica
        const scanline = document.createElement('div');
        scanline.id = 'scanline';
        scanline.style.cssText = 'position: absolute; top: 10%; width: 100%; height: 2px; background: red; box-shadow: 0 0 10px red; animation: scanline 3s infinite alternate;';
        document.querySelector('#interactive').appendChild(scanline);
    });

    Quagga.onDetected(function (result) {
        if (result.codeResult && result.codeResult.code) {
            const barcode = result.codeResult.code;
            console.log("Barcode rilevato:", barcode);
            stopScanner();
            checkProductInDb(barcode);
        }
    });

    Quagga.onProcessed(function (result) {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.width), parseInt(drawingCanvas.height));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, '#00F', 1);
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, '#0F0', 2);
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, '#F00', 3);
            }
        }
    });
}

/**
 * Ferma lo scanner QuaggaJS.
 */
function stopScanner() {
    if (!isScanning) return;
    Quagga.stop();
    scannerView.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    isScanning = false;
    const scanline = document.getElementById('scanline');
    if (scanline) scanline.remove(); // Rimuovi la linea di scansione
}


// --- 4. LOGICA INDEXEDDB ---

/**
 * Inizializza IndexedDB.
 */
function initDb() {
    const request = indexedDB.open('FoodInventoryDB', 1);

    request.onerror = (event) => {
        console.error('Errore apertura DB:', event);
    };

    request.onsuccess = (event) => {
        console.log('DB aperto con successo');
        db = event.target.result;
        // Una volta aperto il DB, carichiamo l'inventario e gli alert
        renderInventory();
        checkAlerts();
        // Mostra la vista inventario di default
        showView('inventory');
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;

        // Anagrafica Prodotti (barcode univoco, con immagine opzionale)
        if (!db.objectStoreNames.contains('anagraficaProdotti')) {
            const productStore = db.createObjectStore('anagraficaProdotti', { keyPath: 'barcode' });
            productStore.createIndex('name', 'name', { unique: false });
            productStore.createIndex('brand', 'brand', { unique: false });
            // L'immagine sarà salvata come Blob direttamente nell'oggetto
        }

        // Inventario (ogni istanza ha un ID univoco, e un riferimento al barcode)
        if (!db.objectStoreNames.contains('inventario')) {
            const inventoryStore = db.createObjectStore('inventario', { keyPath: 'id', autoIncrement: true });
            inventoryStore.createIndex('barcode_prodotto', 'barcode_prodotto', { unique: false });
            inventoryStore.createIndex('dataScadenza', 'dataScadenza', { unique: false });
            inventoryStore.createIndex('stato', 'stato', { unique: false }); // es. 'in-frigo', 'consumato'
        }

        console.log('DB upgrade completato: anagraficaProdotti e inventario creati.');
    };
}

/**
 * Controlla se un prodotto esiste nel DB Anagrafica.
 * Se esiste, apre il modal per aggiungere un'istanza.
 * Se non esiste, apre il modal per aggiungere un nuovo prodotto all'anagrafica.
 * @param {string} barcode - Il codice a barre rilevato.
 */
function checkProductInDb(barcode) {
    if (!db) return;

    const transaction = db.transaction(['anagraficaProdotti'], 'readonly');
    const store = transaction.objectStore('anagraficaProdotti');
    const request = store.get(barcode);

    request.onsuccess = (event) => {
        const product = event.target.result;
        if (product) {
            // Prodotto già in anagrafica, chiedi data scadenza e aggiungi istanza
            instanceNameSpan.textContent = product.name + (product.brand ? ` (${product.brand})` : '');
            instanceBarcodeSpan.textContent = product.barcode;
            addInstanceModal.classList.remove('hidden');
        } else {
            // Prodotto non in anagrafica, chiedi dettagli
            productBarcodeInput.value = barcode;
            addProductModal.classList.remove('hidden');
        }
    };

    request.onerror = (event) => {
        console.error('Errore durante la ricerca del prodotto:', event);
        showConfirmation('Errore Database', 'Errore nella ricerca del prodotto nel database.');
    };
}

/**
 * Salva un nuovo prodotto nell'anagrafica (con immagine opzionale).
 * @param {string} barcode
 * @param {string} name
 * @param {string} brand
 * @param {Blob | null} imageBlob
 * @returns {Promise<void>}
 */
async function saveNewProduct(barcode, name, brand, imageBlob) {
    if (!db) return;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['anagraficaProdotti'], 'readwrite');
        const store = transaction.objectStore('anagraficaProdotti');

        const productData = {
            barcode: barcode,
            name: name,
            brand: brand,
            image: imageBlob || null // Salva il Blob dell'immagine
        };

        const request = store.add(productData);

        request.onsuccess = () => {
            console.log('Prodotto aggiunto all\'anagrafica:', productData);
            resolve();
        };

        request.onerror = (event) => {
            console.error('Errore aggiunta prodotto all\'anagrafica:', event);
            reject(event);
        };
    });
}

/**
 * Salva una nuova istanza di un prodotto nell'inventario.
 * @param {string} barcode
 * @param {string} expiryDate
 * @returns {Promise<void>}
 */
function saveNewInstance(barcode, expiryDate) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database non disponibile');
            return;
        }

        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');

        const instanceData = {
            barcode_prodotto: barcode,
            dataScadenza: expiryDate,
            dataCarico: new Date().toISOString().split('T')[0], // Data odierna YYYY-MM-DD
            stato: 'in-frigo'
        };

        const request = store.add(instanceData);

        request.onsuccess = () => {
            console.log('Istanza prodotto caricata:', instanceData);
            resolve();
        };

        request.onerror = (event) => {
            console.error('Errore caricamento istanza:', event);
            reject(event);
        };
    });
}

/**
 * Rimuove un'istanza dall'inventario (Scarico)
 * @param {number} id - La chiave primaria dell'item nell'inventario
 * @returns {Promise<void>}
 */
function deleteInstance(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database non disponibile');
            return;
        }

        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Istanza con ID ${id} rimossa.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Errore rimozione istanza ID ${id}:`, event);
            reject(event);
        };
    });
}

/**
 * Cerca prodotti nell'anagrafica per nome o brand
 * @param {string} query - Il termine di ricerca
 */
async function searchProducts(query) {
    if (!db) return;
    if (!query) {
        searchResultsList.innerHTML = '<p class="text-gray-400 italic">Inizia a digitare per cercare nell\'anagrafica...</p>';
        return;
    }

    const lowerCaseQuery = query.toLowerCase();
    searchResultsList.innerHTML = ''; // Pulisci i risultati
    let count = 0;

    const transaction = db.transaction(['anagraficaProdotti'], 'readonly');
    const store = transaction.objectStore('anagraficaProdotti');
    const request = store.openCursor();

    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const product = cursor.value;
            const nameMatch = product.name && product.name.toLowerCase().includes(lowerCaseQuery);
            const brandMatch = product.brand && product.brand.toLowerCase().includes(lowerCaseQuery);

            if (nameMatch || brandMatch) {
                count++;
                const card = createSearchResultCard(product);
                searchResultsList.appendChild(card);
            }
            cursor.continue();
        } else {
            // Cursore finito
            if (count === 0) {
                searchResultsList.innerHTML = '<p class="text-gray-400 italic">Nessun prodotto trovato.</p>';
            }
        }
    };

    request.onerror = (event) => {
        console.error('Errore ricerca prodotti:', event);
        searchResultsList.innerHTML = '<p class="text-red-400">Errore durante la ricerca.</p>';
    };
}


/**
 * Recupera un prodotto dall'anagrafica dato il barcode.
 * @param {string} barcode
 * @returns {Promise<object | undefined>}
 */
function getProductByBarcode(barcode) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database non disponibile');
            return;
        }
        const transaction = db.transaction(['anagraficaProdotti'], 'readonly');
        const store = transaction.objectStore('anagraficaProdotti');
        const request = store.get(barcode);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Recupera tutte le istanze di un prodotto dall'inventario dato il barcode.
 * @param {string} barcode
 * @returns {Promise<Array<object>>}
 */
function getInstancesByProductBarcode(barcode) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database non disponibile');
            return;
        }
        const transaction = db.transaction(['inventario'], 'readonly');
        const store = transaction.objectStore('inventario');
        const index = store.index('barcode_prodotto');
        const request = index.getAll(barcode);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}


// --- 5. LOGICA DI RENDERING E UI ---

/**
 * Gestisce la visualizzazione delle schermate principali (Viste)
 * @param {'inventory' | 'search'} viewName - Il nome della vista da mostrare
 */
function showView(viewName) {
    // Nascondi tutte le viste principali
    inventoryDisplay.classList.add('hidden');
    searchView.classList.add('hidden');

    // Disattiva tutti i pulsanti della barra
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-green-500');
        btn.classList.add('text-gray-400');
    });

    // Attiva la vista e il pulsante richiesti
    if (viewName === 'inventory') {
        inventoryDisplay.classList.remove('hidden');
        navInventoryBtn.classList.add('text-green-500');
        navInventoryBtn.classList.remove('text-gray-400');
        renderInventory(); // Aggiorna l'inventario quando si torna alla vista
        checkAlerts(); // Aggiorna gli alert
    } else if (viewName === 'search') {
        searchView.classList.remove('hidden');
        navSearchBtn.classList.add('text-green-500');
        navSearchBtn.classList.remove('text-gray-400');
        searchInput.focus(); // Metti il focus sull'input di ricerca
    }
}

/**
 * Mostra il modale per aggiungere un nuovo prodotto (anagrafica)
 * @param {string} barcode - Il codice a barre precompilato.
 */
function showAddProductModal(barcode) {
    productBarcodeInput.value = barcode;
    addProductModal.classList.remove('hidden');
}


/**
 * Renderizza l'inventario completo e gli alert.
 */
async function renderInventory() {
    if (!db) return;

    inventoryList.innerHTML = '';
    alertsListWrapper.innerHTML = '';
    let inventoryCount = 0;
    let alertCount = 0;

    const transaction = db.transaction(['inventario', 'anagraficaProdotti'], 'readonly');
    const inventoryStore = transaction.objectStore('inventario');
    
    const request = inventoryStore.openCursor();

    request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
            inventoryCount++;
            const item = cursor.value;
            const product = await getProductByBarcode(item.barcode_prodotto); // Recupera info prodotto

            const itemCard = createInventoryCard(item, product);
            inventoryList.appendChild(itemCard);

            const daysUntilExpiry = getDaysUntilExpiry(item.dataScadenza);
            if (daysUntilExpiry <= 7) { // 7 giorni o meno alla scadenza
                alertCount++;
                const alertCard = createAlertCard(item, product, daysUntilExpiry);
                alertsListWrapper.appendChild(alertCard);
            }
            cursor.continue();
        } else {
            // Fine cursor
            emptyInventoryMsg.classList.toggle('hidden', inventoryCount > 0);
            if (alertCount === 0) {
                alertsListWrapper.innerHTML = '<p class="text-sm text-gray-400 italic">Nessun prodotto in scadenza imminente.</p>';
            }
        }
    };

    request.onerror = (event) => {
        console.error('Errore rendering inventario:', event);
        inventoryList.innerHTML = '<p class="text-red-400">Errore nel caricamento inventario.</p>';
        alertsListWrapper.innerHTML = '<p class="text-red-400">Errore nel caricamento alert.</p>';
    };
}

/**
 * Crea l'HTML per una card dell'inventario.
 * @param {object} item - L'item dall'store 'inventario'.
 * @param {object} product - L'item dall'store 'anagraficaProdotti'.
 * @returns {HTMLElement}
 */
function createInventoryCard(item, product) {
    const card = document.createElement('div');
    card.className = 'bg-gray-700 p-4 rounded-lg shadow-md flex justify-between items-center';
    card.dataset.id = item.id; // ID per la rimozione
    card.dataset.barcode = item.barcode_prodotto; // Barcode per i dettagli

    const daysUntilExpiry = getDaysUntilExpiry(item.dataScadenza);
    let expiryColorClass = 'text-green-400';
    if (daysUntilExpiry <= 0) {
        expiryColorClass = 'text-red-400';
    } else if (daysUntilExpiry <= 7) {
        expiryColorClass = 'text-yellow-400';
    }

    // Costruisci l'URL dell'immagine se presente
    const imageUrl = product && product.image ? URL.createObjectURL(product.image) : 'images/placeholder.png';

    card.innerHTML = `
        <div class="flex items-center space-x-3 flex-grow cursor-pointer" id="product-card-info-${item.id}">
            <img src="${imageUrl}" alt="${product?.name || 'Prodotto Sconosciuto'}" class="w-12 h-12 object-cover rounded-md flex-shrink-0 border border-gray-600">
            <div>
                <h3 class="text-lg font-bold text-gray-100">${product?.name || 'Prodotto Sconosciuto'}</h3>
                <p class="text-sm text-gray-400">${product?.brand || 'N/D'}</p>
                <p class="text-xs ${expiryColorClass}">Scade: ${formatDate(item.dataScadenza)} (${daysUntilExpiry} giorni)</p>
            </div>
        </div>
        <button class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-full text-sm flex items-center justify-center space-x-1">
            <i class="fas fa-trash-alt text-xs"></i>
            <span>Scarica</span>
        </button>
    `;

    // Event listener per aprire il modal dettagli al click sulla card
    card.querySelector(`#product-card-info-${item.id}`).addEventListener('click', () => {
        showProductDetails(item.barcode_prodotto);
    });

    // Event listener per il pulsante "Scarica" (ora con modal personalizzato)
    card.querySelector('.delete-btn').addEventListener('click', async () => {
        const confirmed = await showConfirmation(
            'Conferma Scarico', 
            `Sei sicuro di voler scaricare "${product?.name || 'questo prodotto'}"?`
        );
        if (confirmed) {
            await deleteInstance(item.id);
            renderInventory(); // Aggiorna la lista
            checkAlerts();    // Aggiorna gli alert
        }
    });

    // Pulizia URL oggetto
    card.addEventListener('DOMNodeRemoved', () => {
        if (product && product.image) URL.revokeObjectURL(imageUrl);
    });

    return card;
}

/**
 * Crea l'HTML per una card di alert scadenza.
 * @param {object} item - L'item dall'store 'inventario'.
 * @param {object} product - L'item dall'store 'anagraficaProdotti'.
 * @param {number} daysUntilExpiry - Giorni rimanenti alla scadenza.
 * @returns {HTMLElement}
 */
function createAlertCard(item, product, daysUntilExpiry) {
    const card = document.createElement('div');
    let bgColorClass = 'bg-yellow-700';
    if (daysUntilExpiry <= 0) {
        bgColorClass = 'bg-red-700';
    }

    // Costruisci l'URL dell'immagine se presente
    const imageUrl = product && product.image ? URL.createObjectURL(product.image) : 'images/placeholder.png';


    card.className = `${bgColorClass} p-3 rounded-lg shadow-md flex items-center space-x-3 text-white`;
    card.dataset.id = item.id;
    card.dataset.barcode = item.barcode_prodotto;

    card.innerHTML = `
        <img src="${imageUrl}" alt="${product?.name || 'Prodotto Sconosciuto'}" class="w-10 h-10 object-cover rounded-md flex-shrink-0 border border-gray-600">
        <div class="flex-grow cursor-pointer" id="alert-card-info-${item.id}">
            <p class="font-semibold">${product?.name || 'Prodotto Sconosciuto'}</p>
            <p class="text-sm">Scade: ${formatDate(item.dataScadenza)}</p>
            <p class="text-xs">${daysUntilExpiry <= 0 ? 'SCADUTO!' : `(${daysUntilExpiry} giorni)`}</p>
        </div>
        <button class="delete-btn bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full text-xs">
            <i class="fas fa-check"></i>
            <span>Fatto</span>
        </button>
    `;
    
    // Event listener per aprire il modal dettagli al click sulla card
    card.querySelector(`#alert-card-info-${item.id}`).addEventListener('click', () => {
        showProductDetails(item.barcode_prodotto);
    });

    // Event listener per il pulsante "Fatto" (scarica)
    card.querySelector('.delete-btn').addEventListener('click', async () => {
        const confirmed = await showConfirmation(
            'Conferma Scarico', 
            `Hai consumato "${product?.name || 'questo prodotto'}"? Verrà scaricato.`
        );
        if (confirmed) {
            await deleteInstance(item.id);
            renderInventory(); // Aggiorna la lista
            checkAlerts();    // Aggiorna gli alert
        }
    });

    // Pulizia URL oggetto
    card.addEventListener('DOMNodeRemoved', () => {
        if (product && product.image) URL.revokeObjectURL(imageUrl);
    });

    return card;
}

/**
* Crea l'HTML per una card dei risultati di ricerca.
* @param {object} product - L'item dall'store 'anagraficaProdotti'.
* @returns {HTMLElement}
*/
function createSearchResultCard(product) {
    const card = document.createElement('div');
    card.className = 'bg-gray-700 p-4 rounded-lg shadow-md flex items-center space-x-3 cursor-pointer hover:bg-gray-600 transition-colors';
    card.dataset.barcode = product.barcode;

    const imageUrl = product.image ? URL.createObjectURL(product.image) : 'images/placeholder.png';

    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.name}" class="w-12 h-12 object-cover rounded-md flex-shrink-0 border border-gray-600">
        <div>
            <h3 class="text-lg font-bold text-gray-100">${product.name}</h3>
            <p class="text-sm text-gray-400">${product.brand || 'N/D'}</p>
            <p class="text-xs text-gray-500">${product.barcode}</p>
        </div>
    `;

    card.addEventListener('click', () => {
        showProductDetails(product.barcode);
    });
    
    // Pulizia URL oggetto
    card.addEventListener('DOMNodeRemoved', () => {
        if (product.image) URL.revokeObjectURL(imageUrl);
    });

    return card;
}


/**
 * Controlla e visualizza gli alert di scadenza.
 */
function checkAlerts() {
    // La logica è già integrata in renderInventory
    // Se volessimo un controllo separato, andrebbe qui.
    // Per ora, chiamare renderInventory() è sufficiente.
}

/**
 * Mostra il modal di dettaglio per un prodotto specifico.
 * @param {string} barcode
 */
async function showProductDetails(barcode) {
    if (!db) return;

    try {
        const product = await getProductByBarcode(barcode);
        if (!product) {
            console.error('Prodotto non trovato per barcode:', barcode);
            return;
        }

        const instances = await getInstancesByProductBarcode(barcode);

        detailProductName.textContent = product.name;
        detailProductBrand.textContent = product.brand || 'Nessun brand specificato';
        detailProductBarcode.textContent = `Barcode: ${product.barcode}`;

        // Carica l'immagine
        if (product.image) {
            const imageUrl = URL.createObjectURL(product.image);
            detailProductImage.src = imageUrl;
            // Non usiamo onload per revoke perché l'immagine resta visibile
        } else {
            detailProductImage.src = 'images/placeholder.png'; // Immagine di fallback
        }

        // Popola la lista delle istanze
        detailInstancesList.innerHTML = '';
        if (instances && instances.length > 0) {
            instances.sort((a, b) => new Date(a.dataScadenza) - new Date(b.dataScadenza)); // Ordina per scadenza

            instances.forEach(instance => {
                const daysUntilExpiry = getDaysUntilExpiry(instance.dataScadenza);
                let expiryText = daysUntilExpiry <= 0 ? 'SCADUTO!' : `Scade in ${daysUntilExpiry} giorni`;
                if (daysUntilExpiry === 1) expiryText = 'Scade domani!';
                if (daysUntilExpiry === 0) expiryText = 'Scade oggi!';
                
                let textColorClass = 'text-green-400';
                if (daysUntilExpiry <= 0) textColorClass = 'text-red-400';
                else if (daysUntilExpiry <= 7) textColorClass = 'text-yellow-400';


                const instanceDiv = document.createElement('div');
                instanceDiv.className = 'bg-gray-700 p-3 rounded-lg flex justify-between items-center';
                instanceDiv.innerHTML = `
                    <div>
                        <p class="font-medium ${textColorClass}">${expiryText}</p>
                        <p class="text-xs text-gray-400">Caricato: ${formatDate(instance.dataCarico)}</p>
                    </div>
                    <button class="delete-instance-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs" data-id="${instance.id}">
                        <i class="fas fa-trash-alt"></i> Scarica
                    </button>
                `;
                instanceDiv.querySelector('.delete-instance-btn').addEventListener('click', async (e) => {
                    const confirmed = await showConfirmation(
                        'Conferma Scarico', 
                        'Vuoi scaricare questa singola istanza del prodotto?'
                    );
                    if (confirmed) {
                        const instanceId = parseInt(e.currentTarget.dataset.id);
                        await deleteInstance(instanceId);
                        // Aggiorna solo il modal dei dettagli e la lista principale
                        showProductDetails(barcode); // Ricarica i dettagli specifici
                        renderInventory();
                        checkAlerts();
                    }
                });
                detailInstancesList.appendChild(instanceDiv);
            });
        } else {
            detailInstancesList.innerHTML = '<p class="text-sm text-gray-500 italic">Nessun articolo di questo tipo in inventario.</p>';
        }

        productDetailModal.classList.remove('hidden');

    } catch (error) {
        console.error('Errore nel caricamento dettagli prodotto:', error);
        showConfirmation('Errore', 'Impossibile caricare i dettagli del prodotto.');
    }
}


// --- 6. EVENT LISTENERS ---

// Avvio Scanner (ora sulla barra di navigazione)
navScanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', stopScanner);

// Navigazione Viste
navInventoryBtn.addEventListener('click', () => showView('inventory'));
navSearchBtn.addEventListener('click', () => showView('search'));

// Ricerca
searchInput.addEventListener('input', (e) => {
    searchProducts(e.target.value);
});

// Chiusura Modali
cancelAddProductBtn.addEventListener('click', hideModals);
cancelAddInstanceBtn.addEventListener('click', hideModals);
closeProductDetailModalBtn.addEventListener('click', () => {
    // Rilascia l'URL dell'oggetto immagine quando si chiude il modal
    if (detailProductImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(detailProductImage.src);
    }
    hideModals();
});

// Listener per il nuovo modal di conferma
confirmBtnCancel.addEventListener('click', () => {
    if (confirmResolve) {
        confirmModal.classList.add('hidden');
        confirmResolve(false); // Risolve la promise con 'false'
        confirmResolve = null;
    }
});

confirmBtnConfirm.addEventListener('click', () => {
    if (confirmResolve) {
        confirmModal.classList.add('hidden');
        confirmResolve(true); // Risolve la promise con 'true'
        confirmResolve = null;
    }
});


// Aggiunta Nuovo Prodotto (Anagrafica)
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const barcode = productBarcodeInput.value;
    const name = productNameInput.value;
    const brand = productBrandInput.value;
    const imageFile = productImageUpload.files[0];
    let imageBlob = null;

    if (imageFile) {
        try {
            imageBlob = await resizeImage(imageFile, 800, 800, 0.8); // Max 800px, qualità 80%
            console.log('Immagine ridimensionata. Dimensione:', imageBlob.size / 1024, 'KB');
        } catch (error) {
            console.error('Errore durante il ridimensionamento dell\'immagine:', error);
            showConfirmation('Errore Immagine', 'Errore nel caricamento dell\'immagine. Prova senza immagine.');
            imageBlob = null; // Procedi senza immagine se c'è un errore
        }
    }

    try {
        await saveNewProduct(barcode, name, brand, imageBlob);
        // Dopo aver salvato il prodotto in anagrafica, apri il modal per aggiungere l'istanza
        hideModals(); // Nascondi il modal "aggiungi prodotto"
        // Prepara il modal di istanza con i dati appena inseriti
        instanceNameSpan.textContent = name + (brand ? ` (${brand})` : '');
        instanceBarcodeSpan.textContent = barcode;
        addInstanceModal.classList.remove('hidden'); // Mostra il modal "aggiungi istanza"
    } catch (err) {
        console.error('Errore aggiunta prodotto:', err);
        showConfirmation('Errore Database', 'Errore nell\'aggiunta del prodotto. Potrebbe esserci già un prodotto con questo barcode.');
    }
});

// Aggiunta Nuova Istanza Prodotto
addInstanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const barcode = instanceBarcodeSpan.textContent;
    const expiry = instanceExpiryInput.value; // Formato YYYY-MM-DD

    if (barcode && expiry) {
        try {
            await saveNewInstance(barcode, expiry);
            hideModals();
            // Aggiorna la vista
            renderInventory();
            checkAlerts();
            // Torna alla vista inventario
            showView('inventory');
        } catch (err) {
            console.error('Errore nel caricamento istanza:', err);
            showConfirmation('Errore Database', 'Errore nel caricamento dell\'istanza del prodotto.');
        }
    } else {
        showConfirmation('Dati Mancanti', 'Per favore, inserisci la data di scadenza.');
    }
});

// Inizializza il DB all'avvio dell'app
initDb();