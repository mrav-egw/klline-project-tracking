import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react'
import {
  getProject, addSalesInvoice, updateSalesInvoice, deleteSalesInvoice,
  addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, deleteProject,
} from '../api/projects'
import { getSuppliers } from '../api/suppliers'
import { formatCurrency, formatDate } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import type { SalesInvoice, PurchaseOrder } from '../types'

type Tab = 'invoices' | 'orders'

const emptyInvoice = (): Partial<SalesInvoice> => ({ net_amount: 0, noch_zu_fakturieren: 0 })
const emptyOrder = (): Partial<PurchaseOrder> => ({ order_amount: 0, klline_paid: false })

export function ProjektDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('invoices')
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; data: Partial<SalesInvoice>; editId?: string }>({ open: false, data: emptyInvoice() })
  const [orderModal, setOrderModal] = useState<{ open: boolean; data: Partial<PurchaseOrder>; editId?: string }>({ open: false, data: emptyOrder() })

  const { data: project, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id!) })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', id] })

  const addInvoice = useMutation({ mutationFn: (d: Partial<SalesInvoice>) => addSalesInvoice(id!, d), onSuccess: invalidate })
  const editInvoice = useMutation({
    mutationFn: ({ siId, d }: { siId: string; d: Partial<SalesInvoice> }) => updateSalesInvoice(id!, siId, d),
    onSuccess: invalidate,
  })
  const removeInvoice = useMutation({ mutationFn: (siId: string) => deleteSalesInvoice(id!, siId), onSuccess: invalidate })

  const addOrder = useMutation({ mutationFn: (d: Partial<PurchaseOrder>) => addPurchaseOrder(id!, d), onSuccess: invalidate })
  const editOrder = useMutation({
    mutationFn: ({ poId, d }: { poId: string; d: Partial<PurchaseOrder> }) => updatePurchaseOrder(id!, poId, d),
    onSuccess: invalidate,
  })
  const removeOrder = useMutation({ mutationFn: (poId: string) => deletePurchaseOrder(id!, poId), onSuccess: invalidate })
  const deletePrj = useMutation({
    mutationFn: () => deleteProject(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); navigate('/projekte') },
  })

  if (isLoading) return <LoadingSpinner className="py-24" />
  if (!project) return <div className="p-6 text-gray-500">Projekt nicht gefunden.</div>

  const saveInvoice = () => {
    if (invoiceModal.editId) {
      editInvoice.mutate({ siId: invoiceModal.editId, d: invoiceModal.data })
    } else {
      addInvoice.mutate(invoiceModal.data)
    }
    setInvoiceModal({ open: false, data: emptyInvoice() })
  }

  const saveOrder = () => {
    if (orderModal.editId) {
      editOrder.mutate({ poId: orderModal.editId, d: orderModal.data })
    } else {
      addOrder.mutate(orderModal.data)
    }
    setOrderModal({ open: false, data: emptyOrder() })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/projekte')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Zurück
          </button>
          <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500">{project.customer?.name}</p>
        </div>
        <button
          onClick={() => { if (confirm('Projekt wirklich löschen?')) deletePrj.mutate() }}
          className="btn-danger"
        >
          <Trash2 size={16} /> Löschen
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Gesamtumsatz', value: formatCurrency(project.total_sales) },
          { label: 'Noch zu fakturieren', value: formatCurrency(project.total_still_to_invoice) },
          { label: 'Gesamteinkauf', value: formatCurrency(project.total_purchases) },
          {
            label: 'Deckungsbeitrag',
            value: formatCurrency(project.contribution_margin),
            color: project.contribution_margin >= 0 ? 'text-green-600' : 'text-red-600',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {([['invoices', 'Ausgangsrechnungen'], ['orders', 'Bestellungen / Einkauf']] as const).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Sales Invoices Tab */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setInvoiceModal({ open: true, data: emptyInvoice() })}
              className="btn-primary"
            >
              <Plus size={16} /> Rechnung hinzufügen
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="th">Rechnungsnr.</th>
                  <th className="th">Datum</th>
                  <th className="th text-right">Betrag (netto)</th>
                  <th className="th text-right">Noch zu fakturieren</th>
                  <th className="th text-right">Kunde bezahlt</th>
                  <th className="th text-right">Bezahlt am</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.sales_invoices.map((si) => (
                  <tr key={si.id}>
                    <td className="td font-mono text-xs">{si.invoice_number ?? '–'}</td>
                    <td className="td">{formatDate(si.invoice_date)}</td>
                    <td className="td text-right">{formatCurrency(si.net_amount)}</td>
                    <td className="td text-right">{formatCurrency(si.noch_zu_fakturieren)}</td>
                    <td className="td text-right">
                      <StatusBadge paid={!!si.customer_payment_date || !!si.customer_payment_amount} />
                    </td>
                    <td className="td text-right">{formatDate(si.customer_payment_date)}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setInvoiceModal({ open: true, data: si, editId: si.id })}
                          className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm('Löschen?')) removeInvoice.mutate(si.id) }}
                          className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {project.sales_invoices.length === 0 && (
                  <tr><td colSpan={7} className="td text-center text-gray-400 py-6">Keine Rechnungen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setOrderModal({ open: true, data: emptyOrder() })}
              className="btn-primary"
            >
              <Plus size={16} /> Bestellung hinzufügen
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="th">Lieferant</th>
                  <th className="th">Bestelldatum</th>
                  <th className="th text-right">Bestellsumme</th>
                  <th className="th">Prod. Rechnungsnr.</th>
                  <th className="th text-right">Prod. Rechnungssumme</th>
                  <th className="th">Klline bezahlt</th>
                  <th className="th">Ausgeliefert</th>
                  <th className="th">Montiert</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.purchase_orders.map((po) => {
                  const supplierName = po.supplier_name_free ??
                    suppliers?.find(s => s.id === po.supplier_id)?.name ?? '–'
                  return (
                    <tr key={po.id}>
                      <td className="td">{supplierName}</td>
                      <td className="td">{formatDate(po.order_date)}</td>
                      <td className="td text-right">{formatCurrency(po.order_amount)}</td>
                      <td className="td font-mono text-xs">{po.supplier_invoice_number ?? '–'}</td>
                      <td className="td text-right">{formatCurrency(po.supplier_invoice_amount)}</td>
                      <td className="td"><StatusBadge paid={po.klline_paid} /></td>
                      <td className="td text-xs text-gray-500 max-w-xs truncate">{po.delivery_notes ?? '–'}</td>
                      <td className="td text-xs text-gray-500 max-w-xs truncate">{po.installation_notes ?? '–'}</td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setOrderModal({ open: true, data: po, editId: po.id })}
                            className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm('Löschen?')) removeOrder.mutate(po.id) }}
                            className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {project.purchase_orders.length === 0 && (
                  <tr><td colSpan={9} className="td text-center text-gray-400 py-6">Keine Bestellungen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModal.open && (
        <Modal title={invoiceModal.editId ? 'Rechnung bearbeiten' : 'Rechnung hinzufügen'} onClose={() => setInvoiceModal({ open: false, data: emptyInvoice() })}>
          <div className="space-y-4">
            {(['invoice_number', 'invoice_date', 'net_amount', 'noch_zu_fakturieren', 'customer_payment_amount', 'customer_payment_date'] as const).map((field) => {
              const labels: Record<string, string> = {
                invoice_number: 'Rechnungsnummer', invoice_date: 'Rechnungsdatum',
                net_amount: 'Betrag (netto)', noch_zu_fakturieren: 'Noch zu fakturieren',
                customer_payment_amount: 'Kundenzahlung (Betrag)', customer_payment_date: 'Bezahlt am',
              }
              const isDate = field.endsWith('_date')
              const isNum = ['net_amount', 'noch_zu_fakturieren', 'customer_payment_amount'].includes(field)
              return (
                <div key={field}>
                  <label className="label">{labels[field]}</label>
                  <input
                    className="input"
                    type={isDate ? 'date' : isNum ? 'number' : 'text'}
                    step={isNum ? '0.01' : undefined}
                    value={(invoiceModal.data[field] as string | number | undefined) ?? ''}
                    onChange={(e) => setInvoiceModal(prev => ({
                      ...prev, data: { ...prev.data, [field]: isNum ? parseFloat(e.target.value) || 0 : e.target.value || undefined }
                    }))}
                  />
                </div>
              )
            })}
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setInvoiceModal({ open: false, data: emptyInvoice() })}>Abbrechen</button>
              <button className="btn-primary" onClick={saveInvoice}>Speichern</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Order Modal */}
      {orderModal.open && (
        <Modal title={orderModal.editId ? 'Bestellung bearbeiten' : 'Bestellung hinzufügen'} size="lg" onClose={() => setOrderModal({ open: false, data: emptyOrder() })}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Lieferant (aus Liste)</label>
              <select className="input" value={orderModal.data.supplier_id ?? ''} onChange={(e) => setOrderModal(prev => ({ ...prev, data: { ...prev.data, supplier_id: e.target.value || undefined } }))}>
                <option value="">– Kein –</option>
                {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Lieferant (Freitext)</label>
              <input className="input" value={orderModal.data.supplier_name_free ?? ''} onChange={(e) => setOrderModal(prev => ({ ...prev, data: { ...prev.data, supplier_name_free: e.target.value || undefined } }))} />
            </div>
            {(['order_date', 'order_amount', 'supplier_invoice_number', 'supplier_invoice_amount', 'klline_paid_date'] as const).map((field) => {
              const labels: Record<string, string> = {
                order_date: 'Bestelldatum', order_amount: 'Bestellsumme',
                supplier_invoice_number: 'Prod. Rechnungsnr.', supplier_invoice_amount: 'Prod. Rechnungssumme',
                klline_paid_date: 'Klline bezahlt am',
              }
              const isDate = field.endsWith('_date')
              const isNum = ['order_amount', 'supplier_invoice_amount'].includes(field)
              return (
                <div key={field}>
                  <label className="label">{labels[field]}</label>
                  <input
                    className="input"
                    type={isDate ? 'date' : isNum ? 'number' : 'text'}
                    step={isNum ? '0.01' : undefined}
                    value={(orderModal.data[field] as string | number | undefined) ?? ''}
                    onChange={(e) => setOrderModal(prev => ({
                      ...prev, data: { ...prev.data, [field]: isNum ? parseFloat(e.target.value) || 0 : e.target.value || undefined }
                    }))}
                  />
                </div>
              )
            })}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="klline_paid"
                checked={!!orderModal.data.klline_paid}
                onChange={(e) => setOrderModal(prev => ({ ...prev, data: { ...prev.data, klline_paid: e.target.checked } }))}
                className="h-4 w-4"
              />
              <label htmlFor="klline_paid" className="text-sm font-medium text-gray-700">Klline bezahlt</label>
            </div>
            <div className="col-span-2">
              <label className="label">Ausgeliefert (Notizen)</label>
              <input className="input" value={orderModal.data.delivery_notes ?? ''} onChange={(e) => setOrderModal(prev => ({ ...prev, data: { ...prev.data, delivery_notes: e.target.value || undefined } }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Montiert (Notizen)</label>
              <input className="input" value={orderModal.data.installation_notes ?? ''} onChange={(e) => setOrderModal(prev => ({ ...prev, data: { ...prev.data, installation_notes: e.target.value || undefined } }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setOrderModal({ open: false, data: emptyOrder() })}>Abbrechen</button>
            <button className="btn-primary" onClick={saveOrder}>Speichern</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
