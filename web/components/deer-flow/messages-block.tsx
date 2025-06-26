import { useCallback, useRef } from "react";

import { ConversationStarter } from "./conversation-starter";
import { InputBox } from "./input-box";
import { MessageListView } from "./message-list-view";
import { Welcome } from "./welcome";
import { cn } from "@/lib/utils";
import { useChatStore, sendMessage } from "@/src/store/chat-store";
import type { Option } from "@/src/store/chat-store";

export function MessagesBlock({ className }: { className?: string }) {
  const messageCount = useChatStore((state) => state.messageIds.length);
  const responding = useChatStore((state) => state.responding);
  
  // 使用本地的AbortController ref，类似DeerFlow
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (
    message: string,
    options?: { interruptFeedback?: string }
  ) => {
    // 为每个请求创建新的AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      await sendMessage(message, {
        ...options,
        abortSignal: abortController.signal
      });
    } catch {
      // 静默处理错误，让sendMessage函数自己处理
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    console.log("🛑 handleCancel: 用户点击停止按钮");
    if (abortControllerRef.current) {
      console.log("⚡ handleCancel: 找到本地AbortController，调用abort()");
      abortControllerRef.current.abort("User cancelled from button click");
      abortControllerRef.current = null;
      console.log("✅ handleCancel: abort()已调用并清理ref");
    } else {
      console.warn("⚠️ handleCancel: 没有找到本地AbortController");
    }
  }, []);

  const handleFeedback = useCallback((feedback: { option: Option }) => {
    // 实现反馈逻辑
    console.log("Feedback:", feedback);
  }, []);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* 消息列表区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {messageCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <Welcome />
            {!responding && (
              <ConversationStarter
                className="w-full max-w-2xl"
                onSend={handleSend}
              />
            )}
          </div>
        ) : (
          <MessageListView
            className="flex-1"
            onFeedback={handleFeedback}
            onSendMessage={handleSend}
          />
        )}
      </div>

      {/* 输入区域 */}
      <div className="flex h-42 shrink-0 pb-4">
        <InputBox
          className="h-full w-full"
          responding={responding}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
} 