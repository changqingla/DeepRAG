import { X, Copy, Check } from "lucide-react";
import { useCallback, useState } from "react";

import { ScrollContainer } from "./scroll-container";
import { Markdown } from "./markdown";
import { ResearchActivitiesBlock } from "./research-activities-block";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useChatStore, useMessage } from "@/src/store/chat-store";

export function ResearchBlock({
  className,
  researchId = null,
}: {
  className?: string;
  researchId: string | null;
}) {
  const message = useMessage(researchId);
  const [activeTab, setActiveTab] = useState("details");
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    useChatStore.getState().closeResearch();
  }, []);

  const handleCopy = useCallback(() => {
    if (!message?.content) return;
    
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    });
  }, [message?.content]);

  if (!researchId || !message) {
    return null;
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <Card className={cn("relative h-full w-full pt-4", className)}>
        {/* 头部控制按钮 */}
        <div className="absolute right-4 top-4 flex h-9 items-center justify-center space-x-2">
          {message.content && (
            <Button
              className="text-gray-400 hover:text-gray-600"
              size="icon"
              variant="ghost"
              onClick={handleCopy}
              title="复制内容"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          <Button
            className="text-gray-400 hover:text-gray-600"
            size="sm"
            variant="ghost"
            onClick={handleClose}
            title="关闭"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          className="flex h-full w-full flex-col"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="flex w-full justify-center">
            <TabsList>
              <TabsTrigger className="px-8" value="details">
                详情
              </TabsTrigger>
              <TabsTrigger className="px-8" value="activities">
                活动
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent
            className="h-full min-h-0 flex-grow px-8"
            value="details"
          >
            <ScrollContainer
              className="h-full pb-4"
              scrollShadowColor="var(--card)"
              autoScrollToBottom={message.isStreaming}
            >
              <div className="mt-4">
                <ResearchDetailsBlock message={message} />
              </div>
            </ScrollContainer>
          </TabsContent>
          
          <TabsContent
            className="h-full min-h-0 flex-grow px-8"
            value="activities"
          >
            <ScrollContainer
              className="h-full pb-4"
              scrollShadowColor="var(--card)"
            >
              <div className="mt-4">
                <ResearchActivitiesBlock researchId={researchId} />
              </div>
            </ScrollContainer>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function ResearchDetailsBlock({ message }: { message: any }) {
  return (
    <div className="space-y-4">
      {/* Agent信息 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-lg">
            {message.agent === "researcher" && "🔍"}
            {message.agent === "coder" && "💻"}
            {message.agent === "reporter" && "📝"}
          </div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {message.agent === "researcher" && "研究员"}
            {message.agent === "coder" && "编码员"}
            {message.agent === "reporter" && "报告员"}
          </h3>
          <div className={cn(
            "px-2 py-1 rounded-full text-xs",
            message.isStreaming 
              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          )}>
            {message.isStreaming ? "进行中" : "已完成"}
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          线程ID: {message.threadId}
        </p>
      </div>

      {/* 内容 */}
      {message.content && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">内容</h4>
          <div className="prose dark:prose-invert max-w-none">
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
      )}

      {/* 工具调用 */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">工具调用</h4>
          <div className="space-y-2">
            {message.toolCalls.map((toolCall: any, index: number) => (
              <div key={index} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {toolCall.name}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  参数: {JSON.stringify(toolCall.args, null, 2)}
                </div>
                {toolCall.result && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    结果: {toolCall.result}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

 