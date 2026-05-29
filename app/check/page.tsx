/*
 * Header Doc
 * Purpose : Cek status pesanan tiket (public tracking page) — kawaii light theme
 * Caller  : /check route
 * Dependencies: /api/sheet → checkOrder, getWebSetting
 * Main Functions: CheckOrderPage — input order ID, tampilkan status + detail
 * Side Effects  : GET /api/sheet
 */
'use client';
import { useState, useEffect } from 'react';
import {
  Search, Loader2, Ticket, ArrowLeft,
  CheckCircle2, Clock, XCircle, ShieldCheck,
  Calendar, Tag, Users, FileText, ClipboardCheck, Music
} from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, {
  label: string; color: string; bgColor: string; borderColor: string;
  iconBg: string; icon: any; description: string;
}> = {
  'Pending': {
    label: 'Menunggu Konfirmasi',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    icon: Clock,
    description: 'Pesanan kamu sudah diterima dan sedang menunggu konfirmasi dari admin.',
  },
  'Dikonfirmasi': {
    label: 'Dikonfirmasi Admin',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    icon: CheckCircle2,
    description: 'Admin sudah mengecek dan mengkonfirmasi pesananmu. Tiket sedang dalam proses.',
  },
  'Ditolak': {
    label: 'Ditolak',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    icon: XCircle,
    description: 'Maaf, pesanan kamu ditolak oleh admin.',
  },
  'Secured': {
    label: 'Tiket Secured! 🎉',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    icon: ShieldCheck,
    description: 'Selamat! Tiket kamu sudah berhasil didapatkan. Admin akan segera menghubungi kamu.',
  },
};

export default function CheckOrderPage() {
  const [orderId, setOrderId]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [tnc, setTnc]           = useState('');

  useEffect(() => {
    fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getWebSetting' }) })
      .then(r => r.json()).then(d => setTnc(d.tnc || '')).catch(() => {});
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) { setOrderId(id); checkById(id); }
    }
  }, []);

  const checkById = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true); setResult(null); setSearched(true);
    try {
      const res  = await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'checkOrder', orderId: id.trim().toUpperCase() }) });
      const data = await res.json();
      setResult(data);
    } catch { setResult({ found: false }); }
    finally { setLoading(false); }
  };

  const handleCheck = (e: React.FormEvent) => { e.preventDefault(); checkById(orderId); };

  const getStatusInfo = (status: string) =>
    statusConfig[status] || { label: status, color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', iconBg: 'bg-violet-100', icon: Clock, description: 'Status tidak diketahui.' };

  return (
    <div className="min-h-screen page-bg particles-bg font-sans flex flex-col selection:bg-violet-200">

      {/* ══ NAVBAR ══ */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/icon-192.png" alt="TiketYuk" width={40} height={40}
              className="rounded-2xl shadow-lg shadow-violet-300/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#2e1065]">
                Tiket<span className="text-gradient">Yuk</span>
              </h1>
              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-[0.2em]">Jasa War Tiket Konser</p>
            </div>
          </Link>
          <Link href="/" className="btn-outline-kawaii flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Beranda</span>
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden flex-1">
        {/* Blobs */}
        <div className="absolute top-0 -left-20 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 -right-20 w-72 h-72 bg-pink-200/30 rounded-full blur-3xl pointer-events-none" />

        {/* Floating deco */}
        <span className="absolute top-8  left-[8%]  text-2xl sparkle-1 select-none pointer-events-none">✨</span>
        <span className="absolute top-20 right-[10%] text-xl sparkle-3 select-none pointer-events-none">🎫</span>
        <span className="absolute top-36 left-[22%]  text-lg sparkle-2 select-none pointer-events-none">💜</span>

        <div className="max-w-2xl mx-auto px-4 md:px-8 pt-14 pb-10 relative z-10">

          {/* Title */}
          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 bg-white border-2 border-violet-100 shadow-md shadow-violet-100/50 px-5 py-2 rounded-full animate-bounce-in">
              <Search size={14} className="text-violet-500" />
              <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">Tracking Order</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#2e1065] leading-tight animate-fade-in-up">
              Cek Status <span className="text-gradient">Pesananmu</span> 🎫
            </h2>
            <p className="text-violet-500 text-sm max-w-md mx-auto font-semibold animate-fade-in-up">
              Masukkan Order ID yang kamu terima saat pemesanan untuk melihat status tiketmu.
            </p>
          </div>

          {/* ── FORM ── */}
          <form onSubmit={handleCheck} className="mb-8 animate-fade-in-up">
            <div className="glass-card rounded-3xl p-6 space-y-4 animate-pulse-glow">
              <div className="flex items-center gap-2 text-violet-500 border-b-2 border-violet-50 pb-3">
                <Ticket size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Masukkan Order ID</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  placeholder="contoh: TKY-ABC123"
                  className="input-kawaii flex-1 uppercase tracking-widest font-black"
                />
                <button
                  type="submit"
                  disabled={loading || !orderId.trim()}
                  className="btn-neon shrink-0 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  <span className="hidden md:inline">{loading ? 'Mencari...' : 'Cek'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* ── RESULT ── */}
          {searched && !loading && result && (
            <div className="animate-fade-in-up space-y-4">
              {result.found ? (
                <>
                  {/* Status card */}
                  {(() => {
                    const info = getStatusInfo(result.status);
                    const StatusIcon = info.icon;
                    return (
                      <div className={`${info.bgColor} border-2 ${info.borderColor} rounded-3xl p-8 text-center space-y-3 shadow-sm`}>
                        <div className={`w-20 h-20 ${info.iconBg} rounded-full flex items-center justify-center mx-auto shadow-sm`}>
                          <StatusIcon size={36} className={info.color} />
                        </div>
                        <h3 className={`text-xl font-black ${info.color}`}>{info.label}</h3>
                        <p className="text-sm font-semibold text-gray-500">{info.description}</p>
                        {result.status === 'Ditolak' && result.reason && (
                          <div className="mt-3 bg-white border-2 border-red-200 rounded-2xl p-4 text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Alasan Penolakan</p>
                            <p className="text-red-600 text-sm font-semibold">{result.reason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Order detail */}
                  <div className="glass-card rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-violet-500 border-b-2 border-violet-50 pb-3">
                      <FileText size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Detail Pesanan</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="label-kawaii">Order ID</p>
                          <p className="text-violet-600 font-black text-lg tracking-wider font-mono">{result.orderId}</p>
                        </div>
                        <div>
                          <p className="label-kawaii">Nama Pemesan</p>
                          <p className="text-[#2e1065] font-bold text-sm">{result.name}</p>
                        </div>
                        <div>
                          <p className="label-kawaii">Tanggal Order</p>
                          <p className="text-violet-600 text-sm font-semibold flex items-center gap-1.5">
                            <Calendar size={12} className="text-violet-400" />{result.date}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="label-kawaii">Konser</p>
                          <p className="text-[#2e1065] font-bold text-sm flex items-center gap-1.5">
                            <Music size={12} className="text-pink-400" />{result.concertName}
                          </p>
                        </div>
                        <div>
                          <p className="label-kawaii">Kategori</p>
                          <p className="text-violet-600 text-sm font-semibold flex items-center gap-1.5">
                            <Tag size={12} className="text-violet-400" />{result.category}
                          </p>
                        </div>
                        <div>
                          <p className="label-kawaii">Jumlah Tiket</p>
                          <p className="text-violet-600 text-sm font-semibold flex items-center gap-1.5">
                            <Users size={12} className="text-violet-400" />{result.ticketCount} tiket
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="glass-card rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-violet-500 border-b-2 border-violet-50 pb-3 mb-6">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Alur Status</span>
                    </div>
                    <div className="flex items-center px-2">
                      {['Pending', 'Dikonfirmasi', 'Secured'].map((step, i) => {
                        const steps = ['Pending', 'Dikonfirmasi', 'Secured'];
                        const currentIdx = result.status === 'Ditolak' ? -1 : steps.indexOf(result.status);
                        const isActive   = i <= currentIdx;
                        const isCurrent  = steps[i] === result.status;
                        const isRejected = result.status === 'Ditolak';
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-sm ${
                                isRejected && i === 0
                                  ? 'bg-red-100 border-2 border-red-300 text-red-500'
                                  : isCurrent
                                    ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-200 scale-110'
                                    : isActive
                                      ? 'bg-violet-100 border-2 border-violet-300 text-violet-600'
                                      : 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                              }`}>
                                {i + 1}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider text-center ${
                                isRejected && i === 0 ? 'text-red-500' :
                                isCurrent ? 'text-violet-600' : isActive ? 'text-violet-400' : 'text-gray-400'
                              }`}>{step}</span>
                            </div>
                            {i < 2 && (
                              <div className={`timeline-connector ${
                                isActive && i < currentIdx
                                  ? 'bg-gradient-to-r from-violet-400 to-pink-400'
                                  : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {result.status === 'Ditolak' && (
                      <div className="mt-5 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border-2 border-red-200 px-4 py-2 rounded-full">
                          ✕ Pesanan Ditolak
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="glass-card rounded-3xl p-14 text-center animate-fade-in-up">
                  <div className="text-6xl mb-4 animate-float">🎫</div>
                  <h3 className="text-[#2e1065] font-black text-lg mb-2">Order Tidak Ditemukan</h3>
                  <p className="text-violet-500 text-sm font-semibold">Pastikan Order ID yang kamu masukkan sudah benar.</p>
                  <p className="text-violet-300 text-xs mt-2 font-bold">Format: TKY-XXXXXX</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══ TNC ══ */}
      {tnc && (
        <section className="max-w-4xl mx-auto px-4 md:px-8 pb-12 w-full">
          <div className="glass-card rounded-3xl p-6 md:p-8 text-center animate-fade-in-up">
            <div className="flex items-center justify-center gap-2 mb-4 text-violet-500">
              <ClipboardCheck size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Syarat & Ketentuan</span>
            </div>
            <div className="text-violet-600/80 leading-relaxed whitespace-pre-line text-sm text-left font-semibold">
              {tnc}
            </div>
          </div>
        </section>
      )}

      {/* ══ FOOTER ══ */}
      <footer className="border-t-2 border-violet-100/70 bg-white/60 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            <img src="/icon-192.png" alt="TiketYuk" width={24} height={24} className="rounded-xl" />
            <span className="text-sm font-black text-[#2e1065]">Tiket<span className="text-gradient">Yuk</span></span>
          </div>
          <div className="flex justify-center gap-5">
            <Link href="/s/tiktok" className="text-violet-300 hover:text-violet-500 transition hover:scale-110 inline-block">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
            </Link>
            <Link href="/s/ig" className="text-pink-300 hover:text-pink-500 transition hover:scale-110 inline-block">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </Link>
            <Link href="https://x.com/tiketyuk" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-600 transition hover:scale-110 inline-block">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </Link>
          </div>
          <p className="text-violet-300 text-xs font-bold">&copy; {new Date().getFullYear()} TiketYuk 🎫</p>
        </div>
      </footer>
    </div>
  );
}
