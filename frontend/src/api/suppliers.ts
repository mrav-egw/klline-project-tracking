import client from './client'
import type { Supplier } from '../types'

export const getSuppliers = async (): Promise<Supplier[]> => (await client.get('/suppliers/')).data
export const createSupplier = async (body: Partial<Supplier>): Promise<Supplier> =>
  (await client.post('/suppliers/', body)).data
export const updateSupplier = async (id: string, body: Partial<Supplier>): Promise<Supplier> =>
  (await client.put(`/suppliers/${id}`, body)).data
export const deleteSupplier = async (id: string): Promise<void> => client.delete(`/suppliers/${id}`)
