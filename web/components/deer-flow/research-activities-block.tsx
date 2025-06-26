import { motion } from "framer-motion";
import { Search, BookOpenText, FileText, Code, Terminal, PencilRuler } from "lucide-react";
import { useMemo } from "react";
import { useTheme } from "next-themes";

import { LoadingAnimation } from "./loading-animation";
import { Markdown } from "./markdown";
import { RainbowText } from "./rainbow-text";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessage, useChatStore } from "@/src/store/chat-store";
import { cn } from "@/lib/utils";
import { parseJSON } from "@/utils/json";
import type { ToolCallRuntime } from "@/src/store/types";

export function ResearchActivitiesBlock({
  className,
  researchId,
}: {
  className?: string;
  researchId: string;
}) {
  const activityIds = useChatStore((state) =>
    state.researchActivityIds.get(researchId),
  ) || [];
  const ongoing = useChatStore((state) => state.ongoingResearchId === researchId);
  
  return (
    <>
      <ul className={cn("flex flex-col py-4", className)}>
        {activityIds.map(
          (activityId, i) =>
            i !== 0 && (
              <motion.li
                key={activityId}
                style={{ transition: "all 0.4s ease-out" }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  ease: "easeOut",
                }}
              >
                <ActivityMessage messageId={activityId} />
                <ActivityListItem messageId={activityId} />
                {i !== activityIds.length - 1 && <hr className="my-8" />}
              </motion.li>
            ),
        )}
      </ul>
      {ongoing && <LoadingAnimation className="mx-4 my-12" />}
    </>
  );
}

function ActivityMessage({ messageId }: { messageId: string }) {
  const message = useMessage(messageId);
  if (message?.agent && message.content) {
    if (message.agent !== "reporter" && message.agent !== "planner") {
      return (
        <div className="px-4 py-2">
          <Markdown animated>
            {message.content}
          </Markdown>
        </div>
      );
    }
  }
  return null;
}

function ActivityListItem({ messageId }: { messageId: string }) {
  const message = useMessage(messageId);
  
  console.log(`🔍 ActivityListItem渲染:`, {
    messageId,
    exists: !!message,
    agent: message?.agent,
    isStreaming: message?.isStreaming,
    toolCallsCount: message?.toolCalls?.length || 0,
    toolCallNames: message?.toolCalls?.map(tc => tc.name) || []
  });
  
  if (message) {
    if (!message.isStreaming && message.toolCalls?.length) {
      console.log(`✅ 渲染工具调用:`, {
        messageId,
        toolCalls: message.toolCalls.map(tc => ({ id: tc.id, name: tc.name, hasResult: !!tc.result }))
      });
      
      for (const toolCall of message.toolCalls) {
        if (toolCall.name === "web_search") {
          return <WebSearchToolCall key={toolCall.id} toolCall={toolCall} />;
        } else if (toolCall.name === "crawl_tool") {
          return <CrawlToolCall key={toolCall.id} toolCall={toolCall} />;
        } else if (toolCall.name === "python_repl_tool") {
          return <PythonToolCall key={toolCall.id} toolCall={toolCall} />;
        } else if (toolCall.name === "local_search_tool") {
          return <RetrieverToolCall key={toolCall.id} toolCall={toolCall} />;
        } else if (toolCall.name === "rag_tool") {
          return <RetrieverToolCall key={toolCall.id} toolCall={toolCall} />;
        } else {
          return <MCPToolCall key={toolCall.id} toolCall={toolCall} />;
        }
      }
    } else {
      console.log(`❌ 不渲染工具调用:`, {
        messageId,
        isStreaming: message.isStreaming,
        toolCallsLength: message.toolCalls?.length || 0,
        reason: message.isStreaming ? 'still streaming' : 'no tool calls'
      });
    }
  } else {
    console.log(`❌ 消息不存在:`, { messageId });
  }
  return null;
}

function WebSearchToolCall({ toolCall }: { toolCall: ToolCallRuntime }) {
  const searching = useMemo(() => {
    return toolCall.result === undefined;
  }, [toolCall.result]);
  
  const searchResults = useMemo(() => {
    let results: any[] = [];
    try {
      results = toolCall.result ? parseJSON(toolCall.result, []) : [];
    } catch {
      results = [];
    }
    if (Array.isArray(results)) {
      results.forEach((result) => {
        if (result.type === "page" && result.url && result.title) {
          __pageCache.set(result.url, result.title);
        }
      });
    } else {
      results = [];
    }
    return results;
  }, [toolCall.result]);

  const pageResults = searchResults.filter((result) => result.type === "page" || result.title);
  const imageResults = searchResults.filter((result) => result.type === "image" || result.image_url);

  return (
    <section className="mt-4 pl-4">
      <div className="font-medium italic">
        <RainbowText
          className="flex items-center"
          animated={searching}
        >
          <Search size={16} className="mr-2" />
          <span>正在搜索: </span>
          <span className="max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap">
            {(toolCall.args as { query: string }).query}
          </span>
        </RainbowText>
      </div>
      <div className="pr-4">
        {pageResults.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-4">
            {searching &&
              [...Array(4)].map((_, i) => (
                <li
                  key={`search-result-${i}`}
                  className="flex h-20 w-40 gap-2 rounded-md text-sm"
                >
                  <Skeleton
                    className="h-full w-full rounded-md bg-gradient-to-tl from-slate-400 to-accent"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                </li>
              ))}
            {pageResults.map((searchResult, i) => (
              <motion.li
                key={`search-result-${i}`}
                className="text-muted-foreground bg-accent flex max-w-40 gap-2 rounded-md px-2 py-1 text-sm"
                initial={{ opacity: 0, y: 10, scale: 0.66 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
              >
                <FileText size={16} className="mt-1 shrink-0" />
                <div>
                  <a href={searchResult.url} target="_blank" className="hover:underline">
                    {searchResult.title || searchResult.url}
                  </a>
                  {searchResult.snippet && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {searchResult.snippet}
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// 简单的页面缓存，用于存储页面标题
const __pageCache = new Map<string, string>();

function CrawlToolCall({ toolCall }: { toolCall: ToolCallRuntime }) {
  const url = useMemo(
    () => (toolCall.args as { url: string }).url,
    [toolCall.args],
  );
  const title = useMemo(() => __pageCache.get(url), [url]);
  return (
    <section className="mt-4 pl-4">
      <div>
        <RainbowText
          className="flex items-center text-base font-medium italic"
          animated={toolCall.result === undefined}
        >
          <BookOpenText size={16} className={"mr-2"} />
          <span>Reading</span>
        </RainbowText>
      </div>
      <ul className="mt-2 flex flex-wrap gap-4">
        <motion.li
          className="text-muted-foreground bg-accent flex h-40 w-40 gap-2 rounded-md px-2 py-1 text-sm"
          initial={{ opacity: 0, y: 10, scale: 0.66 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
          }}
        >
          <FileText size={16} className="mt-1 shrink-0" />
          <a
            className="h-full flex-grow overflow-hidden text-ellipsis whitespace-nowrap"
            href={url}
            target="_blank"
          >
            {title ?? url}
          </a>
        </motion.li>
      </ul>
    </section>
  );
}

function RetrieverToolCall({ toolCall }: { toolCall: ToolCallRuntime }) {
  const searching = useMemo(() => {
    return toolCall.result === undefined;
  }, [toolCall.result]);
  const documents = useMemo<
    Array<{ id: string; title: string; content: string }>
  >(() => {
    return toolCall.result ? parseJSON(toolCall.result, []) : [];
  }, [toolCall.result]);
  return (
    <section className="mt-4 pl-4">
      <div className="font-medium italic">
        <RainbowText className="flex items-center" animated={searching}>
          <Search size={16} className={"mr-2"} />
          <span>Retrieving documents from RAG&nbsp;</span>
          <span className="max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap">
            {(toolCall.args as { keywords: string }).keywords}
          </span>
        </RainbowText>
      </div>
      <div className="pr-4">
        {documents && (
          <ul className="mt-2 flex flex-wrap gap-4">
            {searching &&
              [...Array(2)].map((_, i) => (
                <li
                  key={`search-result-${i}`}
                  className="flex h-40 w-40 gap-2 rounded-md text-sm"
                >
                  <Skeleton
                    className="to-accent h-full w-full rounded-md bg-gradient-to-tl from-slate-400"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                </li>
              ))}
            {documents.map((doc, i) => (
              <motion.li
                key={`search-result-${i}`}
                className="text-muted-foreground bg-accent flex max-w-40 gap-2 rounded-md px-2 py-1 text-sm"
                initial={{ opacity: 0, y: 10, scale: 0.66 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
              >
                <FileText size={32} />
                {doc.title}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PythonToolCall({ toolCall }: { toolCall: ToolCallRuntime }) {
  const code = useMemo<string | undefined>(() => {
    return (toolCall.args as { code?: string }).code;
  }, [toolCall.args]);
  
  return (
    <section className="mt-4 pl-4">
      <div className="flex items-center">
        <Code className={"mr-2"} />
        <RainbowText
          className="text-base font-medium italic"
          animated={toolCall.result === undefined}
        >
          Running Python code
        </RainbowText>
      </div>
      <div>
        <div className="bg-accent mt-2 max-h-[400px] max-w-[calc(100%-120px)] overflow-y-auto rounded-md p-2 text-sm">
          <pre className="overflow-x-auto">
            <code>{code?.trim() ?? ""}</code>
          </pre>
        </div>
      </div>
      {toolCall.result && <PythonToolCallResult result={toolCall.result} />}
    </section>
  );
}

function PythonToolCallResult({ result }: { result: string }) {
  const { resolvedTheme } = useTheme();
  const hasError = useMemo(
    () => result.includes("Error executing code:\n"),
    [result],
  );
  const error = useMemo(() => {
    if (hasError) {
      const parts = result.split("```\nError: ");
      if (parts.length > 1) {
        return parts[1]!.trim();
      }
    }
    return null;
  }, [result, hasError]);
  const stdout = useMemo(() => {
    if (!hasError) {
      const parts = result.split("```\nStdout: ");
      if (parts.length > 1) {
        return parts[1]!.trim();
      }
    }
    return null;
  }, [result, hasError]);
  return (
    <>
      <div className="mt-4 font-medium italic">
        {hasError ? "Error when executing the above code" : "Execution output"}
      </div>
      <div className="bg-accent mt-2 max-h-[400px] max-w-[calc(100%-120px)] overflow-y-auto rounded-md p-2 text-sm">
        <pre className="overflow-x-auto" style={{ color: hasError ? "red" : "inherit" }}>
          <code>{error ?? stdout ?? "(empty)"}</code>
        </pre>
      </div>
    </>
  );
}

function MCPToolCall({ toolCall }: { toolCall: ToolCallRuntime }) {
  return (
    <section className="mt-4 pl-4">
      <div className="w-fit overflow-y-auto rounded-md py-0">
        <div>
          <div className="flex items-center font-medium italic">
            <PencilRuler size={16} className={"mr-2"} />
            <RainbowText
              className="pr-0.5 text-base font-medium italic"
              animated={toolCall.result === undefined}
            >
              Running {toolCall.name ? toolCall.name + "()" : "MCP tool"}
            </RainbowText>
          </div>
          {toolCall.result && (
            <div className="bg-accent max-h-[400px] max-w-[560px] overflow-y-auto rounded-md text-sm mt-2 p-2">
              <pre className="overflow-x-auto">
                <code>{toolCall.result.trim()}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 