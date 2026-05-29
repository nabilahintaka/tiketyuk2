/*
 * Header Doc
 * Purpose: Home page (beranda) TiketYuk
 * Caller: / (root route)
 * Dependencies: API /api/sheet actions getConcerts, getWebSetting
 * Main Functions: HomePage component renders concert cards, announcement bar, and TNC.
 * Side Effects: Fetches data from Google Sheet, renders SEO meta, includes social media links.
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Music, MapPin, Calendar, ChevronRight, Loader2, Ticket, Volume2, ClipboardCheck, Star, ChevronDown } from 'lucide-react';
import Link from 'next/link';

/** Format angka mentah ke Rupiah: 50000 → "Rp 50.000", "50000 - 100000" → "Rp 50.000 - Rp 100.000" */
const formatRupiah = (val: string) => {
  if (!val) return 'To be announce';
  return val.split(' - ').map(v => {
    const num = parseInt(v.trim().replace(/\D/g, ''), 10);
    if (isNaN(num)) return v.trim();
    return 'Rp ' + num.toLocaleString('id-ID');
  }).join(' - ');
};

export default function HomePage() {
  const [concerts, setConcerts] = useState<any[]>([]);
  const [webSetting, setWebSetting] = useState<{announce:string, tnc:string}>({announce:'', tnc:''});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [resConcerts, resWeb] = await Promise.all([
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getConcerts' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getWebSetting' }) }),
      ]);
      const concertsData = await resConcerts.json();
      const webData = await resWeb.json();

      const validConcerts = Array.isArray(concertsData) ? concertsData : [];
      const displayConcerts = validConcerts;
      displayConcerts.sort((a: any, b: any) => {
        const rank: Record<string, number> = { active: 1, upcoming: 2, soldout: 3, closed: 4 };
        const rankA = rank[a.status] || 5;
        const rankB = rank[b.status] || 5;
        return rankA - rankB;
      });
      setConcerts(displayConcerts);

      setWebSetting({ announce: webData.announce || '', tnc: webData.tnc || '' });
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredConcerts = concerts.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Pisah konser aktif dan closed (previous)
  const activeConcerts = filteredConcerts.filter(c => c.status !== 'closed');
  const closedConcerts = filteredConcerts.filter(c => c.status === 'closed');

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-purple-500" size={48} />
        <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full"></div>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mt-4">Loading TiketYuk...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 font-sans selection:bg-purple-500/30 particles-bg">
      {/* JSON-LD Structured Data */}
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

      {/* NAVBAR */}
      <nav className="glass sticky top-0 z-50 shadow-2xl shadow-purple-900/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/icon-192.png" alt="TiketYuk" width={36} height={36} className="rounded-lg shadow-lg shadow-purple-900/30 group-hover:shadow-purple-900/50 transition-all" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">Tiket<span className="text-gradient">Yuk</span></h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Jasa War Tiket Konser</p>
            </div>
          </Link>
          <Link href="/check" className="btn-neon px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-purple-900/20">
            <ClipboardCheck size={14} />
            <span className="hidden md:inline">Cek Status</span>
          </Link>
        </div>
      </nav>

      {/* ANNOUNCEMENT BAR */}
      {webSetting.announce && (
        <div className="bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-purple-600/20 border-b border-purple-500/20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="shrink-0 flex items-center gap-2 bg-purple-600/30 px-3 py-1 rounded-full">
              <Volume2 size={12} className="text-purple-300 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Info</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm text-purple-200 font-medium whitespace-nowrap animate-marquee">
                {webSetting.announce}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent"></div>
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-12 relative z-10">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full">
              <Music size={14} className="text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-300">Your Trusted Ticketing Service</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Dapatkan Tiket<br />
              <span className="text-gradient">Konser Impianmu</span>
            </h2>
            <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Serahkan urusan war tiket kepada kami. Cepat, aman, dan terpercaya. Pilih konser favoritmu dan isi formulir pemesanan.
            </p>
          </div>

          {/* SEARCH BAR & FILTER */}
          <div className="max-w-3xl mx-auto mt-10">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition" size={20} />
                <input
                  type="text"
                  placeholder="Cari konser, venue, atau kota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#12121e] border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-purple-500/50 transition-all text-white placeholder:text-gray-600 shadow-2xl shadow-purple-900/5"
                />
              </div>
              <div className="relative shrink-0 md:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-full min-h-[56px] bg-[#12121e] border border-white/10 rounded-2xl py-4 pl-5 pr-10 outline-none focus:border-purple-500/50 transition-all text-white shadow-2xl shadow-purple-900/5 appearance-none cursor-pointer text-sm font-medium"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="soldout">Slot Full</option>
                  <option value="closed">Closed</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="text-gray-500" size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Konser Tersedia</h3>
              <p className="text-[11px] text-gray-500 font-medium">{activeConcerts.length} konser ditemukan</p>
            </div>
          </div>
        </div>

        {activeConcerts.length === 0 ? (
          <div className="text-center py-24 bg-[#12121e] rounded-3xl border border-white/5">
            <Music className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Belum ada konser tersedia</p>
            <p className="text-gray-600 text-xs mt-2">Nantikan update konser terbaru!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeConcerts.map((concert, idx) => (
              <Link
                key={concert.id}
                href={`/c/${concert.id}`}
                className={`concert-card bg-[#12121e] border border-white/5 rounded-2xl overflow-hidden group block ${['soldout'].includes(concert.status) ? 'opacity-70 grayscale contrast-75' : ''}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Image */}
                <div className="aspect-[16/10] bg-black/30 overflow-hidden relative">
                  {concert.image ? (
                    <img
                      src={concert.image}
                      alt={concert.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                      <Music size={48} className="text-gray-700" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] via-transparent to-transparent opacity-60"></div>
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>
                  {/* Status badge */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                    {concert.status && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg shadow-black/20 ${concert.status === 'active' ? 'bg-green-500/80 text-white border border-green-400/50' : concert.status === 'upcoming' ? 'bg-blue-500/80 text-white border border-blue-400/50' : 'bg-red-500/80 text-white border border-red-400/50'}`}>
                        {concert.status === 'soldout' ? 'Slot Full' : concert.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {concert.name}
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Calendar size={13} className="text-purple-400 shrink-0" />
                      <span>{concert.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <MapPin size={13} className="text-pink-400 shrink-0" />
                      <span className="line-clamp-1">{concert.venue}</span>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-purple-400">Fee/Tix: {formatRupiah(concert.price)}</p>

                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider pt-2 group-hover:gap-3 transition-all">
                    <span>Pesan Tiket</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* PREVIOUS CONCERTS SECTION */}
      {closedConcerts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-gray-600 to-gray-800 rounded-full"></div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-gray-400">Previous Concerts</h3>
                <p className="text-[11px] text-gray-600 font-medium">{closedConcerts.length} konser selesai</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {closedConcerts.map((concert, idx) => (
              <Link
                key={concert.id}
                href={`/c/${concert.id}`}
                className="concert-card bg-[#12121e] border border-white/5 rounded-2xl overflow-hidden group block opacity-60 grayscale"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Image */}
                <div className="aspect-[16/10] bg-black/30 overflow-hidden relative">
                  {concert.image ? (
                    <img
                      src={concert.image}
                      alt={concert.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900/20 to-gray-800/20">
                      <Music size={48} className="text-gray-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] via-transparent to-transparent opacity-60"></div>
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-600/80 text-gray-200 border border-gray-500/40 backdrop-blur-sm shadow-lg shadow-black/20">
                      Closed
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h4 className="text-lg font-bold text-gray-400 group-hover:text-gray-300 transition-colors line-clamp-1">
                    {concert.name}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Calendar size={13} className="text-gray-600 shrink-0" />
                      <span>{concert.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <MapPin size={13} className="text-gray-600 shrink-0" />
                      <span className="line-clamp-1">{concert.venue}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-500">Fee/Tix: {formatRupiah(concert.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TNC SECTION */}
      {webSetting.tnc && (
        <section className="max-w-4xl mx-auto px-4 md:px-8 pb-12">
          <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 md:p-8 animate-fade-in-up text-center">
            <div className="flex items-center justify-center gap-2 mb-4 text-gray-400">
              <ClipboardCheck size={16} className="text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-widest">Syarat & Ketentuan</span>
            </div>
            <div className="text-gray-400 leading-relaxed whitespace-pre-line text-sm text-left inline-block">
              {webSetting.tnc}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <img src="/icon-192.png" alt="TiketYuk" width={20} height={20} className="rounded" />
            <span className="text-sm font-black text-white">Tiket<span className="text-gradient">Yuk</span></span>
          </div>
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">
            Jasa War Tiket Konser Terpercaya
          </p>
          <div className="flex justify-center gap-4 py-2">
            <Link href="/s/tiktok" className="text-gray-500 hover:text-purple-400 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
            </Link>
            <Link href="/s/ig" className="text-gray-500 hover:text-pink-400 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </Link>
            <Link href="https://x.com/tiketyuk" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition flex items-center justify-center">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </Link>
          </div>
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} TiketYuk
          </p>
        </div>
      </footer>
    </div>
  );
}
