import { apiRequest } from "./queryClient";
import type { User, LoginData, RegisterData } from "@shared/schema";

export interface AuthResponse {
  token: string;
  user: Pick<User, 'id' | 'username' | 'email' | 'role'>;
}

export class AuthService {
  private static TOKEN_KEY = 'auth_token';
  
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
  
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
  
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
  
  static async login(credentials: LoginData): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    const data = await response.json();
    
    this.setToken(data.token);
    return data;
  }
  
  static async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    const data = await response.json();
    
    this.setToken(data.token);
    return data;
  }
  
  static async getCurrentUser(): Promise<User> {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get current user');
    }
    
    return response.json();
  }
  
  static logout(): void {
    this.removeToken();
    window.location.href = '/login';
  }
}

// Add token to all API requests
const originalApiRequest = apiRequest;
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const token = AuthService.getToken();
  
  const headers: Record<string, string> = {};
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  
  return res;
}
