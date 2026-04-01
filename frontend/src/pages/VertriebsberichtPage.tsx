import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Info, X } from 'lucide-react'
import { getVertriebsbericht } from '../api/reports'
import { createCostEntry, deleteCostEntry } from '../api/costEntries'
import { updatePurchaseOrder } from '../api/projects'
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

function InlineAmount({
  value,
  onSave,
}: {
  value?: number
  onSave: (v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState('')

  if (editing) {
    return (
      <input
        autoFocus
        className="w-28 border border-blue-400 rounded px-2 py-0.5 text-right text-sm"
        type="number"
        step="0.01"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          setEditing(false)
          const parsed = parseFloat(local)
          onSave(isNaN(parsed) ? null : parsed)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false) }
        }}
      />
    )
  }
  return (
    <span
      onClick={() => { setLocal(value != null ? String(value) : ''); setEditing(true) }}
      className={`cursor-pointer rounded px-1 hover:bg-blue-50 ${value != null ? 'font-medium' : 'text-gray-300 italic'}`}
      title="Klicken zum Bearbeiten"
    >
      {value != null ? formatCurrency(value) : 'eingeben…'}
    </span>
  )
}

export function VertriebsberichtPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
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
  const saveRechnungsbetrag = (projectId: string, poId: string, amount: number | null) => {
    updatePurchaseOrder(projectId, poId, { supplier_invoice_amount: amount ?? undefined })
      .then(() => qc.invalidateQueries({ queryKey: key }))
  }

  const periodLabel = month
    ? `${new Date(year, month - 1).toLocaleString('de-AT', { month: 'long' })} ${year}`
    : `${year} gesamt`

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vertriebsbericht</h1>
          <p className="text-xs text-gray-400 mt-0.5">Umsatz & Einkauf aus Projekten · Rechnungsbeträge zur Gegenkontrolle eintragbar</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Lohn-/Gemeinkosten
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
        <span className="text-sm font-medium text-gray-600">{periodLabel}</span>
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : data && (
        <div className="space-y-4">

          {/* Revenue table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-800">Umsatz aus Projekten</span>
              <span className="text-sm font-bold text-blue-800">{formatCurrency(data.project_revenue)}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="th py-1.5">Projekt</th>
                  <th className="th py-1.5">Kunde</th>
                  <th className="th py-1.5">Datum</th>
                  <th className="th py-1.5">Rechnungsnr.</th>
                  <th className="th py-1.5 text-right">Betrag (netto)</th>
                  <th className="th py-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.project_revenue_rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="td py-1.5 font-medium">{r.project_name}</td>
                    <td className="td py-1.5 text-gray-500">{r.customer_name}</td>
                    <td className="td py-1.5 text-gray-500">{formatDate(r.invoice_date)}</td>
                    <td className="td py-1.5 font-mono text-xs text-gray-400">{r.invoice_number ?? '–'}</td>
                    <td className="td py-1.5 text-right">{formatCurrency(r.net_amount)}</td>
                    <td className="td py-1.5 text-center">
                      {r.customer_payment_date
                        ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Bezahlt</span>
                        : <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Offen</span>
                      }
                    </td>
                  </tr>
                ))}
                {data.project_revenue_rows.length === 0 && (
                  <tr><td colSpan={6} className="td py-4 text-center text-gray-300">Keine Rechnungen im Zeitraum</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Purchase table with inline Rechnungsbetrag */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-orange-800">Einkauf aus Projekten</span>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">Bestellt: <span className="font-bold text-orange-800">{formatCurrency(data.project_purchases)}</span></span>
                <span className="text-gray-500">Laut Rechnung: <span className="font-bold text-orange-900">{formatCurrency(data.total_supplier_invoiced)}</span></span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="th py-1.5">Nr.</th>
                  <th className="th py-1.5">Bezeichnung</th>
                  <th className="th py-1.5">Projekt</th>
                  <th className="th py-1.5">Lieferant</th>
                  <th className="th py-1.5">Datum</th>
                  <th className="th py-1.5 text-right">Bestellsumme</th>
                  <th className="th py-1.5 text-right">Rechnungsbetrag</th>
                  <th className="th py-1.5 text-right">Differenz</th>
                  <th className="th py-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.project_purchase_rows.map((r, i) => {
                  const diff = r.supplier_invoice_amount != null
                    ? r.order_amount - r.supplier_invoice_amount
                    : null
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="td py-1.5 font-mono text-xs text-gray-400 whitespace-nowrap">{r.order_number != null ? `B-${String(r.order_number).padStart(3, '0')}` : '–'}</td>
                      <td className="td py-1.5 font-medium">{r.name ?? '–'}</td>
                      <td className="td py-1.5 text-gray-500">{r.project_name}</td>
                      <td className="td py-1.5 text-gray-500">{r.supplier_name}</td>
                      <td className="td py-1.5 text-gray-500">{formatDate(r.order_date)}</td>
                      <td className="td py-1.5 text-right">{formatCurrency(r.order_amount)}</td>
                      <td className="td py-1.5 text-right">
                        <InlineAmount
                          value={r.supplier_invoice_amount}
                          onSave={(v) => saveRechnungsbetrag(r.project_id, r.po_id, v)}
                        />
                      </td>
                      <td className={`td py-1.5 text-right text-xs ${diff == null ? 'text-gray-300' : diff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff == null ? '–' : diff === 0 ? '✓' : formatCurrency(diff)}
                      </td>
                      <td className="td py-1.5 text-center">
                        {r.klline_paid
                          ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Bezahlt</span>
                          : <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Offen</span>
                        }
                      </td>
                    </tr>
                  )
                })}
                {data.project_purchase_rows.length === 0 && (
                  <tr><td colSpan={9} className="td py-4 text-center text-gray-300">Keine Bestellungen im Zeitraum</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Manual cost entries */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-purple-800">Lohn- &amp; Gemeinkosten</span>
              <span className="text-sm font-bold text-purple-800">{formatCurrency(data.total_other_costs)}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="th py-1.5">Bezeichnung</th>
                  <th className="th py-1.5">Kategorie</th>
                  <th className="th py-1.5">Datum</th>
                  <th className="th py-1.5">Bemerkung</th>
                  <th className="th py-1.5 text-right">Betrag</th>
                  <th className="th py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.manual_entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="td py-1.5 font-medium">{e.name}</td>
                    <td className="td py-1.5 text-xs text-gray-400">{PAYROLL_OVERHEAD_LABELS[e.category] ?? e.category}</td>
                    <td className="td py-1.5 text-gray-500">{formatDate(e.entry_date)}</td>
                    <td className="td py-1.5 text-xs text-gray-400">{e.notes ?? '–'}</td>
                    <td className="td py-1.5 text-right">{formatCurrency(e.other_costs)}</td>
                    <td className="td py-1.5">
                      <button onClick={() => { if (confirm('Löschen?')) remove.mutate(e.id) }} className="text-gray-300 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.manual_entries.length === 0 && (
                  <tr><td colSpan={6} className="td py-4 text-center text-gray-300">Keine manuellen Einträge im Zeitraum</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom summary — side by side */}
          <div className="card p-5 border-2 border-gray-200">
            <div className="flex justify-end mb-3">
              <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <Info size={13} /> Erklärung der Werte
              </button>
            </div>
            {showInfo && (
              <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900 space-y-2 relative">
                <button onClick={() => setShowInfo(false)} className="absolute top-2 right-2 text-blue-300 hover:text-blue-600"><X size={13} /></button>
                <p className="font-semibold text-sm mb-1">Was fließt in die Berechnung ein?</p>
                <p><span className="font-semibold">Umsatz (aus Projekten):</span> Summe aller Ausgangsrechnungen (Betrag netto) mit Rechnungsdatum im gewählten Zeitraum.</p>
                <p><span className="font-semibold">Einkauf (aus Projekten):</span> Summe aller Bestellsummen mit Bestelldatum im gewählten Zeitraum.</p>
                <p><span className="font-semibold">Lohn &amp; Kosten:</span> Manuell erfasste Lohn- und Gemeinkosteneinträge mit Datum im gewählten Zeitraum.</p>
                <p><span className="font-semibold">Gewinn:</span> Umsatz − Einkauf − Lohn &amp; Kosten.</p>
                <p><span className="font-semibold">Rechnungsbetrag (Gegenkontrolle):</span> Manuell im Vertriebsbericht eingegebener tatsächlicher Rechnungsbetrag vom Lieferanten. Dient zum Abgleich mit der Bestellsumme aus dem Projekt.</p>
                <p><span className="font-semibold">Noch zu erwartende Einnahmen:</span> Summe aller Ausgangsrechnungen <em>ohne</em> Kundenzahlungsdatum (periodenübergreifend) — d.h. noch nicht bezahlte Rechnungen.</p>
                <p><span className="font-semibold">Noch zu erwartende Ausgaben:</span> Summe aller Bestellungen, bei denen Klline noch nicht bezahlt hat (periodenübergreifend).</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-6 text-sm">
              {/* Labels */}
              <div className="space-y-2">
                <div className="h-6" />{/* spacer for header row */}
                <div className="text-gray-500">Umsatz</div>
                <div className="text-gray-500">− Einkauf</div>
                <div className="text-gray-500">− Lohn &amp; Kosten</div>
                <div className="font-bold text-gray-900 border-t border-gray-200 pt-2">= Gewinn</div>
                <div className="h-3" />
                <div className="text-gray-400 text-xs">Noch zu erwartende Einnahmen</div>
                <div className="text-gray-400 text-xs">Noch zu erwartende Ausgaben</div>
              </div>
              {/* From projects */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide h-6 flex items-center">Aus Projekten</div>
                <div className="font-medium text-blue-700">{formatCurrency(data.project_revenue)}</div>
                <div className="font-medium text-orange-700">− {formatCurrency(data.project_purchases)}</div>
                <div className="font-medium text-purple-700">− {formatCurrency(data.total_other_costs)}</div>
                <div className={`font-bold border-t border-gray-200 pt-2 ${data.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(data.profit)}
                </div>
                <div className="h-3" />
                <div className="relative group">
                  <span className="text-blue-600 font-medium text-xs cursor-help border-b border-dashed border-blue-300">
                    {formatCurrency(data.noch_zu_erwartende_einnahmen)}
                  </span>
                  {data.noch_zu_erwartende_einnahmen_items.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-xs text-gray-700">
                      <p className="font-semibold mb-1.5 text-gray-900">Offene Einnahmen nach Projekt</p>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {data.noch_zu_erwartende_einnahmen_items.map((proj) => (
                          <div key={proj.project_id}>
                            <div className="flex justify-between gap-2 font-medium">
                              <span className="truncate">{proj.project_name} <span className="text-gray-400 font-normal">({proj.customer_name})</span></span>
                              <span className="whitespace-nowrap">{formatCurrency(proj.total_netto)}</span>
                            </div>
                            {proj.rechnungen.map((r) => (
                              <div key={r.rechnung_number} className="flex justify-between gap-2 pl-3 text-gray-400">
                                <span className="truncate font-mono">{r.rechnung_number} <span className="font-sans">{r.rechnung_type === 'ABSCHLAG' ? 'Abschlag' : 'Schluss'}</span></span>
                                <span className="whitespace-nowrap">{formatCurrency(r.total_netto)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative group">
                  <span className="text-red-600 font-medium text-xs cursor-help border-b border-dashed border-red-300">
                    {formatCurrency(data.noch_zu_erwartende_ausgaben)}
                  </span>
                  {data.noch_zu_erwartende_ausgaben_items.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-xs text-gray-700">
                      <p className="font-semibold mb-1.5 text-gray-900">Offene Bestellungen</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {data.noch_zu_erwartende_ausgaben_items.map((item, i) => (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="truncate">{item.order_number != null ? `B-${String(item.order_number).padStart(3, '0')} ` : ''}{item.name ?? item.project_name} ({item.supplier_name})</span>
                            <span className="whitespace-nowrap font-medium">{formatCurrency(item.order_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* From actual invoices */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide h-6 flex items-center">Laut Rechnungen</div>
                <div className="text-gray-300 text-xs italic">–</div>
                <div className="font-medium text-orange-700">{formatCurrency(data.total_supplier_invoiced)}</div>
                <div className="text-gray-300 text-xs italic">–</div>
                <div className={`font-bold border-t border-gray-200 pt-2 ${
                  data.total_supplier_invoiced === data.project_purchases ? 'text-green-600' :
                  data.total_supplier_invoiced > 0 ? 'text-yellow-600' : 'text-gray-300'
                }`}>
                  {data.total_supplier_invoiced > 0
                    ? (data.total_supplier_invoiced === data.project_purchases ? '✓ stimmt überein' : `Diff: ${formatCurrency(data.project_purchases - data.total_supplier_invoiced)}`)
                    : '–'}
                </div>
              </div>
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
              <input type="number" step="0.01" className="input"
                value={form.other_costs ?? ''}
                onChange={(e) => setForm(p => ({ ...p, other_costs: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
              />
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
