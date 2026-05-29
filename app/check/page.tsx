'use client';
import { useState, useEffect } from 'react';
import { Search, Loader2, Ticket, ArrowLeft, CheckCircle2, Clock, XCircle, ShieldCheck, Music, Calendar, Tag, Users, FileText, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any; description: string }> = {
  'Pending': {
    label: 'Menunggu Konfirmasi',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Clock,
    description: 'Pesanan kamu sudah diterima dan sedang menunggu konfirmasi dari admin.',
  },
  'Dikonfirmasi': {
    label: 'Dikonfirmasi Admin',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: CheckCircle2,
    description: 'Admin sudah mengecek dan mengkonfirmasi pesananmu. Tiket sedang dalam proses.',
  },
  'Ditolak': {
    label: 'Ditolak',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: XCircle,
    description: 'Maaf, pesanan kamu ditolak oleh admin.',
  },
  'Secured': {
    label: 'Tiket Secured! 🎉',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: ShieldCheck,
    description: 'Selamat! Tiket kamu sudah berhasil didapatkan. Admin akan segera menghubungi kamu.',
  },
};

export default function CheckOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [tnc, setTnc] = useState('');

  // Auto-fill dan auto-check jika ada parameter ?id=
  useEffect(() => {
    fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getWebSetting' }) })
      .then(r => r.json())
      .then(d => setTnc(d.tnc || ''))
      .catch(() => { });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) {
        setOrderId(id);
        checkOrderById(id);
      }
    }
  }, []);

  const checkOrderById = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    setLoading(true);
    setResult(null);
    setSearched(true);

    try {
      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkOrder', orderId: idToSearch.trim().toUpperCase() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    checkOrderById(orderId);
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || {
      label: status,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
      icon: Clock,
      description: 'Status tidak diketahui.',
    };
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 font-sans selection:bg-purple-500/30 particles-bg flex flex-col">

      {/* NAVBAR */}
      <nav className="glass sticky top-0 z-50 shadow-2xl shadow-purple-900/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/icon-192.png" alt="TiketYuk" width={36} height={36} className="rounded-lg shadow-lg shadow-purple-900/30" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">Tiket<span className="text-gradient">Yuk</span></h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">Jasa War Tiket Konser</p>
            </div>
          </Link>
          <Link href="/" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white">
            <ArrowLeft size={14} />
            <span className="hidden md:inline">Beranda</span>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden flex-1">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent"></div>
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl"></div>

        <div className="max-w-2xl mx-auto px-4 md:px-8 pt-16 pb-8 relative z-10">
          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full">
              <Search size={14} className="text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-300">Tracking Order</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Cek Status <span className="text-gradient">Pesananmu</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto">
              Masukkan Order ID yang kamu terima saat pemesanan untuk melihat status tiketmu.
            </p>
          </div>

          {/* SEARCH FORM */}
          <form onSubmit={handleCheck} className="mb-8">
            <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 space-y-4 animate-fade-in-up animate-pulse-glow">
              <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-3">
                <Ticket size={14} className="text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Masukkan Order ID</span>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="contoh: TKY-ABC123"
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl p-4 text-sm focus:border-purple-500/50 outline-none text-white transition placeholder:text-gray-600 uppercase tracking-wider font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !orderId.trim()}
                  className="btn-neon px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-sm tracking-widest transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase shrink-0"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                  <span className="hidden md:inline">{loading ? 'Mencari...' : 'Cek'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* RESULT */}
          {searched && !loading && result && (
            <div className="animate-fade-in-up">
              {result.found ? (
                <div className="space-y-4">
                  {/* Status Card */}
                  {(() => {
                    const info = getStatusInfo(result.status);
                    const StatusIcon = info.icon;
                    return (
                      <div className={`${info.bgColor} border ${info.borderColor} rounded-2xl p-6 text-center space-y-3`}>
                        <StatusIcon size={48} className={`${info.color} mx-auto`} />
                        <h3 className={`text-xl font-black ${info.color}`}>{info.label}</h3>
                        <p className="text-gray-400 text-sm">{info.description}</p>
                        {result.status === 'Ditolak' && result.reason && (
                          <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Alasan Penolakan</p>
                            <p className="text-red-300 text-sm">{result.reason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Order Detail Card */}
                  <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-3">
                      <FileText size={14} className="text-purple-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Detail Pesanan</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Order ID</p>
                          <p className="text-purple-400 font-black text-lg tracking-wider font-mono">{result.orderId}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Pemesan</p>
                          <p className="text-white font-medium text-sm">{result.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tanggal Order</p>
                          <p className="text-gray-300 text-sm flex items-center gap-1.5">
                            <Calendar size={12} className="text-purple-400" />
                            {result.date}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Konser</p>
                          <p className="text-white font-medium text-sm flex items-center gap-1.5">
                            <Music size={12} className="text-purple-400" />
                            {result.concertName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Kategori</p>
                          <p className="text-purple-300 text-sm flex items-center gap-1.5">
                            <Tag size={12} className="text-purple-400" />
                            {result.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Tiket</p>
                          <p className="text-gray-300 text-sm flex items-center gap-1.5">
                            <Users size={12} className="text-purple-400" />
                            {result.ticketCount} tiket
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-3 mb-5">
                      <Clock size={14} className="text-purple-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Alur Status</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-2">
                      {['Pending', 'Dikonfirmasi', 'Secured'].map((step, i) => {
                        const steps = ['Pending', 'Dikonfirmasi', 'Secured'];
                        const currentIdx = result.status === 'Ditolak' ? -1 : steps.indexOf(result.status);
                        const isActive = i <= currentIdx;
                        const isCurrent = steps[i] === result.status;
                        const isRejected = result.status === 'Ditolak';

                        return (
                          <div key={step} className="flex items-center gap-2 flex-1">
                            <div className="flex flex-col items-center gap-1.5 flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isRejected && i === 0 ? 'bg-red-500/20 border-2 border-red-500/50 text-red-400' :
                                isCurrent ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-110' :
                                  isActive ? 'bg-purple-600/30 border-2 border-purple-500/50 text-purple-300' :
                                    'bg-white/5 border-2 border-white/10 text-gray-600'
                                }`}>
                                {i + 1}
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider text-center ${isRejected && i === 0 ? 'text-red-400' :
                                isCurrent ? 'text-purple-300' :
                                  isActive ? 'text-purple-400' : 'text-gray-600'
                                }`}>{step}</span>
                            </div>
                            {i < 2 && (
                              <div className={`h-0.5 flex-1 rounded-full -mt-5 ${isActive && i < currentIdx ? 'bg-purple-500/50' : 'bg-white/5'
                                }`}></div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {result.status === 'Ditolak' && (
                      <div className="mt-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full">
                          ✕ Pesanan Ditolak
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#12121e] border border-white/5 rounded-2xl p-12 text-center animate-fade-in-up">
                  <Ticket size={48} className="mx-auto text-gray-700 mb-4" />
                  <h3 className="text-white font-bold text-lg mb-2">Order Tidak Ditemukan</h3>
                  <p className="text-gray-500 text-sm">Pastikan Order ID yang kamu masukkan sudah benar.</p>
                  <p className="text-gray-600 text-xs mt-2">Format: TKY-XXXXXX</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* TNC SECTION */}
      {tnc && (
        <section className="max-w-4xl mx-auto px-4 md:px-8 pb-12 w-full mt-auto">
          <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 md:p-8 animate-fade-in-up text-center">
            <div className="flex items-center justify-center gap-2 mb-4 text-gray-400">
              <ClipboardCheck size={16} className="text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-widest">Syarat & Ketentuan</span>
            </div>
            <div className="text-gray-400 leading-relaxed whitespace-pre-line text-sm text-left inline-block">
              {tnc}
            </div>
          </div>
        </section>
      )}


      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <img src="/icon-192.png" alt="TiketYuk" width={20} height={20} className="rounded" />
            <span className="text-sm font-black text-white">Tiket<span className="text-gradient">Yuk</span></span>
          </div>
          <div className="flex justify-center gap-4 py-2">
            <Link href="/s/tiktok" className="text-gray-500 hover:text-purple-400 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
            </Link>
            <Link href="/s/ig" className="text-gray-500 hover:text-pink-400 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </Link>
            <Link href="https://x.com/tiketyuk" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition flex items-center justify-center">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
