export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
}

export interface Customer {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface SalesInvoice {
  id: string
  project_id: string
  invoice_number?: string
  invoice_date?: string
  net_amount: number
  noch_zu_fakturieren: number
  customer_payment_amount?: number
  customer_payment_date?: string
}

export interface PurchaseOrder {
  id: string
  project_id: string
  supplier_id?: string
  supplier_name_free?: string
  order_date?: string
  order_amount: number
  supplier_invoice_number?: string
  supplier_invoice_amount?: number
  klline_paid: boolean
  klline_paid_date?: string
  delivery_notes?: string
  installation_notes?: string
}

export interface Project {
  id: string
  name: string
  customer_id: string
  customer?: Customer
  sales_invoices: SalesInvoice[]
  purchase_orders: PurchaseOrder[]
  contribution_margin: number
  total_sales: number
  total_purchases: number
  total_still_to_invoice: number
  invoice_count?: number
  purchase_order_count?: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  code: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  discount_pct?: number
  payment_terms?: string
  delivery_costs?: string
  lead_time?: string
  work_tables: boolean
  conference_furniture: boolean
  seating: boolean
  lounge: boolean
  office_chairs: boolean
  school_furniture: boolean
  acoustics: boolean
  kitchens: boolean
}

export interface InstallationPartner {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  postal_code?: string
  city?: string
  regions?: string
  can_install: boolean
  can_deliver: boolean
  can_store: boolean
  notes?: string
}

export type CostCategory = 'REVENUE' | 'PURCHASE' | 'PAYROLL' | 'OVERHEAD'

export interface CostEntry {
  id: string
  name: string
  entry_date: string
  invoice_number?: string
  revenue_net: number
  purchase_cost_net: number
  other_costs: number
  notes?: string
  category: CostCategory
  created_at: string
}

export interface VertriebsberichtReport {
  year: number
  month?: number
  revenue_net: number
  purchase_cost_net: number
  other_costs: number
  profit: number
  entries: CostEntry[]
  totals_by_category: Record<string, number>
}

export interface DashboardSummary {
  total_projects: number
  total_revenue: number
  total_purchases: number
  total_still_to_invoice: number
  current_profit: number
  open_projects: number
}
