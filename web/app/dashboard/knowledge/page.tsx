"use client"

import { useState, useEffect } from "react"
import { Search, MoreHorizontal, User, Plus, FileText, Clock, Trash2, AlertCircle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreateKnowledgeDialog, EditKnowledgeDialog, KnowledgeBaseData } from "@/components/dashboard/create-knowledge-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getKnowledgeBases, deleteKnowledge, getKnowledgeDetail } from "@/app/actions/knowledge"
import { KnowledgeDisplayInfo } from "@/src/types/knowledge"
import { useRouter } from "next/navigation"

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeDisplayInfo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeDisplayInfo | null>(null)
  const [hasDocuments, setHasDocuments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const router = useRouter()

  // 加载知识库列表
  const loadKnowledges = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("开始加载知识库列表...")
      const result = await getKnowledgeBases()
      console.log("getKnowledgeBases响应:", result)
      
      if (result.success && result.data) {
        // 处理API返回的数据
        const knowledges: KnowledgeDisplayInfo[] = []
        
        Object.values(result.data).forEach((knowledge: any) => {
          knowledges.push({
            id: knowledge.id,
            title: knowledge.name,
            description: knowledge.description,
            documentsCount: knowledge.document_count,
            lastUpdated: knowledge.update_date,
            embeddingModel: knowledge.embedding_model,
            chunkMethod: knowledge.chunk_method,
            chunkSize: knowledge.parser_config?.chunk_token_num || 256
          })
        })
        
        setKnowledgeBases(knowledges)
      } else {
        setError(result.message || "获取知识库列表失败")
      }
    } catch (error) {
      console.error("加载知识库列表错误:", error)
      setError("加载知识库列表时出错，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }
  
  // 初始加载
  useEffect(() => {
    loadKnowledges()
  }, [])

  const handleCreateKnowledge = (data: KnowledgeBaseData) => {
    // 添加到列表中，后端API调用已经在对话框组件中完成
    const newKnowledgeBase: KnowledgeDisplayInfo = {
      id: data.id || "",
      title: data.name,
      description: data.description,
      documentsCount: 0,
      lastUpdated: new Date().toLocaleString(),
      embeddingModel: data.embeddingModel,
      chunkMethod: data.chunkType,
      chunkSize: data.chunkSize
    }
    
    setKnowledgeBases([...knowledgeBases, newKnowledgeBase])
    console.log("创建知识库成功:", data)
  }

  const handleEditKnowledge = async (knowledgeId: string) => {
    console.log("====== 点击编辑按钮 ======");
    console.log("编辑知识库ID:", knowledgeId);
    console.log("当前编辑弹窗状态:", isEditDialogOpen);
    
    try {
      // 获取知识库详细信息 - 使用getKnowledgeDetail而不是getKnowledgeById
      console.log("开始获取知识库详情...");
      const result = await getKnowledgeDetail(knowledgeId)
      console.log("获取知识库详情结果:", result);
      
      if (result.success && result.data) {
        const knowledgeData = result.data
        console.log("知识库详情数据:", knowledgeData);
        
        // 检查是否有已解析的文档
        const hasDocuments = knowledgeData.document_count > 0
        console.log("是否有已解析的文档:", hasDocuments, "document_count:", knowledgeData.document_count);
        
        // 构建编辑数据
        const editData: KnowledgeDisplayInfo = {
          id: knowledgeData.id,
          title: knowledgeData.name,
          description: knowledgeData.description || "",
          documentsCount: knowledgeData.document_count,
          lastUpdated: knowledgeData.update_date,
          embeddingModel: knowledgeData.embedding_model,
          chunkMethod: knowledgeData.chunk_method,
          chunkSize: knowledgeData.parser_config?.chunk_token_num || 256
        }
        console.log("构建的编辑数据:", editData);
        
        console.log("设置编辑数据和状态...");
        setEditingKnowledge(editData)
        setHasDocuments(hasDocuments)
        setIsEditDialogOpen(true)
        console.log("编辑弹窗应该已经打开");
      } else {
        console.error("获取知识库详情失败:", result.message);
        setError(result.message || "获取知识库详情失败")
      }
    } catch (error) {
      console.error("获取知识库详情错误:", error)
      setError("获取知识库详情时出错，请稍后再试")
    }
  }

  const handleUpdateKnowledge = (updatedData: KnowledgeBaseData) => {
    // 更新列表中的知识库信息
    setKnowledgeBases(knowledgeBases.map(kb => 
      kb.id === updatedData.id 
        ? {
            ...kb,
            title: updatedData.name,
            description: updatedData.description,
            embeddingModel: updatedData.embeddingModel,
            chunkMethod: updatedData.chunkType,
            chunkSize: updatedData.chunkSize,
            lastUpdated: new Date().toLocaleString()
          }
        : kb
    ))
    console.log("更新知识库成功:", updatedData)
  }

  const handleDeleteKnowledge = async (knowledgeId: string) => {
    if (!window.confirm("您确定要删除这个知识库吗？此操作无法撤销。")) {
      return
    }
    
    setIsDeleting(knowledgeId)
    
    try {
      const result = await deleteKnowledge(knowledgeId)
      
      if (result.success) {
        // 删除成功，更新列表
        setKnowledgeBases(knowledgeBases.filter(kb => kb.id !== knowledgeId))
      } else {
        setError(result.message || "删除知识库失败")
      }
    } catch (error) {
      console.error("删除知识库错误:", error)
      setError("删除知识库时出错，请稍后再试")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      {/* 顶部控制栏（仅搜索 + 创建按钮）*/}
      <div className="flex items-center justify-end mb-4 space-x-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input 
            type="search" 
            placeholder="搜索知识库" 
            className="pl-10 pr-4 py-2 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          创建知识库
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
            <p className="text-sm text-gray-500">加载知识库列表中...</p>
          </div>
        </div>
      ) : (
        /* 知识库卡片网格 */
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-1 flex-1 overflow-y-auto pb-2 pr-20 content-start">
          {knowledgeBases.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-8">
              <p className="text-gray-500 mb-2">没有找到知识库</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                创建知识库
              </Button>
            </div>
          ) : (
            knowledgeBases
              .filter(kb => kb.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((kb) => (
                <Card 
                  key={kb.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 flex flex-col h-56 cursor-pointer"
                  onClick={() => router.push(`/dashboard/knowledge/${kb.id}`)}
                >
                  <CardContent className="p-2 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-6 h-6 p-0"
                            onClick={(e) => e.stopPropagation()} // Prevent card click if any
                            title="更多操作"
                            disabled={isDeleting === kb.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          onClick={(e) => e.stopPropagation()} // Prevent card click if any
                        >
                          <DropdownMenuItem 
                            onClick={() => handleEditKnowledge(kb.id)}
                            className="text-indigo-500 hover:!text-indigo-700 hover:!bg-indigo-100 dark:hover:!bg-indigo-800/30 cursor-pointer flex items-center"
                          >
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteKnowledge(kb.id)}
                            className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                            disabled={isDeleting === kb.id}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {isDeleting === kb.id ? "删除中..." : "删除"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <h3 className="text-sm font-semibold text-gray-800 mb-1.5 truncate text-center" title={kb.title}>{kb.title}</h3>
                    
                    {kb.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-3 flex-grow">{kb.description}</p>
                    )}
                    
                    <div className="mt-auto pt-0 space-y-0.5 text-gray-500 dark:text-gray-400 text-[10px]">
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 mr-0.5 text-indigo-500" />
                        {kb.documentsCount} 篇文档
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-0.5 text-indigo-500" />
                        {kb.lastUpdated}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}

      {/* 创建知识库弹窗 */}
      <CreateKnowledgeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateKnowledge={handleCreateKnowledge}
      />

      {/* 编辑知识库弹窗 */}
      <EditKnowledgeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdateKnowledge={handleUpdateKnowledge}
        knowledgeData={editingKnowledge}
        hasDocuments={hasDocuments}
      />
    </div>
  )
}
