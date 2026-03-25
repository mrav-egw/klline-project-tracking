import client from './client'
import type { User } from '../types'

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  const params = new URLSearchParams({ username: email, password })
  const { data } = await client.post('/auth/login', params)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await client.get('/auth/me')
  return data
}
