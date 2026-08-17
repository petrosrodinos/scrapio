import type { FC, ReactNode } from "react";
import { Maximize2, X } from "lucide-react";
import { Modal, useOverlayState } from "@heroui/react";

interface ExpandPreviewModalProps {
  title: string;
  triggerAriaLabel: string;
  children: ReactNode;
}

export const ExpandPreviewModal: FC<ExpandPreviewModalProps> = ({
  title,
  triggerAriaLabel,
  children,
}) => {
  const expandModal = useOverlayState();

  return (
    <>
      <button
        type="button"
        aria-label={triggerAriaLabel}
        onClick={expandModal.open}
        className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      <Modal state={expandModal}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="full">
            <Modal.Dialog className="max-h-[95vh]">
              <Modal.Header>
                <div className="flex items-center justify-between w-full gap-3">
                  <Modal.Heading>{title}</Modal.Heading>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={expandModal.close}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </Modal.Header>
              <Modal.Body>{children}</Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};
