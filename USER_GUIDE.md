# SCP Store - User Guide

**Version:** 1.1.0  
**Last Updated:** 2024

## Welcome to SCP Store

SCP Store is a mobile-first web application designed to help you manage suggested orders and inventory movements. This guide will walk you through using the application step by step.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Navigation Overview](#navigation-overview)
3. [Step-by-Step Workflows](#step-by-step-workflows)
4. [Understanding the Interface](#understanding-the-interface)
5. [Common Tasks](#common-tasks)
6. [Tips and Best Practices](#tips-and-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Application

1. Open your web browser and navigate to the SCP Store URL
2. You may be automatically logged in if your organization is provided in the URL
3. If not, you'll see a login screen

### First-Time Login

1. **Enter Your Organization ID**
   - Type your organization ID in the "ORG:" field (e.g., "SDT-TEST")
   - Press **Enter** or click outside the field to authenticate
   - Wait for the green success message: "Authenticated as [ORG]"

2. **Enter Store ID**
   - After authentication, you'll see the "Store ID:" input field
   - Enter your store ID (e.g., "STORE-4351")
   - Press **Enter** to continue
   - The system will validate your store automatically

3. **Main Menu**
   - Once validated, you'll see the main menu with two options:
     - **Suggested Orders** (clipboard icon)
     - **Opportunity Buys** (tags icon)

---

## Navigation Overview

### Main Pages

The application has four main pages:

1. **Authentication Page** - Enter organization ID
2. **Store Input Page** - Enter store ID
3. **Main Cards Page** - Choose Suggested Orders or Opportunity Buys
4. **Suggested Orders List** - View all suggested orders for your store
5. **Order Items Page** - View and modify items in a specific order

### Navigation Buttons

- **Change Store** - Returns to Store ID input (from Suggested Orders page)
- **Back** - Returns to previous page
- **Submit Changes** - Saves your quantity modifications
- **Release Order** - Releases/approves the order after changes are submitted

---

## Step-by-Step Workflows

### Workflow 1: View and Modify a Suggested Order

#### Step 1: Access Suggested Orders
1. After entering your Store ID, you'll see the main menu
2. Click the **Suggested Orders** card (clipboard icon)
3. The system will load all suggested orders for your store

#### Step 2: Review Order List
- Each order card shows:
  - **Source Location** - Where the order is coming from (e.g., "DC-1000")
  - **Sub Group** - Department (e.g., "DEPARTMENT-001")
  - **Status** - Current order status (e.g., "Suggested")
  - **Quantity** - Total quantity
  - **Items** - Number of items in the order
  - **Total Cost** - Total cost in USD
  - **Total Units** - Total units in EA

#### Step 3: Select an Order
1. Click on any order card to view its items
2. The system will load all items for that order
3. You'll see the Order Items page with detailed item information

#### Step 4: Review Item Details
Each item card displays:
- **Item Image** - Product image (if available)
- **Item ID and Description** - e.g., "718492 - TACKY GREASE 397G"
- **Quantity** - Suggested order quantity
- **Price** - Item price
- **On Hand** - Current inventory level
- **Forecast** - Forecasted quantity
- **Quantity Control** - Pill at the bottom to modify quantity

#### Step 5: Modify Item Quantities
Use the quantity control pill at the bottom of each item card:

- **Plus (+) Button:** Increase quantity by 1
- **Minus (-) Button:** Decrease quantity by 1
- **Trash Icon:** Remove item (sets quantity to 0)

**Important Notes:**
- Changes are tracked automatically
- The "Release Order" button becomes disabled when you make changes
- You can modify multiple items before submitting

#### Step 6: Submit Your Changes
1. Review all your quantity modifications
2. Click the blue **Submit Changes** button at the bottom
3. Wait for the confirmation modal:
   - Success: "Successfully updated X line(s)."
   - Errors: "Updated X line(s) with Y error(s). Check console for details."
4. Click **OK** to dismiss the modal

**What Happens:**
- The system reviews the order (if status is "Suggested")
- Updates all items with quantity > 0
- Removes all items with quantity = 0
- Refreshes the order status automatically
- Re-enables the "Release Order" button

#### Step 7: Release the Order
1. After successfully submitting changes, click the green **Release Order** button
2. Confirm the release in the dialog box
3. Wait for the completion modal:
   - Success: "Order released successfully"
   - Error: Shows error message
4. Click **OK** to return to the Suggested Orders list
5. The order list will automatically refresh to show updated statuses

---

### Workflow 2: Change to a Different Store

#### From Main Cards Page:
1. If you're on the main menu, simply enter a new Store ID in the input field
2. Press **Enter** to validate and load

#### From Suggested Orders Page:
1. Click the **Change Store** button at the top
2. You'll return to the Store ID input
3. Enter the new Store ID and press **Enter**

#### From Order Items Page:
1. Click the **Back** button to return to Suggested Orders
2. Click **Change Store** to return to Store ID input
3. Enter the new Store ID

---

### Workflow 3: Remove an Item from an Order

1. Navigate to the Order Items page for the order
2. Find the item you want to remove
3. Click the **trash icon** in the quantity control pill
   - The quantity will be set to 0
   - The item card will appear faded (50% opacity)
4. Click **Submit Changes** to save the removal
5. The item will be removed from the order after successful submission

---

## Understanding the Interface

### Main Cards Page

**Header:**
- Manhattan Associates logo at the top
- "Store: [STORE-ID]" below the logo

**Cards:**
- **Suggested Orders** - View and manage suggested orders
- **Opportunity Buys** - (Coming soon)

**Buttons:**
- None on main cards page

---

### Suggested Orders Page

**Header:**
- "Store: [STORE-ID]"
- "Department: [DEPARTMENT]"
- **Change Store** button (top right)

**Order Cards:**
Each card shows:
- Source Location
- Sub Group (Department)
- Status
- Quantity
- Items count
- Total Cost (bottom of card)
- Total Units (bottom of card)

**Clicking an Order Card:**
- Navigates to Order Items page
- Loads all items for that order

---

### Order Items Page

**Header:**
- "Store: [STORE-ID]"
- "Department: [DEPARTMENT]"
- "Order Status: [STATUS]"
- **Back** button (top left)

**Item Cards:**
Each card displays:
- **Left:** Item image (or placeholder)
- **Center:**
  - Item ID - Item Description
  - Quantity: [number]
  - Price: $[amount]
  - On Hand: [number]
  - Forecast: [number]
- **Right:** Quantity control pill (trash, minus, quantity display, plus)

**Bottom Buttons:**
- **Submit Changes** (blue) - Saves modifications
- **Release Order** (green) - Releases/approves order

**Button States:**
- **Release Order** is disabled (greyed out) if you have unsaved changes
- **Release Order** is enabled after successfully submitting all changes

---

## Common Tasks

### Task 1: Increase Quantity for Multiple Items

1. Navigate to Order Items page
2. For each item to modify:
   - Click the **plus (+)** button to increase quantity
   - Or click multiple times to increase by more than 1
3. Review all changes
4. Click **Submit Changes** once to save all modifications

**Tip:** You can modify as many items as needed before clicking Submit Changes.

---

### Task 2: Decrease Quantity

1. Click the **minus (-)** button in the quantity control pill
2. Quantity decreases by 1
3. Minus button disappears when quantity reaches 0

**Note:** If you want to remove the item completely, use the trash icon instead.

---

### Task 3: Remove Multiple Items

1. Click the **trash icon** for each item you want to remove
2. Items will appear faded but remain visible
3. Click **Submit Changes** to remove all items at once

---

### Task 4: View Order Status After Release

1. After clicking **Release Order** and confirming
2. Click **OK** on the success modal
3. You'll automatically return to Suggested Orders page
4. The order list will refresh automatically
5. Check the Status field on the order card to see the updated status

---

### Task 5: Cancel Changes and Start Over

1. If you've made changes but haven't clicked Submit Changes:
   - Click **Back** to return to Suggested Orders
   - Re-click the order card to reload original quantities
2. If you've already submitted changes:
   - You cannot undo submitted changes
   - You would need to modify quantities again and submit new changes

---

## Tips and Best Practices

### Quantity Management

1. **Review Before Submitting:** Always review your quantity changes before clicking Submit Changes
2. **Submit in Batches:** You can modify multiple items and submit all changes at once
3. **Check Totals:** Review Total Cost and Total Units before releasing an order
4. **Verify Status:** After release, check the order status to confirm it was processed

### Navigation Tips

1. **Use Back Button:** The Back button returns you to the previous page
2. **Change Store:** Use Change Store button to quickly switch to a different store
3. **Release After Submit:** Always submit changes before releasing an order
4. **Check Button States:** Disabled buttons indicate actions that can't be performed (e.g., Release Order when there are pending changes)

### Performance Tips

1. **Wait for Loading:** Allow pages to fully load before clicking buttons
2. **Check Status Messages:** Status messages at the top indicate what's happening
3. **Review Modals:** Read completion modals carefully to confirm success or errors
4. **Console Window:** If available, the console window shows detailed API information (useful for troubleshooting)

---

## Troubleshooting

### Problem: "Invalid Store" Error

**Symptom:** You see "Invalid Store" message when entering Store ID

**Solutions:**
- Verify the Store ID is correct (check spelling and format)
- Ensure the Store ID exists in the system
- Contact your administrator if the store should be valid

---

### Problem: Cannot Click "Release Order" Button

**Symptom:** Release Order button is greyed out/disabled

**Possible Causes:**
- You have unsaved quantity changes
- You've modified items but haven't clicked Submit Changes

**Solution:**
1. Review all item quantities you've modified
2. Click **Submit Changes** to save your modifications
3. Wait for the success modal
4. The Release Order button will become enabled

---

### Problem: "No suggested orders found"

**Symptom:** After clicking Suggested Orders, you see "No suggested orders found"

**Solutions:**
- Verify you're using the correct Store ID
- Check if there are any suggested orders for this store in the system
- Try a different Store ID if you have access to multiple stores
- Contact your administrator if orders should exist

---

### Problem: "No items found"

**Symptom:** After clicking an order card, you see "No items found"

**Solutions:**
- This may indicate the order has no items or has been processed
- Return to Suggested Orders and check the order status
- Try selecting a different order

---

### Problem: Submission Fails

**Symptom:** Submit Changes shows errors or fails

**Possible Causes:**
- Network connectivity issues
- Order status has changed (e.g., no longer "Suggested")
- Item data has changed

**Solutions:**
1. Check your internet connection
2. Return to Suggested Orders and refresh
3. Try clicking the order card again to reload current data
4. Review error messages in the completion modal
5. Contact support if the issue persists

---

### Problem: Release Order Fails

**Symptom:** Release Order shows an error

**Possible Causes:**
- Order status has changed
- Required changes haven't been submitted
- Network or API issues

**Solutions:**
1. Ensure all changes have been submitted successfully
2. Return to Suggested Orders and check order status
3. Try selecting the order again and retry
4. Contact support if the issue persists

---

## Quick Reference

### Button Locations

| Button | Page | Location |
|--------|------|----------|
| Submit Changes | Order Items | Bottom (sticky, blue) |
| Release Order | Order Items | Bottom (sticky, green) |
| Change Store | Suggested Orders | Top right |
| Back | Order Items | Top left |

### Keyboard Shortcuts

- **Enter** - Submits input (ORG, Store ID)
- No other keyboard shortcuts currently available

### Visual Indicators

- **Faded Item Card** - Item quantity is set to 0
- **Disabled Button** - Action cannot be performed (greyed out)
- **Loading Spinner** - System is processing
- **Green Status** - Success message
- **Red Status** - Error message
- **Blue Status** - Information message

---

## Support

If you encounter issues not covered in this guide:

1. Check the console window (if enabled) for detailed error information
2. Review error messages in modals and status areas
3. Contact your system administrator
4. Provide details about:
   - Store ID you're using
   - Order you're working with
   - Error messages you see
   - Steps that led to the issue

---

## Version Information

- **Application Version:** 1.0.0
- **Last Updated:** 2024
- **Browser Compatibility:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile Support:** Yes (mobile-first design)

---

## Glossary

- **Store ID:** Unique identifier for a retail location
- **Source Location:** Distribution center or warehouse that supplies the store
- **Sub Group:** Department or category identifier
- **Order Status:** Current state of the order (e.g., "Suggested", "Approved")
- **Final Order Quantity:** The quantity that will be ordered
- **On Hand:** Current inventory level at the store
- **Forecast:** Predicted future demand
- **Release Order:** Approve and submit the order for processing

---

## Appendix: Using URL Parameters

### Quick Access with URL Parameters

You can bookmark or share URLs with automatic configuration:

**Example URL:**
```
https://manh-scp.vercel.app/?ORG=SDT-TEST&Store=STORE-4351&Console=N
```

**Parameters:**
- `ORG` or `Organization` - Auto-fills organization and authenticates
- `Store` - Auto-validates and loads the store
- `Console` - Set to "N" to hide the console window

**Benefits:**
- Skip authentication step
- Jump directly to a specific store
- Cleaner interface (hide console)

---

*End of User Guide*
