"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { changePassword } from "@/app/actions/auth"

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { setTheme, theme } = useTheme()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 重置状态
    setPasswordError(null)
    setPasswordSuccess(null)
    
    // 验证新密码和确认密码是否匹配
    if (newPassword !== confirmPassword) {
      setPasswordError("新密码和确认密码不匹配")
      return
    }
    
    setIsChangingPassword(true)
    
    try {
      // 使用server action修改密码
      const formData = new FormData()
      formData.append("currentPassword", currentPassword)
      formData.append("newPassword", newPassword)
      
      const result = await changePassword(formData)
      
      if (result.success) {
        // 密码修改成功
        setPasswordSuccess("密码修改成功")
        // 重置表单
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        // 密码修改失败
        setPasswordError(result.message || "密码修改失败")
      }
    } catch (error) {
      console.error("修改密码过程中发生错误:", error)
      setPasswordError("服务器错误，请稍后再试")
    } finally {
      setIsChangingPassword(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>系统设置</DialogTitle>
          <DialogDescription>
            调整系统设置和个人偏好
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="display">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display">显示设置</TabsTrigger>
            <TabsTrigger value="account">账号设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="display" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-sm">
                暗色模式
              </Label>
              <Switch 
                id="dark-mode" 
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="account" className="space-y-4 py-4">
            {passwordError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            
            {passwordSuccess && (
              <Alert className="mb-4 bg-green-50 text-green-800 border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>{passwordSuccess}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "修改中..." : "更改密码"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 