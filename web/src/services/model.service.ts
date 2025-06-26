import { apiClient, ApiResponse } from '@/src/api/client';
import { AddModelRequest, DeleteModelRequest, GetModelsResponse, ModelDisplayInfo, ModelCategory, ModelType } from '@/src/types/model';
import { AuthService } from './auth.service';
import { env } from '@/src/config/env';

/**
 * 模型管理服务
 */
export class ModelService {
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
   * 添加模型
   * @param modelData 模型数据
   * @returns API响应
   */
  static async addModel(modelData: AddModelRequest): Promise<ApiResponse<boolean>> {
    const token = this.getToken() || undefined;
    return apiClient.post<boolean>('/api/v1/llm', modelData, { token });
  }

  /**
   * 删除模型
   * @param deleteData 删除数据
   * @returns API响应
   */
  static async deleteModel(deleteData: DeleteModelRequest): Promise<ApiResponse<boolean>> {
    const token = this.getToken() || undefined;
    return apiClient.post<boolean>('/api/v1/llm/delete', deleteData, { token });
  }

  /**
   * 获取所有模型
   * @returns 模型列表
   */
  static async getModels(): Promise<ApiResponse<GetModelsResponse>> {
    const token = this.getToken() || undefined;
    return apiClient.get<GetModelsResponse>('/v1/llm/public_llms', { token });
  }

  /**
   * 将API响应转换为UI显示用的模型列表
   * @param response API响应数据
   * @returns 模型显示列表
   */
  static convertResponseToDisplayModels(response: GetModelsResponse): ModelDisplayInfo[] {
    const result: ModelDisplayInfo[] = [];
    
    // 遍历所有工厂和模型
    Object.entries(response).forEach(([factory, factoryInfo]) => {
      // 过滤掉Tongyi-Qianwen工厂的模型
      if (factory === "Tongyi-Qianwen") {
        console.log("跳过Tongyi-Qianwen工厂的模型");
        return;
      }
      
      factoryInfo.llm.forEach(model => {
        // 从模型名称中提取实际名称（不包含工厂后缀）
        const nameParts = model.name.split('___');
        const displayName = nameParts[0];
        
        // 确定模型类别（用于UI分类）
        let category: ModelCategory = 'Chat';
        if (model.type === 'embedding') category = 'Embedding';
        if (model.type === 'rerank') category = 'Rerank';
        
        // 创建显示信息
        result.push({
          id: model.name, // 使用完整名称作为ID
          name: displayName,
          factory: factory,
          type: model.type,
          capability: `${factory} · ${this.getCapabilityText(model.type)} · Used: ${model.used_token} tokens`,
          category: category,
          used_token: model.used_token
        });
      });
    });
    
    return result;
  }
  
  /**
   * 获取模型类型的显示文本
   * @param type 模型类型
   * @returns 显示文本
   */
  private static getCapabilityText(type: ModelType): string {
    switch (type) {
      case 'chat': return 'Chat LLM';
      case 'embedding': return 'Text Embedding';
      case 'rerank': return 'Text Rerank';
      case 'image2text': return 'Image to Text';
      case 'tts': return 'Text to Speech';
      case 'speech2text': return 'Speech to Text';
      default: return type;
    }
  }
} 