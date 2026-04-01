import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products'
import { formatCurrency } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { Product } from '../types'

const emptyProduct = (): Partial<Product> => ({ einheit: 'Stk' })

export function ProduktePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; data: Partial<Product>; editId?: string }>({ open: false, data: emptyProduct() })

  const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts })

  const save = useMutation({
    mutationFn: () => modal.editId ? updateProduct(modal.editId, modal.data) : createProduct(modal.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setModal({ open: false, data: emptyProduct() }) },
  })
  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const filtered = (products ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Produkt-Katalog</h1>
        <button onClick={() => setModal({ open: true, data: emptyProduct() })} className="btn-primary">
          <Plus size={16} /> Produkt hinzufügen
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Produkte durchsuchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? <LoadingSpinner className="py-12" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Name</th>
                <th className="th">Beschreibung</th>
                <th className="th text-right">Listenpreis</th>
                <th className="th">Einheit</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="td font-medium">{p.name}</td>
                  <td className="td text-gray-500 max-w-md">
                    <span className="line-clamp-2 text-xs">{p.description ?? '–'}</span>
                  </td>
                  <td className="td text-right">{formatCurrency(p.listenpreis)}</td>
                  <td className="td text-gray-500">{p.einheit}</td>
                  <td className="td">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ open: true, data: { ...p }, editId: p.id })} className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm('Produkt löschen?')) remove.mutate(p.id) }} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-6">Keine Produkte gefunden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <Modal title={modal.editId ? 'Produkt bearbeiten' : 'Produkt hinzufügen'} onClose={() => setModal({ open: false, data: emptyProduct() })}>
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" placeholder="z.B. MAR - Schreibtisch in L Form - Lano E300 T"
                value={modal.data.name ?? ''}
                onChange={(e) => setModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
              />
            </div>
            <div>
              <label className="label">Listenpreis (netto)</label>
              <input type="number" step="0.01" className="input"
                value={modal.data.listenpreis ?? ''}
                onChange={(e) => setModal(prev => ({ ...prev, data: { ...prev.data, listenpreis: e.target.value === '' ? undefined : parseFloat(e.target.value) } }))}
              />
            </div>
            <div>
              <label className="label">Einheit</label>
              <input className="input" value={modal.data.einheit ?? 'Stk'}
                onChange={(e) => setModal(prev => ({ ...prev, data: { ...prev.data, einheit: e.target.value } }))}
              />
            </div>
            <div>
              <label className="label">Beschreibung (Freitext)</label>
              <textarea className="input min-h-[120px]" rows={5}
                placeholder="z.B. Breite [mm]: 2000&#10;Tiefe [mm]: 2000&#10;Höhe [mm]: 740&#10;Tischplatte Farbe: Europäischer Ahorn STD11"
                value={modal.data.description ?? ''}
                onChange={(e) => setModal(prev => ({ ...prev, data: { ...prev.data, description: e.target.value || undefined } }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-secondary" onClick={() => setModal({ open: false, data: emptyProduct() })}>Abbrechen</button>
            <button
              className="btn-primary"
              disabled={!modal.data.name || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
