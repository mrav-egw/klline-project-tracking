import client from './client'
import type { InstallationPartner } from '../types'

export const getInstallers = async (): Promise<InstallationPartner[]> => (await client.get('/installers/')).data
export const createInstaller = async (body: Partial<InstallationPartner>): Promise<InstallationPartner> =>
  (await client.post('/installers/', body)).data
export const updateInstaller = async (id: string, body: Partial<InstallationPartner>): Promise<InstallationPartner> =>
  (await client.put(`/installers/${id}`, body)).data
export const deleteInstaller = async (id: string): Promise<void> => client.delete(`/installers/${id}`)
