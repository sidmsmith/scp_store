# SCP Store - Changelog

## Version 1.1.0 (Current)

### Major Features Added

#### 1. Barcode Scanner for Store ID
- **Camera Icon Button**: Added camera icon button next to Store ID input field
- **Mobile Camera Integration**: Opens phone camera for barcode scanning
- **Multiple Barcode Format Support**: Supports Code 128, EAN, UPC, Code 39, Codabar, and more
- **Smart Scanning**: 
  - Confidence checking (minimum 40% confidence required)
  - Consistency checking (requires same code scanned 2+ times)
  - Debouncing to prevent rapid successive scans
- **Auto-fill**: Automatically fills Store ID input with scanned value
- **Error Handling**: Graceful handling of camera permissions and initialization errors

#### 2. Enhanced Order Submission Workflow
- **Review API Integration**: New API call to review inventory movement before submission (only for "Suggested" orders)
- **Clear SOQ API**: New endpoint for clearing suggested order quantity when quantity is set to 0
- **Sequential Processing**: 
  - Review API called once before item updates
  - Items with quantity > 0 processed first
  - Items with quantity = 0 processed after (clear SOQ)
- **Submission Completion Modal**: Displays modal with number of updated lines after submission
- **Auto-refresh**: Automatically refreshes Suggested Orders screen after successful submission

#### 3. Release Order Functionality
- **Release Order Button**: New button next to Submit Changes button
- **Button States**: 
  - Disabled/greyed out when there are pending item changes
  - Enabled after successful submission
- **Release API Integration**: Calls approve inventory movement API
- **Post-Release Flow**: 
  - Displays success/error modal
  - Navigates back to Suggested Orders screen
  - Auto-refreshes order list

#### 4. Item Image Display
- **Image API Integration**: Fetches item images from `/item/api/item/item/search`
- **Dynamic Image Loading**: Displays actual item images on order item cards
- **Graceful Fallback**: Falls back to placeholder if image fails to load
- **Error Handling**: Handles image loading errors without breaking UI

#### 5. URL Parameters Support
- **Store Parameter**: Auto-validates store if `Store` parameter is present in URL
- **Console Parameter**: Hides console window and button if `Console=N` is in URL
- **Auto-authentication**: Supports `ORG` parameter for automatic authentication
- **Cross-app Integration**: Enables seamless integration with other applications

#### 6. Store Validation
- **Location Search API**: Validates store ID using `/itemlocation/api/itemlocation/location/search`
- **Error Feedback**: Displays "Invalid Store" message if validation fails
- **Prevents Invalid Entries**: Blocks submission with invalid store IDs

### UI/UX Improvements

#### Header Reorganization
- **Store Header**: Store and Department displayed in centered header
- **Items Header**: Department and Order Status displayed in header (Department removed from duplicate location)
- **Button Positioning**: 
  - Desktop: Buttons inline with text on right side (doesn't affect centering)
  - Mobile: Buttons in top-right corner of screen (viewport) with 10% width
- **Consistent Labeling**: "Change Store" button renamed to "Back" for consistency
- **Logo Display**: Manhattan logo now visible on ORG and Store prompt pages

#### Mobile Optimizations
- **Responsive Button Layout**: Buttons positioned in top-right corner on mobile to prevent overlap
- **Text Centering**: Header text centered independently of buttons
- **Bottom Padding**: Increased padding on mobile for Items page to show full last card
- **Scrollbar Fixes**: Eliminated page-level scrollbar, only card containers scroll
- **Button Sizing**: 10% width buttons on mobile with min/max constraints

#### Layout Improvements
- **Flexbox Layout**: Implemented proper flexbox layout to prevent page scrolling
- **Fixed Positioning**: Body set to `position: fixed` to eliminate page scrollbar
- **Scrollable Containers**: Only cards/orders containers scroll, not entire page
- **Status Messages**: 
  - Removed all positive status messages (success/info)
  - Only error messages displayed
  - Messages cleared when navigating between pages

#### Button Layout
- **Submit/Release Buttons**: 
  - Optimized for mobile to fit on single line
  - Reduced size and padding
  - Color scheme: Submit = Blue, Release = Green
- **Button States**: Release Order button disabled when pending changes exist

### Technical Improvements

#### API Enhancements
- **InventoryMovementId**: Added to inventory movement search API template
- **New API Endpoints**:
  - `/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/review`
  - `/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/clearSOQ`
  - `/ai-inventoryoptimization/api/ai-inventoryoptimization/inventorymovement/approve`
  - `/item/api/item/item/search` (for item images)
  - `/itemlocation/api/itemlocation/location/search` (for store validation)

#### Code Quality
- **Error Handling**: Improved error handling throughout application
- **State Management**: Better state management with data attributes
- **Code Organization**: Cleaner code structure and organization
- **Console Logging**: Comprehensive verbose logging for debugging

### Bug Fixes
- Fixed duplicate Department display on Items page
- Fixed header visibility when navigating between pages
- Fixed status messages persisting after navigation
- Fixed scrollbar issues (eliminated second scrollbar)
- Fixed last card visibility on mobile devices
- Fixed logo display on ORG and Store prompt pages
- Fixed button overlap with text on mobile

### Documentation
- **Technical Documentation**: Comprehensive API and technical documentation
- **User Guide**: End-user focused guide with workflows and tips
- **Changelog**: This document tracking all version changes

---

## Version 1.0.0

### Initial Release
- Basic authentication
- Store ID input
- Suggested Orders and Opportunity Buys cards
- Order listing and item display
- Quantity modification
- Order submission
