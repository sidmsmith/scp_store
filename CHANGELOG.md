# Changelog

## Version 1.3.1

### UI/UX Improvements

#### Update Button State Management
- **Initially Disabled:**
  - Update button now starts greyed out and disabled on both Opportunity Buys and Suggested Orders Item pages
  - Button becomes enabled only when quantity changes are detected
  - Button automatically disables again if all quantities revert to initial values
  - Provides clear visual feedback about when changes can be submitted

- **Dynamic State Updates:**
  - Button state is checked after initial card rendering
  - Button state updates automatically when any quantity is changed (increase, decrease, or remove)
  - Uses same `checkPendingChanges()` function that manages Release Order button state
  - Improved user experience by preventing accidental submissions

#### Grammar Improvements
- **Modal Message Grammar:**
  - Fixed singular/plural grammar in submission modal messages
  - Correctly displays "line" (singular) when count is 1, "lines" (plural) when count > 1
  - Correctly displays "error" (singular) when count is 1, "errors" (plural) when count > 1
  - Examples: "Successfully updated 1 line" vs "Successfully updated 5 lines"

### Technical Changes
- Updated `checkPendingChanges()` function to manage Update button state (not just Release Order button)
- Added `checkPendingChanges()` calls after card rendering to ensure initial button state
- Enhanced `showSubmissionModal()` with singular/plural logic for better grammar

---

## Version 1.3.0

### Major Features

#### Barcode/QR Code Scanner Solution
- **QR Code Support Added:**
  - Replaced Quagga (1D barcodes only) with html5-qrcode library (v2.3.8)
  - Now supports both QR codes and traditional barcodes (Code 128, Code 39, EAN, UPC, etc.)
  - Improved QR code detection reliability
  
- **Consistency Validation:**
  - Added consistency check to prevent false positive scans
  - Requires same code to be detected 3 times before accepting
  - Prevents random numbers/noise from being accepted immediately
  - Shows progress feedback: "Detected: CODE (1/3) - Keep steady..."
  
- **Auto-Submit Functionality:**
  - After successful scan, automatically submits Store ID (simulates Enter key press)
  - User no longer needs to manually press Enter after scanning
  - 300ms delay after modal closes ensures clean submission
  - Fully automated scanning workflow

- **UI Improvements:**
  - Removed "Stop Scanner" button (simplified interface)
  - Scanner now only has "Cancel" button
  - Improved status messages showing scan progress

- **Validation Enhancements:**
  - Minimum 3 character length requirement
  - Alphanumeric, hyphen, underscore, colon character validation
  - 500ms debounce to prevent rapid successive scans
  - Invalid codes are rejected with console warnings

#### Bug Fixes
- Fixed ReferenceError: `uploadForecastBtn is not defined`
  - Added variable definitions for `uploadForecastBtn` and `uploadLocationBtn`
  - Prevents errors when legacy button handlers check for removed buttons

### Technical Changes
- Migrated from QuaggaJS to html5-qrcode library
- Added scan consistency tracking variables (`scanCount`, `lastScannedCode`)
- Improved scanner state management and cleanup
- Enhanced error handling for scanner initialization

---

## Version 1.2.0

### Major Features

#### Opportunity Buys Page
- **Card Layout Improvements:**
  - Display `PlannedPurchaseName` in card header (replaces Item and Description)
  - Item and Description moved to details section in format "Item: XXX - Description"
  - Always display "On Hand" (even if 0) and "Forecast" (even if 0)
  - Forecast formatted to 2 decimal places (e.g., `10.34` or `0.00`)
  
- **Header Changes:**
  - Hide "Department", "Source", and "Order Status" header fields on Opportunity Buys Item Page
  - Store Header and Back button now properly displayed on Opportunity Buys Items page

- **API Updates:**
  - Update button now uses two different APIs:
    - If `qty > 0`: Calls `/ai-inventoryoptimization/api/ai-inventoryoptimization/plannedPurchase/save`
    - If `qty = 0`: Calls DELETE `/ai-inventoryoptimization/api/ai-inventoryoptimization/plannedPurchase/{{PK}}`
  - Search API now includes `PK` (primary key) in template for delete operations
  - Page automatically refreshes after successful updates (1 second delay)

- **Data Display:**
  - Fixed forecast display to pull from `PeriodForecast` field correctly
  - Added detailed logging for Description and Forecast data extraction

#### Suggested Orders Page
- **Card Enhancements:**
  - Renamed "Quantity" to "Order Qty" (always displayed, even if 0)
  - Renamed "Price" to "Purchase Price" (displays as "$0.00" if no price)
  - Always display "On Hand" (even if 0) and "Forecast" (even if 0)
  - Forecast formatted to 2 decimal places (e.g., `10.34` or `0.00`)
  - Cards and quantity pills initially greyed out if Order Qty is 0

- **Header Improvements:**
  - Source and Order Status fields now properly display on Suggested Orders Items page
  - Store Header always displayed on Suggested Orders page (fixed navigation issue)

- **API Updates:**
  - Update API changed to `/aiui-facade/api/aiui-facade/view/save/com-manh-cp-aiui-facade/SuggestedOrderLine`
  - Payload changed from `FinalOrderUnits` to `FinalOrderQty`
  - Clear SOQ API updated to `/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/clearSOQ`
  - Page automatically refreshes after successful updates (1 second delay)
  - Refresh now occurs if ANY updates succeed (not just when all succeed)

- **Search API Fix:**
  - Fixed `search-inventory-movement` to support Opportunity Buys query format
  - When `itemId` provided: Uses `ItemId='...' AND LocationId='...'` query
  - When `itemId` not provided: Uses `SourceLocationId='...' AND LocationId='...'` query

#### UI/UX Improvements
- **Button Styling:**
  - Update button changed to green (`btn-success`)
  - Refresh icon repositioned to same vertical position as Back button
  - Refresh and Back buttons have consistent responsive behavior on mobile

- **Navigation:**
  - Back button on Suggested Orders page now correctly returns to Main Cards page
  - Fixed header display consistency across all navigation paths
  - Proper header visibility management during page transitions

- **Layout & Spacing:**
  - Removed whitespace between Store Header and Suggested Order cards
  - Added padding-top to card containers (0.5rem) to prevent cards being cut off on hover
  - Consistent card positioning across all pages

- **Images:**
  - Added `notfound.png` fallback image support
  - When item image URL is not found, displays `notfound.png` from public folder
  - Improved error handling for missing images

#### API Validation
- **Complete API Implementation:**
  - Added all missing API action handlers in `api/validate.js`:
    - `search-location`
    - `search-inventory-movement-summary`
    - `search-inventory-movement`
    - `search-item-images`
    - `review-inventory-movement`
    - `save-suggested-order-line`
    - `clear-soq`
    - `approve-inventory-movement`
    - `save-planned-purchase`
    - `delete-planned-purchase`

- **Enhanced Logging:**
  - Added detailed API logging for Suggested Orders Update and Clear operations
  - Includes Action name, Endpoint, Request Payload, Backend Payload, and full API Response
  - Added detailed logging for Opportunity Buys Description and Forecast extraction

#### Bug Fixes
- Fixed JavaScript error: `forecastFileDisplay is not defined`
- Fixed header fields not displaying after navigation from Opportunity Buys
- Fixed whitespace issues on Suggested Orders page
- Fixed Source and Order Status fields not displaying on Suggested Orders Items page
- Fixed forecast always displaying 0 on Opportunity Buys Item page
- Fixed refresh icon positioning to match Back button vertical alignment
- Fixed missing `notfound.png` file in repository (404 error)

### Technical Changes
- Updated `search-planned-purchase` template to include `PK` field
- Improved null/undefined handling for forecast values (preserves 0 values)
- Enhanced error handling and logging throughout the application
- Improved responsive CSS for mobile devices
- Better separation of Opportunity Buys and Suggested Orders logic

---

## Version 1.1.0
(Previous version - no changelog available)
