/**
 * 用户注册请求参数
 */
export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

/**
 * 用户登录请求参数
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  jwt_token: string;
}

/**
 * 注册响应中的用户数据
 */
export interface UserData {
  id: string;
  access_token: string;
  email: string;
  nickname: string;
  avatar: string | null;
  create_date: string;
  update_date: string;
  is_active: string;
  is_authenticated: string;
  status: string;
  [key: string]: any; // 其他可能的字段
}

/**
 * 注册响应数据
 */
export interface RegisterResponse {
  access_token: string;
  [key: string]: any; // 其他字段
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string | null;
  token: string;
} 