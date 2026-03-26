import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, CheckCircle } from 'lucide-react'
import { getProjects, createProject } from '../api/projects'
import { getCustomers, createCustomer } from '../api/customers'
import { getSummary } from '../api/reports'
import { formatCurrency } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { Customer } from '../types'

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function ProjektePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCustomerId, setNewCustomerId] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [createNewCustomer, setCreateNewCustomer] = useState(false)

  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects })
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: getSummary })

  const createMutation = useMutation({
    mutationFn: async () => {
      let customerId = newCustomerId
      if (createNewCustomer && newCustomerName) {
        const c: Customer = await createCustomer({ name: newCustomerName })
        customerId = c.id
      }
      return createProject({ name: newName, customer_id: customerId })
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setShowModal(false)
      navigate(`/projekte/${p.id}`)
    },
  })

  const filtered = (projects ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Projekte</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Neues Projekt
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard label="Projekte gesamt" value={String(summary.total_projects)} sub={`${summary.open_projects} offen · ${summary.completed_projects} abgeschlossen`} />
          <SummaryCard label="Gesamtumsatz" value={formatCurrency(summary.total_revenue)} />
          <SummaryCard label="Noch zu fakturieren" value={formatCurrency(summary.total_still_to_invoice)} />
          <SummaryCard
            label="Aktueller Gewinn"
            value={formatCurrency(summary.current_profit)}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Projekt oder Kunde suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Projekt</th>
                <th className="th">Kunde</th>
                <th className="th text-right">Umsatz</th>
                <th className="th text-right">Einkauf</th>
                <th className="th text-right">Deckungsbeitrag</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projekte/${p.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="td font-medium text-blue-600">{p.name}</td>
                  <td className="td text-gray-500">{p.customer?.name ?? '–'}</td>
                  <td className="td text-right">{formatCurrency(p.total_sales)}</td>
                  <td className="td text-right">{formatCurrency(p.total_purchases)}</td>
                  <td className={`td text-right font-semibold ${p.contribution_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(p.contribution_margin)}
                  </td>
                  <td className="td">
                    {p.is_completed
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle size={12} /> Abgeschlossen</span>
                      : <span className="text-xs text-yellow-700">Offen</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="td text-center text-gray-400 py-8">Keine Projekte gefunden</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New project modal */}
      {showModal && (
        <Modal title="Neues Projekt" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Projektname *</label>
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="label">Kunde *</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  id="existing"
                  checked={!createNewCustomer}
                  onChange={() => setCreateNewCustomer(false)}
                />
                <label htmlFor="existing" className="text-sm">Bestehend</label>
                <input
                  type="radio"
                  id="new-customer"
                  checked={createNewCustomer}
                  onChange={() => setCreateNewCustomer(true)}
                  className="ml-4"
                />
                <label htmlFor="new-customer" className="text-sm">Neu anlegen</label>
              </div>
              {createNewCustomer ? (
                <input
                  className="input"
                  placeholder="Name des neuen Kunden"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              ) : (
                <select
                  className="input"
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                >
                  <option value="">Kunde wählen…</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Abbrechen</button>
              <button
                className="btn-primary"
                disabled={!newName || (!newCustomerId && !newCustomerName) || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
