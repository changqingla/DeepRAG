import { redirect } from "next/navigation"

export default function Home() {
  // 重定向到仪表盘页面
  redirect("/dashboard")
}
