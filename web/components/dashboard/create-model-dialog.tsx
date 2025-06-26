"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
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
import { addModel } from "@/app/actions/model"
import { ModelFactory, ModelType } from "@/src/types/model"

export interface CreateModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateModel: () => void // 更新为回调函数，成功后刷新列表
}

interface ModelData {
  type: ModelType
  name: string
  apiBase: string
  apiKey: string
  maxTokens: string
}

// 模型类型
const MODEL_TYPES = [
  { value: 'chat', label: 'Chat' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'rerank', label: 'Rerank' }
] as const;

// 根据模型类型获取对应的工厂类型
function getFactoryForModelType(type: ModelType): ModelFactory {
  switch (type) {
    case 'chat': return 'OpenAI-API-Compatible';
    case 'embedding': return 'VLLM';
    case 'rerank': return 'LocalAI';
    default: return 'OpenAI-API-Compatible';
  }
}

export function CreateModelDialog({
  open,
  onOpenChange,
  onCreateModel
}: CreateModelDialogProps) {
  const [modelData, setModelData] = useState<ModelData>({
    type: 'chat',
    name: '',
    apiBase: '',
    apiKey: '',
    maxTokens: '4096'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // 根据当前选择的模型类型自动设置对应的工厂类型
      const factory = getFactoryForModelType(modelData.type);
      
      // 创建表单数据
      const formData = new FormData()
      formData.append('factory', factory)
      formData.append('type', modelData.type)
      formData.append('name', modelData.name)
      formData.append('apiBase', modelData.apiBase)
      formData.append('apiKey', modelData.apiKey)
      formData.append('maxTokens', modelData.maxTokens)

      // 调用API
      const result = await addModel(formData)

      if (result.success) {
        // 重置表单
        resetForm()
        // 关闭对话框
        onOpenChange(false)
        // 刷新模型列表
        onCreateModel()
      } else {
        setError(result.message || '添加模型失败')
      }
    } catch (error) {
      console.error('添加模型时出错:', error)
      setError('提交表单时出错，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 重置表单
  const resetForm = () => {
    setModelData({
      type: 'chat',
      name: '',
      apiBase: '',
      apiKey: '',
      maxTokens: '4096'
    })
    setError(null)
  }

  // 处理对话框关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加新模型</DialogTitle>
          <DialogDescription>
            添加新的模型以供DeepRAG系统使用。根据模型类型将自动设置工厂类型。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 模型类型 */}
          <div className="space-y-2">
            <Label htmlFor="type">模型类型</Label>
            <Select
              value={modelData.type}
              onValueChange={(value: ModelType) => 
                setModelData({ ...modelData, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="选择模型类型" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* <p className="text-xs text-gray-500 dark:text-gray-400">
              工厂类型: {getFactoryForModelType(modelData.type)}
            </p> */}
          </div>

          {/* 模型名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">模型名称</Label>
            <Input
              id="name"
              value={modelData.name}
              onChange={(e) => setModelData({ ...modelData, name: e.target.value })}
              placeholder="输入模型名称"
              required
            />
          </div>

          {/* API URL */}
          <div className="space-y-2">
            <Label htmlFor="apiBase">API URL</Label>
            <Input
              id="apiBase"
              value={modelData.apiBase}
              onChange={(e) => setModelData({ ...modelData, apiBase: e.target.value })}
              placeholder="输入API基础URL"
              required
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={modelData.apiKey}
              onChange={(e) => setModelData({ ...modelData, apiKey: e.target.value })}
              placeholder="输入API密钥"
              required
            />
          </div>

          {/* 最大令牌数 */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">最大令牌数</Label>
            <Input
              id="maxTokens"
              type="number"
              value={modelData.maxTokens}
              onChange={(e) => setModelData({ ...modelData, maxTokens: e.target.value })}
              placeholder="输入最大令牌数"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '添加中...' : '添加模型'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 