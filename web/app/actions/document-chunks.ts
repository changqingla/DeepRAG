"use server"

import { env } from '@/src/config/env';
import { getRagFlowApiKey } from '@/lib/authUtils';

/**
 * 获取文档分块列表
 */
export async function getDocumentChunks(datasetId: string, documentId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    console.log("获取文档分块列表, 知识库ID:", datasetId, "文档ID:", documentId);

    // 调用API获取文档分块列表
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${datasetId}/documents/${documentId}/chunks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseData = await response.json();
    
    if (responseData.code === 0) {
      return { success: true, data: responseData.data || [] };
    } else {
      console.error("获取文档分块列表失败:", responseData.message);
      return { success: false, message: responseData.message || "获取文档分块列表失败", data: [] };
    }
  } catch (error) {
    console.error("获取文档分块列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 更新文档块内容
 */
export async function updateDocumentChunk(datasetId: string, documentId: string, chunkId: string, content: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log("更新文档块, 知识库ID:", datasetId, "文档ID:", documentId, "块ID:", chunkId);

    // 调用API更新文档块
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${datasetId}/documents/${documentId}/chunks/${chunkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        content: content
      })
    });

    console.log("更新文档块API响应状态:", response.status);
    const responseData = await response.json();
    console.log("更新文档块API响应:", JSON.stringify(responseData));

    if (responseData.code === 0) {
      return { 
        success: true
      };
    } else {
      console.error("更新文档块失败:", responseData.message);
      return { success: false, message: responseData.message || "更新文档块失败" };
    }
  } catch (error) {
    console.error("更新文档块过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
} 