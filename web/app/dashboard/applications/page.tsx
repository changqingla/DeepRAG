"use client"

import { useState, useEffect } from "react"
import { MoreHorizontal, User, Plus, Grid, Clock, Trash2, Loader2, AlertCircle, Edit2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateChatbotDialog, ChatbotData } from "@/components/dashboard/create-chatbot-dialog"
import { getChatbots, getModels, getKnowledgeBases, deleteChatbot, createChatbot, updateChatbot } from "@/app/actions/applications"

// 应用类型定义
interface Application {
  id: string;
  name: string;
  description: string;
  create_date: string;
  dataset_ids: string[];
  llm: {
    model_name: string;
    temperature: number;
    // Potentially other LLM fields like top_p, presence_penalty, frequency_penalty
  };
  prompt: { // Assuming this structure based on ChatbotData and typical API responses
    prompt: string;
    rerank_model: string;
    similarity_threshold: number;
    top_n: number;
    show_quote?: boolean;
    keywords_similarity_weight?: number;
    empty_response?: string;
    refine_multiturn?: boolean;
  };
}

// 模型类型定义
interface Model {
  id: string;
  name: string;
}

// 知识库类型定义
interface KnowledgeBase {
  id: string;
  name: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [chatModels, setChatModels] = useState<Model[]>([])
  const [rerankModels, setRerankModels] = useState<Model[]>([])
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [chatbotToEdit, setChatbotToEdit] = useState<Application | null>(null) // Renamed from editingApplication
  const [parseWarningMessage, setParseWarningMessage] = useState<string | null>(null)

  // 加载应用列表和模型数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // 获取聊天助手列表
        const chatbotsResult = await getChatbots()
        if (!chatbotsResult.success) {
          setError(chatbotsResult.message || "无法获取应用列表")
          return
        }
        
        // 格式化聊天助手数据为应用列表
        const formattedApps = chatbotsResult.data.map((chatbot: any) => ({
          id: chatbot.id,
          name: chatbot.name,
          description: chatbot.description || "聊天助手",
          create_date: chatbot.create_date,
          dataset_ids: chatbot.datasets?.map((ds: any) => ds.id) || [],
          llm: chatbot.llm || { model_name: "", temperature: 0 },
          prompt: chatbot.prompt || { // Ensure prompt data is correctly mapped or defaults provided
            prompt: "请根据知识库中的内容来回答问题。当所有知识库内容都与问题无关时，你的回答必须包括\"知识库中未找到您要的答案！\"以下是知识库：{knowledge}。以上是知识库。",
            rerank_model: "",
            similarity_threshold: 0.2,
            top_n: 6,
            // Initialize other prompt fields if necessary
          }
        }))
        setApplications(formattedApps)
        
        // 获取模型列表
        const modelsResult = await getModels()
        if (!modelsResult.success) {
          setError(modelsResult.message || "无法获取模型列表")
          return
        }
        
        setChatModels(modelsResult.data.chatModels)
        setRerankModels(modelsResult.data.rerankModels)
        
        // 获取知识库列表
        const kbResult = await getKnowledgeBases()
        if (!kbResult.success) {
          setError(kbResult.message || "无法获取知识库列表")
          return
        }
        
        setKnowledgeBases(kbResult.data)
      } catch (error) {
        console.error("加载数据时出错:", error)
        setError("加载数据时出错，请稍后再试")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Handler to open dialog for editing
  const handleOpenEditDialog = (app: Application) => {
    setChatbotToEdit(app)
    setIsCreateDialogOpen(true) // Open the same dialog used for creation
  }

  // 处理删除应用
  const handleDeleteApplication = async (applicationId: string) => {
    if (!window.confirm("您确定要删除这个应用吗？此操作无法撤销。")) {
      return
    }
    
    setIsDeleting(applicationId)
    setError(null)
    
    try {
      const result = await deleteChatbot([applicationId])
      
      if (result.success) {
        setSuccessMessage("应用删除成功")
        // 更新应用列表
      setApplications(applications.filter(app => app.id !== applicationId))
        
        // 1秒后清除成功消息
        setTimeout(() => setSuccessMessage(null), 1000)
      } else {
        setError(result.message || "删除应用失败")
      }
    } catch (error) {
      console.error("删除应用时出错:", error)
      setError("删除应用时出错，请稍后再试")
    } finally {
      setIsDeleting(null)
    }
  }
  
  // Combined handler for creating and updating chatbots
  const handleSaveChatbot = async (data: ChatbotData) => {
    setIsCreating(true) // Used for loading state for both create and update
    setError(null)
    setSuccessMessage(null)
    setParseWarningMessage(null) // 清除之前的提醒消息

    try {
      let result;
      console.log("handleSaveChatbot: 开始处理，chatbotToEdit存在:", !!chatbotToEdit);
      
      if (chatbotToEdit) {
        // Update mode
        // The 'data' from CreateChatbotDialog is flat (ChatbotData type)
        // We need to structure it as the updateChatbot action expects (nested llm/prompt structure)
        const formattedData = {
          name: data.name,
          description: data.description,
          dataset_ids: data.knowledgeBaseIds,
          llm: {
            model_name: data.chatModelId,
            temperature: data.temperature
          },
          prompt: {
            prompt: data.prompt,
            rerank_model: data.rerankModelId,
            similarity_threshold: data.similarityThreshold,
            top_n: data.topN
          }
        };
        
        console.log("即将调用updateChatbot，格式化数据:", formattedData);
        result = await updateChatbot(chatbotToEdit.id, formattedData)
        
        console.log("updateChatbot 返回结果:", result);
        
        if (result.success) {
          setSuccessMessage("应用更新成功")
          // Update the application in the list with the returned data or merge with existing
          setApplications(applications.map(app => 
            app.id === chatbotToEdit.id 
              ? { 
                  ...app, 
                  name: data.name,
                  description: data.description,
                  dataset_ids: data.knowledgeBaseIds,
                  llm: { model_name: data.chatModelId, temperature: data.temperature },
                  prompt: {
                    prompt: data.prompt,
                    rerank_model: data.rerankModelId,
                    similarity_threshold: data.similarityThreshold,
                    top_n: data.topN
                  }
                } 
              : app
          ))
          setChatbotToEdit(null) // Reset edit mode
          setParseWarningMessage(null) // 清除提醒消息
          setIsCreateDialogOpen(false) // Close dialog on success
          setTimeout(() => setSuccessMessage(null), 2000)
        } else if ((result as any).requiresParsing) {
          // 处理需要解析文档的情况
          console.log("前端检测到requiresParsing标志，处理未解析文档...");
          console.log("result:", result);
          
          const unparsedInfo = (result as any).unparsedInfo || [];
          console.log("unparsedInfo:", unparsedInfo);
          
          // 生成详细的提醒消息
          let detailMessage = "发现以下未解析的文档：\n";
          unparsedInfo.forEach((info: any) => {
            detailMessage += `\n${info.datasetName}: `;
            detailMessage += info.unparsedDocuments.map((doc: any) => doc.name).join(', ');
          });
          
          console.log("生成的警告消息:", detailMessage);
          setParseWarningMessage(detailMessage);
          
          // 不关闭对话框，让用户了解情况并可以前往处理
          // 不设置错误，只显示警告
        } else {
          // 其他错误情况
          setError(result.message || "更新应用失败")
        }
      } else {
        // Create mode
        // Format the data for create API as well
        const formattedData = {
          name: data.name,
          description: data.description,
          dataset_ids: data.knowledgeBaseIds,
          llm: {
            model_name: data.chatModelId,
            temperature: data.temperature
          },
          prompt: {
            prompt: data.prompt,
            rerank_model: data.rerankModelId,
            similarity_threshold: data.similarityThreshold,
            top_n: data.topN
          }
        };
        
        result = await createChatbot(formattedData)
        if (result.success) {
          setSuccessMessage("创建应用成功")
          const newApp: Application = {
            id: result.data.id,
            name: result.data.name,
            description: result.data.description || "聊天助手",
            create_date: result.data.create_date,
            dataset_ids: result.data.dataset_ids || [], 
            llm: result.data.llm || { model_name: data.chatModelId, temperature: data.temperature },
            prompt: result.data.prompt || { 
              prompt: data.prompt,
              rerank_model: data.rerankModelId,
              similarity_threshold: data.similarityThreshold,
              top_n: data.topN
            }
          }
          setApplications([...applications, newApp])
          setIsCreateDialogOpen(false) // Close dialog on success
          setTimeout(() => setSuccessMessage(null), 2000)
        } else {
          setError(result.message || "创建应用失败")
        }
      }
    } catch (err) {
      console.error(chatbotToEdit ? "更新应用时出错:" : "创建应用时出错:", err)
      console.error("完整的错误信息:", err)
      console.error("错误堆栈:", (err as Error)?.stack)
      setError((chatbotToEdit ? "更新应用时出错，" : "创建应用时出错，") + "请稍后再试")
    } finally {
      setIsCreating(false)
    }
  }
  
  // 格式化日期
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN')
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col w-full h-full p-4 bg-gray-50 dark:bg-gray-900">
      {/* 顶部控制栏（创建按钮）*/}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">聊天助手</h1>
        
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          创建应用
        </Button>
      </div>

      {/* 成功消息 */}
      {successMessage && (
        <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* 错误信息 */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* 加载状态 */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-10 w-10 border-3 border-t-indigo-600 border-indigo-600/30 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">加载应用列表中...</p>
          </div>
        </div>
      ) : (
        /* 应用卡片网格 */
        applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Grid className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">您还没有创建任何应用</p>
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              创建应用
            </Button>
          </div>
        ) : (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-1 flex-1 overflow-y-auto pb-2 pr-20 content-start">
        {applications.map((app) => (
          <Card 
            key={app.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700 flex flex-col h-56"
          >
            <CardContent className="p-3 flex flex-col flex-grow">
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <Grid className="h-4 w-4 text-gray-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-full w-8 h-8"
                      onClick={(e) => e.stopPropagation()} // Prevent card click if any
                      title="更多操作"
                          disabled={isDeleting === app.id || isCreating}
                    >
                          {isDeleting === app.id || isCreating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                      <MoreHorizontal className="h-5 w-5" />
                          )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem 
                      onClick={() => handleOpenEditDialog(app)}
                      className="hover:!bg-blue-100 dark:hover:!bg-blue-800/30 cursor-pointer flex items-center"
                      disabled={isDeleting === app.id || isCreating}
                    >
                      <Edit2Icon className="h-3.5 w-3.5 mr-2 text-blue-600" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteApplication(app.id)}
                      className="text-red-500 hover:!text-red-700 hover:!bg-red-100 dark:hover:!bg-red-800/30 cursor-pointer flex items-center"
                          disabled={isDeleting === app.id || isCreating}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
                  <h3 className="text-sm font-semibold text-gray-800 mb-1.5 truncate text-center" title={app.name}>{app.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-3 text-center flex-grow">{app.description}</p>
              
              <div className="mt-auto pt-0 space-y-0.5 text-gray-500 dark:text-gray-400 text-[10px] text-center">
                <div className="flex items-center justify-center">
                  <User className="h-3 w-3 mr-0.5 text-indigo-500" />
                      {app.llm?.model_name || '未指定模型'}
                </div>
                <div className="flex items-center justify-center">
                  <Clock className="h-3 w-3 mr-0.5 text-indigo-500" />
                      创建于: {formatDate(app.create_date)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
        )
      )}
      
      {/* 创建/编辑聊天助手弹窗 - Uses CreateChatbotDialog for both */} 
      <CreateChatbotDialog
        open={isCreateDialogOpen}
        onOpenChange={(isOpen) => {
          setIsCreateDialogOpen(isOpen)
          if (!isOpen) {
            setChatbotToEdit(null) // Reset edit mode when dialog is closed
            setParseWarningMessage(null) // 清除提醒消息
          }
        }}
        onCreateChatbot={handleSaveChatbot} // Changed to the new combined handler
        availableChatModels={chatModels}
        availableRerankModels={rerankModels}
        availableKnowledgeBases={knowledgeBases}
        editingChatbot={chatbotToEdit} // Pass the chatbot to edit
        isSubmitting={isCreating}
        parseWarningMessage={parseWarningMessage}
      />
    </div>
  )
} 