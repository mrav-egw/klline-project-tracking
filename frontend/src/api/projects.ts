import client from './client'
import type { Project, SalesInvoice, PurchaseOrder } from '../types'

export const getProjects = async (): Promise<Project[]> => (await client.get('/projects/')).data
export const getProject = async (id: string): Promise<Project> => (await client.get(`/projects/${id}`)).data
export const createProject = async (body: { name: string; customer_id: string }): Promise<Project> =>
  (await client.post('/projects/', body)).data
export const updateProject = async (id: string, body: Partial<Project>): Promise<Project> =>
  (await client.put(`/projects/${id}`, body)).data
export const deleteProject = async (id: string): Promise<void> => client.delete(`/projects/${id}`)

// Sales invoices
export const addSalesInvoice = async (projectId: string, body: Partial<SalesInvoice>): Promise<SalesInvoice> =>
  (await client.post(`/projects/${projectId}/sales-invoices`, body)).data
export const updateSalesInvoice = async (
  projectId: string, siId: string, body: Partial<SalesInvoice>
): Promise<SalesInvoice> => (await client.put(`/projects/${projectId}/sales-invoices/${siId}`, body)).data
export const deleteSalesInvoice = async (projectId: string, siId: string): Promise<void> =>
  client.delete(`/projects/${projectId}/sales-invoices/${siId}`)

// Purchase orders
export const addPurchaseOrder = async (projectId: string, body: Partial<PurchaseOrder>): Promise<PurchaseOrder> =>
  (await client.post(`/projects/${projectId}/purchase-orders`, body)).data
export const updatePurchaseOrder = async (
  projectId: string, poId: string, body: Partial<PurchaseOrder>
): Promise<PurchaseOrder> => (await client.put(`/projects/${projectId}/purchase-orders/${poId}`, body)).data
export const deletePurchaseOrder = async (projectId: string, poId: string): Promise<void> =>
  client.delete(`/projects/${projectId}/purchase-orders/${poId}`)
