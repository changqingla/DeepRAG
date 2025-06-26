"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditingApplicationData {
  id: string;
  name: string;
  description: string;
  dataset_ids: string[];
  llm: {
    model_name: string;
    temperature: number;
  };
  prompt: {
    prompt: string;
    rerank_model: string;
    similarity_threshold: number;
    top_n: number;
  };
}

interface CreateChatbotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateChatbot: (data: ChatbotData) => Promise<void>
  availableChatModels: Model[]
  availableRerankModels: Model[]
  availableKnowledgeBases: KnowledgeBase[]
  editingChatbot?: EditingApplicationData | null
  isSubmitting?: boolean
  parseWarningMessage?: string | null
}

export interface ChatbotData {
  name: string
  description: string
  chatModelId: string
  knowledgeBaseIds: string[]
  prompt: string
  rerankModelId: string
  similarityThreshold: number
  topN: number
  temperature: number
}

interface Model {
  id: string
  name: string
}

interface KnowledgeBase {
  id: string
  name: string
}

const DEFAULT_PROMPT = "请根据知识库中的内容来回答问题。当所有知识库内容都与问题无关时，你的回答必须包括\"知识库中未找到您要的答案！\"以下是知识库：{knowledge}。以上是知识库。"
const INITIAL_CHATBOT_DATA: ChatbotData = {
  name: "",
  description: "",
  chatModelId: "",
  knowledgeBaseIds: [],
  prompt: DEFAULT_PROMPT,
  rerankModelId: "",
  similarityThreshold: 0.2,
  topN: 6,
  temperature: 0.7
};

export function CreateChatbotDialog({
  open,
  onOpenChange,
  onCreateChatbot,
  availableChatModels,
  availableRerankModels,
  availableKnowledgeBases,
  editingChatbot,
  isSubmitting,
  parseWarningMessage
}: CreateChatbotDialogProps) {
  const [chatbotData, setChatbotData] = useState<ChatbotData>(INITIAL_CHATBOT_DATA)
  
  const [openKbSelector, setOpenKbSelector] = useState(false)

  const isEditMode = !!editingChatbot;

  useEffect(() => {
    if (open) {
      if (isEditMode && editingChatbot) {
        setChatbotData({
          name: editingChatbot.name || "",
          description: editingChatbot.description || "",
          chatModelId: editingChatbot.llm.model_name || "",
          temperature: editingChatbot.llm.temperature || 0.7,
          knowledgeBaseIds: editingChatbot.dataset_ids || [],
          prompt: editingChatbot.prompt.prompt || DEFAULT_PROMPT,
          rerankModelId: editingChatbot.prompt.rerank_model || "",
          similarityThreshold: editingChatbot.prompt.similarity_threshold || 0.2,
          topN: editingChatbot.prompt.top_n || 6
        });
      } else {
        setChatbotData(INITIAL_CHATBOT_DATA);
      }
    } else {
      // Optionally reset form when dialog is closed and not just on submit
      // setChatbotData(INITIAL_CHATBOT_DATA); 
    }
  }, [open, editingChatbot, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("CreateChatbotDialog: handleSubmit 开始执行");
    
    // 调用父组件的处理函数
    await onCreateChatbot(chatbotData)
    
    console.log("CreateChatbotDialog: onCreateChatbot 执行完成");
    
    // 注意：不要在这里关闭对话框，让父组件根据结果决定是否关闭
    // 只在成功时重置表单数据（这将通过父组件调用onOpenChange(false)来触发）
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // When dialog is closed, ensure form is reset for next create operation if it was an edit
        // The useEffect listening to 'open' will also handle this based on 'editingChatbot'
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>{isEditMode ? `编辑应用: ${editingChatbot?.name}` : "创建应用"}</DialogTitle>
          <DialogDescription className="text-xs">
            {isEditMode ? "修改应用的配置信息" : "创建一个新的应用，配置所需的模型、知识库和参数"}
          </DialogDescription>
        </DialogHeader>

        {/* 未解析文档提醒 */}
        {parseWarningMessage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium">无法更新聊天助手</p>
                <p className="text-xs text-yellow-700 mt-1 whitespace-pre-line">{parseWarningMessage}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  请前往对应的知识库页面解析这些文档，或者移除包含未解析文档的知识库。
                </p>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => window.open('/dashboard/knowledge', '_blank')}
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded border border-yellow-300 transition-colors"
                  >
                    前往知识库页面
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">助手名称</Label>
            <Input 
              id="name" 
              placeholder="请输入聊天助手名称"
              value={chatbotData.name}
              onChange={(e) => setChatbotData({...chatbotData, name: e.target.value})}
              required
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">助手描述</Label>
            <Textarea 
              id="description" 
              placeholder="请输入聊天助手描述"
              value={chatbotData.description}
              onChange={(e) => setChatbotData({...chatbotData, description: e.target.value})}
              className="text-sm resize-none min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chatModel" className="text-sm">选择聊天模型</Label>
            <Select 
              value={chatbotData.chatModelId}
              onValueChange={(value) => setChatbotData({...chatbotData, chatModelId: value})}
              required
            >
              <SelectTrigger id="chatModel" className="h-8 text-sm">
                <SelectValue placeholder="选择聊天模型" />
              </SelectTrigger>
              <SelectContent>
                {availableChatModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-sm">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature" className="text-sm">模型温度</Label>
              <span className="text-xs text-gray-500">{chatbotData.temperature.toFixed(2)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.01}
              value={[chatbotData.temperature]}
              onValueChange={([value]) => setChatbotData({...chatbotData, temperature: value})}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>精确 0</span>
              <span>1 创造</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="knowledgeBase" className="text-sm">选择知识库（可多选）</Label>
            <Popover open={openKbSelector} onOpenChange={setOpenKbSelector}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openKbSelector}
                  className="h-8 w-full justify-between text-sm"
                >
                  {chatbotData.knowledgeBaseIds.length > 0
                    ? `已选择 ${chatbotData.knowledgeBaseIds.length} 个知识库`
                    : "选择知识库"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="搜索知识库..." className="h-9 text-sm" />
                  <CommandList>
                    <CommandEmpty>未找到知识库</CommandEmpty>
                    <CommandGroup>
                      {availableKnowledgeBases.map((kb) => (
                        <CommandItem
                          key={kb.id}
                          value={kb.id}
                          onSelect={() => {
                            setChatbotData(prev => {
                              const selected = prev.knowledgeBaseIds.includes(kb.id)
                              return {
                                ...prev,
                                knowledgeBaseIds: selected
                                  ? prev.knowledgeBaseIds.filter(id => id !== kb.id)
                                  : [...prev.knowledgeBaseIds, kb.id]
                              }
                            })
                          }}
                          className="text-sm"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              chatbotData.knowledgeBaseIds.includes(kb.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {kb.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt" className="text-sm">Prompt 模板</Label>
            <Textarea 
              id="prompt" 
              placeholder="请输入prompt模板"
              value={chatbotData.prompt}
              onChange={(e) => setChatbotData({...chatbotData, prompt: e.target.value})}
              className="text-sm resize-none min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rerankModel" className="text-sm">选择Rerank模型</Label>
            <Select 
              value={chatbotData.rerankModelId}
              onValueChange={(value) => setChatbotData({...chatbotData, rerankModelId: value})}
              required
            >
              <SelectTrigger id="rerankModel" className="h-8 text-sm">
                <SelectValue placeholder="选择Rerank模型" />
              </SelectTrigger>
              <SelectContent>
                {availableRerankModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-sm">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="similarityThreshold" className="text-sm">相似度阈值</Label>
              <span className="text-xs text-gray-500">{chatbotData.similarityThreshold.toFixed(2)}</span>
            </div>
            <Slider
              id="similarityThreshold"
              min={0}
              max={1}
              step={0.01}
              value={[chatbotData.similarityThreshold]}
              onValueChange={([value]) => setChatbotData({...chatbotData, similarityThreshold: value})}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>1</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="topN" className="text-sm">返回结果数量</Label>
              <span className="text-xs text-gray-500">{chatbotData.topN}</span>
            </div>
            <Slider
              id="topN"
              min={1}
              max={20}
              step={1}
              value={[chatbotData.topN]}
              onValueChange={([value]) => setChatbotData({...chatbotData, topN: value})}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-sm">
              取消
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                  {isEditMode ? "保存中..." : "创建中..."}
                </>
              ) : (
                <>
                  {isEditMode ? "保存更改" : "创建应用"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 