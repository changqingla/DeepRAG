/**
 * 知识库相关类型定义
 */

/**
 * 分块方法
 */
export type ChunkMethod = 'qa' | 'naive';

/**
 * 解析配置
 */
export interface ParserConfig {
  chunk_token_num: number;
  delimiter?: string;
  layout_recognize?: boolean;
}

/**
 * 创建知识库请求参数
 */
export interface CreateKnowledgeRequest {
  name: string;
  description: string;
  embedding_model: string;
  chunk_method: ChunkMethod;
  parser_config: ParserConfig;
}

/**
 * 知识库信息
 */
export interface KnowledgeInfo {
  id: string;
  name: string;
  description: string;
  embedding_model: string;
  chunk_method: ChunkMethod;
  document_count: number;
  chunk_count: number;
  token_num: number;
  create_date: string;
  update_date: string;
  status: string;
  parser_config: ParserConfig;
}

/**
 * 获取知识库列表响应
 */
export interface GetKnowledgesResponse {
  [key: string]: KnowledgeInfo;
}

/**
 * 删除知识库请求参数
 */
export interface DeleteKnowledgeRequest {
  ids: string[];
}

/**
 * 知识库中的文档信息
 */
export interface DocumentInfo {
  id: string;
  name: string;
  location: string;
  size: number;
  type: string;
  run: string;
  chunk_method: ChunkMethod;
  dataset_id: string;
  created_by: string;
  parser_config: ParserConfig;
  create_date: string;
}

/**
 * 上传文件响应
 */
export interface UploadDocumentsResponse {
  success: boolean;
  message: string;
  successfulUploads: Array<{
    file: string;
    success: boolean;
    documentId?: string;
    documentInfo?: DocumentInfo;
  }>;
  failedUploads: Array<{
    file: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * 删除文档请求参数
 */
export interface DeleteDocumentsRequest {
  ids: string[];
}

/**
 * 解析文档请求参数
 */
export interface ParseDocumentsRequest {
  document_ids: string[];
}

/**
 * 知识库显示信息（用于UI显示）
 */
export interface KnowledgeDisplayInfo {
  id: string;
  title: string;
  description: string;
  documentsCount: number;
  lastUpdated: string;
  embeddingModel: string;
  chunkMethod: ChunkMethod;
  chunkSize: number;
} 