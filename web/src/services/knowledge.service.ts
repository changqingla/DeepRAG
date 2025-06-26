import { apiClient, ApiResponse } from '@/src/api/client';
import { 
  CreateKnowledgeRequest, 
  KnowledgeInfo, 
  GetKnowledgesResponse, 
  DeleteKnowledgeRequest, 
  DocumentInfo, 
  DeleteDocumentsRequest, 
  ParseDocumentsRequest,
  KnowledgeDisplayInfo
} from '@/src/types/knowledge';
import { AuthService } from './auth.service';
import { env } from '@/src/config/env';

/**
 * 知识库管理服务
 */
export class KnowledgeService {
  /**
   * 获取认证令牌
   * @returns 认证令牌
   */
  private static getToken(): string | undefined {
    // 首先尝试从AuthService获取令牌，如果为空则使用默认令牌
    const token = AuthService.getToken();
    if (token) {
      console.log("使用登录令牌:", token.substring(0, 10) + "...");
      return token;
    }
    const defaultToken = env.defaultAuthToken;
    console.log("使用默认令牌:", defaultToken ? (defaultToken.substring(0, 10) + "...") : "未设置");
    return defaultToken;
  }

  /**
   * 创建知识库
   * @param data 知识库数据
   * @returns API响应
   */
  static async createKnowledge(data: CreateKnowledgeRequest): Promise<ApiResponse<KnowledgeInfo>> {
    const token = this.getToken() || undefined;
    return apiClient.post<KnowledgeInfo>('/api/v1/datasets', data, { token });
  }

  /**
   * 获取知识库列表
   * @returns 知识库列表
   */
  static async getKnowledges(): Promise<ApiResponse<GetKnowledgesResponse>> {
    const token = this.getToken() || undefined;
    return apiClient.get<GetKnowledgesResponse>('/api/v1/datasets', { token });
  }

  /**
   * 删除知识库
   * @param data 删除知识库请求数据
   * @returns API响应
   */
  static async deleteKnowledge(data: DeleteKnowledgeRequest): Promise<ApiResponse<boolean>> {
    const token = this.getToken() || undefined;
    return apiClient.delete<boolean>('/api/v1/datasets', { token, data });
  }

  /**
   * 上传文件到知识库
   * @param datasetId 知识库ID
   * @param files 文件列表
   * @returns API响应
   */
  static async uploadDocuments(datasetId: string, files: File[]): Promise<ApiResponse<DocumentInfo[]>> {
    const token = this.getToken() || undefined;
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });
    
    return apiClient.postFormData<DocumentInfo[]>(`/api/v1/datasets/${datasetId}/documents`, formData, { token });
  }

  /**
   * 删除知识库中的文档
   * @param datasetId 知识库ID
   * @param data 删除文档请求数据
   * @returns API响应
   */
  static async deleteDocuments(datasetId: string, data: DeleteDocumentsRequest): Promise<ApiResponse<boolean>> {
    const token = this.getToken() || undefined;
    return apiClient.delete<boolean>(`/api/v1/datasets/${datasetId}/documents`, { token, data });
  }

  /**
   * 解析文档
   * @param datasetId 知识库ID
   * @param data 解析文档请求数据
   * @returns API响应
   */
  static async parseDocuments(datasetId: string, data: ParseDocumentsRequest): Promise<ApiResponse<boolean>> {
    const token = this.getToken() || undefined;
    return apiClient.post<boolean>(`/api/v1/datasets/${datasetId}/chunks`, data, { token });
  }

  /**
   * 停止解析文档
   * @param datasetId 知识库ID
   * @param data 解析文档请求数据
   * @returns API响应
   */
  static async stopParsing(datasetId: string, data: ParseDocumentsRequest): Promise<ApiResponse<boolean>> {
    const token = this.getToken() || undefined;
    return apiClient.delete<boolean>(`/api/v1/datasets/${datasetId}/chunks`, { token, data });
  }

  /**
   * 将API响应转换为UI显示用的知识库列表
   * @param response API响应数据
   * @returns 知识库显示列表
   */
  static convertResponseToDisplayKnowledges(response: GetKnowledgesResponse): KnowledgeDisplayInfo[] {
    const result: KnowledgeDisplayInfo[] = [];
    
    // 遍历所有知识库
    Object.values(response).forEach(knowledge => {
      result.push({
        id: knowledge.id,
        title: knowledge.name,
        description: knowledge.description,
        documentsCount: knowledge.document_count,
        lastUpdated: knowledge.update_date,
        embeddingModel: knowledge.embedding_model,
        chunkMethod: knowledge.chunk_method,
        chunkSize: knowledge.parser_config?.chunk_token_num || 256
      });
    });
    
    return result;
  }
} 