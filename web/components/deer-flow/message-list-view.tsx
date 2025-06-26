import { motion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";

import { LoadingAnimation } from "./loading-animation";
import { Markdown } from "./markdown";
import { RainbowText } from "./rainbow-text";
import { RollingText } from "./rolling-text";
import {
  ScrollContainer,
  type ScrollContainerRef,
} from "./scroll-container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Message, Option } from "@/src/store/chat-store";
import {
  useChatStore,
  useMessage,
  useMessageIds,
} from "@/src/store/chat-store";
import { parseJSON, parseStreamingJSON } from "@/utils/json";

export function MessageListView({
  className,
  onFeedback,
  onSendMessage,
}: {
  className?: string;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
}) {
  const scrollContainerRef = useRef<ScrollContainerRef>(null);
  const messageIds = useMessageIds();
  const responding = useChatStore((state) => state.responding);
  const openResearchId = useChatStore((state) => state.openResearchId);
  const noOngoingResearch = useChatStore(
    (state) => state.ongoingResearchId === null,
  );
  const ongoingResearchIsOpen = useChatStore(
    (state) => state.ongoingResearchId === state.openResearchId,
  );

  const handleToggleResearch = useCallback(() => {
    // 切换研究视图时自动滚动到底部
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollToBottom();
      }
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <ScrollContainer
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
      scrollShadowColor="var(--background)"
      autoScrollToBottom
      ref={scrollContainerRef}
    >
      <ul className="flex flex-col">
        {messageIds.map((messageId) => (
          <MessageListItem
            key={messageId}
            messageId={messageId}
            onFeedback={onFeedback}
            onSendMessage={onSendMessage}
            onToggleResearch={handleToggleResearch}
          />
        ))}
        <div className="flex h-8 w-full shrink-0"></div>
      </ul>
      {responding && (noOngoingResearch || !ongoingResearchIsOpen) && (
        <LoadingAnimation className="ml-4" />
      )}
    </ScrollContainer>
  );
}

function MessageListItem({
  className,
  messageId,
  onFeedback,
  onSendMessage,
  onToggleResearch,
}: {
  className?: string;
  messageId: string;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
  onToggleResearch?: () => void;
}) {
  const message = useMessage(messageId);
  const researchIds = useChatStore((state) => state.researchIds);
  
  const startOfResearch = useMemo(() => {
    return researchIds.includes(messageId);
  }, [researchIds, messageId]);

  if (!message) return null;

  // 只渲染符合条件的消息 - 与DeerFlow保持一致
  const shouldRender = (
    message.role === "user" ||
    message.agent === "coordinator" ||
    message.agent === "planner" ||
    message.agent === "podcast" ||
    startOfResearch ||
    // Ask模式的助手消息：role为assistant但没有agent字段
    (message.role === "assistant" && !message.agent)
  );
  
  if (!shouldRender) {
    // researcher、coder、reporter消息不直接显示，只在ResearchCard中显示
    return null;
  }

  let content: React.ReactNode;

  if (startOfResearch) {
    // 研究开始消息，显示研究卡片
    content = (
      <div className="w-full px-4">
        <ResearchCard
          researchId={message.id}
          onToggleResearch={onToggleResearch}
        />
      </div>
    );
  } else if (message.agent === "planner") {
    // Plan消息，显示结构化的计划卡片
    content = (
      <div className="w-full px-4">
        <PlanCard
          message={message}
          onFeedback={onFeedback}
          onSendMessage={onSendMessage}
        />
      </div>
    );
  } else {
    // 普通消息，显示消息气泡
    content = message.content ? (
      <div
        className={cn(
          "flex w-full px-4",
          message.role === "user" && "justify-end",
          className,
        )}
      >
        <MessageBubble message={message}>
          <div className="flex w-full flex-col text-wrap break-words">
            <Markdown
              className={cn(
                message.role === "user" &&
                  "prose-invert not-dark:text-secondary dark:text-inherit",
              )}
            >
              {message?.content}
            </Markdown>
          </div>
          {/* 显示引用来源 */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500 font-medium">引用来源：</p>
              <div className="space-y-2">
                {message.sources.map((source, index) => (
                  <div 
                    key={index} 
                    className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-200 dark:border-gray-600"
                  >
                    <div className="font-medium text-gray-700 dark:text-gray-300">{source.title}</div>
                    <div className="mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">{source.content}</div>
                    {source.url && (
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 text-blue-600 dark:text-blue-400 flex items-center hover:underline text-xs"
                      >
                        查看原文 →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </MessageBubble>
      </div>
    ) : null;
  }

  if (content) {
    return (
      <motion.li
        className="mt-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ transition: "all 0.2s ease-out" }}
        transition={{
          duration: 0.2,
          ease: "easeOut",
        }}
      >
        {content}
      </motion.li>
    );
  }

  return null;
}

function MessageBubble({
  className,
  message,
  children,
}: {
  className?: string;
  message: Message;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        `group flex w-fit max-w-[85%] flex-col rounded-2xl px-4 py-3 shadow-sm border`,
        message.role === "user" && "bg-blue-500 text-white rounded-ee-none ml-auto",
        message.role === "assistant" && "bg-white dark:bg-gray-800 rounded-es-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ResearchCard({
  className,
  researchId,
  onToggleResearch,
}: {
  className?: string;
  researchId: string;
  onToggleResearch?: () => void;
}) {
  const reportId = useChatStore((state) => state.researchReportIds.get(researchId));
  const hasReport = reportId !== undefined;
  const reportGenerating = useChatStore(
    (state) => hasReport && state.messages.get(reportId!)?.isStreaming,
  );
  const openResearchId = useChatStore((state) => state.openResearchId);
  
  const state = useMemo(() => {
    if (hasReport) {
      return reportGenerating ? "Generating report..." : "Report generated";
    }
    return "Researching...";
  }, [hasReport, reportGenerating]);
  
  // 从plan消息获取标题，就像DeerFlow一样
  const planId = useChatStore((state) => state.researchPlanIds.get(researchId));
  const planMessage = useMessage(planId);
  const title = useMemo(() => {
    if (planMessage) {
      try {
        const parsed = JSON.parse(planMessage.content ?? "{}");
        return parsed.title || "Deep Research";
      } catch {
        return "Deep Research";
      }
    }
    return "Deep Research";
  }, [planMessage]);
  
  const handleOpen = useCallback(() => {
    if (openResearchId === researchId) {
      useChatStore.getState().closeResearch();
    } else {
      useChatStore.getState().openResearch(researchId);
    }
    onToggleResearch?.();
  }, [openResearchId, researchId, onToggleResearch]);
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>
          <RainbowText animated={state !== "Report generated"}>
            {title}
          </RainbowText>
        </CardTitle>
      </CardHeader>
      <CardFooter>
        <div className="flex w-full">
          <RollingText className="text-muted-foreground flex-grow text-sm">
            {state}
          </RollingText>
          <Button
            variant={!openResearchId ? "default" : "outline"}
            onClick={handleOpen}
          >
            {researchId !== openResearchId ? "Open" : "Close"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

const GREETINGS = ["好的", "听起来不错", "看起来很好", "很棒", "太棒了"];

function PlanCard({
  className,
  message,
  onFeedback,
  onSendMessage,
}: {
  className?: string;
  message: Message;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
}) {
  const plan = useMemo<{
    locale?: string;
    has_enough_context?: boolean;
    title?: string;
    thought?: string;
    steps?: { title?: string; description?: string; need_web_search?: boolean; step_type?: string }[];
  }>(() => {
    return parseStreamingJSON(message.content ?? "");
  }, [message.content]);
  
  const handleAccept = useCallback(async () => {
    if (onSendMessage) {
      onSendMessage(
        `${GREETINGS[Math.floor(Math.random() * GREETINGS.length)]}！让我们开始吧。`,
        {
          interruptFeedback: "accepted",
        },
      );
    }
  }, [onSendMessage]);
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>
          <Markdown animated>
            {`### ${
              plan.title !== undefined && plan.title !== ""
                ? plan.title
                : "深度研究"
            }`}
          </Markdown>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {plan.thought && (
          <Markdown className="opacity-80" animated>
            {plan.thought}
          </Markdown>
        )}
        {plan.steps && plan.steps.length > 0 && (
          <ul className="my-2 flex list-decimal flex-col gap-4 border-l-[2px] pl-8">
            {plan.steps.map((step, i) => (
              <li key={`step-${i}`}>
                {step.title && (
                  <h3 className="mb text-lg font-medium">
                    <Markdown animated>{step.title}</Markdown>
                  </h3>
                )}
                {step.description && (
                  <div className="text-muted-foreground text-sm">
                    <Markdown animated>{step.description}</Markdown>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* 如果没有解析出内容，显示原始内容 */}
        {!plan.title && !plan.thought && !plan.steps && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">原始内容:</p>
            <pre className="text-xs overflow-x-auto">{message.content}</pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {!message.isStreaming && message.options?.length && (
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {message.options.map((option) => (
              <Button
                key={option.value}
                variant={option.value === "accepted" ? "default" : "outline"}
                onClick={() => {
                  if (option.value === "accepted") {
                    void handleAccept();
                  } else {
                    onFeedback?.({
                      option,
                    });
                  }
                }}
              >
                {option.text}
              </Button>
            ))}
          </motion.div>
        )}
      </CardFooter>
    </Card>
  );
} 