/**
 * 环境变量配置
 */

export const env = {
  // API基础URL
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.0.1.4:8088',
  
  // 知识库API基础URL (使用不同端口)
  knowledgeApiBaseUrl: process.env.NEXT_PUBLIC_KNOWLEDGE_API_BASE_URL || 'http://10.0.1.4:9380',
  
  // 文件管理API基础URL
  fileApiBaseUrl: process.env.NEXT_PUBLIC_FILE_API_BASE_URL || 'http://10.0.169.144:5001',
  
  // Agent聊天API基础URL
  agentApiBaseUrl: process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'http://10.0.169.144:8000',
  
  // API Key生成服务URL
  apiKeyGeneratorUrl: process.env.NEXT_PUBLIC_API_KEY_GENERATOR_URL || 'http://10.0.169.144:5001',
  
  // API服务基础URL (用于生成API Key)
  apiServiceBaseUrl: process.env.NEXT_PUBLIC_API_SERVICE_BASE_URL || 'http://10.0.1.4:8088/v1',
  
  // 默认认证令牌（开发阶段使用，生产环境应移除）
  defaultAuthToken: process.env.NEXT_PUBLIC_DEFAULT_AUTH_TOKEN || ''
} 