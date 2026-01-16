// api/validate.js
import fetch from 'node-fetch';

// Home Assistant Configuration
const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL || "http://sidmsmith.zapto.org:8123/api/webhook/manhattan_app_usage";
const HA_HEADERS = { "Content-Type": "application/json" };
const APP_NAME = "Import Forecast";
const APP_VERSION = "0.2.0"; // Match version in index.html title

// Forecast app uses sales2 environment (different from other apps)
const AUTH_HOST = process.env.MANHATTAN_AUTH_HOST || "sales2-auth.omni.manh.com";
const API_HOST = process.env.MANHATTAN_API_HOST || "sales2.omni.manh.com";
const CLIENT_ID = "omnicomponent.1.0.0";
// CLIENT_SECRET for sales2 environment
// Set MANHATTAN_SECRET in Vercel environment variables, or it will use the fallback
const CLIENT_SECRET = process.env.MANHATTAN_SECRET || "b4s8rgTyg55XYNun";
const PASSWORD = process.env.MANHATTAN_PASSWORD || "Blu3sk!es2400";
const USERNAME_BASE = "rndadmin@"; // Forecast app uses rndadmin@ instead of sdtadmin@

// Helper: send to HA
async function sendHAMessage(eventName, metadata = {}) {
  try {
    const payload = {
      event_name: eventName,
      app_name: APP_NAME,
      app_version: APP_VERSION,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(HA_WEBHOOK_URL, {
      method: 'POST',
      headers: HA_HEADERS,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
  } catch (error) {
    // Silently fail - don't interrupt user experience
  }
}

// Get OAuth token
async function getToken(org) {
  const url = `https://${AUTH_HOST}/oauth/token`;
  // Postman shows orgid as "SDT-TEST" but username as "rndadmin@sdt-test"
  const normalizedOrg = org.trim().toLowerCase();
  const username = `${USERNAME_BASE}${normalizedOrg}`;
  
  const bodyParams = new URLSearchParams();
  bodyParams.append('grant_type', 'password');
  bodyParams.append('username', username);
  bodyParams.append('password', PASSWORD);
  const bodyString = bodyParams.toString();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: bodyString
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Authentication failed (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error_description || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const data = await res.json();
    if (!data.access_token) {
      throw new Error('No access token received from authentication server');
    }
    return data.access_token;
  } catch (error) {
    return null;
  }
}

// API call wrapper
async function apiCall(method, path, token, org, body = null) {
  const url = `https://${API_HOST}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    selectedOrganization: org,
    selectedLocation: `${org}-DM1`
  };

  const res = await fetch(url, { 
    method, 
    headers, 
    body: body ? JSON.stringify(body) : undefined 
  });
  return res.ok ? await res.json() : { error: await res.text() };
}

// Export handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, org } = req.body;

  // === HA TRACK EVENT ===
  if (action === 'ha-track') {
    const { event_name, metadata } = req.body;
    sendHAMessage(event_name, metadata);
    return res.json({ success: true });
  }

  // === APP OPENED (NO ORG) ===
  if (action === 'app_opened') {
    return res.json({ success: true });
  }

  // === AUTHENTICATE ===
  if (action === 'auth') {
    const token = await getToken(org);
    if (!token) {
      await sendHAMessage('auth_failed', { org: org || 'unknown' });
      return res.json({ success: false, error: "Authentication failed. Please check Vercel logs for details." });
    }
    await sendHAMessage('auth_success', { org: org || 'unknown' });
    return res.json({ success: true, token });
  }

  // === GET CONDITION CODES ===
  if (action === 'get-codes') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const codesRes = await apiCall('GET', '/dcinventory/api/dcinventory/conditionCode?size=50', token, org);
    const items = codesRes.data || [];
    const codes = items
      .map(x => ({ code: x.ConditionCodeId, desc: x.Description }))
      .sort((a, b) => a.code.localeCompare(b.code));
    codes.unshift({ code: '', desc: 'Select Code' });

    return res.json({ codes });
  }

  // === CREATE LOCATION ===
  if (action === 'create-location') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { locationData } = req.body;
    if (!locationData) {
      return res.json({ success: false, error: "No location data provided" });
    }

    try {
      const result = await apiCall('POST', '/itemlocation/api/itemlocation/location/save', token, org, locationData);
      return res.json({ success: result.error ? false : true, result });
    } catch (error) {
      await sendHAMessage('upload_locations_failed', { org: org || 'unknown', error: error.message });
      return res.json({ success: false, error: error.message });
    }
  }

  // === SAVE FORECAST ===
  if (action === 'save-forecast') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { forecastData } = req.body;
    if (!forecastData) {
      return res.json({ success: false, error: "No forecast data provided" });
    }

    try {
      const result = await apiCall('POST', '/ai-forecast/api/ai-forecast/forecast/save', token, org, forecastData);
      return res.json({ success: result.error ? false : true, result });
    } catch (error) {
      await sendHAMessage('upload_forecast_failed', { org: org || 'unknown', error: error.message });
      return res.json({ success: false, error: error.message });
    }
  }

  // === SAVE FORECAST PROJECTIONS ===
  if (action === 'save-forecast-projections') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { projectionData } = req.body;
    if (!projectionData) {
      return res.json({ success: false, error: "No projection data provided" });
    }

    try {
      const result = await apiCall('POST', '/ai-forecast/api/ai-forecast/manualForecastEvent/save', token, org, projectionData);
      return res.json({ success: result.error ? false : true, result });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === SEARCH LOCATION (Store Validation) ===
  if (action === 'search-location') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { storeId } = req.body;
    if (!storeId) {
      return res.json({ success: false, error: "StoreId is required" });
    }

    try {
      const payload = {
        Query: `LocationId IN ('${storeId}')`
      };
      
      const result = await apiCall('POST', '/itemlocation/api/itemlocation/location/search', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      // Extract locations from response (adjust based on actual API response structure)
      const locations = result.data || result.locations || result || [];
      
      return res.json({ success: true, locations });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === SEARCH PLANNED PURCHASE ===
  if (action === 'search-planned-purchase') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { locationId } = req.body;
    if (!locationId) {
      return res.json({ success: false, error: "LocationId is required" });
    }

    try {
      const payload = {
        Query: `LocationId IN ('${locationId}')`,
        Template: {
          PlannedPurchaseId: null,
          PlannedPurchaseName: null,
          LocationId: null,
          ItemId: null,
          PurchaseQuantity: null,
          PlannedReceiptDate: null,
          PurchaseOnDate: null,
          DaysOfSupply: null
        }
      };
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/plannedPurchase/search', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      // Extract plannedPurchases from response (adjust based on actual API response structure)
      const plannedPurchases = result.data || result.plannedPurchases || result || [];
      
      return res.json({ success: true, plannedPurchases });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === SEARCH INVENTORY MOVEMENT ===
  if (action === 'search-inventory-movement') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { itemId, locationId, sourceLocationId } = req.body;
    
    // Build query based on provided parameters
    let query = '';
    if (itemId && locationId) {
      query = `ItemId='${itemId}' AND LocationId='${locationId}'`;
    } else if (sourceLocationId && locationId) {
      query = `SourceLocationId='${sourceLocationId}' AND LocationId='${locationId}'`;
    } else {
      return res.json({ success: false, error: "ItemId/LocationId or SourceLocationId/LocationId is required" });
    }

    try {
      const payload = {
        Query: query,
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
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovement/search', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      // Extract movements from response (adjust based on actual API response structure)
      const movements = result.data || result.movements || result || [];
      
      return res.json({ success: true, movements });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === SEARCH ITEM IMAGES ===
  if (action === 'search-item-images') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { itemIds } = req.body;
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.json({ success: false, error: "itemIds array is required" });
    }

    try {
      const payload = {
        Query: `ItemId IN (${itemIds.map(id => `'${id}'`).join(',')})`,
        Template: {
          ItemId: null,
          SmallImageURI: null
        }
      };
      
      const result = await apiCall('POST', '/item/api/item/item/search', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      // Extract items from response and build imageMap
      const items = result.data || result.items || result || [];
      const imageMap = {};
      
      items.forEach(item => {
        if (item.ItemId && item.SmallImageURI) {
          imageMap[item.ItemId] = item.SmallImageURI;
        }
      });
      
      return res.json({ success: true, imageMap });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === SEARCH INVENTORY MOVEMENT SUMMARY (Suggested Orders) ===
  if (action === 'search-inventory-movement-summary') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { storeId } = req.body;
    if (!storeId) {
      return res.json({ success: false, error: "storeId is required" });
    }

    try {
      const payload = {
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
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovementSummary/search', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      // Extract orders from response (adjust based on actual API response structure)
      const orders = result.data || result.orders || result || [];
      
      return res.json({ success: true, orders });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === REVIEW INVENTORY MOVEMENT ===
  if (action === 'review-inventory-movement') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { sourceLocationId, locationId } = req.body;
    if (!sourceLocationId || !locationId) {
      return res.json({ success: false, error: "sourceLocationId and locationId are required" });
    }

    try {
      const payload = {
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
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/review', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      return res.json({ success: true, result });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === SAVE SUGGESTED ORDER LINE ===
  if (action === 'save-suggested-order-line') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { inventoryMovementId, finalOrderQty } = req.body;
    if (!inventoryMovementId || finalOrderQty === undefined) {
      return res.json({ success: false, error: "inventoryMovementId and finalOrderQty are required" });
    }

    try {
      const payload = {
        InventoryMovementId: inventoryMovementId,
        FinalOrderUnits: finalOrderQty
      };
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/save', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      return res.json({ success: true, result });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === CLEAR SOQ ===
  if (action === 'clear-soq') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { itemId, locationId, sourceLocationId } = req.body;
    if (!itemId || !locationId || !sourceLocationId) {
      return res.json({ success: false, error: "itemId, locationId, and sourceLocationId are required" });
    }

    try {
      const payload = {
        ItemId: itemId,
        LocationId: locationId,
        SourceLocationId: sourceLocationId
      };
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/clearSOQ', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      return res.json({ success: true, result });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // === APPROVE INVENTORY MOVEMENT (Release Order) ===
  if (action === 'approve-inventory-movement') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token" });
    
    const { locationId, sourceLocationId } = req.body;
    if (!locationId || !sourceLocationId) {
      return res.json({ success: false, error: "locationId and sourceLocationId are required" });
    }

    try {
      const payload = {
        LocationId: locationId,
        SourceLocationId: sourceLocationId,
        RelationType: "Regular"
      };
      
      const result = await apiCall('POST', '/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/approve', token, org, payload);
      
      if (result.error) {
        return res.json({ success: false, error: result.error });
      }
      
      return res.json({ success: true, result });
    } catch (error) {
      return res.json({ success: false, error: error.message });
    }
  }

  // Unknown action
  return res.status(400).json({ error: "Unknown action" });
}

export const config = { api: { bodyParser: true } };