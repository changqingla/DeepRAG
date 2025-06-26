/**
 * 模型工厂类型
 */
export type ModelFactory = 'OpenAI-API-Compatible' | 'VLLM' | 'LocalAI' | 'Tongyi-Qianwen';

/**
 * 模型类型
 */
export type ModelType = 'chat' | 'embedding' | 'rerank' | 'image2text' | 'tts' | 'speech2text';

/**
 * 模型分类（用于UI显示）
 */
export type ModelCategory = 'Chat' | 'Embedding' | 'Rerank';

/**
 * 添加模型的请求参数
 */
export interface AddModelRequest {
  llm_factory: ModelFactory;
  model_type: ModelType;
  api_base: string;
  llm_name: string;
  api_key: string;
  max_tokens: number;
}

/**
 * 删除模型的请求参数
 */
export interface DeleteModelRequest {
  llm_factory: ModelFactory;
  llm_name: string;
}

/**
 * 模型信息
 */
export interface ModelInfo {
  name: string;
  type: ModelType;
  used_token: number;
}

/**
 * 工厂信息
 */
export interface FactoryInfo {
  llm: ModelInfo[];
  tags: string;
}

/**
 * 获取模型列表的响应
 */
export interface GetModelsResponse {
  [factory: string]: FactoryInfo;
}

/**
 * 模型显示信息（用于UI展示）
 */
export interface ModelDisplayInfo {
  id: string;
  name: string;
  factory: string;
  type: ModelType;
  capability: string;
  category: ModelCategory;
  used_token: number;
} 