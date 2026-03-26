import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/customers'
import { getProjects } from '../api/projects'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { Customer } from '../types'

const emptyCustomer = (): Partial<Customer> => ({})

export function KundenPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [modal, setModal] = useState<{ open: boolean; data: Partial<Customer>; editId?: string }>({ open: false, data: emptyCustomer() })
  const [selected, setSelected] = useState<Customer | null>(null)

  const { data: customers, isLoading } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: getProjects })

  const save = useMutation({
    mutationFn: () => modal.editId ? updateCustomer(modal.editId, modal.data) : createCustomer(modal.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setModal({ open: false, data: emptyCustomer() }) },
  })
  const remove = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setSelected(null) },
  })

  const customerProjects = projects?.filter((p) => p.customer_id === selected?.id) ?? []

  const set = (field: keyof Customer, value: string) =>
    setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value || undefined } }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Kunden</h1>
        <button onClick={() => setModal({ open: true, data: emptyCustomer() })} className="btn-primary">
          <Plus size={16} /> Kunde anlegen
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer list */}
        <div className="lg:col-span-2">
          {isLoading ? <LoadingSpinner className="py-12" /> : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Name</th>
                    <th className="th">Kontakt</th>
                    <th className="th">E-Mail</th>
                    <th className="th">Telefon</th>
                    <th className="th text-right">Projekte</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(customers ?? []).map((c) => {
                    const count = projects?.filter((p) => p.customer_id === c.id).length ?? 0
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(selected?.id === c.id ? null : c)}
                        className={`cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="td font-medium text-blue-600">{c.name}</td>
                        <td className="td text-gray-500">{c.contact_person ?? '–'}</td>
                        <td className="td text-gray-500">{c.email ?? '–'}</td>
                        <td className="td text-gray-500">{c.phone ?? '–'}</td>
                        <td className="td text-right">{count}</td>
                        <td className="td" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setModal({ open: true, data: c, editId: c.id })}
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Kunde "${c.name}" löschen? Nur möglich wenn keine Projekte vorhanden.`)) remove.mutate(c.id) }}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {(customers ?? []).length === 0 && (
                    <tr><td colSpan={6} className="td text-center text-gray-400 py-8">Keine Kunden</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customer detail panel */}
        <div>
          {selected ? (
            <div className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selected.name}</h2>
                  {selected.contact_person && <p className="text-sm text-gray-500">{selected.contact_person}</p>}
                </div>
                <button
                  onClick={() => setModal({ open: true, data: selected, editId: selected.id })}
                  className="btn-secondary text-xs"
                >
                  <Pencil size={12} /> Bearbeiten
                </button>
              </div>
              {selected.email && <p className="text-sm text-gray-600">{selected.email}</p>}
              {selected.phone && <p className="text-sm text-gray-600">{selected.phone}</p>}
              {selected.notes && <p className="text-sm text-gray-500 italic">{selected.notes}</p>}

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Projekte ({customerProjects.length})</h3>
                <div className="space-y-2">
                  {customerProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/projekte/${p.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 border border-gray-100"
                    >
                      <FolderOpen size={14} className={p.is_completed ? 'text-green-500' : 'text-blue-500'} />
                      <span className={p.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{p.name}</span>
                    </button>
                  ))}
                  {customerProjects.length === 0 && <p className="text-xs text-gray-400">Keine Projekte</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-sm text-gray-400">
              Kunde auswählen für Details
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <Modal title={modal.editId ? 'Kunde bearbeiten' : 'Kunde anlegen'} onClose={() => setModal({ open: false, data: emptyCustomer() })}>
          <div className="space-y-4">
            {([
              ['name', 'Name *'],
              ['contact_person', 'Kontaktperson'],
              ['email', 'E-Mail'],
              ['phone', 'Telefon'],
            ] as [keyof Customer, string][]).map(([field, label]) => (
              <div key={field as string}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  value={(modal.data[field] as string) ?? ''}
                  onChange={(e) => set(field, e.target.value)}
                />
              </div>
            ))}
            <div>
              <label className="label">Notizen</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={(modal.data.notes as string) ?? ''}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setModal({ open: false, data: emptyCustomer() })}>Abbrechen</button>
              <button
                className="btn-primary"
                disabled={!modal.data.name || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
