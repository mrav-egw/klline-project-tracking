import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { getVertriebsbericht } from '../api/reports'
import { createCostEntry, deleteCostEntry } from '../api/costEntries'
import { formatCurrency, formatDate } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { CostCategory, CostEntry } from '../types'
import clsx from 'clsx'

const CATEGORY_LABELS: Record<CostCategory, string> = {
  REVENUE: 'Umsatz',
  PURCHASE: 'Einkauf',
  PAYROLL: 'Lohnkosten',
  OVERHEAD: 'Sonstige Kosten',
}

const CATEGORY_COLORS: Record<CostCategory, string> = {
  REVENUE: 'bg-blue-50 border-blue-200',
  PURCHASE: 'bg-orange-50 border-orange-200',
  PAYROLL: 'bg-purple-50 border-purple-200',
  OVERHEAD: 'bg-gray-50 border-gray-200',
}

const emptyEntry = (): Partial<CostEntry> => ({
  revenue_net: 0, purchase_cost_net: 0, other_costs: 0, category: 'REVENUE',
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

  const grouped = (data?.entries ?? []).reduce<Record<CostCategory, CostEntry[]>>((acc, e) => {
    ;(acc[e.category] ??= []).push(e)
    return acc
  }, {} as Record<CostCategory, CostEntry[]>)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Vertriebsbericht</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Eintrag hinzufügen
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-36" value={month ?? ''} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Alle Monate</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString('de-AT', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Umsatz', value: data.revenue_net, color: 'text-blue-700' },
              { label: 'Einkauf', value: data.purchase_cost_net, color: 'text-orange-700' },
              { label: 'Sonstige Kosten', value: data.other_costs, color: 'text-purple-700' },
              { label: 'Gewinn', value: data.profit, color: data.profit >= 0 ? 'text-green-700' : 'text-red-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`mt-1 text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Grouped entries */}
          {(['REVENUE', 'PURCHASE', 'PAYROLL', 'OVERHEAD'] as CostCategory[]).map((cat) => {
            const entries = grouped[cat] ?? []
            if (entries.length === 0) return null
            return (
              <div key={cat} className={clsx('card border', CATEGORY_COLORS[cat])}>
                <div className="px-5 py-3 border-b border-inherit">
                  <h3 className="font-semibold text-gray-700">{CATEGORY_LABELS[cat]}</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-white/50">
                    <tr>
                      <th className="th">Bezeichnung</th>
                      <th className="th">Datum</th>
                      <th className="th">Rechnungsnr.</th>
                      <th className="th text-right">Umsatz</th>
                      <th className="th text-right">Einkauf EK</th>
                      <th className="th text-right">Sonstige</th>
                      <th className="th">Bemerkung</th>
                      <th className="th" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td className="td font-medium">{e.name}</td>
                        <td className="td">{formatDate(e.entry_date)}</td>
                        <td className="td font-mono text-xs">{e.invoice_number ?? '–'}</td>
                        <td className="td text-right">{e.revenue_net ? formatCurrency(e.revenue_net) : '–'}</td>
                        <td className="td text-right">{e.purchase_cost_net ? formatCurrency(e.purchase_cost_net) : '–'}</td>
                        <td className="td text-right">{e.other_costs ? formatCurrency(e.other_costs) : '–'}</td>
                        <td className="td text-xs text-gray-400 max-w-xs truncate">{e.notes ?? '–'}</td>
                        <td className="td">
                          <button onClick={() => { if (confirm('Löschen?')) remove.mutate(e.id) }} className="text-gray-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </>
      )}

      {showModal && (
        <Modal title="Eintrag hinzufügen" onClose={() => setShowModal(false)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Bezeichnung *</label>
              <input className="input" value={form.name ?? ''} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Datum *</label>
              <input type="date" className="input" value={form.entry_date ?? ''} onChange={(e) => setForm(p => ({ ...p, entry_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select className="input" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value as CostCategory }))}>
                {(Object.entries(CATEGORY_LABELS) as [CostCategory, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rechnungsnummer</label>
              <input className="input" value={form.invoice_number ?? ''} onChange={(e) => setForm(p => ({ ...p, invoice_number: e.target.value || undefined }))} />
            </div>
            <div>
              <label className="label">Umsatz (netto)</label>
              <input type="number" step="0.01" className="input" value={form.revenue_net ?? 0} onChange={(e) => setForm(p => ({ ...p, revenue_net: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Einkauf EK (netto)</label>
              <input type="number" step="0.01" className="input" value={form.purchase_cost_net ?? 0} onChange={(e) => setForm(p => ({ ...p, purchase_cost_net: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Sonstige Kosten</label>
              <input type="number" step="0.01" className="input" value={form.other_costs ?? 0} onChange={(e) => setForm(p => ({ ...p, other_costs: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Bemerkung</label>
              <input className="input" value={form.notes ?? ''} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value || undefined }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
            <button
              className="btn-primary"
              disabled={!form.name || !form.entry_date || add.isPending}
              onClick={() => add.mutate(form)}
            >
              {add.isPending ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
