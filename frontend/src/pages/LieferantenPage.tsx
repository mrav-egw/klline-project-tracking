import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/suppliers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import { formatPct } from '../utils/format'
import type { Supplier } from '../types'

const BOOL_FIELDS: (keyof Supplier)[] = [
  'work_tables', 'conference_furniture', 'seating', 'lounge',
  'office_chairs', 'school_furniture', 'acoustics', 'kitchens',
]
const BOOL_LABELS: Record<string, string> = {
  work_tables: 'Arbeitstische', conference_furniture: 'Konferenz',
  seating: 'Sitzmöbel', lounge: 'Lounge', office_chairs: 'Bürodrehstühle',
  school_furniture: 'Schulmöbel', acoustics: 'Akustik', kitchens: 'Küchen',
}

const emptySupplier = (): Partial<Supplier> => ({
  work_tables: false, conference_furniture: false, seating: false, lounge: false,
  office_chairs: false, school_furniture: false, acoustics: false, kitchens: false,
})

export function LieferantenPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; data: Partial<Supplier>; editId?: string }>({ open: false, data: emptySupplier() })

  const { data: suppliers, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })

  const save = useMutation({
    mutationFn: () => modal.editId ? updateSupplier(modal.editId, modal.data) : createSupplier(modal.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal({ open: false, data: emptySupplier() }) },
  })
  const remove = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const set = (field: keyof Supplier, value: unknown) =>
    setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Lieferanten</h1>
        <button onClick={() => setModal({ open: true, data: emptySupplier() })} className="btn-primary">
          <Plus size={16} /> Lieferant hinzufügen
        </button>
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Code</th>
                <th className="th">Name</th>
                <th className="th">Kontakt</th>
                <th className="th">E-Mail</th>
                <th className="th">Telefon</th>
                <th className="th">Rabatt</th>
                <th className="th">Zahlungsziel</th>
                <th className="th">Lieferzeit</th>
                {BOOL_FIELDS.map((f) => <th key={f as string} className="th">{BOOL_LABELS[f as string]}</th>)}
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(suppliers ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="td font-mono text-xs font-bold">{s.code}</td>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td text-gray-500">{s.contact_person ?? '–'}</td>
                  <td className="td text-gray-500">{s.email ?? '–'}</td>
                  <td className="td text-gray-500">{s.phone ?? '–'}</td>
                  <td className="td">{formatPct(s.discount_pct)}</td>
                  <td className="td text-gray-500">{s.payment_terms ?? '–'}</td>
                  <td className="td text-gray-500">{s.lead_time ?? '–'}</td>
                  {BOOL_FIELDS.map((f) => (
                    <td key={f as string} className="td text-center">
                      {s[f] ? <Check size={14} className="text-green-500 mx-auto" /> : <span className="text-gray-300">–</span>}
                    </td>
                  ))}
                  <td className="td">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ open: true, data: s, editId: s.id })} className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm('Löschen?')) remove.mutate(s.id) }} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <Modal title={modal.editId ? 'Lieferant bearbeiten' : 'Lieferant hinzufügen'} onClose={() => setModal({ open: false, data: emptySupplier() })} size="xl">
          <div className="grid grid-cols-2 gap-4">
            {([['code', 'Code *'], ['name', 'Name *'], ['contact_person', 'Kontaktperson'], ['email', 'E-Mail'], ['phone', 'Telefon'], ['payment_terms', 'Zahlungsziel'], ['delivery_costs', 'Lieferkosten'], ['lead_time', 'Lieferzeit']] as [keyof Supplier, string][]).map(([field, label]) => (
              <div key={field as string}>
                <label className="label">{label}</label>
                <input className="input" value={(modal.data[field] as string) ?? ''} onChange={(e) => set(field, e.target.value || undefined)} />
              </div>
            ))}
            <div>
              <label className="label">Rabatt (%)</label>
              <input type="number" step="0.01" className="input" value={(modal.data.discount_pct as number) ?? ''} onChange={(e) => set('discount_pct', parseFloat(e.target.value) || undefined)} />
            </div>
            <div className="col-span-2">
              <p className="label mb-2">Produktkategorien</p>
              <div className="grid grid-cols-4 gap-3">
                {BOOL_FIELDS.map((f) => (
                  <label key={f as string} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!(modal.data[f])}
                      onChange={(e) => set(f, e.target.checked)}
                      className="h-4 w-4"
                    />
                    {BOOL_LABELS[f as string]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setModal({ open: false, data: emptySupplier() })}>Abbrechen</button>
            <button className="btn-primary" disabled={!modal.data.code || !modal.data.name || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
