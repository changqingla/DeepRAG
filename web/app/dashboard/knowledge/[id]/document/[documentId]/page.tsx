"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  ArrowLeft, Search, Edit2, Check, X, Loader2, FileText,
  AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { getDocumentChunks, updateDocumentChunk } from "@/app/actions/document-chunks"
import { Badge } from "@/components/ui/badge"

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const datasetId = params.id as string
  const documentId = params.documentId as string
  
  const [document, setDocument] = useState<any>(null)
  const [chunks, setChunks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  // 保存展开状态的块ID数组
  const [expandedChunks, setExpandedChunks] = useState<string[]>([])

  // 计算总页数
  const totalPages = Math.ceil(chunks.length / itemsPerPage)

  // 获取当前页的块
  const getCurrentPageChunks = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return chunks.slice(startIndex, endIndex)
  }

  // 加载文档块数据
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 获取文档块
      const result = await getDocumentChunks(datasetId, documentId)
      if (!result.success) {
        setError(result.message || "无法获取文档块信息")
        return
      }
      
      const newChunks = result.data.chunks || []
      setDocument(result.data.doc)
      setChunks(newChunks)
      
      // 默认展开所有块
      setExpandedChunks(newChunks.map((chunk: any) => chunk.id))
      
      // 重置为第一页
      setCurrentPage(1)
    } catch (error) {
      console.error("加载文档块错误:", error)
      setError("加载数据时出错，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }
  
  // 初始加载
  useEffect(() => {
    loadData()
  }, [datasetId, documentId])
  
  // 开始编辑块内容
  const handleEdit = (chunk: any) => {
    setEditingChunkId(chunk.id)
    setEditContent(chunk.content)
  }
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingChunkId(null)
    setEditContent("")
  }
  
  // 保存编辑
  const handleSaveEdit = async (chunkId: string) => {
    setIsUpdating(true)
    
    try {
      const result = await updateDocumentChunk(datasetId, documentId, chunkId, editContent)
      
      if (result.success) {
        // 更新本地数据
        setChunks(chunks.map(chunk => 
          chunk.id === chunkId 
            ? { ...chunk, content: editContent } 
            : chunk
        ))
        
        setSuccessMessage("块内容更新成功")
        setTimeout(() => setSuccessMessage(null), 1000)
        setEditingChunkId(null)
      } else {
        setError(result.message || "更新块内容失败")
      }
    } catch (error) {
      console.error("更新块内容错误:", error)
      setError("更新块内容时出错，请稍后再试")
    } finally {
      setIsUpdating(false)
    }
  }
  
  // 切换到上一页
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }
  
  // 切换到下一页
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }
  
  // 处理折叠/展开事件
  const handleAccordionChange = (value: string[]) => {
    setExpandedChunks(value)
  }

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/dashboard/knowledge/${datasetId}`)}
          className="text-gray-600 hover:text-gray-900 px-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回文档列表
        </Button>
      </div>
      
      {/* 文档信息卡片 */}
      {document && (
        <Card className="mb-4 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-semibold">{document.name}</CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  {document.size} 字节 · {chunks.length} 个块 · {document.token_count} tokens
                </CardDescription>
              </div>
              <Badge 
                className={`
                  ${document.run === "DONE" ? "bg-green-100 text-green-800" : ""}
                  ${document.run === "RUNNING" ? "bg-blue-100 text-blue-800" : ""}
                  ${document.run === "FAILED" ? "bg-red-100 text-red-800" : ""}
                  ${document.run === "UNSTART" ? "bg-gray-100 text-gray-800" : ""}
                `}
              >
                {document.run === "DONE" ? "已解析" : 
                 document.run === "RUNNING" ? "解析中" : 
                 document.run === "FAILED" ? "解析失败" : "未解析"}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}
      
      {/* 成功消息 */}
      {successMessage && (
        <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* 错误信息 */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 加载中提示 */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-10 w-10 border-3 border-t-indigo-600 border-indigo-600/30 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">加载文档块信息中...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium">文档块列表</h2>
            {chunks.length > 0 && (
              <div className="text-sm text-gray-500">
                第 {currentPage} 页，共 {totalPages} 页 (总计 {chunks.length} 个块)
              </div>
            )}
          </div>
          
          {chunks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">该文档没有块内容</p>
            </div>
          ) : (
            <>
              <Accordion 
                type="multiple" 
                className="space-y-3"
                value={expandedChunks}
                onValueChange={handleAccordionChange}
              >
                {getCurrentPageChunks().map((chunk, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1
                  return (
                    <AccordionItem 
                      key={chunk.id} 
                      value={chunk.id}
                      className="border rounded-md bg-white dark:bg-gray-800 overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center">
                          <span className="font-medium">块 {globalIndex}</span>
                          <Badge className="ml-2 bg-gray-100 text-gray-800 hover:bg-gray-200">
                            {chunk.content.slice(0, 20)}...
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {editingChunkId === chunk.id ? (
                          <div className="space-y-3">
                            <Textarea 
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[300px] font-mono text-sm w-full"
                              placeholder="在此编辑块内容..."
                            />
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isUpdating}
                              >
                                <X className="h-4 w-4 mr-1" />
                                取消
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSaveEdit(chunk.id)}
                                disabled={isUpdating}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                {isUpdating ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    保存中...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    保存
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md whitespace-pre-wrap font-mono text-sm">
                              {chunk.content}
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(chunk)}
                                className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
              
              {/* 分页导航 */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6 mb-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-sm text-gray-600">
                      第 {currentPage} 页，共 {totalPages} 页
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="h-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
} 