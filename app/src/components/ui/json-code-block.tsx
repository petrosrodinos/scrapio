import type { FC } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import jsonLanguage from "react-syntax-highlighter/dist/esm/languages/prism/json";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

SyntaxHighlighter.registerLanguage("json", jsonLanguage);

interface JsonCodeBlockProps {
  json: string;
  maxHeightClassName: string;
}

export const JsonCodeBlock: FC<JsonCodeBlockProps> = ({ json, maxHeightClassName }) => {
  const { theme } = useTheme();

  return (
    <div className={cn("rounded-lg border border-border overflow-auto", maxHeightClassName)}>
      <SyntaxHighlighter
        language="json"
        style={theme === "dark" ? oneDark : oneLight}
        customStyle={{ margin: 0, padding: "0.75rem", fontSize: "0.75rem", background: "transparent" }}
        codeTagProps={{ style: { background: "transparent" } }}
      >
        {json}
      </SyntaxHighlighter>
    </div>
  );
};
