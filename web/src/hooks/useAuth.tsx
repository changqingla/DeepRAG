import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/src/services/auth.service";
import { LoginRequest, RegisterRequest, User } from "@/src/types/auth";

// 认证上下文接口
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者属性
interface AuthProviderProps {
  children: ReactNode;
}

// 认证提供者组件
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 清除错误
  const clearError = () => setError(null);

  // 检查初始认证状态
  useEffect(() => {
    const token = AuthService.getToken();
    if (token) {
      // 如果有token，创建一个基本用户对象
      // 在实际应用中，这里可以调用获取用户信息的API
      setUser({
        id: 'user-id', // 这里应该是实际的用户ID
        email: 'user@example.com', // 这里应该是实际的用户邮箱
        nickname: '用户', // 这里应该是实际的用户昵称
        token
      });
    }
    setLoading(false);
  }, []);

  // 登录方法
  const login = async (credentials: LoginRequest): Promise<boolean> => {
    setLoading(true);
    clearError();
    
    try {
      const response = await AuthService.login(credentials);
      
      if (response.code === 0 && response.data?.jwt_token) {
        const token = response.data.jwt_token;
        AuthService.saveToken(token);
        
        // 设置用户信息（实际应用中应从API获取完整用户信息）
        setUser({
          id: 'user-id', // 从API获取
          email: credentials.email,
          nickname: '用户', // 从API获取
          token
        });
        
        return true;
      } else {
        setError(response.message || '登录失败，请检查您的凭据');
        return false;
      }
    } catch (err) {
      setError(`登录过程中发生错误: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 注册方法
  const register = async (userData: RegisterRequest): Promise<boolean> => {
    setLoading(true);
    clearError();
    
    try {
      const response = await AuthService.register(userData);
      
      if (response.code === 0 && response.data?.access_token) {
        // 注册成功，但不自动登录用户
        // 用户需要登录来获取JWT令牌
        return true;
      } else {
        setError(response.message || '注册失败，请稍后再试');
        return false;
      }
    } catch (err) {
      setError(`注册过程中发生错误: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出方法
  const logout = () => {
    AuthService.logout();
    setUser(null);
    router.push('/login');
  };

  // 提供认证上下文
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error, 
        login, 
        register, 
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证的钩子
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 