"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  ArrowLeft, Search, MoreHorizontal, Plus, FileText, FileIcon,
  Clock, Trash2, AlertCircle, CheckCircle, XCircle, Loader2, File, 
  FileArchive, FileCode, FileSpreadsheet, Download, ExternalLink, Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { getKnowledgeDetail } from '@/app/actions/knowledge'
import { 
  getDocuments, 
  deleteDocuments, 
  parseDocuments 
} from "@/app/actions/documents"
import { DocumentInfo, KnowledgeInfo } from "@/src/types/knowledge"
import { FileSelectorDialog } from "@/components/dashboard/file-selector-dialog"

export default function KnowledgeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [knowledge, setKnowledge] = useState<KnowledgeInfo | null>(null)
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState<string[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 加载知识库详情和文档
  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 获取知识库详情
      const knowledgeResult = await getKnowledgeDetail(id)
      if (!knowledgeResult.success || !knowledgeResult.data) {
        setError(knowledgeResult.message || "无法获取知识库信息")
        return
      }
      
      setKnowledge(knowledgeResult.data)
      
      // 获取文档列表
      const documentsResult = await getDocuments(id)
      if (!documentsResult.success) {
        setError(documentsResult.message || "无法获取文档列表")
        return
      }
      
      // 处理API返回的文档数据
      const docs = documentsResult.data || []
      setDocuments(docs)
    } catch (error) {
      console.error("加载知识库详情错误:", error)
      setError("加载数据时出错，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }
  
  // 初始加载
  useEffect(() => {
    loadData()
  }, [id])

  // 处理文档上传完成后的回调
  const handleUploadComplete = (newDocuments: DocumentInfo[]) => {
    setDocuments([...documents, ...newDocuments])
    setSuccessMessage(`成功上传 ${newDocuments.length} 个文档`)
    
    // 1秒后清除成功消息并关闭弹窗
    setTimeout(() => setSuccessMessage(null), 1000)
  }

  // 处理删除单个文档
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("您确定要删除这个文档吗？此操作无法撤销。")) {
      return
    }
    
    setIsDeleting([...isDeleting, documentId])
    
    try {
      const result = await deleteDocuments({ dataset_id: id, ids: [documentId] })
      
      if (result.success) {
        // 删除成功，更新列表
        setDocuments(documents.filter(doc => doc.id !== documentId))
        setSuccessMessage("文档删除成功")
        // 如果被删除的文档在已选中的列表中，也要移除
        if (selectedDocuments.includes(documentId)) {
          setSelectedDocuments(selectedDocuments.filter(docId => docId !== documentId))
        }
      } else {
        setError(result.message || "删除文档失败")
      }
    } catch (error) {
      console.error("删除文档错误:", error)
      setError("删除文档时出错，请稍后再试")
    } finally {
      setIsDeleting(isDeleting.filter(docId => docId !== documentId))
      // 1秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 1000)
    }
  }

  // 处理批量删除文档
  const handleBatchDelete = async () => {
    if (selectedDocuments.length === 0) {
      return
    }
    
    if (!window.confirm(`您确定要删除选中的 ${selectedDocuments.length} 个文档吗？此操作无法撤销。`)) {
      return
    }
    
    setIsDeleting([...selectedDocuments])
    
    try {
      const result = await deleteDocuments({ dataset_id: id, ids: selectedDocuments })
      
      if (result.success) {
        // 删除成功，更新列表
        setDocuments(documents.filter(doc => !selectedDocuments.includes(doc.id)))
        setSelectedDocuments([]) // 清空选择
        setSuccessMessage(`成功删除 ${selectedDocuments.length} 个文档`)
      } else {
        setError(result.message || "批量删除文档失败")
      }
    } catch (error) {
      console.error("批量删除文档错误:", error)
      setError("批量删除文档时出错，请稍后再试")
    } finally {
      setIsDeleting([])
      // 1秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 1000)
    }
  }

  // 处理解析文档
  const handleParseDocument = async (documentId: string) => {
    setIsParsing([...isParsing, documentId])
    
    try {
      const result = await parseDocuments({ dataset_id: id, document_ids: [documentId] })
      
      if (result.success) {
        setSuccessMessage("文档解析任务已提交，请稍后刷新查看结果")
        
        // 更新文档状态为解析中
        setDocuments(documents.map(doc => 
          doc.id === documentId 
            ? { ...doc, run: "RUNNING" } 
            : doc
        ))
      } else {
        setError(result.message || "解析文档失败")
      }
    } catch (error) {
      console.error("解析文档错误:", error)
      setError("解析文档时出错，请稍后再试")
    } finally {
      setIsParsing(isParsing.filter(docId => docId !== documentId))
      // 1秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 1000)
    }
  }

  // 处理批量解析文档
  const handleBatchParse = async () => {
    if (selectedDocuments.length === 0) {
      return
    }
    
    // 过滤出未解析和解析失败的文档
    const docsToProcess = documents
      .filter(doc => selectedDocuments.includes(doc.id) && 
             (doc.run === "UNSTART" || doc.run === "FAILED"))
      .map(doc => doc.id);
    
    if (docsToProcess.length === 0) {
      setError("没有可解析的文档，已跳过已解析或解析中的文档");
      setTimeout(() => setError(null), 1000);
      return;
    }
    
    setIsParsing([...docsToProcess])
    
    try {
      const result = await parseDocuments({ dataset_id: id, document_ids: docsToProcess })
      
      if (result.success) {
        setSuccessMessage(`已提交 ${docsToProcess.length} 个文档的解析任务，请稍后刷新查看结果`)
        
        // 更新所有选中文档的状态为解析中
        setDocuments(documents.map(doc => 
          docsToProcess.includes(doc.id) 
            ? { ...doc, run: "RUNNING" } 
            : doc
        ))
        
        // 清空选择
        setSelectedDocuments([]);
      } else {
        setError(result.message || "批量解析文档失败")
      }
    } catch (error) {
      console.error("批量解析文档错误:", error)
      setError("批量解析文档时出错，请稍后再试")
    } finally {
      setIsParsing([])
      // 1秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 1000)
    }
  }

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 全选当前搜索结果中的文档
      const filteredDocs = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setSelectedDocuments(filteredDocs.map(doc => doc.id))
    } else {
      // 取消全选
      setSelectedDocuments([])
    }
  }

  // 处理单个文档选择/取消选择
  const handleSelectDocument = (documentId: string, checked: boolean) => {
    // 获取文档信息
    const doc = documents.find(doc => doc.id === documentId);
    
    // 如果文档已解析完成或正在解析中，不允许选择
    if (doc && (doc.run === "DONE" || doc.run === "RUNNING")) {
      return;
    }
    
    if (checked) {
      // 添加到选择列表
      setSelectedDocuments([...selectedDocuments, documentId]);
    } else {
      // 从选择列表中移除
      setSelectedDocuments(selectedDocuments.filter(docId => docId !== documentId));
    }
  }

  // 处理刷新
  const handleRefresh = () => {
    loadData()
  }

  // 过滤文档列表
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 获取文档类型的图标
  const getDocumentTypeIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    
    // 根据文件类型返回不同的图标
    if (type === 'pdf' || ext === 'pdf') {
      return <File className="h-5 w-5 text-red-500" />
    } else if (['doc', 'docx'].includes(ext)) {
      return <FileText className="h-5 w-5 text-blue-600" />
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="h-5 w-5 text-orange-500" />
    } else if (['json', 'xml', 'html', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'cs'].includes(ext)) {
      return <FileCode className="h-5 w-5 text-purple-500" />
    } else {
      return <FileText className="h-5 w-5 text-indigo-500" />
    }
  }

  // 获取文档状态徽章
  const getDocumentStatusBadge = (run: string) => {
    switch (run) {
      case 'DONE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">已解析</Badge>
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">解析中</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">解析失败</Badge>
      case 'UNSTART':
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">未解析</Badge>
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化日期
  const formatDate = (dateStr: string): string => {
    try {
      // 直接解析日期字符串，处理可能的格式问题
      if (!dateStr) return '未知时间';
      
      // 使用更简单可靠的日期格式化方法
      const date = new Date(dateStr);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.error("无效的日期字符串:", dateStr);
        return dateStr;
      }
      
      // 手动计算北京时间 (GMT+8)
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const beijingTime = new Date(utc + (3600000 * 8));
      
      // 格式化为 YYYY-MM-DD HH:MM 格式
      const year = beijingTime.getFullYear();
      const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
      const day = String(beijingTime.getDate()).padStart(2, '0');
      const hours = String(beijingTime.getHours()).padStart(2, '0');
      const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
      console.error("日期格式化错误:", e, "原始日期:", dateStr);
      return dateStr || '未知时间';
    }
  }

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/knowledge')}
          className="text-gray-600 hover:text-gray-900 px-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回知识库列表
        </Button>
        
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="search" 
              placeholder="搜索文档" 
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9"
          >
            <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-9"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            添加文档
          </Button>
        </div>
      </div>
      
      {/* 知识库信息卡片 */}
      {/* 已删除知识库信息卡片 */}
      
      {/* 成功消息 */}
      {successMessage && (
        <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
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

      {/* 批量操作工具栏 */}
      {selectedDocuments.length > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100">
          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            已选择 {selectedDocuments.length} 个文档
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 h-8"
              onClick={handleBatchParse}
              disabled={isParsing.length > 0}
            >
              {isParsing.length > 0 ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  批量解析
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50 h-8"
              onClick={handleBatchDelete}
              disabled={isDeleting.length > 0}
            >
              {isDeleting.length > 0 ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  删除中...
                </>
              ) : (
                <>批量删除</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 加载中提示 */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-10 w-10 border-3 border-t-indigo-600 border-indigo-600/30 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">加载文档列表中...</p>
          </div>
        </div>
      ) : (
        /* 文档列表 */
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">该知识库中还没有文档</p>
              <Button
                size="sm"
                onClick={() => setIsUploadDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                添加文档
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* 表头 */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-300 border-b">
                <div className="col-span-1 flex items-center">
                  <Checkbox 
                    id="select-all" 
                    checked={selectedDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                <div className="col-span-5">文档名称</div>
                <div className="col-span-2">大小</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-2 text-right">操作</div>
              </div>

              {/* 文档列表 */}
              <ScrollArea className="flex-1">
                {filteredDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-sm items-center"
                  >
                    <div className="col-span-1 flex items-center">
                      <Checkbox 
                        id={`select-${doc.id}`} 
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={(checked) => handleSelectDocument(doc.id, checked as boolean)}
                        disabled={isDeleting.includes(doc.id) || isParsing.includes(doc.id) || doc.run === "DONE" || doc.run === "RUNNING"}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </div>
                    <div className="col-span-5 flex items-center truncate" title={doc.name}>
                      {getDocumentTypeIcon(doc.type, doc.name)}
                      <span className="ml-2 truncate">{doc.name}</span>
                    </div>
                    <div className="col-span-2 flex items-center text-xs text-gray-500">
                      {formatFileSize(doc.size)}
                    </div>
                    <div className="col-span-2 flex items-center">
                      {getDocumentStatusBadge(doc.run)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-1">
                      {/* 解析按钮 */}
                      {doc.run !== 'DONE' && doc.run !== 'RUNNING' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => handleParseDocument(doc.id)}
                          disabled={isParsing.includes(doc.id)}
                          title="解析文档"
                        >
                          {isParsing.includes(doc.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {/* 更多操作 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            disabled={isDeleting.includes(doc.id) || isParsing.includes(doc.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {/* 只有已解析完成的文档才显示查看详情选项 */}
                          {doc.run === "DONE" && (
                            <DropdownMenuItem 
                              onClick={() => router.push(`/dashboard/knowledge/${id}/document/${doc.id}`)}
                              className="flex items-center cursor-pointer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                            disabled={isDeleting.includes(doc.id)}
                          >
                            {isDeleting.includes(doc.id) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                删除中...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* 上传文档弹窗 */}
      <FileSelectorDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        knowledgeId={id}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
} 