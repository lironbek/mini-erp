# 🏗️ מדריך בנייה שלב אחר שלב – Mini ERP
## סדר הפרומפטים ל-Claude (Cursor / Claude Code / Claude.ai)

---

## 📋 כללי עבודה חשובים

> **לפני שמתחילים:**
> - כל פרומפט בונה על הקודם – **לא לדלג על שלבים**
> - אחרי כל שלב – לוודא שהכל רץ בלי שגיאות לפני שממשיכים
> - שמרו את הפרומפטים בקובץ נפרד כדי שתוכלו לחזור אליהם
> - מומלץ לעבוד ב-Git ולעשות commit אחרי כל שלב

---

## 🟢 פאזה 1: תשתית (שלבים 1-3)
> **מטרה:** להקים את השלד של הפרויקט – בלי שלד אין בניין

---

### שלב 1 – הקמת פרויקט ותשתית בסיסית
**📌 פרומפט:** PROMPT 1 (Project Setup & Foundation)

**מה זה בונה:**
- פרויקט Next.js 14 עם TypeScript
- Tailwind CSS + shadcn/ui
- תשתית רב-לשונית (next-intl) עם 4 שפות
- תמיכה ב-RTL לעברית
- Layout בסיסי עם Sidebar + Header
- דף Login
- קבצי תרגום בסיסיים

**איך לוודא שזה עובד:**
```
✅ npm run dev עובד בלי שגיאות
✅ דף הבית נטען עם Sidebar
✅ מחליפים שפה לעברית → הכל מתהפך ל-RTL
✅ דף Login מוצג
✅ עובד במובייל (רספונסיבי)
```

**⏱️ זמן משוער:** 2-3 שעות

---

### שלב 2 – סכמת בסיס נתונים
**📌 פרומפט:** PROMPT 2 (Database Schema & Prisma Setup)

**מה זה בונה:**
- כל הטבלאות ב-Prisma Schema
- Enums (סטטוסים, סוגי תנועות, וכו׳)
- יחסים בין טבלאות
- אינדקסים
- קובץ Seed עם נתוני דוגמה
- Migration ראשוני

**תלוי ב:** שלב 1 ✅

**איך לוודא שזה עובד:**
```
✅ npx prisma migrate dev עובר בהצלחה
✅ npx prisma db seed טוען נתוני דוגמה
✅ npx prisma studio פותח ורואים את כל הטבלאות עם נתונים
✅ אפשר לראות לקוחות, מוצרים, חומרי גלם, ספקים
```

**⏱️ זמן משוער:** 2-3 שעות

---

### שלב 3 – מערכת הרשאות ואימות
**📌 פרומפט (לכתוב חדש):**

```
Set up the authentication and authorization system for the Mini ERP.

Using the existing Next.js 14 project with Prisma (users table already exists):

1. Configure NextAuth.js:
   - Credentials provider (email + password)
   - JWT session with role included
   - Login page at /[locale]/(auth)/login
   - Secure password hashing with bcrypt

2. Role-Based Access Control Middleware:
   - Roles: admin, manager, production, warehouse, sales, viewer
   - Create middleware that checks role permissions per route
   - Permission matrix:
     * /dashboard/reports/profitability → admin, manager only
     * /production/report → admin, manager, production
     * /inventory/receive → admin, manager, warehouse
     * /orders → admin, manager, sales (create/edit), production (view only)
     * /settings → admin only
   - Unauthorized users see 403 page

3. User Management Page (/settings/users):
   - List all users
   - Create new user (admin only)
   - Edit role, activate/deactivate
   - Password reset

4. Session handling:
   - 30 minute timeout
   - Remember me option
   - Redirect to login when expired

5. Create 3 seed users:
   - admin@pitabakery.sg (Admin)
   - manager@pitabakery.sg (Manager)  
   - floor@pitabakery.sg (Production)

All UI translated to 4 languages. RTL support for Hebrew.
```

**תלוי ב:** שלבים 1+2 ✅

**איך לוודא שזה עובד:**
```
✅ Login עובד עם המשתמשים שנוצרו
✅ Admin רואה הכל, Production רואה רק ייצור
✅ ניסיון גישה לדף לא מורשה → 403
✅ Session פג אחרי 30 דקות
✅ Login עובד בעברית (RTL)
```

**⏱️ זמן משוער:** 2-3 שעות

---

## 🟡 פאזה 2: Master Data – נתוני בסיס (שלבים 4-6)
> **מטרה:** לבנות את המסכים לניהול נתוני בסיס – בלי מוצרים וחומרי גלם אין מה לנהל

---

### שלב 4 – ניהול מוצרים וחומרי גלם
**📌 פרומפט (לכתוב חדש):**

```
Build the master data management pages for Products, Raw Materials, 
and their shared components.

Using the existing Next.js 14 + Prisma + next-intl + shadcn/ui project:

1. PRODUCTS PAGE (/app/[locale]/(dashboard)/products/page.tsx):
   - Table listing all products with: SKU, name (current locale), category,
     production line, shelf life, selling price, stock level, status (active/inactive)
   - Filters: category, production line, active/inactive
   - Search by name (multi-language) or SKU
   - Click row → detail/edit page

2. PRODUCT FORM (/app/[locale]/(dashboard)/products/[id]/page.tsx):
   - Create and Edit mode
   - Fields: SKU, barcode, name (input for each language: en/he/zh-CN/ms),
     description (multi-language), category (dropdown), production_line (dropdown),
     unit_of_measure, units_per_pack, pack_weight_kg, shelf_life_days,
     min_stock_level, max_stock_level, reorder_point, standard_batch_size,
     selling_price, cost_price, is_active
   - Image upload for product photo
   - Validation: SKU unique, required fields
   - Save → redirect to list with success toast

3. RAW MATERIALS PAGE (/app/[locale]/(dashboard)/raw-materials/page.tsx):
   - Similar table: SKU, name, category, unit, primary supplier, stock level,
     min level, last price, status
   - Filters: category, supplier, allergen, storage location
   - Search by name or SKU

4. RAW MATERIAL FORM:
   - Fields: SKU, name (multi-language), description, category, unit_of_measure,
     min/max stock, reorder point, reorder quantity, lead_time_days,
     primary supplier (dropdown from suppliers), secondary supplier,
     storage_location, storage temp range, is_allergen, allergen_info
   - Validation rules

5. SHARED COMPONENTS:
   - MultiLanguageInput: component that shows 4 text fields (one per language)
     with flag/label for each. Expandable - shows current locale by default,
     "Show all languages" to expand
   - StatusBadge: color-coded badge component
   - DataTable: reusable sortable/filterable table with pagination
   - SearchInput: debounced search input
   - ConfirmDialog: "Are you sure?" modal

6. API ROUTES:
   - /api/products (GET list, POST create)
   - /api/products/[id] (GET, PUT, DELETE)
   - /api/raw-materials (GET list, POST create)
   - /api/raw-materials/[id] (GET, PUT, DELETE)

All text translated. RTL support. Responsive design.
```

**תלוי ב:** שלבים 1-3 ✅

**איך לוודא שזה עובד:**
```
✅ רשימת מוצרים מציגה את נתוני ה-Seed
✅ יצירת מוצר חדש עם שמות ב-4 שפות
✅ מחליפים שפה → שם המוצר משתנה
✅ פילטרים עובדים
✅ חיפוש מוצא מוצר בעברית
✅ עריכה ומחיקה עובדים
✅ אותו דבר לחומרי גלם
```

**⏱️ זמן משוער:** 3-4 שעות

---

### שלב 5 – ניהול ספקים ולקוחות
**📌 פרומפט (לכתוב חדש):**

```
Build Supplier and Customer management pages.

Using the existing project with Products and Raw Materials already built:

1. SUPPLIERS PAGE (/app/[locale]/(dashboard)/procurement/suppliers/page.tsx):
   - List with: name, contact, phone, country, payment terms, lead time, 
     delivery days, rating, active status
   - Search and filters

2. SUPPLIER FORM:
   - Fields: name (multi-language), short_name, contact_name, email, phone,
     address, country, payment_terms, currency (default SGD),
     delivery_days (multi-select: Sunday-Saturday with visual week grid),
     delivery_time_slots (add/remove time ranges like "06:00-08:00"),
     min_order_amount, lead_time_days, is_active, notes
   - IMPORTANT: delivery_days should clearly show which days deliveries 
     are possible (visual weekly calendar selector)
   - Xero contact ID field (for future integration)

3. CUSTOMERS PAGE (/app/[locale]/(dashboard)/customers/page.tsx):
   - List with: name, contact, email, phone, default delivery slot,
     cutoff time, payment terms, active status, tags
   - Search and filters

4. CUSTOMER FORM:
   - Fields: name (multi-language), short_name, contact_name, email, phone,
     whatsapp_number, delivery_address, billing_address,
     default_delivery_slot (time range picker),
     order_cutoff_time (time picker),
     payment_terms, credit_limit, currency, tags (multi-tag input),
     is_active, notes
   - External system fields: external_id, external_system (Ariba/Freshbooks)

5. API ROUTES for both entities

All text translated. RTL support. Reuse DataTable and other shared components.
```

**תלוי ב:** שלב 4 ✅

**⏱️ זמן משוער:** 2-3 שעות

---

### שלב 6 – ניהול עצי מוצר (BOM)
**📌 פרומפט:** חלק ה-BOM מתוך PROMPT 5 (Production – BOM Management)

```
Build the Bill of Materials (BOM) management system.

Using the existing project with Products and Raw Materials already in the database:

1. BOM LIST PAGE (/app/[locale]/(dashboard)/production/bom/page.tsx):
   - Shows all products with their BOM status:
     * ✅ Has active BOM
     * ⚠️ BOM exists but outdated (old version)
     * ❌ No BOM defined
   - Filter: by product category, production line, BOM status
   - Click product → BOM editor

2. BOM EDITOR (/app/[locale]/(dashboard)/production/bom/[productId]/page.tsx):
   - Product info header (name, SKU, category)
   - BOM version selector (v1, v2... with dates)
   - Editable table of ingredients:
     * Raw material (searchable dropdown from raw_materials)
     * Quantity (numeric input)
     * Unit (from raw material's unit)
     * Waste % (numeric, default 0)
     * Optional flag (checkbox)
     * Sort order (drag to reorder)
   - Standard batch size input + unit
   - Yield percentage input
   - "Add Ingredient" button
   - Remove ingredient (with confirmation)
   - Save → creates new version if BOM changed
   - Visual tree view option (toggle between table and tree)

3. BATCH CALCULATOR (component within BOM editor):
   - Input: "I want to produce X units"
   - Output: table showing required quantity of each raw material
   - Accounts for waste % and yield %
   - Shows current stock of each material
   - Highlights materials that don't have enough stock (red)

4. WHERE-USED REPORT (/app/[locale]/(dashboard)/production/bom/where-used/page.tsx):
   - Select a raw material → shows all products that use it
   - Shows quantity per batch for each product
   - Useful for: "if flour price changes, which products are affected?"

5. BOM IMPORT:
   - Upload CSV with columns: product_sku, material_sku, quantity, unit, waste_pct
   - Preview and validate before importing
   - Error reporting for invalid SKUs

6. COST CALCULATION (display in BOM editor):
   - For each ingredient: quantity × last_purchase_price
   - Total raw material cost per batch
   - Cost per unit (total / batch_size × yield)
   - Compare with selling_price → show margin

7. API ROUTES:
   - /api/bom/[productId] (GET active BOM, POST create/update)
   - /api/bom/[productId]/versions (GET all versions)
   - /api/bom/[productId]/calculate (POST - batch calculator)
   - /api/bom/where-used/[materialId] (GET)
   - /api/bom/import (POST - CSV import)

All text translated. RTL support.
```

**תלוי ב:** שלבים 4+5 ✅

**איך לוודא שזה עובד:**
```
✅ אפשר ליצור BOM למוצר עם מספר חומרי גלם
✅ מחשבון כמויות נותן תוצאות נכונות
✅ Where-Used מראה את כל המוצרים שמשתמשים בקמח
✅ עלות מחושבת נכון
✅ גרסאות BOM נשמרות
```

**⏱️ זמן משוער:** 4-5 שעות

---

## 🔵 פאזה 3: תפעול ליבה (שלבים 7-10)
> **מטרה:** לבנות את הפונקציונליות המרכזית – הזמנות, ייצור, מלאי

---

### שלב 7 – מודול הזמנות (ידני)
**📌 פרומפט:** PROMPT 3 (Order Management Module)

> **שימו לב:** בשלב הזה בונים רק הזמנות ידניות.
> את ה-AI parsing (אימייל + וואטסאפ) נוסיף בשלב 12.
> הסירו מהפרומפט את החלקים של AI import ותוסיפו הערה:
> "AI email and WhatsApp parsing will be added later. For now, 
> focus on manual order entry and the unified order management screen."

**מה זה בונה:**
- מסך רשימת הזמנות עם פילטרים ומיון
- 3 תצוגות: רשימה, לוח שנה, קנבאן
- טופס הזמנה חדשה
- מסך פרטי הזמנה
- Workflow סטטוסים
- זיהוי חריגות (Anomaly Detection)
- מנגנון נעילה (Locking)
- היסטוריית שינויים

**תלוי ב:** שלבים 1-6 ✅

**איך לוודא שזה עובד:**
```
✅ יצירת הזמנה ידנית עם בחירת לקוח ומוצרים
✅ "העתק מהזמנה אחרונה" עובד
✅ סטטוס משתנה: Pending → Confirmed → Locked
✅ הזמנה חריגה (כמות x3) מסומנת ב-⚠
✅ הזמנה נעולה → לא ניתן לערוך
✅ מנהל יכול לפתוח נעילה
✅ היסטוריית שינויים מוצגת
✅ תצוגת לוח שנה מראה הזמנות לפי תאריך אספקה
✅ עובד בעברית (RTL)
```

**⏱️ זמן משוער:** 6-8 שעות

---

### שלב 8 – מודול מלאי (בסיסי)
**📌 פרומפט:** חלקים 1, 2, 3, 7 מתוך PROMPT 6 (Inventory)

```
Build the core Inventory Management module.

Using the existing project with Products, Raw Materials, and BOM already built:

1. INVENTORY OVERVIEW (/app/[locale]/(dashboard)/inventory/page.tsx):
   - Two tabs: Raw Materials | Finished Goods
   - For each item: name, SKU, category, on_hand, reserved, available, 
     min level, max level, status indicator (🟢🟡🔴)
   - Summary bar: "X OK | Y Low | Z Critical"
   - Filters: category, status, supplier
   - Search by name/SKU
   - Click item → movement history with chart

2. MANUAL STOCK ADJUSTMENT (/app/[locale]/(dashboard)/inventory/adjust/page.tsx):
   - Select item → enter quantity (+/-) → select reason → notes
   - Reasons: Physical Count, Correction, Write-off, Other
   - Creates inventory_movement record
   - Updates inventory_stock

3. DAMAGE REPORTING (/app/[locale]/(dashboard)/inventory/damage/page.tsx):
   - Select item → quantity → reason dropdown → optional notes
   - Reasons: Expired, Contaminated, Damaged, Wrong Item, Quality Issue, Other
   - Deducts from inventory
   - Creates DAMAGED movement record
   - Logs in audit trail
   - (Xero credit note integration will be added later)

4. MOVEMENT HISTORY (/app/[locale]/(dashboard)/inventory/movements/page.tsx):
   - List all inventory movements with filters:
     * Date range, item, movement type, reference
   - Shows: date, item, type, quantity (+/-), reference, user
   - Export to Excel

5. STOCK STATUS SERVICE (/lib/services/inventory.ts):
   - getStockLevel(itemType, itemId) → current quantity
   - adjustStock(itemType, itemId, quantity, type, reference) → creates movement
   - getItemsBelowMinimum() → list of items needing reorder
   - getItemsApproachingExpiry(days) → list of expiring FG

6. API ROUTES:
   - /api/inventory (GET - list with filters)
   - /api/inventory/[id] (GET - item detail with movements)
   - /api/inventory/adjust (POST - manual adjustment)
   - /api/inventory/damage (POST - report damage)
   - /api/inventory/movements (GET - movement history)
   - /api/inventory/alerts (GET - low stock items)

Initialize inventory_stock records from seed data.
All text translated. RTL support. Responsive.
```

**תלוי ב:** שלבים 4-6 ✅

**איך לוודא שזה עובד:**
```
✅ מסך מלאי מציג את כל הפריטים עם רמות צבעוניות
✅ התאמת מלאי ידנית מעדכנת את הכמות
✅ דיווח נזק מוריד מהמלאי
✅ היסטוריית תנועות מוצגת נכון
✅ פריטים מתחת למינימום מסומנים באדום
```

**⏱️ זמן משוער:** 4-5 שעות

---

### שלב 9 – תכנון ייצור ופקודות עבודה
**📌 פרומפט:** חלקים 2, 3 מתוך PROMPT 5 (Production Planning + Work Orders)

```
Build the Production Planning and Work Order system.

Using the existing project with Orders, Inventory, and BOM already built:

1. PRODUCTION PLANNING (/app/[locale]/(dashboard)/production/plan/page.tsx):
   - Date selector (default: tomorrow)
   - Algorithm:
     a. Aggregate confirmed/locked orders for selected date
     b. Group by production line (Bakery / Salads / Frozen)
     c. For each product: show ordered qty, current FG stock, net to produce
     d. Check make-to-stock items: if FG stock < reorder_point, add
     e. BOM explosion: calculate total raw materials needed
     f. Compare with current RM stock → highlight shortages
     g. Capacity check per line (configurable daily capacity)
   
   - Display:
     * Left panel: Bakery line items, Right panel: Salads line items
     * For each product: order qty, stock, net production
     * Bottom section: Material requirements with availability status
     * Warnings panel: shortages, over-capacity
   
   - Actions:
     * "Generate Work Orders" → creates WO records in DB
     * "Create PO Draft" for missing materials → links to procurement
     * Print production plan

2. WORK ORDER LIST (/app/[locale]/(dashboard)/production/work-orders/page.tsx):
   - List with filters: date, production line, status
   - Status color coding: Planned (blue), In Progress (yellow), 
     Completed (green), Cancelled (grey)
   - Click → work order detail

3. WORK ORDER DETAIL:
   - WO number, date, production line, status
   - Items table: product, planned qty, produced qty, waste, status
   - Required materials list (auto-calculated from BOM)
   - Linked customer orders
   - Status change buttons: Start → Complete / Cancel
   - Timeline of events

4. PRODUCTION PLAN SERVICE (/lib/services/production-plan.ts):
   - generatePlan(date) → returns full plan with demands, materials, alerts
   - createWorkOrders(plan) → creates WO and WO items in DB
   - checkCapacity(line, date) → returns utilization %
   
   Implementation of the algorithm:
   function generateProductionPlan(targetDate):
     // Get confirmed orders for this delivery date
     orders = prisma.orders.findMany({ 
       where: { requested_delivery_date: targetDate, status: IN ['confirmed','locked'] },
       include: { items: { include: { product: true } } }
     })
     
     // Aggregate demand by product
     demand = new Map<productId, quantity>()
     for each order.items → demand[productId] += quantity
     
     // Add make-to-stock items
     for each product where inventory < reorder_point:
       demand[productId] += standard_batch_size
     
     // Subtract available FG stock
     netDemand = new Map()
     for each [productId, qty] in demand:
       stock = getAvailableStock(productId)
       netDemand[productId] = Math.max(0, qty - stock)
     
     // Explode BOM
     materialNeeds = new Map<materialId, quantity>()
     for each [productId, qty] in netDemand:
       bom = getActiveBOM(productId)
       for each bomItem:
         needed = (qty / bom.batch_size) * bomItem.quantity * (1 + bomItem.waste_pct/100)
         materialNeeds[materialId] += needed
     
     // Check availability
     materialAlerts = []
     for each [materialId, needed] in materialNeeds:
       available = getStock(materialId)
       if available < needed → materialAlerts.push(...)
     
     return { netDemand, materialNeeds, materialAlerts }

5. API ROUTES:
   - /api/production/plan/[date] (GET)
   - /api/production/plan/generate (POST)
   - /api/production/work-orders (GET list, POST create)
   - /api/production/work-orders/[id] (GET, PATCH status)

All UI translated. RTL support.
```

**תלוי ב:** שלבים 7+8 ✅

**איך לוודא שזה עובד:**
```
✅ תכנון ייצור מחשב נכון כמות נטו (הזמנה - מלאי קיים)
✅ BOM explosion מראה את כל חומרי הגלם הנדרשים
✅ חוסרים מסומנים באדום
✅ "צור פקודות עבודה" יוצר WO records
✅ סטטוס WO משתנה: Planned → In Progress → Completed
```

**⏱️ זמן משוער:** 5-6 שעות

---

### שלב 10 – דיווח ייצור מרצפת המפעל
**📌 פרומפט:** חלקים 4, 5, 6 מתוך PROMPT 5 (Floor Reporting + Labels)

```
Build the Factory Floor Production Reporting interface.

This is a CRITICAL interface used by production workers on tablets in the factory.
Design for: large buttons, gloved hands, minimal text input, clear feedback.

Using the existing project with Work Orders already built:

1. FLOOR REPORTING PAGE (/app/[locale]/(dashboard)/production/report/page.tsx):
   
   SIMPLIFIED UI DESIGN:
   - Large header showing today's date and production line
   - List of active work orders (today, current line)
   - Select WO → shows items to report
   
   For each item:
   - Product name and photo (large, clear)
   - Target quantity (large number)
   - INPUT: Quantity produced (large number input, +/- buttons for quick adjust)
   - INPUT: Waste quantity (smaller input)
   - INPUT: Waste reason (large button dropdown: Overcooked, Underweight, 
     Damaged, Contaminated, Machine Error, Other)
   - Optional: Notes text field
   - Big green button: "✓ REPORT COMPLETE"
   
   Visual progress bar showing X of Y items reported

2. ON REPORT SUBMISSION (critical business logic):
   When user clicks "Report Complete" for an item:
   
   a. Create production_report record with quantities
   
   b. ADD to Finished Goods inventory:
      - Create PRODUCTION_OUTPUT inventory movement
      - quantity = produced_quantity
      - Calculate expiry_date = today + product.shelf_life_days
      - Generate batch_number = YYYYMMDD-{LINE}-{SEQ}
   
   c. DEDUCT from Raw Materials inventory:
      - Get active BOM for this product
      - For each BOM item:
        consumed = (produced_quantity / bom.standard_batch_size) * bom_item.quantity
        Create PRODUCTION_INPUT inventory movement (negative)
        Update inventory_stock for that raw material
   
   d. Update work_order_item: produced_quantity, waste_quantity, status
   
   e. Check if all WO items completed → update WO status to "Completed"
   
   f. Optionally trigger label print (if configured)

3. LABEL INTEGRATION (/lib/integrations/labels.ts):
   - Generate label data: product_name (en + zh-CN), batch_number,
     production_date, expiry_date, ingredients list (from BOM),
     net_weight, barcode
   - Send via webhook/API to label printer
   - "Reprint Label" button on completed items

4. SHELF LIFE TRACKER:
   - Component showing items by expiry date
   - Color coding: >5 days (green), 3-5 days (yellow), <3 days (red), expired (black)
   - FIFO suggestion: when dispatching, show oldest batch first
   - Daily alert for items expiring within 2 days

5. API ROUTES:
   - /api/production/report (POST - submit production report)
   - /api/production/report/[woItemId] (GET - report for specific item)
   - /api/production/labels/print (POST - trigger label print)
   - /api/production/expiring (GET - items approaching expiry)

IMPORTANT: This page must work reliably on tablets. Consider:
- Large touch targets (min 56px height for buttons)
- High contrast text
- Success/error sounds or vibrations
- Confirmation dialog before submitting
- Handle network interruptions gracefully
```

**תלוי ב:** שלב 9 ✅

**איך לוודא שזה עובד:**
```
✅ מסך דיווח מציג את פקודות העבודה של היום
✅ דיווח ייצור של 100 פיתות:
   - 100 פיתות נוספו למלאי מוצרים מוגמרים
   - חומרי גלם ירדו לפי BOM (קמח, שמן, וכו')
   - תאריך תפוגה חושב נכון
   - מספר אצווה נוצר
✅ דיווח פחת נרשם בנפרד
✅ המסך עובד טוב בטאבלט (כפתורים גדולים)
✅ אחרי דיווח כל הפריטים → WO הופך ל-Completed
```

**⏱️ זמן משוער:** 5-6 שעות

---

## 🟣 פאזה 4: רכש ו-Reorder (שלבים 11-12)
> **מטרה:** ניהול רכש, הזמנות מספקים, מנגנון הזמנה אוטומטית

---

### שלב 11 – ניהול רכש והזמנות אוטומטיות
**📌 פרומפט:** חלקים 4, 5, 6 מתוך PROMPT 6 (Auto-reorder + PO + Stock Count)

```
Build the Procurement module with auto-reorder and stock counting.

Using the existing project with Inventory and Suppliers already built:

1. PURCHASE ORDER MANAGEMENT (/app/[locale]/(dashboard)/procurement/page.tsx):
   - PO list with filters: status, supplier, date range
   - Create PO form:
     * Select supplier → auto-populate delivery days and slots
     * Add items from raw materials catalog
     * Quantity + unit + price per unit
     * Expected delivery date (auto-calculated from lead time)
     * Delivery date must respect supplier's available days
       (e.g., no Saturday if supplier doesn't deliver Saturday)
     * Show delivery time slot options
   - PO lifecycle: Draft → Sent → Confirmed → Partially Received → Received
   - "Send to Supplier" → generates PDF and sends email
   - Partial receiving: mark items as received with actual quantities

2. AUTO-REORDER SERVICE (/lib/services/auto-reorder.ts):
   - Scheduled job (daily, configurable time)
   - Logic for each raw material:
     IF quantity_available <= reorder_point:
       base_qty = reorder_quantity
       // Check upcoming production needs
       upcoming = sum of BOM requirements for next {lead_time} days
       if (available - upcoming) < min_stock:
         suggested = max(reorder_qty, upcoming + min_stock - available)
       // Round to supplier minimums
       suggested = ceil(suggested / supplier_pack_size) * supplier_pack_size
       → Add to draft PO for primary supplier
   - Group suggestions by supplier → one draft PO per supplier
   - Notify manager with summary

3. REORDER SUGGESTIONS PAGE (/app/[locale]/(dashboard)/procurement/suggestions/page.tsx):
   - List of auto-generated suggestions
   - For each: material name, current stock, min level, suggested qty, supplier, est. cost
   - Approve → converts to draft PO
   - Modify quantity before approving
   - Dismiss suggestion (with reason)

4. STOCK COUNT (/app/[locale]/(dashboard)/inventory/count/page.tsx):
   - Start count: select type (Full / Partial by category / Spot Check)
   - Count sheet generation (printable)
   - Digital count entry: for each item, enter counted quantity
   - Auto-calculate variance (counted - system)
   - Color coding: >5% variance = red, 2-5% = yellow, <2% = green
   - Submit for review → Manager approves
   - On approval: adjusts inventory with COUNT movement type
   - Summary report: accuracy %, total variance value

5. DELIVERY CALENDAR (/app/[locale]/(dashboard)/procurement/calendar/page.tsx):
   - Calendar view showing expected and actual deliveries
   - Color coded by status: expected (blue), received (green), overdue (red)

6. API ROUTES for all above

All text translated. RTL support.
```

**תלוי ב:** שלבים 5+8 ✅

**⏱️ זמן משוער:** 5-6 שעות

---

### שלב 12 – קבלת סחורה (Goods Receipt)
**📌 פרומפט:** חלק 1 מתוך PROMPT 6

```
Build the Goods Receipt process for receiving raw materials from suppliers.

1. GOODS RECEIPT PAGE (/app/[locale]/(dashboard)/inventory/receive/page.tsx):
   
   Two modes:
   
   a. RECEIVE AGAINST PO:
      - Select open PO from dropdown (shows PO number, supplier, date)
      - Shows expected items and quantities
      - For each item: enter received quantity
      - Flag damaged items: quantity + reason (Damaged, Wrong Item, Short, Quality)
      - Storage location selection (dropdown: dry_store, chiller_1, freezer, etc.)
      - Submit → 
        * Creates PURCHASE_RECEIPT movements
        * Updates inventory_stock
        * Updates PO item received quantities
        * Updates PO status (partially_received or received)
        * If damages: creates DAMAGED movement + flags for credit note
   
   b. MANUAL RECEIPT (no PO):
      - Select supplier
      - Manually add items from raw materials catalog
      - Enter quantities, prices, invoice number
      - Same damage and storage flow
      - Creates movements without PO link

2. RECEIPT CONFIRMATION:
   - After submission: show receipt summary
   - Print goods receipt note (printable format)
   - Option to go back and add more items

3. CREDIT NOTE REQUEST (for damages):
   - When damages are reported during receipt:
     * Create a credit_note_request record
     * Status: pending (will be synced to Xero later)
     * Notification to manager

4. API ROUTES:
   - /api/inventory/receive (POST)
   - /api/inventory/receive/from-po/[poId] (GET - get PO items for receiving)
   - /api/inventory/credit-requests (GET list, POST create)
```

**תלוי ב:** שלב 11 ✅

**⏱️ זמן משוער:** 3-4 שעות

---

## 🟠 פאזה 5: אינטליגנציה והתרעות (שלבים 13-15)
> **מטרה:** AI, התראות אוטומטיות, תזכורות

---

### שלב 13 – מערכת התרעות והודעות
**📌 פרומפט:** PROMPT 8 (Notification System)

**מה זה בונה:**
- שירות התרעות מרכזי (in-app, email, WhatsApp, push)
- תבניות הודעות רב-לשוניות
- Jobs מתוזמנים (סיכום יומי, תזכורות, בדיקת מלאי)
- מרכז התרעות באפליקציה (פעמון + רשימה)
- הגדרות העדפות התרעה למשתמש

**תלוי ב:** שלבים 7-12 ✅

**⏱️ זמן משוער:** 4-5 שעות

---

### שלב 14 – AI Parser להזמנות (אימייל + וואטסאפ)
**📌 פרומפט:** PROMPT 4 (AI Order Parser)

**מה זה בונה:**
- Parser חכם לאימיילים (Claude API)
- Parser לוואטסאפ (כולל תמונות)
- אינטגרציית Gmail API
- אינטגרציית WhatsApp Business API
- מסך Review Queue לאישור הזמנות שפורסרו
- ציון ביטחון (confidence) לכל שדה

**תלוי ב:** שלב 7 (Orders) + שלב 13 (Notifications) ✅

**⏱️ זמן משוער:** 6-8 שעות

---

### שלב 15 – אינטגרציית Ariba
**📌 פרומפט:** PROMPT 9 (Ariba Integration)

**מה זה בונה:**
- Client ל-Ariba API
- Job שמושך הזמנות כל 30 דקות
- מיפוי פריטים (Ariba SKU ↔ Internal SKU)
- יצירת הזמנות אוטומטית
- מסך הגדרות מיפוי

**תלוי ב:** שלב 7 (Orders) ✅

**⏱️ זמן משוער:** 4-5 שעות

---

## 🔴 פאזה 6: אינטגרציות חשבונאיות (שלבים 16-17)
> **מטרה:** חיבור ל-Xero ו-Freshbooks

---

### שלב 16 – אינטגרציית Xero
**📌 פרומפט:** חלק ה-Xero מתוך PROMPT 10

```
Build the complete Xero accounting integration.

1. AUTHENTICATION:
   - Xero OAuth 2.0 with PKCE flow
   - Token storage in database (encrypted)
   - Auto-refresh before expiry
   - Connection status indicator in settings
   - "Connect to Xero" / "Disconnect" buttons

2. INBOUND SYNC (Xero → ERP):
   a. Supplier Invoices (every 15 minutes):
      - Pull new/updated invoices from Xero
      - Map Xero line items to internal raw_material SKUs
      - Create "Pending Receipt" in ERP (links to goods receipt flow)
      - Track invoice status sync
   
   b. Contacts/Suppliers (daily):
      - Sync supplier names, emails, addresses
      - Map Xero ContactID ↔ internal supplier_id
      - Create new suppliers if unmapped contact found (flag for review)
   
   c. Items & Prices (daily):
      - Sync item catalog with current prices
      - Track price changes → update last_purchase_price
      - Alert on significant price changes (>10%)

3. OUTBOUND SYNC (ERP → Xero):
   a. Credit Notes:
      - When damage reported in ERP → create credit note draft in Xero
      - Reference original invoice number
      - Include item details and quantities
   
   b. Purchase Orders:
      - When PO approved in ERP → create PO in Xero
      - Enable invoice matching

4. MAPPING UI (/app/[locale]/(dashboard)/settings/integrations/xero/page.tsx):
   - Item mapping table: Xero ItemCode ↔ Internal raw_material SKU
   - Contact mapping: Xero Contact ↔ Internal supplier
   - Unmapped items alert panel
   - Manual mapping interface
   - Bulk CSV mapping import

5. SYNC DASHBOARD:
   - Last sync time for each sync type
   - Sync errors log
   - Manual "Sync Now" buttons
   - Pending items count

6. BACKGROUND JOBS (BullMQ):
   - xero-invoice-sync: every 15 min
   - xero-contacts-sync: daily 02:00
   - xero-items-sync: daily 02:30
   - xero-credit-note-push: on demand (when damage reported)
   - xero-po-push: on demand (when PO approved)

Include comprehensive error handling, retry logic (3 retries with exponential backoff),
and detailed sync logging.
```

**תלוי ב:** שלבים 8+11+12 ✅

**⏱️ זמן משוער:** 6-8 שעות

---

### שלב 17 – אינטגרציית Freshbooks
**📌 פרומפט:** חלק ה-Freshbooks מתוך PROMPT 10

```
Build the Freshbooks integration for customer invoicing and revenue tracking.

1. AUTHENTICATION:
   - Freshbooks OAuth 2.0
   - Token management (same pattern as Xero)
   - Connection settings page

2. INBOUND SYNC (Freshbooks → ERP):
   a. Customer Invoices (every 30 minutes):
      - Pull invoices for revenue tracking
      - Map to internal orders (by customer + date)
      - Track payment status (AR aging)
   
   b. Clients (daily):
      - Sync customer details
      - Map Freshbooks clientID ↔ internal customer_id
   
   c. Items & Pricing (daily):
      - Product selling prices
      - Update product.selling_price when changed

3. MAPPING UI:
   - Client mapping: Freshbooks ↔ Internal customer
   - Item mapping: Freshbooks items ↔ Internal products
   - Unmapped items panel

4. REVENUE DATA SERVICE:
   - getRevenueByCustomer(dateRange) → customer revenue data
   - getRevenueByProduct(dateRange) → product revenue data
   - getARaging() → accounts receivable summary
   - This data feeds into the Dashboard (step 18)

5. BACKGROUND JOBS:
   - freshbooks-invoice-sync: every 30 min
   - freshbooks-clients-sync: daily 03:00
   - freshbooks-items-sync: daily 03:30
```

**תלוי ב:** שלב 5 (Customers) ✅

**⏱️ זמן משוער:** 4-5 שעות

---

## ⚫ פאזה 7: דשבורד ואנליטיקס (שלב 18)
> **מטרה:** הכל מתחבר – תמונה ניהולית מלאה

---

### שלב 18 – דשבורד ניהולי ודוחות
**📌 פרומפט:** PROMPT 7 (Dashboard & Analytics)

**מה זה בונה:**
- מסך ראשי עם KPIs (הזמנות, ייצור, הכנסות, עלויות, מרווח)
- ניתוח סטיית חומרי גלם (צריכה בפועל מול תקן)
- תמחיר מוצרים מלא
- ניתוח רווחיות לפי מוצר / לקוח / קו ייצור
- אנליטיקת ייצור (פחת, תפוסה, מגמות)
- אנליטיקת לקוחות (פארטו, צמיחה, סיכון נטישה)
- גרפים עם Recharts

**תלוי ב:** כל השלבים הקודמים ✅ (במיוחד 16+17 לנתונים פיננסיים)

**⏱️ זמן משוער:** 8-10 שעות

---

## ⬜ פאזה 8: ליטוש ו-Launch (שלבים 19-21)

---

### שלב 19 – אופטימיזציה למובייל ו-PWA
**📌 פרומפט:** PROMPT 11 (Mobile & Tablet Optimization)

**מה זה בונה:**
- PWA (Progressive Web App) – עובד כאפליקציה
- מצב רצפת מפעל (/floor) – UI מפושט
- Offline support לדיווח ייצור
- תבניות הדפסה (תוכנית ייצור, הזמנת רכש, דף ספירה)

**⏱️ זמן משוער:** 4-5 שעות

---

### שלב 20 – בדיקות
**📌 פרומפט:** PROMPT 12 (Testing & QA)

**מה זה בונה:**
- Unit tests (חישובי BOM, reorder, anomaly detection)
- Integration tests (מחזורי הזמנה, ייצור, מלאי)
- E2E tests (תהליכים מקצה לקצה)
- נתוני בדיקה מקיפים
- CI/CD pipeline

**⏱️ זמן משוער:** 4-6 שעות

---

### שלב 21 – נתוני אמת והעלאה לאוויר
**📌 פרומפט (לכתוב חדש):**

```
Prepare the Mini ERP for production deployment.

1. DATA MIGRATION:
   - Create import scripts for:
     * Customers from Freshbooks/Excel
     * Products with BOMs from Excel
     * Raw Materials from Xero/Excel
     * Suppliers from Xero
     * Opening inventory balances
   - Validation reports: flag missing/duplicate data
   - Dry-run mode: validate without inserting

2. DEPLOYMENT:
   - Vercel deployment configuration
   - Supabase production database setup
   - Environment variables documentation
   - Redis/BullMQ production setup
   - SSL and domain configuration
   - Monitoring setup (Sentry for errors)

3. BACKUP & RECOVERY:
   - Automated daily DB backups
   - Backup verification script
   - Recovery procedure documentation

4. GO-LIVE CHECKLIST:
   - All integrations tested with production credentials
   - All users created with correct roles
   - Initial stock count loaded
   - Notification templates approved by WhatsApp
   - Training materials for each user role
```

**⏱️ זמן משוער:** 3-4 שעות

---

## 📊 סיכום זמנים

| פאזה | שלבים | זמן משוער |
|-------|--------|-----------|
| 1 – תשתית | 1-3 | 6-9 שעות |
| 2 – נתוני בסיס | 4-6 | 9-12 שעות |
| 3 – תפעול ליבה | 7-10 | 20-25 שעות |
| 4 – רכש | 11-12 | 8-10 שעות |
| 5 – אינטליגנציה | 13-15 | 14-18 שעות |
| 6 – חשבונאות | 16-17 | 10-13 שעות |
| 7 – דשבורד | 18 | 8-10 שעות |
| 8 – ליטוש | 19-21 | 11-15 שעות |
| **סה"כ** | **21 שלבים** | **~86-112 שעות** |

---

## ⚠️ טיפים חשובים

1. **אל תדלגו על שלבים** – כל שלב בונה על הקודם
2. **בדקו אחרי כל שלב** – הרצו את האפליקציה וודאו שהכל עובד
3. **Git commit** אחרי כל שלב מוצלח – כך תוכלו לחזור אחורה
4. **אם Claude נתקע** – חלקו את הפרומפט לחלקים קטנים יותר
5. **שמרו על ה-translations** – כל טקסט חדש חייב להיות ב-4 שפות
6. **בדקו RTL** – אחרי כל שלב, מחליפים לעברית ומוודאים שהכל תקין
7. **שלב 10 (דיווח ייצור) הוא הקריטי ביותר** – זה לב המערכת, השקיעו בו
8. **אינטגרציות (14-17) דורשות API keys** – הכינו אותם מראש
