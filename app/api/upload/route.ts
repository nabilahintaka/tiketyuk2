/**
 * Tujuan: Proxy upload gambar ke img.mizea.my.id (DCCDN / ShareX-compatible)
 * Caller: Admin page (poster upload, clipboard paste)
 * Dependensi: img.mizea.my.id/api/sharex
 * Main Functions: POST handler — terima file, forward ke mizea, extract URL dari Set-Cookie
 * Side Effects: HTTP POST ke external API
 *
 * ShareX Config:
 *   POST https://img.mizea.my.id/api/sharex  →  302 + Set-Cookie: results={JSON}
 *   JSON berisi: cdn, custom, proxy, fname, id, mime, uploaded
 *   URL yang dipakai: field "custom" (contoh: https://img.mizea.my.id/dl/xxx)
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const file = incoming.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const fd = new FormData();
    fd.append('file', file, file.name || 'image.png');

    // Upload — redirect: manual agar bisa baca Set-Cookie dari 302
    const res = await fetch('https://img.mizea.my.id/api/sharex', {
      method: 'POST',
      headers: { 'Upload-Source': 'API' },
      body: fd,
      redirect: 'manual',
    });

    // Extract URL dari Set-Cookie header (results=...JSON...)
    const setCookie = res.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/results=([^;]+)/);

    if (cookieMatch) {
      try {
        const decoded = decodeURIComponent(cookieMatch[1]);
        const data = JSON.parse(decoded);
        // Prioritas: custom > cdn > proxy
        const url = data.custom || data.cdn || data.proxy;
        if (url) {
          
          return NextResponse.json({ url });
        }
      } catch (e: any) {
        
      }
    }

    // Fallback: cek body response (untuk kasus server tidak pakai cookie)
    const text = await res.text();
    const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch) return NextResponse.json({ url: urlMatch[0] });

    
    return NextResponse.json({ error: 'Upload gagal — URL tidak ditemukan' }, { status: 500 });
  } catch (error: any) {
    
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
