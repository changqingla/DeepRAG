"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getChatbots } from "@/app/actions/applications"

// 导入状态管理中的类型
import type { ChatMode, ChatSettings } from "@/src/store/chat-store"

// 聊天助手类型
interface Chatbot {
  id: string;
  name: string;
}

interface ChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
}

export function ChatSettingsDialog({ 
  open, 
  onOpenChange, 
  settings, 
  onSettingsChange 
}: ChatSettingsDialogProps) {
  const [mode, setMode] = useState<ChatMode>(settings.mode)
  const [chatbotId, setChatbotId] = useState<string | null>(settings.chatbotId)
  const [chatbots, setChatbots] = useState<Chatbot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载聊天助手列表
  useEffect(() => {
    const loadChatbots = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await getChatbots()
        
        if (result.success) {
          // 格式化为简单的id和name列表
          const formattedChatbots = result.data.map((chatbot: any) => ({
            id: chatbot.id,
            name: chatbot.name
          }))
          
          setChatbots(formattedChatbots)
          
          // 如果之前没有选择聊天助手，且有可用的聊天助手，则自动选择第一个
          if (!chatbotId && formattedChatbots.length > 0) {
            setChatbotId(formattedChatbots[0].id)
          }
        } else {
          setError(result.message || "无法获取聊天助手列表")
        }
      } catch (error) {
        console.error("加载聊天助手列表时出错:", error)
        setError("加载聊天助手列表时出错，请稍后再试")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (open) {
      loadChatbots()
    }
  }, [open, chatbotId])

  // 处理保存设置
  const handleSaveSettings = () => {
    // 在Ask模式下验证是否选择了聊天助手
    if (mode === "ask" && !chatbotId) {
      setError("Ask模式下必须选择聊天助手")
      return
    }
    
    // 更新设置并关闭弹窗
    onSettingsChange({
      mode,
      chatbotId: mode === "ask" ? chatbotId : null
    })
    
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>聊天设置</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6 py-4">
          {/* 聊天模式选择 */}
          <div className="space-y-3">
            <Label>聊天模式</Label>
            <RadioGroup 
              value={mode} 
              onValueChange={(value) => setMode(value as ChatMode)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ask" id="mode-ask" />
                <Label htmlFor="mode-ask" className="cursor-pointer">
                  Ask 模式（基于聊天助手）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agent" id="mode-agent" />
                <Label htmlFor="mode-agent" className="cursor-pointer">
                  Agent 模式（智能调研助手）
                </Label>
              </div>
            </RadioGroup>
            <div className="text-xs text-gray-500 mt-2">
              <p><strong>Ask模式</strong>：基于已配置的聊天助手进行对话，需要选择聊天助手</p>
              <p><strong>Agent模式</strong>：多Agent协作的智能调研助手，支持自动规划、搜索和报告生成</p>
            </div>
          </div>
          
          {/* 聊天助手选择 - 仅在Ask模式下显示 */}
          {mode === "ask" && (
            <div className="space-y-3">
              <Label>选择聊天助手</Label>
              {isLoading ? (
                <div className="flex items-center space-x-2 h-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">加载聊天助手...</span>
                </div>
              ) : chatbots.length === 0 ? (
                <div className="text-sm text-amber-600 py-2">
                  没有可用的聊天助手，请先创建聊天助手
                </div>
              ) : (
                <Select 
                  value={chatbotId || undefined} 
                  onValueChange={(value) => setChatbotId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择聊天助手" />
                  </SelectTrigger>
                  <SelectContent>
                    {chatbots.map((chatbot) => (
                      <SelectItem key={chatbot.id} value={chatbot.id}>
                        {chatbot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={handleSaveSettings} disabled={mode === "ask" && !chatbotId}>
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 