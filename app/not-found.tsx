/**
 * Tujuan: Custom 404 page — halaman tidak ditemukan
 * Caller: Next.js App Router (otomatis ditampilkan saat route tidak ditemukan)
 * Dependensi: lucide-react
 * Main Functions: NotFound component
 * Side Effects: None
 */
import { Ticket, Home, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 font-sans flex flex-col items-center justify-center px-4 particles-bg selection:bg-purple-500/30 relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl"></div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg animate-fade-in-up">

        {/* Logo
        <img src="/icon-192.png" alt="TiketYuk" width={64} height={64} className="rounded-2xl shadow-2xl shadow-purple-900/30 mb-8" /> */}


        {/* 404 Number */}
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 mb-4 leading-none" style={{ backgroundSize: '200% auto', animation: 'gradientShift 3s ease-in-out infinite' }}>
          404
        </h1>

        {/* Message */}
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-gray-500 text-sm md:text-base mb-10 leading-relaxed max-w-md mx-auto">
          Sepertinya tiket ke halaman ini sudah habis. Coba kembali ke beranda atau cari konser favoritmu.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-neon flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-900/30 transition-all uppercase tracking-widest"
          >
            <Home size={16} />
            Ke Beranda
          </Link>
          <Link
            href="/check"
            className="flex items-center gap-2.5 px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest"
          >
            <Search size={16} />
            Cek Status
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-400 text-xs font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft size={12} />
            Kembali
          </Link>
        </div>
      </div>

      {/* Decorative floating tickets */}
      <div className="absolute top-[15%] left-[10%] opacity-5 rotate-[-20deg]">
        <Ticket size={80} className="text-purple-400" />
      </div>
      <div className="absolute bottom-[20%] right-[8%] opacity-5 rotate-[15deg]">
        <Ticket size={100} className="text-pink-400" />
      </div>
      <div className="absolute top-[60%] left-[5%] opacity-[0.03] rotate-[35deg]">
        <Ticket size={60} className="text-purple-300" />
      </div>
    </div>
  );
}
