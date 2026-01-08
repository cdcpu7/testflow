import { X, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SpecViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: "spec" | "schedule";
}

export function SpecViewer({ open, onClose, title, content, type }: SpecViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="prose prose-sm prose-invert max-w-none p-4 bg-muted/30 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
              {content}
            </pre>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
