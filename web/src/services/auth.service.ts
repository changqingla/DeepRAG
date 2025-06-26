import { apiClient, ApiResponse } from '@/src/api/client';
import { LoginRequest, LoginResponse, RegisterRequest, UserData } from '@/src/types/auth';

/**
 * 认证服务类
 */
export class AuthService {
  /**
   * 用户登录
   * @param credentials 登录凭据
   * @returns 登录响应
   */
  static async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post<LoginResponse>('/v1/user/login/script', credentials);
  }

  /**
   * 用户注册
   * @param userData 注册数据
   * @returns 注册响应
   */
  static async register(userData: RegisterRequest): Promise<ApiResponse<UserData>> {
    return apiClient.post<UserData>('/v1/user/register/script', userData);
  }

  /**
   * 保存令牌到本地存储
   * @param token JWT令牌
   */
  static saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * 从本地存储获取令牌
   * @returns JWT令牌或null
   */
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * 清除认证信息
   */
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * 检查用户是否已登录
   * @returns 是否已登录
   */
  static isLoggedIn(): boolean {
    return !!this.getToken();
  }
} 