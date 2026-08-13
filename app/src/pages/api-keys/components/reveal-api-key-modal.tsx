import { useState } from "react";
import { Modal, Button, useOverlayState } from "@heroui/react";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RevealApiKeyModalProps {
  state: ReturnType<typeof useOverlayState>;
  apiKey: string | null;
  onClose: () => void;
}

export function RevealApiKeyModal({ state, apiKey, onClose }: RevealApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
    } catch {
      toast({ title: "Could not copy to clipboard", variant: "error" });
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Your new API key</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Copy this key now — you won&apos;t be able to see it again. Treat it like a
                password: anyone with it has full access to your account, including managing your
                other keys.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2">
                <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
                  {apiKey}
                </code>
                <Button variant="secondary" size="sm" onPress={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" isDisabled={!copied} onPress={handleClose}>
                I&apos;ve copied it, close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
