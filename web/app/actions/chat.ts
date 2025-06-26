"use server"

import { env } from '@/src/config/env'
import { getRagFlowApiKey } from '@/lib/authUtils'
import { ReadableStream } from 'stream/web'

/**
 * 创建新对话
 */
export async function createChat(name: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: null };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name
      })
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return { success: true, data: data.data };
    } else {
      console.error("创建对话失败:", data.message);
      return { success: false, message: data.message || "创建对话失败", data: null };
    }
  } catch (error) {
    console.error("创建对话过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: null };
  }
}

/**
 * 获取对话列表
 */
export async function getChats() {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chat`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return { success: true, data: data.data || [] };
    } else {
      console.error("获取对话列表失败:", data.message);
      return { success: false, message: data.message || "获取对话列表失败", data: [] };
    }
  } catch (error) {
    console.error("获取对话列表过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 获取对话历史消息
 */
export async function getChatHistory(chatId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置", data: [] };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chat/${chatId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return { success: true, data: data.data || [] };
    } else {
      console.error("获取对话历史失败:", data.message);
      return { success: false, message: data.message || "获取对话历史失败", data: [] };
    }
  } catch (error) {
    console.error("获取对话历史过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试", data: [] };
  }
}

/**
 * 发送消息并获取流式响应
 */
export async function sendMessage(chatId: string, message: string, datasetIds?: string[]) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      throw new Error("API密钥未配置");
    }

    // 构建请求参数
    const requestBody: any = {
      message,
      stream: true
    };
    
    if (datasetIds && datasetIds.length > 0) {
      requestBody.knowledge_ids = datasetIds;
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chat/${chatId}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "发送消息失败");
    }

    if (!response.body) {
      throw new Error("响应体为空");
    }

    return response.body as ReadableStream<Uint8Array>;
  } catch (error) {
    console.error("发送消息过程中发生错误:", error);
    throw error;
  }
}

/**
 * 删除对话
 */
export async function deleteChat(chatId: string) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    // 调用API
    const response = await fetch(`${env.apiBaseUrl}/api/v1/chat/${chatId}`, {
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
      console.error("删除对话失败:", data.message);
      return { success: false, message: data.message || "删除对话失败" };
    }
  } catch (error) {
    console.error("删除对话过程中发生错误:", error);
    return { success: false, message: "服务器错误，请稍后再试" };
  }
}

/**
 * 流式聊天接口
 */
export async function streamChat(params: {
  message: string;
  chatbotId: string;
  chatId?: string | null; 
  parentMessageId?: string | null;
}) {
  try {
    // 获取用户API Key
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      throw new Error("API密钥未配置");
    }

    const { message, chatbotId } = params; 
    console.log("流式聊天请求 (OpenAI format):", { chatbotId, message: message.substring(0, 50) + (message.length > 50 ? "..." : "") });

    // 构建请求URL - 使用 _openai 路径
    const url = `${env.apiBaseUrl}/api/v1/chats_openai/${chatbotId}/chat/completions`;

    // 调用API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      // 构建符合 OpenAI API 的请求体
      body: JSON.stringify({
        "model": "model", // As per curl command
        "messages": [{"role": "user", "content": message}],
        "stream": true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "发送消息失败");
    }

    if (!response.body) {
      throw new Error("响应体为空");
    }

    // 显式管道处理流数据以确保稳定性
    const sourceStream = response.body;
    const newStream = new ReadableStream({
      async start(controller) {
        console.log("[ServerAction streamChat] Piping source stream to client...");
        const reader = sourceStream.getReader(); 
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("[ServerAction streamChat] Source stream finished.");
              break;
            }
            controller.enqueue(value);
          }
        } catch (e: any) {
          console.error("[ServerAction streamChat] Error reading from source stream:", e.message);
          controller.error(e);
        } finally {
          console.log("[ServerAction streamChat] Closing controller for client stream.");
          controller.close(); 
        }
      },
      cancel(reason) {
        console.log("[ServerAction streamChat] Client cancelled stream. Reason:", reason);
        sourceStream.cancel(reason).catch((e: any) => {
          console.error("[ServerAction streamChat] Error cancelling source stream:", e.message);
        });
      }
    });

    return newStream as ReadableStream<Uint8Array>;

  } catch (error) {
    console.error("流式聊天过程中发生错误:", error);
    throw error;
  }
}

interface StreamEvent {
  event: string;
  data: string;
}

async function* fetchStream(
  url: string,
  init: RequestInit,
): AsyncIterable<StreamEvent> {
  const response = await fetch(url, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      ...init.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Agent API调用失败: ${response.status} ${errorData}`);
  }
  
  // Read from response body, event by event. An event always ends with a '\n\n'.
  const reader = response.body
    ?.pipeThrough(new TextDecoderStream())
    .getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }
  
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += value;
      while (true) {
        const index = buffer.indexOf("\n\n");
        if (index === -1) {
          break;
        }
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const event = parseEvent(chunk);
        if (event) {
          yield event;
        }
      }
    }
  } finally {
    // 确保释放reader资源
    reader.releaseLock();
  }
}

function parseEvent(chunk: string) {
  let resultEvent = "message";
  let resultData: string | null = null;
  for (const line of chunk.split("\n")) {
    const pos = line.indexOf(": ");
    if (pos === -1) {
      continue;
    }
    const key = line.slice(0, pos);
    const value = line.slice(pos + 2);
    if (key === "event") {
      resultEvent = value;
    } else if (key === "data") {
      resultData = value;
    }
  }
  if (resultEvent === "message" && resultData === null) {
    return undefined;
  }
  return {
    event: resultEvent,
    data: resultData,
  } as StreamEvent;
}

export async function streamAgentChat(
  userMessage: string,
  params: {
    threadId: string;
    chatbotId?: string;
    useContext?: boolean;
    includeKnowledge?: boolean;
    useKnowledgeRetrieval?: boolean;
    resources?: any[];
  },
  options: { abortSignal?: AbortSignal } = {},
) {
  console.log("🚀 streamAgentChat开始:", { userMessage, params });
  
  // 获取用户API Key
  const apiKey = await getRagFlowApiKey();
  if (!apiKey) {
    throw new Error("API密钥未配置");
  }

  const { 
    threadId,
    chatbotId,
    useContext = false,
    includeKnowledge = false,
    useKnowledgeRetrieval = false,
    resources = []
  } = params;

  console.log("Agent模式流式聊天请求:", { 
    message: userMessage.substring(0, 50) + (userMessage.length > 50 ? "..." : ""),
    threadId,
    useContext,
    includeKnowledge
  });

  // 构建完整的URL
  const fullUrl = `${env.agentApiBaseUrl}/api/chat/stream`;
  
  const requestBody = {
    messages: [{ role: "user", content: userMessage }],
    debug: false,
    thread_id: threadId,
    max_plan_iterations: 1,
    max_step_num: 3,
    max_search_results: 3,
    auto_accepted_plan: true,
    interrupt_feedback: "",
    mcp_settings: {},
    enable_background_investigation: false
  };
  
  console.log("📡 发送请求体:", JSON.stringify(requestBody, null, 2));
  
  // 直接返回fetch响应
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal: options.abortSignal,
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Agent API调用失败: ${response.status} ${errorData}`);
  }
  
  if (!response.body) {
    throw new Error("Response body is not readable");
  }
  
  return response.body;
}

/**
 * 更新聊天助手 (Chat/Chatbot)
 */
export async function updateChat(chatId: string, updates: { name?: string /* Add other editable fields here */ }) {
  if (!chatId) {
    return { success: false, message: "Chat ID is required." };
  }
  if (!updates || Object.keys(updates).length === 0) {
    return { success: false, message: "No updates provided." };
  }

  try {
    const apiKey = await getRagFlowApiKey();
    if (!apiKey) {
      return { success: false, message: "API密钥未配置" };
    }

    console.log(`[updateChat] Updating chat ${chatId} with:`, updates);

    const response = await fetch(`${env.apiBaseUrl}/api/v1/chats/${chatId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(updates),
    });

    if (response.status === 200 || response.status === 204) { // 204 No Content can also be a success
      // Try to parse JSON only if there's content, otherwise assume success for 204
      let data = null;
      if (response.status === 200) {
        try {
          data = await response.json();
        } catch (e) {
          // If JSON parsing fails for 200, it might be an issue, but API doc implies simple {code:0} or empty for success
          console.warn('[updateChat] Response was 200 but failed to parse JSON. Assuming success based on status.');
        }
      }

      // According to docs, success is { "code": 0 }
      // If data is null (e.g. 204 or parsing failed for 200 but status is ok), or if data.code is 0
      if (data === null || data.code === 0) {
        console.log(`[updateChat] Successfully updated chat ${chatId}. Response data:`, data);
        return { success: true, message: "聊天助手已更新", data: data };
      }
      // If there is data but code is not 0, it's an API-level error despite 200 OK
      console.error(`[updateChat] Failed to update chat ${chatId}. Status: 200, API Code: ${data?.code}, Message: ${data?.message}`);
      return { success: false, message: data.message || "更新失败，但收到意外的成功状态码。" };
    }
    
    // Handle other error statuses
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText };
    }

    console.error(`[updateChat] Failed to update chat ${chatId}. Status: ${response.status}, Message: ${errorData?.message}`);
    return { 
      success: false, 
      message: errorData.message || `更新聊天助手失败 (HTTP ${response.status})` 
    };

  } catch (error: any) {
    console.error(`[updateChat] Error updating chat ${chatId}:`, error);
    return { success: false, message: error.message || "更新聊天助手时发生服务器错误" };
  }
} 