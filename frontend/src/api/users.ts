import client from './client'
import type { User } from '../types'

export interface UserCreate { username: string; password: string; full_name: string }
export interface UserUpdate { username?: string; full_name?: string; password?: string; is_active?: boolean }

export const getUsers = async (): Promise<User[]> => (await client.get('/users/')).data
export const createUser = async (body: UserCreate): Promise<User> => (await client.post('/users/', body)).data
export const updateUser = async (id: string, body: UserUpdate): Promise<User> =>
  (await client.put(`/users/${id}`, body)).data
export const deleteUser = async (id: string): Promise<void> => client.delete(`/users/${id}`)
