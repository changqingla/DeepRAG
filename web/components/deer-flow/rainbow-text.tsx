import { cn } from "@/lib/utils";

export function RainbowText({
  animated,
  className,
  children,
}: {
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span 
      className={cn(
        animated && "bg-gradient-to-r from-gray-400 via-gray-800 to-gray-400 bg-clip-text text-transparent bg-[length:500%_auto] animate-[textShine_2s_ease-in-out_infinite_alternate]", 
        className
      )}
      style={animated ? {
        backgroundImage: 'linear-gradient(to right, rgb(156 163 175 / 0.3) 15%, rgb(156 163 175 / 0.75) 35%, rgb(156 163 175 / 0.75) 65%, rgb(156 163 175 / 0.3) 85%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '500% auto',
        animation: 'textShine 2s ease-in-out infinite alternate'
      } : undefined}
    >
      {children}
      <style jsx>{`
        @keyframes textShine {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </span>
  );
} 