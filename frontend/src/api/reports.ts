import client from './client'
import type { DashboardSummary, VertriebsberichtReport } from '../types'

export const getSummary = async (): Promise<DashboardSummary> => (await client.get('/reports/summary')).data
export const getVertriebsbericht = async (
  year: number, month?: number
): Promise<VertriebsberichtReport> => {
  const params: Record<string, unknown> = { year }
  if (month != null) params.month = month
  return (await client.get('/reports/vertriebsbericht', { params })).data
}
