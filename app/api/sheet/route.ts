/**
 * Tujuan: API route utama — semua operasi Google Sheets
 * Caller: Semua page (homepage, admin, concert detail, check order)
 * Dependensi: google-spreadsheet, google-auth-library, Discord webhook
 * Main Functions: POST handler dengan action-based routing
 * Side Effects: Read/Write Google Sheets, Discord notification, Turnstile verify
 *
 * Sheet Columns (Concerts): ID, Nama Konser, Venue, Date, Poster, Status, Description, Category, Price, Quanitity, SaleTypes, DayOption, MaxTicket, Seatplan, JasaEnabled, RentMembershipEnabled, SlotLimits, ServiceLimits
 * Sheet Columns (Order): OrderId, Date, ConcertName, Fullname, Phone, Email, IdentityType, IdentityNumber, DOB, Category, BackupCategories, Qty, Membership, PaymentMethod, SaleType, ServiceType, RentMembership, status, Reason
 * Fix: createOrder kini auto-add missing headers (DOB, SaleType, ServiceType, RentMembership, Reason) ke Order sheet & per-concert sheet
 * Fix: updateOrderStatus kini sync kolom Reason ke per-concert sheet
 * Fix: PER_CONCERT_HEADERS kini include kolom Reason
 * Sheet Columns (WebSetting): Payment, IdentType, Announce, Tnc
 * Sheet Columns (Shorturl): id, source, dest
 * Per-Concert Sheet: {ConcertName}-{ID} → OrderId, Fullname, Phone, Email, IdentityType, IdentityNumber, DOB, Category, BackupCategories, Qty, Membership, PaymentMethod, SaleType, ServiceType, RentMembership, Status, Timestamp
 */
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// ─── Credentials ───
const getCredentials = () => {
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonStr) {
    try {
      const creds = JSON.parse(jsonStr);
      return { email: creds.client_email, key: creds.private_key };
    } catch (e) { }
  }
  let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
  rawKey = rawKey.replace(/^["']|["']$/g, '');
  const key = rawKey.replace(/\\n/g, '\n');
  return { email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key };
};
const creds = getCredentials();
const serviceAccountAuth = new JWT({
  email: creds.email,
  key: creds.key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID as string, serviceAccountAuth);

// ─── Rate Limiter (in-memory, per IP) ───
const rateLimitMap = new Map<string, number[]>();
const RL_WINDOW = 60_000; // 1 menit
const RL_MAX = 3;         // maks 3 submit/menit/IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const stamps = (rateLimitMap.get(ip) || []).filter(t => now - t < RL_WINDOW);
  if (stamps.length >= RL_MAX) return false;
  stamps.push(now);
  rateLimitMap.set(ip, stamps);
  return true;
}


// ─── Turnstile Verify ───
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // skip jika belum dikonfigurasi
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch { return false; }
}

// ─── Helpers ───
function generateId(length = 5): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < length; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

/** Cari per-concert sheet berdasarkan ID suffix */
function findConcertSheet(concertId: string) {
  const suffix = `-${concertId}`;
  const title = Object.keys(doc.sheetsByTitle).find(t => t.endsWith(suffix));
  return title ? doc.sheetsByTitle[title] : null;
}

/** Sanitize sheet title (max 100 char, no special chars yang dilarang GSheet) */
function sanitizeSheetTitle(name: string, id: string): string {
  const clean = name.replace(/[\\/*?[\]:]/g, '').trim().substring(0, 90);
  return `${clean}-${id}`;
}

/** Sanitize string input — strip HTML tags & trim */
function sanitize(val: string | undefined | null): string {
  if (!val) return '';
  return val.replace(/<[^>]*>/g, '').trim();
}

/** Validate URL format */
function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url);
}

/** Validate slug: alphanumeric, hyphens, underscores only */
function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

/**
 * Parse slot limits string: "General Sale:15,Presale:10" → { 'General Sale': 15, 'Presale': 10 }
 * Gunakan lastIndexOf(':') agar nama sale type yang mengandung ':' tetap aman.
 */
function parseSlotLimits(raw: string): Record<string, number> {
  const limits: Record<string, number> = {};
  if (!raw) return limits;
  raw.split(',').forEach(part => {
    const colonIdx = part.lastIndexOf(':');
    if (colonIdx === -1) return;
    const type = part.substring(0, colonIdx).trim();
    const count = parseInt(part.substring(colonIdx + 1).trim(), 10);
    if (type && !isNaN(count) && count > 0) limits[type] = count;
  });
  return limits;
}

const PER_CONCERT_HEADERS = [
  'OrderId', 'Fullname', 'Phone', 'Email',
  'IdentityType', 'IdentityNumber', 'DOB', 'Category', 'BackupCategories',
  'Qty', 'Membership', 'PaymentMethod', 'SaleType', 'ServiceType', 'RentMembership', 'Status', 'Reason', 'Timestamp',
];

// ─── Discord (Webhook atau Bot API) ───
const sendDiscord = async (embed: any) => {
  // Prioritas: Webhook URL > Bot Token
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (e) { }
    return;
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token || !channelId) return;
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (e) { }
};

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════
let lastLoadTime = 0;
const CACHE_TTL = 60_000; // 60 detik

// Cache untuk getRows (masa hidup 15 detik)
const rowsCache = new Map<string, { time: number; rows: any[] }>();

async function getCachedRows(sheetTitle: string, force = false) {
  if (!force) {
    const cache = rowsCache.get(sheetTitle);
    if (cache && Date.now() - cache.time < 15_000) return cache.rows;
  }
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) return [];
  const rows = await sheet.getRows();
  rowsCache.set(sheetTitle, { time: Date.now(), rows });
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Caching doc.loadInfo() agar tidak hit API berulang kali dalam 1 menit
    if (lastLoadTime === 0 || Date.now() - lastLoadTime > CACHE_TTL) {
      try {
        await doc.loadInfo();
        lastLoadTime = Date.now();
      } catch (err: any) {
        // Jika limit API tercapai, tahan retry selama 10 detik agar tidak hammer
        lastLoadTime = Date.now() - CACHE_TTL + 10_000;
        throw new Error('Gagal memuat data dari Google Sheets. ' + (err.message || ''));
      }
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

    // ========== ADMIN LOGIN ==========
    if (body.action === 'adminLogin') {
      const sheet = doc.sheetsByTitle['admin'];
      if (!sheet) return NextResponse.json({ success: false, error: 'Sheet admin tidak ditemukan' });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const admin = rows.find(r => r.get('User') === body.username && r.get('Password') === body.password);
      if (admin) {
        const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        admin.set('IP', clientIp);
        admin.set('lastSeen', now);
        await admin.save();
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false });
    }

    // ========== GET WEBSETTING (ANNOUNCE & TNC) ==========
    if (body.action === 'getWebSetting') {
      const sheet = doc.sheetsByTitle['WebSetting'];
      if (!sheet) return NextResponse.json({ announce: '', tnc: '' });
      const rows = ['getWebSetting'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows[0];
      return NextResponse.json({ announce: row?.get('Announce') || '', tnc: row?.get('Tnc') || '' });
    }

    // ========== UPDATE WEBSETTING (ANNOUNCE & TNC) ==========
    if (body.action === 'updateWebSetting') {
      const sheet = doc.sheetsByTitle['WebSetting'];
      if (!sheet) return NextResponse.json({ success: false, error: 'Sheet WebSetting tidak ditemukan' });
      const rows = ['updateWebSetting'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      if (rows.length > 0) {
        if (body.announce !== undefined) rows[0].set('Announce', body.announce);
        if (body.tnc !== undefined) rows[0].set('Tnc', body.tnc);
        await rows[0].save();
      } else {
        await sheet.addRow({ Announce: body.announce || '', Tnc: body.tnc || '' });
      }
      rowsCache.delete('WebSetting');
      return NextResponse.json({ success: true });
    }


    // ========== GET ALL CONCERTS ==========
    if (body.action === 'getConcerts') {
      const sheet = doc.sheetsByTitle['Concerts'];
      if (!sheet) return NextResponse.json([]);
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      return NextResponse.json(rows.map((row, idx) => ({
        id: row.get('ID') || `c-${idx}`,
        name: row.get('Nama Konser') || '',
        venue: row.get('Venue') || '',
        date: row.get('Date') || '',
        image: row.get('Poster') || '',
        status: row.get('Status') || 'active',
        description: row.get('Description') || '',
        categories: row.get('Category') || '',
        price: row.get('Price') || '',
        quantity: row.get('Quanitity') || '',
        saleTypes: row.get('SaleTypes') || '',
        dayOption: (row.get('DayOption') || '').toString().toLowerCase() === 'true',
        maxTicket: row.get('MaxTicket') || '10',
        seatplan: row.get('Seatplan') || '',
        jasaEnabled: (row.get('JasaEnabled') || '').toString().toLowerCase() === 'true',
        rentMembershipEnabled: (row.get('RentMembershipEnabled') || '').toString().toLowerCase() === 'true',
        slotLimits: parseSlotLimits(row.get('SlotLimits') || ''),
        slotLimitsRaw: row.get('SlotLimits') || '',
        serviceLimits: parseSlotLimits(row.get('ServiceLimits') || ''),
        serviceLimitsRaw: row.get('ServiceLimits') || '',
      })).filter(c => c.name).reverse());
    }

    // ========== GET SINGLE CONCERT ==========
    if (body.action === 'getConcert') {
      const sheet = doc.sheetsByTitle['Concerts'];
      if (!sheet) return NextResponse.json({ found: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('ID') === body.concertId);
      if (!row) return NextResponse.json({ found: false });
      // Hitung slotCounts & serviceCounts dari per-concert sheet secara paralel
      const slotLimits = parseSlotLimits(row.get('SlotLimits') || '');
      const serviceLimits = parseSlotLimits(row.get('ServiceLimits') || '');
      const needSlotCounts = Object.keys(slotLimits).length > 0;
      const needServiceCounts = Object.keys(serviceLimits).length > 0;
      let slotCounts: Record<string, number> = {};
      let serviceCounts: Record<string, number> = {};
      if (needSlotCounts || needServiceCounts) {
        try {
          await doc.loadInfo();
          const pcSheet = findConcertSheet(body.concertId);
          if (pcSheet) {
            const pcRows = await pcSheet.getRows();
            pcRows.forEach(r => {
              if (needSlotCounts) {
                const st = (r.get('SaleType') || '-').trim();
                slotCounts[st] = (slotCounts[st] || 0) + 1;
              }
              if (needServiceCounts) {
                const svc = (r.get('ServiceType') || '-').trim();
                serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
              }
            });
          }
        } catch (_) {}
      }
      return NextResponse.json({
        found: true,
        id: row.get('ID'),
        name: row.get('Nama Konser'),
        venue: row.get('Venue'),
        date: row.get('Date'),
        image: row.get('Poster'),
        status: row.get('Status'),
        description: row.get('Description'),
        categories: row.get('Category'),
        price: row.get('Price'),
        quantity: row.get('Quanitity'),
        saleTypes: row.get('SaleTypes') || '',
        dayOption: (row.get('DayOption') || '').toString().toLowerCase() === 'true',
        maxTicket: row.get('MaxTicket') || '10',
        seatplan: row.get('Seatplan') || '',
        jasaEnabled: (row.get('JasaEnabled') || '').toString().toLowerCase() === 'true',
        rentMembershipEnabled: (row.get('RentMembershipEnabled') || '').toString().toLowerCase() === 'true',
        slotLimits,
        slotCounts,
        slotLimitsRaw: row.get('SlotLimits') || '',
        serviceLimits,
        serviceCounts,
        serviceLimitsRaw: row.get('ServiceLimits') || '',
      });
    }

    // ========== ADD CONCERT (5-char ID + per-concert sheet) ==========
    if (body.action === 'addConcert') {
      const sheet = doc.sheetsByTitle['Concerts'];
      if (!sheet) return NextResponse.json({ success: false, error: 'Sheet Concerts tidak ditemukan' });

      // Auto-add missing headers if necessary
      await sheet.loadHeaderRow();
      const currentHeaders = sheet.headerValues || [];
      const missingHeaders = [];
      if (!currentHeaders.includes('DayOption')) missingHeaders.push('DayOption');
      if (!currentHeaders.includes('MaxTicket')) missingHeaders.push('MaxTicket');
      if (!currentHeaders.includes('Seatplan')) missingHeaders.push('Seatplan');
      if (!currentHeaders.includes('SaleTypes')) missingHeaders.push('SaleTypes');
      if (!currentHeaders.includes('JasaEnabled')) missingHeaders.push('JasaEnabled');
      if (!currentHeaders.includes('RentMembershipEnabled')) missingHeaders.push('RentMembershipEnabled');
      if (!currentHeaders.includes('SlotLimits')) missingHeaders.push('SlotLimits');
      if (!currentHeaders.includes('ServiceLimits')) missingHeaders.push('ServiceLimits');

      if (missingHeaders.length > 0) {
        await sheet.setHeaderRow([...currentHeaders, ...missingHeaders]);
        await doc.loadInfo();
        lastLoadTime = Date.now();
      }

      const concertId = generateId(5);
      const concertName = body.data.name || 'Untitled';

      await sheet.addRow({
        'ID': concertId,
        'Nama Konser': concertName,
        'Venue': body.data.venue,
        'Date': body.data.date,
        'Poster': body.data.image,
        'Status': body.data.status || 'active',
        'Description': body.data.description,
        'Category': body.data.categories,
        'Price': body.data.price,
        'Quanitity': body.data.quantity || '',
        'SaleTypes': body.data.saleTypes || '',
        'DayOption': body.data.dayOption ? 'true' : 'false',
        'MaxTicket': body.data.maxTicket || '10',
        'Seatplan': body.data.seatplan || '',
        'JasaEnabled': body.data.jasaEnabled ? 'true' : 'false',
        'RentMembershipEnabled': body.data.rentMembershipEnabled ? 'true' : 'false',
        'SlotLimits': body.data.slotLimits || '',
        'ServiceLimits': body.data.serviceLimits || '',
      });

      // Buat per-concert sheet
      try {
        const sheetTitle = sanitizeSheetTitle(concertName, concertId);
        const newSheet = await doc.addSheet({ title: sheetTitle, headerValues: PER_CONCERT_HEADERS });
        // Reload agar doc.sheetsByTitle ter-update untuk request berikutnya
        await doc.loadInfo();
        lastLoadTime = Date.now();

      } catch (e: any) {

      }

      rowsCache.delete('Concerts');
      return NextResponse.json({ success: true, concertId });
    }

    // ========== UPDATE CONCERT (+ rename sheet jika nama berubah) ==========
    if (body.action === 'updateConcert') {
      const sheet = doc.sheetsByTitle['Concerts'];
      if (!sheet) return NextResponse.json({ success: false });

      // Auto-add missing headers if necessary
      await sheet.loadHeaderRow();
      const currentHeaders = sheet.headerValues || [];
      const missingHeaders = [];
      if (!currentHeaders.includes('DayOption')) missingHeaders.push('DayOption');
      if (!currentHeaders.includes('MaxTicket')) missingHeaders.push('MaxTicket');
      if (!currentHeaders.includes('Seatplan')) missingHeaders.push('Seatplan');
      if (!currentHeaders.includes('SaleTypes')) missingHeaders.push('SaleTypes');
      if (!currentHeaders.includes('JasaEnabled')) missingHeaders.push('JasaEnabled');
      if (!currentHeaders.includes('RentMembershipEnabled')) missingHeaders.push('RentMembershipEnabled');
      if (!currentHeaders.includes('SlotLimits')) missingHeaders.push('SlotLimits');
      if (!currentHeaders.includes('ServiceLimits')) missingHeaders.push('ServiceLimits');

      if (missingHeaders.length > 0) {
        await sheet.setHeaderRow([...currentHeaders, ...missingHeaders]);
        await doc.loadInfo();
        lastLoadTime = Date.now();
      }

      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('ID') === body.concertId);
      if (!row) return NextResponse.json({ success: false });

      const oldName = row.get('Nama Konser') || '';
      const newName = body.data.name || oldName;

      if (body.data.name) row.set('Nama Konser', body.data.name);
      if (body.data.venue) row.set('Venue', body.data.venue);
      if (body.data.date) row.set('Date', body.data.date);
      if (body.data.image !== undefined) row.set('Poster', body.data.image);
      if (body.data.status) row.set('Status', body.data.status);
      if (body.data.description !== undefined) row.set('Description', body.data.description);
      if (body.data.categories) row.set('Category', body.data.categories);
      if (body.data.price !== undefined) row.set('Price', body.data.price);
      if (body.data.quantity !== undefined) row.set('Quanitity', body.data.quantity);
      if (body.data.saleTypes !== undefined) row.set('SaleTypes', body.data.saleTypes);
      if (body.data.dayOption !== undefined) row.set('DayOption', body.data.dayOption ? 'true' : 'false');
      if (body.data.maxTicket !== undefined) row.set('MaxTicket', body.data.maxTicket);
      if (body.data.seatplan !== undefined) row.set('Seatplan', body.data.seatplan);
      if (body.data.jasaEnabled !== undefined) row.set('JasaEnabled', body.data.jasaEnabled ? 'true' : 'false');
      if (body.data.rentMembershipEnabled !== undefined) row.set('RentMembershipEnabled', body.data.rentMembershipEnabled ? 'true' : 'false');
      if (body.data.slotLimits !== undefined) row.set('SlotLimits', body.data.slotLimits || '');
      if (body.data.serviceLimits !== undefined) row.set('ServiceLimits', body.data.serviceLimits || '');
      await row.save();

      // Rename per-concert sheet jika nama berubah
      if (newName !== oldName) {
        try {
          await doc.loadInfo();
          lastLoadTime = Date.now();
          const concertSheet = findConcertSheet(body.concertId);
          if (concertSheet) {
            const newTitle = sanitizeSheetTitle(newName, body.concertId);
            await concertSheet.updateProperties({ title: newTitle });

          }
          // Update ConcertName di main Order sheet
          const orderSheet = doc.sheetsByTitle['Order'];
          if (orderSheet) {
            const orderRows = await orderSheet.getRows();
            for (const oRow of orderRows) {
              if (oRow.get('ConcertName') === oldName) {
                oRow.set('ConcertName', newName);
                await oRow.save();
              }
            }
          }
        } catch (e: any) { }
      }

      rowsCache.delete('Concerts');
      return NextResponse.json({ success: true });
    }

    // ========== DELETE CONCERT (+ hapus per-concert sheet) ==========
    if (body.action === 'deleteConcert') {
      const sheet = doc.sheetsByTitle['Concerts'];
      if (!sheet) return NextResponse.json({ success: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('ID') === body.concertId);
      if (!row) return NextResponse.json({ success: false });

      await row.delete();

      // Hapus per-concert sheet
      try {
        await doc.loadInfo();
        lastLoadTime = Date.now();
        const concertSheet = findConcertSheet(body.concertId);
        if (concertSheet) {
          await concertSheet.delete();

        }
      } catch (e: any) { }

      rowsCache.delete('Concerts');
      return NextResponse.json({ success: true });
    }

    // ========== GET PAYMENT METHODS (dari WebSetting) ==========
    if (body.action === 'getPaymentMethods') {
      const sheet = doc.sheetsByTitle['WebSetting'];
      if (!sheet) return NextResponse.json({ methods: [] });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const methods = rows.map(r => r.get('Payment')).filter(Boolean);
      return NextResponse.json({ methods });
    }

    // ========== GET IDENTITY TYPES (dari WebSetting.IdentType) ==========
    if (body.action === 'getIdentityTypes') {
      const sheet = doc.sheetsByTitle['WebSetting'];
      if (!sheet) return NextResponse.json({ types: [] });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const types = rows.map(r => r.get('IdentType')).filter(Boolean);
      return NextResponse.json({ types });
    }

    // ========== GET SALE SETTINGS (dari WebSetting.SaleSetting) ==========
    if (body.action === 'getSaleSettings') {
      const sheet = doc.sheetsByTitle['WebSetting'];
      if (!sheet) return NextResponse.json({ settings: [] });
      const rows = await getCachedRows(sheet.title);
      const settings = rows.map(r => r.get('SaleSetting')).filter(Boolean);
      return NextResponse.json({ settings });
    }

    // ========== CREATE ORDER (rate limit + turnstile + dual write) ==========
    if (body.action === 'createOrder') {
      // Rate limit check
      if (!checkRateLimit(clientIp)) {
        return NextResponse.json({ success: false, error: 'Terlalu banyak request. Coba lagi dalam 1 menit.' }, { status: 429 });
      }

      // Turnstile check
      if (body.turnstileToken) {
        const valid = await verifyTurnstile(body.turnstileToken, clientIp);
        if (!valid) {
          return NextResponse.json({ success: false, error: 'Verifikasi captcha gagal.' }, { status: 403 });
        }
      } else {
        // Jika turnstile dikonfigurasi tapi token tidak dikirim
        if (process.env.TURNSTILE_SECRET_KEY) {
          return NextResponse.json({ success: false, error: 'Token captcha diperlukan.' }, { status: 403 });
        }
      }

      const orderSheet = doc.sheetsByTitle['Order'];
      if (!orderSheet) return NextResponse.json({ success: false, error: 'Sheet Order tidak ditemukan' });

      // Auto-add missing headers ke Order sheet (SaleType, ServiceType, RentMembership, DOB mungkin belum ada di sheet lama)
      try {
        await orderSheet.loadHeaderRow();
        const currentOrderHeaders = orderSheet.headerValues || [];
        const missingOrderHeaders: string[] = [];
        if (!currentOrderHeaders.includes('DOB')) missingOrderHeaders.push('DOB');
        if (!currentOrderHeaders.includes('SaleType')) missingOrderHeaders.push('SaleType');
        if (!currentOrderHeaders.includes('ServiceType')) missingOrderHeaders.push('ServiceType');
        if (!currentOrderHeaders.includes('RentMembership')) missingOrderHeaders.push('RentMembership');
        if (missingOrderHeaders.length > 0) {
          await orderSheet.setHeaderRow([...currentOrderHeaders, ...missingOrderHeaders]);
        }
      } catch (_) {}

      const orderId = 'TKY-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

      const orderData = {
        'OrderId': orderId,
        'Date': now,
        'ConcertName': sanitize(body.data.concertName),
        'Fullname': sanitize(body.data.name),
        'Phone': sanitize(body.data.phone),
        'Email': sanitize(body.data.email),
        'IdentityType': sanitize(body.data.identityType),
        'IdentityNumber': sanitize(body.data.identityNumber),
        'DOB': sanitize(body.data.dob),
        'Category': sanitize(body.data.category),
        'BackupCategories': body.data.backupCategories || '-',
        'Qty': body.data.ticketCount,
        'Membership': body.data.membership || '-',
        'PaymentMethod': body.data.paymentMethod || '-',
        'SaleType': sanitize(body.data.saleType) || '-',
        'ServiceType': sanitize(body.data.serviceType) || '-',
        'RentMembership': body.data.rentMembership ? 'Ya' : 'Tidak',
        'status': 'Pending',
        'Reason': '',
      };

      // ── Validasi slot: urutan = ServiceType dulu, lalu SaleType (hanya Jaswar) ──
      if (body.data.concertId) {
        try {
          const concertsSheet = doc.sheetsByTitle['Concerts'];
          if (concertsSheet) {
            const concertRows = await concertsSheet.getRows();
            const concertRow = concertRows.find(r => r.get('ID') === body.data.concertId);
            if (concertRow) {
              await doc.loadInfo();
              const pcSheet = findConcertSheet(body.data.concertId);
              const pcRows = pcSheet ? await pcSheet.getRows() : [];

              // 1. Cek slot ServiceType (Jaswar/Jastip) — selalu dicek jika ada limit
              const serviceType = sanitize(body.data.serviceType || '').trim();
              if (serviceType && serviceType !== '-') {
                const serviceLimits = parseSlotLimits(concertRow.get('ServiceLimits') || '');
                if (serviceLimits[serviceType] !== undefined) {
                  const count = pcRows.filter(r => (r.get('ServiceType') || '-').trim() === serviceType).length;
                  if (count >= serviceLimits[serviceType]) {
                    return NextResponse.json({
                      success: false,
                      error: `Slot untuk jenis jasa "${serviceType}" sudah penuh (${count}/${serviceLimits[serviceType]}). Silakan pilih jenis jasa lain.`,
                    });
                  }
                }
              }

              // 2. Cek slot SaleType — HANYA jika memilih Jaswar (Jastip bebas pilih sale type)
              const saleType = sanitize(body.data.saleType || '').trim();
              if (serviceType === 'Jaswar' && saleType && saleType !== '-') {
                const slotLimits = parseSlotLimits(concertRow.get('SlotLimits') || '');
                if (slotLimits[saleType] !== undefined) {
                  const count = pcRows.filter(r => (r.get('SaleType') || '-').trim() === saleType).length;
                  if (count >= slotLimits[saleType]) {
                    return NextResponse.json({
                      success: false,
                      error: `Slot untuk "${saleType}" sudah penuh (${count}/${slotLimits[saleType]}). Silakan pilih tipe sale lain.`,
                    });
                  }
                }
              }
            }
          }
        } catch (_) {}
      }

      // Tulis ke main Order sheet
      await orderSheet.addRow(orderData);

      // Tulis ke per-concert sheet (reload dulu agar sheetsByTitle fresh)
      if (body.data.concertId) {
        try {
          await doc.loadInfo();
          lastLoadTime = Date.now();
          const concertSheet = findConcertSheet(body.data.concertId);
          if (concertSheet) {
            // Auto-add missing headers ke per-concert sheet (DOB, SaleType, ServiceType, RentMembership, Reason mungkin belum ada)
            try {
              await concertSheet.loadHeaderRow();
              const currentPcHeaders = concertSheet.headerValues || [];
              const missingPcHeaders: string[] = [];
              if (!currentPcHeaders.includes('DOB')) missingPcHeaders.push('DOB');
              if (!currentPcHeaders.includes('SaleType')) missingPcHeaders.push('SaleType');
              if (!currentPcHeaders.includes('ServiceType')) missingPcHeaders.push('ServiceType');
              if (!currentPcHeaders.includes('RentMembership')) missingPcHeaders.push('RentMembership');
              if (!currentPcHeaders.includes('Reason')) missingPcHeaders.push('Reason');
              if (missingPcHeaders.length > 0) {
                await concertSheet.setHeaderRow([...currentPcHeaders, ...missingPcHeaders]);
              }
            } catch (_) {}
            await concertSheet.addRow({
              'OrderId': orderId,
              'Fullname': sanitize(body.data.name),
              'Phone': sanitize(body.data.phone),
              'Email': sanitize(body.data.email),
              'IdentityType': sanitize(body.data.identityType),
              'IdentityNumber': sanitize(body.data.identityNumber),
              'DOB': sanitize(body.data.dob),
              'Category': sanitize(body.data.category),
              'BackupCategories': body.data.backupCategories || '-',
              'Qty': body.data.ticketCount,
              'Membership': body.data.membership || '-',
              'PaymentMethod': body.data.paymentMethod || '-',
              'SaleType': sanitize(body.data.saleType) || '-',
              'ServiceType': sanitize(body.data.serviceType) || '-',
              'RentMembership': body.data.rentMembership ? 'Ya' : 'Tidak',
              'Status': 'Pending',
              'Timestamp': now,
            });

          } else {

          }
        } catch (e: any) { }
      }

      // Discord notification (dengan IP client)
      const dcEmbed = {
        title: "🎫 Order Tiket Baru!",
        description: `**ID:** ${orderId}\n**Konser:** ${body.data.concertName}\n**Nama:** ${body.data.name}\n**HP:** ${body.data.phone}\n**Email:** ${body.data.email}\n**Identitas:** ${body.data.identityType} — ${body.data.identityNumber}\n**TTL:** ${body.data.dob || '-'}\n**Jenis Jasa:** ${body.data.serviceType || '-'}${body.data.rentMembership ? ' + Rent Membership' : ''}\n**Kategori:** ${body.data.category}\n**Cadangan:** ${body.data.backupCategories || '-'}\n**Payment:** ${body.data.paymentMethod || '-'}\n**Qty:** ${body.data.ticketCount}\n**Tipe Sale:** ${body.data.saleType || '-'}\n**Membership:** ${body.data.membership || '-'}`,
        color: 0x8b5cf6,
        timestamp: new Date().toISOString(),
        footer: { text: `TiketYuk • IP: ${clientIp}` }
      };
      await sendDiscord(dcEmbed);

      return NextResponse.json({ success: true, orderId });
    }

    // ========== GET ORDERS ==========
    if (body.action === 'getOrders') {
      const sheet = doc.sheetsByTitle['Order'];
      if (!sheet) return NextResponse.json([]);
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      return NextResponse.json(rows.map(row => ({
        orderId: row.get('OrderId'),
        date: row.get('Date'),
        concertName: row.get('ConcertName'),
        name: row.get('Fullname'),
        phone: row.get('Phone'),
        email: row.get('Email'),
        identityType: row.get('IdentityType'),
        identityNumber: row.get('IdentityNumber'),
        dob: row.get('DOB') || '',
        category: row.get('Category'),
        backupCategories: row.get('BackupCategories') || '-',
        ticketCount: row.get('Qty'),
        membership: row.get('Membership'),
        paymentMethod: row.get('PaymentMethod') || '-',
        saleType: row.get('SaleType') || '-',
        serviceType: row.get('ServiceType') || '-',
        rentMembership: row.get('RentMembership') || 'Tidak',
        status: row.get('status'),
        reason: row.get('Reason') || '',
      })).filter(o => o.orderId).reverse());
    }

    // ========== CHECK ORDER (PUBLIC) ==========
    if (body.action === 'checkOrder') {
      const sheet = doc.sheetsByTitle['Order'];
      if (!sheet) return NextResponse.json({ found: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('OrderId') === body.orderId);
      if (!row) return NextResponse.json({ found: false });
      return NextResponse.json({
        found: true,
        orderId: row.get('OrderId'),
        date: row.get('Date'),
        concertName: row.get('ConcertName'),
        name: row.get('Fullname'),
        dob: row.get('DOB') || '',
        category: row.get('Category'),
        backupCategories: row.get('BackupCategories') || '-',
        ticketCount: row.get('Qty'),
        paymentMethod: row.get('PaymentMethod') || '-',
        status: row.get('status'),
        reason: row.get('Reason') || '',
      });
    }

    // ========== UPDATE ORDER STATUS ==========
    if (body.action === 'updateOrderStatus') {
      const sheet = doc.sheetsByTitle['Order'];
      if (!sheet) return NextResponse.json({ success: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('OrderId') === body.orderId);
      if (!row) return NextResponse.json({ success: false });
      row.set('status', body.status);
      if (body.reason !== undefined) row.set('Reason', body.reason);
      await row.save();

      // Update juga di per-concert sheet jika ada
      try {
        const concertName = row.get('ConcertName');
        // Cari concert ID dari Concerts sheet
        const concertsSheet = doc.sheetsByTitle['Concerts'];
        if (concertsSheet) {
          const cRows = await concertsSheet.getRows();
          const cRow = cRows.find(r => r.get('Nama Konser') === concertName);
          if (cRow) {
            const cId = cRow.get('ID');
            const pcSheet = findConcertSheet(cId);
            if (pcSheet) {
              const pcRows = await pcSheet.getRows();
              const pcRow = pcRows.find(r => r.get('OrderId') === body.orderId);
              if (pcRow) {
                pcRow.set('Status', body.status);
                if (body.reason !== undefined) pcRow.set('Reason', body.reason);
                await pcRow.save();
              }
            }
          }
        }
      } catch (e) { }

      rowsCache.delete('Order');
      return NextResponse.json({ success: true });
    }

    // ========== SHORT URL: GET ALL ==========
    if (body.action === 'getShortUrls') {
      const sheet = doc.sheetsByTitle['Shorturl'];
      if (!sheet) return NextResponse.json([]);
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      return NextResponse.json(rows.map(r => ({
        id: r.get('id'),
        source: r.get('source'),
        dest: r.get('dest'),
      })).filter(r => r.id || r.source));
    }

    // ========== SHORT URL: ADD ==========
    if (body.action === 'addShortUrl') {
      const sheet = doc.sheetsByTitle['Shorturl'];
      if (!sheet) return NextResponse.json({ success: false, error: 'Sheet Shorturl tidak ditemukan' });

      const source = sanitize(body.data.source);
      const dest = sanitize(body.data.dest);

      if (!source || !dest) return NextResponse.json({ success: false, error: 'Data tidak lengkap' });
      if (!isValidSlug(source)) return NextResponse.json({ success: false, error: 'Slug tidak valid' });
      if (!isValidUrl(dest)) return NextResponse.json({ success: false, error: 'URL tujuan tidak valid' });

      const newId = body.data.id || generateId(6);
      await sheet.addRow({
        'id': newId,
        'source': source,
        'dest': dest,
      });
      return NextResponse.json({ success: true, id: newId });
    }

    // ========== SHORT URL: UPDATE ==========
    if (body.action === 'updateShortUrl') {
      const sheet = doc.sheetsByTitle['Shorturl'];
      if (!sheet) return NextResponse.json({ success: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('id') === body.id);
      if (!row) return NextResponse.json({ success: false });

      if (body.data.source !== undefined) {
        const src = sanitize(body.data.source);
        if (!isValidSlug(src)) return NextResponse.json({ success: false, error: 'Slug tidak valid' });
        row.set('source', src);
      }
      if (body.data.dest !== undefined) {
        const dest = sanitize(body.data.dest);
        if (!isValidUrl(dest)) return NextResponse.json({ success: false, error: 'URL tidak valid' });
        row.set('dest', dest);
      }

      await row.save();
      return NextResponse.json({ success: true });
    }

    // ========== SHORT URL: DELETE ==========
    if (body.action === 'deleteShortUrl') {
      const sheet = doc.sheetsByTitle['Shorturl'];
      if (!sheet) return NextResponse.json({ success: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('id') === body.id);
      if (!row) return NextResponse.json({ success: false });
      await row.delete();
      return NextResponse.json({ success: true });
    }

    // ========== SHORT URL: RESOLVE (untuk redirect) ==========
    if (body.action === 'resolveShortUrl') {
      const sheet = doc.sheetsByTitle['Shorturl'];
      if (!sheet) return NextResponse.json({ found: false });
      const rows = ['getConcerts', 'getOrders', 'getShortUrls', 'getPaymentMethods', 'getIdentityTypes'].includes(body.action) ? await getCachedRows(sheet.title) : await sheet.getRows();
      const row = rows.find(r => r.get('source') === body.source);
      if (!row) return NextResponse.json({ found: false });
      return NextResponse.json({ found: true, dest: row.get('dest') || '' });
    }

    // ========== DEBUG ==========
    if (body.action === 'debugSheets') {
      const allSheets = Object.keys(doc.sheetsByTitle);
      const sheetsInfo: any[] = [];
      for (const name of allSheets) {
        const s = doc.sheetsByTitle[name];
        const rows = await s.getRows();
        sheetsInfo.push({ name, headers: s.headerValues || [], rowCount: rows.length });
      }
      return NextResponse.json({ sheets: sheetsInfo });
    }

    return NextResponse.json({ error: 'Action not found' }, { status: 400 });

  } catch (error: any) {
    console.error("API ERROR DETECTED:", error?.stack || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}