"use client"

import { useEffect, useMemo } from "react"
import { Settings } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ChatSettingsDialog } from "@/components/dashboard/chat-settings-dialog"

// DeerFlow组件
import { MessagesBlock } from "@/components/deer-flow/messages-block"
import { ResearchBlock } from "@/components/deer-flow/research-block"

// 状态管理
import { 
  useChatStore, 
  initializeChatStore,
  type ChatSettings 
} from "@/src/store/chat-store"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { toast } = useToast()
  
  // 从store获取状态
  const settings = useChatStore((state) => state.settings)
  const isSettingsOpen = useChatStore((state) => state.isSettingsOpen)
  const error = useChatStore((state) => state.error)
  const openResearchId = useChatStore((state) => state.openResearchId)
  const messageCount = useChatStore((state) => state.messageIds.length)
  
  // 判断是否为双栏模式（Agent模式且有研究活动）
  const doubleColumnMode = useMemo(
    () => settings.mode === "agent" && openResearchId !== null,
    [settings.mode, openResearchId],
  );

  // 初始化store
  useEffect(() => {
    initializeChatStore();
  }, []);
  
  // 自动打开设置（如果需要）
  useEffect(() => {
    if (!settings.chatbotId && settings.mode === "ask") {
      useChatStore.getState().setIsSettingsOpen(true);
    }
  }, [settings.chatbotId, settings.mode]);
  
  // 处理设置变更
  const handleSettingsChange = (newSettings: ChatSettings) => {
    const currentSettings = useChatStore.getState().settings;
    
    // 如果聊天助手变更了，需要清空聊天记录
    if (newSettings.chatbotId !== currentSettings.chatbotId || 
        newSettings.mode !== currentSettings.mode) {
      useChatStore.getState().clearMessages();
      
      toast({
        description: "已切换设置，聊天记录已清空。"
      });
    }
    
    useChatStore.getState().setSettings(newSettings);
  }

  // 开始新对话
  const startNewConversation = () => {
    useChatStore.getState().clearMessages();
    toast({
      description: "已开启新对话"
    });
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            DeepRAG
          </h1>
      
      {/* 模式指示器 */}
      {settings.mode && (
            <div className="px-3 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {settings.mode === "ask" ? "Ask模式" : "Agent模式"}
        </div>
      )}
              </div>
              
        <div className="flex items-center space-x-2">
          {/* 新对话按钮 */}
          {messageCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={startNewConversation}
            >
              新对话
                          </Button>
                  )}

          {/* 设置按钮 */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => useChatStore.getState().setIsSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
                  </Button>
                </div>
      </header>

      {/* 错误提示 */}
        {error && (
        <motion.div 
          className="mx-4 mt-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        </motion.div>
        )}
        
      {/* 主内容区域 - DeerFlow风格布局 */}
      <div
        className={cn(
          "flex-1 flex w-full overflow-hidden",
          doubleColumnMode ? "justify-center gap-8 px-4 pt-4 pb-4" : "justify-center px-4 pt-4 pb-4",
        )}
      >
        {/* 消息块 */}
        <MessagesBlock
          className={cn(
            "transition-all duration-300 ease-out",
            !doubleColumnMode && "w-full max-w-4xl",
            doubleColumnMode && "w-[538px] shrink-0",
          )}
        />
        
        {/* 研究块 - 仅在Agent模式下显示 */}
        {doubleColumnMode && (
          <ResearchBlock
            className="w-[min(max(calc((100vw-538px)*0.75),575px),960px)] transition-all duration-300 ease-out"
            researchId={openResearchId}
          />
        )}
      </div>
      
      {/* 设置对话框 */}
      <ChatSettingsDialog
        open={isSettingsOpen}
        onOpenChange={(open) => useChatStore.getState().setIsSettingsOpen(open)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}
