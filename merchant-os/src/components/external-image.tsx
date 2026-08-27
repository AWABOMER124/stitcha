'use client';

import Image, { type ImageLoader, type ImageProps } from 'next/image';
import { useState } from 'react';

const externalLoader: ImageLoader = ({ src }) => src;

type ExternalImageProps = Omit<ImageProps, 'loader' | 'unoptimized'>;

export function normalizePublicImageUrl(src: string): string {
  try {
    const parsed = new URL(src);
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname) && parsed.pathname.startsWith('/uploads/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
    if (parsed.protocol === 'http:' && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname)) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
    return src;
  } catch {
    return src.startsWith('uploads/') ? `/${src}` : src;
  }
}

/**
 * Layout-safe image for merchant-managed external URLs.
 *
 * The built-in optimizer is intentionally disabled until production storage
 * has a fixed allow-listed CDN host. Next/Image still provides dimensions,
 * responsive `sizes`, lazy loading, and decoding behavior without turning the
 * deployment into an unrestricted remote-image proxy.
 */
export function ExternalImage(props: ExternalImageProps) {
  const { alt, src, onError, fill, width, height, className, ...imageProps } = props;
  const normalizedSrc = typeof src === 'string' ? normalizePublicImageUrl(src) : src;
  const normalizedKey = typeof normalizedSrc === 'string' ? normalizedSrc : JSON.stringify(normalizedSrc);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === normalizedKey) {
    return <span role="img" aria-label={alt || 'Image unavailable'} className={`${fill ? 'absolute inset-0' : 'inline-flex'} items-center justify-center bg-stone-100 text-stone-400 ${className ?? ''}`} style={!fill ? { width: typeof width === 'number' ? width : undefined, height: typeof height === 'number' ? height : undefined } : undefined}>🖼️</span>;
  }
  return <Image {...imageProps} src={normalizedSrc} alt={alt} fill={fill} width={width} height={height} className={className} loader={externalLoader} unoptimized onError={event => { setFailedSrc(normalizedKey); onError?.(event); }} />;
}
