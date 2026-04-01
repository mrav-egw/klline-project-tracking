import client from './client'
import type { Product } from '../types'

export const getProducts = async (): Promise<Product[]> => (await client.get('/products/')).data
export const createProduct = async (body: Partial<Product>): Promise<Product> =>
  (await client.post('/products/', body)).data
export const updateProduct = async (id: string, body: Partial<Product>): Promise<Product> =>
  (await client.put(`/products/${id}`, body)).data
export const deleteProduct = async (id: string): Promise<void> => client.delete(`/products/${id}`)
