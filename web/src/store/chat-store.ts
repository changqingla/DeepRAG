import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { toast } from "sonner";
import { streamAgentChat, streamChat } from "@/app/actions/chat";
import { nanoid } from "nanoid";
import { deepClone, parseJSON } from "@/lib/utils";

// 类型定义
interface ToolCall {
  type: "tool_call";
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface ToolCallChunk {
  type: "tool_call_chunk";
  index: number;
  id: string;
  name: string;
  args: string;
}

interface GenericEvent<T extends string, D extends object> {
  type: T;
  data: {
    id: string;
    thread_id: string;
    agent: "coordinator" | "planner" | "researcher" | "coder" | "reporter";
    role: "user" | "assistant" | "tool";
    finish_reason?: "stop" | "tool_calls" | "interrupt";
  } & D;
}

export interface MessageChunkEvent
  extends GenericEvent<
    "message_chunk",
    {
      content?: string;
    }
  > {}

export interface ToolCallsEvent
  extends GenericEvent<
    "tool_calls",
    {
      tool_calls: ToolCall[];
      tool_call_chunks: ToolCallChunk[];
    }
  > {}

export interface ToolCallChunksEvent
  extends GenericEvent<
    "tool_call_chunks",
    {
      tool_call_chunks: ToolCallChunk[];
    }
  > {}

export interface ToolCallResultEvent
  extends GenericEvent<
    "tool_call_result",
    {
      tool_call_id: string;
      content?: string;
    }
  > {}

export interface InterruptEvent
  extends GenericEvent<
    "interrupt",
    {
      options: Option[];
    }
  > {}

export type ChatEvent =
  | MessageChunkEvent
  | ToolCallsEvent
  | ToolCallChunksEvent
  | ToolCallResultEvent
  | InterruptEvent;

import {
  type ChatSettings,
  type Message,
  type Resource,
  type ToolCallRuntime,
  type ChatMode,
} from "./types";

const THREAD_ID = nanoid();

export const useChatStore = create<any>((set: any, get: any) => ({
  // 核心状态
  responding: false,
  threadId: THREAD_ID,
  messageIds: [],
  messages: new Map<string, Message>(),
  
  // 研究相关状态（Agent模式）
  researchIds: [],
  researchPlanIds: new Map<string, string>(),
  researchReportIds: new Map<string, string>(),
  researchActivityIds: new Map<string, string[]>(),
  ongoingResearchId: null,
  openResearchId: null,
  
  // DeepRAG特有状态
  settings: {
    mode: "agent",
    chatbotId: null,
  },
  isSettingsOpen: false,
  error: null,
  
  // 消息相关动作
  appendMessage: (message: Message) => {
    set((state: any) => ({
      messageIds: [...state.messageIds, message.id],
      messages: new Map(state.messages).set(message.id, message),
    }));
  },
  
  updateMessage: (message: Message) => {
    console.log(`🏪 Store.updateMessage 被调用: ${message.id}`, {
      agent: message.agent,
      contentLength: message.content?.length || 0,
      toolCallsCount: message.toolCalls?.length || 0,
      isStreaming: message.isStreaming
    });
    
    set((state: any) => {
      const oldMessage = state.messages.get(message.id);
      console.log(`🔄 Store更新对比:`, {
        messageId: message.id,
        oldExists: !!oldMessage,
        oldContentLength: oldMessage?.content?.length || 0,
        newContentLength: message.content?.length || 0,
        oldToolCallsCount: oldMessage?.toolCalls?.length || 0,
        newToolCallsCount: message.toolCalls?.length || 0
      });
      
      return {
        messages: new Map(state.messages).set(message.id, message),
      };
    });
  },

  updateMessages(messages: Message[]) {
    set((state: any) => {
      const newMessages = new Map(state.messages);
      messages.forEach((m) => newMessages.set(m.id, m));
      return { messages: newMessages };
    });
  },
  
  clearMessages: () => {
    set({
      messageIds: [],
      messages: new Map(),
      researchIds: [],
      researchPlanIds: new Map(),
      researchReportIds: new Map(),
      researchActivityIds: new Map(),
      ongoingResearchId: null,
      openResearchId: null,
    });
  },
  
  // 研究相关动作
  openResearch: (researchId: string | null) => {
    set({ openResearchId: researchId });
  },
  
  closeResearch: () => {
    set({ openResearchId: null });
  },
  
  setOngoingResearch: (researchId: string | null) => {
    set({ ongoingResearchId: researchId });
  },
  
  // 设置相关动作
  setSettings: (settings: ChatSettings) => {
    set({ settings });
    localStorage.setItem("chat_settings", JSON.stringify(settings));
  },
  
  setIsSettingsOpen: (open: boolean) => {
    set({ isSettingsOpen: open });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
  
  setResponding: (responding: boolean) => {
    set({ responding });
  },
}));

// =================================================================
// DeerFlow实现 - 开始
// =================================================================

function mergeMessage(message: Message, event: ChatEvent): Message {
  if (event.type === "message_chunk") {
    mergeTextMessage(message, event as MessageChunkEvent);
  } else if (event.type === "tool_calls" || event.type === "tool_call_chunks") {
    mergeToolCallMessage(message, event as ToolCallsEvent | ToolCallChunksEvent);
  } else if (event.type === "tool_call_result") {
    mergeToolCallResultMessage(message, event as ToolCallResultEvent);
  } else if (event.type === "interrupt") {
    mergeInterruptMessage(message, event as InterruptEvent);
  }
  if (event.data.finish_reason) {
    message.finishReason = event.data.finish_reason;
    message.isStreaming = false;
    if (message.toolCalls) {
      message.toolCalls.forEach((toolCall) => {
        if (toolCall.argsChunks?.length) {
          toolCall.args = JSON.parse(toolCall.argsChunks.join(""));
          delete toolCall.argsChunks;
        }
      });
    }
  }
  return deepClone(message);
}

function mergeTextMessage(message: Message, event: MessageChunkEvent) {
  if (event.data.content) {
    message.content += event.data.content;
    message.contentChunks.push(event.data.content);
  }
}

function mergeToolCallMessage(
  message: Message,
  event: ToolCallsEvent | ToolCallChunksEvent,
) {
  if (event.type === "tool_calls" && event.data.tool_calls[0]?.name) {
    message.toolCalls = event.data.tool_calls.map((raw: any) => ({
      id: raw.id,
      name: raw.name,
      args: raw.args,
      result: undefined,
    }));
  }

  message.toolCalls ??= [];
  for (const chunk of event.data.tool_call_chunks) {
    if (chunk.id) {
      const toolCall = message.toolCalls.find(
        (toolCall) => toolCall.id === chunk.id,
      );
      if (toolCall) {
        toolCall.argsChunks = [chunk.args];
      }
    } else {
      const streamingToolCall = message.toolCalls.find(
        (toolCall) => toolCall.argsChunks?.length,
      );
      if (streamingToolCall) {
        streamingToolCall.argsChunks!.push(chunk.args);
      }
    }
  }
}

function mergeToolCallResultMessage(
  message: Message,
  event: ToolCallResultEvent,
) {
  const toolCall = message.toolCalls?.find(
    (toolCall) => toolCall.id === event.data.tool_call_id,
  );
  if (toolCall) {
    toolCall.result = event.data.content;
  }
}

function mergeInterruptMessage(message: Message, event: InterruptEvent) {
  message.isStreaming = false;
  message.options = event.data.options;
}

// 解析SSE事件块（参考deerflow实现）


export async function sendMessage(
  content?: string,
  options: {
    interruptFeedback?: string;
    resources?: Array<Resource>;
    abortSignal?: AbortSignal;
  } = {},
) {
  const state = useChatStore.getState();
  const { settings } = state;
  
  if (settings.mode === "ask" && !settings.chatbotId) {
    state.setError("Ask模式下需要选择聊天助手");
    state.setIsSettingsOpen(true);
    return;
  }
  
  state.setError(null);
  
  if (content != null) {
    _appendMessage({
      id: nanoid(),
      threadId: state.threadId,
      role: "user",
      content: content,
      contentChunks: [content],
      createdAt: new Date(),
      resources: options.resources,
    });
  }

  _setResponding(true);
  let messageId: string | undefined;
  
  try {
    if (settings.mode === "ask") {
      console.log("💬 Ask模式开始流式响应");
      
      // Ask模式使用Server Action
      const { streamChat } = await import("@/app/actions/chat");
      
      const responseStream = await streamChat({
        message: content ?? "[REPLAY]",
        chatbotId: settings.chatbotId!,
        chatId: null,
        parentMessageId: null,
      });
      
      const reader = responseStream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      // 创建助手消息
      const assistantMessageId = nanoid();
      const assistantMessage: Message = {
        id: assistantMessageId,
        threadId: state.threadId,
        role: "assistant",
        content: "",
        contentChunks: [],
        isStreaming: true,
        createdAt: new Date(),
      };
      _appendMessage(assistantMessage);
      messageId = assistantMessageId;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const chunk = parsed.choices[0].delta.content;
                  assistantMessage.content += chunk;
                  assistantMessage.contentChunks.push(chunk);
                  _updateMessage({ ...assistantMessage });
                }
                
                if (parsed.choices?.[0]?.finish_reason) {
                  assistantMessage.isStreaming = false;
                  _updateMessage({ ...assistantMessage });
                  break;
                }
              } catch (parseError) {
                console.error("解析OpenAI格式数据失败:", parseError, data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
    } else if (settings.mode === "agent") {
      console.log("🎯 Agent模式开始流式响应");
      
      // 直接在客户端调用API，而不是通过Server Action
      // 从cookie获取API Key
      const apiKey = document.cookie
        .split('; ')
        .find(row => row.startsWith('ragflow_api_key='))
        ?.split('=')[1];
      
      if (!apiKey) {
        throw new Error("API密钥未配置，请先登录");
      }
      
      const fullUrl = `${process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'http://10.0.169.144:8000'}/api/chat/stream`;
      
      const requestBody = {
        messages: [{ role: "user", content: content ?? "[REPLAY]" }],
        debug: false,
        thread_id: state.threadId,
        max_plan_iterations: 1,
        max_step_num: 3,
        max_search_results: 3,
        auto_accepted_plan: true,
        interrupt_feedback: "",
        mcp_settings: {},
        enable_background_investigation: false
      };
      
      console.log("📡 客户端直接发送请求体:", JSON.stringify(requestBody, null, 2));
      
      console.log("🔄 发起fetch请求，AbortSignal:", options.abortSignal);
      
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

      // 手动解析SSE流
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
        
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
            
            // 解析SSE事件
            let eventType = "message";
            let eventData: string | null = null;
            for (const line of chunk.split("\n")) {
              const pos = line.indexOf(": ");
              if (pos === -1) {
                continue;
              }
              const key = line.slice(0, pos);
              const value = line.slice(pos + 2);
              if (key === "event") {
                eventType = value;
              } else if (key === "data") {
                eventData = value;
              }
            }
            
            if (eventType === "message" && eventData === null) {
              continue;
            }
            
            if (eventData) {
              try {
                const event = {
                  type: eventType,
                  data: JSON.parse(eventData),
                };
                
                const { type, data } = event;
                messageId = data.id;
                let message: Message | undefined;
                
                if (type === "tool_call_result") {
                  message = _findMessageByToolCallId(data.tool_call_id);
                } else if (!_existsMessage(messageId)) {
                  message = {
                    id: messageId,
                    threadId: data.thread_id,
                    agent: data.agent,
                    role: data.role,
                    content: "",
                    contentChunks: [],
                    isStreaming: true,
                    createdAt: new Date(),
                    interruptFeedback: options.interruptFeedback,
                  };
                  _appendMessage(message);
                }
                
                message ??= _getMessage(messageId);
                if (message) {
                  message = mergeMessage(message, event);
                  _updateMessage(message);
                }
              } catch (parseError) {
                console.error("解析事件数据失败:", parseError, eventData);
              }
            }
          }
        }
      } finally {
        console.log("🔧 流处理循环结束 (finally block)。");
        reader.releaseLock();
      }
    }
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log("🛑 ABORT-ERROR 已捕获: 请求已成功中止。");
    } else {
      console.error("❌ SEND-MESSAGE-ERROR:", error);
      toast.error("出错了", {
        description: error.message || "发送消息失败，请稍后再试",
      });
    }
    
    // 清理任何正在流式传输的消息
    if (messageId != null) {
      const message = _getMessage(messageId);
      if (message?.isStreaming) {
        console.log(`🧹 正在清理流式消息: ${messageId}`);
        message.isStreaming = false;
        _updateMessage(message);
      }
    }
    useChatStore.getState().setOngoingResearch(null);
  } finally {
    console.log("🔧 SEND-MESSAGE-FINALLY: 正在清理最终状态 (responding=false)");
    _setResponding(false);
  }
}

function _setResponding(value: boolean) {
  useChatStore.getState().setResponding(value);
}

function _existsMessage(id: string) {
  return useChatStore.getState().messageIds.includes(id);
}

function _getMessage(id: string) {
  return useChatStore.getState().messages.get(id);
}

function _findMessageByToolCallId(toolCallId: string) {
  return Array.from(useChatStore.getState().messages.values())
    .reverse()
    .find((message) => {
      if (message.toolCalls) {
        return message.toolCalls.some((toolCall) => toolCall.id === toolCallId);
      }
      return false;
    });
}

function _appendMessage(message: Message) {
  console.log(`📝 _appendMessage被调用:`, {
    id: message.id,
    agent: message.agent,
    isStreaming: message.isStreaming,
    toolCallsCount: message.toolCalls?.length || 0,
    ongoingResearchId: _getOngoingResearchId()
  });
  
  if (
    message.agent === "coder" ||
    message.agent === "reporter" ||
    message.agent === "researcher"
  ) {
    if (!_getOngoingResearchId()) {
      const id = message.id;
      console.log(`🆕 创建新research:`, id);
      _appendResearch(id);
      useChatStore.getState().openResearch(id);
    }
    _appendResearchActivity(message);
  }
  useChatStore.getState().appendMessage(message);
}

function _updateMessage(message: Message) {
  console.log(`💾 _updateMessage被调用:`, {
    id: message.id,
    agent: message.agent,
    isStreaming: message.isStreaming,
    toolCallsCount: message.toolCalls?.length || 0,
    ongoingResearchId: _getOngoingResearchId()
  });
  
  if (
    _getOngoingResearchId() &&
    message.agent === "reporter" &&
    !message.isStreaming
  ) {
    console.log(`🔚 研究结束条件满足，设置ongoingResearch为null:`, {
      researchId: _getOngoingResearchId(),
      messageId: message.id,
      agent: message.agent,
      isStreaming: message.isStreaming
    });
    useChatStore.getState().setOngoingResearch(null);
  }
  useChatStore.getState().updateMessage(message);
}

function _getOngoingResearchId() {
  return useChatStore.getState().ongoingResearchId;
}

function _appendResearch(researchId: string) {
  let planMessage: Message | undefined;
  const state = useChatStore.getState();
  const reversedMessageIds = [...state.messageIds].reverse();
  for (const messageId of reversedMessageIds) {
    const message = _getMessage(messageId);
    if (message?.agent === "planner") {
      planMessage = message;
      break;
    }
  }
  const messageIds = [researchId];
  messageIds.unshift(planMessage!.id); // DeerFlow原版直接使用planMessage!，假设一定存在
  
  useChatStore.setState({
    ongoingResearchId: researchId,
    researchIds: [...state.researchIds, researchId],
    researchPlanIds: new Map(state.researchPlanIds).set(researchId, planMessage!.id),
    researchActivityIds: new Map(state.researchActivityIds).set(
      researchId,
      messageIds,
    ),
  });
}

function _appendResearchActivity(message: Message) {
  const researchId = _getOngoingResearchId();
  console.log(`🔗 _appendResearchActivity被调用:`, {
    messageId: message.id,
    agent: message.agent,
    researchId,
    hasResearchId: !!researchId
  });
  
  if (researchId) {
    const state = useChatStore.getState();
    const researchActivityIds = state.researchActivityIds;
    const current = researchActivityIds.get(researchId)!;
    
    console.log(`📋 当前研究活动:`, {
      researchId,
      currentActivities: current,
      messageAlreadyExists: current.includes(message.id)
    });
    
    if (!current.includes(message.id)) {
      const newActivities = [...current, message.id];
      console.log(`➕ 添加新活动到研究:`, {
        researchId,
        from: current,
        to: newActivities,
        addedMessageId: message.id
      });
      
      useChatStore.setState({
        researchActivityIds: new Map(researchActivityIds).set(researchId, newActivities),
      });
      
      // 验证更新结果
      const afterUpdate = useChatStore.getState().researchActivityIds.get(researchId);
      console.log(`✅ 研究活动更新结果:`, {
        researchId,
        activitiesAfterUpdate: afterUpdate,
        updateSuccess: afterUpdate?.includes(message.id)
      });
    } else {
      console.log(`ℹ️ 消息已存在于研究活动中:`, message.id);
    }
    
    if (message.agent === "reporter") {
      useChatStore.setState({
        researchReportIds: new Map(state.researchReportIds).set(
          researchId,
          message.id,
        ),
      });
    }
  } else {
    console.log(`❌ 没有ongoing research，无法添加活动:`, message.id);
  }
}

// =================================================================
// DeerFlow实现 - 结束
// =================================================================

// 便捷的选择器hooks
export const useMessage = (messageId: string | null | undefined) => {
  return useChatStore(useShallow((state: any) => 
    messageId ? state.messages.get(messageId) : undefined
  ));
};

export const useMessageIds = () => {
  return useChatStore((state: any) => state.messageIds);
};

export const useResearchMessage = (researchId: string) => {
  return useChatStore((state: any) => state.messages.get(researchId));
};

// 初始化函数 - 从localStorage恢复设置
export const initializeChatStore = () => {
  const storedSettings = localStorage.getItem("chat_settings");
  if (storedSettings) {
    try {
      const settings = JSON.parse(storedSettings);
      useChatStore.getState().setSettings(settings);
    } catch (e) {
      console.error("Failed to parse chat settings from localStorage", e);
    }
  }
}; 