import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Pencil, CheckCircle, FileText, Search } from 'lucide-react'
import {
  getAngebot, acceptAngebot, deleteAngebot,
  addGroup, updateGroup, deleteGroup,
  addPosition, updatePosition, deletePosition,
  createRechnung, updateRechnungPayment,
} from '../api/angebote'
import { getProducts } from '../api/products'
import { formatCurrency, formatDate } from '../utils/format'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Modal } from '../components/Modal'
import type { AngebotPosition, Product } from '../types'

export function AngebotDetailPage() {
  const { id: projectId, angebotId } = useParams<{ id: string; angebotId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const key = ['angebot', projectId, angebotId]
  const { data: angebot, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getAngebot(projectId!, angebotId!),
  })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['angebote', projectId] })
    qc.invalidateQueries({ queryKey: ['project', projectId] })
  }

  // Modals
  const [groupModal, setGroupModal] = useState<{ open: boolean; name: string; editId?: string }>({ open: false, name: '' })
  const [posModal, setPosModal] = useState<{ open: boolean; data: Partial<AngebotPosition>; editId?: string }>({ open: false, data: {} })
  const [productSearch, setProductSearch] = useState('')
  const [rechnungModal, setRechnungModal] = useState<{ open: boolean; type: 'ABSCHLAG' | 'SCHLUSS'; pct: string; date: string }>({ open: false, type: 'ABSCHLAG', pct: '50', date: '' })
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; rechnungId: string; amount: string; date: string }>({ open: false, rechnungId: '', amount: '', date: '' })

  const locked = angebot?.status === 'AKZEPTIERT'

  // Mutations
  const doAccept = useMutation({ mutationFn: () => acceptAngebot(projectId!, angebotId!), onSuccess: invalidate })
  const doDelete = useMutation({ mutationFn: () => deleteAngebot(projectId!, angebotId!), onSuccess: () => navigate(`/projekte/${projectId}`) })

  const saveGroup = useMutation({
    mutationFn: () => groupModal.editId
      ? updateGroup(projectId!, angebotId!, groupModal.editId, { name: groupModal.name })
      : addGroup(projectId!, angebotId!, { name: groupModal.name }),
    onSuccess: () => { invalidate(); setGroupModal({ open: false, name: '' }) },
  })
  const removeGroup = useMutation({ mutationFn: (gId: string) => deleteGroup(projectId!, angebotId!, gId), onSuccess: invalidate })

  const savePos = useMutation({
    mutationFn: () => posModal.editId
      ? updatePosition(projectId!, angebotId!, posModal.editId, posModal.data)
      : addPosition(projectId!, angebotId!, posModal.data),
    onSuccess: () => { invalidate(); setPosModal({ open: false, data: {} }) },
  })
  const removePos = useMutation({ mutationFn: (pId: string) => deletePosition(projectId!, angebotId!, pId), onSuccess: invalidate })

  const doCreateRechnung = useMutation({
    mutationFn: () => createRechnung(projectId!, angebotId!, {
      rechnung_type: rechnungModal.type,
      rechnung_date: rechnungModal.date || undefined,
      abschlag_pct: rechnungModal.type === 'ABSCHLAG' ? parseFloat(rechnungModal.pct) : undefined,
    }),
    onSuccess: () => { invalidate(); setRechnungModal({ open: false, type: 'ABSCHLAG', pct: '50', date: '' }) },
  })

  const doUpdatePayment = useMutation({
    mutationFn: () => updateRechnungPayment(projectId!, angebotId!, paymentModal.rechnungId, {
      customer_payment_amount: paymentModal.amount ? parseFloat(paymentModal.amount) : undefined,
      customer_payment_date: paymentModal.date || undefined,
    }),
    onSuccess: () => { invalidate(); setPaymentModal({ open: false, rechnungId: '', amount: '', date: '' }) },
  })

  if (isLoading) return <LoadingSpinner className="py-24" />
  if (!angebot) return <div className="p-6 text-gray-500">Angebot nicht gefunden.</div>

  const openAddPosition = (groupId?: string) => {
    setPosModal({ open: true, data: { group_id: groupId } })
    setProductSearch('')
  }

  const selectProduct = (p: Product) => {
    setPosModal(prev => ({
      ...prev,
      data: {
        ...prev.data,
        product_id: p.id,
        einzelpreis: p.listenpreis,
        description_override: p.description || undefined,
        menge: 1,
        rabatt_pct: prev.data.rabatt_pct ?? 0,
      },
    }))
  }

  const filteredProducts = (products ?? []).filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Group positions by group_id
  const ungrouped = angebot.positions.filter(p => !p.group_id)
  const hasAbschlag = angebot.rechnungen.some(r => r.rechnung_type === 'ABSCHLAG')
  const hasSchluss = angebot.rechnungen.some(r => r.rechnung_type === 'SCHLUSS')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(`/projekte/${projectId}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Zurück zum Projekt
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{angebot.angebot_number}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              locked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {locked ? 'Akzeptiert' : 'Entwurf'}
            </span>
          </div>
          {angebot.angebot_date && <p className="text-sm text-gray-500">Datum: {formatDate(angebot.angebot_date)}</p>}
        </div>
        <div className="flex gap-2">
          {!locked && (
            <>
              <button onClick={() => { if (confirm('Angebot akzeptieren? Danach können keine Änderungen mehr vorgenommen werden.')) doAccept.mutate() }}
                className="btn bg-green-600 text-white hover:bg-green-700" disabled={angebot.positions.length === 0}>
                <CheckCircle size={16} /> Akzeptieren
              </button>
              <button onClick={() => { if (confirm('Angebot löschen?')) doDelete.mutate() }} className="btn-danger">
                <Trash2 size={16} /> Löschen
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="card p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gesamtbetrag netto</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(angebot.total_netto)}</p>
        <p className="text-xs text-gray-400">{angebot.positions.length} Positionen</p>
      </div>

      {/* Groups + Positions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Positionen</h2>
          {!locked && (
            <div className="flex gap-2">
              <button onClick={() => setGroupModal({ open: true, name: '' })} className="btn-secondary text-xs">
                <Plus size={14} /> Gruppe
              </button>
              <button onClick={() => openAddPosition()} className="btn-primary text-xs">
                <Plus size={14} /> Position
              </button>
            </div>
          )}
        </div>

        {/* Render groups */}
        {angebot.groups.map(g => {
          const groupPositions = angebot.positions.filter(p => p.group_id === g.id)
          return (
            <div key={g.id} className="card overflow-hidden">
              <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">{g.name}</span>
                {!locked && (
                  <div className="flex gap-2">
                    <button onClick={() => openAddPosition(g.id)} className="text-gray-400 hover:text-blue-600" title="Position hinzufügen">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => setGroupModal({ open: true, name: g.name, editId: g.id })} className="text-gray-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { if (confirm('Gruppe löschen?')) removeGroup.mutate(g.id) }} className="text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {groupPositions.length > 0 ? (
                <PositionTable positions={groupPositions} locked={locked}
                  onEdit={(p) => setPosModal({ open: true, data: { ...p }, editId: p.id })}
                  onDelete={(pId) => removePos.mutate(pId)} />
              ) : (
                <p className="p-4 text-center text-xs text-gray-400">Keine Positionen in dieser Gruppe</p>
              )}
            </div>
          )
        })}

        {/* Ungrouped positions */}
        {ungrouped.length > 0 && (
          <div className="card overflow-hidden">
            {angebot.groups.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">Ohne Gruppe</span>
              </div>
            )}
            <PositionTable positions={ungrouped} locked={locked}
              onEdit={(p) => setPosModal({ open: true, data: { ...p }, editId: p.id })}
              onDelete={(pId) => removePos.mutate(pId)} />
          </div>
        )}

        {angebot.positions.length === 0 && angebot.groups.length === 0 && (
          <div className="card p-8 text-center text-gray-400">
            Noch keine Positionen. Fügen Sie Produkte aus dem Katalog hinzu.
          </div>
        )}
      </div>

      {/* Rechnungen section (only for accepted Angebote) */}
      {locked && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Rechnungen</h2>
            <div className="flex gap-2">
              {!hasAbschlag && (
                <button onClick={() => setRechnungModal({ open: true, type: 'ABSCHLAG', pct: '50', date: new Date().toISOString().slice(0, 10) })}
                  className="btn-secondary text-xs">
                  <FileText size={14} /> Abschlagsrechnung
                </button>
              )}
              {!hasSchluss && (
                <button onClick={() => setRechnungModal({ open: true, type: 'SCHLUSS', pct: '', date: new Date().toISOString().slice(0, 10) })}
                  className="btn-primary text-xs">
                  <FileText size={14} /> Schlussrechnung
                </button>
              )}
            </div>
          </div>
          {angebot.rechnungen?.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Nr.</th>
                    <th className="th">Typ</th>
                    <th className="th">Datum</th>
                    <th className="th text-right">Betrag (netto)</th>
                    <th className="th text-center">Status</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(angebot.rechnungen ?? []).map((r) => (
                    <tr key={r.id}>
                      <td className="td font-mono text-xs font-bold">{r.rechnung_number}</td>
                      <td className="td">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.rechnung_type === 'ABSCHLAG' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {r.rechnung_type === 'ABSCHLAG' ? `Abschlag (${r.abschlag_pct}%)` : 'Schlussrechnung'}
                        </span>
                      </td>
                      <td className="td text-gray-500">{formatDate(r.rechnung_date)}</td>
                      <td className="td text-right font-medium">{formatCurrency(r.total_netto)}</td>
                      <td className="td text-center">
                        {r.customer_payment_date
                          ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Bezahlt</span>
                          : <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Offen</span>
                        }
                      </td>
                      <td className="td">
                        <button onClick={() => setPaymentModal({
                          open: true, rechnungId: r.id,
                          amount: r.customer_payment_amount?.toString() ?? '',
                          date: r.customer_payment_date ?? '',
                        })} className="text-gray-400 hover:text-blue-600">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-6 text-center text-gray-400 text-sm">
              Noch keine Rechnungen erstellt.
            </div>
          )}
        </div>
      )}

      {/* Group Modal */}
      {groupModal.open && (
        <Modal title={groupModal.editId ? 'Gruppe bearbeiten' : 'Gruppe hinzufügen'} onClose={() => setGroupModal({ open: false, name: '' })}>
          <div className="space-y-4">
            <div>
              <label className="label">Gruppenname *</label>
              <input className="input" placeholder="z.B. BÜRO 1 Aufstellung"
                value={groupModal.name}
                onChange={(e) => setGroupModal(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setGroupModal({ open: false, name: '' })}>Abbrechen</button>
              <button className="btn-primary" disabled={!groupModal.name || saveGroup.isPending}
                onClick={() => saveGroup.mutate()}>Speichern</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Position Modal */}
      {posModal.open && (
        <Modal title={posModal.editId ? 'Position bearbeiten' : 'Position hinzufügen'} size="xl" onClose={() => setPosModal({ open: false, data: {} })}>
          <div className="space-y-4">
            {/* Product picker (only for new positions) */}
            {!posModal.editId && (
              <div>
                <label className="label">Produkt auswählen *</label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-8 text-sm" placeholder="Suchen..."
                    value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                </div>
                {posModal.data.product_id ? (
                  <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm flex items-center justify-between">
                    <span className="font-medium text-green-800">
                      {(products ?? []).find(p => p.id === posModal.data.product_id)?.name}
                    </span>
                    <button onClick={() => setPosModal(prev => ({ ...prev, data: { ...prev.data, product_id: undefined, einzelpreis: undefined, description_override: undefined } }))}
                      className="text-green-600 hover:text-red-600 text-xs">Ändern</button>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded border border-gray-200 divide-y divide-gray-100">
                    {filteredProducts.slice(0, 20).map(p => (
                      <button key={p.id} onClick={() => selectProduct(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-gray-400">{formatCurrency(p.listenpreis)}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className="px-3 py-4 text-center text-xs text-gray-400">Keine Produkte gefunden</p>}
                  </div>
                )}
              </div>
            )}

            {/* Group selection */}
            <div>
              <label className="label">Gruppe</label>
              <select className="input" value={posModal.data.group_id ?? ''}
                onChange={(e) => setPosModal(prev => ({ ...prev, data: { ...prev.data, group_id: e.target.value || undefined } }))}>
                <option value="">Keine Gruppe</option>
                {angebot.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Menge</label>
                <input type="number" step="0.01" className="input"
                  value={posModal.data.menge ?? ''}
                  onChange={(e) => setPosModal(prev => ({ ...prev, data: { ...prev.data, menge: e.target.value === '' ? undefined : parseFloat(e.target.value) } }))} />
              </div>
              <div>
                <label className="label">Einzelpreis (netto)</label>
                <input type="number" step="0.01" className="input"
                  value={posModal.data.einzelpreis ?? ''}
                  onChange={(e) => setPosModal(prev => ({ ...prev, data: { ...prev.data, einzelpreis: e.target.value === '' ? undefined : parseFloat(e.target.value) } }))} />
              </div>
              <div>
                <label className="label">Rabatt (%)</label>
                <input type="number" step="0.01" className="input"
                  value={posModal.data.rabatt_pct ?? ''}
                  onChange={(e) => setPosModal(prev => ({ ...prev, data: { ...prev.data, rabatt_pct: e.target.value === '' ? undefined : parseFloat(e.target.value) } }))} />
              </div>
            </div>

            {/* Computed preview */}
            {posModal.data.menge && posModal.data.einzelpreis != null && (
              <div className="rounded bg-gray-50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Gesamtpreis:</span><span>{formatCurrency((posModal.data.menge ?? 0) * (posModal.data.einzelpreis ?? 0))}</span></div>
                {(posModal.data.rabatt_pct ?? 0) > 0 && (
                  <div className="flex justify-between text-red-600"><span>Rabatt ({posModal.data.rabatt_pct}%):</span><span>-{formatCurrency((posModal.data.menge ?? 0) * (posModal.data.einzelpreis ?? 0) * (posModal.data.rabatt_pct ?? 0) / 100)}</span></div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1"><span>Netto:</span><span>{formatCurrency((posModal.data.menge ?? 0) * (posModal.data.einzelpreis ?? 0) * (1 - (posModal.data.rabatt_pct ?? 0) / 100))}</span></div>
              </div>
            )}

            <div>
              <label className="label">Beschreibung (Freitext, optional überschreiben)</label>
              <textarea className="input min-h-[80px]" rows={4}
                value={posModal.data.description_override ?? ''}
                onChange={(e) => setPosModal(prev => ({ ...prev, data: { ...prev.data, description_override: e.target.value || undefined } }))} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setPosModal({ open: false, data: {} })}>Abbrechen</button>
              <button className="btn-primary" disabled={!posModal.data.product_id || savePos.isPending}
                onClick={() => savePos.mutate()}>Speichern</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rechnung create modal */}
      {rechnungModal.open && (
        <Modal title={rechnungModal.type === 'ABSCHLAG' ? 'Abschlagsrechnung erstellen' : 'Schlussrechnung erstellen'}
          onClose={() => setRechnungModal({ open: false, type: 'ABSCHLAG', pct: '50', date: '' })}>
          <div className="space-y-4">
            <div>
              <label className="label">Rechnungsdatum</label>
              <input type="date" className="input" value={rechnungModal.date}
                onChange={(e) => setRechnungModal(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            {rechnungModal.type === 'ABSCHLAG' && (
              <div>
                <label className="label">Abschlag (%)</label>
                <input type="number" step="0.01" className="input" value={rechnungModal.pct}
                  onChange={(e) => setRechnungModal(prev => ({ ...prev, pct: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">
                  = {formatCurrency(angebot.total_netto * (parseFloat(rechnungModal.pct) || 0) / 100)} netto
                </p>
              </div>
            )}
            {rechnungModal.type === 'SCHLUSS' && (
              <div className="rounded bg-gray-50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Angebot gesamt:</span><span>{formatCurrency(angebot.total_netto)}</span></div>
                {angebot.rechnungen?.filter((r) => r.rechnung_type === 'ABSCHLAG').map((r) => (
                  <div key={r.id} className="flex justify-between text-orange-600"><span>- Abschlag {r.rechnung_number}:</span><span>-{formatCurrency(r.total_netto)}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
                  <span>Restbetrag:</span>
                  <span>{formatCurrency(angebot.total_netto - (angebot.rechnungen ?? []).filter((r) => r.rechnung_type === 'ABSCHLAG').reduce((s, r) => s + r.total_netto, 0))}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setRechnungModal({ open: false, type: 'ABSCHLAG', pct: '50', date: '' })}>Abbrechen</button>
              <button className="btn-primary" disabled={doCreateRechnung.isPending}
                onClick={() => doCreateRechnung.mutate()}>Erstellen</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment modal */}
      {paymentModal.open && (
        <Modal title="Zahlung eintragen" onClose={() => setPaymentModal({ open: false, rechnungId: '', amount: '', date: '' })}>
          <div className="space-y-4">
            <div>
              <label className="label">Bezahlter Betrag</label>
              <input type="number" step="0.01" className="input" value={paymentModal.amount}
                onChange={(e) => setPaymentModal(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Bezahlt am</label>
              <input type="date" className="input" value={paymentModal.date}
                onChange={(e) => setPaymentModal(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setPaymentModal({ open: false, rechnungId: '', amount: '', date: '' })}>Abbrechen</button>
              <button className="btn-primary" disabled={doUpdatePayment.isPending}
                onClick={() => doUpdatePayment.mutate()}>Speichern</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Position table component
function PositionTable({
  positions, locked, onEdit, onDelete,
}: {
  positions: AngebotPosition[]
  locked: boolean
  onEdit: (p: AngebotPosition) => void
  onDelete: (id: string) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 border-b border-gray-100">
          <th className="th py-1.5">Pos.</th>
          <th className="th py-1.5">Beschreibung</th>
          <th className="th py-1.5 text-right">Menge</th>
          <th className="th py-1.5 text-right">Einzelpreis</th>
          <th className="th py-1.5 text-right">Gesamtpreis</th>
          <th className="th py-1.5 text-right">Rabatt</th>
          <th className="th py-1.5 text-right">Netto</th>
          {!locked && <th className="th py-1.5" />}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {positions.map(p => (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="td py-1.5 font-mono text-xs text-gray-400">{p.position_number}.</td>
            <td className="td py-1.5">
              <div className="font-medium">{p.product.name}</div>
              {p.description_override && (
                <div className="text-xs text-gray-400 whitespace-pre-line line-clamp-2 mt-0.5">{p.description_override}</div>
              )}
            </td>
            <td className="td py-1.5 text-right">{p.menge} {p.product.einheit}</td>
            <td className="td py-1.5 text-right">{formatCurrency(p.einzelpreis)}</td>
            <td className="td py-1.5 text-right">{formatCurrency(p.gesamtpreis)}</td>
            <td className="td py-1.5 text-right text-xs">
              {p.rabatt_pct > 0 ? (
                <span className="text-red-600">-{p.rabatt_pct}%<br/>({formatCurrency(p.rabatt_amount)})</span>
              ) : '–'}
            </td>
            <td className="td py-1.5 text-right font-medium">{formatCurrency(p.netto_amount)}</td>
            {!locked && (
              <td className="td py-1.5">
                <div className="flex justify-end gap-2">
                  <button onClick={() => onEdit(p)} className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm('Position löschen?')) onDelete(p.id) }} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
