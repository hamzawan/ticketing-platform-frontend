"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

export type UploadedImage = { id: string; file: File; previewUrl: string };

export function ImageUploader({
  images,
  onChange,
}: {
  images: UploadedImage[];
  onChange: (imgs: UploadedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newImgs: UploadedImage[] = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map((f) => ({ id: `img-${Date.now()}-${Math.random()}`, file: f, previewUrl: URL.createObjectURL(f) }));
      onChange([...images, ...newImgs]);
    },
    [images, onChange],
  );

  const remove = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    onChange(images.filter((i) => i.id !== id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl px-6 py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dragging ? "bg-primary/20" : "bg-secondary"}`}>
          <Upload size={18} className={dragging ? "text-primary" : "text-muted-foreground"} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drag images here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP — multiple allowed</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden bg-secondary aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt={img.file.name} className="w-full h-full object-cover" />
              {idx === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Cover</div>
              )}
              <button
                type="button"
                onClick={() => remove(img.id)}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X size={11} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-white text-[10px] truncate">{img.file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
