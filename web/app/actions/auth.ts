"use server"

import { env } from '@/src/config/env'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  // 从表单中获取登录凭据
  const email = formData.get("email")
  const password = formData.get("password")

  try {
    // 调用登录API
    const response = await fetch(`${env.apiBaseUrl}/v1/user/login/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    // 检查登录是否成功
    if (data.code === 0 && data.data?.jwt_token && data.data?.api_key) {
      // 将令牌存储在Cookie中（仅服务器端可访问，更安全）
      const cookieStore = await cookies()
      cookieStore.set({
        name: 'auth_token',
        value: data.data.jwt_token,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7天
      })
      // 存储 API Key（非 httpOnly，因为需要被 Server Action 读取）
      cookieStore.set({
        name: 'ragflow_api_key',
        value: data.data.api_key,
        secure: process.env.NODE_ENV === 'production',
      })
      return { success: true }
    } else {
      console.error("登录失败:", data.message)
      return { success: false, message: data.message || "登录失败，请检查您的凭据" }
    }
  } catch (error) {
    console.error("登录过程中发生错误:", error)
    return { success: false, message: "服务器错误，请稍后再试" }
  }
}

export async function register(formData: FormData) {
  // 从表单中获取注册数据
  const username = formData.get("username")
  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")

  // 验证密码匹配
  if (password !== confirmPassword) {
    return { success: false, message: "密码不匹配" }
  }

  try {
    // 调用注册API
    const response = await fetch(`${env.apiBaseUrl}/v1/user/register/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        nickname: username,
      }),
    })

    const data = await response.json()

    console.log("注册API响应:", JSON.stringify(data))

    // 检查注册是否成功 - 后端API只要code===0就表示成功
    if (data.code === 0) {
      // 注册成功后，获取 API Key
      try {
        const apiKeyResponse = await fetch(`${env.apiKeyGeneratorUrl}/generate_api_key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BASE_URL: env.apiServiceBaseUrl,
            EMAIL: email,
            PASSWORD: password,
          }),
        })
        
        const apiKeyText = await apiKeyResponse.text();
        console.log("API Key Response:", apiKeyText);
        
        let apiKeyData;
        try {
          apiKeyData = JSON.parse(apiKeyText);
          
          if (apiKeyData.code === 0 && apiKeyData.api_key) {
            // 存储 API Key 到 Cookie
            const cookieStore = await cookies();
            cookieStore.set({
              name: 'ragflow_api_key',
              value: apiKeyData.api_key,
              path: '/',
              secure: process.env.NODE_ENV === 'production',
            });
            
            return { 
              success: true,
              userId: data.data?.id,
              apiKey: apiKeyData.api_key,
              message: "注册成功",
              shouldRedirect: true // 添加标记，表示前端应该重定向到登录页面
            };
          }
        } catch (jsonErr) {
          console.error("API Key返回内容不是合法JSON:", apiKeyText);
        }
      } catch (apiKeyError) {
        console.error("注册成功但在获取 API Key 过程中发生错误:", apiKeyError);
      }
      
      // 如果获取API Key失败，仍然返回注册成功
      return { 
        success: true,
        userId: data.data?.id,
        message: "注册成功",
        shouldRedirect: true
      };
    } else {
      console.error("注册失败:", data.message)
      return { success: false, message: data.message || "注册失败，请稍后再试" }
    }
  } catch (error) {
    console.error("注册过程中发生错误:", error)
    return { success: false, message: "服务器错误，请稍后再试" }
  }
}

export async function logout() {
  // 清除Cookie中的令牌
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  cookieStore.delete('ragflow_api_key')
  return { success: true }
}

export async function changePassword(formData: FormData) {
  // 获取当前密码和新密码
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  
  try {
    // 这里应该调用修改密码的API
    // 例如：
    const response = await fetch(`${env.apiBaseUrl}/v1/user/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}` // 获取认证令牌
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    })
    
    const data = await response.json()
    
    if (data.code === 0) {
      return { success: true }
    } else {
      return { 
        success: false, 
        message: data.message || "密码修改失败，请检查当前密码是否正确"
      }
    }
  } catch (error) {
    console.error("修改密码过程中发生错误:", error)
    return { success: false, message: "服务器错误，请稍后再试" }
  }
}

// 辅助函数：获取认证令牌
async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get('auth_token')?.value
}
