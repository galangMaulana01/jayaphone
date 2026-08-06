"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Api, ApiError } from "@/lib/api";
import type { UploadedImage } from "@/lib/types";

export interface ImageUploaderProps {
  id?: string;
  maxFiles?: number;
  required?: boolean;
  label?: string;
  helper?: string;
  folder?: string;
  /** Existing remote images to show when editing an entity. */
  initialImages?: UploadedImage[];
  /** Called after each successful upload/removal with the current images. */
  onChange?: (images: UploadedImage[]) => void;
  /** If enabled, removing a remote image also calls DELETE /upload/image. */
  deleteRemoteOnRemove?: boolean;
  disabled?: boolean;
}

interface CameraState {
  open: boolean;
  error: string | null;
}

function asMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Upload gagal";
}

/**
 * Reusable replacement for legacy imageUploaderHTML/iu* helpers.
 * It uploads files immediately, retains the server response for form payloads,
 * and keeps camera stream cleanup inside the component lifecycle.
 */
export function ImageUploader({
  id = "image-uploader",
  maxFiles = 1,
  required = false,
  label = "Upload Foto",
  helper,
  folder = "jayaphone",
  initialImages = [],
  onChange,
  deleteRemoteOnRemove = false,
  disabled = false,
}: ImageUploaderProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraState>({ open: false, error: null });

  const updateImages = useCallback((next: UploadedImage[]) => {
    setImages(next);
    onChange?.(next);
  }, [onChange]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera({ open: false, error: null });
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (camera.open && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camera.open]);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    setError(null);
    const remaining = maxFiles - images.length;
    if (remaining <= 0) {
      setError(`Maksimal ${maxFiles} foto`);
      return;
    }

    const selected = Array.from(fileList).slice(0, remaining);
    const next = [...images];
    setIsUploading(true);
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        if (!file.type.startsWith("image/")) {
          setError("File harus berupa gambar");
          continue;
        }
        const uploaded = await Api.upload.image(file);
        next.push({ ...uploaded, folder: uploaded.folder ?? folder });
        updateImages([...next]);
        setProgress(Math.round(((index + 1) / selected.length) * 100));
      }
    } catch (uploadError) {
      setError(asMessage(uploadError));
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [folder, images, maxFiles, updateImages]);

  const openCamera = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera({ open: false, error: "Browser tidak mendukung akses kamera langsung" });
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCamera({ open: true, error: null });
    } catch (cameraError) {
      setCamera({ open: false, error: `Tidak bisa akses kamera: ${asMessage(cameraError)}` });
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCamera((current) => ({ ...current, error: "Kamera belum siap" }));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      stopCamera();
      if (!blob) {
        setError("Gagal mengambil foto");
        return;
      }
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      void uploadFiles([file]);
    }, "image/jpeg", 0.9);
  }, [stopCamera, uploadFiles]);

  const removeImage = useCallback(async (index: number) => {
    const image = images[index];
    const next = images.filter((_, imageIndex) => imageIndex !== index);
    updateImages(next);
    if (deleteRemoteOnRemove && image.public_id) {
      try {
        await Api.upload.delete(image.public_id);
      } catch (deleteError) {
        setError(asMessage(deleteError));
      }
    }
  }, [deleteRemoteOnRemove, images, updateImages]);

  return (
    <div id={id} className="space-y-2">
      <label className="label" htmlFor={`${id}-gallery`}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div
        className={`rounded-xl border border-dashed p-3 transition-colors ${isDragging ? "border-brand-teal bg-brand-teal/5" : "border-zinc-300 dark:border-zinc-700"}`}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (!disabled) void uploadFiles(event.dataTransfer.files); }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-ghost flex-1" disabled={disabled || isUploading || images.length >= maxFiles} onClick={() => inputRef.current?.click()}>
            Pilih dari Galeri
          </button>
          <input ref={inputRef} id={`${id}-gallery`} type="file" accept="image/*" multiple={maxFiles > 1} className="hidden" disabled={disabled} onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); }} />
          <button type="button" className="btn-ghost flex-1" disabled={disabled || isUploading || images.length >= maxFiles} onClick={() => void openCamera()}>
            Ambil Foto dengan Kamera
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-400">atau seret dan lepas gambar di sini</p>
      </div>

      {helper && <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{helper}</p>}
      {isUploading && <div className="progress-track" aria-label={`Upload ${progress}%`}><div className="progress-fill bg-brand-teal" style={{ width: `${Math.max(progress, 10)}%` }} /></div>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      {camera.error && <p role="alert" className="text-xs text-red-500">{camera.error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image, index) => (
            <div key={`${image.secure_url}-${index}`} className="group relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
              <a href={image.secure_url} target="_blank" rel="noreferrer">
                <img src={image.secure_url} alt={`${label} ${index + 1}`} className="h-20 w-full object-cover" />
              </a>
              <button type="button" aria-label={`Hapus foto ${index + 1}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" onClick={() => void removeImage(index)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {camera.open && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Ambil foto dengan kamera">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
          <div className="flex justify-center gap-3 bg-zinc-950 p-4">
            <button type="button" className="btn-ghost text-white" onClick={stopCamera}>Batal</button>
            <button type="button" className="btn-primary px-6" onClick={capturePhoto}>Ambil Foto</button>
          </div>
        </div>
      )}
    </div>
  );
}
