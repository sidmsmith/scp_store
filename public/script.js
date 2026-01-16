// public/script.js
const orgInput = document.getElementById('org');
const storeIdInput = document.getElementById('storeId');
const scanStoreIdBtn = document.getElementById('scanStoreIdBtn');
const barcodeScannerModal = document.getElementById('barcodeScannerModal');
const statusEl = document.getElementById('status');
const themeSelectorBtn = document.getElementById('themeSelectorBtn');
const themeModal = new bootstrap.Modal(document.getElementById('themeModal'));
const themeList = document.getElementById('themeList');

// URL Parameters for cross-app integration
const urlParams = new URLSearchParams(window.location.search);
const locationParam = urlParams.get('Location');
const organizationParam = urlParams.get('Organization');
const orgParam = urlParams.get('ORG'); // Also support ORG parameter
const businessUnitParam = urlParams.get('BusinessUnit');
const storeParam = urlParams.get('Store');
const consoleParam = urlParams.get('Console');

// Store URL parameters for use
const urlLocation = locationParam || null;
const urlOrg = organizationParam || orgParam || null; // Support both Organization and ORG
const urlBusinessUnit = businessUnitParam || null;
const urlStore = storeParam || null;
const urlConsole = consoleParam || null;

// Ensure ORG is blank on load (security) unless from URL
if (urlOrg) {
  orgInput.value = urlOrg.trim();
  // Hide auth section immediately if URL parameter provided (will auto-authenticate)
  const authSection = document.getElementById('authSection');
  if (authSection) {
    authSection.style.display = 'none';
  }
} else {
  orgInput.value = '';
}

let token = null;
// Legacy file variables - kept for compatibility but not used
let forecastFileData = null;
let forecastFileHeader = null;
let locationFileData = null;
let locationFileHeader = null;

// Store ID section elements
const storeIdSection = document.getElementById('storeIdSection');
const cardsSection = document.getElementById('cardsSection');
const logoContainer = document.getElementById('logoContainer');
const suggestedOrdersCard = document.getElementById('suggestedOrdersCard');
const opportunityBuysCard = document.getElementById('opportunityBuysCard');

// Suggested Orders section elements
const suggestedOrdersSection = document.getElementById('suggestedOrdersSection');
const ordersContainer = document.getElementById('ordersContainer');
const ordersLoading = document.getElementById('ordersLoading');
const ordersEmpty = document.getElementById('ordersEmpty');
const backToCardsBtn = document.getElementById('backToCardsBtn');

// Inventory Movement section elements
const inventoryMovementSection = document.getElementById('inventoryMovementSection');
const movementsContainer = document.getElementById('movementsContainer');
const movementsLoading = document.getElementById('movementsLoading');
const movementsEmpty = document.getElementById('movementsEmpty');
const backToOrdersBtn = document.getElementById('backToOrdersBtn');
const submitChangesBtn = document.getElementById('submitChangesBtn');
const releaseOrderBtn = document.getElementById('releaseOrderBtn');

// Console elements (keep for debugging)
const consoleSection = document.getElementById('consoleSection');
const consoleEl = document.getElementById('console');
const consoleToggleBtn = document.getElementById('consoleToggleBtn');
const consoleToggleContainer = document.getElementById('consoleToggleContainer');
const consoleCloseBtn = document.getElementById('consoleCloseBtn');

let storeId = null;

// THEME DEFINITIONS
const themes = {
  'dark': {
    name: 'Dark',
    rootClass: 'theme-dark'
  },
  'manhattan': {
    name: 'Manhattan',
    rootClass: 'theme-manhattan'
  },
  'light': {
    name: 'Light',
    rootClass: 'theme-light'
  }
};

// THEME FUNCTIONS
function applyTheme(themeKey) {
  const theme = themes[themeKey];
  if (!theme) return;

  const root = document.documentElement;
  
  // Remove all theme classes
  root.classList.remove('theme-dark', 'theme-manhattan', 'theme-light');
  
  // Add theme class
  if (theme.rootClass) {
    root.classList.add(theme.rootClass);
  }

  // Save to localStorage
  localStorage.setItem('selectedTheme', themeKey);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
  applyTheme(savedTheme);
}

function renderThemeList() {
  themeList.innerHTML = '';
  const currentTheme = localStorage.getItem('selectedTheme') || 'light';

  Object.entries(themes).forEach(([key, theme]) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `list-group-item list-group-item-action ${key === currentTheme ? 'active' : ''}`;
    item.textContent = theme.name;
    item.onclick = () => {
      applyTheme(key);
      themeModal.hide();
    };
    themeList.appendChild(item);
  });
}

// Theme selector button
if (themeSelectorBtn) {
  themeSelectorBtn.onclick = () => {
    renderThemeList();
    themeModal.show();
  };
}

// Load theme on page load
loadTheme();

function status(text, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `status text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
}

async function api(action, data = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch('/api/validate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...data })
  }).then(r => r.json());
}

// HA tracking function
async function trackEvent(eventName, metadata = {}) {
  try {
    await api('ha-track', {
      event_name: eventName,
      metadata: metadata
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
  }
}

// Auth function
async function authenticate() {
  const org = orgInput.value.trim();
  if (!org) {
    status('ORG required', 'error');
    return false;
  }

  // Removed: status('Authenticating...');
  const res = await api('auth', { org });
  if (!res.success) {
    status(res.error || 'Auth failed', 'error');
    await trackEvent('auth_failed', { org: org || 'unknown', error: res.error || 'Auth failed' });
    // On auth failure, hide sections, show auth section
    if (storeIdSection) {
      storeIdSection.style.display = 'none';
    }
    if (cardsSection) {
      cardsSection.style.display = 'none';
    }
    // Show logo on ORG prompt page (even on auth failure)
    if (logoContainer) {
      logoContainer.style.display = 'block';
    }
    if (consoleSection) {
      consoleSection.style.display = 'none';
    }
    if (consoleToggleContainer) {
      consoleToggleContainer.style.display = 'none';
    }
    const authSection = document.getElementById('authSection');
    if (authSection) {
      authSection.style.display = 'block';
    }
    // Update main title to "SCP Mobile" on auth screen
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) {
      mainTitle.textContent = 'SCP Mobile';
      mainTitle.style.display = 'block';
    }
    return false;
  }

  token = res.token;
  // Removed: status(`Authenticated as ${org}`, 'success');
  await trackEvent('auth_success', { org: org || 'unknown' });
  
  // Hide auth section on successful authentication
  const authSection = document.getElementById('authSection');
  if (authSection) {
    authSection.style.display = 'none';
  }
  
  // Show Store ID section after authentication
  if (storeIdSection) {
    storeIdSection.style.display = 'block';
    storeIdInput?.focus();
  }
  
  // Update main title to "SCP Mobile" on store entry screen
  const mainTitle = document.getElementById('mainTitle');
  if (mainTitle) {
    mainTitle.textContent = 'SCP Mobile';
    mainTitle.style.display = 'block';
  }
  
  // Show logo on Store prompt page
  if (logoContainer) {
    logoContainer.style.display = 'block';
  }
  
  // Show console toggle button after authentication (unless Console=N)
  if (consoleToggleContainer && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
    consoleToggleContainer.style.display = 'block';
  }
  return true;
}

orgInput?.addEventListener('keypress', async e => {
  if (e.key !== 'Enter') return;
  await authenticate();
});

// Store ID submit handler
async function submitStoreId() {
  const storeIdValue = storeIdInput?.value.trim();
  if (!storeIdValue) {
    status('Store ID required', 'error');
    return false;
  }
  
  // Removed: status('Validating store...', 'info');
  
  // Validate store by calling location search API
  try {
    const validatePayload = {
      org: orgInput?.value.trim() || '',
      storeId: storeIdValue
    };
    
    logToConsole(`\n=== Validating Store ===`, 'info');
    logToConsole(`Action: search-location`, 'info');
    logToConsole(`Endpoint: /itemlocation/api/itemlocation/location/search`, 'info');
    logToConsole(`Request Payload:`, 'info');
    logToConsole(JSON.stringify(validatePayload, null, 2), 'info');
    logToConsole(`Backend will send payload:`, 'info');
    const backendValidatePayload = {
      Query: `LocationId IN ('${storeIdValue}')`
    };
    logToConsole(JSON.stringify(backendValidatePayload, null, 2), 'info');
    
    const validateRes = await api('search-location', validatePayload);
    
    logToConsole(`\nValidation API Response:`, 'info');
    logToConsole(JSON.stringify(validateRes, null, 2), validateRes.success ? 'success' : 'error');
    logToConsole('=== End Validation API Call ===\n', 'info');
    
    if (!validateRes.success || !validateRes.locations || validateRes.locations.length === 0) {
      status('Invalid Store', 'error');
      logToConsole(`Invalid Store: ${validateRes.error || 'Store not found'}`, 'error');
      storeIdInput?.focus();
      return false;
    }
    
    logToConsole(`Store validated successfully`, 'success');
  } catch (error) {
    status('Invalid Store', 'error');
    logToConsole(`Error validating store: ${error.message}`, 'error');
    logToConsole(`Error stack: ${error.stack}`, 'error');
    storeIdInput?.focus();
    return false;
  }
  
  // Removed: status('Store validated, loading data...', 'info');
  storeId = storeIdValue;
  
  // Track store ID entered
  await trackEvent('store_id_entered', { 
    org: orgInput?.value.trim() || 'unknown',
    store_id: storeIdValue 
  });
  
  // Hide Store ID section
  if (storeIdSection) {
    storeIdSection.style.display = 'none';
  }
  
  // Show logo and cards section
  if (logoContainer) {
    logoContainer.style.display = 'block';
  }
  if (cardsSection) {
    cardsSection.style.display = 'block';
  }
  
    // Hide main title, show store header for cards page
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) {
      mainTitle.style.display = 'none';
    }
    
    const storeHeaderCards = document.getElementById('storeHeaderCards');
    const cardsHeaderStoreId = document.getElementById('cardsHeaderStoreId');
    const cardsHeaderDepartment = document.getElementById('cardsHeaderDepartment');
    if (storeHeaderCards && storeIdValue) {
      storeHeaderCards.style.display = 'block';
    }
    if (cardsHeaderStoreId && storeIdValue) {
      cardsHeaderStoreId.textContent = storeIdValue;
    }
    // Set Department to N/A initially (will be updated when orders load)
    if (cardsHeaderDepartment) {
      cardsHeaderDepartment.textContent = 'N/A';
    }
  
  // Removed: status('Store loaded', 'success');
  return true;
}

storeIdInput?.addEventListener('keypress', async e => {
  if (e.key !== 'Enter') return;
  await submitStoreId();
});

// Barcode Scanner for Store ID
let quaggaInitialized = false;
let scannerRunning = false;
let lastScanTime = 0;
let lastScannedCode = '';
let scanCount = 0;
const SCAN_DEBOUNCE_MS = 500; // Wait 500ms before accepting a new scan
const MIN_CONFIDENCE = 0.4; // Require at least 40% confidence
const MIN_CONSISTENT_SCANS = 2; // Require same code scanned 2 times in a row

function initBarcodeScanner() {
  if (quaggaInitialized) return;
  
  const scannerModal = new bootstrap.Modal(barcodeScannerModal);
  
  // Open scanner modal
  if (scanStoreIdBtn) {
    scanStoreIdBtn.addEventListener('click', () => {
      // Reset scan state when opening modal
      lastScanTime = 0;
      lastScannedCode = '';
      scanCount = 0;
      scannerModal.show();
      setTimeout(() => startBarcodeScanner(), 300); // Wait for modal animation
    });
  }
  
  // Close scanner handlers
  const closeScannerBtn = document.getElementById('closeScannerBtn');
  const stopScannerBtn = document.getElementById('stopScannerBtn');
  const cancelScannerBtn = document.getElementById('cancelScannerBtn');
  
  function stopScanner() {
    if (scannerRunning && typeof Quagga !== 'undefined') {
      try {
        Quagga.stop();
        Quagga.offDetected(); // Remove all event listeners
        scannerRunning = false;
        lastScanTime = 0;
        lastScannedCode = '';
        scanCount = 0;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    scannerModal.hide();
  }
  
  if (closeScannerBtn) {
    closeScannerBtn.addEventListener('click', stopScanner);
  }
  if (stopScannerBtn) {
    stopScannerBtn.addEventListener('click', stopScanner);
  }
  if (cancelScannerBtn) {
    cancelScannerBtn.addEventListener('click', stopScanner);
  }
  
  // Stop scanner when modal is closed
  barcodeScannerModal.addEventListener('hidden.bs.modal', () => {
    stopScanner();
  });
  
  quaggaInitialized = true;
}

function startBarcodeScanner() {
  if (scannerRunning) return;
  
  const scannerStatus = document.getElementById('scannerStatus');
  if (scannerStatus) {
    scannerStatus.textContent = 'Initializing camera...';
    scannerStatus.style.color = 'var(--text)';
  }
  
  if (typeof Quagga === 'undefined') {
    if (scannerStatus) {
      scannerStatus.textContent = 'Error: Barcode scanner library not loaded';
      scannerStatus.style.color = 'red';
    }
    return;
  }
  
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#interactive'),
      constraints: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        facingMode: "environment" // Use back camera on mobile
      }
    },
    locator: {
      patchSize: "medium",
      halfSample: false // Use full resolution for better accuracy
    },
    numOfWorkers: 4, // More workers for better performance
    decoder: {
      readers: [
        "code_128_reader", // Primary format for Store IDs
        "code_39_reader",
        "code_39_vin_reader",
        "ean_reader",
        "ean_8_reader",
        "codabar_reader",
        "upc_reader",
        "upc_e_reader",
        "i2of5_reader"
      ],
      debug: {
        drawBoundingBox: false,
        showFrequency: false,
        drawScanline: false,
        showPattern: false
      }
    },
    locate: true,
    frequency: 30 // Check every 30 frames
  }, function(err) {
    if (err) {
      const scannerStatus = document.getElementById('scannerStatus');
      if (scannerStatus) {
        scannerStatus.textContent = 'Error: Could not access camera. ' + (err.message || 'Please check camera permissions.');
        scannerStatus.style.color = 'red';
      }
      logToConsole('Barcode scanner initialization error: ' + err.message, 'error');
      return;
    }
    
    scannerRunning = true;
    const scannerStatus = document.getElementById('scannerStatus');
    if (scannerStatus) {
      scannerStatus.textContent = 'Camera ready. Scan a barcode (point steadily at barcode)...';
      scannerStatus.style.color = 'var(--text)';
    }
    
    Quagga.start();
    
    // Listen for barcode detection with improved validation
    Quagga.onDetected(function(result) {
      const code = result.codeResult.code;
      const format = result.codeResult.format || '';
      const now = Date.now();
      
      // Calculate confidence from decoded codes
      let confidence = 0;
      if (result.codeResult.decodedCodes && result.codeResult.decodedCodes.length > 0) {
        const validCodes = result.codeResult.decodedCodes.filter(x => x.error === 0).length;
        confidence = validCodes / result.codeResult.decodedCodes.length;
      }
      
      logToConsole(`Barcode detected: ${code} (format: ${format}, confidence: ${(confidence * 100).toFixed(1)}%)`, 'info');
      
      // Check confidence threshold
      if (confidence < MIN_CONFIDENCE && format !== 'code_128' && format !== 'code_39') {
        logToConsole(`Low confidence scan ignored: ${code} (${(confidence * 100).toFixed(1)}%)`, 'warning');
        return;
      }
      
      // Debounce: ignore rapid successive scans
      if (now - lastScanTime < SCAN_DEBOUNCE_MS) {
        return;
      }
      
      // Check if this is the same code as the last scan (consistency check)
      if (code === lastScannedCode) {
        scanCount++;
      } else {
        // Reset count if code changed
        scanCount = 1;
        lastScannedCode = code;
      }
      
      lastScanTime = now;
      
      // Only accept if we've seen the same code multiple times (consistency)
      if (scanCount >= MIN_CONSISTENT_SCANS) {
        logToConsole(`Barcode confirmed: ${code} (scanned ${scanCount} times consistently)`, 'success');
        
        // Stop scanner
        try {
          Quagga.stop();
          Quagga.offDetected(); // Remove event listeners
          scannerRunning = false;
        } catch (error) {
          console.error('Error stopping scanner:', error);
        }
        
        // Fill Store ID input
        if (storeIdInput) {
          storeIdInput.value = code;
          storeIdInput.focus();
        }
        
        // Update status
        if (scannerStatus) {
          scannerStatus.textContent = `Scanned: ${code}`;
          scannerStatus.style.color = 'green';
        }
        
        // Close modal after a brief delay
        setTimeout(() => {
          const scannerModal = bootstrap.Modal.getInstance(barcodeScannerModal);
          if (scannerModal) {
            scannerModal.hide();
          }
          // Removed: status(`Barcode scanned: ${code}`, 'success');
        }, 500);
      } else {
        // Show progress
        if (scannerStatus) {
          scannerStatus.textContent = `Detected: ${code} (${scanCount}/${MIN_CONSISTENT_SCANS}) - Keep steady...`;
          scannerStatus.style.color = 'var(--primary)';
        }
      }
    });
  });
}

// Initialize barcode scanner on page load
window.addEventListener('load', () => {
  initBarcodeScanner();
});

// Card click handlers
// Function to load suggested orders (reusable for refresh)
async function loadSuggestedOrders() {
  if (!token) {
    status('Please authenticate first', 'error');
    return;
  }
  
  if (!storeId) {
    status('Store ID required', 'error');
    return;
  }
  
  if (ordersLoading) {
    ordersLoading.style.display = 'block';
  }
  if (ordersEmpty) {
    ordersEmpty.style.display = 'none';
  }
  if (ordersContainer) {
    ordersContainer.innerHTML = '';
  }
  
  try {
    // Prepare API payload
    const apiPayload = {
      org: orgInput?.value.trim() || '',
      storeId: storeId 
    };
    
    // Log API call details to console
    logToConsole('\n=== Suggested Orders API Call ===', 'info');
    logToConsole(`Action: search-inventory-movement-summary`, 'info');
    logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovementSummary/search`, 'info');
    logToConsole(`Request Payload:`, 'info');
    logToConsole(JSON.stringify(apiPayload, null, 2), 'info');
    logToConsole(`Backend will send payload:`, 'info');
    const backendPayload = {
      Query: `LocationId='${storeId}'`,
      Template: {
        LocationId: null,
        SourceLocationId: null,
        SubGroup: null,
        InventoryMovementSummaryId: null,
        OrderStatus: {
          OrderStatusId: null
        },
        MovementSummaryFactors: null
      }
    };
    logToConsole(JSON.stringify(backendPayload, null, 2), 'info');
    
    // Call API to search inventory movement summary
    const res = await api('search-inventory-movement-summary', apiPayload);
    
    // Log API response to console
    logToConsole(`\nAPI Response:`, 'info');
    logToConsole(JSON.stringify(res, null, 2), res.success ? 'success' : 'error');
    logToConsole('=== End API Call ===\n', 'info');
    
    // Show console section when API is called (unless Console=N)
    if (consoleSection && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
      consoleSection.style.display = 'block';
    }
    if (consoleToggleContainer && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
      consoleToggleContainer.style.display = 'block';
    }
    
    if (ordersLoading) {
      ordersLoading.style.display = 'none';
    }
    
    if (!res.success) {
      status(res.error || 'Failed to load orders', 'error');
      logToConsole(`Error loading suggested orders: ${res.error || 'Unknown error'}`, 'error');
      if (ordersEmpty) {
        ordersEmpty.style.display = 'block';
      }
      return;
    }
    
    const orders = res.orders || [];
    
    logToConsole(`Orders found: ${orders.length}`, 'info');
    if (orders.length > 0) {
      logToConsole(`Orders data:`, 'info');
      logToConsole(JSON.stringify(orders, null, 2), 'info');
    }
    
    if (orders.length === 0) {
      // Removed: status('No suggested orders found', 'info');
      if (ordersEmpty) {
        ordersEmpty.style.display = 'block';
      }
      logToConsole('No suggested orders found for store', 'info');
      return;
    }
    
    // Removed: status(`Found ${orders.length} suggested order(s)`, 'success');
    logToConsole(`Loaded ${orders.length} suggested order(s)`, 'success');
    
    // Update header with Department in storeHeaderCards (Store is already there)
    const cardsHeaderDepartment = document.getElementById('cardsHeaderDepartment');
    // Get Department from first order's SubGroup
    const firstOrder = orders.length > 0 ? orders[0] : null;
    const department = firstOrder?.SubGroup || firstOrder?.Subgroup || 'N/A';
    if (cardsHeaderDepartment) {
      cardsHeaderDepartment.textContent = department;
    }
    
    // Render order cards
    renderOrderCards(orders);
    
  } catch (error) {
    if (ordersLoading) {
      ordersLoading.style.display = 'none';
    }
    status('Error loading orders', 'error');
    logToConsole(`Error: ${error.message}`, 'error');
    logToConsole(`Error stack: ${error.stack}`, 'error');
    if (ordersEmpty) {
      ordersEmpty.style.display = 'block';
    }
  }
}

if (suggestedOrdersCard) {
  suggestedOrdersCard.addEventListener('click', async () => {
    // Removed: status('Loading suggested orders...', 'info');
    await trackEvent('card_clicked', { 
      org: orgInput?.value.trim() || 'unknown',
      store_id: storeId || 'unknown',
      card_type: 'suggested_orders'
    });
    
    // Hide cards section, show orders section
    if (cardsSection) {
      cardsSection.style.display = 'none';
    }
    if (suggestedOrdersSection) {
      suggestedOrdersSection.style.display = 'block';
    }
    
    // Hide main title and show store header
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) {
      mainTitle.style.display = 'none';
    }
    
    // Clear header values initially
    const headerDepartment = document.getElementById('headerDepartment');
    if (headerDepartment) headerDepartment.textContent = '';
    
    // Load orders
    await loadSuggestedOrders();
  });
}

if (opportunityBuysCard) {
  opportunityBuysCard.addEventListener('click', async () => {
    // Removed: status('Opening Opportunity Buys...', 'info');
    await trackEvent('card_clicked', { 
      org: orgInput?.value.trim() || 'unknown',
      store_id: storeId || 'unknown',
      card_type: 'opportunity_buys'
    });
    logToConsole('Opportunity Buys card clicked', 'info');
    
    // Load Opportunity Buys cards
    await loadOpportunityBuysCards();
  });
}

// Change Store button handlers (allows changing store)
const changeStoreBtnCards = document.getElementById('changeStoreBtnCards');

function handleChangeStore() {
  // Hide suggested orders section
  if (suggestedOrdersSection) {
    suggestedOrdersSection.style.display = 'none';
  }
  if (inventoryMovementSection) {
    inventoryMovementSection.style.display = 'none';
  }
  
  // Clear status messages when navigating
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }
  
  // Hide store header cards, show main title
  const mainTitle = document.getElementById('mainTitle');
  if (mainTitle) {
    mainTitle.textContent = 'SCP Mobile';
    mainTitle.style.display = 'block';
  }
  const storeHeaderCards = document.getElementById('storeHeaderCards');
  if (storeHeaderCards) {
    storeHeaderCards.style.display = 'none';
  }
  
  // Show Store ID input section to allow changing store
  if (storeIdSection) {
    storeIdSection.style.display = 'block';
    storeIdInput?.focus();
  }
  
  // Hide cards section
  if (cardsSection) {
    cardsSection.style.display = 'none';
  }
  
  // Clear store ID to allow re-entry
  storeId = null;
  if (storeIdInput) {
    storeIdInput.value = '';
  }
  
  // Removed: status('Enter a new Store ID', 'info');
}

// Attach change store handler to button on Main Cards page
if (changeStoreBtnCards) {
  changeStoreBtnCards.addEventListener('click', handleChangeStore);
}

// Back to cards button handler (for navigation within orders)
if (backToCardsBtn) {
  backToCardsBtn.addEventListener('click', () => {
    if (suggestedOrdersSection) {
      suggestedOrdersSection.style.display = 'none';
    }
    if (inventoryMovementSection) {
      inventoryMovementSection.style.display = 'none';
    }
    
    // Clear status messages when navigating
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }
    if (cardsSection) {
      cardsSection.style.display = 'block';
    }
    
      // Hide main title, show store header for cards page
      const mainTitle = document.getElementById('mainTitle');
      if (mainTitle) {
        mainTitle.style.display = 'none';
      }
      
      const storeHeaderCards = document.getElementById('storeHeaderCards');
      const cardsHeaderStoreId = document.getElementById('cardsHeaderStoreId');
      const cardsHeaderDepartment = document.getElementById('cardsHeaderDepartment');
      if (storeHeaderCards && storeId) {
        storeHeaderCards.style.display = 'block';
      }
      if (cardsHeaderStoreId && storeId) {
        cardsHeaderStoreId.textContent = storeId;
      }
      // Set Department to N/A initially (will be updated when orders load)
      if (cardsHeaderDepartment) {
        cardsHeaderDepartment.textContent = 'N/A';
      }
      
      // Show logo when returning to cards page
      if (logoContainer) {
        logoContainer.style.display = 'block';
      }
    
    // Removed: status('', 'info'); // Clear status messages
  });
}

// Refresh Orders button handler
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
if (refreshOrdersBtn) {
  refreshOrdersBtn.addEventListener('click', async () => {
    await loadSuggestedOrders();
  });
}

// Back to orders button handler
if (backToOrdersBtn) {
  backToOrdersBtn.addEventListener('click', () => {
    // Check if we're on Opportunity Buys page (check movementsContainer attribute)
    const isOpportunityBuys = movementsContainer?.getAttribute('data-is-opportunity-buys') === 'true';
    
    if (inventoryMovementSection) {
      inventoryMovementSection.style.display = 'none';
    }
    
    // Clear status messages when navigating
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'status';
    }
    
    // If coming from Opportunity Buys, go back to Main Page (cards), not Suggested Orders
    if (isOpportunityBuys) {
      if (cardsSection) {
        cardsSection.style.display = 'block';
      }
      if (suggestedOrdersSection) {
        suggestedOrdersSection.style.display = 'none';
      }
      
      // Hide store header cards, show main title
      const mainTitle = document.getElementById('mainTitle');
      if (mainTitle) {
        mainTitle.textContent = 'SCP Mobile';
        mainTitle.style.display = 'block';
      }
      const storeHeaderCards = document.getElementById('storeHeaderCards');
      if (storeHeaderCards) {
        storeHeaderCards.style.display = 'none';
      }
      
      // Show logo when returning to cards page
      if (logoContainer) {
        logoContainer.style.display = 'block';
      }
      
      // Clear Opportunity Buys flag
      if (movementsContainer) {
        movementsContainer.removeAttribute('data-is-opportunity-buys');
      }
    } else {
      // Coming from Suggested Orders Items page, go back to Suggested Orders page
      if (suggestedOrdersSection) {
        suggestedOrdersSection.style.display = 'block';
      }
      
      // Keep main title hidden when showing orders
      const mainTitle = document.getElementById('mainTitle');
      if (mainTitle) {
        mainTitle.style.display = 'none';
      }
      
      // Show storeHeaderCards on Suggested Orders page (Store and Department)
      const storeHeaderCards = document.getElementById('storeHeaderCards');
      if (storeHeaderCards && storeId) {
        storeHeaderCards.style.display = 'block';
      }
      
      // Show Change Store button when returning to Suggested Orders page
      if (changeStoreBtnCards) {
        changeStoreBtnCards.style.display = 'block';
      }
      
      // Show refresh button when Suggested Orders section is displayed
      const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
      if (refreshOrdersBtn) {
        refreshOrdersBtn.style.display = 'block';
      }
    }
    
    // Removed: status('', 'info'); // Clear status messages
  });
}

// Parse MovementSummaryFactors CLOB to extract RequiredTotals
function parseRequiredTotals(movementSummaryFactors) {
  try {
    if (!movementSummaryFactors) return null;
    
    // MovementSummaryFactors is a CLOB (string) that may contain JSON
    // Try to parse it as JSON
    let factors = null;
    if (typeof movementSummaryFactors === 'string') {
      factors = JSON.parse(movementSummaryFactors);
    } else if (typeof movementSummaryFactors === 'object') {
      factors = movementSummaryFactors;
    }
    
    // Extract RequiredTotals if present
    if (factors && factors.RequiredTotals) {
      return factors.RequiredTotals;
    }
    
    return null;
  } catch (error) {
    logToConsole(`Error parsing MovementSummaryFactors: ${error.message}`, 'error');
    return null;
  }
}

// Format currency value
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `$${parseFloat(value).toFixed(2)}`;
}

// Format number value
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return parseFloat(value).toFixed(0);
}

// Format forecast value (always shows 2 decimal places)
function formatForecast(value) {
  if (value === null || value === undefined || value === '') return '0.00';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '0.00';
  return numValue.toFixed(2);
}

// Load Opportunity Buys items (directly show items like Suggested Orders Items page)
async function loadOpportunityBuysCards() {
  if (!token) {
    status('Please authenticate first', 'error');
    return;
  }
  
  if (!storeId) {
    status('Store ID required', 'error');
    return;
  }
  
  // Hide cards section, hide orders section, show movements section (like Suggested Orders Items page)
  if (cardsSection) {
    cardsSection.style.display = 'none';
  }
  if (suggestedOrdersSection) {
    suggestedOrdersSection.style.display = 'none';
  }
  if (inventoryMovementSection) {
    inventoryMovementSection.style.display = 'block';
  }
  
  // Hide refresh button when leaving Opportunity Buys section
  const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
  if (refreshOrdersBtn) {
    refreshOrdersBtn.style.display = 'none';
  }
  
  // Show storeHeaderCards (Store and Department) for Opportunity Buys
  const storeHeaderCards = document.getElementById('storeHeaderCards');
  if (storeHeaderCards && storeId) {
    storeHeaderCards.style.display = 'block';
  }
  
  // Hide Change Store button on Opportunity Buys page
  if (changeStoreBtnCards) {
    changeStoreBtnCards.style.display = 'none';
  }
  
  // Keep main title hidden when showing items
  const mainTitle = document.getElementById('mainTitle');
  if (mainTitle) {
    mainTitle.style.display = 'none';
  }
  
  // Show itemsHeaderContainer for Opportunity Buys but hide Source and Order Status (only show Back button)
  const itemsHeaderContainer = document.getElementById('itemsHeaderContainer');
  const itemsHeaderSource = document.getElementById('itemsHeaderSource');
  const itemsHeaderOrderStatus = document.getElementById('itemsHeaderOrderStatus');
  
  if (itemsHeaderContainer) {
    itemsHeaderContainer.style.display = 'block';
  }
  
  // Hide Source and Order Status fields for Opportunity Buys (keep Back button visible)
  if (itemsHeaderSource) {
    itemsHeaderSource.textContent = '';
    itemsHeaderSource.parentElement.style.display = 'none'; // Hide the Source div
  }
  if (itemsHeaderOrderStatus) {
    itemsHeaderOrderStatus.textContent = '';
    itemsHeaderOrderStatus.parentElement.style.display = 'none'; // Hide the Order Status div
  }
  
  if (movementsLoading) {
    movementsLoading.style.display = 'block';
  }
  if (movementsEmpty) {
    movementsEmpty.style.display = 'none';
  }
  if (movementsContainer) {
    movementsContainer.innerHTML = '';
  }
  
  // Show Update button (Opportunity Buys only has Update button, not Release Order)
  if (submitChangesBtn) {
    submitChangesBtn.style.display = 'none'; // Will show after items load
  }
  if (releaseOrderBtn) {
    releaseOrderBtn.style.display = 'none'; // Not applicable for Opportunity Buys
  }
  
  // Mark this as Opportunity Buys in the container
  if (movementsContainer) {
    movementsContainer.setAttribute('data-is-opportunity-buys', 'true');
    movementsContainer.setAttribute('data-location-id', storeId);
  }
  
  try {
    // Step 1: Call plannedPurchase/search API
    const plannedPurchasePayload = {
      org: orgInput?.value.trim() || '',
      locationId: storeId
    };
    
    logToConsole('\n=== Opportunity Buys API Call ===', 'info');
    logToConsole(`Action: search-planned-purchase`, 'info');
    logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/plannedPurchase/search`, 'info');
    logToConsole(`Request Payload:`, 'info');
    logToConsole(JSON.stringify(plannedPurchasePayload, null, 2), 'info');
    logToConsole(`Backend will send payload:`, 'info');
    const backendPlannedPurchasePayload = {
      Query: `LocationId IN ('${storeId}')`,
      Template: {
        PlannedPurchaseId: null,
        PlannedPurchaseName: null,
        LocationId: null,
        ItemId: null,
        PurchaseQuantity: null,
        PlannedReceiptDate: null,
        PurchaseOnDate: null,
        DaysOfSupply: null,
        PK: null
      }
    };
    logToConsole(JSON.stringify(backendPlannedPurchasePayload, null, 2), 'info');
    
    const plannedPurchaseRes = await api('search-planned-purchase', plannedPurchasePayload);
    
    logToConsole(`\nOpportunity Buys API Response:`, 'info');
    logToConsole(JSON.stringify(plannedPurchaseRes, null, 2), plannedPurchaseRes.success ? 'success' : 'error');
    logToConsole('=== End Opportunity Buys API Call ===\n', 'info');
    
    // Show console section when API is called (unless Console=N)
    if (consoleSection && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
      consoleSection.style.display = 'block';
    }
    if (consoleToggleContainer && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
      consoleToggleContainer.style.display = 'block';
    }
    
    if (movementsLoading) {
      movementsLoading.style.display = 'none';
    }
    
    if (!plannedPurchaseRes.success) {
      status(plannedPurchaseRes.error || 'Failed to load opportunity buys', 'error');
      logToConsole(`Error loading planned purchases: ${plannedPurchaseRes.error || 'Unknown error'}`, 'error');
      if (movementsEmpty) {
        movementsEmpty.style.display = 'block';
      }
      return;
    }
    
    const plannedPurchases = plannedPurchaseRes.plannedPurchases || [];
    
    logToConsole(`Planned purchases found: ${plannedPurchases.length}`, 'info');
    if (plannedPurchases.length > 0) {
      logToConsole(`Planned purchases data:`, 'info');
      logToConsole(JSON.stringify(plannedPurchases, null, 2), 'info');
    }
    
    if (plannedPurchases.length === 0) {
      status('No opportunity buys found', 'info');
      if (movementsEmpty) {
        movementsEmpty.style.display = 'block';
      }
      logToConsole('No planned purchases found', 'info');
      return;
    }
    
    status(`Found ${plannedPurchases.length} opportunity buy(s)`, 'success');
    logToConsole(`Loaded ${plannedPurchases.length} planned purchase(s)`, 'success');
    
    // Step 2: For each PlannedPurchase item, call inventoryMovement/search to get OnHand and Forecast
    const combinedItems = [];
    const itemIds = [];
    
    for (const plannedPurchase of plannedPurchases) {
      const itemId = plannedPurchase.ItemId;
      if (!itemId) continue;
      
      itemIds.push(itemId);
      
      // Call inventoryMovement/search for this item
      const inventoryMovementPayload = {
        org: orgInput?.value.trim() || '',
        itemId: itemId,
        locationId: storeId
      };
      
      logToConsole(`\n=== Inventory Movement API Call (for ItemId: ${itemId}) ===`, 'info');
      logToConsole(`Action: search-inventory-movement`, 'info');
      logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovement/search`, 'info');
      logToConsole(`Request Payload:`, 'info');
      logToConsole(JSON.stringify(inventoryMovementPayload, null, 2), 'info');
      logToConsole(`Backend will send payload:`, 'info');
      const backendInventoryMovementPayload = {
        Query: `ItemId='${itemId}' AND LocationId='${storeId}'`,
        Template: {
          ItemId: null,
          InventoryMovementId: null,
          InventoryMovementDetail: {
            ItemDescription: null
          },
          FinalOrderUnits: null,
          FinalOrderCost: null,
          OnHandQuantity: null,
          PeriodForecast: null
        }
      };
      logToConsole(JSON.stringify(backendInventoryMovementPayload, null, 2), 'info');
      
      try {
        const inventoryMovementRes = await api('search-inventory-movement', inventoryMovementPayload);
        
        logToConsole(`\nInventory Movement API Response (for ItemId: ${itemId}):`, 'info');
        logToConsole(JSON.stringify(inventoryMovementRes, null, 2), inventoryMovementRes.success ? 'success' : 'error');
        logToConsole('=== End Inventory Movement API Call ===\n', 'info');
        
        // Get the first movement result (should be only one per item)
        const inventoryMovement = inventoryMovementRes.movements && inventoryMovementRes.movements.length > 0 
          ? inventoryMovementRes.movements[0] 
          : null;
        
        // Combine PlannedPurchase and inventoryMovement data into format expected by renderOpportunityBuysCards
        const combinedItem = {
          ItemId: itemId,
          InventoryMovementDetail: {
            ItemDescription: inventoryMovement?.InventoryMovementDetail?.ItemDescription || ''
          },
          // Use PurchaseQuantity as FinalOrderUnits for display (will show as "Purchase Qty" in card)
          FinalOrderUnits: plannedPurchase.PurchaseQuantity || '',
          FinalOrderCost: null, // Not provided for Opportunity Buys
          OnHandQuantity: inventoryMovement?.OnHandQuantity ?? '',
          PeriodForecast: inventoryMovement?.PeriodForecast ?? '',
          InventoryMovementId: inventoryMovement?.InventoryMovementId || '',
          // Store PlannedPurchaseId, PlannedPurchaseName, and PK for API calls
          PlannedPurchaseId: plannedPurchase.PlannedPurchaseId || null,
          PlannedPurchaseName: plannedPurchase.PlannedPurchaseName || '',
          PlannedPurchasePK: plannedPurchase.PK || null,
          // Flag to indicate this is an Opportunity Buy item (for different label)
          isOpportunityBuy: true
        };
        
        combinedItems.push(combinedItem);
      } catch (error) {
        logToConsole(`Error loading inventory movement for ItemId ${itemId}: ${error.message}`, 'error');
        // Create item with minimal data
        combinedItems.push({
          ItemId: itemId,
          InventoryMovementDetail: {
            ItemDescription: ''
          },
          FinalOrderUnits: plannedPurchase.PurchaseQuantity || '',
          FinalOrderCost: null,
          OnHandQuantity: 0,
          PeriodForecast: 0,
          InventoryMovementId: '',
          PlannedPurchaseId: plannedPurchase.PlannedPurchaseId || null,
          PlannedPurchaseName: plannedPurchase.PlannedPurchaseName || '',
          PlannedPurchasePK: plannedPurchase.PK || null,
          isOpportunityBuy: true
        });
      }
    }
    
    if (combinedItems.length === 0) {
      status('No opportunity buys found', 'info');
      if (movementsEmpty) {
        movementsEmpty.style.display = 'block';
      }
      return;
    }

    // Step 3: Fetch item images if we have item IDs
    let imageMap = {};
    if (itemIds.length > 0) {
      try {
        const imageApiPayload = {
          org: orgInput?.value.trim() || '',
          itemIds: itemIds
        };
        
        logToConsole('\n=== Item Images API Call (Opportunity Buys) ===', 'info');
        logToConsole(`Action: search-item-images`, 'info');
        logToConsole(`Endpoint: /item/api/item/item/search`, 'info');
        logToConsole(`Request Payload:`, 'info');
        logToConsole(JSON.stringify(imageApiPayload, null, 2), 'info');
        logToConsole(`Backend will send payload:`, 'info');
        const backendImagePayload = {
          Query: `ItemId IN (${itemIds.map(id => `'${id}'`).join(',')})`,
          Template: {
            ItemId: null,
            SmallImageURI: null
          }
        };
        logToConsole(JSON.stringify(backendImagePayload, null, 2), 'info');
        
        const imageRes = await api('search-item-images', imageApiPayload);
        
        logToConsole(`\nImage API Response:`, 'info');
        logToConsole(JSON.stringify(imageRes, null, 2), imageRes.success ? 'success' : 'error');
        logToConsole('=== End Image API Call ===\n', 'info');
        
        if (imageRes.success && imageRes.imageMap) {
          imageMap = imageRes.imageMap;
          logToConsole(`Loaded images for ${Object.keys(imageMap).length} item(s)`, 'success');
        } else {
          logToConsole(`Failed to load item images: ${imageRes.error || 'Unknown error'}`, 'error');
        }
      } catch (error) {
        logToConsole(`Error loading item images: ${error.message}`, 'error');
        // Continue rendering without images if image fetch fails
      }
    }

    // Show Update button when items are loaded
    if (submitChangesBtn && combinedItems.length > 0) {
      submitChangesBtn.style.display = 'block';
    }

    // Step 4: Render cards using renderOpportunityBuysCards (shows items with images and pills)
    renderOpportunityBuysCards(combinedItems, imageMap);
    
  } catch (error) {
    if (movementsLoading) {
      movementsLoading.style.display = 'none';
    }
    status('Error loading opportunity buys', 'error');
    logToConsole(`Error: ${error.message}`, 'error');
    logToConsole(`Error stack: ${error.stack}`, 'error');
    if (movementsEmpty) {
      movementsEmpty.style.display = 'block';
    }
  }
}

// Render Opportunity Buys cards (similar to renderMovementCards but with "Purchase Qty" label)
function renderOpportunityBuysCards(items, imageMap = {}) {
  if (!movementsContainer) return;
  
  movementsContainer.innerHTML = '';
  
  items.forEach((item, index) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    
    // Extract item details
    const itemId = item.ItemId || `Item ${index + 1}`;
    const itemDescription = item.InventoryMovementDetail?.ItemDescription || '';
    const plannedPurchaseName = item.PlannedPurchaseName || 'Opportunity Buy';
    const purchaseQuantity = item.FinalOrderUnits || ''; // This is PurchaseQuantity from PlannedPurchase
    const onHandQuantity = item.OnHandQuantity ?? ''; // Use nullish coalescing to preserve 0
    // Extract PeriodForecast, preserving 0 but defaulting to 0 if null/undefined/empty
    const periodForecast = (item.PeriodForecast !== null && item.PeriodForecast !== undefined && item.PeriodForecast !== '') 
      ? item.PeriodForecast 
      : 0;
    
    // Initialize quantity from PurchaseQuantity
    const initialQuantity = purchaseQuantity !== '' ? parseFloat(purchaseQuantity) : 0;
    
    // Get image URL from imageMap, fallback to placeholder
    const imageUrl = imageMap[itemId] || null;
    const imageHtml = imageUrl 
      ? `<img src="${imageUrl}" alt="${itemId}" class="item-image" onerror="this.parentElement.innerHTML='<div class=\'item-image-placeholder\'></div>';" />`
      : '<div class="item-image-placeholder"></div>';
    
    // Get InventoryMovementId, PlannedPurchaseId, and PK (PK used for delete API)
    const inventoryMovementId = item.InventoryMovementId || '';
    const plannedPurchaseId = item.PlannedPurchaseId || '';
    const plannedPurchasePK = item.PlannedPurchasePK || '';
    
    itemCard.innerHTML = `
      <div class="item-card-content">
        <div class="item-card-left">
          ${imageHtml}
        </div>
        <div class="item-card-center">
          <div class="item-card-title" style="text-align: left;">${plannedPurchaseName}</div>
          <div class="item-card-details">
            <div class="item-detail-line">Item: ${itemId}${itemDescription ? ` - ${itemDescription}` : ''}</div>
            ${purchaseQuantity !== '' ? `<div class="item-detail-line">Purchase Qty: ${formatNumber(purchaseQuantity)}</div>` : ''}
            <div class="item-detail-line">On Hand: ${formatNumber(onHandQuantity !== '' ? onHandQuantity : 0)}</div>
            <div class="item-detail-line">Forecast: ${formatForecast(periodForecast)}</div>
          </div>
        </div>
      </div>
      <div class="item-card-footer">
        <div class="item-quantity-control">
          <button class="quantity-pill-btn quantity-pill-remove" data-item-id="${itemId}" title="Remove item">
            <i class="fas fa-trash"></i>
          </button>
          <button class="quantity-pill-btn quantity-pill-decrease" data-item-id="${itemId}" title="Decrease quantity" ${initialQuantity <= 0 ? 'style="display:none;"' : ''}>
            <i class="fas fa-minus"></i>
          </button>
          <span class="quantity-pill-text" data-item-id="${itemId}">${formatNumber(initialQuantity)} ct</span>
          <button class="quantity-pill-btn quantity-pill-increase" data-item-id="${itemId}" title="Increase quantity">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    `;
    
    // Store initial quantity and IDs as data attributes for reference
    itemCard.setAttribute('data-initial-quantity', initialQuantity);
    itemCard.setAttribute('data-current-quantity', initialQuantity);
    itemCard.setAttribute('data-item-id', itemId);
    itemCard.setAttribute('data-inventory-movement-id', inventoryMovementId);
    itemCard.setAttribute('data-planned-purchase-id', plannedPurchaseId);
    itemCard.setAttribute('data-planned-purchase-pk', plannedPurchasePK);
    itemCard.setAttribute('data-planned-purchase-name', plannedPurchaseName);
    itemCard.setAttribute('data-is-opportunity-buy', 'true');
    
    // Initially grey out card and pill if quantity is 0
    if (initialQuantity === 0) {
      itemCard.style.opacity = '0.5';
    }
    
    // Add quantity control handlers (same as renderMovementCards)
    const quantityPill = itemCard.querySelector('.item-quantity-control');
    const quantityText = itemCard.querySelector('.quantity-pill-text');
    const increaseBtn = itemCard.querySelector('.quantity-pill-increase');
    const decreaseBtn = itemCard.querySelector('.quantity-pill-decrease');
    const removeBtn = itemCard.querySelector('.quantity-pill-remove');
    
    let currentQuantity = initialQuantity;
    
    // Function to update quantity display
    const updateQuantityDisplay = () => {
      if (quantityText) {
        quantityText.textContent = `${formatNumber(currentQuantity)} ct`;
      }
      
      // Show/hide decrease button based on quantity
      if (decreaseBtn) {
        decreaseBtn.style.display = currentQuantity > 0 ? 'inline-flex' : 'none';
      }
      
      // Update card data attribute
      itemCard.setAttribute('data-current-quantity', currentQuantity);
      
      // Visual feedback for removed items
      if (currentQuantity === 0) {
        itemCard.style.opacity = '0.5';
      } else {
        itemCard.style.opacity = '1';
      }
      
      // Check for pending changes and update Release Order button state (if applicable)
      // Note: For Opportunity Buys, we may not have Release Order button, but keeping for consistency
      if (typeof checkPendingChanges === 'function') {
        checkPendingChanges();
      }
    };
    
    // Increase quantity
    if (increaseBtn) {
      increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        currentQuantity = Math.max(0, currentQuantity + 1);
        updateQuantityDisplay();
      });
    }
    
    // Decrease quantity
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        currentQuantity = Math.max(0, currentQuantity - 1);
        updateQuantityDisplay();
      });
    }
    
    // Remove item
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        currentQuantity = 0;
        updateQuantityDisplay();
        logToConsole(`Item ${itemId} marked for removal`, 'info');
      });
    }
    
    movementsContainer.appendChild(itemCard);
  });
}

// Render order cards
function renderOrderCards(orders) {
  if (!ordersContainer) return;
  
  ordersContainer.innerHTML = '';
  
  orders.forEach((order, index) => {
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    
    // Extract order details (adjust field names based on actual API response)
    const orderId = order.InventoryMovementSummaryId || order.Id || `Order ${index + 1}`;
    const locationId = order.LocationId || storeId || '';
    const sourceLocationId = order.SourceLocationId || '';
    const subGroup = order.SubGroup || '';
    const orderStatus = order.OrderStatus?.OrderStatusId || order.OrderStatus || '';
    const quantity = order.Quantity || order.Amount || '';
    const itemCount = order.ItemCount || order.Items?.length || '';
    
    // Parse MovementSummaryFactors to get RequiredTotals
    const requiredTotals = parseRequiredTotals(order.MovementSummaryFactors);
    const totalCost = requiredTotals?.USD || null;
    const totalUnits = requiredTotals?.EA || null;
    
    orderCard.innerHTML = `
      <div class="order-card-header">
        <div>
          <h4 class="order-card-title">Suggested Order ${index + 1}</h4>
        </div>
      </div>
      <div class="order-card-details">
        ${sourceLocationId ? `<div class="order-card-detail-row">
          <span class="order-card-detail-label">Source Location:</span>
          <span class="order-card-detail-value">${sourceLocationId}</span>
        </div>` : ''}
        ${subGroup ? `<div class="order-card-detail-row">
          <span class="order-card-detail-label">Sub Group:</span>
          <span class="order-card-detail-value">${subGroup}</span>
        </div>` : ''}
        ${orderStatus ? `<div class="order-card-detail-row">
          <span class="order-card-detail-label">Status:</span>
          <span class="order-card-detail-value">${orderStatus}</span>
        </div>` : ''}
        ${quantity ? `<div class="order-card-detail-row">
          <span class="order-card-detail-label">Quantity:</span>
          <span class="order-card-detail-value">${quantity}</span>
        </div>` : ''}
        ${itemCount ? `<div class="order-card-detail-row">
          <span class="order-card-detail-label">Items:</span>
          <span class="order-card-detail-value">${itemCount}</span>
        </div>` : ''}
      </div>
      ${(totalCost !== null || totalUnits !== null) ? `
      <div class="order-card-totals">
        ${totalCost !== null ? `<div class="order-card-total-row">
          <span class="order-card-total-label">Total Cost:</span>
          <span class="order-card-total-value">${formatCurrency(totalCost)}</span>
        </div>` : ''}
        ${totalUnits !== null ? `<div class="order-card-total-row">
          <span class="order-card-total-label">Total Units:</span>
          <span class="order-card-total-value">${formatNumber(totalUnits)}</span>
        </div>` : ''}
      </div>
      ` : ''}
    `;
    
    // Store SubGroup and OrderStatus as data attributes for use in items header
    if (subGroup) {
      orderCard.setAttribute('data-subgroup', subGroup);
    }
    if (orderStatus) {
      orderCard.setAttribute('data-order-status', orderStatus);
    }
    
    // Add click handler for order card to load inventory movements
    orderCard.addEventListener('click', async () => {
      logToConsole(`Order card clicked: ${orderId}`, 'info');
      
      if (!token) {
        status('Please authenticate first', 'error');
        return;
      }
      
      if (!sourceLocationId || !locationId) {
        status('Order missing location information', 'error');
        return;
      }
      
      // Removed: status('Loading order items...', 'info');
      
      // Hide orders section, show movements section
      if (suggestedOrdersSection) {
        suggestedOrdersSection.style.display = 'none';
      }
      if (inventoryMovementSection) {
        inventoryMovementSection.style.display = 'block';
      }
      
      // Clear status messages when navigating to Items page
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'status';
      }
      
      // Keep storeHeaderCards visible on Items page (shows Store and Department)
      // Hide Change Store button on Items page
      if (changeStoreBtnCards) {
        changeStoreBtnCards.style.display = 'none';
      }
      
      // Keep main title hidden when showing items
      const mainTitle = document.getElementById('mainTitle');
      if (mainTitle) {
        mainTitle.style.display = 'none';
      }
      if (movementsLoading) {
        movementsLoading.style.display = 'block';
      }
      if (movementsEmpty) {
        movementsEmpty.style.display = 'none';
      }
      if (movementsContainer) {
        movementsContainer.innerHTML = '';
      }
      if (submitChangesBtn) {
        submitChangesBtn.style.display = 'none';
      }
      if (releaseOrderBtn) {
        releaseOrderBtn.style.display = 'none';
      }
      
      try {
        // Prepare API payload
        const apiPayload = {
          org: orgInput?.value.trim() || '',
          sourceLocationId: sourceLocationId,
          locationId: locationId
        };
        
        // Log API call details to console
        logToConsole('\n=== Inventory Movement API Call ===', 'info');
        logToConsole(`Action: search-inventory-movement`, 'info');
        logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovement/search`, 'info');
        logToConsole(`Request Payload:`, 'info');
        logToConsole(JSON.stringify(apiPayload, null, 2), 'info');
        logToConsole(`Backend will send payload:`, 'info');
        const backendPayload = {
          Query: `SourceLocationId='${sourceLocationId}' AND LocationId='${locationId}' AND FinalOrderQty>0`,
          Template: {
            ItemId: null,
            InventoryMovementId: null,
            InventoryMovementDetail: {
              ItemDescription: null
            },
            FinalOrderUnits: null,
            FinalOrderCost: null,
            OnHandQuantity: null,
            PeriodForecast: null
          }
        };
        logToConsole(JSON.stringify(backendPayload, null, 2), 'info');
        
        // Call API to search inventory movement
        const res = await api('search-inventory-movement', apiPayload);
        
        // Log API response to console
        logToConsole(`\nAPI Response:`, 'info');
        logToConsole(JSON.stringify(res, null, 2), res.success ? 'success' : 'error');
        logToConsole('=== End API Call ===\n', 'info');
        
        // Show console section when API is called (unless Console=N)
        if (consoleSection && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
          consoleSection.style.display = 'block';
        }
        if (consoleToggleContainer && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
          consoleToggleContainer.style.display = 'block';
        }
        
        if (movementsLoading) {
          movementsLoading.style.display = 'none';
        }
        
        if (!res.success) {
          status(res.error || 'Failed to load items', 'error');
          logToConsole(`Error loading inventory movements: ${res.error || 'Unknown error'}`, 'error');
          if (movementsEmpty) {
            movementsEmpty.style.display = 'block';
          }
          return;
        }
        
        const movements = res.movements || [];
        
        logToConsole(`Movements found: ${movements.length}`, 'info');
        if (movements.length > 0) {
          logToConsole(`Movements data:`, 'info');
          logToConsole(JSON.stringify(movements, null, 2), 'info');
        }
        
        if (movements.length === 0) {
          status('No items found', 'info');
          if (movementsEmpty) {
            movementsEmpty.style.display = 'block';
          }
          if (submitChangesBtn) {
            submitChangesBtn.style.display = 'none';
          }
          logToConsole('No inventory movements found', 'info');
          return;
        }
        
        status(`Found ${movements.length} item(s)`, 'success');
        logToConsole(`Loaded ${movements.length} inventory movement(s)`, 'success');
        
        // Store sourceLocationId, locationId, and orderStatus for review API call
        if (movementsContainer) {
          movementsContainer.setAttribute('data-source-location-id', sourceLocationId);
          movementsContainer.setAttribute('data-location-id', locationId);
          const orderStatusValue = orderCard.getAttribute('data-order-status') || orderStatus || '';
          movementsContainer.setAttribute('data-order-status', orderStatusValue);
        }
        
        // Update header with Source and Order Status in itemsHeaderContainer (Store and Department already in main header)
        const itemsHeaderContainer = document.getElementById('itemsHeaderContainer');
        const itemsHeaderSource = document.getElementById('itemsHeaderSource');
        const itemsHeaderOrderStatus = document.getElementById('itemsHeaderOrderStatus');
        
        // Show the header container
        if (itemsHeaderContainer) {
          itemsHeaderContainer.style.display = 'block';
        }
        
        // Set Source location
        if (itemsHeaderSource) {
          itemsHeaderSource.textContent = sourceLocationId || 'N/A';
        }
        
        // Get Order Status from the order (from data attribute or variable)
        if (itemsHeaderOrderStatus) {
          const orderStatusValue = orderCard.getAttribute('data-order-status') || orderStatus || 'N/A';
          itemsHeaderOrderStatus.textContent = orderStatusValue;
        }
        
        // Show submit and release order buttons when items are loaded
        if (submitChangesBtn && movements.length > 0) {
          submitChangesBtn.style.display = 'block';
        }
        if (releaseOrderBtn && movements.length > 0) {
          releaseOrderBtn.style.display = 'block';
          // Initial check for pending changes to set button state
          setTimeout(() => checkPendingChanges(), 100);
        }
        
        // Collect all unique item IDs for image lookup
        const itemIds = [...new Set(movements.map(m => m.ItemId).filter(id => id))];
        
        // Fetch item images if we have item IDs
        let imageMap = {};
        if (itemIds.length > 0) {
          try {
            // Silently fetch images without displaying status message
            const imageApiPayload = {
              org: orgInput?.value.trim() || '',
              itemIds: itemIds
            };
            
            // Log API call details to console
            logToConsole('\n=== Item Images API Call ===', 'info');
            logToConsole(`Action: search-item-images`, 'info');
            logToConsole(`Endpoint: /item/api/item/item/search`, 'info');
            logToConsole(`Request Payload:`, 'info');
            logToConsole(JSON.stringify(imageApiPayload, null, 2), 'info');
            logToConsole(`Backend will send payload:`, 'info');
            const backendImagePayload = {
              Query: `ItemId IN (${itemIds.map(id => `'${id}'`).join(',')})`,
              Template: {
                ItemId: null,
                SmallImageURI: null
              }
            };
            logToConsole(JSON.stringify(backendImagePayload, null, 2), 'info');
            
            const imageRes = await api('search-item-images', imageApiPayload);
            
            // Log API response to console
            logToConsole(`\nImage API Response:`, 'info');
            logToConsole(JSON.stringify(imageRes, null, 2), imageRes.success ? 'success' : 'error');
            logToConsole('=== End Image API Call ===\n', 'info');
            
            if (imageRes.success && imageRes.imageMap) {
              imageMap = imageRes.imageMap;
              logToConsole(`Loaded images for ${Object.keys(imageMap).length} item(s)`, 'success');
            } else {
              logToConsole(`Failed to load item images: ${imageRes.error || 'Unknown error'}`, 'error');
            }
          } catch (error) {
            logToConsole(`Error loading item images: ${error.message}`, 'error');
            // Continue rendering without images if image fetch fails
          }
        }
        
        // Sort movements by Quantity (Descending) and ItemId (Ascending)
        const sortedMovements = [...movements].sort((a, b) => {
          const qtyA = parseFloat(a.FinalOrderUnits || a.FinalOrderQty || 0);
          const qtyB = parseFloat(b.FinalOrderUnits || b.FinalOrderQty || 0);
          const itemIdA = a.ItemId || '';
          const itemIdB = b.ItemId || '';
          
          // First sort by Quantity (Descending)
          if (qtyB !== qtyA) {
            return qtyB - qtyA;
          }
          
          // Then sort by ItemId (Ascending)
          return itemIdA.localeCompare(itemIdB);
        });
        
        // Render movement cards with image map
        renderMovementCards(sortedMovements, imageMap);
        
      } catch (error) {
        if (movementsLoading) {
          movementsLoading.style.display = 'none';
        }
        status('Error loading items', 'error');
        logToConsole(`Error: ${error.message}`, 'error');
        logToConsole(`Error stack: ${error.stack}`, 'error');
        if (movementsEmpty) {
          movementsEmpty.style.display = 'block';
        }
      }
    });
    
    ordersContainer.appendChild(orderCard);
  });
}

// Render movement cards
function renderMovementCards(movements, imageMap = {}) {
  if (!movementsContainer) return;
  
  movementsContainer.innerHTML = '';
  
  movements.forEach((movement, index) => {
    const movementCard = document.createElement('div');
    movementCard.className = 'item-card';
    
    // Extract movement details (adjust field names based on actual API response)
    const itemId = movement.ItemId || `Item ${index + 1}`;
    // Get ItemDescription from nested InventoryMovementDetail structure
    const itemDescription = movement.InventoryMovementDetail?.ItemDescription || movement.ItemDescription || '';
    const finalOrderUnits = movement.FinalOrderUnits || movement.FinalOrderQty || '';
    const finalOrderCost = movement.FinalOrderCost || null;
    const onHandQuantity = movement.OnHandQuantity ?? movement.OnHandQty ?? ''; // Use nullish coalescing to preserve 0
    const periodForecast = movement.PeriodForecast ?? ''; // Use nullish coalescing to preserve 0
    
    // Initialize quantity from FinalOrderUnits
    const initialQuantity = finalOrderUnits !== '' ? parseFloat(finalOrderUnits) : 0;
    
    // Get image URL from imageMap, fallback to placeholder
    const imageUrl = imageMap[itemId] || null;
    const imageHtml = imageUrl 
      ? `<img src="${imageUrl}" alt="${itemId}" class="item-image" onerror="this.parentElement.innerHTML='<div class=\'item-image-placeholder\'></div>';" />`
      : '<div class="item-image-placeholder"></div>';
    
    // Get InventoryMovementId (not displayed, but needed for updates)
    const inventoryMovementId = movement.InventoryMovementId || '';
    
    movementCard.innerHTML = `
      <div class="item-card-content">
        <div class="item-card-left">
          ${imageHtml}
        </div>
        <div class="item-card-center">
          <div class="item-card-title" style="text-align: left;">${itemId} - ${itemDescription || 'No Description'}</div>
          <div class="item-card-details">
            <div class="item-detail-line">Order Qty: ${formatNumber(finalOrderUnits !== '' ? finalOrderUnits : 0)}</div>
            <div class="item-detail-line">Purchase Price: ${formatCurrency(finalOrderCost !== null ? finalOrderCost : 0)}</div>
            <div class="item-detail-line">On Hand: ${formatNumber(onHandQuantity !== '' ? onHandQuantity : 0)}</div>
            <div class="item-detail-line">Forecast: ${formatForecast(periodForecast !== '' ? periodForecast : 0)}</div>
          </div>
        </div>
      </div>
      <div class="item-card-footer">
        <div class="item-quantity-control">
          <button class="quantity-pill-btn quantity-pill-remove" data-item-id="${itemId}" title="Remove item">
            <i class="fas fa-trash"></i>
          </button>
          <button class="quantity-pill-btn quantity-pill-decrease" data-item-id="${itemId}" title="Decrease quantity" ${initialQuantity <= 0 ? 'style="display:none;"' : ''}>
            <i class="fas fa-minus"></i>
          </button>
          <span class="quantity-pill-text" data-item-id="${itemId}">${formatNumber(initialQuantity)} ct</span>
          <button class="quantity-pill-btn quantity-pill-increase" data-item-id="${itemId}" title="Increase quantity">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    `;
    
    // Store initial quantity and InventoryMovementId as data attributes for reference
    movementCard.setAttribute('data-initial-quantity', initialQuantity);
    movementCard.setAttribute('data-current-quantity', initialQuantity);
    movementCard.setAttribute('data-item-id', itemId);
    movementCard.setAttribute('data-inventory-movement-id', inventoryMovementId);
    
    // Initially grey out card and pill if quantity is 0
    if (initialQuantity === 0) {
      movementCard.style.opacity = '0.5';
    }
    
    // Add quantity control handlers
    const quantityPill = movementCard.querySelector('.item-quantity-control');
    const quantityText = movementCard.querySelector('.quantity-pill-text');
    const increaseBtn = movementCard.querySelector('.quantity-pill-increase');
    const decreaseBtn = movementCard.querySelector('.quantity-pill-decrease');
    const removeBtn = movementCard.querySelector('.quantity-pill-remove');
    
    let currentQuantity = initialQuantity;
    
    // Function to update quantity display
    const updateQuantityDisplay = () => {
      if (quantityText) {
        quantityText.textContent = `${formatNumber(currentQuantity)} ct`;
      }
      
      // Show/hide decrease button based on quantity
      if (decreaseBtn) {
        decreaseBtn.style.display = currentQuantity > 0 ? 'inline-flex' : 'none';
      }
      
      // Update card data attribute
      movementCard.setAttribute('data-current-quantity', currentQuantity);
      
      // Visual feedback for removed items
      if (currentQuantity === 0) {
        movementCard.style.opacity = '0.5';
      } else {
        movementCard.style.opacity = '1';
      }
      
      // Check for pending changes and update Release Order button state
      checkPendingChanges();
    };
    
    // Increase quantity
    if (increaseBtn) {
      increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        currentQuantity = Math.max(0, currentQuantity + 1);
        updateQuantityDisplay();
      });
    }
    
    // Decrease quantity
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        currentQuantity = Math.max(0, currentQuantity - 1);
        updateQuantityDisplay();
      });
    }
    
    // Remove item
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        currentQuantity = 0;
        updateQuantityDisplay();
        logToConsole(`Item ${itemId} marked for removal`, 'info');
      });
    }
    
    movementsContainer.appendChild(movementCard);
  });
}

// Submit button handler
if (submitChangesBtn) {
    submitChangesBtn.addEventListener('click', async () => {
    if (!movementsContainer) return;
    
    // Check if we're on Opportunity Buys page
    const isOpportunityBuys = movementsContainer?.getAttribute('data-is-opportunity-buys') === 'true';
    
    // Collect all item cards and their updated quantities
    const itemCards = movementsContainer.querySelectorAll('.item-card');
    const updates = [];
    
    itemCards.forEach(card => {
      const itemId = card.getAttribute('data-item-id');
      const inventoryMovementId = card.getAttribute('data-inventory-movement-id');
      const currentQuantity = parseFloat(card.getAttribute('data-current-quantity')) || 0;
      const initialQuantity = parseFloat(card.getAttribute('data-initial-quantity')) || 0;
      
      // Only include items with changed quantities
      if (currentQuantity !== initialQuantity) {
        const update = {
          itemId: itemId,
          inventoryMovementId: inventoryMovementId,
          quantity: currentQuantity,
          initialQuantity: initialQuantity
        };
        
        // For Opportunity Buys, also collect PK and other PlannedPurchase data
        if (isOpportunityBuys) {
          update.plannedPurchaseId = card.getAttribute('data-planned-purchase-id') || '';
          update.plannedPurchasePK = card.getAttribute('data-planned-purchase-pk') || '';
          update.plannedPurchaseName = card.getAttribute('data-planned-purchase-name') || '';
        }
        
        updates.push(update);
      }
    });
    
    if (updates.length === 0) {
      // Removed: status('No changes to submit', 'info');
      logToConsole('No quantity changes detected', 'info');
      return;
    }
    
    // Handle Opportunity Buys differently
    if (isOpportunityBuys) {
      // Opportunity Buys update logic
      const locationId = movementsContainer?.getAttribute('data-location-id') || storeId;
      
      if (!locationId) {
        status('Missing location information', 'error');
        logToConsole('Error: LocationId required for Opportunity Buys', 'error');
        return;
      }
      
      logToConsole(`\n=== Submitting ${updates.length} Opportunity Buys update(s) ===`, 'info');
      
      // Filter updates: process items with qty > 0 first, then qty = 0
      const updatesToProcess = updates.filter(update => update.quantity > 0);
      const updatesToDelete = updates.filter(update => update.quantity === 0);
      
      logToConsole(`Processing ${updatesToProcess.length} item(s) with qty > 0`, 'info');
      if (updatesToDelete.length > 0) {
        logToConsole(`Will delete ${updatesToDelete.length} item(s) with qty = 0`, 'info');
      }
      
      let successCount = 0;
      let errorCount = 0;
      let deleteSuccessCount = 0;
      let deleteErrorCount = 0;
      const errors = [];
      const deleteErrors = [];
      
      // Process items with qty > 0 (save planned purchase)
      for (const update of updatesToProcess) {
        try {
          if (!update.plannedPurchaseId || !update.plannedPurchaseName || !update.itemId) {
            logToConsole(`Skipping item ${update.itemId}: missing PlannedPurchase data`, 'error');
            errorCount++;
            errors.push({ itemId: update.itemId, error: 'Missing PlannedPurchase data' });
            continue;
          }
          
          const savePayload = {
            PurchaseQuantity: update.quantity,
            PlannedPurchaseId: update.plannedPurchaseId,
            PlannedPurchaseName: update.plannedPurchaseName,
            LocationId: locationId,
            ItemId: update.itemId
          };
          
          const apiPayload = {
            org: orgInput?.value.trim() || '',
            plannedPurchaseData: savePayload
          };
          
          logToConsole(`\nSaving Opportunity Buy item ${update.itemId}:`, 'info');
          logToConsole(`  PurchaseQuantity: ${update.quantity} (was ${update.initialQuantity})`, 'info');
          logToConsole(`  PlannedPurchaseId: ${update.plannedPurchaseId}`, 'info');
          logToConsole(`  PlannedPurchaseName: ${update.plannedPurchaseName}`, 'info');
          logToConsole(`  LocationId: ${locationId}`, 'info');
          logToConsole(`  ItemId: ${update.itemId}`, 'info');
          logToConsole(`Request Payload:`, 'info');
          logToConsole(JSON.stringify(savePayload, null, 2), 'info');
          
          const res = await api('save-planned-purchase', apiPayload);
          
          if (res.success) {
            successCount++;
            logToConsole(`  ✓ Successfully saved Opportunity Buy item ${update.itemId}`, 'success');
          } else {
            errorCount++;
            const errorMsg = res.error || 'Unknown error';
            errors.push({ itemId: update.itemId, error: errorMsg });
            logToConsole(`  ✗ Failed to save Opportunity Buy item ${update.itemId}: ${errorMsg}`, 'error');
          }
        } catch (error) {
          errorCount++;
          const errorMsg = error.message || 'Unknown error';
          errors.push({ itemId: update.itemId, error: errorMsg });
          logToConsole(`  ✗ Error saving Opportunity Buy item ${update.itemId}: ${errorMsg}`, 'error');
          logToConsole(`  Error stack: ${error.stack}`, 'error');
        }
      }
      
      // Process items with qty = 0 (delete planned purchase)
      for (const update of updatesToDelete) {
        try {
          if (!update.plannedPurchasePK) {
            logToConsole(`Skipping delete for item ${update.itemId}: missing PK`, 'error');
            deleteErrorCount++;
            deleteErrors.push({ itemId: update.itemId, error: 'Missing PK' });
            continue;
          }
          
          const apiPayload = {
            org: orgInput?.value.trim() || '',
            pk: update.plannedPurchasePK
          };
          
          logToConsole(`\nDeleting Opportunity Buy item ${update.itemId}:`, 'info');
          logToConsole(`  PK: ${update.plannedPurchasePK}`, 'info');
          logToConsole(`  ItemId: ${update.itemId}`, 'info');
          
          const res = await api('delete-planned-purchase', apiPayload);
          
          if (res.success) {
            deleteSuccessCount++;
            logToConsole(`  ✓ Successfully deleted Opportunity Buy item ${update.itemId}`, 'success');
          } else {
            deleteErrorCount++;
            const errorMsg = res.error || 'Unknown error';
            deleteErrors.push({ itemId: update.itemId, error: errorMsg });
            logToConsole(`  ✗ Failed to delete Opportunity Buy item ${update.itemId}: ${errorMsg}`, 'error');
          }
        } catch (error) {
          deleteErrorCount++;
          const errorMsg = error.message || 'Unknown error';
          deleteErrors.push({ itemId: update.itemId, error: errorMsg });
          logToConsole(`  ✗ Error deleting Opportunity Buy item ${update.itemId}: ${errorMsg}`, 'error');
          logToConsole(`  Error stack: ${error.stack}`, 'error');
        }
      }
      
      // Update initial quantities for successfully processed items
      if (successCount > 0) {
        updatesToProcess.forEach(update => {
          if (!errors.find(e => e.itemId === update.itemId)) {
            const card = Array.from(itemCards).find(c => c.getAttribute('data-item-id') === update.itemId);
            if (card) {
              card.setAttribute('data-initial-quantity', update.quantity);
            }
          }
        });
      }
      
      if (deleteSuccessCount > 0) {
        updatesToDelete.forEach(update => {
          if (!deleteErrors.find(e => e.itemId === update.itemId)) {
            const card = Array.from(itemCards).find(c => c.getAttribute('data-item-id') === update.itemId);
            if (card) {
              card.setAttribute('data-initial-quantity', 0);
            }
          }
        });
      }
      
      logToConsole(`\n=== Opportunity Buys Submission Complete ===`, 'info');
      const totalSuccess = successCount + deleteSuccessCount;
      const totalErrors = errorCount + deleteErrorCount;
      logToConsole(`Total Success: ${totalSuccess} | Total Errors: ${totalErrors}`, totalErrors === 0 ? 'success' : 'error');
      
      if (errors.length > 0 || deleteErrors.length > 0) {
        logToConsole(`\nAll Errors:`, 'error');
        logToConsole(JSON.stringify([...errors, ...deleteErrors], null, 2), 'error');
      }
      
      // Show completion modal
      showSubmissionModal(totalSuccess, totalErrors);
      
      // If update was successful (no errors), wait 1 second and refresh Opportunity Buys items
      if (totalErrors === 0 && totalSuccess > 0) {
        setTimeout(async () => {
          logToConsole(`\n=== Refreshing Opportunity Buys Items ===`, 'info');
          await loadOpportunityBuysCards();
        }, 1000);
      }
      
      return;
    }
    
    // Original Suggested Orders logic continues here
    // Get sourceLocationId, locationId, and orderStatus from movementsContainer data attributes
    const sourceLocationId = movementsContainer?.getAttribute('data-source-location-id');
    const locationId = movementsContainer?.getAttribute('data-location-id');
    const orderStatus = movementsContainer?.getAttribute('data-order-status') || '';
    
    if (!sourceLocationId || !locationId) {
      status('Missing location information', 'error');
      logToConsole('Error: SourceLocationId and LocationId required', 'error');
      return;
    }
    
    // Only call review API if order status is "Suggested"
    let reviewSuccess = true; // Default to true if review is not needed
    if (orderStatus === 'Suggested') {
      // Removed: status('Starting review...', 'info');
      logToConsole(`\n=== Review Inventory Movement ===`, 'info');
      logToConsole(`Action: review-inventory-movement`, 'info');
      logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/review`, 'info');
      logToConsole(`Request Payload:`, 'info');
      const reviewPayload = {
        org: orgInput?.value.trim() || '',
        sourceLocationId: sourceLocationId,
        locationId: locationId
      };
      logToConsole(JSON.stringify(reviewPayload, null, 2), 'info');
      logToConsole(`Backend will send payload:`, 'info');
      const backendReviewPayload = {
        ItemId: null,
        SourceLocationId: sourceLocationId,
        LocationId: locationId,
        RelationType: "Regular",
        BracketId: null,
        executeBracket: false,
        CancelReview: false,
        StartReview: true,
        UseLatest: false
      };
      logToConsole(JSON.stringify(backendReviewPayload, null, 2), 'info');
      
      // Call review API
      try {
        const reviewRes = await api('review-inventory-movement', reviewPayload);
        
        logToConsole(`\nReview API Response:`, 'info');
        logToConsole(JSON.stringify(reviewRes, null, 2), reviewRes.success ? 'success' : 'error');
        logToConsole('=== End Review API Call ===\n', 'info');
        
        if (!reviewRes.success) {
          status(`Review failed: ${reviewRes.error || 'Unknown error'}`, 'error');
          logToConsole(`Review API failed: ${reviewRes.error || 'Unknown error'}`, 'error');
          return;
        }
        
        reviewSuccess = true;
        logToConsole('Review API succeeded, proceeding with item updates', 'success');
      } catch (error) {
        status(`Review error: ${error.message}`, 'error');
        logToConsole(`Review API error: ${error.message}`, 'error');
        logToConsole(`Error stack: ${error.stack}`, 'error');
        return;
      }
    } else {
      logToConsole(`\nSkipping Review API - Order status is "${orderStatus}", not "Suggested"`, 'info');
      logToConsole('Proceeding directly with item updates', 'info');
    }
    
    if (!reviewSuccess) {
      return;
    }
    
    // Removed: status('Submitting changes...', 'info');
    logToConsole(`\n=== Submitting ${updates.length} item update(s) ===`, 'info');
    
    // Filter updates: process items with qty > 0 first, then qty = 0
    const updatesToProcess = updates.filter(update => update.quantity > 0);
    const updatesToClear = updates.filter(update => update.quantity === 0);
    
    logToConsole(`Processing ${updatesToProcess.length} item update(s) with qty > 0`, 'info');
    if (updatesToClear.length > 0) {
      logToConsole(`Will clear ${updatesToClear.length} item(s) with qty = 0 after updates`, 'info');
    }
    
    let successCount = 0;
    let errorCount = 0;
    let clearSuccessCount = 0;
    let clearErrorCount = 0;
    const errors = [];
    const clearErrors = [];
    
    // Call update API individually for each item with qty > 0
    for (const update of updatesToProcess) {
      try {
        if (!update.inventoryMovementId) {
          logToConsole(`Skipping item ${update.itemId}: missing InventoryMovementId`, 'error');
          errorCount++;
          errors.push({ itemId: update.itemId, error: 'Missing InventoryMovementId' });
          continue;
        }
        
        const apiPayload = {
          org: orgInput?.value.trim() || '',
          inventoryMovementId: update.inventoryMovementId,
          finalOrderQty: update.quantity
        };
        
        logToConsole(`\n=== Updating item ${update.itemId} ===`, 'info');
        logToConsole(`Action: save-suggested-order-line`, 'info');
        logToConsole(`Endpoint: /aiui-facade/api/aiui-facade/view/save/com-manh-cp-aiui-facade/SuggestedOrderLine`, 'info');
        logToConsole(`Request Payload:`, 'info');
        logToConsole(JSON.stringify(apiPayload, null, 2), 'info');
        logToConsole(`Backend will send payload:`, 'info');
        const backendUpdatePayload = {
          InventoryMovementId: update.inventoryMovementId,
          FinalOrderQty: update.quantity
        };
        logToConsole(JSON.stringify(backendUpdatePayload, null, 2), 'info');
        logToConsole(`  InventoryMovementId: ${update.inventoryMovementId}`, 'info');
        logToConsole(`  FinalOrderQty: ${update.quantity} (was ${update.initialQuantity})`, 'info');
        
        const res = await api('save-suggested-order-line', apiPayload);
        
        logToConsole(`\nAPI Response:`, 'info');
        logToConsole(JSON.stringify(res, null, 2), res.success ? 'success' : 'error');
        logToConsole('=== End Update API Call ===\n', 'info');
        
        if (res.success) {
          successCount++;
          logToConsole(`  ✓ Successfully updated item ${update.itemId}`, 'success');
        } else {
          errorCount++;
          const errorMsg = res.error || 'Unknown error';
          errors.push({ itemId: update.itemId, error: errorMsg });
          logToConsole(`  ✗ Failed to update item ${update.itemId}: ${errorMsg}`, 'error');
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error.message || 'Unknown error';
        errors.push({ itemId: update.itemId, error: errorMsg });
        logToConsole(`  ✗ Error updating item ${update.itemId}: ${errorMsg}`, 'error');
        logToConsole(`  Error stack: ${error.stack}`, 'error');
      }
    }
    
    logToConsole(`\n=== Updates Complete: ${successCount} success, ${errorCount} errors ===`, successCount === updatesToProcess.length ? 'success' : 'error');
    
    // Update initial quantities to current for successfully updated items with qty > 0
    if (successCount > 0) {
      updatesToProcess.forEach(update => {
        if (!errors.find(e => e.itemId === update.itemId)) {
          const card = Array.from(itemCards).find(c => c.getAttribute('data-item-id') === update.itemId);
          if (card) {
            card.setAttribute('data-initial-quantity', update.quantity);
          }
        }
      });
    }
    
    // Now process items with qty = 0 (clear API)
    if (updatesToClear.length > 0) {
      logToConsole(`\n=== Clearing ${updatesToClear.length} item(s) with qty = 0 ===`, 'info');
      
      for (const update of updatesToClear) {
        try {
          if (!update.itemId) {
            logToConsole(`Skipping clear: missing ItemId`, 'error');
            clearErrorCount++;
            clearErrors.push({ itemId: update.itemId || 'unknown', error: 'Missing ItemId' });
            continue;
          }
          
          const clearApiPayload = {
            org: orgInput?.value.trim() || '',
            itemId: update.itemId,
            sourceLocationId: sourceLocationId,
            locationId: locationId
          };
          
          logToConsole(`\n=== Clearing item ${update.itemId} ===`, 'info');
          logToConsole(`Action: clear-soq`, 'info');
          logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/clearSOQ`, 'info');
          logToConsole(`Request Payload:`, 'info');
          logToConsole(JSON.stringify(clearApiPayload, null, 2), 'info');
          logToConsole(`Backend will send payload:`, 'info');
          const backendClearPayload = {
            ItemId: update.itemId,
            SourceLocationId: sourceLocationId,
            LocationId: locationId
          };
          logToConsole(JSON.stringify(backendClearPayload, null, 2), 'info');
          logToConsole(`  ItemId: ${update.itemId}`, 'info');
          logToConsole(`  LocationId: ${locationId}`, 'info');
          logToConsole(`  SourceLocationId: ${sourceLocationId}`, 'info');
          
          const clearRes = await api('clear-soq', clearApiPayload);
          
          logToConsole(`\nAPI Response:`, 'info');
          logToConsole(JSON.stringify(clearRes, null, 2), clearRes.success ? 'success' : 'error');
          logToConsole('=== End Clear API Call ===\n', 'info');
          
          if (clearRes.success) {
            clearSuccessCount++;
            logToConsole(`  ✓ Successfully cleared item ${update.itemId}`, 'success');
          } else {
            clearErrorCount++;
            const errorMsg = clearRes.error || 'Unknown error';
            clearErrors.push({ itemId: update.itemId, error: errorMsg });
            logToConsole(`  ✗ Failed to clear item ${update.itemId}: ${errorMsg}`, 'error');
          }
        } catch (error) {
          clearErrorCount++;
          const errorMsg = error.message || 'Unknown error';
          clearErrors.push({ itemId: update.itemId, error: errorMsg });
          logToConsole(`  ✗ Error clearing item ${update.itemId}: ${errorMsg}`, 'error');
          logToConsole(`  Error stack: ${error.stack}`, 'error');
        }
      }
      
      logToConsole(`\n=== Clears Complete: ${clearSuccessCount} success, ${clearErrorCount} errors ===`, clearSuccessCount === updatesToClear.length ? 'success' : 'error');
      
      // Update initial quantities to 0 for successfully cleared items
      if (clearSuccessCount > 0) {
        updatesToClear.forEach(update => {
          if (!clearErrors.find(e => e.itemId === update.itemId)) {
            const card = Array.from(itemCards).find(c => c.getAttribute('data-item-id') === update.itemId);
            if (card) {
              card.setAttribute('data-initial-quantity', 0);
            }
          }
        });
      }
    }
    
    logToConsole(`\n=== Total Submission Complete ===`, 'info');
    const totalSuccess = successCount + clearSuccessCount;
    const totalErrors = errorCount + clearErrorCount;
    logToConsole(`Total Success: ${totalSuccess} | Total Errors: ${totalErrors}`, totalErrors === 0 ? 'success' : 'error');
    
    if (errors.length > 0 || clearErrors.length > 0) {
      logToConsole(`\nAll Errors:`, 'error');
      logToConsole(JSON.stringify([...errors, ...clearErrors], null, 2), 'error');
    }
    
    // Show completion modal
    const totalUpdated = totalSuccess;
    showSubmissionModal(totalUpdated, totalErrors);
    
    // Re-enable Release Order button after successful submission (only if all updates succeeded)
    if (totalErrors === 0) {
      checkPendingChanges(); // This will re-enable the button since quantities match now
    }
    
    // Refresh pages if ANY updates were successful (regardless of errors)
    if (totalSuccess > 0) {
      // Refresh order status by calling search API again if we're on the Suggested Orders page
      if (suggestedOrdersSection && suggestedOrdersSection.style.display !== 'none') {
        // Check if we're currently viewing the orders page
        const isOrdersPageVisible = suggestedOrdersSection.style.display === 'block';
        
        if (isOrdersPageVisible && storeId) {
          // Removed: status('Refreshing order status...', 'info');
          logToConsole(`\n=== Refreshing Order Status ===`, 'info');
          
          try {
            const refreshPayload = {
              org: orgInput?.value.trim() || '',
              storeId: storeId
            };
            
            logToConsole(`Action: search-inventory-movement-summary (refresh)`, 'info');
            logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovementSummary/search`, 'info');
            logToConsole(`Request Payload:`, 'info');
            logToConsole(JSON.stringify(refreshPayload, null, 2), 'info');
            
            const refreshRes = await api('search-inventory-movement-summary', refreshPayload);
            
            logToConsole(`\nRefresh API Response:`, 'info');
            logToConsole(JSON.stringify(refreshRes, null, 2), refreshRes.success ? 'success' : 'error');
            logToConsole('=== End Refresh API Call ===\n', 'info');
            
            if (refreshRes.success && refreshRes.orders) {
              const refreshedOrders = refreshRes.orders || [];
              logToConsole(`Refreshed ${refreshedOrders.length} order(s)`, 'success');
              
              // Re-render order cards with updated status
              if (ordersContainer) {
                renderOrderCards(refreshedOrders);
                // Removed: status('Order status updated', 'success');
              }
            } else {
              logToConsole(`Failed to refresh order status: ${refreshRes.error || 'Unknown error'}`, 'error');
            }
          } catch (error) {
            logToConsole(`Error refreshing order status: ${error.message}`, 'error');
            logToConsole(`Error stack: ${error.stack}`, 'error');
            // Don't show error to user, just log it
          }
        }
      }
      
      // Refresh items page after 1 second (if on Items Page)
      if (inventoryMovementSection && inventoryMovementSection.style.display === 'block') {
        const isItemsPageVisible = inventoryMovementSection.style.display === 'block';
        
        if (isItemsPageVisible && storeId) {
          // Get sourceLocationId and locationId from movementsContainer
          const itemsSourceLocationId = movementsContainer?.getAttribute('data-source-location-id');
          const itemsLocationId = movementsContainer?.getAttribute('data-location-id');
          
          if (itemsSourceLocationId && itemsLocationId) {
            // Wait 1 second before refreshing
            setTimeout(async () => {
              logToConsole(`\n=== Refreshing Items Page ===`, 'info');
              
              try {
                // Refresh the items by calling search-inventory-movement API
                const refreshItemsPayload = {
                  org: orgInput?.value.trim() || '',
                  sourceLocationId: itemsSourceLocationId,
                  locationId: itemsLocationId
                };
                
                logToConsole(`Action: search-inventory-movement (refresh)`, 'info');
                logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovement/search`, 'info');
                logToConsole(`Request Payload:`, 'info');
                logToConsole(JSON.stringify(refreshItemsPayload, null, 2), 'info');
                
                const refreshItemsRes = await api('search-inventory-movement', refreshItemsPayload);
                
                logToConsole(`\nRefresh Items API Response:`, 'info');
                logToConsole(JSON.stringify(refreshItemsRes, null, 2), refreshItemsRes.success ? 'success' : 'error');
                logToConsole('=== End Refresh Items API Call ===\n', 'info');
                
                if (refreshItemsRes.success && refreshItemsRes.movements) {
                  const refreshedMovements = refreshItemsRes.movements || [];
                  logToConsole(`Refreshed ${refreshedMovements.length} item(s)`, 'success');
                  
                  // Collect all unique item IDs for image lookup
                  const itemIds = [...new Set(refreshedMovements.map(m => m.ItemId).filter(id => id))];
                  
                  // Fetch item images if we have item IDs
                  let imageMap = {};
                  if (itemIds.length > 0) {
                    try {
                      const imageApiPayload = {
                        org: orgInput?.value.trim() || '',
                        itemIds: itemIds
                      };
                      
                      const imageRes = await api('search-item-images', imageApiPayload);
                      
                      if (imageRes.success && imageRes.imageMap) {
                        imageMap = imageRes.imageMap;
                        logToConsole(`Loaded images for ${Object.keys(imageMap).length} item(s)`, 'success');
                      }
                    } catch (error) {
                      logToConsole(`Error loading item images: ${error.message}`, 'error');
                    }
                  }
                  
                  // Sort movements by Quantity (Descending) and ItemId (Ascending)
                  const sortedMovements = [...refreshedMovements].sort((a, b) => {
                    const qtyA = parseFloat(a.FinalOrderUnits || a.FinalOrderQty || 0);
                    const qtyB = parseFloat(b.FinalOrderUnits || b.FinalOrderQty || 0);
                    const itemIdA = a.ItemId || '';
                    const itemIdB = b.ItemId || '';
                    
                    // First sort by Quantity (Descending)
                    if (qtyB !== qtyA) {
                      return qtyB - qtyA;
                    }
                    
                    // Then sort by ItemId (Ascending)
                    return itemIdA.localeCompare(itemIdB);
                  });
                  
                  // Re-render movement cards with updated data
                  renderMovementCards(sortedMovements, imageMap);
                  
                  // Also refresh order status from orders summary
                  const refreshOrderStatusPayload = {
                    org: orgInput?.value.trim() || '',
                    storeId: storeId
                  };
                  
                  logToConsole(`Action: search-inventory-movement-summary (refresh for Items Page)`, 'info');
                  logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovementSummary/search`, 'info');
                  logToConsole(`Request Payload:`, 'info');
                  logToConsole(JSON.stringify(refreshOrderStatusPayload, null, 2), 'info');
                  
                  const refreshOrderStatusRes = await api('search-inventory-movement-summary', refreshOrderStatusPayload);
                  
                  logToConsole(`\nRefresh Order Status API Response:`, 'info');
                  logToConsole(JSON.stringify(refreshOrderStatusRes, null, 2), refreshOrderStatusRes.success ? 'success' : 'error');
                  logToConsole('=== End Refresh Order Status API Call ===\n', 'info');
                  
                  if (refreshOrderStatusRes.success && refreshOrderStatusRes.orders) {
                    const refreshedOrders = refreshOrderStatusRes.orders || [];
                    
                    // Find the matching order by sourceLocationId and locationId
                    const matchingOrder = refreshedOrders.find(order => {
                      const orderSourceLocationId = order.SourceLocationId || '';
                      const orderLocationId = order.LocationId || '';
                      return orderSourceLocationId === itemsSourceLocationId && orderLocationId === itemsLocationId;
                    });
                    
                    if (matchingOrder) {
                      const newOrderStatus = matchingOrder.OrderStatus?.OrderStatusId || matchingOrder.OrderStatus || '';
                      logToConsole(`Found matching order with status: ${newOrderStatus}`, 'success');
                      
                      // Update Order Status in header
                      const itemsHeaderOrderStatus = document.getElementById('itemsHeaderOrderStatus');
                      if (itemsHeaderOrderStatus && newOrderStatus) {
                        itemsHeaderOrderStatus.textContent = newOrderStatus;
                      }
                      
                      // Update data attribute for future use
                      if (movementsContainer && newOrderStatus) {
                        movementsContainer.setAttribute('data-order-status', newOrderStatus);
                      }
                    }
                  }
                } else {
                  logToConsole(`Failed to refresh items: ${refreshItemsRes.error || 'Unknown error'}`, 'error');
                }
              } catch (error) {
                logToConsole(`Error refreshing items page: ${error.message}`, 'error');
                logToConsole(`Error stack: ${error.stack}`, 'error');
                // Don't show error to user, just log it
              }
            }, 1000); // Wait 1 second before refreshing
          }
        }
      }
    } // End if (totalSuccess > 0)
  });
}

// Release Order button handler
if (releaseOrderBtn) {
  releaseOrderBtn.addEventListener('click', async () => {
    if (!movementsContainer) return;
    
    // Get sourceLocationId, locationId, and orderStatus from movementsContainer data attributes
    const sourceLocationId = movementsContainer?.getAttribute('data-source-location-id');
    const locationId = movementsContainer?.getAttribute('data-location-id');
    const orderStatus = movementsContainer?.getAttribute('data-order-status') || '';
    
    if (!sourceLocationId || !locationId) {
      status('Missing location information for release', 'error');
      logToConsole('Error: SourceLocationId and LocationId required for release API', 'error');
      return;
    }
    
    // Confirm release
    const confirmed = confirm(`Are you sure you want to release the order?\n\nStore: ${locationId}\nSource: ${sourceLocationId}`);
    if (!confirmed) {
      return;
    }
    
    // Only call review API if order status is "Suggested"
    let reviewSuccess = true; // Default to true if review is not needed
    if (orderStatus === 'Suggested') {
      // Removed: status('Starting review...', 'info');
      logToConsole(`\n=== Review Inventory Movement (Before Release) ===`, 'info');
      logToConsole(`Action: review-inventory-movement`, 'info');
      logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/review`, 'info');
      logToConsole(`Request Payload:`, 'info');
      const reviewPayload = {
        org: orgInput?.value.trim() || '',
        sourceLocationId: sourceLocationId,
        locationId: locationId
      };
      logToConsole(JSON.stringify(reviewPayload, null, 2), 'info');
      logToConsole(`Backend will send payload:`, 'info');
      const backendReviewPayload = {
        ItemId: null,
        SourceLocationId: sourceLocationId,
        LocationId: locationId,
        RelationType: "Regular",
        BracketId: null,
        executeBracket: false,
        CancelReview: false,
        StartReview: true,
        UseLatest: false
      };
      logToConsole(JSON.stringify(backendReviewPayload, null, 2), 'info');
      
      // Call review API
      try {
        const reviewRes = await api('review-inventory-movement', reviewPayload);
        
        logToConsole(`\nReview API Response:`, 'info');
        logToConsole(JSON.stringify(reviewRes, null, 2), reviewRes.success ? 'success' : 'error');
        logToConsole('=== End Review API Call ===\n', 'info');
        
        if (!reviewRes.success) {
          status(`Review failed: ${reviewRes.error || 'Unknown error'}`, 'error');
          logToConsole(`Review API failed: ${reviewRes.error || 'Unknown error'}`, 'error');
          return;
        }
        
        reviewSuccess = true;
        logToConsole('Review API succeeded, proceeding with release', 'success');
      } catch (error) {
        status(`Review error: ${error.message}`, 'error');
        logToConsole(`Review API error: ${error.message}`, 'error');
        logToConsole(`Error stack: ${error.stack}`, 'error');
        return;
      }
    } else {
      logToConsole(`\nSkipping Review API - Order status is "${orderStatus}", not "Suggested"`, 'info');
      logToConsole('Proceeding directly with release', 'info');
    }
    
    if (!reviewSuccess) {
      return;
    }
    
    // Removed: status('Releasing order...', 'info');
    logToConsole(`\n=== Release Order ===`, 'info');
    logToConsole(`Action: approve-inventory-movement`, 'info');
    logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/approve`, 'info');
    logToConsole(`Request Payload:`, 'info');
    const approvePayload = {
      org: orgInput?.value.trim() || '',
      sourceLocationId: sourceLocationId,
      locationId: locationId
    };
    logToConsole(JSON.stringify(approvePayload, null, 2), 'info');
    logToConsole(`Backend will send payload:`, 'info');
    const backendApprovePayload = {
      LocationId: locationId,
      SourceLocationId: sourceLocationId,
      RelationType: "Regular"
    };
    logToConsole(JSON.stringify(backendApprovePayload, null, 2), 'info');
    
    try {
      const approveRes = await api('approve-inventory-movement', approvePayload);
      
      logToConsole(`\nRelease API Response:`, 'info');
      logToConsole(JSON.stringify(approveRes, null, 2), approveRes.success ? 'success' : 'error');
      logToConsole('=== End Release API Call ===\n', 'info');
      
      // Show completion modal with success or error message
      if (approveRes.success) {
        showReleaseOrderModal(true, 'Order released successfully');
      } else {
        const errorMsg = approveRes.error || 'Unknown error';
        showReleaseOrderModal(false, errorMsg);
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      logToConsole(`Release API error: ${error.message}`, 'error');
      logToConsole(`Error stack: ${error.stack}`, 'error');
      showReleaseOrderModal(false, errorMsg);
    }
  });
}

// Check for pending changes and update Release Order button state
function checkPendingChanges() {
  if (!movementsContainer || !releaseOrderBtn) return;
  
  const itemCards = movementsContainer.querySelectorAll('.item-card');
  let hasPendingChanges = false;
  
  itemCards.forEach(card => {
    const currentQuantity = parseFloat(card.getAttribute('data-current-quantity')) || 0;
    const initialQuantity = parseFloat(card.getAttribute('data-initial-quantity')) || 0;
    
    if (currentQuantity !== initialQuantity) {
      hasPendingChanges = true;
    }
  });
  
  // Disable Release Order button if there are pending changes
  if (hasPendingChanges) {
    releaseOrderBtn.disabled = true;
    releaseOrderBtn.style.opacity = '0.5';
    releaseOrderBtn.style.cursor = 'not-allowed';
  } else {
    releaseOrderBtn.disabled = false;
    releaseOrderBtn.style.opacity = '1';
    releaseOrderBtn.style.cursor = 'pointer';
  }
}

// Show submission completion modal
function showSubmissionModal(updatedCount, errorCount) {
  const modalEl = document.getElementById('submissionModal');
  const messageEl = document.getElementById('submissionModalMessage');
  
  if (!modalEl || !messageEl) return;
  
  let message = '';
  if (errorCount === 0) {
    message = `Successfully updated ${updatedCount} line(s).`;
  } else {
    message = `Updated ${updatedCount} line(s) with ${errorCount} error(s). Check console for details.`;
  }
  
  messageEl.textContent = message;
  
  // Show modal using Bootstrap
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Show Release Order completion modal
function showReleaseOrderModal(success, message) {
  const modalEl = document.getElementById('releaseOrderModal');
  const titleEl = document.getElementById('releaseOrderModalTitle');
  const messageEl = document.getElementById('releaseOrderModalMessage');
  const okBtn = document.getElementById('releaseOrderModalOkBtn');
  
  if (!modalEl || !messageEl) return;
  
  // Set title and message
  if (titleEl) {
    titleEl.textContent = success ? 'Release Order - Success' : 'Release Order - Error';
  }
  messageEl.textContent = message;
  
  // Show modal using Bootstrap
  const modal = new bootstrap.Modal(modalEl);
  
  // Set up OK button handler to navigate back and refresh
  if (okBtn) {
    // Remove any existing event listeners by cloning and replacing
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    
    newOkBtn.addEventListener('click', async () => {
      modal.hide();
      
      // Navigate back to Suggested Orders screen
      if (inventoryMovementSection) {
        inventoryMovementSection.style.display = 'none';
      }
      if (suggestedOrdersSection) {
        suggestedOrdersSection.style.display = 'block';
      }
      
      // Clear status messages when navigating
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'status';
      }
      
      // Keep main title hidden when showing orders
      const mainTitle = document.getElementById('mainTitle');
      if (mainTitle) {
        mainTitle.style.display = 'none';
      }
      
      // Show storeHeaderCards on Suggested Orders page (Store and Department)
      const storeHeaderCards = document.getElementById('storeHeaderCards');
      if (storeHeaderCards && storeId) {
        storeHeaderCards.style.display = 'block';
      }
      
      // Show Back button (changeStoreBtnCards) when returning to Suggested Orders page
      if (changeStoreBtnCards) {
        changeStoreBtnCards.style.display = 'block';
      }
      
      // Wait 1 second, then refresh the Suggested Orders by calling the API again
      setTimeout(async () => {
        if (storeId) {
          // Removed: status('Refreshing orders...', 'info');
          logToConsole(`\n=== Refreshing Orders After Release ===`, 'info');
          
          try {
            const refreshPayload = {
              org: orgInput?.value.trim() || '',
              storeId: storeId
            };
            
            logToConsole(`Action: search-inventory-movement-summary (refresh)`, 'info');
            logToConsole(`Endpoint: /ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovementSummary/search`, 'info');
            logToConsole(`Request Payload:`, 'info');
            logToConsole(JSON.stringify(refreshPayload, null, 2), 'info');
            
            const refreshRes = await api('search-inventory-movement-summary', refreshPayload);
            
            logToConsole(`\nRefresh API Response:`, 'info');
            logToConsole(JSON.stringify(refreshRes, null, 2), refreshRes.success ? 'success' : 'error');
            logToConsole('=== End Refresh API Call ===\n', 'info');
            
            if (refreshRes.success && refreshRes.orders) {
              const refreshedOrders = refreshRes.orders || [];
              logToConsole(`Refreshed ${refreshedOrders.length} order(s)`, 'success');
              
              // Clear and re-render order cards with updated status
              if (ordersContainer) {
                ordersContainer.innerHTML = '';
                renderOrderCards(refreshedOrders);
                // Removed: status('Orders refreshed', 'success');
              }
            } else {
              logToConsole(`Failed to refresh orders: ${refreshRes.error || 'Unknown error'}`, 'error');
              status(`Failed to refresh orders: ${refreshRes.error || 'Unknown error'}`, 'error');
            }
          } catch (error) {
            logToConsole(`Error refreshing orders: ${error.message}`, 'error');
            logToConsole(`Error stack: ${error.stack}`, 'error');
            status(`Error refreshing orders: ${error.message}`, 'error');
          }
        }
      }, 1000); // Wait 1 second before refreshing
    });
  }
  
  modal.show();
}

// Auto-authenticate if Organization or ORG parameter is provided in URL
window.addEventListener('load', async () => {
  // Track app opened
  await trackEvent('app_opened', {});
  
  try {
    await api('app_opened', { org: urlOrg || '' });
  } catch (err) {
    // Silently fail - don't interrupt user experience
  }
  
  // Hide console if Console=N parameter is provided
  if (urlConsole && urlConsole.toUpperCase() === 'N') {
    if (consoleSection) {
      consoleSection.style.display = 'none';
    }
    if (consoleToggleContainer) {
      consoleToggleContainer.style.display = 'none';
    }
  }
  
  // Auto-authenticate if Organization or ORG parameter is provided in URL
  if (urlOrg) {
    // Auth section already hidden when URL parameter is present
    // Auto-authenticate in background (auth section will be shown on failure)
    const authSuccess = await authenticate();
    if (!authSuccess) {
      // Auth failed - show auth section again and hide other sections
      const authSection = document.getElementById('authSection');
      if (authSection) {
        authSection.style.display = 'block';
      }
      if (storeIdSection) {
        storeIdSection.style.display = 'none';
      }
      if (cardsSection) {
        cardsSection.style.display = 'none';
      }
      // Keep logo visible on ORG and Store prompt pages
      if (logoContainer) {
        logoContainer.style.display = 'block';
      }
      if (consoleSection && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
        consoleSection.style.display = 'none';
      }
      if (consoleToggleContainer && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
        consoleToggleContainer.style.display = 'none';
      }
      orgInput?.focus();
    } else if (urlStore) {
      // Auto-validate store if Store parameter is present
      // Show logo on Store prompt page
      if (logoContainer) {
        logoContainer.style.display = 'block';
      }
      if (storeIdInput) {
        storeIdInput.value = urlStore.trim();
        storeId = urlStore.trim();
        
        // Validate and load store
        const storeValidated = await submitStoreId();
        if (!storeValidated) {
          status('Invalid Store', 'error');
        }
      }
    }
  } else {
    // No URL parameter - show auth section, hide other sections
    const authSection = document.getElementById('authSection');
    if (authSection) {
      authSection.style.display = 'block';
    }
    
    // Show main title, hide store header
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) {
      mainTitle.textContent = 'SCP Mobile';
      mainTitle.style.display = 'block';
    }
    const storeHeaderCards = document.getElementById('storeHeaderCards');
    if (storeHeaderCards) {
      storeHeaderCards.style.display = 'none';
    }
    
    if (storeIdSection) {
      storeIdSection.style.display = 'none';
    }
    if (cardsSection) {
      cardsSection.style.display = 'none';
    }
    if (logoContainer) {
      logoContainer.style.display = 'none';
    }
    if (consoleSection && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
      consoleSection.style.display = 'none';
    }
    if (consoleToggleContainer && (!urlConsole || urlConsole.toUpperCase() !== 'N')) {
      consoleToggleContainer.style.display = 'none';
    }
    orgInput?.focus();
  }
});

// Console toggle functionality
if (consoleToggleBtn) {
  consoleToggleBtn.addEventListener('click', () => {
    // Don't toggle console if Console=N is set
    if (urlConsole && urlConsole.toUpperCase() === 'N') {
      return;
    }
    if (consoleSection) {
      const isHidden = consoleSection.style.display === 'none' || !consoleSection.style.display;
      consoleSection.style.display = isHidden ? 'block' : 'none';
    }
  });
}

if (consoleCloseBtn) {
  consoleCloseBtn.addEventListener('click', () => {
    if (consoleSection) {
      consoleSection.style.display = 'none';
    }
  });
}

// Helper function to update red shading on file input textbox
function updateFileInputShading(element, isEmpty) {
  if (!element) return;
  if (isEmpty || !element.value || element.value.trim() === '') {
    // Apply red shading when empty
    element.style.setProperty('background-color', 'rgba(255, 0, 0, 0.1)', 'important');
    element.style.setProperty('border-color', 'rgba(255, 0, 0, 0.3)', 'important');
  } else {
    // Remove red shading when has value
    element.style.setProperty('background-color', '', 'important');
    element.style.setProperty('border-color', '', 'important');
  }
}

// Function to set forecast file status message
function setForecastFileStatus(text) {
  if (forecastFileStatus) {
    forecastFileStatus.textContent = text || '';
  }
}

// Helper function to check if first cell is a header (Item ID, ItemId, or Item_id)
function isHeaderRow(firstCell) {
  if (!firstCell) return false;
  const normalized = String(firstCell).trim().toLowerCase();
  return normalized === 'item id' || normalized === 'itemid' || normalized === 'item_id';
}

// Helper function to check if first cell is a location header (Location ID, LocationId, or Location_id)
function isLocationHeaderRow(firstCell) {
  if (!firstCell) return false;
  const normalized = String(firstCell).trim().toLowerCase();
  return normalized === 'location id' || normalized === 'locationid' || normalized === 'location_id';
}

// Validate forecast file (simple validation - just check extension and if not empty)
async function validateForecastFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  const extension = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xls', 'xlsx', 'txt'].includes(extension)) {
    return { valid: false, error: 'File must be a CSV, Excel, or TXT file (.csv, .xls, .xlsx, .txt)' };
  }

  try {
    let rows = [];
    
    if (extension === 'csv' || extension === 'txt') {
      const text = await file.text();
      rows = text.split(/\r?\n/).map(line => {
        // Parse CSV line (handle quoted values)
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      }).filter(row => row.some(cell => cell.length > 0)); // Filter empty rows
    } else {
      // Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      rows = rows.map(row => Array.isArray(row) ? row.map(cell => String(cell || '').trim()) : []);
      rows = rows.filter(row => row.some(cell => cell.length > 0)); // Filter empty rows
    }

    if (rows.length === 0) {
      return { valid: false, error: 'File is empty or contains no data rows' };
    }

    // Check if first row is a header row (cell A1 contains Item ID, ItemId, or Item_id)
    const hasHeader = rows.length > 0 && isHeaderRow(rows[0][0]);
    const rowCount = hasHeader ? rows.length - 1 : rows.length;

    return { valid: true, rowCount: rowCount, hasHeader: hasHeader };
  } catch (error) {
    return { valid: false, error: `Error reading file: ${error.message}` };
  }
}

// Parse forecast file to get row count
async function parseForecastFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  let rows = [];
  let headerDetected = false;
  let headerRow = null;

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      // Parse CSV line (handle quoted values)
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      
      // Check if first row is a header row (cell A1 contains Item ID, ItemId, or Item_id)
      if (index === 0 && result.length > 0 && isHeaderRow(result[0])) {
        headerDetected = true;
        headerRow = result; // Store header row
        return; // Skip header row from data
      }
      if (result.some(cell => cell.length > 0)) {
        rows.push(result);
      }
    });
  } else {
    // Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const excelRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    excelRows.forEach((row, index) => {
      const rowArray = Array.isArray(row) ? row.map(cell => String(cell || '').trim()) : [];
      // Check if first row is a header row (cell A1 contains Item ID, ItemId, or Item_id)
      if (index === 0 && rowArray.length > 0 && isHeaderRow(rowArray[0])) {
        headerDetected = true;
        headerRow = rowArray; // Store header row
        return; // Skip header row from data
      }
      if (rowArray.some(cell => cell.length > 0)) {
        rows.push(rowArray);
      }
    });
  }

  return { rows, headerDetected, headerRow };
}

// Forecast file picker button (legacy - file upload removed)
if (typeof forecastFileLoadBtn !== 'undefined' && forecastFileLoadBtn && typeof forecastFileInput !== 'undefined' && forecastFileInput) {
  forecastFileLoadBtn.addEventListener('click', () => {
    forecastFileInput.click();
  });
}

// Forecast file change handler (legacy - file upload removed)
if (typeof forecastFileInput !== 'undefined' && forecastFileInput) {
  forecastFileInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) {
      forecastFileData = null;
      setForecastFileStatus('');
      if (forecastFileDisplay) {
        forecastFileDisplay.value = '';
        updateFileInputShading(forecastFileDisplay, true);
      }
      return;
    }
    
    const file = e.target.files[0];
    const fileName = file.name;
    
    // Validate file format before loading
    const validation = await validateForecastFile(file);
    
    if (!validation.valid) {
      // Show error message
      setForecastFileStatus('');
      
      if (forecastFileDisplay) {
        forecastFileDisplay.value = '';
        forecastFileDisplay.removeAttribute('title');
      // Restore red shading to indicate file needs to be loaded
      updateFileInputShading(forecastFileDisplay, true);
      }
      
      // Clear forecast file data
      forecastFileData = null;
      forecastFileHeader = null;
      e.target.value = '';
      alert(`Invalid file format: ${validation.error}`);
      return;
    }
    
    // File is valid, parse and store data
    try {
      const parseResult = await parseForecastFile(file);
      forecastFileData = parseResult.rows;
      forecastFileHeader = parseResult.headerRow || null;
      const headerDetected = parseResult.headerDetected;
      
      // Update display textbox - show only filename
      if (forecastFileDisplay) {
        forecastFileDisplay.value = fileName;
        forecastFileDisplay.title = fileName; // Tooltip shows filename on hover
        // Remove red shading when file is loaded
        updateFileInputShading(forecastFileDisplay, false);
      }
      
      // Use validation count if available, otherwise use parsed rows count
      const itemCount = validation.rowCount || forecastFileData.length;
      const statusMessage = itemCount > 0
        ? headerDetected
          ? `${itemCount} items loaded (header row detected and skipped)`
          : `${itemCount} items loaded`
        : 'No data rows detected.';
      setForecastFileStatus(statusMessage);
      
      // Log to console
      if (headerDetected) {
        logToConsole(`Forecast file: Header row detected and skipped (${itemCount} data rows)`, 'info');
      } else {
        logToConsole(`Forecast file: ${itemCount} items loaded from file`, 'success');
      }
      
      // Print file contents to console (including header)
      const extension = file.name.split('.').pop().toLowerCase();
      const fileType = extension === 'csv' || extension === 'txt' ? (extension === 'txt' ? 'TXT' : 'CSV') : 'Excel';
      printFileContentsToConsole(forecastFileData, fileName, fileType, forecastFileHeader);
      
      // Track file loaded event
      await trackEvent('forecast_file_loaded', {
        org: orgInput.value.trim() || 'unknown',
        filename: fileName,
        file_type: fileType,
        item_count: itemCount,
        has_header: headerDetected
      });
      
      // Clear the file input value so the same file can be reloaded
      e.target.value = '';
    } catch (error) {
      // File parsing failed - show error and restore red shading
      setForecastFileStatus('');
      
      if (forecastFileDisplay) {
        forecastFileDisplay.value = '';
        forecastFileDisplay.removeAttribute('title');
        // Restore red shading to indicate file needs to be loaded
        updateFileInputShading(forecastFileDisplay, true);
      }
      
      // Clear forecast file data
      forecastFileData = null;
      forecastFileHeader = null;
      e.target.value = '';
      const errorMsg = error.message || 'Failed to parse file. Please ensure the file is a valid CSV, Excel, or TXT file.';
      await trackEvent('file_load_failed', {
        org: orgInput.value.trim() || 'unknown',
        filename: fileName || 'unknown',
        file_type: file ? (file.name.split('.').pop().toLowerCase() === 'txt' ? 'TXT' : file.name.split('.').pop().toLowerCase() === 'csv' ? 'CSV' : 'Excel') : 'unknown',
        error: errorMsg
      });
      alert(`Error loading file: ${errorMsg}`);
    }
  });
}

// Initialize file input shading on load
if (forecastFileDisplay) {
  updateFileInputShading(forecastFileDisplay, true);
}
if (locationFileDisplay) {
  updateFileInputShading(locationFileDisplay, true);
}

// Function to print file contents to console (including header if present)
function printFileContentsToConsole(rows, fileName, fileType = 'CSV', headerRow = null) {
  if (!consoleEl) return;
  
  logToConsole(`\n=== ${fileName} (${fileType}) ===`, 'info');
  
  // Count data rows (excluding header)
  const dataRowCount = headerRow ? rows.length : rows.length;
  logToConsole(`Total rows: ${dataRowCount}`, 'info');
  
  if (headerRow) {
    logToConsole('---', 'info');
    const headerStr = Array.isArray(headerRow) ? headerRow.join(', ') : String(headerRow);
    logToConsole(`Header: ${headerStr}`, 'info');
  }
  
  logToConsole('---', 'info');
  
  // Print first 50 rows to avoid overwhelming the console
  const maxRows = Math.min(50, rows.length);
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i];
    const rowStr = Array.isArray(row) ? row.join(', ') : String(row);
    logToConsole(`Row ${i + 1}: ${rowStr}`, 'info');
  }
  
  if (rows.length > maxRows) {
    logToConsole(`... (${rows.length - maxRows} more rows)`, 'info');
  }
  logToConsole('=== End of file ===\n', 'info');
}

// Function to set location file status message
function setLocationFileStatus(text) {
  if (locationFileStatus) {
    locationFileStatus.textContent = text || '';
  }
}

// Validate location file (checks for LocationId header)
async function validateLocationFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  const extension = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xls', 'xlsx', 'txt'].includes(extension)) {
    return { valid: false, error: 'File must be a CSV, Excel, or TXT file (.csv, .xls, .xlsx, .txt)' };
  }

  try {
    let rows = [];
    
    if (extension === 'csv' || extension === 'txt') {
      const text = await file.text();
      rows = text.split(/\r?\n/).map(line => {
        // Parse CSV line (handle quoted values)
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      }).filter(row => row.some(cell => cell.length > 0)); // Filter empty rows
    } else {
      // Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      rows = rows.map(row => Array.isArray(row) ? row.map(cell => String(cell || '').trim()) : []);
      rows = rows.filter(row => row.some(cell => cell.length > 0)); // Filter empty rows
    }

    if (rows.length === 0) {
      return { valid: false, error: 'File is empty or contains no data rows' };
    }

    // Check if first row is a header row (cell A1 contains Location ID, LocationId, or Location_id)
    const hasHeader = rows.length > 0 && isLocationHeaderRow(rows[0][0]);
    const rowCount = hasHeader ? rows.length - 1 : rows.length;

    return { valid: true, rowCount: rowCount, hasHeader: hasHeader };
  } catch (error) {
    return { valid: false, error: `Error reading file: ${error.message}` };
  }
}

// Parse location file (checks for LocationId header)
async function parseLocationFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  let rows = [];
  let headerDetected = false;
  let headerRow = null;

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      // Parse CSV line (handle quoted values)
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      
      // Check if first row is a header row (cell A1 contains Location ID, LocationId, or Location_id)
      if (index === 0 && result.length > 0 && isLocationHeaderRow(result[0])) {
        headerDetected = true;
        headerRow = result; // Store header row
        return; // Skip header row from data
      }
      if (result.some(cell => cell.length > 0)) {
        rows.push(result);
      }
    });
  } else {
    // Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const excelRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    excelRows.forEach((row, index) => {
      const rowArray = Array.isArray(row) ? row.map(cell => String(cell || '').trim()) : [];
      // Check if first row is a header row (cell A1 contains Location ID, LocationId, or Location_id)
      if (index === 0 && rowArray.length > 0 && isLocationHeaderRow(rowArray[0])) {
        headerDetected = true;
        headerRow = rowArray; // Store header row
        return; // Skip header row from data
      }
      if (rowArray.some(cell => cell.length > 0)) {
        rows.push(rowArray);
      }
    });
  }

  return { rows, headerDetected, headerRow };
}

// Console logging function
function logToConsole(message, type = 'info') {
  if (!consoleEl) return;
  const timestamp = new Date().toLocaleTimeString();
  const className = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
  consoleEl.innerHTML += `<span class="${className}">[${timestamp}] ${message}</span>\n`;
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
// Location file picker button (legacy - file upload removed)
if (typeof locationFileLoadBtn !== 'undefined' && locationFileLoadBtn && typeof locationFileInput !== 'undefined' && locationFileInput) {
  locationFileLoadBtn.addEventListener('click', () => {
    locationFileInput.click();
  });
}

// Location file change handler (legacy - file upload removed)
if (typeof locationFileInput !== 'undefined' && locationFileInput) {
  locationFileInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) {
      locationFileData = null;
      locationFileHeader = null;
      setLocationFileStatus('');
      if (locationFileDisplay) {
        locationFileDisplay.value = '';
        updateFileInputShading(locationFileDisplay, true);
      }
      return;
    }
    
    const file = e.target.files[0];
    const fileName = file.name;
    
    // Validate file format before loading
    const validation = await validateLocationFile(file);
    
    if (!validation.valid) {
      // Show error message
      setLocationFileStatus('');
      
      if (locationFileDisplay) {
        locationFileDisplay.value = '';
        locationFileDisplay.removeAttribute('title');
      // Restore red shading to indicate file needs to be loaded
      updateFileInputShading(locationFileDisplay, true);
      }
      
      // Clear location file data
      locationFileData = null;
      locationFileHeader = null;
      e.target.value = '';
      alert(`Invalid file format: ${validation.error}`);
      return;
    }
    
    // File is valid, parse and store data
    try {
      const parseResult = await parseLocationFile(file);
      locationFileData = parseResult.rows;
      locationFileHeader = parseResult.headerRow || null;
      const headerDetected = parseResult.headerDetected;
      
      // Update display textbox - show only filename
      if (locationFileDisplay) {
        locationFileDisplay.value = fileName;
        locationFileDisplay.title = fileName; // Tooltip shows filename on hover
        // Remove red shading when file is loaded
        updateFileInputShading(locationFileDisplay, false);
      }
      
      // Use validation count if available, otherwise use parsed rows count
      const locationCount = validation.rowCount || locationFileData.length;
      const statusMessage = locationCount > 0
        ? headerDetected
          ? `${locationCount} locations loaded (header row detected and skipped)`
          : `${locationCount} locations loaded`
        : 'No data rows detected.';
      setLocationFileStatus(statusMessage);
      
      // Log to console
      if (headerDetected) {
        logToConsole(`Location file: Header row detected and skipped (${locationCount} data rows)`, 'info');
      } else {
        logToConsole(`Location file: ${locationCount} locations loaded from file`, 'success');
      }
      
      // Print file contents to console (including header)
      const extension = file.name.split('.').pop().toLowerCase();
      const fileType = extension === 'csv' || extension === 'txt' ? (extension === 'txt' ? 'TXT' : 'CSV') : 'Excel';
      printFileContentsToConsole(locationFileData, fileName, fileType, locationFileHeader);
      
      // Track file loaded event
      await trackEvent('location_file_loaded', {
        org: orgInput.value.trim() || 'unknown',
        filename: fileName,
        file_type: fileType,
        location_count: locationCount,
        has_header: headerDetected
      });
      
      // Clear the file input value so the same file can be reloaded
      e.target.value = '';
    } catch (error) {
      // File parsing failed - show error and restore red shading
      setLocationFileStatus('');
      
      if (locationFileDisplay) {
        locationFileDisplay.value = '';
        locationFileDisplay.removeAttribute('title');
        // Restore red shading to indicate file needs to be loaded
        updateFileInputShading(locationFileDisplay, true);
      }
      
      // Clear location file data
      locationFileData = null;
      locationFileHeader = null;
      e.target.value = '';
      const errorMsg = error.message || 'Failed to parse file. Please ensure the file is a valid CSV, Excel, or TXT file.';
      await trackEvent('file_load_failed', {
        org: orgInput.value.trim() || 'unknown',
        filename: fileName || 'unknown',
        file_type: file ? (file.name.split('.').pop().toLowerCase() === 'txt' ? 'TXT' : file.name.split('.').pop().toLowerCase() === 'csv' ? 'CSV' : 'Excel') : 'unknown',
        error: errorMsg
      });
      alert(`Error loading file: ${errorMsg}`);
    }
  });
}

// Helper function to map CSV row to forecast API format
function mapForecastRowToAPI(row, headerRow) {
  // Postman collection fields:
  // - ForecastId: "{{Forecast ID}}" (string)
  // - ForecastLevel: {{Current Forecast}} (number, same as CurrentForecast)
  // - CurrentForecast: {{Current Forecast}} (number)
  // - ForecastFactors: array with ForecastLevel and CurrentForecast (both use {{Current Forecast}})
  
  let forecastData = {};
  
  if (headerRow && headerRow.length > 0) {
    // Map by header names
    const headerMap = {};
    headerRow.forEach((header, index) => {
      const normalized = String(header).trim().toLowerCase();
      headerMap[normalized] = index;
    });
    
    // Map fields based on header
    const getValue = (fieldNames) => {
      for (const fieldName of fieldNames) {
        const index = headerMap[fieldName.toLowerCase()];
        if (index !== undefined && row[index] !== undefined) {
          return String(row[index]).trim();
        }
      }
      return '';
    };
    
    const getNumberValue = (fieldNames) => {
      const value = getValue(fieldNames);
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };
    
    // ForecastId: Map from "Forecast ID" or "Item ID" variations
    forecastData.ForecastId = getValue([
      'Forecast ID', 'ForecastId', 'Forecast_id', 'forecastid', 'forecast id',
      'Item ID', 'ItemId', 'Item_id', 'itemid', 'item id',
      'ForecastID', 'ItemID'
    ]);
    
    // CurrentForecast: Map from "Current Forecast" variations
    forecastData.CurrentForecast = getNumberValue([
      'Current Forecast', 'CurrentForecast', 'Current_forecast', 'currentforecast', 'current forecast',
      'CurrentForecast', 'Forecast', 'forecast'
    ]);
    
    // ForecastLevel: Uses the same value as CurrentForecast (per Postman: {{Current Forecast}})
    forecastData.ForecastLevel = forecastData.CurrentForecast;
  } else {
    // Assume standard order: ForecastId (col 0), CurrentForecast (col 1)
    forecastData.ForecastId = row[0] || '';
    forecastData.CurrentForecast = parseFloat(row[1]) || 0;
    // ForecastLevel: Uses the same value as CurrentForecast (per Postman: {{Current Forecast}})
    forecastData.ForecastLevel = forecastData.CurrentForecast;
  }
  
  // Build ForecastFactors array (both fields use CurrentForecast value per Postman)
  forecastData.ForecastFactors = [
    {
      ForecastLevel: forecastData.CurrentForecast, // Uses CurrentForecast value ({{Current Forecast}})
      CurrentForecast: forecastData.CurrentForecast  // Uses CurrentForecast value ({{Current Forecast}})
    }
  ];
  
  return forecastData;
}

// Helper function to map CSV row to forecast projection API format
function mapForecastProjectionToAPI(row, headerRow, forecastData) {
  // Postman collection fields:
  // - ForecastId: "{{Forecast ID}}" (string, reuses from forecastData)
  // - PeriodStartDate: "{{Projection Start Date}}" (string)
  // - CurrentForecast: {{Current Forecast}} (number, reuses from forecastData)
  // - ManualForecastEventType: "User" (hardcoded)
  
  let projectionData = {
    ForecastId: forecastData.ForecastId,  // Reuses ForecastId from forecastData
    CurrentForecast: forecastData.CurrentForecast,  // Reuses CurrentForecast from forecastData
    ManualForecastEventType: 'User'  // Hardcoded as per Postman
  };
  
  // Try to get PeriodStartDate from the row
  if (headerRow && headerRow.length > 0) {
    const headerMap = {};
    headerRow.forEach((header, index) => {
      const normalized = String(header).trim().toLowerCase();
      headerMap[normalized] = index;
    });
    
    const getValue = (fieldNames) => {
      for (const fieldName of fieldNames) {
        const index = headerMap[fieldName.toLowerCase()];
        if (index !== undefined && row[index] !== undefined) {
          return String(row[index]).trim();
        }
      }
      return '';
    };
    
    // PeriodStartDate: Map from "Projection Start Date" variations
    projectionData.PeriodStartDate = getValue([
      'Projection Start Date', 'PeriodStartDate', 'Period Start Date', 'Period_start_date',
      'periodstartdate', 'projection start date', 'projectionstartdate',
      'StartDate', 'Start Date', 'startdate', 'start date',
      'PeriodStart', 'Period Start', 'periodstart', 'period start'
    ]);
  } else {
    // Assume PeriodStartDate is in column 2 (index 2) if available (after ForecastId and CurrentForecast)
    projectionData.PeriodStartDate = row[2] || '';
  }
  
  // If no PeriodStartDate found, use today's date as default
  if (!projectionData.PeriodStartDate) {
    const today = new Date();
    projectionData.PeriodStartDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  return projectionData;
}

// Upload Forecast button handler
if (uploadForecastBtn) {
  uploadForecastBtn.addEventListener('click', async () => {
    if (!forecastFileData || forecastFileData.length === 0) {
      logToConsole('Error: No forecast file loaded', 'error');
      status('Please load a forecast file first', 'error');
      return;
    }
    
    if (!token) {
      logToConsole('Error: Not authenticated', 'error');
      status('Please authenticate first', 'error');
      return;
    }
    
    const org = orgInput.value.trim();
    if (!org) {
      logToConsole('Error: No ORG specified', 'error');
      status('ORG required', 'error');
      return;
    }
    
    logToConsole(`Starting forecast upload for ${forecastFileData.length} items...`, 'info');
    // Removed: status('Uploading forecasts...', 'info');
    
    // Track upload attempt
    const forecastFileName = forecastFileDisplay ? forecastFileDisplay.value : 'unknown';
    await trackEvent('upload_forecast_attempt', {
      org: org || 'unknown',
      filename: forecastFileName,
      record_count: forecastFileData.length
    });
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // Process each forecast
    for (let i = 0; i < forecastFileData.length; i++) {
      const row = forecastFileData[i];
      try {
        const forecastData = mapForecastRowToAPI(row, forecastFileHeader);
        
        if (!forecastData.ForecastId) {
          logToConsole(`Row ${i + 1}: Skipped - missing ForecastId`, 'warning');
          failCount++;
          errors.push(`Row ${i + 1}: Missing ForecastId`);
          continue;
        }
        
        if (!forecastData.CurrentForecast && forecastData.CurrentForecast !== 0) {
          logToConsole(`Row ${i + 1}: Skipped - missing or invalid CurrentForecast`, 'warning');
          failCount++;
          errors.push(`Row ${i + 1}: Missing or invalid CurrentForecast`);
          continue;
        }
        
        logToConsole(`Row ${i + 1}: Saving forecast ${forecastData.ForecastId}...`, 'info');
        
        // Log the raw JSON payload for Save Forecast
        const payload = { org, forecastData };
        logToConsole(`Save Forecast - Request Payload (Row ${i + 1}):\n${JSON.stringify(payload, null, 2)}`, 'info');
        
        const res = await api('save-forecast', payload);
        
        // Log the raw response for Save Forecast
        logToConsole(`Save Forecast - Response (Row ${i + 1}):\n${JSON.stringify(res, null, 2)}`, 'info');
        
        if (res.success) {
          logToConsole(`Row ${i + 1}: Successfully saved forecast ${forecastData.ForecastId}`, 'success');
          
          // Now call Save Forecast Projections API
          logToConsole(`Row ${i + 1}: Saving forecast projections for ${forecastData.ForecastId}...`, 'info');
          
          const projectionData = mapForecastProjectionToAPI(row, forecastFileHeader, forecastData);
          
          // Log the raw JSON payload for Save Forecast Projections
          const projectionPayload = { org, projectionData };
          logToConsole(`Save Forecast Projections - Request Payload (Row ${i + 1}):\n${JSON.stringify(projectionPayload, null, 2)}`, 'info');
          
          const projectionRes = await api('save-forecast-projections', projectionPayload);
          
          // Log the raw response for Save Forecast Projections
          logToConsole(`Save Forecast Projections - Response (Row ${i + 1}):\n${JSON.stringify(projectionRes, null, 2)}`, 'info');
          
          if (projectionRes.success) {
            logToConsole(`Row ${i + 1}: Successfully saved forecast projections for ${forecastData.ForecastId}`, 'success');
            successCount++;
          } else {
            logToConsole(`Row ${i + 1}: Failed to save forecast projections for ${forecastData.ForecastId}: ${projectionRes.error || 'Unknown error'}`, 'error');
            failCount++;
            errors.push(`Row ${i + 1} (${forecastData.ForecastId}): Forecast saved but projections failed - ${projectionRes.error || 'Unknown error'}`);
          }
        } else {
          logToConsole(`Row ${i + 1}: Failed to save forecast ${forecastData.ForecastId}: ${res.error || 'Unknown error'}`, 'error');
          failCount++;
          errors.push(`Row ${i + 1} (${forecastData.ForecastId}): ${res.error || 'Unknown error'}`);
        }
      } catch (error) {
        logToConsole(`Row ${i + 1}: Error - ${error.message}`, 'error');
        failCount++;
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
    
    // Summary
    logToConsole(`\n=== Upload Complete ===`, 'info');
    logToConsole(`Success: ${successCount}`, 'success');
    logToConsole(`Failed: ${failCount}`, failCount > 0 ? 'error' : 'info');
    
    if (errors.length > 0 && errors.length <= 10) {
      logToConsole('Errors:', 'error');
      errors.forEach(err => logToConsole(`  - ${err}`, 'error'));
    } else if (errors.length > 10) {
      logToConsole(`First 10 errors (${errors.length} total):`, 'error');
      errors.slice(0, 10).forEach(err => logToConsole(`  - ${err}`, 'error'));
    }
    
    // Track upload completion
    if (failCount > 0 && successCount === 0) {
      await trackEvent('upload_forecast_failed', {
        org: org || 'unknown',
        filename: forecastFileName,
        error: errors.length > 0 ? errors[0] : 'Upload failed'
      });
    } else {
      await trackEvent('upload_forecast_completed', {
        org: org || 'unknown',
        filename: forecastFileName,
        record_count: forecastFileData.length,
        success_count: successCount,
        fail_count: failCount
      });
    }
    
    status(`Upload complete: ${successCount} succeeded, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
  });
}

// Helper function to map CSV row to location API format
function mapLocationRowToAPI(row, headerRow) {
  // If we have a header row, map by column names
  // Otherwise, assume standard order: LocationId, LocationName, Description, LocationType, PrimaryDC, Region, District, Address fields
  let locationData = {};
  
  if (headerRow && headerRow.length > 0) {
    // Map by header names
    const headerMap = {};
    headerRow.forEach((header, index) => {
      const normalized = String(header).trim().toLowerCase();
      headerMap[normalized] = index;
    });
    
    // Map fields based on header
    const getValue = (fieldNames) => {
      for (const fieldName of fieldNames) {
        const index = headerMap[fieldName.toLowerCase()];
        if (index !== undefined && row[index] !== undefined) {
          return String(row[index]).trim();
        }
      }
      return '';
    };
    
    locationData.LocationId = getValue(['LocationId', 'Location ID', 'Location_id', 'locationid']);
    locationData.LocationName = getValue(['LocationName', 'Location Name', 'Location_name', 'locationname']);
    locationData.Description = getValue(['Description', 'description']);
    locationData.LocationType = getValue(['LocationType', 'Location Type', 'Location_type', 'locationtype']);
    locationData.PrimaryDC = getValue(['PrimaryDC', 'Primary DC', 'Primary_dc', 'primarydc']);
    locationData.Region = getValue(['Region', 'region']);
    locationData.District = getValue(['District', 'district']);
    
    // Address fields
    locationData.Address = {
      FirstName: getValue(['FirstName', 'First Name', 'First_name', 'firstname', 'Address.FirstName']),
      LastName: getValue(['LastName', 'Last Name', 'Last_name', 'lastname', 'Address.LastName']),
      Address1: getValue(['Address1', 'Address 1', 'Address_1', 'address1', 'Address.Address1']),
      City: getValue(['City', 'city', 'Address.City']),
      State: getValue(['State', 'state', 'Address.State']),
      PostalCode: getValue(['PostalCode', 'Postal Code', 'Postal_code', 'postalcode', 'Zip', 'zip', 'Address.PostalCode']),
      Country: getValue(['Country', 'country', 'Address.Country']),
      Phone: getValue(['Phone', 'phone', 'Address.Phone']),
      Email: getValue(['Email', 'email', 'Address.Email'])
    };
  } else {
    // Assume standard order (first 7 columns, then address fields)
    locationData.LocationId = row[0] || '';
    locationData.LocationName = row[1] || '';
    locationData.Description = row[2] || '';
    locationData.LocationType = row[3] || '';
    locationData.PrimaryDC = row[4] || '';
    locationData.Region = row[5] || '';
    locationData.District = row[6] || '';
    locationData.Address = {
      FirstName: row[7] || '',
      LastName: row[8] || '',
      Address1: row[9] || '',
      City: row[10] || '',
      State: row[11] || '',
      PostalCode: row[12] || '',
      Country: row[13] || '',
      Phone: row[14] || '',
      Email: row[15] || ''
    };
  }
  
  return locationData;
}

// Upload Locations button handler
if (uploadLocationsBtn) {
  uploadLocationsBtn.addEventListener('click', async () => {
    if (!locationFileData || locationFileData.length === 0) {
      logToConsole('Error: No location file loaded', 'error');
      status('Please load a location file first', 'error');
      return;
    }
    
    if (!token) {
      logToConsole('Error: Not authenticated', 'error');
      status('Please authenticate first', 'error');
      return;
    }
    
    const org = orgInput.value.trim();
    if (!org) {
      logToConsole('Error: No ORG specified', 'error');
      status('ORG required', 'error');
      return;
    }
    
    logToConsole(`Starting location upload for ${locationFileData.length} locations...`, 'info');
    // Removed: status('Uploading locations...', 'info');
    
    // Track upload attempt
    const locationFileName = locationFileDisplay ? locationFileDisplay.value : 'unknown';
    await trackEvent('upload_locations_attempt', {
      org: org || 'unknown',
      filename: locationFileName,
      record_count: locationFileData.length
    });
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // Process each location
    for (let i = 0; i < locationFileData.length; i++) {
      const row = locationFileData[i];
      try {
        const locationData = mapLocationRowToAPI(row, locationFileHeader);
        
        if (!locationData.LocationId) {
          logToConsole(`Row ${i + 1}: Skipped - missing LocationId`, 'warning');
          failCount++;
          errors.push(`Row ${i + 1}: Missing LocationId`);
          continue;
        }
        
        logToConsole(`Row ${i + 1}: Creating location ${locationData.LocationId}...`, 'info');
        
        // Log the raw JSON payload
        const payload = { org, locationData };
        logToConsole(`Request Payload (Row ${i + 1}):\n${JSON.stringify(payload, null, 2)}`, 'info');
        
        const res = await api('create-location', payload);
        
        // Log the raw response
        logToConsole(`Response (Row ${i + 1}):\n${JSON.stringify(res, null, 2)}`, 'info');
        
        if (res.success) {
          logToConsole(`Row ${i + 1}: Successfully created location ${locationData.LocationId}`, 'success');
          successCount++;
        } else {
          logToConsole(`Row ${i + 1}: Failed to create location ${locationData.LocationId}: ${res.error || 'Unknown error'}`, 'error');
          failCount++;
          errors.push(`Row ${i + 1} (${locationData.LocationId}): ${res.error || 'Unknown error'}`);
        }
      } catch (error) {
        logToConsole(`Row ${i + 1}: Error - ${error.message}`, 'error');
        failCount++;
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
    
    // Summary
    logToConsole(`\n=== Upload Complete ===`, 'info');
    logToConsole(`Success: ${successCount}`, 'success');
    logToConsole(`Failed: ${failCount}`, failCount > 0 ? 'error' : 'info');
    
    if (errors.length > 0 && errors.length <= 10) {
      logToConsole('Errors:', 'error');
      errors.forEach(err => logToConsole(`  - ${err}`, 'error'));
    } else if (errors.length > 10) {
      logToConsole(`First 10 errors (${errors.length} total):`, 'error');
      errors.slice(0, 10).forEach(err => logToConsole(`  - ${err}`, 'error'));
    }
    
    // Track upload completion
    if (failCount > 0 && successCount === 0) {
      await trackEvent('upload_locations_failed', {
        org: org || 'unknown',
        filename: locationFileName,
        error: errors.length > 0 ? errors[0] : 'Upload failed'
      });
    } else {
      await trackEvent('upload_locations_completed', {
        org: org || 'unknown',
        filename: locationFileName,
        record_count: locationFileData.length,
        success_count: successCount,
        fail_count: failCount
      });
    }
    
    status(`Upload complete: ${successCount} succeeded, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
  });
}
