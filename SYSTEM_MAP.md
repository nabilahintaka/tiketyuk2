# SYSTEM_MAP — TiketYuk

## Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + globals.css custom
- **Backend**: Google Sheets API (google-spreadsheet + google-auth-library)
- **Notifications**: Discord Bot API (embeds)
- **Upload**: img.mizea.my.id (ShareX-compatible API)
- **Captcha**: Cloudflare Turnstile (opsional)
- **UI Lib**: lucide-react (icons), sweetalert2 (dialogs)

## Directory Structure
```
app/
├── page.tsx               # Homepage — concert listing, search, announcement banner
├── not-found.tsx          # Custom 404 page
├── layout.tsx             # Root layout (font, metadata, icons)
├── globals.css            # Global styles (animations, glass, dark theme)
├── admin/
│   ├── page.tsx           # Admin dashboard — concert CRUD, orders, announcement, short URL, image upload
│   └── login/
│       └── page.tsx       # Admin login page
├── c/
│   └── [id]/
│       └── page.tsx       # Concert detail + order form (public) — /c/{5charId}
├── concert/
│   └── [id]/
│       └── page.tsx       # Legacy redirect → /c/{id}
├── check/
│   └── page.tsx           # Order status check (public)
├── s/
│   └── [slug]/
│       └── route.ts       # Short URL redirect (GET handler)
└── api/
    ├── sheet/
    │   └── route.ts       # Main API — all Google Sheets operations
    └── upload/
        └── route.ts       # Image upload proxy → img.mizea.my.id
```

## Data Flow
```
UI (page.tsx) → POST /api/sheet { action: '...' } → Google Sheets read/write
Admin poster  → POST /api/upload (file) → img.mizea.my.id → returns URL
Short URL     → GET /s/{slug} → resolveShortUrl → 302 redirect
```

## Google Sheets Structure
| Sheet            | Columns                                                                                                                          |
|------------------|----------------------------------------------------------------------------------------------------------------------------------|
| admin            | User, Password, IP, lastSeen                                                                                                     |
| Concerts         | ID (5char), Nama Konser, Venue, Date, Poster, Status, Description, Category, Price, Quanitity, SaleTypes, DayOption, MaxTicket, Seatplan, JasaEnabled, RentMembershipEnabled, SlotLimits, ServiceLimits |
| Order            | OrderId, Date, ConcertName, Fullname, Phone, Email, IdentityType, IdentityNumber, Category, BackupCategories, Qty, Membership, PaymentMethod, SaleType, ServiceType, status, Reason |
| WebSetting       | Payment, IdentType, Announce, Tnc                                                                                                |
| Shorturl         | id, source, dest                                                                                                                 |
| {Concert}-{ID}   | Per-concert order sheet: OrderId, Fullname, Phone, Email, IdentityType, IdentityNumber, DOB, Category, BackupCategories, Qty, Membership, PaymentMethod, SaleType, ServiceType, Status, Timestamp |

## Key API Actions (POST /api/sheet)
- `adminLogin` — Authenticate admin
- `getConcerts` / `getConcert` / `addConcert` / `updateConcert` / `deleteConcert`
  - addConcert: generates 5-char random ID, creates per-concert sheet
  - updateConcert: renames per-concert sheet if nama berubah, updates Order references
  - deleteConcert: removes per-concert sheet
- `createOrder` — Rate-limited (3/min/IP), Turnstile verified, dual-write (Order + per-concert sheet)
- `getOrders` / `checkOrder` / `updateOrderStatus` — Status sync ke per-concert sheet
- `getWebSetting` / `updateWebSetting`
- `getPaymentMethods` — Read from WebSetting.Payment
- `getIdentityTypes` — Read from WebSetting.IdentType
- `getShortUrls` / `addShortUrl` / `updateShortUrl` / `deleteShortUrl` / `resolveShortUrl`
- `debugSheets` — Dev helper

## Environment Variables
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_SHEET_ID`
- `DISCORD_BOT_TOKEN` / `DISCORD_CHANNEL_ID`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — CF Turnstile public key (opsional)
- `TURNSTILE_SECRET_KEY` — CF Turnstile secret key (opsional)
