/** Lowercases, strips non `[a-z0-9-]` chars, and caps length — shared by every "generate a slug from a name" call site. */
export function slugify(name: string, maxLen = 50): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, maxLen);
}

/** slugify() plus a base36 timestamp suffix, for slugs that must be unique without a DB round-trip. */
export function uniqueSlug(name: string): string {
  return `${slugify(name)}-${Date.now().toString(36)}`;
}
