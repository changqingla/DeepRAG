"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Logo from "@/components/logo"
import ServiceStatus from "@/components/service-status"
import { register } from "@/app/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    // 验证密码匹配
    if (password !== confirmPassword) {
      setError("两次输入的密码不匹配")
      setIsLoading(false)
      return
    }
    
    try {
      // 使用server action进行注册
      const formData = new FormData()
      formData.append("username", username)
      formData.append("email", email)
      formData.append("password", password)
      formData.append("confirmPassword", confirmPassword)
      
      const result = await register(formData)
      
      if (result.success) {
        // 注册成功，清除错误
        setError(null)
        
        // 如果后端指示应该重定向，就跳转到登录页面
        if (result.shouldRedirect) {
        router.push("/login?registered=true")
        }
      } else {
        // 处理注册失败情况
        setError(result.message || "注册失败，请稍后再试")
      }
    } catch (error) {
      console.error("注册过程中发生错误:", error)
      setError("服务器错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo />
        </div>

        <h2 className="text-xl font-bold text-center mb-4">创建新账号</h2>

        <ServiceStatus />

        {error && (
          <Alert variant="destructive" className="mb-4 mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Input 
              type="text" 
              placeholder="用户名" 
              className="w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Input 
              type="email" 
              placeholder="邮箱地址" 
              className="w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="relative">
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="密码" 
              className="w-full pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="确认密码" 
              className="w-full pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5]"
            disabled={isLoading}
          >
            {isLoading ? "注册中..." : "注册"}
          </Button>
        </form>

        <div className="text-center mt-4 text-sm">
          已有账号？{" "}
          <Link href="/login" className="text-[#6366f1]">
            登录
          </Link>
        </div>
      </div>
    </div>
  )
}
