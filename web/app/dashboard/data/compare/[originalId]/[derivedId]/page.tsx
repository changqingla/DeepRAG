"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Edit3, Save, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getFileContentAPI, updateFileContentAPI } from "@/app/services/fileManagerService"

interface FileContent {
  id: string
  name: string
  content: string
  type: string
  url?: string
}

// 简单的Markdown渲染器
const SimpleMarkdownRenderer = ({ content }: { content: string }) => {
  const processInlineFormatting = (text: string) => {
    // 处理内联代码
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // 处理粗体 **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
    
    // 处理斜体 *text*
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    
    // 处理删除线 ~~text~~
    text = text.replace(/~~([^~]+)~~/g, '<del class="line-through">$1</del>')
    
    return text
  }

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const result = []
    let inCodeBlock = false
    let codeContent = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // 处理代码块
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // 结束代码块
          result.push(
            <pre key={i} className="bg-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
              <code className="text-sm font-mono">{codeContent.join('\n')}</code>
            </pre>
          )
          codeContent = []
          inCodeBlock = false
        } else {
          // 开始代码块
          inCodeBlock = true
        }
        continue
      }
      
      if (inCodeBlock) {
        codeContent.push(line)
        continue
      }
      
      // 标题处理
      if (line.startsWith('#### ')) {
        const processed = processInlineFormatting(line.substring(5))
        result.push(<h4 key={i} className="text-base font-semibold mt-3 mb-2" dangerouslySetInnerHTML={{ __html: processed }} />)
      } else if (line.startsWith('### ')) {
        const processed = processInlineFormatting(line.substring(4))
        result.push(<h3 key={i} className="text-lg font-semibold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processed }} />)
      } else if (line.startsWith('## ')) {
        const processed = processInlineFormatting(line.substring(3))
        result.push(<h2 key={i} className="text-xl font-semibold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processed }} />)
      } else if (line.startsWith('# ')) {
        const processed = processInlineFormatting(line.substring(2))
        result.push(<h1 key={i} className="text-2xl font-bold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processed }} />)
      }
      // 引用处理
      else if (line.startsWith('> ')) {
        const processed = processInlineFormatting(line.substring(2))
        result.push(
          <blockquote key={i} className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-700" dangerouslySetInnerHTML={{ __html: processed }} />
        )
      }
      // 水平线
      else if (line.trim() === '---' || line.trim() === '***') {
        result.push(<hr key={i} className="border-gray-300 my-4" />)
      }
      // 有序列表处理
      else if (/^\d+\.\s/.test(line)) {
        const processed = processInlineFormatting(line.replace(/^\d+\.\s/, ''))
        result.push(
          <ol key={i} className="list-decimal ml-6 mb-2">
            <li dangerouslySetInnerHTML={{ __html: processed }} />
          </ol>
        )
      }
      // 无序列表处理
      else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        const processed = processInlineFormatting(line.substring(2))
        result.push(
          <ul key={i} className="list-disc ml-6 mb-2">
            <li dangerouslySetInnerHTML={{ __html: processed }} />
          </ul>
        )
      }
      // 空行
      else if (line.trim() === '') {
        result.push(<br key={i} />)
      }
      // 普通段落
      else {
        const processed = processInlineFormatting(line)
        result.push(<p key={i} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />)
      }
    }
    
    // 处理未闭合的代码块
    if (inCodeBlock && codeContent.length > 0) {
      result.push(
        <pre key="final-code" className="bg-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <code className="text-sm font-mono">{codeContent.join('\n')}</code>
        </pre>
      )
    }

    return result
  }

  return (
    <div className="markdown-content space-y-2">
      {renderMarkdown(content)}
    </div>
  )
}

export default function CompareFilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const originalId = params.originalId as string
  const derivedId = params.derivedId as string
  
  const [originalFile, setOriginalFile] = useState<FileContent | null>(null)
  const [derivedFile, setDerivedFile] = useState<FileContent | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // 加载文件内容
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true)
      try {
        const [originalResponse, derivedResponse] = await Promise.all([
          getFileContentAPI(originalId),
          getFileContentAPI(derivedId)
        ])
        
        if (originalResponse.code === 0 && originalResponse.data) {
          setOriginalFile({
            id: originalResponse.data.id,
            name: originalResponse.data.name,
            content: originalResponse.data.content || "",
            type: originalResponse.data.type,
            url: originalResponse.data.url
          })
        } else {
          throw new Error(originalResponse.message || "获取原始文件失败")
        }
        
        if (derivedResponse.code === 0 && derivedResponse.data) {
          const derivedContent = derivedResponse.data.content || ""
          setDerivedFile({
            id: derivedResponse.data.id,
            name: derivedResponse.data.name,
            content: derivedContent,
            type: derivedResponse.data.type,
            url: derivedResponse.data.url
          })
          setEditedContent(derivedContent)
        } else {
          throw new Error(derivedResponse.message || "获取衍生文件失败")
        }
        
      } catch (error) {
        console.error("加载文件失败:", error)
        toast({
          variant: "destructive",
          title: "错误",
          description: error instanceof Error ? error.message : "加载文件内容失败"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (originalId && derivedId) {
      loadFiles()
    }
  }, [originalId, derivedId, toast])
  
  // 保存编辑的内容
  const handleSave = async () => {
    if (!derivedFile) return
    
    setIsSaving(true)
    try {
      const result = await updateFileContentAPI(derivedId, editedContent)
      
      if (result.code === 0) {
        setDerivedFile({
          ...derivedFile,
          content: editedContent
        })
        setIsEditing(false)
        
        toast({
          title: "保存成功",
          description: "文件内容已更新"
        })
      } else {
        throw new Error(result.message || "保存文件失败")
      }
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "无法保存文件内容"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditedContent(derivedFile?.content || "")
    setIsEditing(false)
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回</span>
          </Button>
          <div className="text-lg font-semibold">文件对比预览</div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>编辑</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>取消</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "保存中..." : "保存"}</span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：原始文件 */}
        <div className="flex-1 flex flex-col border-r">
          <div className="p-4 bg-white border-b">
            <h2 className="text-lg font-medium">{originalFile?.name || "原始文件"}</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            {originalFile?.type === "application/pdf" ? (
              <div className="w-full h-full">
                {originalFile?.url ? (
                  <embed
                    src={originalFile.url}
                    type="application/pdf"
                    className="w-full h-full border rounded"
                    title="PDF预览"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <div>PDF文件无法预览</div>
                      <div className="text-sm mt-2">无法获取文件URL</div>
                    </div>
                  </div>
                )}
              </div>
            ) : originalFile?.type?.startsWith('image/') ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={originalFile.url}
                  alt={originalFile.name}
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                />
              </div>
            ) : (
              <div className="bg-white p-4 rounded border shadow-sm">
                <pre className="whitespace-pre-wrap text-sm">
                  {originalFile?.content || "无法显示文件内容"}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧：衍生文件 */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b">
            <h2 className="text-lg font-medium">{derivedFile?.name || "衍生文件"}</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <div className="h-full p-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full resize-none font-mono text-sm"
                  placeholder="在此编辑Markdown内容..."
                />
              </div>
            ) : (
              <div className="h-full p-4 overflow-auto bg-white">
                <SimpleMarkdownRenderer content={derivedFile?.content || ""} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 