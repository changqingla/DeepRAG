"use client"

import { CheckCircle } from 'lucide-react'

export default function ServiceStatus() {
  return (
    <div className="flex items-center justify-center my-3">
      <CheckCircle className="w-4 h-4 text-green-500 mr-1.5" />
      <span className="text-sm text-green-600 dark:text-green-400 font-medium">服务正常</span>
    </div>
  )
}
