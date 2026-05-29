/*
 * Header Doc
 * Purpose : Home page (beranda) TiketYuk — kawaii light theme
 * Caller  : / (root route)
 * Dependencies: API /api/sheet → getConcerts, getWebSetting
 * Main Functions: HomePage — fetch concerts, render cards + hero + TNC
 * Side Effects  : GET /api/sheet, SEO JSON-LD
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Search, Music, MapPin, Calendar, ChevronRight,
  Loader2, Ticket, Volume2, ClipboardCheck, ChevronDown, Sparkles
} from 'lucide-react';
import Link from 'next/link';

const formatRupiah = (val: string) => {
  if (!val) return 'To be announce';
  return val.split(' - ').map(v => {
    const num = parseInt(v.trim().replace(/\D/g, ''), 10);
    if (isNaN(num)) return v.trim();
    return 'Rp ' + num.toLocaleString('id-ID');
  }).join(' - ');
};

const STATUS_BADGE: Record<string, string> = {
  active:   'badge-active',
  upcoming: 'badge-upcoming',
  soldout:  'badge-soldout',
  closed:   'badge-closed',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Open', upcoming: 'Coming Soon', soldout: 'Slot Full', closed: 'Closed',
};

export default function HomePage() {
  const [concerts, setConcerts]     = useState<any[]>([]);
  const [webSetting, setWebSetting] = useState<{ announce: string; tnc: string }>({ announce: '', tnc: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [resConcerts, resWeb] = await Promise.all([
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getConcerts' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getWebSetting' }) }),
      ]);
      const concertsData = await resConcerts.json();
      const webData      = await resWeb.json();
      const valid = Array.isArray(concertsData) ? [...concertsData] : [];
      valid.sort((a: any, b: any) => {
        const r: Record<string, number> = { active: 1, upcoming: 2, soldout: 3, closed: 4 };
        return (r[a.status] || 5) - (r[b.status] || 5);
      });
      setConcerts(valid);
      setWebSetting({ announce: webData.announce || '', tnc: webData.tnc || '' });
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = concerts.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const active = filtered.filter(c => c.status !== 'closed');
  const closed = filtered.filter(c => c.status === 'closed');

  /* ── LOADING ── */
  if (loading) return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 animate-pulse opacity-20 absolute inset-0 blur-xl" />
        <Loader2 className="animate-spin text-violet-500 relative z-10" size={48} />
      </div>
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">Loading TiketYuk</p>
        <p className="text-violet-300 text-xs mt-1 font-semibold">✨ Sebentar ya...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen page-bg particles-bg font-sans selection:bg-violet-200">

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "TiketYuk",
          "description": "Layanan jasa war tiket konser musik terpercaya.",
          "url": typeof window !== 'undefined' ? window.location.origin : '',
          "logo": "/icon-512.png",
        })
      }} />

      {/* ══════════════ NAVBAR ══════════════ */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/icon-192.png" alt="TiketYuk" width={40} height={40}
                className="rounded-2xl shadow-lg shadow-violet-300/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-yellow-300 to-pink-400 rounded-full animate-heartbeat shadow-sm" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#2e1065]">
                Tiket<span className="text-gradient">Yuk</span>
              </h1>
              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-[0.2em]">Jasa War Tiket Konser</p>
            </div>
          </Link>

          <Link href="/check"
            className="btn-neon flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-300/40">
            <ClipboardCheck size={14} />
            <span className="hidden sm:inline">Cek Status</span>
          </Link>
        </div>
      </nav>

      {/* ══════════════ ANNOUNCEMENT ══════════════ */}
      {webSetting.announce && (
        <div className="bg-gradient-to-r from-violet-100 via-pink-50 to-violet-100 border-b border-violet-200/60 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <div className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-pink-500 px-3 py-1 rounded-full shadow">
              <Volume2 size={10} className="text-white animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Info</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs text-violet-700 font-bold whitespace-nowrap animate-marquee">
                {webSetting.announce}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Decorative blobs */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 -right-20 w-80 h-80 bg-pink-200/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-gradient-to-r from-violet-100/40 via-pink-100/40 to-violet-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Floating deco emojis */}
        <span className="absolute top-8  left-[8%]  text-3xl sparkle-1 select-none pointer-events-none">✨</span>
        <span className="absolute top-20 right-[10%] text-2xl sparkle-3 select-none pointer-events-none">🎵</span>
        <span className="absolute top-36 left-[20%]  text-xl sparkle-2 select-none pointer-events-none">💜</span>
        <span className="absolute top-12 right-[30%] text-2xl sparkle-4 select-none pointer-events-none">⭐</span>
        <span className="absolute top-48 right-[18%] text-xl sparkle-1 select-none pointer-events-none">🎶</span>
        <span className="absolute top-24 left-[42%]  text-base sparkle-3 select-none pointer-events-none">💫</span>

        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white border-2 border-violet-100 shadow-md shadow-violet-100/50 px-5 py-2 rounded-full animate-bounce-in">
              <Sparkles size={14} className="text-violet-500 animate-heartbeat" />
              <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">✦ Trusted Ticketing Service ✦</span>
              <Sparkles size={14} className="text-pink-400 animate-heartbeat" />
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#2e1065] leading-tight animate-fade-in-up">
              Dapatkan Tiket<br />
              <span className="text-gradient">Konser Impianmu</span> 🎫
            </h2>

            <p className="text-violet-600/80 text-base md:text-lg max-w-xl mx-auto leading-relaxed font-semibold animate-fade-in-up">
              Serahkan urusan war tiket kepada kami. Cepat, aman, dan terpercaya — fokus nonton, sisanya urusan kami! 💜
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap justify-center gap-3 pt-2 animate-fade-in-up">
              {[
                { icon: '🎫', label: 'Trusted Service' },
                { icon: '⚡', label: 'Fast & Reliable' },
                { icon: '🔒', label: 'Aman & Terpercaya' },
                { icon: '💜', label: 'Always Ready' },
              ].map(s => (
                <span key={s.label}
                  className="inline-flex items-center gap-1.5 bg-white border-2 border-violet-100 shadow-sm shadow-violet-100 px-4 py-2 rounded-full text-[11px] font-black text-violet-700 hover:border-violet-300 hover:shadow-md transition-all cursor-default">
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── SEARCH & FILTER ── */}
          <div className="max-w-3xl mx-auto mt-12 animate-fade-in-up">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1 group">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-violet-300 group-focus-within:text-violet-500 transition-colors"
                  size={20} />
                <input
                  type="text"
                  placeholder="Cari konser, venue, atau kota..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-kawaii pl-14 py-4 shadow-lg shadow-violet-100/60 rounded-2xl text-base"
                />
              </div>
              {/* Filter select */}
              <div className="relative shrink-0 md:w-52">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="select-kawaii py-4 pl-5 pr-12 rounded-2xl shadow-lg shadow-violet-100/60 min-h-[56px] text-base"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Open</option>
                  <option value="upcoming">Coming Soon</option>
                  <option value="soldout">Slot Full</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ ACTIVE CONCERTS ══════════════ */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-10 bg-gradient-to-b from-violet-500 to-pink-500 rounded-full shadow shadow-violet-300" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#2e1065]">Konser Tersedia 🎵</h3>
              <p className="text-[11px] text-violet-400 font-bold">{active.length} konser ditemukan</p>
            </div>
          </div>
        </div>

        {active.length === 0 ? (
          <div className="text-center py-24 bg-white border-2 border-dashed border-violet-200 rounded-3xl shadow-sm">
            <div className="text-6xl mb-4 animate-float">🎵</div>
            <p className="text-violet-400 text-sm font-black uppercase tracking-widest">Belum ada konser tersedia</p>
            <p className="text-violet-300 text-xs mt-2 font-semibold">Nantikan update konser terbaru! ✨</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {active.map((concert, idx) => (
              <Link
                key={concert.id}
                href={`/c/${concert.id}`}
                className={`concert-card glass-card rounded-3xl overflow-hidden block group ${['soldout'].includes(concert.status) ? 'opacity-75' : ''}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Image */}
                <div className="aspect-[16/10] overflow-hidden relative">
                  {concert.image ? (
                    <img src={concert.image} alt={concert.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-pink-100">
                      <span className="text-6xl animate-float">🎵</span>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-70 group-hover:opacity-40 transition-opacity" />
                  {/* Status badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md ${STATUS_BADGE[concert.status] || 'badge-closed'}`}>
                      {STATUS_LABEL[concert.status] || concert.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h4 className="text-base font-black text-[#2e1065] group-hover:text-violet-600 transition-colors line-clamp-1 leading-tight">
                    {concert.name}
                  </h4>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-violet-400 shrink-0" />
                      <span className="text-xs text-violet-600 font-semibold">{concert.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-pink-400 shrink-0" />
                      <span className="text-xs text-pink-600 font-semibold line-clamp-1">{concert.venue}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-violet-50">
                    <p className="text-sm font-black text-violet-600">
                      Fee: {formatRupiah(concert.price)}
                    </p>
                    <div className="flex items-center gap-1 text-pink-500 text-[11px] font-black uppercase tracking-wide group-hover:gap-2 transition-all">
                      <span>Pesan</span>
                      <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════ PREVIOUS CONCERTS ══════════════ */}
      {closed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-10 bg-gradient-to-b from-gray-300 to-gray-200 rounded-full" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-400">Previous Concerts</h3>
              <p className="text-[11px] text-gray-300 font-bold">{closed.length} konser selesai</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {closed.map((concert, idx) => (
              <Link
                key={concert.id}
                href={`/c/${concert.id}`}
                className="concert-card bg-white/70 border-2 border-gray-100 rounded-3xl overflow-hidden block group opacity-60 grayscale hover:opacity-80 transition-all"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="aspect-[16/10] overflow-hidden relative">
                  {concert.image ? (
                    <img src={concert.image} alt={concert.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                      <span className="text-5xl opacity-40">🎵</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="badge-closed text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">Closed</span>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h4 className="text-sm font-black text-gray-400 line-clamp-1">{concert.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                    <Calendar size={11} /><span>{concert.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold">
                    <MapPin size={11} /><span className="line-clamp-1">{concert.venue}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════ TNC ══════════════ */}
      {webSetting.tnc && (
        <section className="max-w-4xl mx-auto px-4 md:px-8 pb-12">
          <div className="glass-card rounded-3xl p-6 md:p-8 text-center animate-fade-in-up">
            <div className="flex items-center justify-center gap-2 mb-4 text-violet-500">
              <ClipboardCheck size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Syarat & Ketentuan</span>
            </div>
            <div className="text-violet-600/80 leading-relaxed whitespace-pre-line text-sm text-left font-semibold">
              {webSetting.tnc}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t-2 border-violet-100/70 bg-white/60 py-12 mt-4">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            <img src="/icon-192.png" alt="TiketYuk" width={24} height={24} className="rounded-xl shadow-sm" />
            <span className="text-sm font-black text-[#2e1065]">Tiket<span className="text-gradient">Yuk</span></span>
          </div>
          <p className="text-[10px] text-violet-400 font-black uppercase tracking-[0.3em]">Jasa War Tiket Konser Terpercaya ✨</p>
          <div className="flex justify-center gap-5 py-1">
            <Link href="/s/tiktok" className="text-violet-300 hover:text-violet-500 transition-colors hover:scale-110 inline-block transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
            </Link>
            <Link href="/s/ig" className="text-pink-300 hover:text-pink-500 transition-colors hover:scale-110 inline-block transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </Link>
            <Link href="https://x.com/tiketyuk" target="_blank" rel="noopener noreferrer"
              className="text-violet-300 hover:text-violet-600 transition-colors hover:scale-110 inline-block transition-transform">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
          </div>
          <p className="text-violet-300 text-xs font-bold">&copy; {new Date().getFullYear()} TiketYuk 🎫</p>
        </div>
      </footer>
    </div>
  );
}
