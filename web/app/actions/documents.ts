"use server"

import { env } from '@/src/config/env';
import { cookies } from 'next/headers';
import { DocumentInfo, UploadDocumentsResponse } from '@/src/types/knowledge';
import fs from 'fs';
import path from 'path';
import { getRagFlowApiKey } from '@/lib/authUtils';

/**
 * 获取文档列表
 */
export async function getDocuments(kbId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    // 调用API - 修正为正确的API路径
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${kbId}/documents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log("获取文档列表API响应状态:", response.status);
    const data = await response.json();
    
    if (data.code === 0) {
      return { success: true, data: data.data?.docs || [] }; // 注意API返回的数据结构
    } else {
      console.error("获取文档列表失败:", data.message);
      return { success: false, message: data.message || "获取文档列表失败", data: [] };
    }
  } catch (error) {
    console.error("获取文档列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 上传文档
 */
export async function uploadDocuments(formData: FormData): Promise<UploadDocumentsResponse> {
  try {
    // 获取表单数据
    const kbId = formData.get('kbId') as string;
    const files = formData.getAll('files') as File[];
    
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { 
        success: false, 
        message: "API密钥未配置", 
        failedUploads: [], 
        successfulUploads: [] 
      };
    }

    // 针对每个文件进行上传
    const uploadPromises = files.map(async (file) => {
      const documentFormData = new FormData();
      documentFormData.append('file', file); // 只将文件添加到FormData
      // kbId 将作为URL路径参数

      try {
        // 使用正确的API端点，kbId (dataset_id) 作为路径参数
        const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${kbId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
            // Content-Type 会由浏览器根据 FormData 自动设置，对于 multipart/form-data
          },
          body: documentFormData
        });

        const apiCallResult = await response.json();
        
        let docInfo: DocumentInfo | null = null;
        let docId: string | undefined = undefined;

        if (apiCallResult.data && Array.isArray(apiCallResult.data) && apiCallResult.data.length > 0) {
          // 假设数组的第一个元素对应于单个上传的文件
          docInfo = apiCallResult.data[0] as DocumentInfo;
          docId = apiCallResult.data[0].id;
        } else if (apiCallResult.data && !Array.isArray(apiCallResult.data) && typeof apiCallResult.data === 'object' && apiCallResult.data !== null) {
          // 处理API可能为表单中的单个文件返回单个对象的情况
          docInfo = apiCallResult.data as DocumentInfo;
          docId = apiCallResult.data.id;
        }
        // 如果 apiCallResult.data 为 null 或空数组，docInfo 保持为 null。

        if (apiCallResult.code === 0) {
          return { 
            file: file.name, 
            success: true, 
            documentId: docId,
            documentInfo: docInfo || undefined
          };
        } else {
          console.error(`上传文件失败 ${file.name}:`, apiCallResult.message);
          return { 
            file: file.name, 
            success: false, 
            error: apiCallResult.message || "上传失败" 
          };
        }
      } catch (error) {
        console.error(`上传文件出错 ${file.name}:`, error);
        return { 
          file: file.name, 
          success: false, 
          error: "服务器错误"
        };
      }
    });

    // 等待所有上传完成
    const results = await Promise.all(uploadPromises);
    
    // 分离成功和失败的上传
    const successfulUploads = results.filter(
      (r): r is { file: string; success: true; documentId: string | undefined; documentInfo: DocumentInfo | undefined; } => r.success
    );
    const failedUploads = results.filter(
      (r): r is { file: string; success: false; error: any; } => !r.success
    );

    return {
      success: failedUploads.length === 0,
      message: failedUploads.length > 0 
        ? `${failedUploads.length}个文件上传失败` 
        : "所有文件上传成功",
      successfulUploads,
      failedUploads
    };
  } catch (error) {
    console.error("上传文档过程中发生错误:", error);
    return { 
      success: false, 
      message: "服务器错误，请稍后再试", 
      successfulUploads: [], 
      failedUploads: [] 
    };
  }
}

/**
 * 删除文档
 */
export async function deleteDocument(documentId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.status === 204) {
      return { success: true };
    } else {
      const data = await response.json();
      console.error("删除文档失败:", data.message);
      return { success: false, message: data.message || "删除文档失败" };
    }
  } catch (error) {
    console.error("删除文档过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 批量删除文档
 */
export async function deleteDocuments(params: { dataset_id: string; ids: string[] }) {
  try {
    const { dataset_id, ids } = params;
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${dataset_id}/documents`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ids: ids
      })
    });

    // 根据API文档，成功时可能返回200或204，或者特定的code
    if (response.ok) { // response.ok (status in the range 200-299)
        // 检查是否有响应体
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (data.code === 0) {
                 return { success: true };
            } else {
                console.error("批量删除文档失败 (API):", data.message);
                return { success: false, message: data.message || "批量删除文档失败" };
            }
        } else if (response.status === 204) { // No Content
             return { success: true };
        }
        // 如果是其他成功状态码但没有符合的json响应，也认为成功
        return { success: true };
    } else {
      const data = await response.json().catch(() => ({ message: "无法解析错误响应" }));
      console.error("批量删除文档失败 (HTTP):", data.message, "Status:", response.status);
      return { success: false, message: data.message || `批量删除文档失败 (状态码: ${response.status})` };
    }
  } catch (error) {
    console.error("批量删除文档过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 解析文档
 */
export async function parseDocument(documentId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/documents/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ids: [documentId]
      })
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return { success: true };
    } else {
      console.error("解析文档失败:", data.message);
      return { success: false, message: data.message || "解析文档失败" };
    }
  } catch (error) {
    console.error("解析文档过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 批量解析文档
 */
export async function parseDocuments(params: { dataset_id: string; document_ids: string[] }) {
  try {
    const { dataset_id, document_ids } = params;
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${dataset_id}/chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        document_ids: document_ids
      })
    });
    
    if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          return { success: true };
        } else {
          console.error("批量解析文档失败 (API):", data.message);
          return { success: false, message: data.message || "批量解析文档失败" };
        }
    } else {
      const data = await response.json().catch(() => ({ message: "无法解析错误响应" }));
      console.error("批量解析文档失败 (HTTP):", data.message, "Status:", response.status);
      return { success: false, message: data.message || `批量解析文档失败 (状态码: ${response.status})` };
    }
  } catch (error) {
    console.error("批量解析文档过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 从数据管理页面添加文件到知识库
 */
export async function addFilesToKnowledge(kbId: string, fileIds: string[]): Promise<UploadDocumentsResponse> {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { 
        success: false, 
        message: "API密钥未配置", 
        failedUploads: [], 
        successfulUploads: [] 
      };
    }

    // 针对每个文件ID进行处理
    const uploadPromises = fileIds.map(async (fileId) => {
      try {
        // 1. 从文件管理API获取文件信息和下载URL
        const fileInfoResponse = await fetch(`${env.fileApiBaseUrl}/api/files/${fileId}`);
        if (!fileInfoResponse.ok) {
          throw new Error(`获取文件信息失败: ${fileInfoResponse.status}`);
        }
        
        const fileInfoData = await fileInfoResponse.json();
        if (fileInfoData.code !== 0) {
          throw new Error(fileInfoData.message || '获取文件信息失败');
        }
        
        const fileInfo = fileInfoData.data;
        const fileUrl = fileInfo.url;
        const fileName = fileInfo.name;
        
        if (!fileUrl) {
          throw new Error('无法获取文件下载链接');
        }

        // 2. 从MinIO下载文件内容
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          throw new Error(`下载文件失败: ${fileResponse.status}`);
        }
        
        const fileBlob = await fileResponse.blob();
        const file = new File([fileBlob], fileName, { type: fileInfo.type || 'application/octet-stream' });

        // 3. 将文件上传到知识库
        const documentFormData = new FormData();
        documentFormData.append('file', file);

        const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${kbId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: documentFormData
        });

        const apiCallResult = await response.json();
        
        let docInfo: DocumentInfo | undefined = undefined;
        let docId: string | undefined = undefined;

        if (apiCallResult.data && Array.isArray(apiCallResult.data) && apiCallResult.data.length > 0) {
          docInfo = apiCallResult.data[0] as DocumentInfo;
          docId = apiCallResult.data[0].id;
        } else if (apiCallResult.data && !Array.isArray(apiCallResult.data) && typeof apiCallResult.data === 'object' && apiCallResult.data !== null) {
          docInfo = apiCallResult.data as DocumentInfo;
          docId = apiCallResult.data.id;
        }

        if (apiCallResult.code === 0) {
          return { 
            file: fileName, 
            success: true, 
            documentId: docId,
            documentInfo: docInfo
          };
        } else {
          console.error(`添加文件失败 ${fileName}:`, apiCallResult.message);
          return { 
            file: fileName, 
            success: false, 
            error: apiCallResult.message || "添加失败" 
          };
        }
      } catch (error) {
        console.error(`添加文件出错 ${fileId}:`, error);
        return { 
          file: `文件-${fileId}`, 
          success: false, 
          error: error instanceof Error ? error.message : "服务器错误"
        };
      }
    });

    // 等待所有处理完成
    const results = await Promise.all(uploadPromises);
    
    // 分离成功和失败的结果
    const successfulUploads = results.filter(
      (r): r is { file: string; success: true; documentId: string | undefined; documentInfo: DocumentInfo | undefined; } => r.success
    );
    const failedUploads = results.filter(
      (r): r is { file: string; success: false; error: any; } => !r.success
    );

    return {
      success: failedUploads.length === 0,
      message: failedUploads.length > 0 
        ? `${failedUploads.length}个文件添加失败，${successfulUploads.length}个文件添加成功` 
        : `成功添加${successfulUploads.length}个文件到知识库`,
      successfulUploads,
      failedUploads
    };
  } catch (error) {
    console.error("添加文件到知识库过程中发生错误:", error);
    return { 
      success: false, 
      message: "服务器错误，请稍后再试", 
      successfulUploads: [], 
      failedUploads: [] 
    };
  }
} 