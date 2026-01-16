# SCP Store - Technical Documentation

**Version:** 1.1.0  
**Last Updated:** 2024

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Data Elements](#data-elements)
4. [Button Functionality](#button-functionality)
5. [URL Parameters](#url-parameters)
6. [Data Flow](#data-flow)

---

## Overview

SCP Store is a mobile-first web application for managing suggested orders and inventory movements. The application provides an interface for viewing, modifying, and releasing suggested orders with real-time validation and status updates.

**Technology Stack:**
- Frontend: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5.3.3, Font Awesome 6.4.0
- Backend: Node.js, Express, Vercel Serverless Functions
- API: Manhattan Associates OMNI API (sales2 environment)

---

## API Endpoints

### Authentication APIs

#### 1. Authenticate User
**Action:** `auth`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2-auth.omni.manh.com/oauth/token`

**Request:**
```json
{
  "action": "auth",
  "org": "SDT-TEST"
}
```

**Response:**
```json
{
  "success": true,
  "token": "access_token_string"
}
```

**Key Data Elements:**
- `org`: Organization ID (e.g., "SDT-TEST")
- `token`: OAuth access token for subsequent API calls

**Description:** Authenticates user using OAuth 2.0 password grant. Token is stored in memory for subsequent API calls.

---

### Store Validation API

#### 2. Search Location (Validate Store)
**Action:** `search-location`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/itemlocation/api/itemlocation/location/search`

**Request:**
```json
{
  "action": "search-location",
  "org": "SDT-TEST",
  "storeId": "STORE-4351"
}
```

**Backend Payload:**
```json
{
  "Query": "LocationId IN ('STORE-4351')"
}
```

**Response:**
```json
{
  "success": true,
  "locations": [...]
}
```

**Key Data Elements:**
- `storeId`: Store ID to validate
- `locations`: Array of location objects (empty if invalid)

**Description:** Validates that a store ID exists in the system. Called automatically when Store ID is entered or when `Store` URL parameter is provided.

---

### Suggested Orders APIs

#### 3. Search Inventory Movement Summary (Get Suggested Orders)
**Action:** `search-inventory-movement-summary`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovementSummary/search`

**Request:**
```json
{
  "action": "search-inventory-movement-summary",
  "org": "SDT-TEST",
  "storeId": "STORE-6472"
}
```

**Backend Payload:**
```json
{
  "Query": "LocationId='STORE-6472'",
  "Template": {
    "LocationId": null,
    "SourceLocationId": null,
    "SubGroup": null,
    "InventoryMovementSummaryId": null,
    "OrderStatus": {
      "OrderStatusId": null
    },
    "MovementSummaryFactors": null
  }
}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "InventoryMovementSummaryId": "...",
      "LocationId": "STORE-6472",
      "SourceLocationId": "DC-1000",
      "SubGroup": "DEPARTMENT-001",
      "OrderStatus": {
        "OrderStatusId": "Suggested"
      },
      "MovementSummaryFactors": "{\"RequiredTotals\":{\"USD\":136.2,\"EA\":20.0}}",
      "Quantity": 20,
      "ItemCount": 5
    }
  ]
}
```

**Key Data Elements:**
- `LocationId`: Store ID
- `SourceLocationId`: Source location (DC) ID
- `SubGroup`: Department identifier
- `OrderStatus.OrderStatusId`: Order status (e.g., "Suggested")
- `MovementSummaryFactors`: CLOB JSON string containing totals
- `Quantity`: Total quantity
- `ItemCount`: Number of items in the order

**Description:** Retrieves all suggested orders for a given store. Used when clicking "Suggested Orders" card and when refreshing order status after submission.

---

### Order Items APIs

#### 4. Search Inventory Movement (Get Order Items)
**Action:** `search-inventory-movement`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/ai-inventoryoptimization/api/ai-inventoryoptimization/inventoryMovement/search`

**Request:**
```json
{
  "action": "search-inventory-movement",
  "org": "SDT-TEST",
  "sourceLocationId": "DC-1000",
  "locationId": "STORE-6472"
}
```

**Backend Payload:**
```json
{
  "Query": "SourceLocationId='DC-1000' AND LocationId='STORE-6472' AND FinalOrderQty>0",
  "Template": {
    "ItemId": null,
    "InventoryMovementId": null,
    "InventoryMovementDetail": {
      "ItemDescription": null
    },
    "FinalOrderUnits": null,
    "FinalOrderCost": null,
    "OnHandQuantity": null,
    "PeriodForecast": null
  }
}
```

**Response:**
```json
{
  "success": true,
  "movements": [
    {
      "ItemId": "2800237",
      "InventoryMovementId": "MOVEMENT-123",
      "InventoryMovementDetail": {
        "ItemDescription": "Product Name"
      },
      "FinalOrderUnits": 20,
      "FinalOrderCost": 136.20,
      "OnHandQuantity": 2,
      "PeriodForecast": 2
    }
  ]
}
```

**Key Data Elements:**
- `ItemId`: Item identifier
- `InventoryMovementId`: Movement record ID (used for updates)
- `InventoryMovementDetail.ItemDescription`: Item description
- `FinalOrderUnits`: Suggested order quantity
- `FinalOrderCost`: Item price
- `OnHandQuantity`: Current inventory on hand
- `PeriodForecast`: Forecasted quantity

**Description:** Retrieves all items for a specific order (SourceLocationId + LocationId combination). Called when clicking on a suggested order card.

---

#### 5. Search Item Images
**Action:** `search-item-images`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/item/api/item/item/search`

**Request:**
```json
{
  "action": "search-item-images",
  "org": "SDT-TEST",
  "itemIds": ["2800237", "2800238"]
}
```

**Backend Payload:**
```json
{
  "Query": "ItemId IN ('2800237','2800238')",
  "Template": {
    "ItemId": null,
    "SmallImageURI": null
  }
}
```

**Response:**
```json
{
  "success": true,
  "imageMap": {
    "2800237": "https://example.com/image1.jpg",
    "2800238": "https://example.com/image2.jpg"
  }
}
```

**Key Data Elements:**
- `itemIds`: Array of item IDs to fetch images for
- `imageMap`: Object mapping ItemId to SmallImageURI

**Description:** Fetches item images for all items in an order. Called automatically after loading order items.

---

### Order Submission APIs

#### 6. Review Inventory Movement
**Action:** `review-inventory-movement`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/review`

**Request:**
```json
{
  "action": "review-inventory-movement",
  "org": "SDT-TEST",
  "sourceLocationId": "DC-1000",
  "locationId": "STORE-6472"
}
```

**Backend Payload:**
```json
{
  "ItemId": null,
  "SourceLocationId": "DC-1000",
  "LocationId": "STORE-6472",
  "RelationType": "Regular",
  "BracketId": null,
  "executeBracket": false,
  "CancelReview": false,
  "StartReview": true,
  "UseLatest": false
}
```

**Response:**
```json
{
  "success": true,
  "result": {...}
}
```

**Key Data Elements:**
- `SourceLocationId`: Source location (DC) ID
- `LocationId`: Store ID
- `StartReview`: Always true

**Description:** Initiates review process for an order. **Only called if OrderStatus = "Suggested"**. Must succeed before submitting individual item updates.

---

#### 7. Save Suggested Order Line (Update Item Quantity)
**Action:** `save-suggested-order-line`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/aiui-facade/api/aiui-facade/view/save/com-manh-cp-aiui-facade/SuggestedOrderLine`

**Request:**
```json
{
  "action": "save-suggested-order-line",
  "org": "SDT-TEST",
  "inventoryMovementId": "MOVEMENT-123",
  "finalOrderQty": 25
}
```

**Backend Payload:**
```json
{
  "InventoryMovementId": "MOVEMENT-123",
  "FinalOrderQty": 25
}
```

**Response:**
```json
{
  "success": true,
  "result": {...}
}
```

**Key Data Elements:**
- `inventoryMovementId`: Movement record ID from order items
- `finalOrderQty`: Updated quantity (must be > 0)

**Description:** Updates quantity for a single item. **Called individually for each item with quantity > 0** after successful review. Only processes items that have been modified.

---

#### 8. Clear Suggested Order Quantity (Remove Item)
**Action:** `clear-soq`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/clearSOQ`

**Request:**
```json
{
  "action": "clear-soq",
  "org": "SDT-TEST",
  "itemId": "2800237",
  "sourceLocationId": "DC-1000",
  "locationId": "STORE-6472"
}
```

**Backend Payload:**
```json
[
  {
    "ItemId": "2800237",
    "LocationId": "STORE-6472",
    "SourceLocationId": "DC-1000"
  }
]
```

**Response:**
```json
{
  "success": true,
  "result": {...}
}
```

**Key Data Elements:**
- `itemId`: Item identifier
- `LocationId`: Store ID
- `SourceLocationId`: Source location (DC) ID

**Description:** Removes an item from the order by clearing its suggested order quantity. **Called individually for each item with quantity = 0** after updating items with quantity > 0.

---

### Order Release API

#### 9. Approve Inventory Movement (Release Order)
**Action:** `approve-inventory-movement`  
**Method:** POST  
**Endpoint:** `/api/validate`  
**Backend Endpoint:** `https://sales2.omni.manh.com/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/approve`

**Request:**
```json
{
  "action": "approve-inventory-movement",
  "org": "SDT-TEST",
  "sourceLocationId": "DC-1000",
  "locationId": "STORE-6472"
}
```

**Backend Payload:**
```json
{
  "LocationId": "STORE-6472",
  "SourceLocationId": "DC-1000",
  "RelationType": "Regular"
}
```

**Response:**
```json
{
  "success": true,
  "result": {...}
}
```

**Key Data Elements:**
- `LocationId`: Store ID
- `SourceLocationId`: Source location (DC) ID
- `RelationType`: Always "Regular"

**Description:** Releases/approves the entire order after all item updates have been submitted. Called once per order.

---

## Data Elements

### Order Card Data Structure

**From:** `search-inventory-movement-summary` API

| Field | Type | Description | Display |
|-------|------|-------------|---------|
| `InventoryMovementSummaryId` | String | Unique order identifier | Not displayed |
| `LocationId` | String | Store ID | In header |
| `SourceLocationId` | String | Source location (DC) ID | Shown as "Source Location" |
| `SubGroup` | String | Department identifier | In header |
| `OrderStatus.OrderStatusId` | String | Order status (e.g., "Suggested") | In header |
| `Quantity` | Number | Total quantity | Shown in card |
| `ItemCount` | Number | Number of items | Shown in card |
| `MovementSummaryFactors` | String (CLOB) | JSON string with totals | Parsed and displayed |

**MovementSummaryFactors Parsing:**
```json
{
  "RequiredTotals": {
    "USD": 136.20,  // Total Cost
    "EA": 20.0      // Total Units
  }
}
```

---

### Item Card Data Structure

**From:** `search-inventory-movement` API

| Field | Type | Description | Display |
|-------|------|-------------|---------|
| `ItemId` | String | Item identifier | "ItemId - ItemDescription" |
| `InventoryMovementId` | String | Movement record ID | Not displayed (used for updates) |
| `InventoryMovementDetail.ItemDescription` | String | Item description | "ItemId - ItemDescription" |
| `FinalOrderUnits` | Number | Suggested quantity | Shown and editable |
| `FinalOrderCost` | Number | Item price | Shown as "Price" |
| `OnHandQuantity` | Number | Current inventory | Shown as "On Hand" |
| `PeriodForecast` | Number | Forecasted quantity | Shown as "Forecast" |

---

## Button Functionality

### Main Page Buttons

#### 1. Suggested Orders Card
**Location:** Main cards page  
**Action:** Click card  
**Functionality:**
1. Calls `search-inventory-movement-summary` API with current Store ID
2. Displays all suggested orders for the store
3. Each order card shows:
   - Source Location
   - Sub Group (Department)
   - Status
   - Quantity
   - Items count
   - Total Cost (from MovementSummaryFactors)
   - Total Units (from MovementSummaryFactors)
4. Navigation: Shows Suggested Orders page with "Change Store" button

---

#### 2. Opportunity Buys Card
**Location:** Main cards page  
**Action:** Click card  
**Functionality:**
- Currently displays placeholder message
- TODO: Add functionality

---

### Suggested Orders Page Buttons

#### 3. Change Store Button
**Location:** Suggested Orders page (top)  
**Action:** Click "Change Store"  
**Functionality:**
1. Hides Suggested Orders section
2. Shows Store ID input section
3. Clears current Store ID
4. Allows user to enter a new Store ID

---

#### 4. Order Card (Individual Order)
**Location:** Suggested Orders page  
**Action:** Click on an order card  
**Functionality:**
1. Calls `search-inventory-movement` API with:
   - `sourceLocationId` from the order
   - `locationId` (Store ID) from the order
2. Calls `search-item-images` API for all item IDs
3. Displays Order Items page with:
   - Header: Store, Department, Order Status
   - Item cards with images, details, and quantity controls
4. Shows "Submit Changes" and "Release Order" buttons
5. Stores `sourceLocationId`, `locationId`, and `orderStatus` for later use

---

### Order Items Page Buttons

#### 5. Back Button
**Location:** Order Items page (top)  
**Action:** Click "Back"  
**Functionality:**
1. Hides Order Items section
2. Shows Suggested Orders section
3. Returns to order list view

---

#### 6. Quantity Control Pill
**Location:** Bottom of each item card  
**Actions:**
- **Increase (+):** Increases quantity by 1
- **Decrease (-):** Decreases quantity by 1 (hidden when quantity = 0)
- **Remove (Trash):** Sets quantity to 0

**Functionality:**
1. Updates quantity display in real-time
2. Stores current quantity in `data-current-quantity` attribute
3. Compares with `data-initial-quantity` to detect changes
4. Disables "Release Order" button if any changes detected
5. Shows/hides decrease button based on quantity

**Visual Feedback:**
- Card opacity reduces to 0.5 when quantity = 0
- Decrease button hidden when quantity = 0

---

#### 7. Submit Changes Button (Blue)
**Location:** Bottom of Order Items page (sticky)  
**Action:** Click "Submit Changes"  
**Functionality:**
1. Collects all items with modified quantities
2. Validates `sourceLocationId` and `locationId` are available
3. **If OrderStatus = "Suggested":**
   - Calls `review-inventory-movement` API (once for entire order)
   - Proceeds only if review succeeds
4. **For items with quantity > 0:**
   - Calls `save-suggested-order-line` API individually for each modified item
   - Updates `data-initial-quantity` after successful submission
5. **For items with quantity = 0:**
   - Calls `clear-soq` API individually for each removed item
   - Sets `data-initial-quantity` to 0 after successful removal
6. Shows completion modal with success/error count
7. **If no errors and on Suggested Orders page:**
   - Refreshes orders by calling `search-inventory-movement-summary` API again
   - Re-renders order cards with updated status
8. Re-enables "Release Order" button if no pending changes

**Key Logic:**
- Only processes items where `currentQuantity !== initialQuantity`
- Only processes items with `quantity > 0` for updates
- Only processes items with `quantity = 0` for removals
- Reviews are required only for orders with status "Suggested"

---

#### 8. Release Order Button (Green)
**Location:** Bottom of Order Items page (sticky, next to Submit)  
**Action:** Click "Release Order"  
**State:** Disabled/greyed out if there are pending item changes

**Functionality:**
1. Validates `sourceLocationId` and `locationId` are available
2. Shows confirmation dialog:
   - "Are you sure you want to release the order?"
   - Shows Store and Source Location
3. If confirmed:
   - Calls `approve-inventory-movement` API
   - Shows success/error modal
4. When modal "OK" clicked:
   - Navigates back to Suggested Orders page
   - Automatically calls `search-inventory-movement-summary` API to refresh orders
   - Re-renders order cards with updated status

**Button State Management:**
- **Enabled:** When no pending changes (all quantities match initial values)
- **Disabled:** When any item has been modified but not submitted
- **Re-enabled:** After successful submission with no errors

---

### Navigation Buttons

#### 9. Back to Cards Button
**Location:** Suggested Orders page (when coming from Order Items)  
**Action:** Click "Back"  
**Functionality:**
- Returns to main cards page (Suggested Orders / Opportunity Buys)
- Hides Suggested Orders section
- Shows cards section

---

## URL Parameters

The application supports the following URL parameters for automatic configuration:

### Parameters

| Parameter | Description | Example | Behavior |
|-----------|-------------|---------|----------|
| `Organization` or `ORG` | Organization ID | `?ORG=SDT-TEST` | Auto-authenticates, bypasses login screen |
| `Store` | Store ID | `?Store=STORE-4351` | Auto-validates and loads store after authentication |
| `Console` | Console visibility | `?Console=N` | Hides console window and button if set to "N" |

### Usage Examples

```
https://manh-scp.vercel.app/?ORG=SDT-TEST&Store=STORE-4351&Console=N
https://manh-scp.vercel.app/?Organization=SDT-TEST&Console=N
https://manh-scp.vercel.app/?ORG=SDT-TEST&Store=STORE-6472
```

### Parameter Processing

1. **Organization/ORG:**
   - Parsed on page load
   - Auto-hides authentication section
   - Auto-authenticates in background
   - Shows authentication screen if authentication fails

2. **Store:**
   - Only processed if Organization parameter is present
   - Auto-validates store using `search-location` API
   - Shows "Invalid Store" if validation fails
   - Loads store and shows cards if validation succeeds

3. **Console:**
   - Checked on page load
   - Hides `consoleSection` and `consoleToggleContainer` if `Console=N`
   - Applied consistently across all pages
   - Console button click handler respects this parameter

---

## Data Flow

### Complete Order Submission Flow

```
1. User Enters Store ID
   ↓
2. Validate Store (search-location API)
   ↓
3. User Clicks "Suggested Orders"
   ↓
4. Get Orders (search-inventory-movement-summary API)
   ↓
5. User Clicks Order Card
   ↓
6. Get Items (search-inventory-movement API)
   ↓
7. Get Images (search-item-images API)
   ↓
8. User Modifies Quantities
   ↓
9. User Clicks "Submit Changes"
   ↓
10. IF OrderStatus = "Suggested":
    - Review Order (review-inventory-movement API) [ONCE]
    ↓
11. Update Items with qty > 0 (save-suggested-order-line API) [PER ITEM]
   ↓
12. Remove Items with qty = 0 (clear-soq API) [PER ITEM]
   ↓
13. Show Completion Modal
   ↓
14. Refresh Orders (search-inventory-movement-summary API)
   ↓
15. User Clicks "Release Order"
   ↓
16. Approve Order (approve-inventory-movement API) [ONCE]
   ↓
17. Navigate to Suggested Orders
   ↓
18. Refresh Orders (search-inventory-movement-summary API)
```

---

### API Call Dependencies

- **Review API:** Only called if OrderStatus = "Suggested"
- **Update API:** Only called for items with quantity > 0
- **Clear API:** Only called for items with quantity = 0
- **Review must succeed** before Update/Clear APIs are called
- **Release Order** requires no pending changes (all changes submitted)

---

## Error Handling

### API Error Responses

All APIs return a consistent error structure:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Error Logging

- All API calls are logged to console (if Console parameter allows)
- Request payloads are logged before API calls
- Response payloads are logged after API calls
- Errors include stack traces for debugging

### User-Facing Errors

- **Invalid Store:** Shown when store validation fails
- **Authentication Failed:** Shown when auth fails (screen returns to login)
- **API Errors:** Shown in status messages and completion modals
- **Missing Data:** Validated before API calls (e.g., missing InventoryMovementId)

---

## State Management

### Key Variables

- `token`: OAuth access token (stored in memory)
- `storeId`: Current store ID (stored in variable)
- `urlOrg`: Organization from URL parameter
- `urlStore`: Store from URL parameter
- `urlConsole`: Console visibility from URL parameter

### Data Attributes

**On `movementsContainer`:**
- `data-source-location-id`: Source location ID (from selected order)
- `data-location-id`: Store ID (from selected order)
- `data-order-status`: Order status (from selected order)

**On `orderCard`:**
- `data-subgroup`: Department (from order)
- `data-order-status`: Order status (from order)

**On `itemCard`:**
- `data-item-id`: Item identifier
- `data-inventory-movement-id`: Movement record ID
- `data-initial-quantity`: Original quantity
- `data-current-quantity`: Current quantity (updated by user)

---

## Security Considerations

- OAuth token stored in memory (not persisted)
- Organization input cleared on page load unless from URL
- All API calls require valid OAuth token
- CORS headers set to allow cross-origin requests
- Error messages sanitized for user display

---

## Performance Notes

- Item images fetched in single batch call
- Item updates processed sequentially (one API call per item)
- Console logging can be disabled for production (`Console=N`)
- Images loaded asynchronously without blocking UI
- Order refresh happens automatically after submission

---

## Future Enhancements

- Opportunity Buys functionality (currently placeholder)
- Batch API calls for item updates (currently individual)
- Additional order status types support
- Enhanced error recovery mechanisms
