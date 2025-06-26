import { cn } from "@/lib/utils";

const EXAMPLE_QUESTIONS = [
  "谁是笨蛋",
  "特斯拉电池与汽油发动机相比能用多少年？",
  "生产1公斤啤酒需要多少升水？",
  "光速比声速快多少倍？",
];

export function ConversationStarter({
  className,
  onSend,
}: {
  className?: string;
  onSend?: (message: string) => void;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
        {EXAMPLE_QUESTIONS.map((question, index) => (
          <div
            key={index}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 hover:shadow-sm"
            onClick={() => onSend?.(question)}
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">{question}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 