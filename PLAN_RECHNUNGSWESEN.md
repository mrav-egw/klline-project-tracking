# Plan: Rechnungswesen (Angebote, Abschlagsrechnungen, Schlussrechnungen)

## Overview

Replace the current flat SalesInvoice system with a full invoicing workflow:
**Produkt-Katalog → Angebot → Abschlagsrechnung → Schlussrechnung → PDF**

All amounts are **netto**. USt (Umsatzsteuer) is configured per customer (default 20%) and applied at the end of the document.

---

## 1. Produkt-Katalog (Product Catalog)

A global catalog of products that can be picked when building an Angebot.

### Fields per Product
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | string | Product name, e.g. "MAR - Schreibtisch in L Form - Lano E300 T" |
| `description` | text | Default free-text description (detail lines like dimensions, colors, etc.) |
| `listenpreis` | Decimal(12,2) | List price per unit (netto) |
| `einheit` | string | Always "Stk" for now |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### UI
- New top-level page **"Produkte"** in sidebar
- CRUD: list, create, edit, delete
- Search/filter by name
- Description field: multi-line textarea

---

## 2. Angebot (Quote)

An Angebot belongs to a Project and contains grouped positions referencing products from the catalog.

### Angebot Model
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | FK → Project | |
| `angebot_number` | string | Auto-generated "AN-XXXX" (separate counter) |
| `angebot_date` | date | Date of the quote |
| `status` | enum | `ENTWURF` / `AKZEPTIERT` |
| `created_at` | datetime | |
| `updated_at` | datetime | |

**When status = AKZEPTIERT, the Angebot is locked** (positions/groups cannot be changed).

> **FUTURE**: Consider allowing edits to accepted Angebote (e.g., unlock flow, revision tracking). Marked for later.

### Angebot Position Group
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `angebot_id` | FK → Angebot | |
| `name` | string | Group name, e.g. "BÜRO 1 Aufstellung" |
| `sort_order` | int | Display order among groups |

### Angebot Position (Line Item)
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `angebot_id` | FK → Angebot | |
| `group_id` | FK → PositionGroup (nullable) | Which group this belongs to (null = ungrouped) |
| `product_id` | FK → Product | Reference to catalog product |
| `position_number` | int | Sequential position number (1, 2, 3...) across the entire Angebot |
| `description_override` | text (nullable) | Custom free-text description for this position (overrides product default if set) |
| `menge` | Decimal(10,2) | Quantity |
| `einzelpreis` | Decimal(12,2) | Unit price (defaults from product.listenpreis, can be overridden) |
| `rabatt_pct` | Decimal(5,2) | Discount percentage for this position (e.g. 43.00) |
| `sort_order` | int | Display order within group |

**Computed per position:**
- `gesamtpreis = menge * einzelpreis`
- `rabatt_amount = gesamtpreis * (rabatt_pct / 100)`
- `netto_amount = gesamtpreis - rabatt_amount`

**Computed for Angebot:**
- `total_netto = sum of all positions' netto_amount`

### UI (within Project Detail Page)
- New tab **"Angebote"** on the project detail page (replaces "Ausgangsrechnungen")
- List of Angebote for this project with status badge
- Click to open Angebot detail view:
  - Header: AN-number, date, status
  - Groups with drag/reorder (or sort_order buttons)
  - Positions within groups: pick product from catalog → auto-fill name, listenpreis, description
  - Override description per position (free text textarea)
  - Set Menge, Rabatt per position
  - Einzelpreis defaults from Listenpreis but can be overridden
  - Total netto at the bottom
- Button: **"Angebot akzeptieren"** → sets status to AKZEPTIERT, locks editing
- Button: **"Abschlagsrechnung erstellen"** (only visible when status = AKZEPTIERT and no Abschlagsrechnung exists yet)

---

## 3. Rechnungen (Invoices)

Two types: **Abschlagsrechnung** and **Schlussrechnung**. Both are always linked to an accepted Angebot.

### Rechnung Model
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `angebot_id` | FK → Angebot | The accepted Angebot this invoice is based on |
| `project_id` | FK → Project | Denormalized for easier queries |
| `rechnung_number` | string | Auto-generated "RE-XXXX" (separate counter) |
| `rechnung_date` | date | Invoice date |
| `rechnung_type` | enum | `ABSCHLAG` / `SCHLUSS` |
| `abschlag_pct` | Decimal(5,2) (nullable) | Only for ABSCHLAG: the percentage (e.g. 50.00) |
| `total_netto` | Decimal(12,2) | Computed: total netto amount of this invoice |
| `customer_payment_amount` | Decimal(12,2) (nullable) | Amount the customer actually paid |
| `customer_payment_date` | date (nullable) | When the customer paid |
| `created_at` | datetime | |

**No separate line items on the Rechnung** — it always references the Angebot's positions. The positions are the same; only the amounts differ based on type:

- **Abschlagsrechnung**: `total_netto = angebot.total_netto * (abschlag_pct / 100)`
- **Schlussrechnung**: Lists all positions at full price, then shows "Verrechnung der Abschlagsrechnungen" section, and the remaining amount.

### Business Rules
- Per Angebot: max **1 Abschlagsrechnung** + max **1 Schlussrechnung**
- Abschlagsrechnung can only be created when Angebot status = AKZEPTIERT
- Schlussrechnung can only be created when Angebot status = AKZEPTIERT (Abschlagsrechnung is optional — you can go directly to Schlussrechnung)
- RE-number counter is shared between Abschlag and Schluss (both get RE-XXXX)

### UI
- Within the Angebot detail view, show existing Rechnungen
- Button **"Abschlagsrechnung erstellen"**: opens dialog to enter the % → creates the Rechnung
- Button **"Schlussrechnung erstellen"**: creates the Schlussrechnung
- Each Rechnung shows: RE-number, date, type, amount, payment status
- Click on Rechnung → shows preview / PDF download
- Payment tracking: click to enter `customer_payment_amount` and `customer_payment_date`

---

## 4. Customer USt Configuration

### Changes to Customer Model
| New Field | Type | Description |
|-----------|------|-------------|
| `ust_pct` | Decimal(5,2) | Default: 20.00. Configurable per customer. |

Used for PDF generation and brutto calculations. The system continues to track everything in netto internally.

---

## 5. PDF Generation

Generate PDFs that match the sample invoice layout.

### Approach
- **Backend**: HTML template (Jinja2) → rendered to PDF via `weasyprint` or `wkhtmltopdf`
- **Template is configurable**: stored as HTML/CSS, editable in the future
- **Endpoint**: `GET /api/projects/{id}/angebote/{angebot_id}/rechnungen/{rechnung_id}/pdf`
- Also for Angebote: `GET /api/projects/{id}/angebote/{angebot_id}/pdf`

### PDF Layout (matching sample)
1. **Header**: Klline logo, company address, customer address block
2. **Meta block**: Rechnungs-Nr / Angebots-Nr, Datum, Referenz, Lieferdatum, Kundennummer, USt-Id, Ansprechpartner
3. **Title**: "Schlussrechnung Nr. RE-XXXX aus Angebot AN-XXXX" (or "Abschlagsrechnung" or just "Angebot")
4. **Greeting text**
5. **Position table**: Pos | Beschreibung | Menge | Einzelpreis | Gesamtpreis — with group headers as rows
6. **Totals**:
   - Gesamtbetrag netto
   - zzgl. Umsatzsteuer X%
   - Gesamtbetrag brutto
7. **For Schlussrechnung only — "Verrechnung der Abschlagsrechnungen"**:
   - Table: Datum | Rechnungs-Nr | Rechnungssumme Brutto | Steuersatz | Zahlung Netto | USt. | Zahlung Brutto
   - Summe geleisteter Zahlungen
8. **For Schlussrechnung only — "Schlussrechnung" summary**:
   - Summe Schlussrechnung brutto
   - Summe geleisteter Zahlungen brutto
   - Gesamtbetrag netto (remaining)
   - zzgl. USt
   - **Verbleibende Restforderung brutto**
9. **Footer**: Payment terms, signature, company details (Amtsgericht, FN-Nr, USt-ID, Bank)

### Company Settings (for PDF header/footer)
Need a **Settings/Config** table or config file for:
- Company name, address, phone, email, web
- FN-Nr, USt-ID, Amtsgericht
- Bank name, IBAN, BIC
- Logo image (stored in MinIO)
- Default payment terms text
- Default greeting text

---

## 6. Nummernkreise (Number Sequences)

### New Table: `number_sequences`
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Sequence name: "AN" or "RE" |
| `prefix` | string | "AN-" or "RE-" |
| `current_value` | int | Last used number |

- On creation of Angebot: `AN-{next_value}` (e.g., AN-2551, AN-2552...)
- On creation of Rechnung: `RE-{next_value}` (e.g., RE-2671, RE-2672...)
- Atomic increment to prevent duplicates

---

## 7. Migration: Replace SalesInvoice

### What Changes
- **Remove** `SalesInvoice` model, schema, router endpoints, frontend types
- **Remove** "Ausgangsrechnungen" tab from project detail page
- **Replace with** "Angebote" tab (containing Angebote → Rechnungen)
- **Vertriebsbericht**: Revenue now comes from `Rechnung` (both ABSCHLAG and SCHLUSS) instead of `SalesInvoice`
  - `project_revenue` = sum of all Rechnung.total_netto where rechnung_date is in period
  - `noch_zu_erwartende_einnahmen` = sum of Rechnungen where customer_payment_date IS NULL
  - Revenue rows show: Rechnung number, type (Abschlag/Schluss), date, amount, payment status
- **Project KPIs**:
  - `total_sales` = sum of all Rechnungen.total_netto for this project
  - `total_still_to_invoice` = Angebot total_netto minus sum of Rechnungen.total_netto (for accepted Angebote without Schlussrechnung)
  - `contribution_margin` = total_sales + total_still_to_invoice - total_purchases
- **Keep** PurchaseOrder / Bestellungen as-is

### Database Migration
- Add new tables: `products`, `angebote`, `angebot_position_groups`, `angebot_positions`, `rechnungen`, `number_sequences`, `company_settings`
- Add `ust_pct` column to `customers`
- Keep `sales_invoices` table temporarily for data migration, then drop
- Alembic migration + runtime column migrations in `main.py`

---

## 8. New Backend Structure

### New Models (`backend/app/models/`)
- `product.py` — Product catalog
- `angebot.py` — Angebot, AngebotPositionGroup, AngebotPosition
- `rechnung.py` — Rechnung
- `number_sequence.py` — NumberSequence
- `company_settings.py` — CompanySettings

### New Schemas (`backend/app/schemas/`)
- `product.py` — ProductCreate, ProductUpdate, ProductRead
- `angebot.py` — AngebotCreate, AngebotRead, PositionGroupCreate, PositionCreate, etc.
- `rechnung.py` — RechnungCreate, RechnungRead

### New Routers (`backend/app/routers/`)
- `products.py` — CRUD `/api/products`
- `angebote.py` — CRUD `/api/projects/{id}/angebote`, nested position/group management
- `rechnungen.py` — Create/read `/api/projects/{id}/angebote/{id}/rechnungen`, PDF endpoint

### Updated Services
- `reports.py` — Pull from Rechnung instead of SalesInvoice

---

## 9. New Frontend Structure

### New Pages/Components
- `ProduktePage.tsx` — Product catalog CRUD page
- `AngebotDetailPage.tsx` — Full Angebot editor (groups, positions, product picker)
- Components:
  - `ProductPicker.tsx` — Modal/dropdown to search & pick products from catalog
  - `AngebotPositionRow.tsx` — Editable row for a position
  - `RechnungCard.tsx` — Display a Rechnung with payment status

### Updated Pages
- `ProjektDetailPage.tsx` — Replace "Ausgangsrechnungen" tab with "Angebote" tab
- `VertriebsberichtPage.tsx` — Pull from new Rechnung data
- Sidebar: Add "Produkte" link

### New API functions (`frontend/src/api/`)
- `products.ts` — CRUD for product catalog
- `angebote.ts` — CRUD for Angebote, positions, groups
- `rechnungen.ts` — Create Rechnung, get PDF, update payment

---

## 10. Implementation Order

### Phase 1: Foundation
1. Product catalog (model, schema, router, frontend page)
2. Customer USt field (migration, schema update, frontend)
3. Number sequences table + logic

### Phase 2: Angebote
4. Angebot model + position groups + positions (models, schemas, migrations)
5. Angebot CRUD router (create, read, update, delete, accept)
6. Angebot frontend — new tab on project detail, product picker, position editor
7. Angebot PDF generation (HTML template + endpoint)

### Phase 3: Rechnungen
8. Rechnung model (migration, schema, router)
9. Abschlagsrechnung creation (from accepted Angebot, enter %)
10. Schlussrechnung creation (with Abschlags-Verrechnung logic)
11. Rechnung PDF generation (Abschlag + Schluss templates)
12. Payment tracking on Rechnungen

### Phase 4: Migration & Cleanup
13. Update Vertriebsbericht to pull from Rechnungen
14. Update Project KPIs (total_sales, contribution_margin, etc.)
15. Remove old SalesInvoice code (model, schema, router, frontend)
16. Company settings for PDF header/footer
17. Data migration (if any existing SalesInvoice data needs to be preserved)

---

## Open Items / Future Considerations

- **Unlocking accepted Angebote**: Currently locked after acceptance. May need a revision/unlock flow later.
- **Angebot versioning**: Track changes/revisions to Angebote.
- **More Einheiten**: Currently only "Stk". May need m, m², Pauschal, etc.
- **Multiple Abschlagsrechnungen**: Currently max 1. May need multiple in the future.
- **Reverse charge**: Not needed now, but may be needed for EU cross-border B2B.
- **Email sending**: Send Angebot/Rechnung PDFs via email directly from the system.
- **Angebot → Bestellungen link**: Auto-create purchase orders from accepted Angebot positions.
