export const formatCurrency = (v: number | null | undefined): string => {
  if (v == null) return '–'
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(v)
}

export const formatDate = (d: string | null | undefined): string => {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('de-AT')
}

export const formatPct = (v: number | null | undefined): string => {
  if (v == null) return '–'
  return `${v}%`
}
