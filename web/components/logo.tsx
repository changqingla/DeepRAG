"use client"

import Image from "next/image"
import { useState } from "react"

interface LogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export default function Logo({ size = "medium", className = "" }: LogoProps) {
  const [imageError, setImageError] = useState(false)

  // 根据size属性设置不同的尺寸，减小高度以减少上下空白
  const dimensions = {
    small: { width: 80, height: 20 },
    medium: { width: 110, height: 26 },
    large: { width: 140, height: 32 }
  }

  const { width, height } = dimensions[size]
  
  if (imageError) {
    // 如果图片加载失败，显示备用文本
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span style={{ fontSize: Math.min(width / 4, height) * 0.6 }}>DeepRAG</span>
      </div>
    )
  }

  // 使用更紧凑的渲染方式
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logo.jpg"
        alt="DeepRAG Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
        onError={() => {
          console.error("图片加载失败: /logo.jpg")
          setImageError(true)
        }}
      />
    </div>
  )
}
