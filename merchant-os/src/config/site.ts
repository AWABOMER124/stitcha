import { brand } from './brand.config';
export const siteConfig = {
  name: brand.displayName,
  description: brand.descriptionEn,
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
