import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-sm text-gray-500 mt-1">管理您的账户设置和偏好</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="profile">个人资料</TabsTrigger>
          <TabsTrigger value="account">账户</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>更新您的个人信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input id="name" defaultValue="张三" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">电子邮件</Label>
                <Input id="email" defaultValue="zhangsan@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">个人简介</Label>
                <Input id="bio" defaultValue="AI 爱好者，对大语言模型充满热情" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5]">保存更改</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>账户设置</CardTitle>
              <CardDescription>管理您的账户选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5]">更新密码</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>配置您希望接收的通知</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">电子邮件通知</Label>
                  <p className="text-sm text-gray-500">接收关于账户活动的电子邮件</p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails">营销邮件</Label>
                  <p className="text-sm text-gray-500">接收有关新功能和更新的电子邮件</p>
                </div>
                <Switch id="marketing-emails" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="security-alerts">安全警报</Label>
                  <p className="text-sm text-gray-500">接收有关账户安全的重要通知</p>
                </div>
                <Switch id="security-alerts" defaultChecked />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-[#6366f1] hover:bg-[#4f46e5]">保存偏好</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
