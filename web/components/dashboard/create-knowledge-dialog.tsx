"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
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
import { createKnowledge, updateKnowledge } from "@/app/actions/knowledge"
import { ChunkMethod } from "@/src/types/knowledge"
import { KnowledgeDisplayInfo } from "@/src/types/knowledge"
import { getModels } from "@/app/actions/model"

interface CreateKnowledgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateKnowledge: (data: KnowledgeBaseData) => void
}

export interface KnowledgeBaseData {
  id?: string
  name: string
  description: string
  chunkType: ChunkMethod
  embeddingModel: string
  chunkSize: number
}

export interface EmbeddingModel {
  id: string
  name: string
  factory: string
}

export function CreateKnowledgeDialog({
  open,
  onOpenChange,
  onCreateKnowledge
}: CreateKnowledgeDialogProps) {
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeBaseData>({
    name: "",
    description: "",
    chunkType: "naive",
    embeddingModel: "",
    chunkSize: 256
  })
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载Embedding模型列表
  useEffect(() => {
    const loadEmbeddingModels = async () => {
      if (open) {
        try {
          const result = await getModels()
          
          if (result.success && result.data) {
            // 提取embedding类型的模型
            const models: EmbeddingModel[] = []
            
            Object.entries(result.data).forEach(([factory, factoryInfo]: [string, any]) => {
              // 过滤掉Tongyi-Qianwen工厂的模型
              if (factory === "Tongyi-Qianwen") {
                return
              }
              
              factoryInfo.llm.forEach((model: any) => {
                if (model.type === 'embedding') {
                  // 从模型名称中提取实际名称
                  const nameParts = model.name.split('___')
                  const displayName = nameParts[0]
                  
                  models.push({
                    id: model.name, // 使用完整名称作为ID
                    name: displayName,
                    factory: factory
                  })
                }
              })
            })
            
            setEmbeddingModels(models)
            
            // 如果有模型，默认选择第一个
            if (models.length > 0) {
              setKnowledgeData(prev => ({
                ...prev,
                embeddingModel: models[0].id
              }))
            }
          } else {
            setError("加载Embedding模型失败")
          }
        } catch (error) {
          console.error("加载Embedding模型错误:", error)
          setError("加载Embedding模型时出错")
        }
      }
    }
    
    loadEmbeddingModels()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append('name', knowledgeData.name)
      formData.append('description', knowledgeData.description)
      formData.append('embeddingModel', knowledgeData.embeddingModel)
      formData.append('chunkMethod', knowledgeData.chunkType)
      formData.append('chunkSize', knowledgeData.chunkSize.toString())
      
      // 调用API
      const result = await createKnowledge(formData)
      
      if (result.success) {
        // 创建成功，通知父组件并关闭对话框
        onCreateKnowledge({
          ...knowledgeData,
          id: result.data?.id
        })
        onOpenChange(false)
        // 重置表单
        resetForm()
      } else {
        setError(result.message || "创建知识库失败")
      }
    } catch (error) {
      console.error("创建知识库错误:", error)
      setError("创建知识库过程中发生错误")
    } finally {
      setIsLoading(false)
    }
  }

  // 重置表单
  const resetForm = () => {
    setKnowledgeData({
      name: "",
      description: "",
      chunkType: "naive",
      embeddingModel: embeddingModels.length > 0 ? embeddingModels[0].id : "",
      chunkSize: 256
    })
    setError(null)
  }

  // 对话框关闭时重置表单
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="pb-2">
          <DialogTitle>创建知识库</DialogTitle>
          <DialogDescription className="text-xs">
            添加一个新的知识库，用于存储和管理您的文档
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">知识库名称</Label>
            <Input 
              id="name" 
              placeholder="请输入知识库名称"
              value={knowledgeData.name}
              onChange={(e) => setKnowledgeData({...knowledgeData, name: e.target.value})}
              required
              className="h-8 text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">知识库描述</Label>
            <Textarea 
              id="description" 
              placeholder="请简要描述该知识库的用途"
              value={knowledgeData.description}
              onChange={(e) => setKnowledgeData({...knowledgeData, description: e.target.value})}
              className="resize-none h-16 text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">分块方式</Label>
            <RadioGroup 
              value={knowledgeData.chunkType}
              onValueChange={(value) => setKnowledgeData({...knowledgeData, chunkType: value as ChunkMethod})}
              className="flex space-x-4"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="naive" id="naive" />
                <Label htmlFor="naive" className="cursor-pointer text-sm">General</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="qa" id="qa" />
                <Label htmlFor="qa" className="cursor-pointer text-sm">QA</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="embeddingModel" className="text-sm">Embedding 模型</Label>
            <Select 
              value={knowledgeData.embeddingModel}
              onValueChange={(value) => setKnowledgeData({...knowledgeData, embeddingModel: value})}
              disabled={isLoading || embeddingModels.length === 0}
            >
              <SelectTrigger id="embeddingModel" className="h-8 text-sm">
                <SelectValue placeholder={embeddingModels.length === 0 ? "无可用的Embedding模型" : "选择Embedding模型"} />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-sm">
                    {model.name} ({model.factory})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {embeddingModels.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">请先添加Embedding类型的模型</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">分块大小</Label>
              <span className="text-xs text-gray-500">{knowledgeData.chunkSize}</span>
            </div>
            <Slider 
              value={[knowledgeData.chunkSize]}
              min={56}
              max={1024}
              step={8}
              onValueChange={(value) => setKnowledgeData({...knowledgeData, chunkSize: value[0]})}
              className="py-1"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>56</span>
              <span>1024</span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)} 
              className="h-8 text-sm"
              disabled={isLoading}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-sm"
              disabled={isLoading || embeddingModels.length === 0}
            >
              {isLoading ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 编辑知识库对话框组件
 */
interface EditKnowledgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateKnowledge: (data: KnowledgeBaseData) => void
  knowledgeData: KnowledgeDisplayInfo | null
  hasDocuments: boolean
}

export function EditKnowledgeDialog({
  open,
  onOpenChange,
  onUpdateKnowledge,
  knowledgeData,
  hasDocuments
}: EditKnowledgeDialogProps) {
  console.log("====== EditKnowledgeDialog 组件渲染 ======");
  console.log("open:", open);
  console.log("knowledgeData:", knowledgeData);
  console.log("hasDocuments:", hasDocuments);
  
  const [formData, setFormData] = useState<KnowledgeBaseData>({
    name: "",
    description: "",
    chunkType: "naive",
    embeddingModel: "",
    chunkSize: 256
  })
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 当对话框打开或知识库数据改变时，初始化表单数据
  useEffect(() => {
    console.log("====== EditKnowledgeDialog useEffect 触发 ======");
    console.log("open:", open, "knowledgeData:", knowledgeData);
    
    if (open && knowledgeData) {
      console.log("初始化表单数据...");
      setFormData({
        name: knowledgeData.title,
        description: knowledgeData.description,
        chunkType: knowledgeData.chunkMethod,
        embeddingModel: knowledgeData.embeddingModel,
        chunkSize: knowledgeData.chunkSize
      })
      console.log("表单数据已初始化");
    }
  }, [open, knowledgeData])

  // 加载Embedding模型列表
  useEffect(() => {
    const loadEmbeddingModels = async () => {
      if (open) {
        try {
          const result = await getModels()
          
          if (result.success && result.data) {
            // 提取embedding类型的模型
            const models: EmbeddingModel[] = []
            
            Object.entries(result.data).forEach(([factory, factoryInfo]: [string, any]) => {
              // 过滤掉Tongyi-Qianwen工厂的模型
              if (factory === "Tongyi-Qianwen") {
                return
              }
              
              factoryInfo.llm.forEach((model: any) => {
                if (model.type === 'embedding') {
                  // 从模型名称中提取实际名称
                  const nameParts = model.name.split('___')
                  const displayName = nameParts[0]
                  
                  models.push({
                    id: model.name, // 使用完整名称作为ID
                    name: displayName,
                    factory: factory
                  })
                }
              })
            })
            
            setEmbeddingModels(models)
          } else {
            setError("加载Embedding模型失败")
          }
        } catch (error) {
          console.error("加载Embedding模型错误:", error)
          setError("加载Embedding模型时出错")
        }
      }
    }
    
    loadEmbeddingModels()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("====== EditKnowledgeDialog 表单提交事件触发 ======");
    console.log("hasDocuments:", hasDocuments);
    console.log("embeddingModels.length:", embeddingModels.length);
    console.log("isLoading:", isLoading);
    console.log("按钮是否被禁用:", isLoading || embeddingModels.length === 0);
    
    if (embeddingModels.length === 0) {
      console.log("⚠️  由于没有embedding模型，表单提交被阻止");
      setError("请先添加Embedding类型的模型");
      return;
    }
    
    setIsLoading(true)
    setError(null)

    console.log("====== EditKnowledgeDialog 提交开始 ======");
    console.log("当前表单数据:", formData);
    console.log("knowledgeData:", knowledgeData);

    try {
      const formDataObj = new FormData()
      formDataObj.append('id', knowledgeData!.id)
      formDataObj.append('name', formData.name)
      formDataObj.append('description', formData.description)
      
      // 如果没有已解析的文档，才发送配置信息
      if (!hasDocuments) {
        formDataObj.append('chunk_method', formData.chunkType)
        formDataObj.append('embedding_model', formData.embeddingModel)
      } else {
        // 有已解析的文档时，使用原有的配置
        formDataObj.append('chunk_method', knowledgeData!.chunkMethod)
        formDataObj.append('embedding_model', knowledgeData!.embeddingModel)
      }

      console.log("构建的FormData内容:");
      for (const [key, value] of formDataObj.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      const result = await updateKnowledge(formDataObj)

      console.log("updateKnowledge 结果:", result);

      if (result.success) {
        console.log("✅ 编辑知识库成功");
        
        // 将结果传递给父组件
        const updatedData: KnowledgeBaseData = {
          id: knowledgeData!.id,
          name: formData.name,
          description: formData.description,
          embeddingModel: hasDocuments ? knowledgeData!.embeddingModel : formData.embeddingModel,
          chunkType: hasDocuments ? knowledgeData!.chunkMethod : formData.chunkType,
          chunkSize: knowledgeData!.chunkSize
        }
        
        onUpdateKnowledge(updatedData)
        onOpenChange(false)
        
        // 重置表单
        setFormData({
          name: '',
          description: '',
          chunkType: 'naive',
          embeddingModel: '',
          chunkSize: 256
        })
      } else {
        console.error("❌ 编辑知识库失败:", result.message);
        setError(result.message || '编辑知识库失败')
      }
    } catch (error) {
      console.error('❌ 编辑知识库时发生错误:', error)
      setError('编辑知识库时发生错误，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  // 重置表单
  const resetForm = () => {
    if (knowledgeData) {
      setFormData({
        name: knowledgeData.title,
        description: knowledgeData.description,
        chunkType: knowledgeData.chunkMethod,
        embeddingModel: knowledgeData.embeddingModel,
        chunkSize: knowledgeData.chunkSize
      })
    }
    setError(null)
  }

  // 对话框关闭时重置表单
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="pb-2">
          <DialogTitle>编辑知识库</DialogTitle>
          <DialogDescription className="text-xs">
            修改知识库的配置信息
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasDocuments && (
          <Alert className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              注意：该知识库中已有文件被解析，无法修改配置信息。
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">知识库名称</Label>
            <Input 
              id="name" 
              placeholder="请输入知识库名称"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="h-8 text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">知识库描述</Label>
            <Textarea 
              id="description" 
              placeholder="请简要描述该知识库的用途"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="resize-none h-16 text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">分块方式</Label>
            <RadioGroup 
              value={formData.chunkType}
              onValueChange={(value) => setFormData({...formData, chunkType: value as ChunkMethod})}
              className="flex space-x-4"
              disabled={isLoading || hasDocuments}
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="naive" id="naive" disabled={hasDocuments} />
                <Label htmlFor="naive" className={`cursor-pointer text-sm ${hasDocuments ? 'text-gray-400' : ''}`}>General</Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="qa" id="qa" disabled={hasDocuments} />
                <Label htmlFor="qa" className={`cursor-pointer text-sm ${hasDocuments ? 'text-gray-400' : ''}`}>QA</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="embeddingModel" className="text-sm">Embedding 模型</Label>
            <Select 
              value={formData.embeddingModel}
              onValueChange={(value) => setFormData({...formData, embeddingModel: value})}
              disabled={isLoading || embeddingModels.length === 0 || hasDocuments}
            >
              <SelectTrigger id="embeddingModel" className="h-8 text-sm">
                <SelectValue placeholder={embeddingModels.length === 0 ? "无可用的Embedding模型" : "选择Embedding模型"} />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-sm">
                    {model.name} ({model.factory})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {embeddingModels.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">请先添加Embedding类型的模型</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">分块大小</Label>
              <span className="text-xs text-gray-500">{formData.chunkSize}</span>
            </div>
            <Slider 
              value={[formData.chunkSize]}
              min={56}
              max={1024}
              step={8}
              onValueChange={(value) => setFormData({...formData, chunkSize: value[0]})}
              className="py-1"
              disabled={isLoading || hasDocuments}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>56</span>
              <span>1024</span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)} 
              className="h-8 text-sm"
              disabled={isLoading}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-sm"
              disabled={isLoading || embeddingModels.length === 0}
            >
              {isLoading ? "更新中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 