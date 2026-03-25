import client from './client'
import type { CostEntry } from '../types'

export const getCostEntries = async (): Promise<CostEntry[]> => (await client.get('/cost-entries/')).data
export const createCostEntry = async (body: Partial<CostEntry>): Promise<CostEntry> =>
  (await client.post('/cost-entries/', body)).data
export const updateCostEntry = async (id: string, body: Partial<CostEntry>): Promise<CostEntry> =>
  (await client.put(`/cost-entries/${id}`, body)).data
export const deleteCostEntry = async (id: string): Promise<void> => client.delete(`/cost-entries/${id}`)
