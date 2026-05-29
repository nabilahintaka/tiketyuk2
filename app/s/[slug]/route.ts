/**
 * Tujuan: Short URL redirect — resolve source slug ke destination URL
 * Caller: Browser (GET /s/{slug})
 * Dependensi: /api/sheet (resolveShortUrl action)
 * Main Functions: GET handler — lookup slug, redirect ke dest
 * Side Effects: HTTP redirect
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  try {
    // Resolve via API
    const baseUrl = req.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolveShortUrl', source: slug }),
    });
    const data = await res.json();

    if (data.found && data.dest) {
      // Pastikan dest adalah URL valid
      const dest = data.dest.startsWith('http') ? data.dest : `https://${data.dest}`;
      return NextResponse.redirect(dest, 302);
    }
  } catch (e) {
    
  }

  // Not found → redirect ke homepage
  return NextResponse.redirect(new URL('/', req.url));
}
