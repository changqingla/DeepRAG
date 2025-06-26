import { cookies } from 'next/headers';

/**
 * 从Cookie中获取RAGFlow API Key
 * @returns 用户的API Key或null（如果未登录）
 */
export async function getRagFlowApiKey(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ragflow_api_key')?.value || null;
}

/**
 * 从Cookie中获取认证令牌
 * @returns 认证令牌或undefined（如果未登录）
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
} 