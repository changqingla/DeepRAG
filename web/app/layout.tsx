import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/ui/use-toast"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DeepRAG - 智能检索增强生成系统",
  description: "基于前沿语言模型构建的深度研究助手，可以帮助您在网络上搜索、浏览信息，以及处理复杂任务。",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <ToastProvider>
          <div className="flex items-center justify-center w-full h-full min-h-screen">{children}</div>
            <Toaster richColors position="top-right" />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
