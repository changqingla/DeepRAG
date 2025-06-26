import { cookies } from 'next/headers';
import { User } from '@/src/types/auth';

/**
 * 会话工具类
 * 注意：这个类仅能在服务器端组件中使用
 */
export class Session {
  /**
   * 获取当前认证令牌
   */
  static async getAuthToken(): Promise<string | undefined> {
    try {
      const cookieStore = await cookies();
      return cookieStore.get('auth_token')?.value;
    } catch (error) {
      console.error('获取认证令牌失败:', error);
      return undefined;
    }
  }

  /**
   * 检查用户是否已登录
   */
  static async isLoggedIn(): Promise<boolean> {
    return !!(await this.getAuthToken());
  }

  /**
   * 获取当前用户信息
   * 注意：这是一个模拟实现，实际应用中应从API获取完整用户信息
   */
  static async getCurrentUser(): Promise<User | null> {
    const token = await this.getAuthToken();
    
    if (!token) {
      return null;
    }
    
    // 实际应用中，应该调用API获取用户信息
    // 这里仅创建一个基本用户对象
    return {
      id: 'user-id',
      email: 'user@example.com',
      nickname: '用户',
      token
    };
  }
} 