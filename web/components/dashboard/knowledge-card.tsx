import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { BookOpen, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface KnowledgeCardProps {
  title: string
  description: string
  updatedAt: string
  documentsCount: number
}

export function KnowledgeCard({ title, description, updatedAt, documentsCount }: KnowledgeCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-[#EEF2FF] p-2 rounded">
            <BookOpen className="h-5 w-5 text-[#6366f1]" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>编辑</DropdownMenuItem>
              <DropdownMenuItem>添加文档</DropdownMenuItem>
              <DropdownMenuItem>分享</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">删除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="font-medium text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex items-center text-sm text-gray-500">
          <span>最后更新: {updatedAt}</span>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 border-t border-gray-100 mt-4">
        <div className="w-full flex justify-between items-center">
          <span className="text-sm">{documentsCount} 文档</span>
          <button className="text-sm text-[#6366f1]">查看详情</button>
        </div>
      </CardFooter>
    </Card>
  )
}
