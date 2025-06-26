import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Database, MoreHorizontal } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ModelCardProps {
  title: string
  description: string
  type: string
  status: "active" | "inactive"
}

export function ModelCard({ title, description, type, status }: ModelCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-[#EEF2FF] p-2 rounded">
            <Database className="h-5 w-5 text-[#6366f1]" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>编辑</DropdownMenuItem>
              <DropdownMenuItem>配置</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">删除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="font-medium text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex items-center">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{type}</span>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 border-t border-gray-100 mt-4">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full ${status === "active" ? "bg-green-500" : "bg-gray-300"} mr-2`}></div>
            <span className="text-sm">{status === "active" ? "已启用" : "已禁用"}</span>
          </div>
          <Switch checked={status === "active"} />
        </div>
      </CardFooter>
    </Card>
  )
}
