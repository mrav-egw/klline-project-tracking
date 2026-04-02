import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Upload, X } from 'lucide-react'
import { getCompanySettings, updateCompanySettings } from '../api/companySettings'
import { LoadingSpinner } from '../components/LoadingSpinner'
import type { CompanySettings } from '../types'

export function EinstellungenPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Partial<CompanySettings>>({})
  const [dirty, setDirty] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
  })

  useEffect(() => {
    if (data && !loaded) {
      setForm(data)
      setLoaded(true)
    }
  }, [data, loaded])

  const save = useMutation({
    mutationFn: () => updateCompanySettings(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-settings'] }); setDirty(false) },
  })

  const set = (field: keyof CompanySettings, value: string | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      set('logo_base64', base64)
    }
    reader.readAsDataURL(file)
  }

  if (isLoading) return <LoadingSpinner className="py-24" />

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Firmeneinstellungen</h1>
        <button onClick={() => save.mutate()} disabled={!dirty || save.isPending}
          className={`btn-primary ${!dirty ? 'opacity-50' : ''}`}>
          <Save size={16} /> {save.isPending ? 'Speichere...' : 'Speichern'}
        </button>
      </div>

      {/* Logo */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Logo</h2>
        <div className="flex items-center gap-4">
          {form.logo_base64 ? (
            <div className="relative">
              <img src={`data:image/png;base64,${form.logo_base64}`} alt="Logo" className="h-16 max-w-[200px] object-contain border rounded p-1" />
              <button onClick={() => set('logo_base64', undefined)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
            </div>
          ) : (
            <div className="h-16 w-40 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">Kein Logo</div>
          )}
          <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs"><Upload size={14} /> Logo hochladen</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </div>

      {/* Company info */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Firmendaten</h2>
        <div className="grid grid-cols-2 gap-4">
          {([
            ['company_name', 'Firmenname'],
            ['address', 'Adresse'],
            ['postal_code', 'PLZ'],
            ['city', 'Ort'],
            ['country', 'Land'],
            ['phone', 'Telefon'],
            ['email', 'E-Mail'],
            ['web', 'Website'],
          ] as [keyof CompanySettings, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input className="input" value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value || undefined)} />
            </div>
          ))}
        </div>
      </div>

      {/* Legal */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Rechtliche Angaben</h2>
        <div className="grid grid-cols-2 gap-4">
          {([
            ['fn_nr', 'Firmenbuchnummer (FN)'],
            ['ust_id', 'USt-ID'],
            ['amtsgericht', 'Amtsgericht / Firmenbuchgericht'],
            ['geschaeftsfuehrung', 'Geschäftsführung'],
          ] as [keyof CompanySettings, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input className="input" value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value || undefined)} />
            </div>
          ))}
        </div>
      </div>

      {/* Bank */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Bankverbindung</h2>
        <div className="grid grid-cols-2 gap-4">
          {([
            ['bank_name', 'Bank'],
            ['iban', 'IBAN'],
            ['bic', 'BIC'],
          ] as [keyof CompanySettings, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input className="input" value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value || undefined)} />
            </div>
          ))}
        </div>
      </div>

      {/* Defaults */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Standardtexte</h2>
        <div>
          <label className="label">Begrüßung</label>
          <textarea className="input min-h-[80px]" rows={3}
            placeholder="Sehr geehrte Damen und Herren,&#10;vielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!&#10;Hiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:"
            value={form.default_greeting ?? ''} onChange={(e) => set('default_greeting', e.target.value || undefined)} />
        </div>
        <div>
          <label className="label">Zahlungsbedingungen</label>
          <textarea className="input min-h-[60px]" rows={2}
            placeholder="Zahlung innerhalb von 8 Tagen ab Rechnungseingang ohne Abzüge."
            value={form.default_payment_terms ?? ''} onChange={(e) => set('default_payment_terms', e.target.value || undefined)} />
        </div>
      </div>
    </div>
  )
}
