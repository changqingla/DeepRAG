"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, UploadCloud, X, Loader2, FileText, File } from "lucide-react"
import { uploadDocuments } from "@/app/actions/documents"
import { DocumentInfo } from "@/src/types/knowledge"

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeId: string
  onUploadComplete: (documents: DocumentInfo[]) => void
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  knowledgeId,
  onUploadComplete
}: UploadDocumentDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setFiles([...files, ...newFiles])
      
      // 清空文件输入框，以便可以重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 移除单个文件
  const removeFile = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    setFiles(newFiles)
  }

  // 处理文件拖放
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50/50")
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50/50")
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50/50")
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files)
      setFiles([...files, ...newFiles])
    }
  }

  // 清空表单
  const resetForm = () => {
    setFiles([])
    setError(null)
    setSuccess(null)
    setUploadProgress(0)
  }

  // 处理对话框关闭
  const handleDialogClose = (open: boolean) => {
    if (!open && !uploading) {
      // 延迟重置表单，以便关闭动画完成后再清空
      setTimeout(() => {
        resetForm()
      }, 300)
    }
    onOpenChange(open)
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (files.length === 0) {
      setError("请至少选择一个文件")
      return
    }
    
    setUploading(true)
    setError(null)
    setSuccess(null)
    setUploadProgress(0)
    
    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append("kbId", knowledgeId)
      
      // 添加所有文件
      files.forEach(file => {
        formData.append("files", file)
      })
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10
          return newProgress >= 90 ? 90 : newProgress
        })
      }, 300)
      
      // 调用上传API
      const result = await uploadDocuments(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (result.success) {
        const uploadedDocsInfo: DocumentInfo[] = (result.successfulUploads || [])
          .map(upload => upload.documentInfo)
          .filter((info): info is DocumentInfo => info !== null && info !== undefined)

        if (uploadedDocsInfo.length > 0) {
          onUploadComplete(uploadedDocsInfo)
        } else if (result.successfulUploads && result.successfulUploads.length === files.length && files.length > 0) {
          onUploadComplete([])
        }
        
        setSuccess(result.message || `成功处理 ${result.successfulUploads?.length || 0} 个文件`)
        setFiles([])
        setTimeout(() => {
          onOpenChange(false)
        }, 1000)
      } else {
        setError(result.message || "文件上传失败或部分文件处理失败")
      }
    } catch (error) {
      console.error("上传文件过程中发生错误:", error)
      setError("服务器错误，请稍后再试")
    } finally {
      setUploading(false)
    }
  }

  // 获取文件图标（根据扩展名返回不同的样式）
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    
    // 不同文件类型使用不同的颜色
    let color = "text-blue-500"
    let icon = <FileText className={`h-5 w-5 ${color}`} />
    
    if (['pdf'].includes(ext)) {
      color = "text-red-500"
      icon = <File className={`h-5 w-5 ${color}`} />
    } else if (['doc', 'docx'].includes(ext)) {
      color = "text-blue-600"
      icon = <FileText className={`h-5 w-5 ${color}`} />
    } else if (['xls', 'xlsx'].includes(ext)) {
      color = "text-green-600"
      icon = <FileText className={`h-5 w-5 ${color}`} />
    } else if (['ppt', 'pptx'].includes(ext)) {
      color = "text-orange-500"
      icon = <FileText className={`h-5 w-5 ${color}`} />
    } else if (['txt', 'md'].includes(ext)) {
      color = "text-gray-600"
      icon = <FileText className={`h-5 w-5 ${color}`} />
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

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">上传文档</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            上传文档到知识库，支持PDF、Word、Excel、TXT等多种格式
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          {/* 文件拖放区域 */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50/50 hover:border-indigo-300 transition-all duration-200"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              multiple
              disabled={uploading}
            />
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center">
              <UploadCloud className="h-8 w-8 text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">将文件拖放到此处，或点击选择文件</p>
            <p className="text-xs text-gray-500">支持PDF、Word、Excel、TXT等多种格式，单个文件不超过10MB</p>
          </div>

          {/* 上传进度条 */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>上传中...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 已选文件列表 */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">已选文件 ({files.length})</Label>
                {!uploading && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFiles([])}
                    className="text-xs text-gray-500 h-8"
                  >
                    清空
                  </Button>
                )}
              </div>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg bg-gray-50/50">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between px-4 py-3 text-sm border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 truncate max-w-[70%]">
                      {getFileIcon(file.name)}
                      <span className="truncate font-medium" title={file.name}>{file.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatFileSize(file.size)}
                      </span>
                      {!uploading && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex space-x-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 text-sm font-medium"
              disabled={uploading}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-4 text-sm font-medium"
              disabled={uploading || files.length === 0}
            >
              {uploading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  上传中...
                </span>
              ) : (
                <span className="flex items-center">
                  <UploadCloud className="h-4 w-4 mr-2" />
                  上传文档
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 