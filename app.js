// Elementi DOM
const stopScanBtn = document.getElementById('stop-scan-btn');
const scannerView = document.getElementById('scanner-view');
const scannerVideo = document.getElementById('scanner-video');

// Contenitori Liste
const inventoryList = document.getElementById('inventory-list');
const alertsListWrapper = document.getElementById('alerts-list-wrapper');
const emptyInventoryMsg = document.getElementById('empty-inventory-msg');

// Viste Principali (MODIFICATE in v11)
const alertsView = document.getElementById('alerts-view'); // Nuova vista default
const inventoryView = document.getElementById('inventory-view'); // Nuova vista inventario
const searchView = document.getElementById('search-view');

// Barra di Navigazione (MODIFICATA in v11)
const navAlertsBtn = document.getElementById('nav-alerts-btn');
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
const productImageUpload = document.getElementById('product-image-upload');
const cancelAddProductBtn = document.getElementById('cancel-add-product');

const addInstanceModal = document.getElementById('add-instance-modal');
const addInstanceForm = document.getElementById('add-instance-form');
const instanceNameSpan = document.getElementById('instance-name');
const instanceBarcodeSpan = document.getElementById('instance-barcode');
const instanceExpiryInput = document.getElementById('instance-expiry');
const instanceQuantityInput = document.getElementById('instance-quantity'); // AGGIUNTO
const cancelAddInstanceBtn = document.getElementById('cancel-add-instance');

// Modal Dettagli Prodotto
const productDetailModal = document.getElementById('product-detail-modal');
const closeProductDetailModalBtn = document.getElementById('close-product-detail-modal');
const detailProductName = document.getElementById('detail-product-name');
const detailProductImage = document.getElementById('detail-product-image');
const detailProductBrand = document.getElementById('detail-product-brand');
const detailProductBarcode = document.getElementById('detail-product-barcode');
const detailInstancesList = document.getElementById('detail-instances-list');

// Modal di Conferma (MODIFICATO)
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmBtnCancel = document.getElementById('confirm-btn-cancel');
const confirmBtnAction = document.getElementById('confirm-btn-action'); // MODIFICATO
let confirmResolve = null; 

// Modal Consuma Quantità (NUOVO)
const consumeQuantityModal = document.getElementById('consume-quantity-modal');
const consumeProductName = document.getElementById('consume-product-name');
const consumeCurrentQuantity = document.getElementById('consume-current-quantity');
const consumeBtnDecrease = document.getElementById('consume-btn-decrease');
const consumeBtnIncrease = document.getElementById('consume-btn-increase');
const consumeQuantityInput = document.getElementById('consume-quantity-input');
const consumeBtnCancel = document.getElementById('consume-btn-cancel');
const consumeBtnConfirm = document.getElementById('consume-btn-confirm');
let consumeResolve = null; 
let consumeMaxQuantity = 1;

// Canvas per ridimensionamento immagini
const imageCanvas = document.getElementById('temp-canvas'); 

// Service Worker Update
const updatePromptModal = document.getElementById('update-prompt-modal');
const updateButton = document.getElementById('update-button');
let deferredPrompt; 

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
    today.setHours(0, 0, 0, 0); 
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0); 
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Nasconde tutti i modali
 */
function hideModals() {
    addProductModal.classList.add('hidden');
    addInstanceModal.classList.add('hidden');
    productDetailModal.classList.add('hidden'); 
    confirmModal.classList.add('hidden'); 
    consumeQuantityModal.classList.add('hidden'); // AGGIUNTO
    
    addProductForm.reset();
    addInstanceForm.reset();
    productImageUpload.value = '';
}

/**
 * Mostra un modal di conferma personalizzato.
 * @param {string} title Titolo del modal.
 * @param {string} message Messaggio di conferma.
 * @param {string} [confirmText='Conferma'] Testo del pulsante di conferma.
 * @param {string} [confirmColor='bg-red-500'] Classe colore Tailwind per il pulsante.
 * @returns {Promise<boolean>} Risolve true se confermato, false se annullato.
 */
function showConfirmation(title, message, confirmText = 'Conferma', confirmColor = 'bg-red-500') {
    return new Promise((resolve) => {
        confirmResolve = resolve; 
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        confirmBtnAction.textContent = confirmText;
        // Reset colori
        confirmBtnAction.className = "text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"; // Rimuove vecchi colori
        // Aggiungi nuovi colori
        confirmBtnAction.classList.add(confirmColor, `hover:${confirmColor.replace('500', '600')}`);
        
        confirmModal.classList.remove('hidden');
    });
}

/**
 * Mostra un modal per consumare una quantità di un item.
 * @param {object} item L'item dell'inventario (con ID e quantita).
 * @param {object} product L'anagrafica prodotto (con nome).
 * @returns {Promise<number | null>} Risolve con la quantità da consumare, or null se annullato.
 */
function showConsumeQuantity(item, product) {
    return new Promise((resolve) => {
        consumeResolve = resolve;
        consumeMaxQuantity = item.quantita || 1; // Fallback
        
        consumeProductName.textContent = product ? product.name : 'Prodotto';
        consumeCurrentQuantity.textContent = item.quantita || 1;
        consumeQuantityInput.value = 1; // Resetta a 1

        consumeQuantityModal.classList.remove('hidden');
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
                const canvas = imageCanvas; 
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;

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
                ctx.drawImage(img, 0, 0, width, height);

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
            window.location.reload(); 
        }
    });
}

// --- 3. LOGICA DI SCANSIONE BARCODE (BarcodeDetector API) ---

let isScanning = false; 
let videoStream = null; 
let barcodeDetector = null; 
let detectionFrameId = null; 

/**
 * Avvia lo scanner (BarcodeDetector API).
 */
async function startScanner() {
    if (isScanning) return;

    if (!('BarcodeDetector' in window)) {
        await showConfirmation('Errore', 'Il tuo browser non supporta la scansione nativa dei codici a barre.');
        return;
    }

    try {
        barcodeDetector = new BarcodeDetector({
            formats: [
                'ean_13',
                'code_128',
                'code_39',
                'codabar',
                'upc_a',
                'upc_e'
            ]
        });

        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        isScanning = true;
        scannerView.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        scannerVideo.srcObject = videoStream;
        await scannerVideo.play();

        detectBarcode();

    } catch (err) {
        console.error('Errore avvio scanner:', err);
        await showConfirmation('Errore Fotocamera', `Impossibile avviare la fotocamera. Assicurati di aver dato i permessi. Dettagli: ${err.message}`);
        stopScanner();
    }
}

/**
 * Loop di rilevamento che si auto-esegue.
 */
async function detectBarcode() {
    if (!isScanning || !barcodeDetector || !scannerVideo) return;

    try {
        const barcodes = await barcodeDetector.detect(scannerVideo);

        if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue;
            console.log("Barcode rilevato:", barcode);
            stopScanner(); 
            checkProductInDb(barcode); 
        } else {
            detectionFrameId = requestAnimationFrame(detectBarcode);
        }
    } catch (err) {
        console.error('Errore durante il rilevamento:', err);
        if (isScanning) {
            detectionFrameId = requestAnimationFrame(detectBarcode);
        }
    }
}

/**
 * Ferma lo scanner (BarcodeDetector API).
 */
function stopScanner() {
    if (!isScanning) return;
    isScanning = false;

    if (detectionFrameId) {
        cancelAnimationFrame(detectionFrameId);
        detectionFrameId = null;
    }

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    scannerVideo.srcObject = null;
    scannerView.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    barcodeDetector = null; 
}


// --- 4. LOGICA INDEXEDDB ---

/**
 * Inizializza IndexedDB.
 */
function initDb() {
    // AGGIORNAMENTO VERSIONE DB
    const request = indexedDB.open('FoodInventoryDB', 2);

    request.onerror = (event) => {
        console.error('Errore apertura DB:', event);
    };

    request.onsuccess = async (event) => { // Aggiunto async
        console.log('DB aperto con successo');
        db = event.target.result;
        
        // AVVIA MIGRAZIONE DATI V2 (se necessaria)
        await migrateDataV2();

        showView('alerts');
        renderInventoryAndAlerts(); 
    };

    request.onupgradeneeded = (event) => {
        console.log('Esecuzione onupgradeneeded...');
        db = event.target.result;
        const tx = event.target.transaction;

        // Creazione iniziale (se il DB non esiste, oldVersion è 0)
        if (event.oldVersion < 1) {
            console.log('Creazione store v1');
            if (!db.objectStoreNames.contains('anagraficaProdotti')) {
                const productStore = db.createObjectStore('anagraficaProdotti', { keyPath: 'barcode' });
                productStore.createIndex('name', 'name', { unique: false });
                productStore.createIndex('brand', 'brand', { unique: false });
            }
            if (!db.objectStoreNames.contains('inventario')) {
                const inventoryStore = db.createObjectStore('inventario', { keyPath: 'id', autoIncrement: true });
                inventoryStore.createIndex('barcode_prodotto', 'barcode_prodotto', { unique: false });
                inventoryStore.createIndex('dataScadenza', 'dataScadenza', { unique: false });
                inventoryStore.createIndex('stato', 'stato', { unique: false });
            }
        }

        // Upgrade da v1 a v2
        if (event.oldVersion < 2) {
            console.log('Aggiornamento a v2: Aggiunta indice barcode_expiry');
            if (tx.objectStoreNames.contains('inventario')) {
                const inventoryStore = tx.objectStore('inventario');
                inventoryStore.createIndex('barcode_expiry', ['barcode_prodotto', 'dataScadenza'], { unique: false });
            }
        }
        
        console.log('DB upgrade completato.');
    };
}

/**
 * Migra i dati alla v2: raggruppa item duplicati e aggiunge 'quantita'.
 * Questa funzione viene chiamata DOPO onsuccess di initDb.
 */
async function migrateDataV2() {
    // Controlla se la migrazione è già stata eseguita
    if (localStorage.getItem('db_v2_migrated') === 'true' || !db) {
        return;
    }
    
    console.log('Avvio migrazione dati a v2 (raggruppamento)...');

    try {
        // 1. Leggi tutti gli item
        const readTx = db.transaction(['inventario'], 'readonly');
        const readStore = readTx.objectStore('inventario');
        
        // Usiamo una Promise per gestire la richiesta getAll
        const allItems = await new Promise((resolve, reject) => {
            const req = readStore.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
        
        const groupedItems = new Map();
        let needsMigration = false;

        for (const item of allItems) {
            // Se 'quantita' non esiste, l'item deve essere migrato
            if (item.quantita === undefined) {
                needsMigration = true;
                const key = `${item.barcode_prodotto}_${item.dataScadenza}`;
                
                if (!groupedItems.has(key)) {
                    // Questo è il primo item del gruppo, diventa il "master"
                    groupedItems.set(key, { 
                        ...item, 
                        quantita: 1, 
                        original_ids_to_delete: [] // Lista ID duplicati da cancellare
                    });
                } else {
                    // Trovato un duplicato
                    const masterItem = groupedItems.get(key);
                    masterItem.quantita++;
                    // Aggiungi l'ID di questo item alla lista da cancellare
                    masterItem.original_ids_to_delete.push(item.id);
                    
                    // Mantieni la data di carico più vecchia
                    if (new Date(item.dataCarico) < new Date(masterItem.dataCarico)) {
                        masterItem.dataCarico = item.dataCarico;
                    }
                }
            }
        }

        if (!needsMigration) {
            console.log('Migrazione v2 non necessaria, dati già conformi.');
            localStorage.setItem('db_v2_migrated', 'true');
            return;
        }

        console.log(`Migrazione v2: Trovati ${groupedItems.size} gruppi da ${allItems.length} item.`);

        // 2. Scrivi i dati migrati
        const writeTx = db.transaction(['inventario'], 'readwrite');
        const writeStore = writeTx.objectStore('inventario');

        for (const item of groupedItems.values()) {
            // Aggiorna l'item master (che ha il suo ID originale) con la nuova quantità
            await new Promise((resolve, reject) => {
                const req = writeStore.put(item);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
            
            // Cancella tutti i duplicati
            for (const idToDelete of item.original_ids_to_delete) {
                await new Promise((resolve, reject) => {
                    const req = writeStore.delete(idToDelete);
                    req.onsuccess = () => resolve();
                    req.onerror = (e) => reject(e.target.error);
                });
            }
        }
        
        // Attendi il completamento della transazione di scrittura
        await new Promise((resolve, reject) => {
            writeTx.oncomplete = () => resolve();
            writeTx.onerror = (e) => reject(e.target.error);
        });

        localStorage.setItem('db_v2_migrated', 'true');
        console.log('Migrazione dati v2 completata con successo.');

    } catch (error) {
        console.error('Migrazione v2 fallita:', error);
        // Non impostare il flag, così ci riprova al prossimo avvio
    }
}


/**
 * Controlla se un prodotto esiste nel DB Anagrafica.
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
            instanceNameSpan.textContent = product.name + (product.brand ? ` (${product.brand})` : '');
            instanceBarcodeSpan.textContent = product.barcode;
            addInstanceModal.classList.remove('hidden');
        } else {
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
            image: imageBlob || null 
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
 * Salva una nuova istanza O aggiorna la quantità se esiste già. (MODIFICATO)
 * @param {string} barcode
 * @param {string} expiryDate
 * @param {number} quantity
 * @returns {Promise<void>}
 */
function saveNewInstance(barcode, expiryDate, quantity) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database non disponibile');
            return;
        }

        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        // Usiamo il nuovo indice per cercare item identici
        const index = store.index('barcode_expiry');
        const key = [barcode, expiryDate];
        const request = index.get(key);

        request.onsuccess = (event) => {
            const existingItem = event.target.result;
            let writeRequest;

            if (existingItem) {
                // Trovato: aggiorna la quantità
                existingItem.quantita = (existingItem.quantita || 0) + quantity; // Aggiunge la nuova quantità
                writeRequest = store.put(existingItem);
            } else {
                // Non trovato: crea nuovo item
                const instanceData = {
                    barcode_prodotto: barcode,
                    dataScadenza: expiryDate,
                    dataCarico: new Date().toISOString().split('T')[0], 
                    stato: 'in-frigo',
                    quantita: quantity // Nuovo campo
                };
                writeRequest = store.add(instanceData);
            }
            
            writeRequest.onsuccess = () => {
                console.log(`Istanza prodotto ${existingItem ? 'aggiornata' : 'caricata'}:`, barcode, 'Qta:', quantity);
                resolve();
            };
            writeRequest.onerror = (e) => {
                console.error('Errore scrittura istanza:', e);
                reject(e);
            };
        };

        request.onerror = (event) => {
            console.error('Errore ricerca istanza esistente:', event);
            reject(event);
        };
    });
}


/**
 * Riduce la quantità di un'istanza o la rimuove se arriva a zero. (NUOVA FUNZIONE)
 * @param {number} id - La chiave primaria dell'item
 * @param {number} quantityToConsume - Quanti item consumare
 * @returns {Promise<void>}
 */
function consumeInstance(id, quantityToConsume) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database non disponibile');

        const transaction = db.transaction(['inventario'], 'readwrite');
        const store = transaction.objectStore('inventario');
        const request = store.get(id); // Prendi l'item tramite la sua chiave primaria

        request.onsuccess = (event) => {
            const item = event.target.result;
            if (!item) {
                return reject(`Item con ID ${id} non trovato.`);
            }

            // Fallback per sicurezza (dati pre-migrazione?)
            if (item.quantita === undefined) item.quantita = 1;

            if (item.quantita <= quantityToConsume) {
                // Consuma tutto o più di quanto disponibile, cancella la riga
                const deleteRequest = store.delete(id);
                deleteRequest.onsuccess = () => {
                    console.log(`Istanza con ID ${id} rimossa (consumo totale).`);
                    resolve();
                };
                deleteRequest.onerror = (e) => reject(e.target.error);
            } else {
                // Consuma parzialmente, aggiorna la quantità
                item.quantita -= quantityToConsume;
                const updateRequest = store.put(item);
                updateRequest.onsuccess = () => {
                    console.log(`Istanza con ID ${id} aggiornata, nuova qta: ${item.quantita}.`);
                    resolve();
                };
                updateRequest.onerror = (e) => reject(e.target.error);
            }
        };

        request.onerror = (event) => {
            console.error(`Errore recupero istanza ID ${id}:`, event);
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
    searchResultsList.innerHTML = ''; 
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
 * @param {'alerts' | 'inventory' | 'search'} viewName - Il nome della vista da mostrare
 */
function showView(viewName) {
    // Nascondi tutte le viste principali
    alertsView.classList.add('hidden');
    inventoryView.classList.add('hidden');
    searchView.classList.add('hidden');

    // Disattiva tutti i pulsanti della barra
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-green-500');
        btn.classList.add('text-gray-400');
    });

    // Attiva la vista e il pulsante richiesti
    if (viewName === 'alerts') {
        alertsView.classList.remove('hidden');
        navAlertsBtn.classList.add('text-green-500');
        navAlertsBtn.classList.remove('text-gray-400');
        renderInventoryAndAlerts(); // Aggiorna le liste
    } else if (viewName === 'inventory') {
        inventoryView.classList.remove('hidden');
        navInventoryBtn.classList.add('text-green-500');
        navInventoryBtn.classList.remove('text-gray-400');
        renderInventoryAndAlerts(); // Aggiorna le liste
    } else if (viewName === 'search') {
        searchView.classList.remove('hidden');
        navSearchBtn.classList.add('text-green-500');
        navSearchBtn.classList.remove('text-gray-400');
        searchInput.focus(); 
    }
}


/**
 * Renderizza l'inventario completo e gli alert.
 * (Funzione unificata v10)
 */
async function renderInventoryAndAlerts() {
    if (!db) return;

    // v10: Carica l'anagrafica in una Mappa per efficienza
    const productMap = new Map();
    try {
        const productTx = db.transaction(['anagraficaProdotti'], 'readonly');
        const productStore = productTx.objectStore('anagraficaProdotti');
        const productRequest = productStore.openCursor();
        
        await new Promise((resolve, reject) => {
            productRequest.onsuccess = event => {
                const cursor = event.target.result;
                if (cursor) {
                    productMap.set(cursor.value.barcode, cursor.value);
                    cursor.continue();
                } else {
                    resolve(); 
                }
            };
            productRequest.onerror = event => reject(event.target.error);
        });

    } catch (e) {
        console.error("Errore nel pre-caricamento anagrafica:", e);
        inventoryList.innerHTML = '<p class="text-red-400">Errore fatale nel caricamento anagrafica.</p>';
        return;
    }

    // Ora scorri l'inventario
    inventoryList.innerHTML = '';
    alertsListWrapper.innerHTML = '';
    let inventoryCount = 0;
    let alertCount = 0;

    const inventoryTx = db.transaction(['inventario'], 'readonly');
    const inventoryStore = inventoryTx.objectStore('inventario');
    const inventoryRequest = inventoryStore.openCursor();

    inventoryRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            inventoryCount++;
            const item = cursor.value;
            const product = productMap.get(item.barcode_prodotto); 

            // 1. Popola l'inventario principale
            const itemCard = createInventoryCard(item, product);
            inventoryList.appendChild(itemCard);

            // 2. Popola gli alert se necessario
            const daysUntilExpiry = getDaysUntilExpiry(item.dataScadenza);
            if (daysUntilExpiry <= 7) { 
                alertCount++;
                const alertCard = createAlertCard(item, product, daysUntilExpiry);
                alertsListWrapper.appendChild(alertCard);
            }
            cursor.continue();
        } else {
            // Fine cursore
            emptyInventoryMsg.classList.toggle('hidden', inventoryCount > 0);
            if (alertCount === 0) {
                alertsListWrapper.innerHTML = '<p class="text-sm text-gray-400 italic">Nessun prodotto in scadenza imminente.</p>';
            }
        }
    };

    inventoryRequest.onerror = (event) => {
        console.error('Errore rendering inventario:', event);
        inventoryList.innerHTML = '<p class="text-red-400">Errore nel caricamento inventario.</p>';
    };
}

/**
 * Crea l'HTML per una card dell'inventario. (MODIFICATO)
 * @param {object} item - L'item dall'store 'inventario'.
 * @param {object | undefined} product - L'item dall'store 'anagraficaProdotti'.
 * @returns {HTMLElement}
 */
function createInventoryCard(item, product) {
    const card = document.createElement('div');
    card.className = 'bg-gray-700 p-4 rounded-lg shadow-md flex justify-between items-center';
    card.dataset.id = item.id; 
    card.dataset.barcode = item.barcode_prodotto; 

    const daysUntilExpiry = getDaysUntilExpiry(item.dataScadenza);
    let expiryColorClass = 'text-green-400';
    if (daysUntilExpiry <= 0) {
        expiryColorClass = 'text-red-400';
    } else if (daysUntilExpiry <= 7) {
        expiryColorClass = 'text-yellow-400';
    }

    const imageUrl = product && product.image ? URL.createObjectURL(product.image) : 'images/placeholder.png';
    const productName = product ? product.name : 'Prodotto Sconosciuto';
    const productBrand = product ? product.brand : 'N/D';
    const quantita = item.quantita || 1; // Fallback per 'quantita'

    card.innerHTML = `
        <div class="flex items-center space-x-3 flex-grow cursor-pointer" id="product-card-info-${item.id}">
            <img src="${imageUrl}" alt="${productName}" class="w-12 h-12 object-cover rounded-md flex-shrink-0 border border-gray-600">
            <div>
                <div class="flex items-center space-x-2">
                    <h3 class="text-lg font-bold text-gray-100">${productName}</h3>
                    <!-- BADGE QUANTITÀ -->
                    <span class="text-xs font-bold bg-gray-600 text-green-400 px-2 py-0.5 rounded-full">x${quantita}</span>
                </div>
                <p class="text-sm text-gray-400">${productBrand}</p>
                <p class="text-xs ${expiryColorClass}">Scade: ${formatDate(item.dataScadenza)} (${daysUntilExpiry} giorni)</p>
            </div>
        </div>
        <!-- PULSANTE CONSUMA -->
        <button class="consume-btn bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-full text-sm flex items-center justify-center space-x-1">
            <i class="fas fa-check text-xs"></i>
            <span>Consuma</span>
        </button>
    `;

    card.querySelector(`#product-card-info-${item.id}`).addEventListener('click', () => {
        showProductDetails(item.barcode_prodotto);
    });

    // LOGICA PULSANTE CONSUMA
    card.querySelector('.consume-btn').addEventListener('click', async () => {
        const itemQuantity = item.quantita || 1;
        const productNameSafe = product ? product.name : 'Prodotto';

        if (itemQuantity > 1) {
            // Mostra modal quantità
            const quantityToConsume = await showConsumeQuantity(item, product);
            if (quantityToConsume && quantityToConsume > 0) {
                await consumeInstance(item.id, quantityToConsume);
                renderInventoryAndAlerts();
            }
        } else {
            // Quantità è 1, usa vecchia conferma
            const confirmed = await showConfirmation(
                'Conferma Consumo', 
                `Sei sicuro di voler consumare l'ultimo "${productNameSafe}"?`,
                'Consuma', // Testo pulsante
                'bg-green-500' // Colore pulsante
            );
            if (confirmed) {
                await consumeInstance(item.id, 1); // Consuma l'ultimo
                renderInventoryAndAlerts(); 
            }
        }
    });

    card.addEventListener('DOMNodeRemoved', () => {
        if (product && product.image) URL.revokeObjectURL(imageUrl);
    });

    return card;
}

/**
 * Crea l'HTML per una card di alert scadenza. (MODIFICATO)
 * @param {object} item - L'item dall'store 'inventario'.
 * @param {object | undefined} product - L'item dall'store 'anagraficaProdotti'.
 * @param {number} daysUntilExpiry - Giorni rimanenti alla scadenza.
 * @returns {HTMLElement}
 */
function createAlertCard(item, product, daysUntilExpiry) {
    const card = document.createElement('div');
    let bgColorClass = 'bg-yellow-700';
    if (daysUntilExpiry <= 0) {
        bgColorClass = 'bg-red-700';
    }

    const imageUrl = product && product.image ? URL.createObjectURL(product.image) : 'images/placeholder.png';
    const productName = product ? product.name : 'Prodotto Sconosciuto';
    const quantita = item.quantita || 1; // Fallback


    card.className = `${bgColorClass} p-3 rounded-lg shadow-md flex items-center space-x-3 text-white`;
    card.dataset.id = item.id;
    card.dataset.barcode = item.barcode_prodotto;

    card.innerHTML = `
        <img src="${imageUrl}" alt="${productName}" class="w-10 h-10 object-cover rounded-md flex-shrink-0 border border-gray-600">
        <div class="flex-grow cursor-pointer" id="alert-card-info-${item.id}">
            <div class="flex items-center space-x-2">
                <p class="font-semibold">${productName}</p>
                <!-- BADGE QUANTITÀ -->
                <span class="text-xs font-bold bg-gray-800 bg-opacity-30 px-2 py-0.5 rounded-full">x${quantita}</span>
            </div>
            <p class="text-sm">Scade: ${formatDate(item.dataScadenza)}</p>
            <p class="text-xs">${daysUntilExpiry <= 0 ? 'SCADUTO!' : `(${daysUntilExpiry} giorni)`}</p>
        </div>
        <button class="consume-btn bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full text-xs">
            <i class="fas fa-check"></i>
            <span>Fatto</span>
        </button>
    `;
    
    card.querySelector(`#alert-card-info-${item.id}`).addEventListener('click', () => {
        showProductDetails(item.barcode_prodotto);
    });

    // LOGICA PULSANTE CONSUMA
    card.querySelector('.consume-btn').addEventListener('click', async () => {
        const itemQuantity = item.quantita || 1;
        const productNameSafe = product ? product.name : 'Prodotto';

        if (itemQuantity > 1) {
            const quantityToConsume = await showConsumeQuantity(item, product);
            if (quantityToConsume && quantityToConsume > 0) {
                await consumeInstance(item.id, quantityToConsume);
                renderInventoryAndAlerts();
            }
        } else {
            const confirmed = await showConfirmation(
                'Conferma Consumo', 
                `Hai consumato l'ultimo "${productNameSafe}"? Verrà scaricato.`,
                'Consuma',
                'bg-green-500'
            );
            if (confirmed) {
                await consumeInstance(item.id, 1);
                renderInventoryAndAlerts();
            }
        }
    });

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
    
    card.addEventListener('DOMNodeRemoved', () => {
        if (product.image) URL.revokeObjectURL(product.image);
    });

    return card;
}


/**
 * Mostra il modal di dettaglio per un prodotto specifico. (MODIFICATO)
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

        if (product.image) {
            const imageUrl = URL.createObjectURL(product.image);
            detailProductImage.src = imageUrl;
        } else {
            detailProductImage.src = 'images/placeholder.png'; 
        }

        detailInstancesList.innerHTML = '';
        if (instances && instances.length > 0) {
            instances.sort((a, b) => new Date(a.dataScadenza) - new Date(b.dataScadenza)); 

            instances.forEach(instance => {
                const daysUntilExpiry = getDaysUntilExpiry(instance.dataScadenza);
                let expiryText = daysUntilExpiry <= 0 ? 'SCADUTO!' : `Scade in ${daysUntilExpiry} giorni`;
                if (daysUntilExpiry === 1) expiryText = 'Scade domani!';
                if (daysUntilExpiry === 0) expiryText = 'Scade oggi!';
                
                let textColorClass = 'text-green-400';
                if (daysUntilExpiry <= 0) textColorClass = 'text-red-400';
                else if (daysUntilExpiry <= 7) textColorClass = 'text-yellow-400';

                const quantita = instance.quantita || 1; // Fallback

                const instanceDiv = document.createElement('div');
                instanceDiv.className = 'bg-gray-700 p-3 rounded-lg flex justify-between items-center';
                instanceDiv.innerHTML = `
                    <div class="flex-grow">
                        <div class="flex items-center space-x-2">
                            <p class="font-medium ${textColorClass}">${expiryText}</p>
                            <!-- BADGE QUANTITÀ -->
                            <span class="text-xs font-bold bg-gray-600 text-green-400 px-2 py-0.5 rounded-full">x${quantita}</span>
                        </div>
                        <p class="text-xs text-gray-400">Caricato: ${formatDate(instance.dataCarico)}</p>
                    </div>
                    <!-- PULSANTE CONSUMA -->
                    <button class="consume-instance-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded-full text-xs" data-id="${instance.id}">
                        <i class="fas fa-check"></i> Consuma
                    </button>
                `;
                
                // LOGICA PULSANTE CONSUMA
                instanceDiv.querySelector('.consume-instance-btn').addEventListener('click', async (e) => {
                    const instanceId = parseInt(e.currentTarget.dataset.id);
                    // Troviamo l'istanza completa per ottenere la quantità
                    const fullInstance = instances.find(i => i.id === instanceId);
                    
                    if (fullInstance && fullInstance.quantita > 1) {
                         const quantityToConsume = await showConsumeQuantity(fullInstance, product);
                         if (quantityToConsume && quantityToConsume > 0) {
                             await consumeInstance(instanceId, quantityToConsume);
                             // Aggiorna questo modal e le liste principali
                             showProductDetails(barcode); 
                             renderInventoryAndAlerts();
                         }
                    } else {
                        // Quantità è 1
                        const confirmed = await showConfirmation(
                            'Conferma Consumo', 
                            'Vuoi consumare l\'ultima istanza di questo prodotto?',
                            'Consuma',
                            'bg-green-500'
                        );
                        if (confirmed) {
                            await consumeInstance(instanceId, 1);
                            showProductDetails(barcode); 
                            renderInventoryAndAlerts();
                        }
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

// Navigazione Viste (MODIFICATA v11)
navAlertsBtn.addEventListener('click', () => showView('alerts'));
navInventoryBtn.addEventListener('click', () => showView('inventory'));
navSearchBtn.addEventListener('click', () => showView('search'));
navScanBtn.addEventListener('click', startScanner);

// Scanner
stopScanBtn.addEventListener('click', stopScanner);

// Ricerca
searchInput.addEventListener('input', (e) => {
    searchProducts(e.target.value);
});

// Chiusura Modali
cancelAddProductBtn.addEventListener('click', hideModals);
cancelAddInstanceBtn.addEventListener('click', hideModals);
closeProductDetailModalBtn.addEventListener('click', () => {
    if (detailProductImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(detailProductImage.src);
    }
    hideModals();
});

// Modal di Conferma (MODIFICATO)
confirmBtnCancel.addEventListener('click', () => {
    if (confirmResolve) {
        confirmModal.classList.add('hidden');
        confirmResolve(false); 
        confirmResolve = null;
    }
});

confirmBtnAction.addEventListener('click', () => { // Modificato da confirmBtnConfirm
    if (confirmResolve) {
        confirmModal.classList.add('hidden');
        confirmResolve(true); 
        confirmResolve = null;
    }
});

// Modal Consuma Quantità (NUOVI)
consumeBtnCancel.addEventListener('click', () => {
    if (consumeResolve) {
        consumeQuantityModal.classList.add('hidden');
        consumeResolve(null); // Risolve null se annullato
        consumeResolve = null;
    }
});

consumeBtnConfirm.addEventListener('click', () => {
    if (consumeResolve) {
        consumeQuantityModal.classList.add('hidden');
        const quantity = parseInt(consumeQuantityInput.value, 10);
        consumeResolve(quantity); 
        consumeResolve = null;
    }
});

consumeBtnDecrease.addEventListener('click', () => {
    let currentVal = parseInt(consumeQuantityInput.value, 10);
    if (currentVal > 1) {
        consumeQuantityInput.value = currentVal - 1;
    }
});

consumeBtnIncrease.addEventListener('click', () => {
    let currentVal = parseInt(consumeQuantityInput.value, 10);
    if (currentVal < consumeMaxQuantity) {
        consumeQuantityInput.value = currentVal + 1;
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
            imageBlob = await resizeImage(imageFile, 800, 800, 0.8); 
            console.log('Immagine ridimensionata. Dimensione:', imageBlob.size / 1024, 'KB');
        } catch (error) {
            console.error('Errore durante il ridimensionamento dell\'immagine:', error);
            showConfirmation('Errore Immagine', 'Errore nel caricamento dell'immagine. Prova senza immagine.');
            imageBlob = null; 
        }
    }

    try {
        await saveNewProduct(barcode, name, brand, imageBlob);
        hideModals(); 
        instanceNameSpan.textContent = name + (brand ? ` (${brand})` : '');
        instanceBarcodeSpan.textContent = barcode;
        addInstanceModal.classList.remove('hidden'); 
    } catch (err) {
        console.error('Errore aggiunta prodotto:', err);
        showConfirmation('Errore Database', 'Errore nell\'aggiunta del prodotto. Potrebbe esserci già un prodotto con questo barcode.');
    }
});

// Aggiunta Nuova Istanza Prodotto (MODIFICATO)
addInstanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const barcode = instanceBarcodeSpan.textContent;
    const expiry = instanceExpiryInput.value; 
    const quantity = parseInt(instanceQuantityInput.value, 10) || 1; // Prendi la quantità

    if (barcode && expiry && quantity > 0) { // Controlla anche quantity
        try {
            // Modifica la chiamata: passa la quantità
            await saveNewInstance(barcode, expiry, quantity); 
            
            hideModals();
            showView('alerts'); 
            renderInventoryAndAlerts(); 
        } catch (err) {
            console.error('Errore nel caricamento istanza:', err);
            showConfirmation('Errore Database', 'Errore nel caricamento dell\'istanza del prodotto.');
        }
    } else {
        showConfirmation('Dati Mancanti', 'Per favore, inserisci data di scadenza e quantità valida.');
    }
});

// Inizializza il DB all'avvio dell'app
initDb();
