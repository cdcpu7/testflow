import { X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export function ImageModal({ open, onClose, imageUrl, title }: ImageModalProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = title || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={handleDownload}
              data-testid="button-download-image"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <img
            src={imageUrl}
            alt={title || "Preview"}
            className="w-full h-auto max-h-[80vh] object-contain bg-black/90"
            data-testid="image-preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
