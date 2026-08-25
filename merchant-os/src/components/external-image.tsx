import Image, { type ImageLoader, type ImageProps } from 'next/image';

const externalLoader: ImageLoader = ({ src }) => src;

type ExternalImageProps = Omit<ImageProps, 'loader' | 'unoptimized'>;

/**
 * Layout-safe image for merchant-managed external URLs.
 *
 * The built-in optimizer is intentionally disabled until production storage
 * has a fixed allow-listed CDN host. Next/Image still provides dimensions,
 * responsive `sizes`, lazy loading, and decoding behavior without turning the
 * deployment into an unrestricted remote-image proxy.
 */
export function ExternalImage(props: ExternalImageProps) {
  const { alt, ...imageProps } = props;
  return <Image {...imageProps} alt={alt} loader={externalLoader} unoptimized />;
}
