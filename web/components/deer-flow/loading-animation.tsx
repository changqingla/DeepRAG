import { cn } from "@/lib/utils";

export function LoadingAnimation({
  className,
  size = "normal",
}: {
  className?: string;
  size?: "normal" | "sm";
}) {
  return (
    <div
      className={cn(
        "flex space-x-1",
        size === "sm" ? "space-x-1" : "space-x-2",
        className,
      )}
    >
      <div
        className={cn(
          "animate-bounce rounded-full bg-gray-400",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        )}
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className={cn(
          "animate-bounce rounded-full bg-gray-400",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        )}
        style={{ animationDelay: "150ms" }}
      ></div>
      <div
        className={cn(
          "animate-bounce rounded-full bg-gray-400",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        )}
        style={{ animationDelay: "300ms" }}
      ></div>
    </div>
  );
} 