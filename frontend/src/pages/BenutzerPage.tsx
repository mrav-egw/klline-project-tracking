import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { getUsers, createUser, updateUser, deleteUser, type UserCreate, type UserUpdate } from '../api/users'
import { useAuthStore } from '../store/auth'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'

export function BenutzerPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<{ id: string; data: UserUpdate } | null>(null)
  const [form, setForm] = useState<UserCreate>({ username: '', password: '', full_name: '' })

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setCreateModal(false); setForm({ username: '', password: '', full_name: '' }) },
  })
  const edit = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditModal(null) },
  })
  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-gray-500" />
          <h1 className="text-xl font-bold text-gray-900">Benutzerverwaltung</h1>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus size={16} /> Benutzer anlegen
        </button>
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Benutzername</th>
                <th className="th">Name</th>
                <th className="th">Status</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="td font-mono font-medium">
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-blue-500">(ich)</span>
                    )}
                  </td>
                  <td className="td">{u.full_name}</td>
                  <td className="td">
                    <StatusBadge paid={u.is_active} labelTrue="Aktiv" labelFalse="Deaktiviert" />
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditModal({ id: u.id, data: { username: u.username, full_name: u.full_name, is_active: u.is_active } })}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Pencil size={14} />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => { if (confirm(`Benutzer "${u.username}" löschen?`)) remove.mutate(u.id) }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <Modal title="Benutzer anlegen" onClose={() => setCreateModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Benutzername *</label>
              <input className="input" value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Passwort *</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            {create.isError && <p className="text-sm text-red-600">Benutzername bereits vergeben.</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setCreateModal(false)}>Abbrechen</button>
              <button
                className="btn-primary"
                disabled={!form.username || !form.full_name || !form.password || create.isPending}
                onClick={() => create.mutate(form)}
              >
                {create.isPending ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editModal && (
        <Modal title="Benutzer bearbeiten" onClose={() => setEditModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Benutzername</label>
              <input className="input" value={editModal.data.username ?? ''} onChange={(e) => setEditModal(p => p && ({ ...p, data: { ...p.data, username: e.target.value } }))} />
            </div>
            <div>
              <label className="label">Name</label>
              <input className="input" value={editModal.data.full_name ?? ''} onChange={(e) => setEditModal(p => p && ({ ...p, data: { ...p.data, full_name: e.target.value } }))} />
            </div>
            <div>
              <label className="label">Neues Passwort (leer = unverändert)</label>
              <input type="password" className="input" value={editModal.data.password ?? ''} onChange={(e) => setEditModal(p => p && ({ ...p, data: { ...p.data, password: e.target.value || undefined } }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={!!editModal.data.is_active} onChange={(e) => setEditModal(p => p && ({ ...p, data: { ...p.data, is_active: e.target.checked } }))} className="h-4 w-4" />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Aktiv</label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Abbrechen</button>
              <button
                className="btn-primary"
                disabled={edit.isPending}
                onClick={() => edit.mutate({ id: editModal.id, data: editModal.data })}
              >
                {edit.isPending ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
