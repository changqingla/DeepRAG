import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

export interface ScrollContainerRef {
  scrollToBottom: () => void;
}

interface ScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollShadowColor?: string;
  autoScrollToBottom?: boolean;
}

export const ScrollContainer = forwardRef<ScrollContainerRef, ScrollContainerProps>(
  ({ children, className, scrollShadowColor = "white", autoScrollToBottom = true }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }));

    useEffect(() => {
      if (autoScrollToBottom) {
        scrollToBottom();
      }
    });

    return (
      <div
        ref={containerRef}
        className={cn(
          "overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
          className,
        )}
        style={{
          background: `linear-gradient(${scrollShadowColor} 30%, rgba(255,255,255,0)),
                      linear-gradient(rgba(255,255,255,0), ${scrollShadowColor} 70%) 0 100%,
                      radial-gradient(50% 0, rgba(0,0,0,.1), rgba(0,0,0,0)),
                      radial-gradient(50% 100%, rgba(0,0,0,.1), rgba(0,0,0,0)) 0 100%`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 40px, 100% 40px, 100% 14px, 100% 14px",
          backgroundAttachment: "local, local, scroll, scroll",
        }}
      >
        {children}
      </div>
    );
  }
); 