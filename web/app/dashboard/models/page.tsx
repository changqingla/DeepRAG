"use client"
// eslint-disable-next-line @next/next/no-sync-scripts

import { useState, useRef, useEffect } from "react"
import { Plus, MoreHorizontal, User, Trash2, Database, BookOpen, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateModelDialog } from "@/components/dashboard/create-model-dialog"
import { ModelDisplayInfo, ModelCategory } from "@/src/types/model"
import { getModels, deleteModel } from "@/app/actions/model"

// 模型类型对应的图标
const CATEGORY_ICONS = {
  'Chat': <Database className="h-4 w-4 text-blue-500" />,
  'Embedding': <BookOpen className="h-4 w-4 text-green-500" />,
  'Rerank': <FileText className="h-4 w-4 text-purple-500" />
}

const categories = ["Chat", "Embedding", "Rerank"] as const

export default function ModelsPage() {
  const [active, setActive] = useState<typeof categories[number]>("Chat")
  const [modelsList, setModelsList] = useState<ModelDisplayInfo[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const filtered = modelsList.filter((m) => m.category === active)
  const [maxWidth, setMaxWidth] = useState(0)
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  // 计算按钮宽度
  useEffect(() => {
    if (buttonRefs.current.length === categories.length) {
      const widths = buttonRefs.current.map(btn => btn?.getBoundingClientRect().width || 0)
      const maxW = Math.max(...widths) + 48 
      setMaxWidth(maxW)
    }
  }, [])

  // 加载模型列表
  const loadModels = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("开始加载模型列表...")
      const result = await getModels()
      console.log("getModels响应:", result)
      
      if (result.success && result.data) {
        // 处理API返回的数据
        const models: ModelDisplayInfo[] = []
        
        Object.entries(result.data).forEach(([factory, factoryInfo]: [string, any]) => {
          // 过滤掉Tongyi-Qianwen工厂的模型
          if (factory === "Tongyi-Qianwen") {
            console.log("跳过Tongyi-Qianwen工厂的模型")
            return
          }
          
          console.log(`处理工厂 ${factory} 的模型:`, factoryInfo)
          factoryInfo.llm.forEach((model: any) => {
            // 从模型名称中提取实际名称（不包含工厂后缀）
            const nameParts = model.name.split('___')
            const displayName = nameParts[0]
            
            // 确定模型类别（用于UI分类）
            let category: ModelCategory = 'Chat'
            if (model.type === 'embedding') category = 'Embedding'
            if (model.type === 'rerank') category = 'Rerank'
            
            // 创建显示信息
            models.push({
              id: model.name, // 使用完整名称作为ID
              name: displayName,
              factory: factory,
              type: model.type,
              capability: `${factory} · ${getCapabilityText(model.type)} · Used: ${model.used_token} tokens`,
              category: category,
              used_token: model.used_token
            })
          })
        })
        
        setModelsList(models)
      } else {
        setError(result.message || "获取模型列表失败")
      }
    } catch (error) {
      console.error("加载模型列表错误:", error)
      setError("加载模型列表时出错，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }
  
  // 初始加载
  useEffect(() => {
    loadModels()
  }, [])

  // 删除模型
  const handleDeleteModel = async (model: ModelDisplayInfo) => {
    if (!window.confirm(`您确定要删除模型 "${model.name}" 吗？此操作无法撤销。`)) {
      return
    }
    
    setIsDeleting(model.id)
    
    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append('factory', model.factory as any)
      formData.append('name', model.id) // 使用完整ID作为名称
      
      const result = await deleteModel(formData)
      
      if (result.success) {
        // 删除成功，更新列表
        setModelsList(modelsList.filter(m => m.id !== model.id))
      } else {
        setError(result.message || "删除模型失败")
      }
    } catch (error) {
      console.error("删除模型错误:", error)
      setError("删除模型时出错，请稍后再试")
    } finally {
      setIsDeleting(null)
    }
  }

  // 获取模型类型的显示文本
  function getCapabilityText(type: string): string {
    switch (type) {
      case 'chat': return 'Chat LLM'
      case 'embedding': return 'Text Embedding'
      case 'rerank': return 'Text Rerank'
      case 'image2text': return 'Image to Text'
      case 'tts': return 'Text to Speech'
      case 'speech2text': return 'Speech to Text'
      default: return type
    }
  }

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      {/* 顶部栏：分类标签 + 右侧按钮 */}
      <div className="flex items-center justify-between mb-4 space-x-3">
        <div className="flex gap-2">
          {categories.map((c, index) => (
            <button
              key={c}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => setActive(c)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors duration-200 ${
                active === c
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              style={{ width: maxWidth > 0 ? `${maxWidth}px` : 'auto', justifyContent: 'center', display: 'flex' }}
            >
              {c}
            </button>
          ))}
        </div>

        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          新增模型
        </Button>
      </div>
      
      {/* 错误信息 */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 加载中提示 */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center space-y-2">
            <div className="h-6 w-6 border-2 border-t-indigo-600 border-r-indigo-600 border-b-gray-200 border-l-gray-200 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">加载模型列表中...</p>
          </div>
        </div>
      ) : (
        /* 模型卡片网格 */
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-1 flex-1 overflow-y-auto pb-2 pr-20 content-start">
          {filtered.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-8">
              <p className="text-gray-500 mb-2">没有找到{active}类型的模型</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                添加{active}模型
              </Button>
            </div>
          ) : (
            filtered.map((model) => (
              <Card 
                key={model.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 flex flex-col h-56"
              >
                <CardContent className="p-3 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      {CATEGORY_ICONS[model.category] || <User className="h-4 w-4 text-gray-400" />}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                          onClick={(e) => e.stopPropagation()} // Prevent card click if any
                          title="更多操作"
                          disabled={isDeleting === model.id}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem 
                          onClick={() => handleDeleteModel(model)}
                          className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                          disabled={isDeleting === model.id}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          {isDeleting === model.id ? "删除中..." : "删除"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-sm font-semibold text-gray-800 mb-1 truncate text-center" title={model.name}>
                    {model.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-3 flex-grow text-center" title={model.capability}>
                    {model.capability}
                  </p>

                  <div className="mt-auto pt-1 text-xs text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {model.factory}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 创建模型弹窗 */}
      <CreateModelDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateModel={loadModels}
      />
    </div>
  )
}
