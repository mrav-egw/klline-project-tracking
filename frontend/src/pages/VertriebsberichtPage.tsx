import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Info } from 'lucide-react'
import { getVertriebsbericht } from '../api/reports'
import { createCostEntry, deleteCostEntry } from '../api/costEntries'
import { formatCurrency, formatDate } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { CostCategory, CostEntry } from '../types'

const PAYROLL_OVERHEAD_LABELS: Record<string, string> = {
  PAYROLL: 'Lohnkosten',
  OVERHEAD: 'Sonstige Kosten',
}

const emptyEntry = (): Partial<CostEntry> => ({
  other_costs: 0, revenue_net: 0, purchase_cost_net: 0, category: 'PAYROLL',
})

export function VertriebsberichtPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | undefined>(now.getMonth() + 1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Partial<CostEntry>>(emptyEntry())
  const qc = useQueryClient()

  const key = ['vertriebsbericht', year, month]
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getVertriebsbericht(year, month) })

  const add = useMutation({
    mutationFn: createCostEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setShowModal(false); setForm(emptyEntry()) },
  })
  const remove = useMutation({
    mutationFn: deleteCostEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const periodLabel = month
    ? `${new Date(year, month - 1).toLocaleString('de-AT', { month: 'long' })} ${year}`
    : `${year} gesamt`

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vertriebsbericht</h1>
          <p className="text-sm text-gray-500 mt-0.5">Umsatz & Einkauf werden automatisch aus den Projekten berechnet.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Lohn-/Gemeinkosten hinzufügen
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-40" value={month ?? ''} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Alle Monate</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('de-AT', { month: 'long' })}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 font-medium">{periodLabel}</span>
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : data && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Umsatz (aus Projekten)</p>
              <p className="mt-1 text-xl font-bold text-blue-700">{formatCurrency(data.project_revenue)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Einkauf (aus Projekten)</p>
              <p className="mt-1 text-xl font-bold text-orange-700">{formatCurrency(data.project_purchases)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lohn + Gemeinkosten</p>
              <p className="mt-1 text-xl font-bold text-purple-700">{formatCurrency(data.total_other_costs)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gewinn</p>
              <p className={`mt-1 text-xl font-bold ${data.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.profit)}
              </p>
            </div>
          </div>

          {/* Revenue from projects */}
          <div className="card overflow-hidden border border-blue-200">
            <div className="px-5 py-3 border-b border-blue-200 bg-blue-50 flex items-center gap-2">
              <h3 className="font-semibold text-blue-800">Umsatz aus Projekten</h3>
              <span className="text-xs text-blue-500 flex items-center gap-1"><Info size={12} /> automatisch</span>
            </div>
            <table className="w-full">
              <thead className="bg-white">
                <tr>
                  <th className="th">Projekt</th>
                  <th className="th">Kunde</th>
                  <th className="th">Rechnungsdatum</th>
                  <th className="th">Rechnungsnr.</th>
                  <th className="th text-right">Betrag (netto)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.project_revenue_rows.map((r, i) => (
                  <tr key={i}>
                    <td className="td font-medium">{r.project_name}</td>
                    <td className="td text-gray-500">{r.customer_name}</td>
                    <td className="td">{formatDate(r.invoice_date)}</td>
                    <td className="td font-mono text-xs">{r.invoice_number ?? '–'}</td>
                    <td className="td text-right font-medium">{formatCurrency(r.net_amount)}</td>
                  </tr>
                ))}
                {data.project_revenue_rows.length === 0 && (
                  <tr><td colSpan={5} className="td text-center text-gray-400 py-4">Keine Rechnungen im Zeitraum</td></tr>
                )}
                {data.project_revenue_rows.length > 0 && (
                  <tr className="bg-blue-50 font-semibold">
                    <td className="td" colSpan={4}>Gesamt</td>
                    <td className="td text-right">{formatCurrency(data.project_revenue)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Purchases from projects */}
          <div className="card overflow-hidden border border-orange-200">
            <div className="px-5 py-3 border-b border-orange-200 bg-orange-50 flex items-center gap-2">
              <h3 className="font-semibold text-orange-800">Einkauf aus Projekten</h3>
              <span className="text-xs text-orange-500 flex items-center gap-1"><Info size={12} /> automatisch</span>
            </div>
            <table className="w-full">
              <thead className="bg-white">
                <tr>
                  <th className="th">Projekt</th>
                  <th className="th">Lieferant</th>
                  <th className="th">Bestelldatum</th>
                  <th className="th text-right">Bestellsumme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.project_purchase_rows.map((r, i) => (
                  <tr key={i}>
                    <td className="td font-medium">{r.project_name}</td>
                    <td className="td text-gray-500">{r.supplier_name}</td>
                    <td className="td">{formatDate(r.order_date)}</td>
                    <td className="td text-right font-medium">{formatCurrency(r.order_amount)}</td>
                  </tr>
                ))}
                {data.project_purchase_rows.length === 0 && (
                  <tr><td colSpan={4} className="td text-center text-gray-400 py-4">Keine Bestellungen im Zeitraum</td></tr>
                )}
                {data.project_purchase_rows.length > 0 && (
                  <tr className="bg-orange-50 font-semibold">
                    <td className="td" colSpan={3}>Gesamt</td>
                    <td className="td text-right">{formatCurrency(data.project_purchases)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Manual cost entries (PAYROLL + OVERHEAD) */}
          <div className="card overflow-hidden border border-purple-200">
            <div className="px-5 py-3 border-b border-purple-200 bg-purple-50 flex items-center justify-between">
              <h3 className="font-semibold text-purple-800">Lohn- &amp; Gemeinkosten (manuell)</h3>
              <div className="flex gap-4 text-sm text-purple-700">
                <span>Lohn: <strong>{formatCurrency(data.payroll_costs)}</strong></span>
                <span>Sonstige: <strong>{formatCurrency(data.overhead_costs)}</strong></span>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-white">
                <tr>
                  <th className="th">Bezeichnung</th>
                  <th className="th">Kategorie</th>
                  <th className="th">Datum</th>
                  <th className="th">Bemerkung</th>
                  <th className="th text-right">Betrag</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.manual_entries.map((e) => (
                  <tr key={e.id}>
                    <td className="td font-medium">{e.name}</td>
                    <td className="td text-xs text-gray-500">{PAYROLL_OVERHEAD_LABELS[e.category] ?? e.category}</td>
                    <td className="td">{formatDate(e.entry_date)}</td>
                    <td className="td text-xs text-gray-400">{e.notes ?? '–'}</td>
                    <td className="td text-right">{formatCurrency(e.other_costs)}</td>
                    <td className="td">
                      <button onClick={() => { if (confirm('Löschen?')) remove.mutate(e.id) }} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.manual_entries.length === 0 && (
                  <tr><td colSpan={6} className="td text-center text-gray-400 py-4">Keine manuellen Einträge im Zeitraum</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Profit summary */}
          <div className="card p-5 border-2 border-gray-300">
            <div className="grid grid-cols-2 gap-2 text-sm max-w-sm ml-auto">
              <span className="text-gray-600">Umsatz:</span>
              <span className="text-right font-medium">{formatCurrency(data.project_revenue)}</span>
              <span className="text-gray-600">− Einkauf:</span>
              <span className="text-right font-medium text-orange-700">− {formatCurrency(data.project_purchases)}</span>
              <span className="text-gray-600">− Lohn &amp; Kosten:</span>
              <span className="text-right font-medium text-purple-700">− {formatCurrency(data.total_other_costs)}</span>
              <span className="font-bold text-gray-900 border-t border-gray-300 pt-2">= Gewinn:</span>
              <span className={`text-right font-bold border-t border-gray-300 pt-2 ${data.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(data.profit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add manual cost entry modal */}
      {showModal && (
        <Modal title="Lohn-/Gemeinkosten hinzufügen" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Bezeichnung *</label>
              <input className="input" placeholder="z.B. Lohnkosten 03.2025" value={form.name ?? ''} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Datum *</label>
              <input type="date" className="input" value={form.entry_date ?? ''} onChange={(e) => setForm(p => ({ ...p, entry_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select className="input" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value as CostCategory }))}>
                <option value="PAYROLL">Lohnkosten</option>
                <option value="OVERHEAD">Sonstige Kosten</option>
              </select>
            </div>
            <div>
              <label className="label">Betrag</label>
              <input type="number" step="0.01" className="input" value={form.other_costs ?? 0} onChange={(e) => setForm(p => ({ ...p, other_costs: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Bemerkung</label>
              <input className="input" value={form.notes ?? ''} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value || undefined }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
              <button
                className="btn-primary"
                disabled={!form.name || !form.entry_date || add.isPending}
                onClick={() => add.mutate(form)}
              >
                {add.isPending ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
