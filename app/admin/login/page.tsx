/**
 * Tujuan: Halaman Login Admin TiketYuk
 * Caller: /admin/login
 * Dependensi: /api/sheet, sweetalert2, lucide-react
 * Main Functions: AdminLoginPage — menampilkan form login, handle autentikasi.
 * Side Effects: set localStorage 'tiketyuk_admin' setelah login sukses, redirect ke /admin.
 */
'use client';
import { useState, useEffect } from 'react';
import { Loader2, Ticket, Lock, User, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('tiketyuk_admin');
    if (s) {
      router.replace('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    try {
      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adminLogin', username, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('tiketyuk_admin', 'true');
        router.push('/admin');
      } else {
        // Tampilkan debug info untuk diagnosa
        let debugText = 'Username atau password salah.';
        if (data.error) {
          debugText = data.error;
          if (data.availableSheets) {
            debugText += '\n\nSheet tersedia: ' + data.availableSheets.join(', ');
          }
        }
        if (data.debug) {
          debugText = `Headers di sheet: [${data.debug.headers.join(', ')}]\nJumlah baris data: ${data.debug.rowCount}\nUsername input: "${data.debug.inputUsername}"\nUser baris pertama: "${data.debug.firstRowUser}"`;
        }
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: debugText,
          background: '#12121e',
          color: '#fff',
          confirmButtonColor: '#8b5cf6',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan sistem.',
        background: '#12121e',
        color: '#fff',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 particles-bg">
      <div className="absolute top-20 left-1/3 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-pink-600/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/icon-192.png" alt="TiketYuk" width={72} height={72} className="rounded-2xl shadow-2xl shadow-purple-900/30 mb-4 mx-auto" />
          <h1 className="text-2xl font-black text-white">Admin <span className="text-gradient">Panel</span></h1>
          <p className="text-gray-500 text-xs mt-2 font-medium">TiketYuk — Dashboard Admin</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#12121e] border border-white/5 rounded-2xl p-8 shadow-2xl animate-pulse-glow">
          <div className="flex items-center gap-2 mb-6 text-gray-400 border-b border-white/5 pb-4">
            <Lock size={14} className="text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Login</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block ml-1 tracking-widest flex items-center gap-1.5">
                <User size={12} className="text-purple-400" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm focus:border-purple-500/50 outline-none text-white transition placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block ml-1 tracking-widest flex items-center gap-1.5">
                <Lock size={12} className="text-purple-400" /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm focus:border-purple-500/50 outline-none text-white transition placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-neon w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-black text-sm tracking-widest transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Masuk
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          &copy; {new Date().getFullYear()} TiketYuk Admin
        </p>
      </div>
    </div>
  );
}
