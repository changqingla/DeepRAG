"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutGrid, Database, BookOpen, FileText, Settings, LogOut, Grid } from "lucide-react"
import Logo from "@/components/logo"
import { SettingsDialog } from "./settings-dialog"
import { logout } from "@/app/actions/auth"

const sidebarItems = [
  {
    title: "首页",
    href: "/dashboard",
    icon: LayoutGrid,
    exactMatch: true,
  },
  {
    title: "知识库",
    href: "/dashboard/knowledge",
    icon: BookOpen,
  },
  {
    title: "聊天助手",
    href: "/dashboard/applications",
    icon: Grid,
  },
  {
    title: "模型管理",
    href: "/dashboard/models",
    icon: Database,
  },
  {
    title: "数据管理",
    href: "/dashboard/data",
    icon: FileText,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // 调用登出服务器操作
      await logout()
      
      // 导航到登录页面
      router.push('/login')
    } catch (error) {
      console.error("退出过程中发生错误:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="w-44 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen text-gray-900 dark:text-gray-100">
      <div className="p-3 border-b border-gray-200 flex justify-center">
        <Logo size="small" />
      </div>

      <div className="flex-1 overflow-auto py-6 px-1">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = item.exactMatch 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-1.5 py-2 rounded-md text-sm font-medium ${
                  isActive ? "bg-[#6366f1] text-white" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <item.icon className={`mr-1.5 h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center px-1.5 py-2 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <Settings className="mr-1.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          设置
        </button>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center px-1.5 py-2 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <LogOut className="mr-1.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          {isLoggingOut ? "退出中..." : "退出"}
        </button>
      </div>
      
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
