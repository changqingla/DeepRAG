"use server"

import { env } from '@/src/config/env';
import { getRagFlowApiKey } from '@/lib/authUtils';

/**
 * 获取聊天助手列表
 */
export async function getChatbots() {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    console.log("获取聊天助手列表");

    // 调用API获取聊天助手列表
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chats`, {
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
      return { 
        success: true, 
        data: responseData.data || []
      };
    } else {
      console.error("获取聊天助手列表失败:", responseData.message);
      return { success: false, message: responseData.message || "获取聊天助手列表失败", data: [] };
    }
  } catch (error) {
    console.error("获取聊天助手列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 获取可用模型列表
 */
export async function getModels() {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: { chatModels: [], rerankModels: [] } };
    }

    console.log("获取模型列表");

    // 调用API获取模型列表
    const response = await fetch(`${env.apiBaseUrl}/v1/llm/public_llms`, {
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
      // 处理API返回的模型数据，将其转换为前端所需的格式
      const chatModels: {id: string, name: string}[] = [];
      const rerankModels: {id: string, name: string}[] = [];
      
      // 需要排除的模型工厂
      const excludedFactories = ["Tongyi-Qianwen"];
      
      // 遍历API返回的所有模型工厂
      Object.entries(responseData.data || {}).forEach(([factory, factoryData]: [string, any]) => {
        // 跳过被排除的工厂
        if (excludedFactories.includes(factory)) {
          console.log(`跳过排除的模型工厂: ${factory}`);
          return;
        }
        
        // 遍历该工厂下的所有模型
        (factoryData.llm || []).forEach((model: any) => {
          const modelName = model.name;
          const modelType = model.type;
          
          if (modelType === 'chat') {
            chatModels.push({
              id: modelName,
              name: `${modelName.split("___")[0]} (${factory})`
            });
          } else if (modelType === 'rerank') {
            rerankModels.push({
              id: modelName,
              name: `${modelName.split("___")[0]} (${factory})`
            });
          }
        });
      });
      
      return { 
        success: true, 
        data: {
          chatModels,
          rerankModels
        }
      };
    } else {
      console.error("获取模型列表失败:", responseData.message);
      return { 
        success: false, 
        message: responseData.message || "获取模型列表失败", 
        data: { chatModels: [], rerankModels: [] } 
      };
    }
  } catch (error) {
    console.error("获取模型列表过程中发生错误:", error);
    return { 
      success: false, 
      message: "服务器错误，请稍后再试", 
      data: { chatModels: [], rerankModels: [] } 
    };
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

    // 调用API获取知识库列表
    const response = await fetch(`${env.apiBaseUrl}/api/v1/datasets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseData = await response.json();

    if (responseData.code === 0) {
      // 处理API返回的知识库数据
      const knowledgeBases = (responseData.data || []).map((kb: any) => ({
        id: kb.id,
        name: kb.name
      }));
      
      return { 
        success: true, 
        data: knowledgeBases
      };
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
 * 创建聊天助手
 */
export async function createChatbot(data: {
  name: string;
  description: string;
  dataset_ids: string[];
  llm: {
    model_name: string;
    temperature: number;
    top_p?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
  prompt: {
    prompt: string;
    rerank_model: string;
    similarity_threshold: number;
    top_n: number;
    show_quote?: boolean;
    keywords_similarity_weight?: number;
    empty_response?: string;
    refine_multiturn?: boolean;
  };
}) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log("创建聊天助手, 数据:", JSON.stringify(data));

    // 调用API创建聊天助手
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(data)
    });

    console.log("API响应状态:", response.status);
    const responseData = await response.json();
    console.log("API响应:", JSON.stringify(responseData).substring(0, 200) + "...");

    if (responseData.code === 0) {
      return { success: true, data: responseData.data };
    } else {
      console.error("创建聊天助手失败:", responseData.message);
      return { success: false, message: responseData.message || "创建聊天助手失败" };
    }
  } catch (error) {
    console.error("创建聊天助手过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 更新聊天助手
 */
export async function updateChatbot(chatbotId: string, data: {
  name: string;
  description: string;
  dataset_ids: string[];
  llm: {
    model_name: string;
    temperature: number;
    top_p?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
  prompt: {
    prompt: string;
    rerank_model: string;
    similarity_threshold: number;
    top_n: number;
    show_quote?: boolean;
    keywords_similarity_weight?: number;
    empty_response?: string;
    refine_multiturn?: boolean;
  };
}) {
  try {
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log(`更新聊天助手 ${chatbotId}, 数据:`, JSON.stringify(data));

    const response = await fetch(`${env.apiBaseUrl}/api/v1/chats/${chatbotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(data)
    });

    console.log("API响应状态:", response.status);
    const responseData = await response.json();
    console.log("API响应:", JSON.stringify(responseData).substring(0, 200) + "...");

    if (responseData.code === 0) {
      return { success: true, data: responseData.data };
    } else if (responseData.code === 102 && responseData.message?.includes("has not been parsed yet")) {
      // 检测到未解析文档错误，获取详细信息但不自动解析
      console.log("检测到未解析文档，获取详细信息...");
      
      try {
        // 获取所有关联知识库中的未解析文档信息
        const unparsedInfo = await Promise.all(
          data.dataset_ids.map(async (datasetId) => {
            try {
              console.log(`正在获取数据集 ${datasetId} 的文档列表...`);
              
              // 获取数据集中的文档列表
              const documentsResponse = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${datasetId}/documents`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                }
              });
              
              if (!documentsResponse.ok) {
                console.warn(`获取数据集 ${datasetId} 的文档列表失败，状态码: ${documentsResponse.status}`);
                return null;
              }
              
              const documentsData = await documentsResponse.json();
              if (documentsData.code !== 0) {
                console.warn(`获取数据集 ${datasetId} 的文档列表失败:`, documentsData.message);
                return null;
              }
              
              const documents = documentsData.data?.docs || [];
              console.log(`数据集 ${datasetId} 中共有 ${documents.length} 个文档`);
              
              // 找出未解析的文档（状态为 UNSTART 或 FAILED）
              const unparsedDocuments = documents.filter((doc: any) => 
                doc.run === 'UNSTART' || doc.run === 'FAILED'
              );
              
              console.log(`数据集 ${datasetId} 中有 ${unparsedDocuments.length} 个未解析文档`);
              
              if (unparsedDocuments.length === 0) {
                return null;
              }
              
              // 获取知识库名称
              const kbResponse = await fetch(`${env.apiBaseUrl}/api/v1/datasets/${datasetId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                }
              });
              
              let kbName = `知识库-${datasetId}`;
              if (kbResponse.ok) {
                const kbData = await kbResponse.json();
                if (kbData.code === 0 && kbData.data?.name) {
                  kbName = kbData.data.name;
                }
              }
              
              console.log(`知识库名称: ${kbName}`);
              
              return {
                datasetId,
                datasetName: kbName,
                unparsedCount: unparsedDocuments.length,
                unparsedDocuments: unparsedDocuments.map((doc: any) => ({
                  id: doc.id,
                  name: doc.name,
                  status: doc.run
                }))
              };
            } catch (error) {
              console.error(`获取数据集 ${datasetId} 信息时出错:`, error);
              return null;
            }
          })
        );
        
        const validUnparsedInfo = unparsedInfo.filter(info => info !== null);
        console.log(`有效的未解析信息数量: ${validUnparsedInfo.length}`);
        console.log('未解析信息详情:', JSON.stringify(validUnparsedInfo, null, 2));
        
        if (validUnparsedInfo.length > 0) {
          const totalUnparsedCount = validUnparsedInfo.reduce((sum, info) => sum + (info?.unparsedCount || 0), 0);
          
          console.log(`总计 ${totalUnparsedCount} 个未解析文档，准备返回requiresParsing=true`);
          
          return { 
            success: false, 
            message: `无法更新聊天助手，发现 ${totalUnparsedCount} 个未解析的文档。请先解析这些文档后再试。`,
            requiresParsing: true,
            unparsedInfo: validUnparsedInfo
          };
        } else {
          console.log("validUnparsedInfo为空，返回通用错误消息");
          return { 
            success: false, 
            message: "检测到未解析文档，但无法获取详细信息。请检查知识库中的文档解析状态。" 
          };
        }
      } catch (error) {
        console.error("获取未解析文档信息时出错:", error);
        return { 
          success: false, 
          message: "检测到未解析文档。请前往知识库页面解析相关文档后重试。" 
        };
      }
    } else {
      console.error("更新聊天助手失败:", responseData.message);
      return { success: false, message: responseData.message || "更新聊天助手失败" };
    }
  } catch (error) {
    console.error("更新聊天助手过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 删除聊天助手
 */
export async function deleteChatbot(ids: string[]) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log("删除聊天助手, ids:", ids);

    // 调用API删除聊天助手
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chats`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ ids })
    });

    console.log("API响应状态:", response.status);
    const responseData = await response.json();
    console.log("API响应:", JSON.stringify(responseData));

    if (responseData.code === 0) {
      return { success: true };
    } else {
      console.error("删除聊天助手失败:", responseData.message);
      return { success: false, message: responseData.message || "删除聊天助手失败" };
    }
  } catch (error) {
    console.error("删除聊天助手过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 获取应用程序列表
 */
export async function getApplications() {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    // 调用API获取应用程序列表
    const response = await fetch(`${env.apiBaseUrl}/api/v1/app`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseData = await response.json();

    if (responseData.code === 0) {
      return { 
        success: true, 
        data: responseData.data || []
      };
    } else {
      console.error("获取应用程序列表失败:", responseData.message);
      return { success: false, message: responseData.message || "获取应用程序列表失败", data: [] };
    }
  } catch (error) {
    console.error("获取应用程序列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 创建应用程序
 */
export async function createApplication(formData: FormData) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 从表单中获取数据
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const chatbotId = formData.get('chatbotId') as string;
    
    // 验证必填字段
    if (!name || !chatbotId) {
      return { success: false, message: "应用名称和聊天助手ID是必填项" };
    }
    
    const requestData = {
      name,
      description: description || '',
      chatbot_id: chatbotId
    };

    console.log("创建应用程序:", requestData);

    // 调用API创建应用程序
    const response = await fetch(`${env.apiBaseUrl}/api/v1/app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    const responseData = await response.json();

    if (responseData.code === 0) {
      return { success: true, data: responseData.data };
    } else {
      console.error("创建应用程序失败:", responseData.message);
      return { success: false, message: responseData.message || "创建应用程序失败" };
    }
  } catch (error) {
    console.error("创建应用程序过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 删除应用程序
 */
export async function deleteApplication(applicationId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log("删除应用程序:", applicationId);

    // 调用API删除应用程序
    const response = await fetch(`${env.apiBaseUrl}/api/v1/app/${applicationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseData = await response.json();

    if (responseData.code === 0) {
      return { success: true };
    } else {
      console.error("删除应用程序失败:", responseData.message);
      return { success: false, message: responseData.message || "删除应用程序失败" };
    }
  } catch (error) {
    console.error("删除应用程序过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 获取应用程序详情
 */
export async function getApplicationDetail(applicationId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: null };
    }

    console.log("获取应用程序详情:", applicationId);

    // 调用API获取应用程序详情
    const response = await fetch(`${env.apiBaseUrl}/api/v1/app/${applicationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const responseData = await response.json();

    if (responseData.code === 0) {
      return { success: true, data: responseData.data };
    } else {
      console.error("获取应用程序详情失败:", responseData.message);
      return { success: false, message: responseData.message || "获取应用程序详情失败", data: null };
    }
  } catch (error) {
    console.error("获取应用程序详情过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: null };
  }
}

/**
 * 向应用程序发送消息
 */
export async function sendMessageToApplication(applicationId: string, message: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: null };
    }

    console.log("向应用程序发送消息:", applicationId, message.substring(0, 50) + (message.length > 50 ? "..." : ""));

    // 调用API发送消息
    const response = await fetch(`${env.apiBaseUrl}/api/v1/app/${applicationId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ message })
    });

    const responseData = await response.json();

    if (responseData.code === 0) {
      return { success: true, data: responseData.data };
    } else {
      console.error("发送消息失败:", responseData.message);
      return { success: false, message: responseData.message || "发送消息失败", data: null };
    }
  } catch (error) {
    console.error("发送消息过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: null };
  }
} 