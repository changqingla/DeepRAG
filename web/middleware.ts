import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 中间件：处理身份验证和路由保护
 */
export function middleware(request: NextRequest) {
  // 获取当前路径
  const path = request.nextUrl.pathname
  
  // 定义公共路径（不需要身份验证）
  const isPublicPath = path === '/login' || path === '/register'
  
  // 从cookie获取认证令牌
  // 这里不需要await，因为在middleware中cookies直接可用
  const token = request.cookies.get('auth_token')?.value
  
  // 如果用户访问公共路径但已登录，重定向到仪表盘
  // 但如果是从注册页面重定向到登录页面，则允许访问
  if (isPublicPath && token && !request.nextUrl.search.includes('registered=true')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // 如果用户访问受保护路径但未登录，重定向到登录页
  if (!isPublicPath && !token && path !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 默认放行请求
  return NextResponse.next()
}

/**
 * 配置中间件应用的路径
 */
export const config = {
  // 匹配这些路径
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
} 