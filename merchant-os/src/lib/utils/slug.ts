/** Slug generation utilities — handles Latin and Arabic text */

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF]/g, (char) => char.charCodeAt(0).toString(36))
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateUniqueSlug(text: string, existingSlugs: string[]): string {
  const base = generateSlug(text);
  if (!existingSlugs.includes(base)) return base;
  let counter = 1;
  while (existingSlugs.includes(`${base}-${counter}`)) counter++;
  return `${base}-${counter}`;
}
