import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import { getInstallers, createInstaller, updateInstaller, deleteInstaller } from '../api/installers'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { InstallationPartner } from '../types'

const emptyPartner = (): Partial<InstallationPartner> => ({
  can_install: false, can_deliver: false, can_store: false,
})

export function MonturePage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; data: Partial<InstallationPartner>; editId?: string }>({ open: false, data: emptyPartner() })

  const { data: installers, isLoading } = useQuery({ queryKey: ['installers'], queryFn: getInstallers })

  const save = useMutation({
    mutationFn: () => modal.editId ? updateInstaller(modal.editId, modal.data) : createInstaller(modal.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['installers'] }); setModal({ open: false, data: emptyPartner() }) },
  })
  const remove = useMutation({
    mutationFn: deleteInstaller,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installers'] }),
  })

  const set = (field: keyof InstallationPartner, value: unknown) =>
    setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Monteure &amp; Lager</h1>
        <button onClick={() => setModal({ open: true, data: emptyPartner() })} className="btn-primary">
          <Plus size={16} /> Hinzufügen
        </button>
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Name</th>
                <th className="th">Kontakt</th>
                <th className="th">Telefon</th>
                <th className="th">E-Mail</th>
                <th className="th">Ort</th>
                <th className="th">Gebiete</th>
                <th className="th">Montage</th>
                <th className="th">Lieferung</th>
                <th className="th">Lager</th>
                <th className="th">Bemerkung</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(installers ?? []).map((inst) => (
                <tr key={inst.id}>
                  <td className="td font-medium">{inst.name}</td>
                  <td className="td text-gray-500">{inst.contact_person ?? '–'}</td>
                  <td className="td text-gray-500">{inst.phone ?? '–'}</td>
                  <td className="td text-gray-500">{inst.email ?? '–'}</td>
                  <td className="td text-gray-500">{[inst.postal_code, inst.city].filter(Boolean).join(' ') || '–'}</td>
                  <td className="td text-xs text-gray-500 max-w-xs truncate">{inst.regions ?? '–'}</td>
                  {(['can_install', 'can_deliver', 'can_store'] as const).map((f) => (
                    <td key={f} className="td text-center">
                      {inst[f] ? <Check size={14} className="text-green-500 mx-auto" /> : <span className="text-gray-300">–</span>}
                    </td>
                  ))}
                  <td className="td text-xs text-gray-400 max-w-xs truncate">{inst.notes ?? '–'}</td>
                  <td className="td">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ open: true, data: inst, editId: inst.id })} className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm('Löschen?')) remove.mutate(inst.id) }} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(installers ?? []).length === 0 && (
                <tr><td colSpan={11} className="td text-center text-gray-400 py-8">Keine Einträge</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <Modal title={modal.editId ? 'Monteur bearbeiten' : 'Monteur hinzufügen'} onClose={() => setModal({ open: false, data: emptyPartner() })} size="lg">
          <div className="grid grid-cols-2 gap-4">
            {([
              ['name', 'Name *'], ['contact_person', 'Kontaktperson'],
              ['phone', 'Telefon'], ['email', 'E-Mail'],
              ['address', 'Adresse'], ['postal_code', 'PLZ'],
              ['city', 'Ort'], ['regions', 'Gebiete'],
            ] as [keyof InstallationPartner, string][]).map(([field, label]) => (
              <div key={field as string} className={field === 'regions' ? 'col-span-2' : ''}>
                <label className="label">{label}</label>
                <input className="input" value={(modal.data[field] as string) ?? ''} onChange={(e) => set(field, e.target.value || undefined)} />
              </div>
            ))}
            <div className="col-span-2">
              <p className="label mb-2">Fähigkeiten</p>
              <div className="flex gap-6">
                {([['can_install', 'Montage'], ['can_deliver', 'Lieferung'], ['can_store', 'Lager']] as [keyof InstallationPartner, string][]).map(([f, l]) => (
                  <label key={f as string} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!(modal.data[f])} onChange={(e) => set(f, e.target.checked)} className="h-4 w-4" />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">Bemerkung</label>
              <input className="input" value={(modal.data.notes as string) ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setModal({ open: false, data: emptyPartner() })}>Abbrechen</button>
            <button className="btn-primary" disabled={!modal.data.name || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
