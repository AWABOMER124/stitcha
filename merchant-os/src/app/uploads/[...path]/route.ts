import * as fs from 'fs/promises';
import * as path from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

export async function GET(_request: Request, context: RouteContext<'/uploads/[...path]'>) {
  const { path: segments } = await context.params;
  if (!segments.length || segments.some(segment => !/^[a-zA-Z0-9._-]+$/.test(segment))) {
    return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 });
  }
  const root = path.resolve(process.cwd(), 'public', 'uploads');
  const filePath = path.resolve(root, ...segments);
  if (!filePath.startsWith(`${root}${path.sep}`)) return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 });
  try {
    const file = await fs.readFile(filePath);
    const contentType = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    return new Response(file, { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }
}
