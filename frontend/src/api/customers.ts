import client from './client'
import type { Customer } from '../types'

export const getCustomers = async (): Promise<Customer[]> => (await client.get('/customers/')).data
export const createCustomer = async (body: Partial<Customer>): Promise<Customer> =>
  (await client.post('/customers/', body)).data
export const updateCustomer = async (id: string, body: Partial<Customer>): Promise<Customer> =>
  (await client.put(`/customers/${id}`, body)).data
export const deleteCustomer = async (id: string): Promise<void> => client.delete(`/customers/${id}`)
