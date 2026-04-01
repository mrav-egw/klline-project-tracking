import client from './client'
import type { Angebot, AngebotListItem, AngebotPosition, Rechnung } from '../types'

const base = (projectId: string) => `/projects/${projectId}/angebote`

// Angebote
export const getAngebote = async (projectId: string): Promise<AngebotListItem[]> =>
  (await client.get(`${base(projectId)}/`)).data

export const getAngebot = async (projectId: string, angebotId: string): Promise<Angebot> =>
  (await client.get(`${base(projectId)}/${angebotId}`)).data

export const createAngebot = async (projectId: string, body: { angebot_date?: string }): Promise<Angebot> =>
  (await client.post(`${base(projectId)}/`, body)).data

export const updateAngebot = async (projectId: string, angebotId: string, body: { angebot_date?: string }): Promise<Angebot> =>
  (await client.put(`${base(projectId)}/${angebotId}`, body)).data

export const deleteAngebot = async (projectId: string, angebotId: string): Promise<void> =>
  client.delete(`${base(projectId)}/${angebotId}`)

export const acceptAngebot = async (projectId: string, angebotId: string): Promise<Angebot> =>
  (await client.post(`${base(projectId)}/${angebotId}/accept`)).data

// Groups
export const addGroup = async (projectId: string, angebotId: string, body: { name: string; sort_order?: number }): Promise<AngebotPositionGroup> =>
  (await client.post(`${base(projectId)}/${angebotId}/groups`, body)).data

export const updateGroup = async (projectId: string, angebotId: string, groupId: string, body: Partial<AngebotPositionGroup>): Promise<AngebotPositionGroup> =>
  (await client.put(`${base(projectId)}/${angebotId}/groups/${groupId}`, body)).data

export const deleteGroup = async (projectId: string, angebotId: string, groupId: string): Promise<void> =>
  client.delete(`${base(projectId)}/${angebotId}/groups/${groupId}`)

// Positions
export const addPosition = async (projectId: string, angebotId: string, body: Partial<AngebotPosition>): Promise<AngebotPosition> =>
  (await client.post(`${base(projectId)}/${angebotId}/positions`, body)).data

export const updatePosition = async (projectId: string, angebotId: string, positionId: string, body: Partial<AngebotPosition>): Promise<AngebotPosition> =>
  (await client.put(`${base(projectId)}/${angebotId}/positions/${positionId}`, body)).data

export const deletePosition = async (projectId: string, angebotId: string, positionId: string): Promise<void> =>
  client.delete(`${base(projectId)}/${angebotId}/positions/${positionId}`)

// Rechnungen
export const getRechnungen = async (projectId: string, angebotId: string): Promise<Rechnung[]> =>
  (await client.get(`${base(projectId)}/${angebotId}/rechnungen`)).data

export const createRechnung = async (projectId: string, angebotId: string, body: { rechnung_type: string; rechnung_date?: string; abschlag_pct?: number }): Promise<Rechnung> =>
  (await client.post(`${base(projectId)}/${angebotId}/rechnungen`, body)).data

export const updateRechnungPayment = async (projectId: string, angebotId: string, rechnungId: string, body: { customer_payment_date?: string }): Promise<Rechnung> =>
  (await client.put(`${base(projectId)}/${angebotId}/rechnungen/${rechnungId}`, body)).data

// PDF downloads
const downloadBlob = (data: Blob, filename: string) => {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const downloadAngebotPdf = async (projectId: string, angebotId: string, angebotNumber: string) => {
  const resp = await client.get(`${base(projectId)}/${angebotId}/pdf`, { responseType: 'blob' })
  downloadBlob(resp.data, `Angebot_${angebotNumber}.pdf`)
}

export const downloadRechnungPdf = async (projectId: string, angebotId: string, rechnungId: string, rechnungNumber: string) => {
  const resp = await client.get(`${base(projectId)}/${angebotId}/rechnungen/${rechnungId}/pdf`, { responseType: 'blob' })
  downloadBlob(resp.data, `Rechnung_${rechnungNumber}.pdf`)
}
