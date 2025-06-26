"use server"

import { env } from '@/src/config/env';
import { cookies } from 'next/headers';
import { ChunkMethod, ParserConfig } from '@/src/types/knowledge';
import fs from 'fs';
import path from 'path';
import { getRagFlowApiKey } from '@/lib/authUtils';

/**
 * 创建知识库
 */
export async function createKnowledge(formData: FormData) {
  try {
    // 获取表单数据
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const chunkMethod = formData.get('chunk_method') as string;
    const embeddingModel = formData.get('embedding_model') as string;

    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log("创建知识库:", { name, description, chunkMethod, embeddingModel });

    // 调用API创建知识库
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name,
        description,
        chunk_method: chunkMethod,
        embedding_model: embeddingModel
      })
    });

    console.log("API响应状态:", response.status);
    const data = await response.json();
    console.log("API响应:", JSON.stringify(data));

    if (data.code === 0) {
      return { success: true };
    } else {
      console.error("创建知识库失败:", data.message);
      return { success: false, message: data.message || "创建知识库失败" };
    }
  } catch (error) {
    console.error("创建知识库过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 获取知识库列表
 */
export async function getKnowledgeBases() {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    console.log("获取知识库列表");

    // 调用API获取知识库列表
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log("API响应状态:", response.status);
    const responseData = await response.json();
    console.log("API响应:", JSON.stringify(responseData).substring(0, 200) + "...");

    if (responseData.code === 0) {
      return { success: true, data: responseData.data };
    } else {
      console.error("获取知识库列表失败:", responseData.message);
      return { success: false, message: responseData.message || "获取知识库列表失败", data: [] };
    }
  } catch (error) {
    console.error("获取知识库列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 删除知识库
 */
export async function deleteKnowledge(id: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log("删除知识库:", id);

    // 调用API删除知识库 - 修正API调用格式
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log("API响应状态:", response.status);
    const data = await response.json();
    console.log("API响应:", JSON.stringify(data));

    if (data.code === 0) {
      return { success: true };
    } else {
      console.error("删除知识库失败:", data.message);
      return { success: false, message: data.message || "删除知识库失败" };
    }
  } catch (error) {
    console.error("删除知识库过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 获取知识库详情
 */
export async function getKnowledgeDetail(id: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: null };
    }

    console.log("获取知识库详情:", id);

    // 由于知识库详情API可能存在问题，我们获取所有知识库然后过滤出当前ID的知识库
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log("API响应状态:", response.status);
    const responseData = await response.json();
    
    if (responseData.code === 0) {
      // 从知识库列表中查找指定ID的知识库
      const kb = Array.isArray(responseData.data) ? responseData.data.find((item: any) => item.id === id) : null;
      if (kb) {
        return { success: true, data: kb };
      } else {
        return { success: false, message: "找不到指定知识库", data: null };
      }
    } else {
      console.error("获取知识库详情失败:", responseData.message);
      return { success: false, message: responseData.message || "获取知识库详情失败", data: null };
    }
  } catch (error) {
    console.error("获取知识库详情过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: null };
  }
}

/**
 * 根据ID获取知识库详情（直接调用API）
 */
export async function getKnowledgeById(id: string) {
  try {
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: null };
    }

    // 直接调用获取单个知识库详情的API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return { success: true, data: data.data };
    } else {
      return { success: false, message: data.message || "获取知识库详情失败", data: null };
    }
  } catch (error) {
    console.error("获取知识库详情错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: null };
  }
}

/**
 * 更新知识库
 */
export async function updateKnowledge(formData: FormData) {
  try {
    // 获取表单数据
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const chunkMethod = formData.get('chunk_method') as string;
    const embeddingModel = formData.get('embedding_model') as string;

    console.log("====== updateKnowledge 开始 ======");
    console.log("表单数据:", { id, name, description, chunkMethod, embeddingModel });

    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      console.log("❌ API密钥未配置");
      return { success: false, message: "API密钥未配置" };
    }

    console.log("✅ API Key获取成功:", apiKey.substring(0, 20) + "...");

    // 构建请求体
    const requestBody = {
      name,
      description,
      chunk_method: chunkMethod,
      embedding_model: embeddingModel
    };

    console.log("请求体:", JSON.stringify(requestBody, null, 2));

    // 构建完整URL
    const fullUrl = `${env.knowledgeApiBaseUrl}/api/v1/datasets/${id}`;
    console.log("完整请求URL:", fullUrl);
    console.log("knowledgeApiBaseUrl:", env.knowledgeApiBaseUrl);

    // 调用API更新知识库 - 只有这个API使用9380端口
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log("====== API响应信息 ======");
    console.log("响应状态:", response.status);
    console.log("响应状态文本:", response.statusText);
    console.log("响应URL:", response.url);
    
    // 打印响应头
    console.log("响应头:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    let data;
    try {
      data = await response.json();
      console.log("响应数据:", JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error("❌ 解析响应JSON失败:", jsonError);
      const textResponse = await response.text();
      console.log("响应文本内容:", textResponse);
      return { success: false, message: "服务器响应格式错误" };
    }

    if (data.code === 0) {
      console.log("✅ 更新知识库成功");
      return { success: true };
    } else {
      console.error("❌ 更新知识库失败:", data.message);
      return { success: false, message: data.message || "更新知识库失败" };
    }
  } catch (error) {
    console.error("❌ 更新知识库过程中发生错误:", error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, message: "网络连接错误，请检查服务器地址" };
    }
    return { success: false, message: "服务器错误，请稍后再试" };
  }
} 