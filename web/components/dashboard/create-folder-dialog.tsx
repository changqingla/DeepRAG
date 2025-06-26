"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateFolder: (data: FolderData) => void
}

export interface FolderData {
  name: string
  description: string
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder
}: CreateFolderDialogProps) {
  const [folderData, setFolderData] = useState<FolderData>({
    name: "",
    description: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateFolder(folderData)
    setFolderData({ name: "", description: "" }) // 重置表单
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="pb-2">
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription className="text-xs">
            创建一个新的文件夹来组织您的数据
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">文件夹名称</Label>
            <Input 
              id="name" 
              placeholder="请输入文件夹名称"
              value={folderData.name}
              onChange={(e) => setFolderData({...folderData, name: e.target.value})}
              required
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">文件夹描述</Label>
            <Textarea 
              id="description" 
              placeholder="请输入文件夹描述"
              value={folderData.description}
              onChange={(e) => setFolderData({...folderData, description: e.target.value})}
              className="text-sm resize-none min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-sm">
              取消
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-sm">
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 