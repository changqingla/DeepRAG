import { ArrowUp, Loader2 } from "lucide-react";
import { useCallback, useRef, useState, KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Resource } from "@/src/store/chat-store";

export function InputBox({
  className,
  responding,
  onSend,
  onCancel,
}: {
  className?: string;
  responding?: boolean;
  onSend?: (
    message: string,
    options?: {
      interruptFeedback?: string;
      resources?: Array<Resource>;
    },
  ) => void;
  onCancel?: () => void;
}) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = useCallback(
    (messageText: string, resources: Array<Resource> = []) => {
      if (responding) {
        onCancel?.();
      } else {
        if (messageText.trim() === "") {
          return;
        }
        if (onSend) {
          onSend(messageText, { resources });
          setMessage("");
          // 重置textarea高度
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        }
      }
    },
    [responding, onCancel, onSend],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div
      className={cn(
        "relative flex items-end space-x-3 rounded-2xl border bg-white p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          placeholder="在这里输入消息..."
          className="min-h-[40px] max-h-[120px] resize-none border-0 p-0 text-base bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={responding}
          rows={1}
        />
      </div>
      
      <Button
        onClick={() => handleSendMessage(message)}
        disabled={!message.trim() && !responding}
        className={cn(
          "h-10 w-10 rounded-full p-0 transition-all duration-200",
          responding 
            ? "bg-red-500 hover:bg-red-600" 
            : message.trim()
              ? "bg-blue-500 hover:bg-blue-600" 
              : "bg-gray-300 cursor-not-allowed"
        )}
        title={responding ? "停止生成" : "发送消息"}
      >
        {responding ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <ArrowUp className="h-5 w-5 text-white" />
        )}
      </Button>
    </div>
  );
} 