// 定义API响应和请求的基本类型 (可以根据实际后端API调整)
interface PaginatedResponse<T> {
  items: T[];
  total_items: number;
  page: number;
  page_size: number;
  total_pages: number;
  error?: string; // Optional error message from backend
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string; // ISO date string
  created_by: string | null;
  // Add other fields if your API returns them
}

export interface FileItem {
  id: string;
  name: string;
  location: string; // MinIO path
  size: number; // in bytes
  type: string; // MIME type
  folder_id: string | null;
  upload_date: string; // ISO date string
  created_by: string | null;
  url?: string; // Optional pre-signed URL from backend
  derived_from_file_id?: string | null; // 衍生自哪个原始文件的ID
  // Add other fields if your API returns them
}

// 修改 API 基址，指向 Flask 后端
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://10.0.169.144:5001/api"; // 指向 Flask 服务器地址和端口

// 从环境变量获取Markdown转换服务的基础URL
const MARKDOWN_CONVERTER_URL = process.env.NEXT_PUBLIC_MARKDOWN_CONVERTER_URL || 'http://localhost:8000';

// Helper function to handle API requests
async function fetchAPI<T>(url: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    // Add any default headers like X-User-Id if needed for non-GET requests,
    // though proper auth tokens are better.
    // 'X-User-Id': 'frontend-user' // Placeholder
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      // Try to parse error response from backend if possible
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Ignore if error response is not JSON
      }
      throw new Error(errorData?.message || errorData?.error || `HTTP error! status: ${response.status}`);
    }
    // For 204 No Content or other successful non-JSON responses
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined as T; // Or handle as appropriate for your use case
    }
    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error; // Re-throw to be caught by the caller
  }
}

// --- Folder API Calls ---

export async function getFolders(
  parentId: string | null = null,
  page: number = 1,
  pageSize: number = 20, // Default to a reasonable page size
  sortBy: string = 'name',
  sortOrder: 'ASC' | 'DESC' = 'ASC'
): Promise<PaginatedResponse<Folder>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (parentId) {
    params.append('parent_id', parentId);
  } else {
    // Backend expects 'null' or missing for root, ensure consistency
    // If backend treats missing parent_id as root, this is fine.
    // If it specifically needs parent_id=null, then adjust accordingly based on API spec.
    // For now, if parentId is null, we don't append it, relying on backend default.
  }
  return fetchAPI<PaginatedResponse<Folder>>(`${API_BASE_URL}/folders?${params.toString()}`);
}

export async function createFolderAPI(
  name: string,
  parentId: string | null = null,
  // description is not part of current backend API for folder creation
): Promise<{ id: string; name: string; parent_id: string | null; message: string; code?: number; data?: any }> { 
  // Backend create_folder_api returns: jsonify({'code': 0, 'message': '文件夹创建成功', 'data': {'id': folder_id, ...}})
  // The type above reflects this better. The API call returns the created folder data.
  const body = { name, parent_id: parentId };
  // TODO: Pass created_by if required by backend and not handled by X-User-Id header or auth token
  return fetchAPI(`${API_BASE_URL}/folders`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateFolderAPI(
  folderId: string,
  name?: string,
  parentId?: string | null
): Promise<{ message: string; folder?: Folder }> { // Backend: {"message": "...", "folder": updated_folder_data}
  const body: { name?: string; parent_id?: string | null } = {};
  if (name !== undefined) body.name = name;
  if (parentId !== undefined) body.parent_id = parentId; // Allows setting to null (via "ROOT" or actual null)
  
  return fetchAPI(`${API_BASE_URL}/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteFolderAPI(folderId: string): Promise<void> {
  // DELETE typically returns 200/204 on success with no body or a simple success message.
  // Backend currently returns: {'code': 0, 'message': '文件夹删除成功', 'data': None}
  // We can adapt the fetchAPI or this function if we need to check the 'code'.
  // For now, assuming a 200/204 indicates success and no meaningful body to return beyond that.
  await fetchAPI<any>(`${API_BASE_URL}/folders/${folderId}`, { // Using <any> as backend returns simple message
    method: 'DELETE',
  });
}


// --- File API Calls ---

export async function getFiles(
  folderId: string | null = null,
  page: number = 1,
  pageSize: number = 20,
  sortBy: string = 'name',
  sortOrder: 'ASC' | 'DESC' = 'ASC'
): Promise<PaginatedResponse<FileItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (folderId) {
    params.append('folder_id', folderId);
  }
  // Similar to getFolders, if folderId is null, we don't append it.
  return fetchAPI<PaginatedResponse<FileItem>>(`${API_BASE_URL}/files?${params.toString()}`);
}

// 单个文件上传API
export async function uploadFileAPI(
  file: File,
  folderId: string | null = null,
  createdBy: string | null = null
): Promise<{ code: number; message: string; data?: any }> {
  const formData = new FormData();
  formData.append('file', file);
  
  if (folderId) {
    formData.append('folder_id', folderId);
  }
  
  if (createdBy) {
    formData.append('created_by', createdBy);
  }
  
  try {
    // 使用原始XMLHttpRequest以便能更精确地控制请求
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/files`, true);
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('解析响应失败: ' + xhr.responseText));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `HTTP error! status: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('网络请求失败'));
      };
      
      xhr.send(formData);
    });
  } catch (error) {
    console.error("文件上传失败:", error);
    throw error;
  }
}

// 批量文件上传API
export async function batchUploadFilesAPI(
  files: File[],
  folderId: string | null = null,
  createdBy: string | null = null,
  onProgress?: (fileName: string, progress: number) => void
): Promise<{ code: number; message: string; data?: { uploaded: any[]; failed: any[] } }> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files[]', file);
  });
  
  if (folderId) {
    formData.append('folder_id', folderId);
  }
  
  if (createdBy) {
    formData.append('created_by', createdBy);
  }
  
  try {
    // 使用原始XMLHttpRequest以便能更精确地控制请求和跟踪进度
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/files/batch`, true);
      
      // 跟踪上传进度
      if (onProgress) {
        xhr.upload.onprogress = function(event) {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            // 由于无法确定每个文件的单独进度，将总体进度应用于每个文件
            files.forEach(file => {
              onProgress(file.name, percentComplete);
            });
          }
        };
      }
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('解析响应失败: ' + xhr.responseText));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `HTTP error! status: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('网络请求失败'));
      };
      
      xhr.send(formData);
    });
  } catch (error) {
    console.error("批量文件上传失败:", error);
    throw error;
  }
}

// uploadFileAPI would typically use FormData and not be a JSON API,
// so it would need a different helper or direct fetch.
// For now, we'll focus on listing and managing metadata.

export async function updateFileAPI(
  fileId: string,
  name?: string,
  folderId?: string | null // Use "ROOT" to move to root, or a folder ID
): Promise<{ message: string; file?: FileItem }> { // Backend: {"message": "...", "file": updated_file_info}
  const body: { name?: string; folder_id?: string | null } = {};
  if (name !== undefined) body.name = name;
  if (folderId !== undefined) body.folder_id = folderId;

  return fetchAPI(`${API_BASE_URL}/files/${fileId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteFileAPI(fileId: string): Promise<void> {
  // Similar to deleteFolderAPI expectation
  await fetchAPI<any>(`${API_BASE_URL}/files/${fileId}`, { // Using <any> as backend returns simple message
    method: 'DELETE',
  });
}

export async function saveMarkdownFileAPI(
  originalFileId: string,
  markdownContent: string,
  markdownFilename: string
): Promise<{ code: number; message: string; data?: FileItem }> {
  const body = {
    original_file_id: originalFileId,
    markdown_content: markdownContent,
    markdown_filename: markdownFilename,
  };
  return fetchAPI<{ code: number; message: string; data?: FileItem }>(`${API_BASE_URL}/save-markdown`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Add other API functions as needed, e.g., for uploading, downloading (if not direct link), etc.

/**
 * 将单个文件转换为Markdown
 * @param file 文件对象
 * @returns 包含转换结果的Promise
 */
export async function convertToMarkdownAPI(file: File): Promise<{
  success: boolean;
  message: string;
  file_name?: string;
  file_type?: string;
  output_paths?: Record<string, string>;
  markdown_content?: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${MARKDOWN_CONVERTER_URL}/process/`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Markdown转换失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量将多个文件转换为Markdown
 * @param files 文件对象数组
 * @returns 包含转换结果的Promise
 */
export async function batchConvertToMarkdownAPI(files: File[]): Promise<{
  files: Array<{
    success: boolean;
    message: string;
    file_name?: string;
    file_type?: string;
    output_paths?: Record<string, string>;
    markdown_content?: string;
  }>;
}> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  try {
    const response = await fetch(`${MARKDOWN_CONVERTER_URL}/process-multiple/`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("批量Markdown转换失败:", error);
    return {
      files: files.map(file => ({
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        file_name: file.name
      }))
    };
  }
}

/**
 * 根据文件ID转换为Markdown
 * @param fileId 文件ID
 * @returns 包含转换结果的Promise
 */
export async function convertFileToMarkdownAPI(fileId: string): Promise<{
  success: boolean;
  message: string;
  file_name?: string;
  file_type?: string;
  output_paths?: Record<string, string>;
  markdown_content?: string;
}> {
  try {
    // 获取文件信息和下载链接
    const fileResponse = await fetch(`${API_BASE_URL}/files/${fileId}`);
    if (!fileResponse.ok) {
      throw new Error(`获取文件信息失败: ${fileResponse.status}`);
    }
    
    const fileData = await fileResponse.json();
    console.log("获取到的文件信息:", JSON.stringify(fileData));
    
    // 检查服务器响应的格式
    if (fileData.code !== 0) {
      throw new Error(fileData.message || '获取文件信息失败');
    }
    
    // 确保数据结构符合预期
    if (!fileData.data) {
      throw new Error('服务器返回的数据结构异常，缺少data字段');
    }
    
    const fileInfo = fileData.data;
    let fileUrl = fileInfo.url;
    
    // 如果API没有返回URL但返回了location，尝试直接获取文件
    if (!fileUrl && fileInfo.location) {
      console.log("API未返回URL，尝试使用专用API获取URL...");
      
      // 使用专用API获取预签名URL
      const urlResponse = await fetch(`${API_BASE_URL}/get-file-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          object_name: fileInfo.location,
        }),
      });
      
      if (!urlResponse.ok) {
        throw new Error(`获取预签名URL失败: ${urlResponse.status}`);
      }
      
      const urlData = await urlResponse.json();
      console.log("专用API返回的URL数据:", JSON.stringify(urlData));
      
      if (urlData.code !== 0 || !urlData.url) {
        throw new Error(urlData.message || '获取预签名URL失败');
      }
      
      fileUrl = urlData.url;
    }
    
    if (!fileUrl) {
      throw new Error('无法获取有效的文件URL');
    }
    
    console.log("使用URL下载文件:", fileUrl);
    
    // 下载文件
    const fileDownloadResponse = await fetch(fileUrl);
    if (!fileDownloadResponse.ok) {
      throw new Error(`下载文件失败: ${fileDownloadResponse.status}`);
    }
    
    // 将响应转换为Blob
    const fileBlob = await fileDownloadResponse.blob();
    console.log(`文件下载成功，大小: ${fileBlob.size} 字节，类型: ${fileBlob.type}`);
    
    // 创建File对象
    const fileName = fileInfo.name || `file_${fileId}`;
    const fileType = fileInfo.type || fileBlob.type || 'application/octet-stream';
    
    const file = new File([fileBlob], fileName, { type: fileType });
    console.log(`准备转换文件: ${fileName}, 类型: ${fileType}`);
    
    // 调用转换API
    return await convertToMarkdownAPI(file);
  } catch (error) {
    console.error("通过ID转换Markdown失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 获取文件内容
 * @param fileId 文件ID
 * @returns 包含文件内容的Promise
 */
export async function getFileContentAPI(fileId: string): Promise<{
  code: number;
  message: string;
  data?: {
    id: string;
    name: string;
    type: string;
    content?: string;
    size: number;
    url?: string;
  };
}> {
  return fetchAPI<{
    code: number;
    message: string;
    data?: {
      id: string;
      name: string;
      type: string;
      content?: string;
      size: number;
      url?: string;
    };
  }>(`${API_BASE_URL}/files/${fileId}/content`, {
    method: 'GET',
  });
}

/**
 * 更新文件内容（主要用于Markdown文件）
 * @param fileId 文件ID
 * @param content 新的文件内容
 * @returns 包含更新结果的Promise
 */
export async function updateFileContentAPI(fileId: string, content: string): Promise<{
  code: number;
  message: string;
  data?: {
    id: string;
    name: string;
    size: number;
  };
}> {
  const body = {
    content: content,
  };
  return fetchAPI<{
    code: number;
    message: string;
    data?: {
      id: string;
      name: string;
      size: number;
    };
  }>(`${API_BASE_URL}/files/${fileId}/content`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
} 