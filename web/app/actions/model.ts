"use server"

import { env } from '@/src/config/env';
import { cookies } from 'next/headers';
import { ModelCategory, ModelFactory, ModelType } from '@/src/types/model';
import { getRagFlowApiKey } from '@/lib/authUtils';

/**
 * 获取认证令牌
 */
async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  // 首先尝试从cookie获取令牌，如果不存在则使用默认令牌
  const token = cookieStore.get('auth_token')?.value;
  if (token) {
    return token;
  }
  
  // 如果cookie中没有令牌，则返回环境变量中的默认令牌
  return env.defaultAuthToken;
}

/**
 * 创建模型接口数据
 */
interface CreateModelData {
  factory: ModelFactory;
  type: ModelType;
  name: string;
  apiBase: string;
  apiKey: string;
  maxTokens: number;
}

/**
 * 添加模型
 */
export async function addModel(formData: FormData) {
  try {
    // 获取表单数据
    const modelFactory = formData.get('factory') as ModelFactory;
    const modelType = formData.get('type') as ModelType;
    const modelName = formData.get('name') as string;
    const apiBase = formData.get('apiBase') as string;
    const apiKey = formData.get('apiKey') as string;
    const maxTokens = parseInt(formData.get('maxTokens') as string) || 4096;

    // 获取用户API Key
    const userApiKey = await getRagFlowApiKey();
    if (!userApiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userApiKey}`
      },
      body: JSON.stringify({
        llm_factory: modelFactory,
        model_type: modelType,
        api_base: apiBase,
        llm_name: modelName,
        api_key: apiKey,
        max_tokens: maxTokens
      })
    });

    console.log("添加模型API响应状态:", response.status);
    const data = await response.json();
    console.log("添加模型API响应:", JSON.stringify(data));

    if (data.code === 0) {
      return { success: true };
    } else {
      console.error("添加模型失败:", data.message);
      return { success: false, message: data.message || "添加模型失败" };
    }
  } catch (error) {
    console.error("添加模型过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 删除模型
 */
export async function deleteModel(formData: FormData) {
  try {
    // 获取表单数据
    const modelFactory = formData.get('factory') as ModelFactory;
    const modelName = formData.get('name') as string;

    // 获取用户API Key
    const userApiKey = await getRagFlowApiKey();
    if (!userApiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/llm/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userApiKey}`
      },
      body: JSON.stringify({
        llm_factory: modelFactory,
        llm_name: modelName
      })
    });

    console.log("删除模型API响应状态:", response.status);
    const data = await response.json();
    console.log("删除模型API响应:", JSON.stringify(data));

    if (data.code === 0) {
      return { success: true };
    } else {
      console.error("删除模型失败:", data.message);
      return { success: false, message: data.message || "删除模型失败" };
    }
  } catch (error) {
    console.error("删除模型过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 获取所有模型
 */
export async function getModels() {
  try {
    // 获取用户API Key
    const userApiKey = await getRagFlowApiKey();
    if (!userApiKey) {
      return { success: false, message: "API密钥未配置", data: null };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/v1/llm/public_llms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userApiKey}`
      }
    });

    console.log("API响应状态:", response.status);
    const responseData = await response.json();
    console.log("API响应数据:", JSON.stringify(responseData));

    if (responseData.code === 0) {
      return { 
        success: true, 
        data: responseData.data
      };
    } else {
      console.error("获取模型列表失败:", responseData.message);
      return { success: false, message: responseData.message || "获取模型列表失败", data: null };
    }
  } catch (error) {
    console.error("获取模型列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: null };
  }
} 