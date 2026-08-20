import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  ariaLabel: string;
  className?: string;
}

export function CopyButton({ value, ariaLabel, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Could not copy to clipboard", variant: "error" });
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
