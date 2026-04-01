import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Pencil, CheckCircle, Circle, FileText } from 'lucide-react'
import {
  getProject,
  addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, deleteProject, updateProject,
} from '../api/projects'
import { getAngebote, createAngebot, deleteAngebot } from '../api/angebote'
import { getSuppliers } from '../api/suppliers'
import { formatCurrency, formatDate } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import type { PurchaseOrder } from '../types'

type Tab = 'angebote' | 'orders'

const emptyOrder = (): Partial<PurchaseOrder> => ({ klline_paid: false })

function numVal(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  return String(v)
}

function parseNum(s: string): number | undefined {
  if (s === '') return undefined
  const n = parseFloat(s)
  return isNaN(n) ? undefined : n
}

export function ProjektDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('angebote')
  const [orderModal, setOrderModal] = useState<{ open: boolean; data: Partial<PurchaseOrder>; editId?: string }>({ open: false, data: emptyOrder() })
  const { data: project, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id!) })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })
  const { data: angebote } = useQuery({ queryKey: ['angebote', id], queryFn: () => getAngebote(id!) })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['project', id] })
    qc.invalidateQueries({ queryKey: ['angebote', id] })
    qc.invalidateQueries({ queryKey: ['vertriebsbericht'] })
    qc.invalidateQueries({ queryKey: ['summary'] })
  }

  const doCreateAngebot = useMutation({
    mutationFn: () => createAngebot(id!, { angebot_date: new Date().toISOString().slice(0, 10) }),
    onSuccess: (a) => { invalidate(); navigate(`/projekte/${id}/angebote/${a.id}`) },
  })
  const doDeleteAngebot = useMutation({
    mutationFn: (angebotId: string) => deleteAngebot(id!, angebotId),
    onSuccess: invalidate,
  })

  const addOrder = useMutation({ mutationFn: (d: Partial<PurchaseOrder>) => addPurchaseOrder(id!, d), onSuccess: invalidate })
  const editOrder = useMutation({
    mutationFn: ({ poId, d }: { poId: string; d: Partial<PurchaseOrder> }) => updatePurchaseOrder(id!, poId, d),
    onSuccess: invalidate,
  })
  const removeOrder = useMutation({ mutationFn: (poId: string) => deletePurchaseOrder(id!, poId), onSuccess: invalidate })
  const deletePrj = useMutation({
    mutationFn: () => deleteProject(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['vertriebsbericht'] })
      navigate('/projekte')
    },
  })
  const toggleDone = useMutation({
    mutationFn: () => updateProject(id!, { is_completed: !project?.is_completed }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); qc.invalidateQueries({ queryKey: ['projects'] }) },
  })

  if (isLoading) return <LoadingSpinner className="py-24" />
  if (!project) return <div className="p-6 text-gray-500">Projekt nicht gefunden.</div>

  const saveOrder = async () => {
    const d = orderModal.data
    setOrderModal({ open: false, data: emptyOrder() })
    if (orderModal.editId) {
      await editOrder.mutateAsync({ poId: orderModal.editId, d })
    } else {
      await addOrder.mutateAsync(d)
    }
  }

  const setOrderField = (field: keyof PurchaseOrder, raw: string, isNum: boolean) => {
    setOrderModal(prev => ({
      ...prev,
      data: { ...prev.data, [field]: isNum ? parseNum(raw) : (raw || undefined) },
    }))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/projekte')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Zurück
          </button>
          <div className="flex items-center gap-3">
            <h1 className={`text-xl font-bold ${project.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {project.name}
            </h1>
            {project.is_completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle size={12} /> Abgeschlossen
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{project.customer?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleDone.mutate()}
            disabled={toggleDone.isPending}
            className={project.is_completed ? 'btn-secondary' : 'btn bg-green-600 text-white hover:bg-green-700'}
          >
            {project.is_completed ? <><Circle size={16} /> Wieder öffnen</> : <><CheckCircle size={16} /> Abschließen</>}
          </button>
          <button
            onClick={() => { if (confirm('Projekt wirklich löschen?')) deletePrj.mutate() }}
            className="btn-danger"
          >
            <Trash2 size={16} /> Löschen
          </button>
        </div>
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
          {([['angebote', 'Angebote & Rechnungen'], ['orders', 'Bestellungen / Einkauf']] as const).map(
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

      {/* Angebote Tab */}
      {tab === 'angebote' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => doCreateAngebot.mutate()} className="btn-primary" disabled={doCreateAngebot.isPending}>
              <Plus size={16} /> Neues Angebot
            </button>
          </div>
          {(angebote ?? []).length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Nr.</th>
                    <th className="th">Datum</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Positionen</th>
                    <th className="th text-right">Betrag (netto)</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(angebote ?? []).map((a) => (
                    <tr key={a.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/projekte/${id}/angebote/${a.id}`)}>
                      <td className="td font-mono text-xs font-bold text-blue-600">{a.angebot_number}</td>
                      <td className="td">{formatDate(a.angebot_date)}</td>
                      <td className="td">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === 'AKZEPTIERT' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {a.status === 'AKZEPTIERT' ? 'Akzeptiert' : 'Entwurf'}
                        </span>
                      </td>
                      <td className="td text-right">{a.position_count}</td>
                      <td className="td text-right font-medium">{formatCurrency(a.total_netto)}</td>
                      <td className="td" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => navigate(`/projekte/${id}/angebote/${a.id}`)}
                            className="text-gray-400 hover:text-blue-600"><FileText size={14} /></button>
                          {a.status !== 'AKZEPTIERT' && (
                            <button onClick={() => { if (confirm('Angebot löschen?')) doDeleteAngebot.mutate(a.id) }}
                              className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              Noch keine Angebote. Erstellen Sie ein neues Angebot.
            </div>
          )}
        </div>
      )}

      {/* Purchase Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setOrderModal({ open: true, data: emptyOrder() })} className="btn-primary">
              <Plus size={16} /> Bestellung hinzufügen
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="th">Nr.</th>
                  <th className="th">Bezeichnung</th>
                  <th className="th">Lieferant</th>
                  <th className="th">Bestelldatum</th>
                  <th className="th text-right">Bestellsumme</th>
                  <th className="th">Lieferant Rechnungsnr.</th>
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
                      <td className="td font-mono text-xs text-gray-400">{po.order_number != null ? `B-${String(po.order_number).padStart(3, '0')}` : '–'}</td>
                      <td className="td font-medium">{po.name ?? '–'}</td>
                      <td className="td">{supplierName}</td>
                      <td className="td">{formatDate(po.order_date)}</td>
                      <td className="td text-right">{formatCurrency(po.order_amount)}</td>
                      <td className="td font-mono text-xs">{po.supplier_invoice_number ?? '–'}</td>
                      <td className="td"><StatusBadge paid={!!po.klline_paid_date} /></td>
                      <td className="td text-xs text-gray-500 max-w-xs truncate">{po.delivery_notes ?? '–'}</td>
                      <td className="td text-xs text-gray-500 max-w-xs truncate">{po.installation_notes ?? '–'}</td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setOrderModal({ open: true, data: { ...po }, editId: po.id })}
                            className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm('Löschen?')) removeOrder.mutate(po.id) }}
                            className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {project.purchase_orders.length === 0 && (
                  <tr><td colSpan={10} className="td text-center text-gray-400 py-6">Keine Bestellungen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {orderModal.open && (
        <Modal title={orderModal.editId ? 'Bestellung bearbeiten' : 'Bestellung hinzufügen'} size="lg" onClose={() => setOrderModal({ open: false, data: emptyOrder() })}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Bezeichnung *</label>
              <input className="input" placeholder="z.B. Büromöbel Büro 3.OG" value={orderModal.data.name ?? ''} onChange={(e) => setOrderModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value || undefined } }))} />
            </div>
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
            {(['order_date', 'order_amount', 'supplier_invoice_number', 'klline_paid_date'] as const).map((field) => {
              const labels: Record<string, string> = {
                order_date: 'Bestelldatum', order_amount: 'Bestellsumme',
                supplier_invoice_number: 'Lieferant Rechnungsnr.',
                klline_paid_date: 'Klline bezahlt am',
              }
              const isDate = field.endsWith('_date')
              const isNum = field === 'order_amount'
              return (
                <div key={field}>
                  <label className="label">{labels[field]}</label>
                  <input
                    className="input"
                    type={isDate ? 'date' : isNum ? 'number' : 'text'}
                    step={isNum ? '0.01' : undefined}
                    value={numVal(orderModal.data[field])}
                    onChange={(e) => setOrderField(field, e.target.value, isNum)}
                  />
                </div>
              )
            })}
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
