'use client';
/**
 * Tujuan: Halaman detail konser + form pemesanan tiket (public)
 * Caller: Homepage link → /c/{id}
 * Dependensi: /api/sheet (getConcert, createOrder, getPaymentMethods, getIdentityTypes)
 * Main Functions: ConcertDetailPage — fetch concert, render form, submit order
 * Side Effects: POST createOrder, Turnstile widget render
 * Business Rules:
 *   - jasaEnabled per-konser: tampilkan pilihan Jenis Jasa (Jaswar/Jastip) di atas form
 *   - Jaswar minimal 2 tiket; 1 tiket = wajib Jastip
 *   - Rent Membership (additional service checkbox) = wajib Jastip, tidak bisa Jaswar → blokir submit jika dilanggar
 *   - ServiceLimits (opsional): batas slot per jenis jasa (Jaswar/Jastip) — card di-disable + badge Full Slot jika penuh
 *   - SlotLimits (opsional): batas slot per tipe sale — radio disabled + badge Full Slot jika penuh
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, MapPin, Loader2, Ticket, ArrowLeft, Music, Send, ChevronDown, User, Phone, Mail, CreditCard, Hash, Users, Star, Tag, Shield, Wallet, Layers, XCircle, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';

declare global {
  interface Window { turnstile?: any; }
}

const formatRupiah = (val: string) => {
  if (!val) return 'To be announce';
  return val.split(' - ').map(v => {
    const num = parseInt(v.trim().replace(/\D/g, ''), 10);
    if (isNaN(num)) return v.trim();
    return 'Rp ' + num.toLocaleString('id-ID');
  }).join(' - ');
};

export default function ConcertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const concertId = params.id as string;

  const [concert, setConcert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tnc, setTnc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [identityTypes, setIdentityTypes] = useState<string[]>([]);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', identityType: '', identityNumber: '', dob: '',
    ticketCount: '1', membership: '', category: '', categoryDesc: '', backupCategories: [] as string[],
    paymentMethod: '', selectedDay: '', saleType: '', serviceType: '', rentMembership: false,
  });

  // Load Turnstile script
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;

    const existing = document.querySelector('script[src*="turnstile"]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;

    (window as any).onTurnstileLoad = () => {
      if (turnstileRef.current && window.turnstile) {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: 'dark',
        });
      }
    };

    document.head.appendChild(script);
    return () => { script.remove(); delete (window as any).onTurnstileLoad; };
  }, []);

  // Re-render turnstile setelah concert loaded
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !concert || !turnstileRef.current || !window.turnstile) return;
    if (turnstileWidgetId.current) return;
    turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(''),
      theme: 'dark',
    });
  }, [concert]);

  const fetchConcert = useCallback(async () => {
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getConcert', concertId }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getPaymentMethods' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getIdentityTypes' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getWebSetting' }) }),
      ]);
      const concertData = await r1.json();
      const pmData = await r2.json();
      const itData = await r3.json();
      const webData = await r4.json();
      if (concertData.found) setConcert(concertData);
      setPaymentMethods(pmData.methods || []);
      setIdentityTypes(itData.types || []);
      setTnc(webData.tnc || '');
    } catch (error) { }
    finally { setLoading(false); }
  }, [concertId]);

  useEffect(() => { fetchConcert(); }, [fetchConcert]);

  // ── Dynamic SEO: title + meta tags ──
  useEffect(() => {
    if (!concert) return;
    const title = `${concert.name} — Pesan Tiket | TiketYuk`;
    const desc = `Pesan tiket ${concert.name} di ${concert.venue}, ${concert.date}. Jasa war tiket konser terpercaya — TiketYuk.`;
    document.title = title;

    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute(prop.startsWith('og:') || prop.startsWith('twitter:') ? 'property' : 'name', prop); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', desc);
    setMeta('og:title', title);
    setMeta('og:description', desc);
    setMeta('og:type', 'website');
    if (concert.image) setMeta('og:image', concert.image);
    setMeta('twitter:card', concert.image ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    if (concert.image) setMeta('twitter:image', concert.image);
  }, [concert]);

  const toggleBackupCategory = (cat: string) => {
    setForm(prev => {
      const current = prev.backupCategories;
      if (current.includes(cat)) return { ...prev, backupCategories: current.filter(c => c !== cat) };
      return { ...prev, backupCategories: [...current, cat] };
    });
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({ ...prev, selectedDay: prev.selectedDay === day ? '' : day }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine apakah membership wajib: jika customer pilih sale type yang mengandung "presale"
    const presaleSelected = form.saleType.toLowerCase().includes('presale');
    const membershipRequired = presaleSelected;

    // Validasi Jenis Jasa jika admin aktifkan
    if (concert?.jasaEnabled) {
      if (!form.serviceType) {
        Swal.fire({ icon: 'warning', title: 'Pilih Jenis Jasa', text: 'Mohon pilih jenis jasa (Jaswar atau Jastip) terlebih dahulu.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
        return;
      }
      // Cek apakah jenis jasa yang dipilih sudah full (client-side guard)
      const svcLimits: Record<string, number> = concert?.serviceLimits || {};
      const svcCounts: Record<string, number> = concert?.serviceCounts || {};
      if (form.serviceType && svcLimits[form.serviceType] !== undefined) {
        const used = svcCounts[form.serviceType] || 0;
        if (used >= svcLimits[form.serviceType]) {
          Swal.fire({ icon: 'error', title: 'Slot Penuh', text: `Slot untuk ${form.serviceType} sudah penuh. Silakan pilih jenis jasa lain.`, background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
          return;
        }
      }
      // Cek slot sale type — HANYA jika Jaswar
      if (form.serviceType === 'Jaswar' && form.saleType && form.saleType !== '-') {
        const limits: Record<string, number> = concert?.slotLimits || {};
        const counts: Record<string, number> = concert?.slotCounts || {};
        if (limits[form.saleType] !== undefined && (counts[form.saleType] || 0) >= limits[form.saleType]) {
          Swal.fire({ icon: 'error', title: 'Slot Penuh', text: `Slot untuk "${form.saleType}" sudah penuh. Silakan pilih tipe sale lain.`, background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
          return;
        }
      }
      // Jaswar hanya boleh jika tiket >= 2
      if (form.serviceType === 'Jaswar' && parseInt(form.ticketCount, 10) < 2) {
        Swal.fire({ icon: 'warning', title: 'Jaswar Minimal 2 Tiket', text: 'Jaswar membutuhkan minimal 2 tiket. Untuk 1 tiket, pilih Jastip.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
        return;
      }
      // Rent Membership (additional service) wajib Jastip — tidak bisa Jaswar
      if (form.rentMembership && form.serviceType === 'Jaswar') {
        Swal.fire({
          icon: 'warning',
          title: 'Rent Membership Wajib Jastip',
          text: 'Layanan Rent Membership hanya tersedia untuk Jastip, tidak bisa dikombinasikan dengan Jaswar. Silakan ganti ke Jastip.',
          background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6'
        });
        return;
      }
    }

    // Sale type wajib dipilih hanya jika ada opsi dari admin
    const hasSaleOptions = concert?.saleTypes && concert.saleTypes.split(',').map((s: string) => s.trim()).filter(Boolean).length > 0;
    if (hasSaleOptions && !form.saleType) {
      Swal.fire({ icon: 'warning', title: 'Pilih Tipe Sale', text: 'Mohon pilih tipe sale untuk pemesanan.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    if (!form.name || !form.phone || !form.email || !form.identityType || !form.identityNumber || !form.dob || !form.category || !form.paymentMethod) {
      Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Mohon lengkapi semua field yang wajib diisi.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    const today = new Date();
    const dobDate = new Date(form.dob);
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 16) {
      Swal.fire({ icon: 'error', title: 'Batas Usia', text: 'Usia minimal untuk memesan tiket adalah 17 tahun.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    const maxTix = parseInt(concert?.maxTicket || '10', 10);
    if (parseInt(form.ticketCount, 10) > maxTix) {
      Swal.fire({ icon: 'warning', title: 'Melebihi Batas', text: `Maksimal tiket yang bisa dipesan adalah ${maxTix} tiket per transaksi.`, background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    if (membershipRequired && !form.membership.trim()) {
      Swal.fire({ icon: 'warning', title: 'Kode Membership Wajib', text: 'Konser ini mewajibkan kode membership. Mohon isi field Membership.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    if (concert?.dayOption && !form.selectedDay) {
      Swal.fire({ icon: 'warning', title: 'Pilih Hari', text: 'Mohon pilih Hari pemesanan.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    // Turnstile check (client-side)
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) {
      Swal.fire({ icon: 'warning', title: 'Verifikasi Diperlukan', text: 'Mohon selesaikan verifikasi captcha terlebih dahulu.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Pemesanan',
      html: `
        <div style="text-align:left; font-size:13px; line-height:1.8; color:#ccc;">
          <p><strong>Konser:</strong> ${concert.name}</p>
          <p><strong>Nama:</strong> ${form.name}</p>
          <p><strong>HP:</strong> ${form.phone}</p>
          <p><strong>Email:</strong> ${form.email}</p>
          <p><strong>Identitas:</strong> ${form.identityType} — ${form.identityNumber}</p>
          <p><strong>Tanggal Lahir:</strong> ${form.dob}</p>
          ${concert?.dayOption ? `<p><strong>Pilihan Hari:</strong> ${form.selectedDay}</p>` : ''}
          ${form.saleType ? `<p><strong>Tipe Sale:</strong> ${form.saleType}</p>` : ''}
          ${concert?.jasaEnabled && form.serviceType ? `<p><strong>Jenis Jasa:</strong> <span style="color:${form.serviceType === 'Jaswar' ? '#a78bfa' : '#f472b6'}; font-weight:bold;">${form.serviceType}</span>${form.rentMembership ? ' <span style="color:#f59e0b; font-size:11px;">+ Rent Membership</span>' : ''}</p>` : ''}
          <p><strong>Jumlah Tiket:</strong> ${form.ticketCount}</p>
          <p><strong>Kategori:</strong> ${form.category}${form.categoryDesc ? ` (${form.categoryDesc})` : ''}</p>
          ${form.backupCategories.length > 0 ? `<p><strong>Cadangan:</strong> ${form.backupCategories.join(', ')}</p>` : ''}
          <p><strong>Payment:</strong> ${form.paymentMethod}</p>
          ${form.membership ? `<p><strong>Membership:</strong> ${form.membership}</p>` : ''}
        </div>
        <div style="margin-top: 15px; text-align: left;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #fff; font-size: 12px;">
            <input type="checkbox" id="swal-confirm-checkbox" style="width: 16px; height: 16px; accent-color: #8b5cf6;">
            Saya yakin data di atas sudah benar
          </label>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#8b5cf6',
      background: '#12121e',
      color: '#fff',
      preConfirm: () => {
        const checkbox = document.getElementById('swal-confirm-checkbox') as HTMLInputElement;
        if (!checkbox?.checked) {
          Swal.showValidationMessage('Anda harus mencentang kotak konfirmasi!');
          return false;
        }
        return true;
      }
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createOrder',
          turnstileToken,
          data: {
            concertId: concert.id,
            concertName: concert.name,
            name: form.name,
            phone: form.phone,
            email: form.email,
            identityType: form.identityType,
            identityNumber: form.identityNumber,
            dob: form.dob,
            ticketCount: form.ticketCount,
            membership: form.membership,
            category: form.category + (form.categoryDesc ? ` (${form.categoryDesc})` : '') + (concert?.dayOption && form.selectedDay ? ` [${form.selectedDay}]` : ''),
            backupCategories: form.backupCategories.join(', '),
            paymentMethod: form.paymentMethod,
            saleType: form.saleType || '-',
            serviceType: concert?.jasaEnabled ? (form.serviceType || '-') : '-',
            rentMembership: concert?.jasaEnabled ? form.rentMembership : false,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Pemesanan Berhasil! 🎉',
          html: `<p style="color:#ccc;">ID Order: <strong style="color:#8b5cf6; font-size:18px; letter-spacing:2px;">${data.orderId}</strong></p><p style="color:#888; font-size:12px; margin-top:8px;">Simpan ID ini untuk tracking status tiketmu.</p>`,
          background: '#12121e', color: '#fff',
          confirmButtonColor: '#8b5cf6',
          confirmButtonText: 'Lacak Pesanan',
          showCancelButton: true,
          cancelButtonText: 'Tutup',
        }).then((result) => {
          if (result.isConfirmed) {
            router.push(`/check?id=${data.orderId}`);
          }
        });
        setForm({ name: '', phone: '', email: '', identityType: '', identityNumber: '', dob: '', ticketCount: '1', membership: '', category: '', categoryDesc: '', backupCategories: [], paymentMethod: '', selectedDay: '', saleType: '', serviceType: '', rentMembership: false });
        // Reset turnstile
        if (window.turnstile && turnstileWidgetId.current) {
          window.turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken('');
        }
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Terjadi kesalahan.', background: '#12121e', color: '#fff' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan sistem.', background: '#12121e', color: '#fff' });
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 animate-pulse opacity-20 absolute inset-0 blur-xl" />
        <Loader2 className="animate-spin text-violet-500 relative z-10" size={48} />
      </div>
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">Memuat konser...</p>
        <p className="text-violet-300 text-xs mt-1 font-semibold">✨ Sebentar ya...</p>
      </div>
    </div>
  );

  if (!concert) return (
    <div className="min-h-screen page-bg flex flex-col items-center justify-center gap-4">
      <div className="text-6xl animate-float">🎵</div>
      <p className="text-violet-500 text-sm font-black">Konser tidak ditemukan</p>
      <Link href="/" className="text-violet-500 text-xs font-black hover:underline flex items-center gap-2">
        <ArrowLeft size={14} /> Kembali ke Beranda
      </Link>
    </div>
  );

  const categories = concert.categories ? concert.categories.split(',').map((c: string) => c.trim()) : [];

  return (
    <div className="min-h-screen page-bg particles-bg font-sans selection:bg-violet-200">

      {/* NAVBAR */}
      <nav className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/icon-192.png" alt="TiketYuk" width={40} height={40}
                className="rounded-2xl shadow-lg shadow-violet-300/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-yellow-300 to-pink-400 rounded-full animate-heartbeat shadow-sm" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#2e1065]">Tiket<span className="text-gradient">Yuk</span></h1>
              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-[0.2em]">Jasa War Tiket Konser</p>
            </div>
          </Link>
          <Link href="/" className="btn-outline-kawaii flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">
            <ArrowLeft size={14} />
            <span className="hidden md:inline">Kembali</span>
          </Link>
        </div>
      </nav>

      {/* CONCERT HERO */}
      <section className="relative">
        <div className="h-64 md:h-80 overflow-hidden relative">
          {concert.image ? (
            <img src={concert.image} alt={concert.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
              <span className="text-8xl animate-float">🎵</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/30 to-transparent"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.length > 0 && categories.map((cat: string, i: number) => (
                <span key={i} className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-violet-100 text-violet-600 border-2 border-violet-200 shadow-sm">
                  {cat}
                </span>
              ))}
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#2e1065] leading-tight">{concert.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-violet-600 font-semibold"><Calendar size={16} className="text-violet-400" /><span>{concert.date}</span></div>
              <div className="flex items-center gap-2 text-pink-600 font-semibold"><MapPin size={16} className="text-pink-400" /><span>{concert.venue}</span></div>
            </div>
            <p className="text-lg font-black text-violet-600">Fee/Tix: {formatRupiah(concert.price)}</p>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-8">

        {/* DESKRIPSI & SEATPLAN */}
        {(concert.description || concert.seatplan) && (
          <section className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4 text-violet-500 border-b-2 border-violet-50 pb-3">
              <Music size={16} className="text-violet-400" />
              <span className="text-xs font-black uppercase tracking-widest">Detail & Seatplan</span>
            </div>
            {concert.seatplan && (
              <div className="mb-6 rounded-2xl overflow-hidden border-2 border-violet-100 shadow-sm">
                <img src={concert.seatplan} alt={`Seatplan ${concert.name}`} className="w-full object-contain max-h-[70vh]" />
              </div>
            )}
            {concert.description && (
              <div className="text-violet-700/80 leading-relaxed whitespace-pre-line text-sm md:text-base font-semibold">{concert.description}</div>
            )}
          </section>
        )}

        {/* FORMULIR PEMESANAN TIKET */}
        {concert.status === 'active' ? (
          <section className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in-up animate-pulse-glow">
            <div className="flex items-center gap-2 mb-6 text-violet-500 border-b-2 border-violet-50 pb-4">
              <Ticket size={16} className="text-violet-500" />
              <span className="text-xs font-black uppercase tracking-widest">Formulir Pemesanan Tiket</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── JENIS JASA (paling atas, hanya jika jasaEnabled) ── */}
              {concert?.jasaEnabled && (() => {
                // Jika tiket = 1 = wajib Jastip
                const ticketQty = parseInt(form.ticketCount || '1', 10);
                const forceJastipByQty = ticketQty === 1;
                // Rent Membership dipilih = wajib Jastip (hanya jika fitur aktif di admin)
                const forceJastipByRent = concert?.rentMembershipEnabled && form.rentMembership;
                const forceJastip = forceJastipByQty || forceJastipByRent;

                // Slot limit per jenis jasa
                const svcLimits: Record<string, number> = concert?.serviceLimits || {};
                const svcCounts: Record<string, number> = concert?.serviceCounts || {};
                const isJaswarFull = svcLimits['Jaswar'] !== undefined && (svcCounts['Jaswar'] || 0) >= svcLimits['Jaswar'];
                const isJastipFull = svcLimits['Jastip'] !== undefined && (svcCounts['Jastip'] || 0) >= svcLimits['Jastip'];
                const allServiceFull = isJaswarFull && isJastipFull;

                return (
                  <div className="bg-gradient-to-r from-violet-50 to-pink-50 border-2 border-violet-200 rounded-2xl p-5 space-y-4">
                    {/* Label header */}
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-pink-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-pink-600">Jenis Jasa</span>
                      <span className="text-red-400 text-sm">*</span>
                    </div>

                    {/* Banner semua jasa full */}
                    {allServiceFull && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold">
                        🚫 Semua slot jenis jasa sudah penuh. Pendaftaran ditutup sementara.
                      </div>
                    )}

                    {/* Warning banner jika forceJastip */}
                    {forceJastip && !allServiceFull && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2.5 leading-relaxed font-semibold">
                        {forceJastipByQty && !forceJastipByRent && '⚠️ Jaswar minimal 2 tiket. Pemesanan 1 tiket hanya bisa Jastip.'}
                        {forceJastipByRent && !forceJastipByQty && '⚠️ Rent Membership hanya tersedia untuk Jastip, tidak bisa Jaswar.'}
                        {forceJastipByQty && forceJastipByRent && '⚠️ Pemesanan 1 tiket + Rent Membership hanya tersedia untuk Jastip.'}
                      </div>
                    )}

                    {/* Kartu pilihan: Jaswar / Jastip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Jaswar */}
                      <button
                        type="button"
                        disabled={forceJastip || isJaswarFull}
                        onClick={() => { if (!forceJastip && !isJaswarFull) setForm(prev => ({ ...prev, serviceType: 'Jaswar' })); }}
                        className={`relative flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 transition-all text-left
                          ${forceJastip || isJaswarFull
                            ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                            : form.serviceType === 'Jaswar'
                              ? 'border-violet-400 bg-violet-50 shadow-lg shadow-violet-200/50'
                              : 'border-violet-100 bg-white hover:border-violet-300 hover:bg-violet-50 cursor-pointer'
                          }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            form.serviceType === 'Jaswar' && !forceJastip && !isJaswarFull ? 'border-violet-500 bg-violet-100' : 'border-gray-300'
                          }`}>
                            {form.serviceType === 'Jaswar' && !forceJastip && !isJaswarFull && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                          </div>
                          <span className={`text-sm font-black tracking-wide ${
                            form.serviceType === 'Jaswar' && !forceJastip && !isJaswarFull ? 'text-violet-600' : 'text-[#2e1065]'
                          }`}>Jaswar ⚡</span>
                          {isJaswarFull && (
                            <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-500 border-2 border-red-200">Full Slot</span>
                          )}
                        </div>
                        <p className="text-[10px] text-violet-400 leading-relaxed ml-6 font-semibold">Kami ikut war tiket untuk kamu. <span className="text-amber-600 font-bold">Min. 2 tiket.</span></p>
                        {isJaswarFull && svcLimits['Jaswar'] !== undefined && (
                          <p className="text-[10px] text-red-400 ml-6 font-semibold">{svcCounts['Jaswar'] || 0}/{svcLimits['Jaswar']} slot terisi</p>
                        )}
                      </button>

                      {/* Jastip */}
                      <button
                        type="button"
                        disabled={isJastipFull}
                        onClick={() => { if (!isJastipFull) setForm(prev => ({ ...prev, serviceType: 'Jastip' })); }}
                        className={`relative flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 transition-all text-left
                          ${isJastipFull
                            ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                            : form.serviceType === 'Jastip' || forceJastip
                              ? 'border-pink-400 bg-pink-50 shadow-lg shadow-pink-200/50 cursor-pointer'
                              : 'border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50 cursor-pointer'
                          }`}
                        ref={el => {
                          // Auto-select Jastip jika dipaksa (qty=1 atau rentMembership) DAN Jastip tidak full
                          if (forceJastip && !isJastipFull && form.serviceType !== 'Jastip') {
                            setTimeout(() => setForm(prev => ({ ...prev, serviceType: 'Jastip' })), 0);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            (form.serviceType === 'Jastip' || forceJastip) && !isJastipFull ? 'border-pink-500 bg-pink-100' : 'border-gray-300'
                          }`}>
                            {((form.serviceType === 'Jastip' || forceJastip) && !isJastipFull) && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                          </div>
                          <span className={`text-sm font-black tracking-wide ${
                            (form.serviceType === 'Jastip' || forceJastip) && !isJastipFull ? 'text-pink-600' : 'text-[#2e1065]'
                          }`}>Jastip 🎫</span>
                          {isJastipFull && (
                            <span className="ml-auto text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-500 border-2 border-red-200">Full Slot</span>
                          )}
                        </div>
                        <p className="text-[10px] text-violet-400 leading-relaxed ml-6 font-semibold">Kami titipkan pembelian tiketmu saat war.</p>
                        {isJastipFull && svcLimits['Jastip'] !== undefined && (
                          <p className="text-[10px] text-red-400 ml-6 font-semibold">{svcCounts['Jastip'] || 0}/{svcLimits['Jastip']} slot terisi</p>
                        )}
                        {forceJastip && !isJastipFull && (
                          <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 border-2 border-pink-200">Wajib Jastip</span>
                        )}
                      </button>
                    </div>

                              <div className="border-t-2 border-violet-100 pt-4">
                       <label className="label-kawaii mb-3">
                        <Users size={12} className="text-violet-400" /> Jumlah Tiket
                        <span className="text-red-400">*</span>
                        <span className="text-[9px] font-semibold text-violet-300 normal-case">(Maks. {concert?.maxTicket || '10'} tiket)</span>
                       </label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-violet-50 border-2 border-violet-200 rounded-2xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, ticketCount: String(Math.max(1, parseInt(prev.ticketCount || '1', 10) - 1)) }))}
                            className="px-4 py-3 text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-all text-lg font-black select-none"
                          >−</button>
                          <input
                            type="number" min="1" max={concert?.maxTicket || '10'}
                            value={form.ticketCount}
                            onChange={e => setForm({ ...form, ticketCount: e.target.value })}
                            className="w-14 bg-transparent text-center text-base font-black text-[#2e1065] outline-none py-3 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, ticketCount: String(Math.min(parseInt(concert?.maxTicket || '10', 10), parseInt(prev.ticketCount || '1', 10) + 1)) }))}
                            className="px-4 py-3 text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-all text-lg font-black select-none"
                          >+</button>
                        </div>
                        </div>
                        {form.serviceType === 'Jaswar' && parseInt(form.ticketCount || '1', 10) < 2 && (
                          <span className="text-[11px] text-amber-600 font-bold animate-pulse">⚠️ Min. 2 tiket untuk Jaswar</span>
                        )}
                        {form.serviceType === 'Jastip' && (
                          <span className="text-[10px] text-violet-500 font-semibold">Tiket terpilih: <span className="text-violet-700 font-black">{form.ticketCount}</span></span>
                        )}
                      </div>
                    </div>

                    {/* Additional Service: Rent Membership — hanya jika rentMembershipEnabled */}
                    {concert?.rentMembershipEnabled && (
                    <div className="border-t-2 border-violet-100 pt-4">
                      <p className="label-kawaii mb-3">Additional Service</p>
                      <label
                        className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          form.rentMembership
                            ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-100'
                            : 'border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        <div className="relative mt-0.5">
                          <input
                            type="checkbox"
                            checked={form.rentMembership}
                            onChange={e => setForm(prev => ({ ...prev, rentMembership: e.target.checked, ...(e.target.checked ? { serviceType: 'Jastip' } : {}) }))}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            form.rentMembership ? 'bg-amber-500 border-amber-500' : 'border-amber-300 bg-white'
                          }`}>
                            {form.rentMembership && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-black tracking-wide ${
                              form.rentMembership ? 'text-amber-700' : 'text-[#2e1065]'
                            }`}>Rent Membership 🪪</span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 border-2 border-pink-200">
                              Wajib Jastip
                            </span>
                          </div>
                          <p className="text-[10px] text-violet-400 leading-relaxed mt-1 font-semibold">
                            Sewa membership untuk akses presale. <span className="text-pink-500 font-bold">Tidak bisa dikombinasikan dengan Jaswar.</span>
                          </p>
                        </div>
                      </label>
                    </div>
                    )}
                  </div>
                );
              })()}

              {/* Tipe Sale — radio buttons; slot limit hanya berlaku untuk Jaswar */}
              {concert.saleTypes && concert.saleTypes.split(',').map((s: string) => s.trim()).filter(Boolean).length > 0 && (() => {
                const opts = concert.saleTypes.split(',').map((s: string) => s.trim()).filter(Boolean);
                const limits: Record<string, number> = concert.slotLimits || {};
                const counts: Record<string, number> = concert.slotCounts || {};
                // Slot check HANYA aktif jika user memilih Jaswar
                const applySlotCheck = form.serviceType === 'Jaswar';
                const allFull = applySlotCheck && Object.keys(limits).length > 0 && opts.every((opt: string) => limits[opt] !== undefined && (counts[opt] || 0) >= limits[opt]);
                return (
                  <div className="space-y-2">
                    {allFull && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-xs font-bold">
                        🚫 Semua slot sudah penuh. Pendaftaran ditutup sementara.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4">
                      {opts.map((opt: string, si: number) => {
                        const limit = limits[opt];
                        const count = counts[opt] || 0;
                        // isFull hanya relevan jika Jaswar; Jastip selalu bisa pilih
                        const isFull = applySlotCheck && limit !== undefined && count >= limit;
                        return (
                          <label
                            key={si}
                            className={`flex items-center gap-2 ${isFull ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group'}`}
                            onClick={() => { if (!isFull) setForm({ ...form, saleType: opt, ...(!opt.toLowerCase().includes('presale') ? { membership: '' } : {}) }); }}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isFull ? 'border-red-300 bg-red-50' : form.saleType === opt ? 'border-violet-500 bg-violet-100' : 'border-violet-200 bg-white group-hover:border-violet-400'}`}>
                              {!isFull && form.saleType === opt && <div className="w-2 h-2 rounded-full bg-violet-500"></div>}
                              {isFull && <div className="w-2 h-2 rounded-full bg-red-400"></div>}
                            </div>
                            <span className={`text-sm font-semibold transition ${isFull ? 'text-gray-400 line-through' : form.saleType === opt ? 'text-violet-700 font-black' : 'text-[#2e1065] group-hover:text-violet-600'}`}>{opt}</span>
                            {isFull && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-500 border-2 border-red-200">Full Slot</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Nama Lengkap */}
              <div>
                <label className="label-kawaii">
                  <User size={12} className="text-violet-400" /> Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama lengkap..."
                  className="input-kawaii" />
              </div>

              {/* No HP */}
              <div>
                <label className="label-kawaii">
                  <Phone size={12} className="text-violet-400" /> No. HP (WhatsApp) <span className="text-red-400">*</span>
                </label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx"
                  className="input-kawaii" />
                <p className="text-[10px] text-amber-600 font-semibold mt-1.5 ml-1">⚠️ Pastikan nomor HP benar — konfirmasi pemesanan akan dikirim via WhatsApp ke nomor ini.</p>
              </div>

              {/* Email */}
              <div>
                <label className="label-kawaii">
                  <Mail size={12} className="text-purple-400" /> Email <span className="text-red-400">*</span>
                </label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com"
                  className="input-kawaii" />
              </div>

              {/* Jenis Identitas & Nomor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="label-kawaii">
                    <CreditCard size={12} className="text-purple-400" /> Jenis Identitas <span className="text-red-400">*</span>
                  </label>
                  <select value={form.identityType} onChange={e => setForm({ ...form, identityType: e.target.value })}
                    className="select-kawaii">
                    <option value="" disabled hidden>Pilih jenis identitas...</option>
                    {identityTypes.length > 0 ? identityTypes.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    )) : (
                      <>
                        <option value="NIK">NIK (KTP)</option>
                        <option value="SIM">SIM</option>
                        <option value="Paspor">Paspor</option>
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-10 pointer-events-none text-gray-500" size={16} />
                </div>
                <div>
                  <label className="label-kawaii">
                    <Hash size={12} className="text-purple-400" /> Nomor Identitas <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={form.identityNumber} onChange={e => setForm({ ...form, identityNumber: e.target.value })} placeholder="Masukkan nomor identitas (NIK/Passport/SIM)..."
                    className="input-kawaii" />
                </div>
              </div>

              {/* Tanggal Lahir */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="label-kawaii">
                    <Calendar size={12} className="text-purple-400" /> Tanggal Lahir (Min. 17 Tahun) <span className="text-red-400">*</span>
                  </label>
                  <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm focus:border-purple-500/50 outline-none text-white transition placeholder:text-gray-600 appearance-none" />
                </div>
              </div>

              {/* Pilihan Hari */}
              {concert?.dayOption && (
                <div>
                  <label className="label-kawaii">
                    <Calendar size={12} className="text-purple-400" /> Pilihan Hari <span className="text-red-400">*</span>
                  </label>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] text-gray-500 mb-2">Pilih hari pemesanan:</p>
                    <div className="flex flex-wrap gap-2">
                      {['DAY 1', 'DAY 2', 'DAY 1 / DAY 2'].map((day, i) => {
                        const selected = form.selectedDay === day;
                        return (
                          <button key={i} type="button" onClick={() => toggleDay(day)}
                            className={`text-xs font-bold px-5 py-2.5 rounded-xl border transition-all ${selected
                              ? 'bg-purple-600/30 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-900/20'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/30 hover:text-purple-300'}`}>
                            {selected && '✓ '}{day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Jumlah Tiket & Membership */}
              {(() => {
                const presaleChosen = form.saleType.toLowerCase().includes('presale');
                const membershipRequired = presaleChosen;
                // Jika jasaEnabled: ticketCount sudah ada di card Jenis Jasa — tampilkan hanya Membership
                if (concert?.jasaEnabled && !membershipRequired) return null;
                return (
                  <div className={`grid grid-cols-1 ${membershipRequired && !concert?.jasaEnabled ? 'md:grid-cols-2' : ''} gap-6`}>
                    {!concert?.jasaEnabled && (
                      <div>
                        <label className="label-kawaii">
                          <Users size={12} className="text-purple-400" /> Jumlah Tiket <span className="text-red-400">*</span> <span className="text-[9px] font-normal text-gray-600">(Maks. {concert?.maxTicket || '10'} tiket)</span>
                        </label>
                        <input type="number" min="1" max={concert?.maxTicket || '10'} value={form.ticketCount} onChange={e => setForm({ ...form, ticketCount: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm focus:border-purple-500/50 outline-none text-white transition" />
                      </div>
                    )}
                    {membershipRequired && (
                      <div>
                        <label className="label-kawaii">
                          <Star size={12} className="text-yellow-400" /> Kode Membership <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={form.membership} onChange={e => setForm({ ...form, membership: e.target.value })} placeholder="Masukkan kode membership..."
                          className="input-kawaii" />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Kategori Tiket Prioritas */}
              {categories.length > 0 && (
                <div className="relative">
                  <label className="label-kawaii">
                    <Tag size={12} className="text-purple-400" /> Kategori Tiket Prioritas <span className="text-red-400">*</span>
                  </label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="select-kawaii">
                    <option value="" disabled hidden>Pilih Kategori Tiket Prioritas...</option>
                    {categories.map((cat: string, i: number) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-10 pointer-events-none text-gray-500" size={16} />
                </div>
              )}

              {/* Kategori Cadangan (Multi Select) */}
              {categories.length > 1 && (
                <div>
                  <label className="label-kawaii">
                    <Layers size={12} className="text-purple-400" /> Kategori Cadangan <span className="text-gray-600 text-[9px] normal-case">Pilih secara urut</span>
                  </label>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] text-gray-500 mb-2">Pilih kategori cadangan jika kategori utama tidak tersedia:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.filter((cat: string) => cat !== form.category).map((cat: string, i: number) => {
                        const selected = form.backupCategories.includes(cat);
                        return (
                          <button key={i} type="button" onClick={() => toggleBackupCategory(cat)}
                            className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all ${selected
                              ? 'bg-purple-600/30 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-900/20'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/30 hover:text-purple-300'}`}>
                            {selected && '✓ '}{cat}
                          </button>
                        );
                      })}
                    </div>
                    {form.backupCategories.length > 0 && (
                      <p className="text-[10px] text-purple-400 mt-2">
                        Dipilih: {form.backupCategories.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Deskripsi Kategori (opsional) */}
              {categories.length > 0 && (
                <div>
                  <label className="label-kawaii">
                    <Tag size={12} className="text-purple-400" /> Deskripsi Kategori <span className="text-gray-600 text-[9px] normal-case">(opsional)</span>
                  </label>
                  <input type="text" value={form.categoryDesc} onChange={e => setForm({ ...form, categoryDesc: e.target.value })} placeholder="Contoh: CAT 1A / CAT 1B"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm focus:border-purple-500/50 outline-none text-white transition placeholder:text-gray-600" />
                  <p className="text-[10px] text-gray-600 mt-1.5 ml-1">Tuliskan sub-kategori atau preferensi spesifik jika ada.</p>
                </div>
              )}

              {/* Metode Pembayaran */}
              <div className="relative">
                <label className="label-kawaii">
                  <Wallet size={12} className="text-purple-400" /> Metode Pembayaran <span className="text-red-400">*</span>
                </label>
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3.5 text-sm focus:border-purple-500/50 outline-none text-white appearance-none cursor-pointer transition">
                  <option value="" disabled hidden>Pilih metode pembayaran...</option>
                  {paymentMethods.length > 0 ? paymentMethods.map((pm, i) => (
                    <option key={i} value={pm}>{pm}</option>
                  )) : (
                    <option value="" disabled>Memuat data...</option>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-10 pointer-events-none text-gray-500" size={16} />
              </div>

              {/* Turnstile */}
              <div className="flex justify-center">
                <div ref={turnstileRef}></div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={submitting}
                className="btn-neon w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-black text-sm tracking-widest transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase">
                {submitting ? (<><Loader2 size={18} className="animate-spin" /> Mengirim...</>) : (<><Send size={18} /> Kirim Pemesanan</>)}
              </button>
            </form>
          </section>
        ) : (
          <section className={`bg-[#12121e] border ${concert.status === 'upcoming' ? 'border-blue-500/20' : 'border-red-500/20'} rounded-2xl p-8 md:p-12 text-center animate-fade-in-up`}>
            <div className={`w-16 h-16 ${concert.status === 'upcoming' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} border-2 rounded-full flex items-center justify-center mx-auto mb-6`}>
              {concert.status === 'upcoming' ? <Calendar size={32} /> : <XCircle size={32} />}
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
              {concert.status === 'upcoming' ? 'Coming Soon! 🚀' : concert.status === 'soldout' ? 'Slot Full! 😭' : 'Pemesanan Ditutup'}
            </h3>
            <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
              {concert.status === 'upcoming'
                ? 'Pemesanan tiket untuk konser ini belum dibuka. Pantau terus jadwal pemesanannya ya!'
                : concert.status === 'soldout'
                ? 'Maaf, slot war tiket untuk konser ini sudah penuh. Pantau terus info selanjutnya!'
                : 'Waktu pemesanan untuk konser ini telah berakhir. Terima kasih atas antusiasme Anda.'}
            </p>
            <Link href="/" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-300 transition-all hover:text-white">
              <ArrowLeft size={16} /> Kembali ke Beranda
            </Link>
          </section>
        )}
      </main>

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
      <footer className="border-t border-white/5 py-12">
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
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </Link>
          </div>
          <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} TiketYuk</p>
        </div>
      </footer>
    </div>
  );
}
