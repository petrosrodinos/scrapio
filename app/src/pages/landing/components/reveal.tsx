import type { CSSProperties, FC, ReactNode } from "react";
import { useInView } from "../hooks/use-in-view";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

export const Reveal: FC<RevealProps> = ({ children, className, delayMs = 0 }) => {
  const { ref, isVisible } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("reveal", isVisible && "is-visible", className)}
      style={delayMs ? ({ transitionDelay: `${delayMs}ms` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
};
