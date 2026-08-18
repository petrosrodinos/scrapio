import type { FC } from "react";
import { cn } from "@/lib/utils";
import { environments } from "@/config/environments";

interface AppLogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export const AppLogo: FC<AppLogoProps> = ({
  className,
  markClassName,
  showWordmark = false,
  wordmarkClassName,
}) => {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt={showWordmark ? "" : environments.APP_NAME}
        className={cn("shrink-0 rounded-[22%] object-cover", markClassName ?? "h-7 w-7")}
      />
      {showWordmark ? (
        <span className={cn("truncate font-semibold tracking-tight text-foreground", wordmarkClassName)}>
          {environments.APP_NAME}
        </span>
      ) : null}
    </span>
  );
};
