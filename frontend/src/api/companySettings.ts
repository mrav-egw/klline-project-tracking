import client from './client'
import type { CompanySettings } from '../types'

export const getCompanySettings = async (): Promise<CompanySettings> =>
  (await client.get('/company-settings/')).data

export const updateCompanySettings = async (body: Partial<CompanySettings>): Promise<CompanySettings> =>
  (await client.put('/company-settings/', body)).data
