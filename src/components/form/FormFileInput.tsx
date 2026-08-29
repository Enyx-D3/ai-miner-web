"use client";

import { Controller, useFormContext } from "react-hook-form";
import { FileArchive, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import {
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useUploadFileMutation } from "@/redux/api/uploaderApi";

type Props = {
  name: string;
  label?: string;
  description?: string;
  height?: string;
  multiple?: boolean;
  maxFiles?: number;
  type?: "image" | "video" | "archive";
  localOnly?: boolean;
  accept?: string;
  onLocalFiles?: (files: File[]) => void;
  variant?: "default" | "refinery";
};

export default function FormFileInput({
  name,
  label = "Upload File",
  description,
  height = "h-40",
  multiple = false,
  maxFiles = 5,
  type = "image",
  localOnly = false,
  accept,
  onLocalFiles,
  variant = "default",
}: Props) {
  const { control } = useFormContext();
  const [uploadFile, { isLoading }] = useUploadFileMutation();

  const isVideo = type === "video";
  const isArchive = type === "archive";
  const resolvedAccept = accept ?? (isArchive ? ".zip,application/zip,application/x-zip-compressed" : isVideo ? "video/*" : "image/*");

  const validateFiles = (files: File[]) => {
    if (multiple && files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return false;
    }
    for (const file of files) {
      if (isArchive && !file.name.toLowerCase().endsWith(".zip")) {
        toast.error("Please choose a ZIP archive");
        return false;
      }
      if (isVideo && !file.type.startsWith("video/")) {
        toast.error("Only video files are allowed");
        return false;
      }
      if (!isArchive && !isVideo && !file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return false;
      }
    }
    return true;
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const archiveValue = (field.value as File[] | undefined) ?? [];
        const remoteValue = (field.value as string[] | undefined) ?? [];

        const handleFiles = async (list: FileList) => {
          const incoming = Array.from(list);
          if (!validateFiles(incoming)) return;

          if (localOnly || isArchive) {
            const next = multiple ? [...archiveValue, ...incoming].slice(0, maxFiles) : incoming.slice(0, 1);
            field.onChange(next);
            onLocalFiles?.(next);
            return;
          }

          try {
            const formData = new FormData();
            incoming.forEach((file) => formData.append("files", file));
            const res = await uploadFile(formData).unwrap();
            const urls = res?.data?.file_urls || [];
            field.onChange(multiple ? [...remoteValue, ...urls] : urls);
            toast.success("Uploaded successfully");
          } catch {
            toast.error("Upload failed");
          }
        };

        const refinery = variant === "refinery";

        return (
          <Field>
            {label && <FieldLabel>{label}</FieldLabel>}
            <FieldContent>
              <div
                className={`${height} relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white transition ${
                  fieldState.error ? "border-red-500 bg-red-50" : refinery ? "border-[var(--pink)] bg-[var(--pink-light)] hover:bg-[var(--pink-soft)]" : "border-gray-300 hover:border-primary"
                }`}
              >
                <input
                  type="file"
                  multiple={multiple}
                  accept={resolvedAccept}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => event.target.files && handleFiles(event.target.files)}
                />

                <div className="pointer-events-none flex flex-col items-center gap-3 px-6 text-center">
                  <span className={refinery ? "flex size-16 items-center justify-center rounded-2xl bg-[var(--pink-soft)] text-[var(--pink)]" : "text-gray-500"}>
                    {isArchive ? <FileArchive className="size-8" /> : <UploadCloud className="size-8" />}
                  </span>
                  <div>
                    <p className={`font-tight font-extrabold ${refinery ? "text-lg text-foreground" : "text-sm text-gray-600"}`}>
                      {isLoading ? "Uploading..." : isArchive ? "Drag & drop your exported chat history" : isVideo ? "Upload video file" : multiple ? `Upload up to ${maxFiles} images` : "Upload image"}
                    </p>
                    {isArchive && <p className="mt-1 text-sm text-muted-foreground">ZIP archives from supported AI platforms</p>}
                  </div>
                  {refinery && <span className="rounded-xl bg-[var(--pink)] px-6 py-3 text-xs font-bold text-white shadow-pink-cta">CHOOSE ZIP FILE</span>}
                </div>
              </div>

              {isArchive && archiveValue.length > 0 && (
                <div className="mt-3 space-y-2">
                  {archiveValue.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border bg-white p-3">
                      <FileArchive className="size-5 text-[var(--pink)]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          const next = archiveValue.filter((_, i) => i !== index);
                          field.onChange(next);
                          onLocalFiles?.(next);
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!isArchive && remoteValue.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {remoteValue.map((url, index) => (
                    <div key={url} className="relative size-16 overflow-hidden rounded border">
                      {isVideo ? <video src={url} className="h-full w-full object-cover" controls /> : <img src={url} className="h-full w-full object-cover" alt="upload" />}
                      <Button type="button" variant="ghost" size="icon-xs" className="absolute right-0 top-0 rounded-none bg-black/60 text-white hover:bg-black/70" onClick={() => field.onChange(remoteValue.filter((_, i) => i !== index))}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {description && <FieldDescription>{description}</FieldDescription>}
              <FieldError>{fieldState.error?.message}</FieldError>
            </FieldContent>
          </Field>
        );
      }}
    />
  );
}
