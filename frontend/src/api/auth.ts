import { apiClient } from './client';
import type { AuthMeResponse, LoginResponse } from './types';

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function getCurrentUser(): Promise<AuthMeResponse> {
  const { data } = await apiClient.get<AuthMeResponse>('/auth/me');
  return data;
}
