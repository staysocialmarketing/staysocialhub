import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  imageAlt?: string;
  title?: string;
  children?: React.ReactNode;
}

export default function ImageLightbox({ open, onOpenChange, imageUrl, imageAlt = "", title, children }: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-black/95 border-0 p-2 space-y-3">
        {title && (
          <DialogHeader>
            <DialogTitle className="text-white">{title}</DialogTitle>
          </DialogHeader>
        )}
        {imageUrl ? (
          /\.(mp4|webm|mov)$/i.test(imageUrl) ? (
            <video src={imageUrl} controls className="w-full rounded-lg max-h-[90vh]" />
          ) : (
            <img src={imageUrl} alt={imageAlt} className="w-full rounded-lg object-contain max-h-[90vh]" />
          )
        ) : (
          <div className="aspect-video flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-white/20" />
          </div>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
