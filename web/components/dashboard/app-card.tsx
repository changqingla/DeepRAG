import { Card, CardContent, CardFooter } from "@/components/ui/card"

interface AppCardProps {
  title: string
  description: string
  image: string
  type: string
  author: string
  copies: string
}

export function AppCard({ title, description, image, type, author, copies }: AppCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-[150px] bg-gray-100">
        <img src={image || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
      </div>
      <CardContent className="p-4 flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium">{title}</h3>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{type}</span>
        </div>
        <div className="mb-2 flex items-center">
          <div className="h-4 w-4 rounded-full bg-[#6366f1] mr-1.5"></div>
          <span className="text-xs text-gray-500">{author}</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto border-t border-gray-100">
        <div className="w-full flex justify-between items-center">
          <span className="text-sm font-medium">Free</span>
          <span className="text-xs text-gray-500">{copies} copies</span>
        </div>
      </CardFooter>
    </Card>
  )
}
