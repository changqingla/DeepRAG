"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CornerUpRight, Bot, User } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  sources?: {
    title: string
    content: string
    url?: string
  }[]
}

interface MessageBubbleProps {
  message: Message
  isLast?: boolean
}

export function MessageBubble({ message, isLast = false }: MessageBubbleProps) {
  const isUser = message.role === "user"
  
  return (
    <div className={cn(
      "flex w-full gap-3 p-4",
      isUser ? "bg-transparent" : "bg-gray-50 dark:bg-gray-800"
    )}>
      {/* 头像 */}
      <Avatar className={cn(
        "h-8 w-8 rounded-full border",
        isUser ? "bg-indigo-500" : "bg-emerald-500"
      )}>
        {isUser ? (
          <>
            <AvatarFallback>U</AvatarFallback>
            <User className="h-5 w-5 text-white" />
          </>
        ) : (
          <>
            <AvatarFallback>A</AvatarFallback>
            <Bot className="h-5 w-5 text-white" />
          </>
        )}
      </Avatar>
      
      {/* 消息内容 */}
      <div className="flex flex-col gap-2 max-w-[80%]">
        <div className="text-sm">
          {message.content}
        </div>
        
        {/* 引用源 */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-gray-500 font-medium">引用来源：</p>
            <div className="space-y-2">
              {message.sources.map((source, index) => (
                <div 
                  key={index} 
                  className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="font-medium">{source.title}</div>
                  <div className="mt-1 text-gray-600 dark:text-gray-400 line-clamp-2">{source.content}</div>
                  {source.url && (
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 text-indigo-600 dark:text-indigo-400 flex items-center hover:underline"
                    >
                      <CornerUpRight className="h-3 w-3 mr-1" />
                      查看原文
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 