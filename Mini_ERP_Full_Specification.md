# Mini ERP System – Full Technical Specification
## Esemby Concept / Pita Bakery – Singapore
### Version 1.0 | February 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Multi-Language (i18n) Infrastructure](#3-multi-language-i18n-infrastructure)
4. [Database Schema](#4-database-schema)
5. [Module 1: Order Management](#5-module-1-order-management)
6. [Module 2: Production Management](#6-module-2-production-management)
7. [Module 3: Inventory Management](#7-module-3-inventory-management)
8. [Module 4: Dashboard & Analytics](#8-module-4-dashboard--analytics)
9. [Integrations](#9-integrations)
10. [Security & Permissions](#10-security--permissions)
11. [UI/UX Guidelines](#11-uiux-guidelines)
12. [Claude Build Prompts](#12-claude-build-prompts)
13. [Future Expansions](#13-future-expansions)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

### 1.1 Business Context
Esemby Concept operates a food manufacturing plant (Pita Bakery) in Singapore, producing baked goods (pita, flatbreads) and salads for hotels, restaurants, and institutional clients. The current operations rely on fragmented manual processes: WhatsApp/email orders, paper-based production logs, scattered Excel spreadsheets for inventory, and annual-only financial analysis.

### 1.2 System Objectives
Build a **Mini ERP** system that provides:
- Centralized order intake from all channels (Email, WhatsApp, Ariba)
- Full production planning tied to customer orders
- Real-time inventory management with auto-replenishment alerts
- Live management dashboard with P&L visibility
- Integration with existing accounting (Xero), invoicing (Freshbooks), and procurement (Ariba) systems
- Multi-language support (English, Hebrew, Chinese Mandarin, Malay)

### 1.3 Key Success Metrics
| Metric | Current State | Target |
|--------|--------------|--------|
| Order processing time | 30-60 min manual | < 5 min automated |
| Inventory accuracy | ~70% (estimated) | > 98% |
| Production waste tracking | None | Real-time per batch |
| Financial visibility | Annual | Daily dashboard |
| Order cutoff compliance | Inconsistent | 100% automated lockout |

### 1.4 Technology Stack (Recommended)
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui | Modern, responsive, supports i18n, RTL |
| Backend | Next.js API Routes + tRPC or REST | Type-safe, co-located with frontend |
| Database | PostgreSQL (via Supabase or Neon) | Relational integrity, JSON support |
| ORM | Prisma | Type-safe DB access, migrations |
| Auth | NextAuth.js / Clerk | Role-based access, SSO ready |
| Real-time | Supabase Realtime / Pusher | Live dashboard updates |
| Job Queue | BullMQ + Redis | Scheduled tasks, integrations |
| AI Agent | Claude API (Anthropic) | WhatsApp/Email order parsing |
| File Storage | S3-compatible (Supabase Storage) | Labels, documents |
| Hosting | Vercel + Supabase | Singapore region available |
| Monitoring | Sentry + Logflare | Error tracking, audit logs |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Desktop  │  │ Mobile   │  │ Tablet   │  │ Label Printer │    │
│  │ Browser  │  │ PWA/App  │  │ Factory  │  │  Station      │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       └──────────────┴──────────────┴───────────────┘            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────┴──────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Next.js Application                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │
│  │  │ Orders   │ │Production│ │Inventory │ │ Dashboard │  │    │
│  │  │ Module   │ │ Module   │ │ Module   │ │  Module   │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │ i18n     │ │ Auth &   │ │ API      │               │    │
│  │  │ Engine   │ │ RBAC     │ │ Gateway  │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘               │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ AI Agent │ │ Job      │ │ Notif.   │ │  Integration     │   │
│  │ (Claude) │ │ Queue    │ │ Service  │ │  Hub             │   │
│  │          │ │ (BullMQ) │ │ (Push/WA)│ │(Ariba/Xero/FB)  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────────────┐   │
│  │ PostgreSQL   │  │ Redis    │  │ S3 Storage               │   │
│  │ (Main DB)    │  │ (Cache/  │  │ (Files, Labels, Backups) │   │
│  │              │  │  Queue)  │  │                          │   │
│  └──────────────┘  └──────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                    EXTERNAL SYSTEMS                               │
│  ┌────────┐ ┌──────┐ ┌───────────┐ ┌───────┐ ┌──────────────┐  │
│  │ Ariba  │ │ Xero │ │ Freshbooks│ │ Gmail │ │ WhatsApp Bus.│  │
│  │  API   │ │ API  │ │    API    │ │  API  │ │     API      │  │
│  └────────┘ └──────┘ └───────────┘ └───────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Overview

```
Customer Order Flow:
  Email/WhatsApp/Ariba → AI Parser → Order Queue → Validation → Confirmed Order
                                                                      │
Production Flow:                                                       ▼
  Confirmed Order → Production Plan → BOM Explosion → Material Check
       │                                                    │
       ▼                                                    ▼
  Work Order → Production Report → Finished Goods    Purchase Suggestion
       │              │                  │                   │
       ▼              ▼                  ▼                   ▼
  Label Print    Raw Mat. Deduct    Add to FG Stock    Supplier PO Draft

Inventory Flow:
  Supplier Invoice (Xero) → Goods Receipt → Stock Update → Min Level Check
       │                                                        │
       ▼                                                        ▼
  AP Reconciliation                                    Auto Alert + PO Draft
```

### 2.3 Deployment Architecture
- **Primary Region**: Singapore (ap-southeast-1)
- **CDN**: Vercel Edge Network
- **Database Backups**: Daily automated, 30-day retention
- **Uptime SLA Target**: 99.5%
- **RPO/RTO**: 1 hour / 4 hours

---

## 3. Multi-Language (i18n) Infrastructure

### 3.1 Supported Languages
| Language | Code | Direction | Script | Priority |
|----------|------|-----------|--------|----------|
| English | en | LTR | Latin | Primary (default) |
| Hebrew | he | RTL | Hebrew | Primary |
| Chinese (Simplified) | zh-CN | LTR | CJK | Secondary |
| Malay | ms | LTR | Latin | Secondary |

### 3.2 i18n Technical Implementation

#### Framework: next-intl (recommended) or react-i18next

```
/messages
  /en.json        ← English translations
  /he.json        ← Hebrew translations
  /zh-CN.json     ← Chinese translations
  /ms.json        ← Malay translations
```

#### Translation File Structure (per language)
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "loading": "Loading...",
    "noResults": "No results found",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "yes": "Yes",
    "no": "No",
    "status": "Status",
    "date": "Date",
    "actions": "Actions",
    "total": "Total",
    "subtotal": "Subtotal",
    "notes": "Notes"
  },
  "nav": {
    "dashboard": "Dashboard",
    "orders": "Orders",
    "production": "Production",
    "inventory": "Inventory",
    "suppliers": "Suppliers",
    "customers": "Customers",
    "products": "Products",
    "reports": "Reports",
    "settings": "Settings"
  },
  "orders": {
    "title": "Order Management",
    "newOrder": "New Order",
    "orderNumber": "Order #",
    "customer": "Customer",
    "deliveryDate": "Delivery Date",
    "orderDate": "Order Date",
    "status": {
      "pending": "Pending",
      "confirmed": "Confirmed",
      "inProduction": "In Production",
      "ready": "Ready",
      "delivered": "Delivered",
      "cancelled": "Cancelled"
    },
    "source": {
      "email": "Email",
      "whatsapp": "WhatsApp",
      "ariba": "Ariba",
      "manual": "Manual",
      "portal": "Customer Portal"
    },
    "lockWarning": "This order is locked for production",
    "cutoffPassed": "Order cutoff time has passed",
    "reminderSent": "Reminder sent to customer"
  },
  "production": { ... },
  "inventory": { ... },
  "dashboard": { ... }
}
```

### 3.3 RTL Support Strategy

```css
/* Base approach: CSS logical properties */
.container {
  margin-inline-start: 1rem;  /* margin-left in LTR, margin-right in RTL */
  padding-inline-end: 0.5rem;
  text-align: start;
}

/* HTML dir attribute */
<html dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale}>

/* Tailwind RTL plugin */
// tailwind.config.js
plugins: [require('tailwindcss-rtl')]

// Usage:
<div className="ms-4 me-2 ps-3 pe-1">
  {/* ms = margin-start, me = margin-end */}
</div>
```

### 3.4 Date, Number, and Currency Formatting

```typescript
// Centralized formatting service
const formatters = {
  date: (date: Date, locale: string) => 
    new Intl.DateTimeFormat(locale, { 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(date),
  
  currency: (amount: number, locale: string, currency = 'SGD') =>
    new Intl.NumberFormat(locale, { 
      style: 'currency', currency 
    }).format(amount),
  
  weight: (kg: number, locale: string) =>
    new Intl.NumberFormat(locale, { 
      minimumFractionDigits: 2, maximumFractionDigits: 2 
    }).format(kg) + ' kg',
    
  number: (n: number, locale: string) =>
    new Intl.NumberFormat(locale).format(n),
};
```

### 3.5 Multi-Language Data Model
Product names, descriptions, and units should support multiple languages in the database:

```sql
-- Option A: JSONB column (simpler, recommended for this scale)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name JSONB NOT NULL DEFAULT '{}',
  -- name: {"en": "Pita Bread", "he": "פיתה", "zh-CN": "皮塔饼", "ms": "Roti Pita"}
  description JSONB DEFAULT '{}',
  unit JSONB NOT NULL DEFAULT '{}',
  -- unit: {"en": "pcs", "he": "יח׳", "zh-CN": "件", "ms": "keping"}
  ...
);
```

---

## 4. Database Schema

### 4.1 Core Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  customers   │────<│   orders     │────<│   order_items    │
└──────────────┘     └──────────────┘     └──────────────────┘
                                                   │
┌──────────────┐     ┌──────────────┐              │
│  suppliers   │────<│purchase_orders│     ┌───────┴──────────┐
└──────────────┘     └──────────────┘     │    products       │
                            │              └───────┬──────────┘
                     ┌──────┴───────┐              │
                     │  po_items    │     ┌────────┴─────────┐
                     └──────────────┘     │   bom (bill of   │
                                          │   materials)     │
┌──────────────┐     ┌──────────────┐     └────────┬─────────┘
│raw_materials │────<│  bom_items   │<─────────────┘
└──────┬───────┘     └──────────────┘
       │
┌──────┴───────┐     ┌──────────────┐     ┌──────────────────┐
│  inventory   │     │work_orders   │────<│production_reports│
│  _movements  │     └──────────────┘     └──────────────────┘
└──────────────┘
```

### 4.2 Complete Table Definitions

```sql
-- ============================================================
-- MULTI-LANGUAGE ENUMS
-- ============================================================

CREATE TYPE order_status AS ENUM (
  'draft', 'pending', 'confirmed', 'locked', 
  'in_production', 'ready', 'dispatched', 'delivered', 'cancelled'
);

CREATE TYPE order_source AS ENUM (
  'email', 'whatsapp', 'ariba', 'manual', 'portal'
);

CREATE TYPE production_line AS ENUM (
  'bakery', 'salads', 'frozen'
);

CREATE TYPE movement_type AS ENUM (
  'purchase_receipt', 'production_input', 'production_output',
  'adjustment_plus', 'adjustment_minus', 'waste', 'count',
  'return_to_supplier', 'damaged'
);

CREATE TYPE unit_of_measure AS ENUM (
  'kg', 'g', 'liter', 'ml', 'pcs', 'pack', 'carton', 'pallet'
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100),               -- ID in external system (Ariba/Freshbooks)
  external_system VARCHAR(50),            -- 'ariba', 'freshbooks'
  name JSONB NOT NULL,                    -- {"en": "Marina Bay Sands", "he": "..."}
  short_name VARCHAR(50),                 -- For quick display
  contact_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  whatsapp_number VARCHAR(50),            -- For WhatsApp integration
  delivery_address TEXT,
  billing_address TEXT,
  default_delivery_slot VARCHAR(50),      -- e.g., "06:00-08:00"
  order_cutoff_time TIME,                 -- e.g., 18:00 (day before delivery)
  payment_terms INTEGER DEFAULT 30,       -- Days
  credit_limit DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'SGD',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]',                -- ["hotel", "premium", "weekly"]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_external ON customers(external_system, external_id);
CREATE INDEX idx_customers_whatsapp ON customers(whatsapp_number);

-- ============================================================
-- PRODUCTS (Finished Goods)
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(50),
  name JSONB NOT NULL,                    -- Multi-language names
  description JSONB DEFAULT '{}',
  category VARCHAR(100),                  -- "pita", "flatbread", "salad", "frozen"
  production_line production_line NOT NULL,
  unit_of_measure unit_of_measure NOT NULL DEFAULT 'pcs',
  units_per_pack INTEGER DEFAULT 1,
  pack_weight_kg DECIMAL(8,3),
  shelf_life_days INTEGER NOT NULL,       -- 10 or 30 typically
  min_stock_level DECIMAL(10,2) DEFAULT 0,
  max_stock_level DECIMAL(10,2),
  reorder_point DECIMAL(10,2),
  standard_batch_size DECIMAL(10,2),
  production_lead_time_hours DECIMAL(5,1) DEFAULT 4,
  selling_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),               -- Calculated from BOM
  freshbooks_item_id VARCHAR(100),        -- Link to Freshbooks
  label_template_id VARCHAR(100),         -- Link to label system
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_line ON products(production_line);

-- ============================================================
-- RAW MATERIALS
-- ============================================================
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name JSONB NOT NULL,
  description JSONB DEFAULT '{}',
  category VARCHAR(100),                  -- "flour", "oil", "spice", "packaging"
  unit_of_measure unit_of_measure NOT NULL DEFAULT 'kg',
  min_stock_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_stock_level DECIMAL(10,2),
  reorder_point DECIMAL(10,2),
  reorder_quantity DECIMAL(10,2),         -- Standard order quantity
  lead_time_days INTEGER DEFAULT 7,
  primary_supplier_id UUID REFERENCES suppliers(id),
  secondary_supplier_id UUID REFERENCES suppliers(id),
  last_purchase_price DECIMAL(10,4),
  average_purchase_price DECIMAL(10,4),
  xero_item_id VARCHAR(100),             -- Link to Xero
  storage_location VARCHAR(100),          -- "dry_store", "chiller_1", "freezer"
  storage_temp_min DECIMAL(5,1),
  storage_temp_max DECIMAL(5,1),
  is_allergen BOOLEAN DEFAULT false,
  allergen_info VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  xero_contact_id VARCHAR(100),           -- Link to Xero
  name JSONB NOT NULL,
  short_name VARCHAR(50),
  contact_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  country VARCHAR(100) DEFAULT 'Singapore',
  payment_terms INTEGER DEFAULT 30,
  currency VARCHAR(3) DEFAULT 'SGD',
  delivery_days JSONB DEFAULT '[]',       -- [1,2,3,4,5] = Mon-Fri (no Saturday/Sunday)
  delivery_time_slots JSONB DEFAULT '[]', -- ["06:00-08:00", "14:00-16:00"]
  min_order_amount DECIMAL(10,2),
  lead_time_days INTEGER DEFAULT 3,
  rating DECIMAL(3,2),                    -- Supplier quality rating
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BILL OF MATERIALS (BOM / Product Tree)
-- ============================================================
CREATE TABLE bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  version INTEGER DEFAULT 1,
  name JSONB,
  is_active BOOLEAN DEFAULT true,
  yield_percentage DECIMAL(5,2) DEFAULT 100,  -- Expected yield
  standard_batch_size DECIMAL(10,2),
  batch_unit unit_of_measure DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, version)
);

CREATE TABLE bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  quantity DECIMAL(10,4) NOT NULL,         -- Quantity per batch
  unit unit_of_measure NOT NULL,
  waste_percentage DECIMAL(5,2) DEFAULT 0, -- Expected waste for this ingredient
  is_optional BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE(bom_id, raw_material_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: ORD-YYYYMMDD-XXXX
  customer_id UUID NOT NULL REFERENCES customers(id),
  source order_source NOT NULL,
  source_reference TEXT,                    -- Original email/message/Ariba PO number
  status order_status DEFAULT 'pending',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date DATE NOT NULL,
  confirmed_delivery_date DATE,
  delivery_slot VARCHAR(50),
  locked_at TIMESTAMPTZ,                    -- When order was locked for production
  locked_by UUID,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'SGD',
  freshbooks_invoice_id VARCHAR(100),
  delivery_notes TEXT,
  internal_notes TEXT,
  ai_parsed_raw TEXT,                       -- Original AI-parsed content
  ai_confidence DECIMAL(3,2),              -- AI parsing confidence score
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,                -- {"type": "weekly", "days": [1,3,5]}
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery ON orders(requested_delivery_date);
CREATE INDEX idx_orders_date_status ON orders(requested_delivery_date, status);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(12,2),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Order change log for auditing
CREATE TABLE order_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  changed_by UUID,
  change_type VARCHAR(50),                -- 'status_change', 'item_change', 'qty_change'
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORK ORDERS (Production)
-- ============================================================
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number VARCHAR(50) UNIQUE NOT NULL,   -- WO-YYYYMMDD-XXXX
  production_date DATE NOT NULL,
  production_line production_line NOT NULL,
  status VARCHAR(30) DEFAULT 'planned',    -- planned, in_progress, completed, cancelled
  planned_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  bom_id UUID REFERENCES bom(id),
  order_id UUID REFERENCES orders(id),      -- Link back to customer order
  planned_quantity DECIMAL(10,2) NOT NULL,
  produced_quantity DECIMAL(10,2) DEFAULT 0,
  waste_quantity DECIMAL(10,2) DEFAULT 0,
  waste_reason TEXT,
  batch_number VARCHAR(50),
  production_date DATE,
  expiry_date DATE,                         -- Calculated: production_date + shelf_life_days
  status VARCHAR(30) DEFAULT 'pending',     -- pending, in_progress, completed
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTION REPORTS
-- ============================================================
CREATE TABLE production_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_item_id UUID NOT NULL REFERENCES work_order_items(id),
  reported_by UUID,
  quantity_produced DECIMAL(10,2) NOT NULL,
  quantity_waste DECIMAL(10,2) DEFAULT 0,
  waste_reason TEXT,
  batch_number VARCHAR(50),
  production_timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  -- Raw materials consumed (auto-calculated from BOM)
  materials_consumed JSONB,                -- [{material_id, quantity, unit}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(20) NOT NULL,          -- 'raw_material' or 'finished_good'
  raw_material_id UUID REFERENCES raw_materials(id),
  product_id UUID REFERENCES products(id),
  quantity_on_hand DECIMAL(12,3) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(12,3) DEFAULT 0, -- Reserved for planned production
  quantity_available DECIMAL(12,3) GENERATED ALWAYS AS 
    (quantity_on_hand - quantity_reserved) STORED,
  last_count_date DATE,
  last_count_quantity DECIMAL(12,3),
  location VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (item_type = 'raw_material' AND raw_material_id IS NOT NULL AND product_id IS NULL) OR
    (item_type = 'finished_good' AND product_id IS NOT NULL AND raw_material_id IS NULL)
  ),
  UNIQUE(item_type, raw_material_id, product_id)
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(20) NOT NULL,
  raw_material_id UUID REFERENCES raw_materials(id),
  product_id UUID REFERENCES products(id),
  movement_type movement_type NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,         -- Positive for IN, negative for OUT
  unit unit_of_measure NOT NULL,
  reference_type VARCHAR(50),              -- 'purchase_order', 'work_order', 'count', 'adjustment'
  reference_id UUID,
  batch_number VARCHAR(50),
  expiry_date DATE,
  supplier_invoice_number VARCHAR(100),
  xero_invoice_id VARCHAR(100),
  cost_per_unit DECIMAL(10,4),
  total_cost DECIMAL(12,2),
  reason TEXT,
  reported_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inv_movements_item ON inventory_movements(item_type, raw_material_id, product_id);
CREATE INDEX idx_inv_movements_date ON inventory_movements(created_at);
CREATE INDEX idx_inv_movements_type ON inventory_movements(movement_type);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,   -- PO-YYYYMMDD-XXXX
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status VARCHAR(30) DEFAULT 'draft',       -- draft, sent, confirmed, partially_received, received, cancelled
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_time_slot VARCHAR(50),
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'SGD',
  xero_po_id VARCHAR(100),
  notes TEXT,
  auto_generated BOOLEAN DEFAULT false,     -- True if created by auto-reorder
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  quantity_ordered DECIMAL(10,3) NOT NULL,
  quantity_received DECIMAL(10,3) DEFAULT 0,
  unit unit_of_measure NOT NULL,
  unit_price DECIMAL(10,4),
  total_price DECIMAL(12,2),
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- INVENTORY COUNTS (Periodic Stock Takes)
-- ============================================================
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count_type VARCHAR(30),                  -- 'full', 'partial', 'spot_check'
  status VARCHAR(30) DEFAULT 'in_progress', -- in_progress, completed, approved
  counted_by UUID,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,
  raw_material_id UUID REFERENCES raw_materials(id),
  product_id UUID REFERENCES products(id),
  system_quantity DECIMAL(12,3),            -- What the system shows
  counted_quantity DECIMAL(12,3) NOT NULL,  -- What was physically counted
  variance DECIMAL(12,3) GENERATED ALWAYS AS 
    (counted_quantity - system_quantity) STORED,
  notes TEXT
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  channel VARCHAR(20) NOT NULL,            -- 'push', 'email', 'whatsapp', 'in_app'
  type VARCHAR(50) NOT NULL,               -- 'low_stock', 'order_reminder', 'production_alert'
  title JSONB NOT NULL,                    -- Multi-language
  body JSONB NOT NULL,                     -- Multi-language
  data JSONB,                              -- Additional context data
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS & PERMISSIONS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(50) NOT NULL,               -- 'admin', 'manager', 'production', 'warehouse', 'viewer'
  preferred_language VARCHAR(10) DEFAULT 'en',
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at);

-- ============================================================
-- SETTINGS (System-wide configuration)
-- ============================================================
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('order_cutoff_default', '"18:00"', 'Default order cutoff time (day before delivery)'),
  ('production_lock_hours', '6', 'Hours before delivery to lock orders'),
  ('low_stock_alert_enabled', 'true', 'Enable low stock email/push alerts'),
  ('daily_summary_time', '"06:00"', 'Time to send daily order summary'),
  ('supported_languages', '["en","he","zh-CN","ms"]', 'Enabled UI languages'),
  ('default_language', '"en"', 'Default system language'),
  ('timezone', '"Asia/Singapore"', 'System timezone'),
  ('currency', '"SGD"', 'Default currency'),
  ('whatsapp_reminder_time', '"15:00"', 'Time to send WhatsApp order reminders'),
  ('inventory_count_frequency', '"weekly"', 'How often to prompt stock counts');
```

---

## 5. Module 1: Order Management

### 5.1 Overview
The Order Management module centralizes all customer orders from multiple channels (Email, WhatsApp, Ariba, Manual) into a single unified interface. It includes AI-powered parsing, automated reminders, order locking, and full audit trail.

### 5.2 Functional Requirements

#### 5.2.1 Order Intake Channels

**A. Email Orders (Gmail)**
- AI agent monitors a dedicated inbox (e.g., orders@pitabakery.sg)
- Claude API parses incoming emails to extract: customer name, products, quantities, delivery date
- Parsed orders appear in a "Pending Review" queue
- Operator confirms or edits before finalizing
- Original email is stored as reference
- Confidence score displayed; low-confidence items flagged in yellow

**B. WhatsApp Orders**
- Integration via WhatsApp Business API (360dialog / Twilio)
- AI agent (Claude) parses incoming messages
- Supports text and image (photo of handwritten order) parsing
- Auto-reply confirms receipt with order summary
- Supports multi-turn conversation for clarification
- Customer can confirm by replying "OK" or "Confirm"

**C. Ariba Integration**
- Scheduled job pulls new POs from SAP Ariba every 30 minutes
- Maps Ariba item codes to internal product SKUs
- Auto-creates confirmed orders (no manual review needed for mapped items)
- Alerts on unmapped items for manual resolution
- Daily reconciliation report

**D. Manual Order Entry**
- Full form interface for phone/walk-in orders
- Customer autocomplete with recent order history
- Product catalog with search (multi-language)
- Quick reorder: "Copy from last order" feature
- Batch entry mode for entering multiple customer orders

#### 5.2.2 Unified Order Screen

**List View Fields:**
| Field | Description | Sortable | Filterable |
|-------|------------|----------|------------|
| Order # | Auto-generated | Yes | Yes (search) |
| Customer | Customer name | Yes | Yes (dropdown) |
| Source | Email/WA/Ariba/Manual | - | Yes |
| Order Date | When placed | Yes | Yes (range) |
| Delivery Date | Requested | Yes | Yes (range) |
| Items Count | Number of line items | - | - |
| Total Amount | SGD | Yes | Yes (range) |
| Status | Color-coded badge | - | Yes (multi) |
| Actions | View/Edit/Lock/Cancel | - | - |

**Filters:**
- Date range (order date or delivery date)
- Customer (multi-select)
- Product (which orders contain product X)
- Status (multi-select)
- Source channel
- Anomaly flag (orders flagged as unusual)

**Views:**
- List view (default)
- Calendar view (by delivery date)
- Kanban board (by status)

#### 5.2.3 Order Anomaly Detection
System flags orders that are unusual compared to historical patterns:
- Quantity > 2x the customer's average for that product
- New product never ordered by this customer before
- Order value > 150% of customer's average order value
- Delivery date on a day customer doesn't normally order

Flagged orders show a warning icon and require explicit confirmation.

#### 5.2.4 Order Locking Mechanism
- Configurable lock time per customer (default: X hours before delivery)
- Once locked: no edits allowed without manager override
- Lock triggers:
  - Production plan generation
  - Raw material reservation
  - Work order creation
- Visual indicator: locked orders show padlock icon, greyed-out edit button
- Manager can unlock with reason (logged in audit)

#### 5.2.5 Automated Notifications

**Order Status Summary (Scheduled)**
- Configurable times (e.g., 06:00, 14:00, 18:00)
- WhatsApp + Email to manager
- Content: Orders received today, orders pending for tomorrow, any anomalies

**Customer Reminders**
- If customer X has not placed order by cutoff time minus 2 hours:
  - Send WhatsApp: "Hi [Name], reminder to place your order for [Date]. Cutoff is [Time]."
- If no order by cutoff time:
  - Send final reminder: "Order window for [Date] is closing in 30 minutes."
- Log all reminders sent

**Order Confirmation to Customer**
- After order is confirmed, send summary via same channel (email/WhatsApp)
- Include: order number, items, quantities, delivery date/slot

### 5.3 UI Wireframe Description

#### Main Orders Screen
```
┌────────────────────────────────────────────────────────────┐
│ ☰  Orders                           [+ New Order] [⚙]    │
├────────────────────────────────────────────────────────────┤
│ [Today ▼] [This Week] [Custom Range]     🔍 Search...     │
│ Status: [All ▼]  Customer: [All ▼]  Source: [All ▼]       │
├────────────────────────────────────────────────────────────┤
│ 📋 List  |  📅 Calendar  |  📊 Kanban                     │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ⚠ ORD-20260211-0023  Marina Bay Sands    📧 Email   │  │
│ │   Delivery: 12 Feb  │  12 items  │  $1,240  │ ● Pending│ │
│ ├──────────────────────────────────────────────────────┤  │
│ │ 🔒 ORD-20260211-0022  Raffles Hotel      📱 WhatsApp│  │
│ │   Delivery: 11 Feb  │  8 items   │  $890    │ ● Locked │ │
│ ├──────────────────────────────────────────────────────┤  │
│ │   ORD-20260211-0021  Mandarin Oriental   🔗 Ariba   │  │
│ │   Delivery: 12 Feb  │  15 items  │  $2,100  │●Confirmed│ │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Showing 1-25 of 143 orders          [← 1 2 3 4 5 ... →]  │
└────────────────────────────────────────────────────────────┘
```

#### Order Detail Screen
```
┌────────────────────────────────────────────────────────────┐
│ ← Back    ORD-20260211-0023         Status: ● Pending  [▼]│
├──────────────────────┬─────────────────────────────────────┤
│ Customer             │ Marina Bay Sands                    │
│ Source               │ 📧 Email (confidence: 94%)         │
│ Order Date           │ 11 Feb 2026, 14:23                 │
│ Delivery Date        │ 12 Feb 2026                        │
│ Delivery Slot        │ 06:00 - 08:00                      │
│ Cutoff               │ 11 Feb 2026, 18:00 (4h remaining)  │
├──────────────────────┴─────────────────────────────────────┤
│ Order Items                                    [+ Add Item]│
│ ┌────────┬──────────────────┬─────┬────────┬──────────┐   │
│ │ SKU    │ Product          │ Qty │ Price  │ Total    │   │
│ ├────────┼──────────────────┼─────┼────────┼──────────┤   │
│ │ PT-001 │ Pita Bread Large │ 200 │ $0.80  │ $160.00  │   │
│ │ PT-002 │ Pita Bread Small │ 150 │ $0.60  │ $90.00   │   │
│ │ SL-010 │ Hummus 1kg       │ 20  │ $8.50  │ $170.00  │   │
│ │ ⚠ PT-005│ Falafel Frozen  │ 500 │ $1.20  │ $600.00  │   │
│ │        │ ↳ Unusually high qty (avg: 100)              │   │
│ └────────┴──────────────────┴─────┴────────┴──────────┘   │
│                                    Subtotal: $1,020.00     │
│                                    GST (9%): $91.80        │
│                                    Total:    $1,111.80     │
├────────────────────────────────────────────────────────────┤
│ 📎 Original Email  [View]                                  │
│ Notes: Delivery to loading dock B                          │
├────────────────────────────────────────────────────────────┤
│ History                                                    │
│ • 14:23 - Order received via email                         │
│ • 14:24 - AI parsed (confidence 94%)                       │
│ • 14:25 - Anomaly detected: Falafel Frozen qty             │
├────────────────────────────────────────────────────────────┤
│ [Confirm Order]  [Edit]  [Cancel]  [🔒 Lock for Production]│
└────────────────────────────────────────────────────────────┘
```

### 5.4 API Endpoints

```
POST   /api/orders                    - Create new order
GET    /api/orders                    - List orders (with filters)
GET    /api/orders/:id                - Get order details
PUT    /api/orders/:id                - Update order
PATCH  /api/orders/:id/status         - Change order status
POST   /api/orders/:id/lock           - Lock order for production
POST   /api/orders/:id/unlock         - Unlock order (manager only)
POST   /api/orders/:id/duplicate      - Clone order
GET    /api/orders/:id/history        - Get change history
POST   /api/orders/import/email       - AI parse email into order
POST   /api/orders/import/whatsapp    - AI parse WhatsApp into order
GET    /api/orders/import/ariba       - Pull orders from Ariba
POST   /api/orders/reminders/send     - Trigger customer reminders
GET    /api/orders/summary            - Get order summary stats
GET    /api/orders/calendar           - Calendar view data
```

---

## 6. Module 2: Production Management

### 6.1 Overview
The Production module converts confirmed customer orders into work orders, manages Bill of Materials, tracks actual production output and waste, and automatically deducts raw materials from inventory.

### 6.2 Functional Requirements

#### 6.2.1 Bill of Materials (BOM / Product Tree)
- Every finished product has a BOM defining all raw materials and quantities
- BOM is versioned – changes create a new version, old versions are kept
- BOM includes expected yield percentage and waste per ingredient
- BOM can be viewed as a tree visualization
- Supports batch scaling: BOM defines ratios, system calculates for any quantity
- "Where used" report: for any raw material, show all products using it

**BOM Example – Large Pita:**
```
Product: Pita Bread Large (PT-001)
Standard Batch: 100 pcs
Yield: 95%

├── Flour Type 55      2.5 kg    (waste: 1%)
├── Water              1.5 L     (waste: 0%)
├── Olive Oil          0.2 L     (waste: 2%)
├── Salt               0.05 kg   (waste: 0%)
├── Yeast              0.03 kg   (waste: 0%)
├── Sugar              0.02 kg   (waste: 0%)
└── Packaging Bag 20pk 5 pcs     (waste: 3%)
```

#### 6.2.2 Production Planning

**Daily Production Plan Generation:**
1. System aggregates all confirmed orders for target delivery date
2. Groups by production line (bakery / salads / frozen)
3. Checks if stock-on-hand of finished goods can fulfill any orders
4. Calculates net production needed
5. Explodes BOM to determine raw material requirements
6. Checks raw material availability
7. Alerts if any material is insufficient
8. Generates work orders

**Production for Stock (Make-to-Stock):**
- Some products are produced to maintain minimum stock levels
- System checks daily: if FG stock < reorder point, add to production plan
- Considers shelf life: don't produce more than can be sold before expiry

**Load Balancing:**
- Each production line has a daily capacity (in kg or units)
- If planned production exceeds capacity:
  - Alert manager
  - Suggest spreading production across days
  - Prioritize by delivery date urgency
- Special handling for frozen products (e.g., falafel) that can be pre-produced

#### 6.2.3 Work Order Management

**Work Order Lifecycle:**
```
Planned → In Progress → Completed
                     ↘ Partially Completed
```

**Work Order Screen Fields:**
- WO Number (auto-generated)
- Production Date
- Production Line
- List of items to produce (product, quantity, linked order)
- Required raw materials (auto-calculated from BOM)
- Status
- Actual quantities produced (reported by floor)
- Waste quantity and reason
- Batch number (auto-generated: YYYYMMDD-LINE-SEQ)
- Production timestamps

#### 6.2.4 Production Reporting (Floor Input)

**Simple Touch Interface for Factory Floor:**
- Large buttons, designed for tablet/gloved hands
- Select work order → see items to produce
- For each item: enter quantity produced + waste
- Quick waste reasons: dropdown (overcooked, underweight, damaged, contaminated, other)
- Confirm → triggers:
  - Finished goods added to inventory
  - Raw materials deducted based on BOM × actual produced qty
  - Expiry date calculated and stored
  - Label print triggered (optional)

#### 6.2.5 Label System Integration
- When production is reported, system can trigger label printing
- Data sent to label system: product name, batch number, production date, expiry date, ingredients, weight, barcode
- Integration via API/Webhook to existing label printer system
- Supports multi-language labels (English + Chinese minimum for Singapore)

#### 6.2.6 Shelf Life Management
- Two shelf life tiers: 10 days (fresh) and 30 days (extended)
- System calculates expiry date = production date + shelf life
- FIFO tracking: oldest stock dispatched first
- Alert when FG stock is approaching expiry (configurable: 2 days before)
- Dashboard shows "expiring soon" items

### 6.3 UI Wireframe Description

#### Production Planning Screen
```
┌────────────────────────────────────────────────────────────┐
│ ☰  Production Plan                    📅 12 Feb 2026 [▼]  │
├────────────────────────────────────────────────────────────┤
│ 🏭 Bakery Line          │  🥗 Salads Line                 │
│ Capacity: 85%            │  Capacity: 60%                  │
├──────────────────────────┼─────────────────────────────────┤
│                          │                                  │
│ ┌─ From Orders ────────┐ │ ┌─ From Orders ────────────┐   │
│ │ Pita Large    450 pcs│ │ │ Hummus 1kg      45 tubs  │   │
│ │ Pita Small    300 pcs│ │ │ Tahini 500g     30 tubs  │   │
│ │ Laffa         120 pcs│ │ │ Baba Ghanoush   25 tubs  │   │
│ └──────────────────────┘ │ └───────────────────────────┘   │
│                          │                                  │
│ ┌─ For Stock ──────────┐ │ ┌─ For Stock ──────────────┐   │
│ │ Pita Medium    50 pcs│ │ │ (none needed)             │   │
│ └──────────────────────┘ │ └───────────────────────────┘   │
│                          │                                  │
│ ⚠ Material Check:       │                                  │
│ Flour Type 55: Need 15kg│                                  │
│ Available: 12kg          │                                  │
│ [Create PO Draft →]     │                                  │
│                          │                                  │
│ [Generate Work Orders]   │ [Generate Work Orders]           │
└──────────────────────────┴─────────────────────────────────┘
```

#### Factory Floor Reporting (Tablet)
```
┌────────────────────────────────────────────────────────────┐
│    🏭  PRODUCTION REPORTING          WO-20260212-B001      │
│    Bakery Line | 12 Feb 2026                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   ┌────────────────────────────────────────────────┐      │
│   │  🍞  PITA BREAD LARGE                         │      │
│   │  Target: 450 pcs                               │      │
│   │                                                │      │
│   │  Produced: [    445    ] pcs  ✅               │      │
│   │  Waste:    [     8     ] pcs                   │      │
│   │  Reason:   [ Overcooked         ▼]             │      │
│   │                                                │      │
│   │  [  ✓ REPORT COMPLETE  ]                       │      │
│   └────────────────────────────────────────────────┘      │
│                                                            │
│   ┌────────────────────────────────────────────────┐      │
│   │  🍞  PITA BREAD SMALL                         │      │
│   │  Target: 300 pcs                               │      │
│   │  Status: ⏳ Pending                            │      │
│   │                                                │      │
│   │  [  START REPORTING  ]                         │      │
│   └────────────────────────────────────────────────┘      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 6.4 API Endpoints

```
GET    /api/production/plan/:date         - Get production plan for date
POST   /api/production/plan/generate      - Generate plan from orders
GET    /api/production/work-orders        - List work orders
POST   /api/production/work-orders        - Create work order
GET    /api/production/work-orders/:id    - Get work order details
PATCH  /api/production/work-orders/:id    - Update work order status
POST   /api/production/report             - Report production output
GET    /api/production/bom/:productId     - Get BOM for product
PUT    /api/production/bom/:productId     - Update BOM
GET    /api/production/bom/where-used/:materialId - Where-used report
GET    /api/production/capacity/:date     - Check line capacity
GET    /api/production/expiring           - List items expiring soon
POST   /api/production/labels/print       - Trigger label print
```

---

## 7. Module 3: Inventory Management

### 7.1 Overview
The Inventory module manages all raw materials and finished goods stock levels, integrates with Xero for purchase invoices, handles goods receipt, periodic stock counts, and auto-generates purchase suggestions and draft orders.

### 7.2 Functional Requirements

#### 7.2.1 Goods Receipt (Raw Materials)

**From Xero Invoice:**
1. System pulls new supplier invoices from Xero API (scheduled every 15 min)
2. Maps Xero line items to internal raw material SKUs
3. Creates a "Pending Receipt" record
4. Warehouse operator confirms physical receipt:
   - Verifies quantities match invoice
   - Reports any damaged/defective items
   - Confirms storage location
5. On confirmation:
   - Stock is added to inventory
   - If damages reported → creates credit note request back to Xero

**Manual Receipt:**
- For items not yet in Xero or direct deliveries
- Operator scans/selects items, enters quantities
- Links to PO if applicable
- Creates inventory movement record

#### 7.2.2 Damage & Defect Reporting
- Any team member can report damaged goods
- Select item → enter quantity → select reason (expired, contaminated, damaged, wrong item)
- Optionally attach photo
- System:
  - Deducts from inventory
  - Creates a credit note request → sends to Xero
  - Logs the event in audit trail
  - Notifies manager

#### 7.2.3 Minimum Stock Levels & Auto-Reorder

**Configuration per Item:**
- Minimum stock level (safety stock)
- Reorder point (when to trigger order)
- Reorder quantity (how much to order)
- Lead time (days from order to delivery)
- Primary and secondary supplier

**Auto-Reorder Logic:**
```
IF quantity_available <= reorder_point THEN
  suggested_qty = reorder_quantity
  
  -- Adjust for upcoming production needs (next lead_time_days)
  upcoming_need = SUM(BOM_qty * planned_production) for next {lead_time} days
  IF (quantity_available - upcoming_need) < min_stock_level THEN
    suggested_qty = MAX(reorder_quantity, upcoming_need + min_stock_level - quantity_available)
  
  -- Round up to supplier's minimum order
  suggested_qty = CEIL(suggested_qty / supplier_pack_size) * supplier_pack_size
  
  CREATE draft_purchase_order
  NOTIFY manager
```

**Purchase Order Draft:**
- System generates draft PO with suggested items and quantities
- Manager reviews and approves
- On approval: PO is sent to supplier (email)
- PO shows: expected delivery date, allowed delivery time slots (respecting supplier's delivery days, excluding Saturday if configured)

#### 7.2.4 Shipping Time Management
- Each supplier has configured lead time
- Expected delivery date = order date + lead time
- System considers supplier's delivery days (e.g., Mon-Fri only)
- Visual calendar showing expected deliveries
- Alert if delivery conflicts with factory schedule

#### 7.2.5 Periodic Stock Counts

**Count Types:**
- Full count: all items (monthly recommended)
- Partial count: selected categories (weekly)
- Spot check: random items (anytime)

**Count Process:**
1. Manager initiates count → system creates count sheet
2. Count sheet shows items to count (can be printed or on tablet)
3. Operator enters counted quantities
4. System calculates variance (counted vs. system)
5. Variances above threshold (configurable, e.g., 5%) are flagged
6. Manager reviews and approves
7. On approval: system adjusts inventory to match count
8. Variance report generated for analysis

**Post-Count Notifications:**
- Push notification to manager with count results
- Summary: X items counted, Y variances found, Z% accuracy
- Significant variances highlighted

#### 7.2.6 Inventory Dashboard

Real-time view showing:
- Current stock levels vs. min/max for all items
- Items below minimum (red alert)
- Items approaching minimum (yellow warning)
- Items approaching expiry (for finished goods)
- Recent movements (last 24h)
- Pending purchase orders
- Expected deliveries timeline

### 7.3 UI Wireframe Description

#### Inventory Overview Screen
```
┌────────────────────────────────────────────────────────────┐
│ ☰  Inventory                          [📊 Count] [⚙]     │
├────────────────────────────────────────────────────────────┤
│ [Raw Materials]  [Finished Goods]  [All]                   │
│ 🔍 Search...    Category: [All ▼]   Status: [All ▼]       │
├────────────────────────────────────────────────────────────┤
│ ┌─── Stock Health ──────────────────────────────────────┐ │
│ │ 🟢 OK: 45 items  🟡 Low: 8 items  🔴 Critical: 3    │ │
│ └───────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ Item          │ Category │ On Hand │ Min │ Status│ Action │
│───────────────┼──────────┼─────────┼─────┼───────┼────────│
│ 🔴 Flour 55  │ Flour    │ 12 kg   │ 50  │ CRIT  │ [PO →] │
│ 🔴 Olive Oil │ Oil      │ 3 L     │ 10  │ CRIT  │ [PO →] │
│ 🟡 Yeast     │ Baking   │ 2 kg    │ 5   │ LOW   │ [PO →] │
│ 🟡 Salt      │ Spice    │ 8 kg    │ 15  │ LOW   │ [PO →] │
│ 🟢 Sugar     │ Baking   │ 25 kg   │ 10  │ OK    │        │
│ 🟢 Tahini Raw│ Paste    │ 40 kg   │ 15  │ OK    │        │
└────────────────────────────────────────────────────────────┘
```

### 7.4 API Endpoints

```
GET    /api/inventory                     - List all inventory
GET    /api/inventory/:id                 - Get item stock details
GET    /api/inventory/movements           - List movements with filters
POST   /api/inventory/receive             - Record goods receipt
POST   /api/inventory/damage              - Report damage/defect
POST   /api/inventory/adjust              - Manual adjustment
GET    /api/inventory/alerts              - Get low stock alerts
GET    /api/inventory/reorder-suggestions - Get auto-reorder suggestions
POST   /api/inventory/purchase-orders     - Create PO from suggestion
GET    /api/inventory/counts              - List stock counts
POST   /api/inventory/counts              - Start new count
PUT    /api/inventory/counts/:id          - Update count results
POST   /api/inventory/counts/:id/approve  - Approve count
GET    /api/inventory/expiring            - Items approaching expiry
GET    /api/inventory/valuation           - Total inventory value
```

---

## 8. Module 4: Dashboard & Analytics

### 8.1 Overview
The management dashboard provides real-time visibility into all aspects of the operation: orders, production, inventory, and financials. It integrates data from Xero (supplier costs) and Freshbooks (customer revenue) to provide profitability analysis.

### 8.2 Dashboard Sections

#### 8.2.1 Executive Summary (Home Screen)

**Top KPI Cards:**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Orders   │ │Production│ │ Revenue  │ │ Costs    │ │ Margin   │
│ Today    │ │ Today    │ │ MTD      │ │ MTD      │ │ MTD      │
│   23     │ │  1,450   │ │ $45,200  │ │ $28,100  │ │  37.8%   │
│ +3 vs yd │ │  pcs     │ │ +12% MoM │ │ +8% MoM  │ │ +2.1pp   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### 8.2.2 Raw Material Consumption vs. Standard

**Purpose:** Compare actual raw material usage against what the BOM predicts. Detect waste, theft, or BOM inaccuracies.

**Logic:**
```
For each raw material:
  expected_usage = SUM(produced_qty × BOM_ratio) for period
  actual_usage = SUM(inventory_movements WHERE type = 'production_input') for period
  variance = actual_usage - expected_usage
  variance_pct = variance / expected_usage × 100
```

**Display:** Table with red/green highlighting for significant variances (>5%)

#### 8.2.3 Product Costing

**Full Cost Calculation:**
```
Product Cost = Direct Materials + Direct Labor + Overhead Allocation

Direct Materials = SUM(BOM_item_qty × latest_purchase_price) per unit
Direct Labor = (labor_hours × hourly_rate) / batch_size
Overhead = allocated based on production_line_hours or kg produced
Transport = delivery_cost / units_delivered (from Xero transport invoices)
```

**Display:** Product cost breakdown card with drill-down

#### 8.2.4 Profitability Analysis

**By Product:**
- Revenue per unit (from Freshbooks selling price)
- Cost per unit (calculated above)
- Margin per unit and percentage
- Volume × margin = total contribution

**By Customer:**
- Total revenue
- Product mix and associated costs
- Delivery costs allocated
- Net margin per customer

**By Production Line:**
- Revenue generated
- Direct costs
- Allocated overhead
- Line utilization rate
- Margin per line

#### 8.2.5 Production Analytics

- Daily/weekly/monthly production volumes
- Waste rates by product and line
- Capacity utilization trends
- Production vs. demand forecast
- Idle time detection: if a production line has no work orders for a day

#### 8.2.6 Customer Analytics

- Top customers by revenue (Pareto chart)
- Order frequency and trends
- Average order value trends
- Growth potential: customers with increasing order patterns
- At-risk: customers with declining orders

### 8.3 Real-Time Integration

**Xero API Data Points:**
- Supplier invoices → raw material costs
- Payment status → AP aging
- Account balances → cash position

**Freshbooks API Data Points:**
- Customer invoices → revenue
- Payment status → AR aging
- Customer details → contact info sync

### 8.4 API Endpoints

```
GET    /api/dashboard/summary             - Executive KPIs
GET    /api/dashboard/orders-today        - Today's order summary
GET    /api/dashboard/production-today    - Today's production summary
GET    /api/dashboard/inventory-health    - Stock status overview
GET    /api/dashboard/material-variance   - RM usage vs standard
GET    /api/dashboard/product-costing     - Cost breakdown per product
GET    /api/dashboard/profitability       - Margins by product/customer/line
GET    /api/dashboard/revenue-trend       - Revenue over time
GET    /api/dashboard/top-customers       - Customer ranking
GET    /api/dashboard/production-analytics - Production trends
GET    /api/dashboard/waste-analysis      - Waste tracking
GET    /api/dashboard/alerts              - Active alerts and warnings
```

---

## 9. Integrations

### 9.1 Ariba Integration

**Purpose:** Pull purchase orders from large enterprise customers using SAP Ariba.

**Integration Method:** Ariba cXML / REST API

**Data Flow:**
```
Ariba → [Scheduled Job: every 30 min] → Parse PO → Map Items → Create Order
```

**Key Considerations:**
- Ariba PO numbers are the reference key
- Item mapping table: Ariba SKU ↔ Internal SKU
- Handle unit conversions (Ariba may use different UOM)
- PO acknowledgment sent back to Ariba
- Support for PO changes and cancellations

### 9.2 Xero Integration

**Purpose:** Two-way sync for supplier invoices, payments, and accounting.

**Inbound (Xero → ERP):**
- Supplier invoices → trigger goods receipt workflow
- Supplier contact details → update supplier master data
- Item codes and prices → sync raw material prices
- Payment status → AP tracking

**Outbound (ERP → Xero):**
- Credit note requests (damaged goods)
- Purchase orders (for matching)
- Inventory valuations (periodic)

**API:** Xero OAuth 2.0, REST API
**Sync Frequency:** Every 15 minutes (invoices), daily (contacts, items)

### 9.3 Freshbooks Integration

**Purpose:** Sync customer invoices and revenue data.

**Inbound (Freshbooks → ERP):**
- Customer invoices → revenue tracking
- Customer details → sync customer master
- Item catalog → product price sync
- Payment status → AR tracking

**API:** Freshbooks OAuth 2.0, REST API
**Sync Frequency:** Every 30 minutes

### 9.4 Gmail Integration

**Purpose:** AI-powered email order parsing.

**Implementation:**
- Gmail API with OAuth 2.0
- Watch for emails to orders@ inbox (or specific labels)
- Claude API parses email body → structured order data
- Supports attachments (PDF orders, Excel orders)
- Thread tracking: replies on same order email update the order

### 9.5 WhatsApp Business Integration

**Purpose:** AI-powered WhatsApp order intake and notifications.

**Implementation:**
- WhatsApp Business API via 360dialog or Twilio
- Incoming message → Claude AI parses → draft order
- Outgoing: order confirmations, reminders, status updates, inventory alerts
- Media support: can receive photos of handwritten orders
- Template messages for outbound notifications (approved by WhatsApp)

### 9.6 Label Printing System

**Purpose:** Auto-generate labels during production reporting.

**Integration:**
- Webhook/API to existing label system
- Data payload: product info, batch, dates, ingredients, barcode, weight
- Support for different label templates per product
- Print queue management

---

## 10. Security & Permissions

### 10.1 Role-Based Access Control (RBAC)

| Feature | Admin | Manager | Production | Warehouse | Sales | Viewer |
|---------|-------|---------|------------|-----------|-------|--------|
| Dashboard - Full | ✅ | ✅ | - | - | - | ✅ (read) |
| Dashboard - Financial | ✅ | ✅ | - | - | - | - |
| Orders - View | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| Orders - Create/Edit | ✅ | ✅ | - | - | ✅ | - |
| Orders - Lock/Unlock | ✅ | ✅ | - | - | - | - |
| Orders - Cancel | ✅ | ✅ | - | - | - | - |
| Production - View Plan | ✅ | ✅ | ✅ | - | - | ✅ |
| Production - Report | ✅ | ✅ | ✅ | - | - | - |
| Production - BOM Edit | ✅ | ✅ | - | - | - | - |
| Inventory - View | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Inventory - Receive | ✅ | ✅ | - | ✅ | - | - |
| Inventory - Adjust | ✅ | ✅ | - | - | - | - |
| Inventory - Count | ✅ | ✅ | - | ✅ | - | - |
| Purchase Orders | ✅ | ✅ | - | ✅ (view) | - | - |
| Suppliers - Manage | ✅ | ✅ | - | - | - | - |
| Customers - Manage | ✅ | ✅ | - | - | ✅ | - |
| Products - Manage | ✅ | ✅ | - | - | - | - |
| Settings | ✅ | - | - | - | - | - |
| Users - Manage | ✅ | - | - | - | - | - |
| Audit Log | ✅ | ✅ (own) | - | - | - | - |

### 10.2 Security Measures

- HTTPS everywhere
- JWT-based authentication with refresh tokens
- Rate limiting on all API endpoints
- Input validation and SQL injection prevention (Prisma ORM)
- CORS configuration for known domains only
- Audit log for all data modifications
- Session timeout after 30 minutes of inactivity (configurable)
- Two-factor authentication for admin users (recommended)
- Data encryption at rest (database-level)
- Regular automated backups with tested restoration

---

## 11. UI/UX Guidelines

### 11.1 Design Principles
- **Mobile-first responsive design** – must work on factory floor tablets
- **Large touch targets** – minimum 44px for production interfaces
- **Clear status colors** – consistent across all modules:
  - 🟢 Green: OK, completed, in stock
  - 🟡 Yellow: Warning, pending, low stock
  - 🔴 Red: Critical, overdue, out of stock
  - 🔵 Blue: In progress, information
  - ⚪ Grey: Draft, inactive, cancelled
- **RTL-ready layout** – CSS logical properties, mirrored icons where needed
- **Accessible** – WCAG 2.1 AA compliance minimum
- **Fast** – target < 2s page load, < 500ms interaction response
- **Offline capability** – production reporting should work offline, sync when connected

### 11.2 Navigation Structure

```
├── 🏠 Dashboard
├── 📦 Orders
│   ├── All Orders
│   ├── Calendar View
│   ├── Kanban Board
│   └── Import (Email/WA/Ariba)
├── 🏭 Production
│   ├── Daily Plan
│   ├── Work Orders
│   ├── Floor Reporting
│   ├── BOM Management
│   └── Label Printing
├── 📊 Inventory
│   ├── Raw Materials
│   ├── Finished Goods
│   ├── Stock Counts
│   ├── Movements Log
│   └── Alerts
├── 🚚 Procurement
│   ├── Purchase Orders
│   ├── Reorder Suggestions
│   ├── Supplier Management
│   └── Delivery Calendar
├── 👥 Customers
│   ├── Customer List
│   └── Customer Analytics
├── 📈 Reports
│   ├── Profitability
│   ├── Material Variance
│   ├── Production Analytics
│   └── Waste Analysis
└── ⚙️ Settings
    ├── System Settings
    ├── Users & Roles
    ├── Integrations
    ├── Notifications
    └── Language
```

---

## 12. Claude Build Prompts

Below are detailed prompts to use with Claude for building each major component of the system. Each prompt is self-contained and references the specifications above.

---

### PROMPT 1: Project Setup & Foundation

```
You are building a Mini ERP system for a food manufacturing plant in Singapore.

Tech Stack:
- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS + shadcn/ui component library
- PostgreSQL via Supabase
- Prisma ORM
- next-intl for internationalization
- NextAuth.js for authentication

Set up the complete project foundation:

1. Initialize a Next.js 14 project with TypeScript and App Router
2. Install and configure all dependencies
3. Set up Prisma with the following configuration:
   - PostgreSQL connection (use DATABASE_URL env var)
   - Enable Prisma migrations
4. Set up next-intl with support for: en, he, zh-CN, ms
   - English as default
   - Hebrew as RTL
   - Create the base translation files structure in /messages/
5. Set up NextAuth.js with:
   - Credentials provider (email/password)
   - JWT session strategy
   - Role-based middleware
6. Configure Tailwind for RTL support (tailwindcss-rtl plugin)
7. Create the base layout with:
   - Responsive sidebar navigation (collapsible on mobile)
   - RTL/LTR automatic switching based on locale
   - Language switcher component
   - User menu with role display
8. Create the base translation files with common UI strings in all 4 languages
9. Set up environment variables template (.env.example)

File structure should follow:
/app/[locale]/(dashboard)/layout.tsx  - Main dashboard layout
/app/[locale]/(dashboard)/page.tsx    - Dashboard home
/app/[locale]/(auth)/login/page.tsx   - Login page
/components/ui/                       - shadcn components
/components/layout/                   - Sidebar, Header, etc.
/lib/prisma.ts                       - Prisma client
/lib/auth.ts                         - Auth configuration
/messages/en.json                    - English translations
/messages/he.json                    - Hebrew translations
/messages/zh-CN.json                 - Chinese translations
/messages/ms.json                    - Malay translations
/prisma/schema.prisma               - Database schema
/middleware.ts                       - Auth + i18n middleware

Make sure the application:
- Switches direction automatically for Hebrew (dir="rtl")
- Uses CSS logical properties throughout
- Has a clean, professional design suitable for manufacturing
- Navigation works on both desktop and mobile
```

---

### PROMPT 2: Database Schema & Prisma Setup

```
Create the complete Prisma schema for a Mini ERP system for a food manufacturing plant.

The schema must include all of these models with their relationships:

CUSTOMERS:
- id (UUID), external_id, external_system (ariba/freshbooks), name (Json for multi-language), 
  short_name, contact_name, email, phone, whatsapp_number, delivery_address, billing_address,
  default_delivery_slot, order_cutoff_time, payment_terms, credit_limit, currency, notes, 
  is_active, tags (Json), timestamps

PRODUCTS (Finished Goods):
- id (UUID), sku (unique), barcode, name (Json), description (Json), category, 
  production_line (enum: BAKERY/SALADS/FROZEN), unit_of_measure (enum), units_per_pack,
  pack_weight_kg, shelf_life_days, min_stock_level, max_stock_level, reorder_point,
  standard_batch_size, production_lead_time_hours, selling_price, cost_price,
  freshbooks_item_id, label_template_id, is_active, image_url, timestamps

RAW_MATERIALS:
- id (UUID), sku (unique), name (Json), description (Json), category, unit_of_measure,
  min_stock_level, max_stock_level, reorder_point, reorder_quantity, lead_time_days,
  primary_supplier (relation), secondary_supplier (relation), last_purchase_price,
  average_purchase_price, xero_item_id, storage_location, storage_temp_min/max,
  is_allergen, allergen_info, is_active, timestamps

SUPPLIERS:
- id (UUID), xero_contact_id, name (Json), short_name, contact info, country,
  payment_terms, currency, delivery_days (Json array), delivery_time_slots (Json),
  min_order_amount, lead_time_days, rating, is_active, timestamps

BOM (Bill of Materials):
- id (UUID), product_id (relation), version, name (Json), is_active, 
  yield_percentage, standard_batch_size, batch_unit, timestamps
- BOM_ITEMS: bom_id, raw_material_id, quantity, unit, waste_percentage, 
  is_optional, sort_order

ORDERS:
- id (UUID), order_number (unique, auto-pattern ORD-YYYYMMDD-XXXX), customer_id (relation),
  source (enum: EMAIL/WHATSAPP/ARIBA/MANUAL/PORTAL), source_reference, 
  status (enum: DRAFT/PENDING/CONFIRMED/LOCKED/IN_PRODUCTION/READY/DISPATCHED/DELIVERED/CANCELLED),
  order_date, requested_delivery_date, confirmed_delivery_date, delivery_slot,
  locked_at, locked_by, subtotal, tax_amount, total_amount, currency,
  freshbooks_invoice_id, delivery_notes, internal_notes, ai_parsed_raw, ai_confidence,
  is_recurring, recurrence_pattern (Json), created_by, updated_by, timestamps
- ORDER_ITEMS: order_id, product_id, quantity, unit_price, total_price, notes, sort_order
- ORDER_CHANGES: order_id, changed_by, change_type, old_value, new_value, reason, timestamp

WORK_ORDERS:
- id (UUID), wo_number (unique), production_date, production_line (enum), 
  status (PLANNED/IN_PROGRESS/COMPLETED/CANCELLED), planned_start, actual_start, 
  actual_end, notes, created_by, timestamps
- WORK_ORDER_ITEMS: work_order_id, product_id, bom_id, order_id (nullable),
  planned_quantity, produced_quantity, waste_quantity, waste_reason, batch_number,
  production_date, expiry_date, status, sort_order, timestamps

PRODUCTION_REPORTS:
- id (UUID), work_order_item_id, reported_by, quantity_produced, quantity_waste,
  waste_reason, batch_number, production_timestamp, notes, materials_consumed (Json)

INVENTORY_STOCK:
- id (UUID), item_type (RAW_MATERIAL/FINISHED_GOOD), raw_material_id (nullable),
  product_id (nullable), quantity_on_hand, quantity_reserved, last_count_date,
  last_count_quantity, location, updated_at

INVENTORY_MOVEMENTS:
- id (UUID), item_type, raw_material_id, product_id, 
  movement_type (enum: PURCHASE_RECEIPT/PRODUCTION_INPUT/PRODUCTION_OUTPUT/ADJUSTMENT_PLUS/
  ADJUSTMENT_MINUS/WASTE/COUNT/RETURN_TO_SUPPLIER/DAMAGED),
  quantity, unit, reference_type, reference_id, batch_number, expiry_date,
  supplier_invoice_number, xero_invoice_id, cost_per_unit, total_cost, reason,
  reported_by, timestamp

PURCHASE_ORDERS:
- id (UUID), po_number (unique), supplier_id, status, order_date, 
  expected_delivery_date, actual_delivery_date, delivery_time_slot,
  subtotal, tax_amount, total_amount, currency, xero_po_id, notes,
  auto_generated, created_by, timestamps
- PO_ITEMS: purchase_order_id, raw_material_id, quantity_ordered, 
  quantity_received, unit, unit_price, total_price

INVENTORY_COUNTS:
- id, count_date, count_type (FULL/PARTIAL/SPOT_CHECK), status, counted_by, 
  approved_by, notes, timestamps
- COUNT_ITEMS: count_id, item_type, raw_material_id, product_id, 
  system_quantity, counted_quantity, notes

NOTIFICATIONS, USERS, AUDIT_LOG, SYSTEM_SETTINGS as described above.

Include:
1. All enum types
2. All indexes for common queries
3. Proper cascading deletes
4. Unique constraints
5. Json fields for multi-language support
6. Seed file with sample data (5 customers, 10 products, 15 raw materials, 
   3 suppliers, BOMs for all products)

Also create the initial migration.
```

---

### PROMPT 3: Order Management Module

```
Build the complete Order Management module for a food manufacturing Mini ERP.

Context: This is a Next.js 14 App Router application with Prisma, next-intl (en/he/zh-CN/ms), 
shadcn/ui, and Tailwind CSS. The Prisma schema is already set up with orders, order_items, 
order_changes, customers, and products tables.

Build the following:

1. ORDER LIST PAGE (/app/[locale]/(dashboard)/orders/page.tsx)
   - Server-side data fetching with Prisma
   - Filterable by: date range, customer, status, source, product
   - Sortable columns: order#, customer, date, delivery date, amount, status
   - Three views: List (default), Calendar (by delivery date), Kanban (by status)
   - Search across order number, customer name
   - Color-coded status badges
   - Source channel icons (📧 email, 📱 whatsapp, 🔗 ariba, ✏️ manual)
   - Anomaly warning icons (⚠) for flagged orders
   - Lock icon (🔒) for locked orders
   - Pagination (25 per page)
   - "Export to Excel" button
   - All text must use translation keys (t('orders.title'), etc.)
   - RTL-compatible layout

2. ORDER DETAIL PAGE (/app/[locale]/(dashboard)/orders/[id]/page.tsx)
   - Full order information display
   - Editable line items (add/remove/change quantity) - disabled when locked
   - Status workflow buttons (Confirm, Lock, Ready, Dispatch, Deliver, Cancel)
   - Order change history timeline
   - Link to original email/message
   - AI confidence indicator for parsed orders
   - Anomaly indicators on specific items
   - Print-friendly view
   - All text translated

3. NEW ORDER FORM (/app/[locale]/(dashboard)/orders/new/page.tsx)
   - Customer selector with autocomplete and recent orders quick-view
   - Delivery date picker (blocked dates support)
   - Product catalog with multi-language search
   - "Copy from last order" button per customer
   - Quantity inputs with unit display
   - Auto-calculate totals
   - Save as Draft / Confirm

4. API ROUTES:
   - /api/orders (GET - list with filters, POST - create)
   - /api/orders/[id] (GET, PUT, DELETE)
   - /api/orders/[id]/status (PATCH - change status with validation)
   - /api/orders/[id]/lock (POST - lock for production)
   - /api/orders/[id]/unlock (POST - manager only)
   - /api/orders/[id]/duplicate (POST)
   - /api/orders/[id]/history (GET)
   - /api/orders/summary (GET - daily/weekly stats)

5. ORDER ANOMALY DETECTION:
   Create a utility function that checks each order against customer history:
   - Quantity > 2x average for that product/customer combo
   - New product never ordered by this customer
   - Total value > 150% of average order value
   - Unusual delivery day for this customer
   Returns array of anomaly objects: {type, item_id, message, severity}

6. ORDER LOCKING LOGIC:
   - Configurable lock time (from system_settings or per-customer cutoff)
   - Scheduled job checks every 15 minutes
   - On lock: creates work order records (ties to production module)
   - On lock: reserves raw materials in inventory

Make sure:
- All components are fully translated using next-intl useTranslations()
- All date/number formatting uses Intl formatters
- RTL layout works correctly for Hebrew
- Responsive design works on desktop and mobile
- Proper error handling and loading states
- Toast notifications for actions (using shadcn toast)
- Optimistic updates where appropriate
```

---

### PROMPT 4: AI Order Parser (Email + WhatsApp)

```
Build an AI-powered order parsing system that can extract structured order data 
from unstructured email and WhatsApp messages.

Tech stack: Next.js API routes, Anthropic Claude API, TypeScript, Prisma.

Build the following:

1. EMAIL ORDER PARSER (/lib/ai/email-parser.ts)
   - Input: email subject, body (plain text or HTML), attachments info
   - Uses Claude API to extract:
     - Customer identification (match against customer database)
     - Products and quantities (match against product catalog)
     - Requested delivery date
     - Special instructions/notes
   - Returns structured ParsedOrder object with confidence scores per field
   - Handles multiple languages (English, Hebrew, Chinese, Malay)
   - Handles common email formats:
     - Free-text orders ("Please send 200 pita and 50 hummus for Wednesday")
     - Table-formatted orders (HTML tables in emails)
     - Attached PDF/Excel orders (extract text, then parse)
   - Confidence thresholds:
     - > 0.9: Auto-confirm candidate
     - 0.7-0.9: Review recommended
     - < 0.7: Manual entry suggested

   Claude System Prompt for email parsing:
   """
   You are an order parsing assistant for Pita Bakery, a food manufacturing plant 
   in Singapore. Your job is to extract order details from customer emails.
   
   Known products (match against these): {productCatalog}
   Known customers: {customerList}
   
   Extract the following in JSON format:
   {
     "customer_match": {"name": "...", "confidence": 0.0-1.0, "matched_id": "..."},
     "delivery_date": {"date": "YYYY-MM-DD", "confidence": 0.0-1.0},
     "items": [
       {
         "product_match": {"name": "...", "confidence": 0.0-1.0, "matched_id": "..."},
         "quantity": number,
         "unit": "pcs|kg|pack",
         "notes": "..."
       }
     ],
     "special_instructions": "...",
     "overall_confidence": 0.0-1.0
   }
   
   Rules:
   - Match product names fuzzy (e.g., "pita" = "Pita Bread Large" if context suggests)
   - If multiple size variants exist, flag for review
   - Handle Hebrew, Chinese, and Malay product names
   - If delivery date is relative ("tomorrow", "Wednesday"), resolve to absolute date
   - If ambiguous, set lower confidence and include alternatives
   """

2. WHATSAPP ORDER PARSER (/lib/ai/whatsapp-parser.ts)
   - Similar to email parser but handles conversational context
   - Supports multi-turn: customer sends partial info, system asks for missing fields
   - Image parsing: if customer sends photo of handwritten order, use Claude vision
   - Returns same ParsedOrder structure
   - Auto-reply generation in customer's language

3. GMAIL INTEGRATION (/lib/integrations/gmail.ts)
   - Gmail API setup with OAuth 2.0
   - Watch specific inbox or label for new messages
   - Pub/Sub notification handler (or polling fallback)
   - Email processing pipeline:
     1. New email detected
     2. Extract text content (handle HTML)
     3. Call AI parser
     4. Create draft order in DB
     5. Notify operator via in-app + push notification
   - Thread tracking: replies to existing order emails update the order

4. WHATSAPP INTEGRATION (/lib/integrations/whatsapp.ts)
   - WhatsApp Business API client (360dialog or Twilio)
   - Webhook handler for incoming messages
   - Template message sender for outbound:
     - Order confirmation template
     - Delivery reminder template
     - Order cutoff reminder template
   - Conversation state management (for multi-turn order taking)
   - Rate limiting and error handling

5. ORDER REVIEW QUEUE UI (/app/[locale]/(dashboard)/orders/import/page.tsx)
   - Shows all AI-parsed orders pending review
   - Side-by-side view: original message | parsed result
   - Inline editing of parsed fields
   - Confidence indicators (green/yellow/red) per field
   - "Accept" / "Edit & Accept" / "Reject" actions
   - Bulk actions for multiple orders
   - Multi-language support

Include comprehensive error handling, retry logic, and logging.
```

---

### PROMPT 5: Production Management Module

```
Build the complete Production Management module for the Mini ERP.

Context: Next.js 14, Prisma, next-intl, shadcn/ui. Orders module is already built.
The database has work_orders, work_order_items, production_reports, bom, bom_items tables.

Build:

1. BOM MANAGEMENT (/app/[locale]/(dashboard)/production/bom/page.tsx)
   - List all products with their BOM status
   - BOM editor: visual tree/table interface to define ingredients
   - Add/remove/edit ingredients with quantities and waste percentages
   - BOM versioning: create new version, compare versions
   - Batch size calculator: input desired output → shows required materials
   - "Where Used" report: for any raw material, show all products using it
   - BOM import from CSV/Excel
   - Cost calculation from BOM (using latest material prices)

2. PRODUCTION PLANNING (/app/[locale]/(dashboard)/production/plan/page.tsx)
   - Date selector (default: tomorrow)
   - Shows aggregated demand from confirmed/locked orders
   - Split by production line (Bakery, Salads, Frozen)
   - For each product: ordered qty, current FG stock, net production needed
   - Make-to-stock items: show if below reorder point
   - BOM explosion: total raw materials needed for entire plan
   - Material availability check: compare needed vs. available stock
   - Capacity check per production line
   - Warnings for: insufficient materials, over-capacity, expiring soon items
   - "Generate Work Orders" button → creates WO records
   - Load balancing view: if frozen falafel needs pre-production, suggest earlier dates
   - Print-friendly production plan report

3. WORK ORDER MANAGEMENT (/app/[locale]/(dashboard)/production/work-orders/page.tsx)
   - List all work orders with status filters
   - Work order detail view:
     - Items to produce with quantities
     - Required materials (auto from BOM)
     - Linked customer orders
     - Timeline: planned start → actual start → end
   - Status transitions: Planned → In Progress → Completed/Cancelled
   - Batch number auto-generation: YYYYMMDD-{LINE}-{SEQ}

4. FACTORY FLOOR REPORTING (/app/[locale]/(dashboard)/production/report/page.tsx)
   - SIMPLIFIED UI designed for tablet use in factory
   - Large buttons, clear typography, minimal input required
   - Select active work order → see items to report
   - For each item:
     - Large number input: quantity produced
     - Waste input: quantity wasted
     - Waste reason: dropdown (Overcooked, Underweight, Damaged, Contaminated, Machine Error, Other)
     - Optional notes text field
   - "Report Complete" button per item
   - On submission:
     a. Create production_report record
     b. Add finished goods to inventory (PRODUCTION_OUTPUT movement)
     c. Deduct raw materials from inventory (PRODUCTION_INPUT movements, calculated from BOM × produced qty)
     d. Calculate and store expiry_date = production_date + product.shelf_life_days
     e. Optionally trigger label print
   - Visual progress: show completed vs. pending items
   - Works offline (queue reports, sync when online)

5. SHELF LIFE TRACKER (/lib/services/shelf-life.ts)
   - Track batch_number + production_date + expiry_date for all finished goods
   - FIFO logic: when dispatching, oldest batches first
   - Alert service: notify when items are within N days of expiry
   - Dashboard widget: "Expiring Soon" with countdown

6. LABEL SYSTEM INTEGRATION (/lib/integrations/labels.ts)
   - Generate label data payload from production report
   - Fields: product_name (multi-language), batch_number, production_date, 
     expiry_date, ingredients (from BOM), net_weight, barcode/QR
   - Send to label printing API/webhook
   - Print queue management
   - Reprint capability

7. API ROUTES for all above functionality

Production plan generation algorithm (pseudocode for implementation):
---
function generateProductionPlan(targetDate):
  // 1. Get all confirmed orders for targetDate
  orders = getConfirmedOrders(delivery_date = targetDate)
  
  // 2. Aggregate by product
  demand = {}
  for order in orders:
    for item in order.items:
      demand[item.product_id] += item.quantity
  
  // 3. Check make-to-stock items
  for product in makeToStockProducts:
    currentStock = getStock(product.id)
    if currentStock < product.reorder_point:
      demand[product.id] += product.standard_batch_size
  
  // 4. Subtract existing FG stock (respecting FIFO and expiry)
  netDemand = {}
  for [productId, qty] in demand:
    available = getAvailableStock(productId, not_expiring_before = targetDate + 2)
    netDemand[productId] = max(0, qty - available)
  
  // 5. Explode BOM
  materialNeeds = {}
  for [productId, qty] in netDemand:
    bom = getActiveBOM(productId)
    for bomItem in bom.items:
      needed = (qty / bom.standard_batch_size) * bomItem.quantity * (1 + bomItem.waste_percentage/100)
      materialNeeds[bomItem.raw_material_id] += needed
  
  // 6. Check material availability
  materialAlerts = []
  for [materialId, needed] in materialNeeds:
    available = getAvailableStock(materialId)
    if available < needed:
      materialAlerts.push({materialId, needed, available, shortage: needed - available})
  
  // 7. Check line capacity
  lineLoads = groupByProductionLine(netDemand)
  capacityAlerts = checkCapacity(lineLoads, targetDate)
  
  return { netDemand, materialNeeds, materialAlerts, capacityAlerts }
---

All UI must be fully translated and RTL-compatible.
Use shadcn/ui components throughout.
Include proper loading states, error handling, and optimistic updates.
```

---

### PROMPT 6: Inventory Management Module

```
Build the complete Inventory Management module for the Mini ERP.

Context: Next.js 14, Prisma, next-intl, shadcn/ui. Database has inventory_stock, 
inventory_movements, purchase_orders, purchase_order_items, inventory_counts, 
inventory_count_items, raw_materials, products, suppliers tables.

Build:

1. INVENTORY OVERVIEW (/app/[locale]/(dashboard)/inventory/page.tsx)
   - Two tabs: Raw Materials | Finished Goods
   - For each item show: name, SKU, category, on_hand, reserved, available, min, max, status
   - Status indicators: 🟢 OK, 🟡 Low (below reorder point), 🔴 Critical (below min)
   - Summary bar: "45 OK | 8 Low | 3 Critical"
   - Filters: category, status, supplier, search
   - Click item → detail view with movement history chart
   - Quick actions: Adjust Stock, Record Damage, Create PO

2. GOODS RECEIPT (/app/[locale]/(dashboard)/inventory/receive/page.tsx)
   - Two modes: "From Xero Invoice" and "Manual Receipt"
   - Xero mode: shows pending invoices from Xero → select → confirm quantities
   - Manual mode: select PO or enter freely → scan/select items → enter quantities
   - Damage reporting during receipt: flag items, enter qty, reason
   - Storage location selection
   - On submit:
     a. Create PURCHASE_RECEIPT inventory movements
     b. Update inventory_stock quantities
     c. If damages: create DAMAGED movements + Xero credit note request
     d. Update PO status (partially_received / received)
   - Print goods receipt note

3. DAMAGE & DEFECT REPORTING (/app/[locale]/(dashboard)/inventory/damage/page.tsx)
   - Simple form: select item → quantity → reason → optional photo
   - Reasons: Expired, Contaminated, Damaged, Wrong Item, Quality Issue, Other
   - On submit:
     a. Deduct from inventory
     b. Create credit note request (queued for Xero sync)
     c. Log in audit trail
     d. Notify manager

4. AUTO-REORDER SYSTEM (/lib/services/auto-reorder.ts)
   - Scheduled job runs daily (configurable time)
   - For each raw material:
     - Check: quantity_available <= reorder_point?
     - Calculate upcoming need (BOM × planned production for next lead_time days)
     - Suggested quantity = max(reorder_quantity, needed_to_reach_max_level)
     - Round to supplier's minimum order / pack size
   - Generate draft purchase orders grouped by supplier
   - Notification to manager with summary

5. PURCHASE ORDER MANAGEMENT (/app/[locale]/(dashboard)/procurement/page.tsx)
   - List POs with filters (status, supplier, date)
   - Create PO: select supplier → add items → set delivery date
   - PO form must show:
     - Supplier's allowed delivery days (exclude Saturdays, etc.)
     - Available delivery time slots
     - Expected delivery date based on lead time
   - PO approval workflow: Draft → Sent → Confirmed → Receiving → Received
   - "Send to Supplier" → email PO as PDF
   - Receive partial: mark individual items as received with qty

6. STOCK COUNT (/app/[locale]/(dashboard)/inventory/count/page.tsx)
   - Initiate count: Full / Partial (select categories) / Spot Check
   - Count sheet: list of items to count (printable + digital)
   - Entry form: for each item, enter counted quantity
   - Variance calculation: counted vs. system quantity
   - Variance highlighting: >5% = red, 2-5% = yellow
   - Approval workflow: Submit → Review → Approve
   - On approval: create COUNT movement adjustments, update inventory_stock
   - Post-count report: accuracy %, items with variance, total value impact
   - Push notification with count results

7. INVENTORY ALERTS & NOTIFICATIONS (/lib/services/inventory-alerts.ts)
   - Low stock alerts: push + email + WhatsApp to manager
   - Expiring items alerts: daily check for FG items expiring within N days
   - Count reminders: scheduled prompts for periodic counts
   - Post-count notifications
   - Configurable alert channels per alert type

8. XERO INTEGRATION for inventory (/lib/integrations/xero.ts)
   - OAuth 2.0 token management with refresh
   - Pull supplier invoices → map to goods receipt
   - Push credit note requests
   - Sync supplier details and item prices
   - Two-way item code mapping
   - Error handling and retry logic

9. SUPPLIER MANAGEMENT (/app/[locale]/(dashboard)/procurement/suppliers/page.tsx)
   - CRUD for suppliers
   - Delivery schedule configuration (which days, time slots)
   - Lead time tracking
   - Price history per item
   - Supplier performance metrics (on-time delivery %, quality rating)

API routes for all functionality above.
All UI translated and RTL-compatible.
Include comprehensive validation and error handling.
```

---

### PROMPT 7: Dashboard & Analytics Module

```
Build the Management Dashboard and Analytics module for the Mini ERP.

Context: Next.js 14, Prisma, next-intl, shadcn/ui, Recharts for charts.
All other modules (Orders, Production, Inventory) are built.
Integration with Xero (costs) and Freshbooks (revenue) is available.

Build:

1. EXECUTIVE DASHBOARD (/app/[locale]/(dashboard)/page.tsx)
   - KPI Cards (top row):
     - Orders Today (count + vs yesterday)
     - Production Today (units + utilization %)
     - Revenue MTD (SGD + MoM change %)
     - Costs MTD (SGD + MoM change %)
     - Gross Margin MTD (% + change)
   
   - Quick Status Panels:
     - Orders requiring attention (anomalies, pending past cutoff)
     - Inventory alerts (critical items)
     - Production alerts (capacity issues)
     - Expiring items countdown
   
   - Charts:
     - Revenue trend (last 30 days, line chart)
     - Order volume by source (pie/donut chart)
     - Production vs Capacity (bar chart, per line)
     - Top 5 products by volume (horizontal bar)
   
   - Recent Activity feed (last 20 events across all modules)
   - Real-time updates using Supabase Realtime or polling

2. RAW MATERIAL VARIANCE ANALYSIS (/app/[locale]/(dashboard)/reports/material-variance/page.tsx)
   - Date range selector (default: current month)
   - For each raw material:
     - Expected usage (from BOM × actual production)
     - Actual usage (from inventory movements)
     - Variance (absolute and %)
     - Cost impact of variance
   - Color coding: >5% over = red, >10% over = dark red
   - Drill-down: click material → see daily breakdown, which products
   - Summary: total expected cost vs actual cost
   - Alert configuration: set threshold for automatic notifications

3. PRODUCT COSTING (/app/[locale]/(dashboard)/reports/costing/page.tsx)
   - For each product, show cost breakdown:
     - Direct materials (from BOM × latest prices from Xero)
     - Direct labor (configurable allocation)
     - Overhead (configurable % or fixed allocation)
     - Transport/delivery (from Xero expense categories)
     - Total cost per unit
   - Comparison with selling price → margin per unit
   - "What-if" simulator: change an ingredient price → see impact on all products
   - Export to Excel

4. PROFITABILITY ANALYSIS (/app/[locale]/(dashboard)/reports/profitability/page.tsx)
   Three views:
   
   a. By Product:
      - Revenue, Cost, Margin, Volume
      - Contribution analysis (volume × margin)
      - Sortable, filterable table + chart
   
   b. By Customer:
      - Total revenue per customer
      - Product mix and weighted cost
      - Allocated delivery costs
      - Net margin per customer
      - Customer ranking by profitability
   
   c. By Production Line:
      - Revenue attributed to each line
      - Direct costs per line
      - Utilization rate
      - Margin per line
      - Idle time analysis

5. PRODUCTION ANALYTICS (/app/[locale]/(dashboard)/reports/production/page.tsx)
   - Daily/weekly/monthly production volumes (trend chart)
   - Waste rates by product (bar chart)
   - Waste reasons breakdown (pie chart)
   - Capacity utilization over time (line chart per line)
   - Batch size analysis: actual vs standard
   - Production efficiency: output per hour

6. CUSTOMER ANALYTICS (/app/[locale]/(dashboard)/reports/customers/page.tsx)
   - Top customers by revenue (Pareto chart - 80/20)
   - Order frequency analysis
   - Average order value trend per customer
   - Growth detection: customers with increasing orders
   - Churn risk: customers with declining orders
   - New customer acquisition trend

7. XERO FINANCIAL SYNC (/lib/integrations/xero-finance.ts)
   - Pull AP aging report → display supplier payment status
   - Pull expense categories → allocate costs
   - Sync invoice totals → cost tracking

8. FRESHBOOKS REVENUE SYNC (/lib/integrations/freshbooks.ts)
   - Pull customer invoices → revenue tracking
   - AR aging → payment collection status
   - Revenue by customer and product

9. REAL-TIME ALERT ENGINE (/lib/services/alerts.ts)
   - Material variance exceeds threshold → immediate alert
   - Production waste above normal → alert
   - Customer order significantly different from pattern → alert
   - Inventory reaching critical level → alert
   - All alerts logged and displayed in dashboard
   - Configurable channels: in-app, email, WhatsApp, push

Charts: Use Recharts library with consistent color scheme.
All translations, RTL support, responsive design.
Dashboard should feel professional - suitable for presenting the factory 
as a modern, technology-driven operation to investors/partners.
```

---

### PROMPT 8: Notification System

```
Build a comprehensive notification system for the Mini ERP.

The system must support multiple channels and be used across all modules.

1. NOTIFICATION SERVICE (/lib/services/notifications.ts)
   - Central notification dispatcher
   - Channels: in_app, email, whatsapp, push
   - Each notification type has configurable channels
   - Multi-language: notifications sent in recipient's preferred language
   - Template system with variable substitution
   - Queue-based: don't block main operations

2. NOTIFICATION TYPES:

   Order Notifications:
   - ORDER_RECEIVED: New order parsed from email/WA
   - ORDER_ANOMALY: Unusual order detected
   - ORDER_STATUS: Status change
   - ORDER_REMINDER: Customer hasn't ordered yet
   - ORDER_CUTOFF: Cutoff time approaching/passed
   - DAILY_ORDER_SUMMARY: Scheduled summary

   Production Notifications:
   - PRODUCTION_PLAN_READY: Plan generated for review
   - MATERIAL_SHORTAGE: Insufficient materials for plan
   - CAPACITY_EXCEEDED: Production line over capacity
   - PRODUCTION_COMPLETE: Work order completed
   - HIGH_WASTE: Waste above threshold

   Inventory Notifications:
   - LOW_STOCK: Below reorder point
   - CRITICAL_STOCK: Below minimum level
   - EXPIRING_SOON: Items approaching expiry
   - GOODS_RECEIVED: Delivery arrived
   - COUNT_DUE: Periodic count reminder
   - COUNT_COMPLETE: Count results ready
   - REORDER_SUGGESTION: Auto-generated PO draft ready

   Financial Notifications:
   - VARIANCE_ALERT: Material usage variance exceeds threshold
   - MARGIN_ALERT: Product margin dropped below threshold

3. SCHEDULED NOTIFICATIONS (/lib/jobs/notifications.ts)
   Using BullMQ:
   - Daily order summary: configurable time (default 06:00)
   - Customer order reminders: cutoff_time - 2 hours
   - Low stock check: daily at 07:00
   - Expiry check: daily at 07:00
   - Count reminders: per configured frequency

4. WHATSAPP TEMPLATES
   Pre-approved message templates for:
   - order_confirmation: "Hi {name}, order {number} confirmed for {date}. {items_summary}"
   - order_reminder: "Hi {name}, reminder to place your order for {date}. Cutoff: {time}"
   - daily_summary: "Summary for {date}: {orders_count} orders, {total_amount} total"
   - low_stock_alert: "⚠ Low stock: {items_list}. Action needed."

5. IN-APP NOTIFICATION CENTER (/components/notifications/)
   - Bell icon in header with unread count badge
   - Dropdown showing recent notifications
   - Full notification page with filters
   - Mark as read / mark all read
   - Click to navigate to relevant page

6. NOTIFICATION PREFERENCES (/app/[locale]/(dashboard)/settings/notifications)
   - Per-user configuration
   - Enable/disable per notification type per channel
   - Quiet hours setting
   - Summary frequency preference

Build all API routes, UI components, and background jobs.
All notification content must be translated into user's preferred language.
```

---

### PROMPT 9: Ariba Integration

```
Build the SAP Ariba integration for pulling customer purchase orders.

Requirements:
1. Ariba cXML/API client (/lib/integrations/ariba.ts)
   - OAuth2 or API key authentication
   - Pull new POs from Ariba Procurement
   - Parse cXML PO format into internal order structure
   - Item mapping: Ariba item codes → internal product SKUs
   - Unit of measure conversion
   - Handle PO changes (amendments) and cancellations
   - Send PO acknowledgments back to Ariba

2. Item Mapping Configuration (/app/[locale]/(dashboard)/settings/integrations/ariba)
   - UI to map Ariba item codes to internal product SKUs
   - Bulk import mapping from CSV
   - Alert for unmapped items
   - Default UOM conversion rules

3. Sync Job (/lib/jobs/ariba-sync.ts)
   - Runs every 30 minutes
   - Fetches new/modified POs since last sync
   - Creates orders in system
   - For fully mapped POs: auto-create as "Confirmed"
   - For POs with unmapped items: create as "Pending" and alert
   - Daily reconciliation report

4. Error handling, retry logic, detailed logging
```

---

### PROMPT 10: Xero & Freshbooks Full Integration

```
Build the complete Xero and Freshbooks integrations for the Mini ERP.

XERO INTEGRATION (/lib/integrations/xero/):

1. Authentication:
   - OAuth 2.0 with PKCE
   - Token storage and refresh logic
   - Multi-tenant support (if needed)
   - Connection status page in settings

2. Inbound Sync (Xero → ERP):
   a. Supplier Invoices:
      - Pull new invoices every 15 minutes
      - Map line items to internal raw material SKUs
      - Create "Pending Receipt" records in ERP
      - Track invoice status (draft, submitted, authorised, paid)
   
   b. Contacts (Suppliers):
      - Sync supplier details: name, email, phone, address
      - Map Xero ContactID to internal supplier_id
      - Daily sync
   
   c. Items & Prices:
      - Sync item catalog with prices
      - Track price changes over time
      - Map Xero ItemCode to internal raw_material sku

3. Outbound Sync (ERP → Xero):
   a. Credit Notes:
      - When damage is reported in ERP → create credit note in Xero
      - Include reference to original invoice
      - Auto-approve or leave as draft (configurable)
   
   b. Purchase Orders:
      - When PO is approved in ERP → create PO in Xero
      - Link for matching with invoices

4. Two-way item mapping UI
5. Sync status dashboard showing last sync time, errors, pending items

FRESHBOOKS INTEGRATION (/lib/integrations/freshbooks/):

1. Authentication:
   - OAuth 2.0
   - Token management

2. Inbound Sync (Freshbooks → ERP):
   a. Invoices:
      - Pull customer invoices for revenue tracking
      - Map to internal orders
      - Track payment status
   
   b. Clients:
      - Sync customer details
      - Map Freshbooks clientID to internal customer_id
   
   c. Items & Pricing:
      - Product catalog with selling prices
      - Price list management

3. Integration Settings UI (/app/[locale]/(dashboard)/settings/integrations/)
   - Xero connection management
   - Freshbooks connection management
   - Mapping tables for items and contacts
   - Sync logs with error details
   - Manual sync triggers

Build all API routes, background jobs (BullMQ), and UI components.
Comprehensive error handling with retry logic.
All settings UI must be translated.
```

---

### PROMPT 11: Mobile & Tablet Optimization

```
Optimize the entire Mini ERP application for mobile and tablet usage,
particularly for factory floor operations.

1. RESPONSIVE LAYOUT IMPROVEMENTS:
   - Sidebar collapses to bottom tab bar on mobile
   - Tables become card-based lists on small screens
   - Forms stack vertically on mobile
   - Touch-friendly: minimum 44px touch targets everywhere
   - Swipe gestures for common actions (swipe to change status)

2. PWA SETUP:
   - Service worker for offline capability
   - Manifest.json for installability
   - Cache strategy: network-first for API, cache-first for static assets
   - Offline production reporting: queue reports, sync when online
   - Background sync for pending operations

3. FACTORY FLOOR MODE:
   - Special "/floor" route with simplified UI
   - Extra large text and buttons (for gloved hands)
   - High contrast mode option
   - Minimal navigation (only production reporting)
   - Barcode scanner integration via camera
   - Sound feedback for successful/error actions
   - Auto-lock after inactivity (configurable)

4. MOBILE-SPECIFIC COMPONENTS:
   - Pull-to-refresh on list views
   - Infinite scroll pagination
   - Bottom sheet for filters and actions
   - Toast notifications at top of screen
   - Floating action button for primary actions

5. PRINT LAYOUTS:
   - Production plan print view
   - Purchase order PDF generation
   - Stock count sheet print format
   - Goods receipt note print
   - All prints include proper headers, dates, page numbers

Ensure RTL support works correctly on mobile for Hebrew users.
Test all layouts at breakpoints: 320px, 375px, 768px, 1024px, 1440px.
```

---

### PROMPT 12: Testing & Quality Assurance

```
Set up comprehensive testing for the Mini ERP application.

1. UNIT TESTS (using Vitest):
   - BOM explosion calculation
   - Auto-reorder quantity calculation
   - Order anomaly detection logic
   - Shelf life/expiry calculation
   - Material variance calculation
   - Product costing calculation
   - Date formatting for all locales
   - Currency formatting for SGD

2. INTEGRATION TESTS:
   - Order creation flow (create → confirm → lock → produce → deliver)
   - Production reporting flow (report → inventory deduction → label trigger)
   - Goods receipt flow (Xero invoice → receipt → stock update)
   - Auto-reorder flow (low stock detected → PO draft created → notification sent)
   - Stock count flow (initiate → count → approve → adjust)

3. API TESTS:
   - All endpoints with valid/invalid data
   - Authentication and authorization checks
   - Rate limiting verification
   - Multi-language response verification

4. E2E TESTS (using Playwright):
   - Complete order lifecycle
   - Production planning and reporting
   - Inventory management cycle
   - Dashboard loads correctly
   - Language switching (EN → HE → ZH-CN → MS)
   - RTL layout verification for Hebrew
   - Mobile responsive verification

5. TEST DATA:
   - Comprehensive seed file with realistic data
   - 10 customers (mix of hotels, restaurants, catering)
   - 20 products across all lines
   - 30 raw materials
   - 5 suppliers
   - 100 historical orders
   - BOMs for all products
   - Inventory levels with some items at critical levels

Set up CI/CD pipeline configuration (GitHub Actions):
- Run tests on every PR
- Build verification
- Database migration check
- Lint and type check
```

---

## 13. Future Expansions

### 13.1 Supplier Quality Analytics
- Track delivery accuracy (on-time, correct quantity)
- Quality issue logging per supplier
- Supplier scorecard dashboard
- Automatic supplier ranking

### 13.2 ISO 22000 Compliance
- HACCP documentation templates
- Critical control point tracking
- Corrective action management
- Audit preparation reports

### 13.3 Quality Control – Israel Imports
- Import batch tracking
- Certificate of origin management
- Kosher certification tracking
- Quality test logging per shipment

### 13.4 Production Quality Control
- In-line quality checkpoints
- Temperature logging
- Weight verification per batch
- Non-conformance reporting

### 13.5 Customer Portal
- Self-service ordering portal
- Real-time order tracking
- Order history and reorder
- Invoice access
- Delivery schedule visibility

### 13.6 Proof of Delivery (POD) Module
- Driver mobile app
- GPS tracking
- Digital signature capture
- Photo proof of delivery
- Real-time delivery status updates
- Route optimization

---

## 14. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|-----------|
| BOM | Bill of Materials – recipe/ingredient list for a product |
| FG | Finished Goods – completed products ready for sale |
| RM | Raw Materials – ingredients and packaging |
| WO | Work Order – production instruction for a batch |
| PO | Purchase Order – order sent to supplier |
| FIFO | First In, First Out – inventory rotation method |
| MOQ | Minimum Order Quantity |
| SKU | Stock Keeping Unit – unique product/material identifier |
| UOM | Unit of Measure |
| GST | Goods and Services Tax (Singapore: 9%) |
| POD | Proof of Delivery |
| HACCP | Hazard Analysis Critical Control Points |

### Appendix B: System Configuration Checklist

Before go-live, configure:
- [ ] All customer records with cutoff times and delivery slots
- [ ] All product records with shelf life and pricing
- [ ] All raw material records with min/max levels and suppliers
- [ ] All BOMs validated and tested
- [ ] Supplier delivery schedules configured
- [ ] Xero connection established and items mapped
- [ ] Freshbooks connection established and items mapped
- [ ] Ariba connection established and items mapped (if applicable)
- [ ] Gmail integration configured
- [ ] WhatsApp Business API connected
- [ ] Label printer integration tested
- [ ] All notification templates created in 4 languages
- [ ] User accounts created with proper roles
- [ ] Initial stock count completed and loaded
- [ ] System timezone set to Asia/Singapore
- [ ] Default currency set to SGD
- [ ] All translations reviewed and approved

### Appendix C: Recommended Implementation Phases

**Phase 1 (Weeks 1-4): Foundation**
- Project setup, database, auth, i18n
- Customer, Product, Material, Supplier master data
- BOM management

**Phase 2 (Weeks 5-8): Core Operations**
- Order management (manual + basic email)
- Production planning and reporting
- Inventory management (manual receipt, stock counts)

**Phase 3 (Weeks 9-12): Intelligence**
- AI email/WhatsApp parsing
- Auto-reorder system
- Anomaly detection
- Notification system

**Phase 4 (Weeks 13-16): Integration & Analytics**
- Xero integration
- Freshbooks integration
- Ariba integration
- Dashboard and analytics
- Label system integration

**Phase 5 (Weeks 17-20): Polish & Launch**
- Mobile optimization
- Testing and QA
- User training
- Data migration
- Soft launch and stabilization

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Prepared for: Esemby Concept / Pita Bakery, Singapore*
