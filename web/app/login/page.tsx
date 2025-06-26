"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Logo from "@/components/logo"
import ServiceStatus from "@/components/service-status"
import { login } from "@/app/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // 检查URL参数，显示注册成功信息
  useEffect(() => {
    if (searchParams?.has('registered')) {
      setSuccess('注册成功！请使用您的新账号登录。')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      // 使用server action进行登录
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)
      
      const result = await login(formData)
      
      if (result.success) {
        // 登录成功，重定向到仪表盘页面
        router.push("/dashboard")
      } else {
        // 处理登录失败情况
        setError(result.message || "登录失败，请检查您的凭据")
      }
    } catch (error) {
      console.error("登录过程中发生错误:", error)
      setError("服务器错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-md pt-4 px-8 pb-8">
        <div className="flex flex-col items-center mb-2">
          <Logo size="large" />
        </div>

        <ServiceStatus />

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

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Input 
              type="text" 
              placeholder="邮箱" 
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

          <Button 
            type="submit" 
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5]"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </Button>
        </form>

        <div className="text-center mt-4 text-sm">
          还没有账号？{" "}
          <Link href="/register" className="text-[#6366f1]">
            注册
          </Link>
        </div>
      </div>
    </div>
  )
}
