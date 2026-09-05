'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/translations';
import type { ProductImageMode } from '@/services/product-images/product-image.schemas';

interface ProductImageStudioProps {
  images: string[];
  onChange: (images: string[]) => void;
  copy: Dictionary['productFormPage'];
  aiEnabled: boolean;
  upgradeRequired: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function ProductImageStudio({ images, onChange, copy, aiEnabled, upgradeRequired, onBusyChange }: ProductImageStudioProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState('');
  const [mode, setMode] = useState<ProductImageMode>('CLEAN_WHITE');
  const [scene, setScene] = useState('');
  const [busy, setBusy] = useState<'upload' | 'enhance' | ''>('');
  const [uploadedSourceUrl, setUploadedSourceUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (sourcePreview.startsWith('blob:')) URL.revokeObjectURL(sourcePreview); }, [sourcePreview]);

  async function chooseFile(file?: File, autoUpload = false, existingUrl = '') {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(copy.imageInvalid);
      return;
    }
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(copy.imageInvalid)); };
      image.src = url;
    }).catch(() => null);
    if (!dimensions || dimensions.width < 600 || dimensions.height < 600) {
      setError(copy.imageInvalid);
      return;
    }
    if (sourcePreview.startsWith('blob:')) URL.revokeObjectURL(sourcePreview);
    setSourceFile(file);
    setSourcePreview(URL.createObjectURL(file));
    setUploadedSourceUrl(existingUrl);
    if (autoUpload) void send('upload', file);
  }

  async function send(endpoint: 'upload' | 'enhance', selectedFile = sourceFile) {
    if (!selectedFile || images.length >= 10) return;
    setBusy(endpoint); onBusyChange?.(true); setError('');
    const form = new FormData();
    form.append('image', selectedFile);
    if (endpoint === 'enhance') {
      form.append('mode', mode);
      form.append('scene', scene);
    }
    try {
      const response = await fetch(`/api/products/images/${endpoint}`, { method: 'POST', body: form });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || copy.imageFailed);
      onChange(images.includes(payload.url) ? images : [...images, payload.url]);
      if (endpoint === 'upload') setUploadedSourceUrl(payload.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.imageFailed);
    } finally {
      setBusy(''); onBusyChange?.(false);
    }
  }

  async function reuseExisting(url: string) {
    setError('');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      await chooseFile(new File([blob], 'product.webp', { type: blob.type || 'image/webp' }), false, url);
    } catch {
      setError(copy.imageReuseFailed);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-4" aria-labelledby="product-image-title">
      <div>
        <h2 id="product-image-title" className="text-sm font-bold text-[var(--foreground)]">{copy.imagesTitle}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{copy.imagesDescription}</p>
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium leading-5 text-blue-800">{copy.imageDimensionsHint}</p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${copy.productImageAlt} ${index + 1}`} className="aspect-square w-full object-contain" />
              <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                <button type="button" onClick={() => reuseExisting(url)} className="flex-1 rounded-md bg-black/75 px-1.5 py-1 text-[10px] font-semibold text-white">{copy.improveAgain}</button>
                <button type="button" onClick={() => onChange(images.filter((_, i) => i !== index))} className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white" aria-label={copy.removeImage}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] text-center hover:border-[var(--primary)]">
          {sourcePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sourcePreview} alt={copy.sourcePreviewAlt} className="h-full w-full object-contain" />
          ) : <span className="px-4 text-xs font-semibold leading-5 text-[var(--muted-foreground)]">{copy.chooseImage}</span>}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void chooseFile(event.target.files?.[0], true); }} />

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {([
              ['CLEAN_WHITE', copy.modeWhite],
              ['TRANSPARENT', copy.modeTransparent],
              ['LIFESTYLE', copy.modeLifestyle],
            ] as Array<[ProductImageMode, string]>).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${mode === value ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}>{label}</button>
            ))}
          </div>
          {mode === 'LIFESTYLE' && (
            <textarea value={scene} onChange={(event) => setScene(event.target.value)} maxLength={500} rows={3} placeholder={copy.scenePlaceholder} className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" />
          )}
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">{aiEnabled ? copy.aiImageNotice : upgradeRequired ? copy.aiImageUpgradeRequired : copy.aiImageUnavailable}</p>
          {uploadedSourceUrl && <p role="status" className="text-xs font-bold text-emerald-700">✓ {copy.imageUploaded}</p>}
          {upgradeRequired && <Link href="/dashboard/subscription" className="inline-flex text-xs font-bold text-[var(--primary)] underline underline-offset-4">{copy.aiUpgradeLink}</Link>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => send('enhance')} disabled={!aiEnabled || !sourceFile || !!busy || images.length >= 10} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy === 'enhance' ? copy.enhancingImage : copy.enhanceImage}
            </button>
            <button type="button" onClick={() => send('upload')} disabled={!sourceFile || !!uploadedSourceUrl || !!busy || images.length >= 10} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50">
              {busy === 'upload' ? copy.uploadingImage : copy.useOriginal}
            </button>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      <p className="text-[11px] text-[var(--muted-foreground)]">{images.length}/10</p>
    </section>
  );
}
