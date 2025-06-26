import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并CSS类名
 * @param inputs 
 * @returns 
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 生成随机ID
 * @returns 
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * 等待指定时间
 * @param ms 毫秒
 * @returns 
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 深度克隆对象
 * @param value 要克隆的值
 * @returns 克隆后的值
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 解析JSON字符串
 * @param json JSON字符串
 * @param fallback 解析失败时的默认值
 * @returns 解析结果
 */
export function parseJSON<T>(json: string | null | undefined, fallback: T): T {
  if (!json) {
    return fallback;
  }
  try {
    const raw = json
      .trim()
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
