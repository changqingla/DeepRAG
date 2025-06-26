"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Search, FileText, File, Folder, Loader2, FileDown } from "lucide-react"
import { getFiles, getFolders, type FileItem, type Folder as FolderType } from "@/app/services/fileManagerService"
import { addFilesToKnowledge } from "@/app/actions/documents"
import { DocumentInfo } from "@/src/types/knowledge"

interface FileSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeId: string
  onUploadComplete: (documents: DocumentInfo[]) => void
}

export function FileSelectorDialog({
  open,
  onOpenChange,
  knowledgeId,
  onUploadComplete
}: FileSelectorDialogProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderType[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // 组织文件，建立原始文件和衍生文件的关系
  const organizeFiles = useCallback((files: FileItem[]) => {
    const derivedFiles: Record<string, FileItem[]> = {};
    const regularFiles: FileItem[] = [];
    
    files.forEach(file => {
      if (file.derived_from_file_id) {
        if (!derivedFiles[file.derived_from_file_id]) {
          derivedFiles[file.derived_from_file_id] = [];
        }
        derivedFiles[file.derived_from_file_id].push(file);
      } else {
        regularFiles.push(file);
      }
    });
    
    return { regularFiles, derivedFiles };
  }, []);

  // 获取文件的组织结构
  const { regularFiles, derivedFiles } = useMemo(() => organizeFiles(files), [files, organizeFiles]);

  // 获取应该显示的文件列表（优先显示衍生文件）
  const displayFiles = useMemo(() => {
    const filesToShow: FileItem[] = [];
    
    regularFiles.forEach(sourceFile => {
      const derivedFileList = derivedFiles[sourceFile.id];
      if (derivedFileList && derivedFileList.length > 0) {
        // 如果有衍生文件，显示衍生文件而不是源文件
        filesToShow.push(...derivedFileList);
      } else {
        // 如果没有衍生文件，显示源文件
        filesToShow.push(sourceFile);
      }
    });
    
    return filesToShow;
  }, [regularFiles, derivedFiles]);

  // 加载文件和文件夹
  const loadData = async (folderId: string | null = null) => {
    setLoading(true)
    setError(null)
    
    try {
      const [filesResult, foldersResult] = await Promise.all([
        getFiles(folderId, 1, 100), // 获取当前文件夹的文件
        getFolders(folderId, 1, 100) // 获取当前文件夹的子文件夹
      ])
      
      setFiles(filesResult.items || [])
      setFolders(foldersResult.items || [])
    } catch (error) {
      console.error("加载文件列表失败:", error)
      setError("加载文件列表失败，请确保数据管理服务已启动（端口5001）")
    } finally {
      setLoading(false)
    }
  }

  // 当对话框打开时加载数据
  useEffect(() => {
    if (open) {
      loadData(currentFolderId)
    }
  }, [open, currentFolderId])

  // 进入文件夹
  const handleEnterFolder = (folderId: string) => {
    setCurrentFolderId(folderId)
    setSelectedFiles([]) // 清空选择
  }

  // 返回上级文件夹
  const handleGoBack = () => {
    // 这里需要实现父文件夹逻辑，暂时返回根目录
    setCurrentFolderId(null)
    setSelectedFiles([]) // 清空选择
  }

  // 处理文件选择
  const handleFileSelect = (file: FileItem, checked: boolean) => {
    if (checked) {
      setSelectedFiles([...selectedFiles, file])
    } else {
      setSelectedFiles(selectedFiles.filter(f => f.id !== file.id))
    }
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(filteredFiles)
    } else {
      setSelectedFiles([])
    }
  }

  // 过滤文件（搜索）
  const filteredFiles = displayFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 重置表单
  const resetForm = () => {
    setSelectedFiles([])
    setError(null)
    setSuccess(null)
    setSearchQuery("")
    setCurrentFolderId(null)
  }

  // 处理对话框关闭
  const handleDialogClose = (open: boolean) => {
    if (!open && !uploading) {
      setTimeout(() => {
        resetForm()
      }, 300)
    }
    onOpenChange(open)
  }

  // 处理确认选择
  const handleConfirm = async () => {
    if (selectedFiles.length === 0) {
      setError("请至少选择一个文件")
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // 提取文件ID列表
      const fileIds = selectedFiles.map(file => file.id)
      
      // 调用API添加文件到知识库
      const result = await addFilesToKnowledge(knowledgeId, fileIds)

      if (result.success) {
        const uploadedDocsInfo: DocumentInfo[] = (result.successfulUploads || [])
          .map(upload => upload.documentInfo)
          .filter((info): info is DocumentInfo => info !== null && info !== undefined)

        if (uploadedDocsInfo.length > 0) {
          onUploadComplete(uploadedDocsInfo)
        }
        
        setSuccess(result.message || `成功添加 ${selectedFiles.length} 个文件到知识库`)
        setSelectedFiles([])
        setTimeout(() => {
          onOpenChange(false)
        }, 1000)
      } else {
        setError(result.message || "添加文件到知识库失败")
      }
    } catch (error) {
      console.error("添加文件过程中发生错误:", error)
      setError("服务器错误，请稍后再试")
    } finally {
      setUploading(false)
    }
  }

  // 获取文件图标
  const getFileIcon = (file: FileItem) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    
    let color = "text-blue-500"
    let icon = <FileText className={`h-4 w-4 ${color}`} />
    
    // 如果是衍生文件，使用特殊图标
    if (file.derived_from_file_id) {
      color = "text-blue-500"
      icon = <FileDown className={`h-4 w-4 ${color}`} />
    } else if (['pdf'].includes(ext)) {
      color = "text-red-500"
      icon = <File className={`h-4 w-4 ${color}`} />
    } else if (['doc', 'docx'].includes(ext)) {
      color = "text-blue-600"
      icon = <FileText className={`h-4 w-4 ${color}`} />
    } else if (['xls', 'xlsx'].includes(ext)) {
      color = "text-green-600"
      icon = <FileText className={`h-4 w-4 ${color}`} />
    } else if (['ppt', 'pptx'].includes(ext)) {
      color = "text-orange-500"
      icon = <FileText className={`h-4 w-4 ${color}`} />
    } else if (['txt', 'md'].includes(ext)) {
      color = "text-gray-600"
      icon = <FileText className={`h-4 w-4 ${color}`} />
    }
    
    return icon
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 检查文件是否为衍生文件
  const isDerivedFile = (file: FileItem): boolean => {
    return !!file.derived_from_file_id
  }

  // 获取源文件信息
  const getSourceFileName = (file: FileItem): string | null => {
    if (!file.derived_from_file_id) return null
    const sourceFile = regularFiles.find(f => f.id === file.derived_from_file_id)
    return sourceFile?.name || null
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>从数据管理中选择文件</DialogTitle>
          <DialogDescription>
            选择已在数据管理页面处理好的文件添加到知识库。优先显示已处理的衍生文件（如Markdown转换版本）。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* 搜索栏 */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 导航栏 */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              disabled={currentFolderId === null}
            >
              返回上级
            </Button>
            <span>/</span>
            <span>{currentFolderId ? '文件夹' : '根目录'}</span>
          </div>

          {/* 提示信息 */}
          {displayFiles.length > 0 && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex-shrink-0">
              💡 系统优先显示已处理的衍生文件（如Markdown版本），这些文件通常具有更好的知识库兼容性
            </div>
          )}

          {/* 文件列表 */}
          <div className="flex-1 border rounded-lg min-h-0 flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm text-gray-500">加载中...</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                {/* 文件列表头部 */}
                {filteredFiles.length > 0 && (
                  <div className="flex items-center p-2 border-b bg-gray-50 flex-shrink-0">
                    <Checkbox
                      checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">全选 ({filteredFiles.length} 个文件)</span>
                  </div>
                )}

                {/* 滚动区域 */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-1">
                    {/* 文件夹列表 */}
                    {folders.map(folder => (
                      <div
                        key={folder.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onDoubleClick={() => handleEnterFolder(folder.id)}
                      >
                        <Folder className="h-4 w-4 text-blue-500 mr-3" />
                        <span className="flex-1">{folder.name}</span>
                      </div>
                    ))}

                    {/* 智能文件列表 */}
                    {filteredFiles.map(file => {
                      const isDerivative = isDerivedFile(file)
                      const sourceFileName = getSourceFileName(file)
                      
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center p-2 hover:bg-gray-50 rounded ${
                            isDerivative ? 'bg-blue-50/30 border-l-2 border-blue-200' : ''
                          }`}
                        >
                          <Checkbox
                            checked={selectedFiles.some(f => f.id === file.id)}
                            onCheckedChange={(checked) => handleFileSelect(file, checked as boolean)}
                            className="mr-3 flex-shrink-0"
                          />
                          {getFileIcon(file)}
                          <div className="flex-1 ml-3 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className={`font-medium text-sm truncate ${
                                isDerivative ? 'text-blue-700' : ''
                              }`}>
                                {file.name}
                              </div>
                              {isDerivative && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full whitespace-nowrap">
                                  衍生文件
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(file.size)} • {new Date(file.upload_date).toLocaleString()}
                              {isDerivative && sourceFileName && (
                                <> • 源文件: {sourceFileName}</>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* 空状态 */}
                    {folders.length === 0 && filteredFiles.length === 0 && !loading && (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>当前目录下没有文件</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* 选择统计 */}
          {selectedFiles.length > 0 && (
            <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded flex-shrink-0">
              已选择 {selectedFiles.length} 个文件
              {selectedFiles.some(f => isDerivedFile(f)) && (
                <span className="ml-2 text-blue-600">
                  (包含 {selectedFiles.filter(f => isDerivedFile(f)).length} 个衍生文件)
                </span>
              )}
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <Alert variant="destructive" className="flex-shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功信息 */}
        {success && (
          <Alert className="bg-green-50 text-green-800 border border-green-200 flex-shrink-0">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={uploading}>
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedFiles.length === 0 || uploading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                添加中...
              </>
            ) : (
              `确认添加 (${selectedFiles.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 