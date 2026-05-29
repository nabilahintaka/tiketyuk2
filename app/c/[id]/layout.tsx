import { Metadata } from 'next';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> | { id: string } }): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  let concertName = 'Konser';
  let concertImage = '/icon-512.png';
  try {
    const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let creds;
    if (jsonStr) {
      try {
        const c = JSON.parse(jsonStr);
        creds = { email: c.client_email, key: c.private_key };
      } catch (e) {}
    }
    if (!creds) {
      let rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
      rawKey = rawKey.replace(/^["']|["']$/g, '');
      const key = rawKey.replace(/\\n/g, '\n');
      creds = { email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key };
    }

    if (creds && creds.email && creds.key && process.env.GOOGLE_SHEET_ID) {
      const serviceAccountAuth = new JWT({
        email: creds.email,
        key: creds.key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
      await doc.loadInfo();
      const sheet = doc.sheetsByTitle['Concerts'];
      
      if (sheet) {
        const rows = await sheet.getRows();
        const concert = rows.find(r => r.get('ID') === id);
        if (concert) {
          concertName = concert.get('Nama Konser') || 'Konser';
          const img = concert.get('Poster');
          if (img && typeof img === 'string' && img.startsWith('http')) {
            concertImage = img;
          }
        }
      }
    }
  } catch (e) {
    // Fallback if error
  }

  return {
    title: `TiketYuk — Jasa War Tiket ${concertName}`,
    description: `Layanan jasa war tiket konser ${concertName} terpercaya. Dapatkan tiket konser impianmu tanpa repot antri — cepat, aman, dan profesional.`,
    openGraph: {
      images: [concertImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [concertImage],
    },
  };
}

export default function ConcertLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
