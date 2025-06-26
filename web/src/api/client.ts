import { env } from '@/src/config/env';

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message: string;
}

/**
 * API请求选项
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  token?: string;
  data?: any; // 用于DELETE请求中的请求体
}

/**
 * API客户端
 */
class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * 发送GET请求
   */
  async get<T = any>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, null, options);
  }
  
  /**
   * 发送POST请求
   */
  async post<T = any>(path: string, data: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }
  
  /**
   * 发送DELETE请求
   */
  async delete<T = any>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, options.data, options);
  }
  
  /**
   * 发送表单数据的POST请求
   */
  async postFormData<T = any>(path: string, formData: FormData, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...options.headers,
    };
    
    // 添加认证token（如果有）
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    
    const config: RequestInit = {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData
    };
    
    try {
      const response = await fetch(url, config);
      const result = await response.json();
      
      return result;
    } catch (error) {
      console.error('API请求错误:', error);
      return {
        code: -1,
        message: `请求失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * 发送请求
   */
  private async request<T = any>(
    method: string,
    path: string,
    data: any = null,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // 添加认证token（如果有）
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    
    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };
    
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, config);
      const result = await response.json();
      
      return result;
    } catch (error) {
      console.error('API请求错误:', error);
      return {
        code: -1,
        message: `请求失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(env.apiBaseUrl); 