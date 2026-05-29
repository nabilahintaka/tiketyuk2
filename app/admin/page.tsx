'use client';
/**
 * Tujuan: Admin dashboard — CRUD konser, orders, pengumuman, short URL
 * Caller: /admin (protected by localStorage auth)
 * Dependensi: /api/sheet, /api/upload, sweetalert2, lucide-react
 * Main Functions: AdminPage — tab-based dashboard with search, CRUD, upload
 * Side Effects: fetch /api/sheet, /api/upload, localStorage read/write
 * Features: WhatsApp confirmation template (wa.me) per order, toggle jasaEnabled per-konser
 * Fix: Tipe Sale & Jenis Jasa selalu tampil di template WA (tidak lagi conditional/tersembunyi)
 * Fix: WA template kini include Tanggal Order, No. HP, dan Rent Membership
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Plus, Trash2, Music, Calendar, MapPin, Volume2, Save, X, Eye, ChevronDown, RefreshCw, ClipboardList, Megaphone, Edit3, ShieldCheck, Upload, Image as ImageIcon, Link2, ExternalLink, Copy, Search, Hash, User, Phone, Mail, Tag, Wallet, Star, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'concerts' | 'orders' | 'announce' | 'shorturl'>('concerts');
  const [searchQuery, setSearchQuery] = useState('');

  const [concerts, setConcerts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [announceDraft, setAnnounceDraft] = useState('');
  const [tncDraft, setTncDraft] = useState('');
  const [shortUrls, setShortUrls] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [concertForm, setConcertForm] = useState({ name: '', dateStart: '', dateEnd: '', venue: '', image: '', description: '', categories: '', status: 'active', priceMin: '', priceMax: '', saleTypes: '', dayOption: false, maxTicket: '10', seatplan: '', jasaEnabled: false, rentMembershipEnabled: false, slotLimits: '', serviceLimits: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getConcerts' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getOrders' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getWebSetting' }) }),
        fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getShortUrls' }) }),
      ]);
      const data1 = await r1.json();
      const data2 = await r2.json();
      const data4 = await r4.json();

      setConcerts(Array.isArray(data1) ? data1 : []);
      setOrders(Array.isArray(data2) ? data2 : []);
      const web = await r3.json();
      setAnnouncement(web.announce || '');
      setAnnounceDraft(web.announce || '');
      setTncDraft(web.tnc || '');
      setShortUrls(Array.isArray(data4) ? data4 : []);
    } catch (e) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const s = localStorage.getItem('tiketyuk_admin');
    if (!s) { router.replace('/admin/login'); return; }
    fetchAll();
  }, [router, fetchAll]);

  const resetForm = () => { setConcertForm({ name: '', dateStart: '', dateEnd: '', venue: '', image: '', description: '', categories: '', status: 'active', priceMin: '', priceMax: '', saleTypes: '', dayOption: false, maxTicket: '10', seatplan: '', jasaEnabled: false, rentMembershipEnabled: false, slotLimits: '', serviceLimits: '' }); setShowForm(false); setEditingId(null); setFormErrors({}); };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!concertForm.name.trim()) errors.name = 'Nama konser wajib diisi';
    if (!concertForm.dateStart) errors.dateStart = 'Tanggal mulai wajib diisi';
    if (concertForm.dateEnd && concertForm.dateStart && concertForm.dateEnd < concertForm.dateStart) errors.dateEnd = 'Tanggal selesai harus setelah tanggal mulai';
    if (!concertForm.venue.trim()) errors.venue = 'Venue wajib diisi';
    if (concertForm.image && !/^https?:\/\/.+/.test(concertForm.image)) errors.image = 'URL gambar tidak valid';
    if (!concertForm.categories.trim()) errors.categories = 'Kategori Tiket Prioritas wajib diisi';
    if (concertForm.priceMin.trim()) {
      const minVal = parseInt(concertForm.priceMin.replace(/\D/g, ''), 10);
      if (isNaN(minVal) || minVal <= 0) errors.priceMin = 'Fee minimum harus angka valid';
      if (concertForm.priceMax.trim()) {
        const maxVal = parseInt(concertForm.priceMax.replace(/\D/g, ''), 10);
        if (isNaN(maxVal) || maxVal <= 0) errors.priceMax = 'Fee maksimum harus angka valid';
        else if (maxVal <= minVal) errors.priceMax = 'Harga max harus lebih besar dari min';
      }
    } else if (concertForm.priceMax.trim()) {
      errors.priceMax = 'Fee max hanya bisa diisi jika Fee min diisi';
    }
    const maxTixVal = parseInt(concertForm.maxTicket, 10);
    if (!concertForm.maxTicket.trim() || isNaN(maxTixVal) || maxTixVal < 1) errors.maxTicket = 'Maksimal tiket wajib diisi (min 1)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Search filter (dipakai di semua tab) ──
  const q = searchQuery.toLowerCase();
  const filteredConcerts = useMemo(() => !q ? concerts : concerts.filter(c =>
    [c.name, c.venue, c.date, c.categories, c.id].some(v => v?.toLowerCase().includes(q))
  ), [concerts, q]);
  const filteredOrders = useMemo(() => !q ? orders : orders.filter(o =>
    [o.orderId, o.concertName, o.name, o.phone, o.email, o.category, o.status].some(v => v?.toLowerCase().includes(q))
  ), [orders, q]);
  const filteredShortUrls = useMemo(() => !q ? shortUrls : shortUrls.filter(s =>
    [s.id, s.source, s.dest].some(v => v?.toLowerCase().includes(q))
  ), [shortUrls, q]);

  const formatDateRange = () => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const start = concertForm.dateStart ? new Date(concertForm.dateStart + 'T00:00:00').toLocaleDateString('id-ID', opts) : '';
    const end = concertForm.dateEnd ? new Date(concertForm.dateEnd + 'T00:00:00').toLocaleDateString('id-ID', opts) : '';
    if (start && end && start !== end) return `${start} - ${end}`;
    return start;
  };

  const saveConcert = async () => {
    if (!validateForm()) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi data', text: 'Periksa kembali field yang bertanda merah.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      return;
    }
    try {
      const action = editingId ? 'updateConcert' : 'addConcert';
      const priceFormatted = concertForm.priceMax.trim()
        ? `${concertForm.priceMin.trim()} - ${concertForm.priceMax.trim()}`
        : concertForm.priceMin.trim();
      const payload: any = { action, data: { ...concertForm, date: formatDateRange(), price: priceFormatted } };
      if (editingId) payload.concertId = editingId;
      const res = await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: editingId ? 'Konser diupdate!' : 'Konser ditambahkan!', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6', timer: 1500 });
        resetForm(); fetchAll();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: data.error || `Server error (${res.status})`, background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      }
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal', text: e?.message || 'Koneksi gagal, coba lagi.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' }); }
  };

  const deleteConcert = async (id: string, name: string) => {
    const c = await Swal.fire({ title: `Hapus "${name}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', background: '#12121e', color: '#fff', confirmButtonText: 'Hapus' });
    if (!c.isConfirmed) return;
    try {
      await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteConcert', concertId: id }) });
      fetchAll();
    } catch (e) { }
  };

  const parseDateRange = (dateStr: string) => {
    if (!dateStr) return { dateStart: '', dateEnd: '' };
    const parts = dateStr.split(' - ');
    const parseId = (s: string) => {
      try {
        const months: Record<string, string> = { Januari: '01', Februari: '02', Maret: '03', April: '04', Mei: '05', Juni: '06', Juli: '07', Agustus: '08', September: '09', Oktober: '10', November: '11', Desember: '12' };
        const p = s.trim().split(' ');
        if (p.length === 3) { const m = months[p[1]] || '01'; return `${p[2]}-${m}-${p[0].padStart(2, '0')}`; }
      } catch { } return '';
    };
    return { dateStart: parseId(parts[0] || ''), dateEnd: parts[1] ? parseId(parts[1]) : '' };
  };

  const editConcert = (c: any) => {
    const { dateStart, dateEnd } = parseDateRange(c.date || '');
    const priceParts = (c.price || '').split(' - ');
    setConcertForm({ name: c.name, dateStart, dateEnd, venue: c.venue, image: c.image, description: c.description, categories: c.categories, status: c.status, priceMin: priceParts[0]?.trim() || '', priceMax: priceParts[1]?.trim() || '', saleTypes: c.saleTypes || '', dayOption: c.dayOption || false, maxTicket: c.maxTicket || '10', seatplan: c.seatplan || '', jasaEnabled: c.jasaEnabled || false, rentMembershipEnabled: c.rentMembershipEnabled || false, slotLimits: c.slotLimitsRaw || '', serviceLimits: c.serviceLimitsRaw || '' });
    setEditingId(c.id); setShowForm(true); setFormErrors({});
  };

  const saveWebSetting = async () => {
    try {
      const res = await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateWebSetting', announce: announceDraft, tnc: tncDraft }) });
      const data = await res.json();
      if (data.success) {
        setAnnouncement(announceDraft);
        Swal.fire({ icon: 'success', title: 'Setting disimpan!', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6', timer: 1500 });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: data.error || 'Sheet "WebSetting" tidak ditemukan.', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6' });
      }
    } catch (e) {

      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Koneksi gagal, coba lagi.', background: '#12121e', color: '#fff' });
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, reason?: string) => {
    try {
      await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateOrderStatus', orderId, status, reason }) });
      fetchAll();
      Swal.fire({ icon: 'success', title: `Status diubah ke ${status}`, background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6', timer: 1500 });
    } catch (e) { }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (newStatus === 'Ditolak') {
      const { value: reason } = await Swal.fire({
        title: 'Alasan Penolakan',
        input: 'textarea',
        inputLabel: 'Berikan alasan mengapa pesanan ini ditolak',
        inputPlaceholder: 'Tulis alasan di sini...',
        showCancelButton: true,
        confirmButtonText: 'Tolak Pesanan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ef4444',
        background: '#12121e',
        color: '#fff',
        inputValidator: (value) => {
          if (!value) return 'Alasan penolakan wajib diisi!';
        },
      });
      if (reason) {
        updateOrderStatus(orderId, newStatus, reason);
      }
    } else {
      updateOrderStatus(orderId, newStatus);
    }
  };

  // ── Image Upload (file atau paste) ──
  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        setConcertForm(prev => ({ ...prev, image: data.url }));
        Swal.fire({ icon: 'success', title: 'Upload berhasil!', text: data.url, background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6', timer: 2000 });
      } else {
        Swal.fire({ icon: 'error', title: 'Upload gagal', text: data.error || 'Unknown error', background: '#12121e', color: '#fff' });
      }
    } catch (e) { Swal.fire({ icon: 'error', title: 'Upload gagal', background: '#12121e', color: '#fff' }); }
    finally { setUploading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) uploadImage(file);
        return;
      }
    }
  };

  // ── Short URL CRUD ──
  const addShortUrl = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Short URL', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6',
      html: '<input id="swal-source" class="swal2-input" placeholder="Slug (misal: promo)" style="background:#1a1a2e;color:#fff;border:1px solid #333;">' +
        '<input id="swal-dest" class="swal2-input" placeholder="https://example.com/target" style="background:#1a1a2e;color:#fff;border:1px solid #333;">',
      preConfirm: () => {
        const source = (document.getElementById('swal-source') as HTMLInputElement)?.value?.trim();
        const dest = (document.getElementById('swal-dest') as HTMLInputElement)?.value?.trim();
        if (!source || !dest) { Swal.showValidationMessage('Slug dan URL tujuan wajib diisi'); return; }
        if (!/^[a-zA-Z0-9_-]+$/.test(source)) { Swal.showValidationMessage('Slug hanya boleh huruf, angka, - dan _'); return; }
        if (!/^https?:\/\/.+/.test(dest)) { Swal.showValidationMessage('URL tujuan harus diawali http:// atau https://'); return; }
        return { source, dest };
      },
    });
    if (!formValues) return;
    try {
      await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addShortUrl', data: formValues }) });
      fetchAll();
      Swal.fire({ icon: 'success', title: 'Short URL ditambahkan!', background: '#12121e', color: '#fff', confirmButtonColor: '#8b5cf6', timer: 1500 });
    } catch (e) { }
  };

  const deleteShortUrl = async (id: string) => {
    const c = await Swal.fire({ title: 'Hapus Short URL ini?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', background: '#12121e', color: '#fff', confirmButtonText: 'Hapus' });
    if (!c.isConfirmed) return;
    try {
      await fetch('/api/sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteShortUrl', id }) });
      fetchAll();
    } catch (e) { }
  };

  const inputCls = (field?: string) => `w-full bg-black/30 border ${field && formErrors[field] ? 'border-red-500/60' : 'border-white/10'} rounded-xl p-3 text-sm focus:border-purple-500/50 outline-none text-white transition placeholder:text-gray-600`;
  const labelCls = "text-[10px] font-bold text-gray-500 uppercase mb-1.5 block ml-1 tracking-widest";
  const errCls = "text-[10px] text-red-400 mt-1 ml-1";

  /** Generate wa.me link konfirmasi pemesanan untuk admin kirim ke customer  */
  const buildWaLink = (o: any) => {
    let phone = (o.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    const msg = [
      `*Konfirmasi Pemesanan TiketYuk*`,
      ``,
      `Halo *${o.name}*!`,
      `Pemesanan tiket kamu telah berhasil kami terima.`,
      ``,
      `*Detail Pemesanan:*`,
      `- Order ID: *${o.orderId}*`,
      `- Tanggal Order: ${o.date || '-'}`,
      `- Nama: ${o.name}`,
      `- No. HP: ${o.phone || '-'}`,
      `- Tanggal Lahir: ${o.dob || '-'}`,
      `- Email: ${o.email || '-'}`,
      `- No. Identitas: ${o.identityType || ''} — ${o.identityNumber || '-'}`,
      ``,
      `- Konser: *${o.concertName}*`,
      `- Tipe Sale: ${o.saleType && o.saleType !== '-' ? o.saleType : '-'}`,
      `- Jenis Jasa: ${o.serviceType && o.serviceType !== '-' ? o.serviceType : '-'}`,
      o.rentMembership && o.rentMembership === 'Ya' ? `- Rent Membership: Ya 🪪` : '',
      `- Kategori Prioritas: ${o.category}`,
      o.backupCategories && o.backupCategories !== '-' ? `- Kategori Cadangan: ${o.backupCategories}` : '',
      `- Jumlah Tiket: ${o.ticketCount} tiket`,
      `- Metode Pembayaran: ${o.paymentMethod || '-'}`,
      ``,
      `Sebelum lanjut war tiket, mohon konfirmasi ya kak:`,
      `- Data pemesan sudah benar`,
      `- Standby di hari wartik untuk melakukan pembayaran jika tiket berhasil didapatkan`,
      `Jika ada perubahan kategori / jumlah tiket / data, boleh langsung info di chat ini`,
      ``,
      `*Jika kakak ikut war sendiri tidak masalah, namun apabila sudah secured tiket sendiri mohon segera informasikan ke admin agar tidak terjadi double checkout / double secured *`,
      `— TiketYuk`,
    ].filter(Boolean).join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-purple-500" size={48} />
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">Loading Admin...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12] text-gray-200 font-sans">
      {/* NAV */}
      <nav className="glass sticky top-0 z-50 shadow-2xl shadow-purple-900/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="TiketYuk" width={36} height={36} className="rounded-lg" />
            <div><h1 className="text-xl font-black text-white">Admin <span className="text-gradient">Panel</span></h1><p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">TiketYuk Dashboard</p></div>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/10 transition text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2"><Eye size={14} /> <span className="hidden md:inline">Lihat Site</span></Link>
            <button onClick={() => { localStorage.removeItem('tiketyuk_admin'); router.replace('/admin/login'); }} className="bg-white/5 hover:bg-red-900/20 px-3 py-2 rounded-xl border border-white/10 hover:border-red-500/30 transition text-[10px] font-bold text-gray-400 flex items-center gap-2"><LogOut size={14} /> <span className="hidden md:inline">Logout</span></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Konser', value: concerts.length, icon: Music, color: 'purple' },
            { label: 'Total Order', value: orders.length, icon: ClipboardList, color: 'pink' },
            { label: 'Pending', value: orders.filter(o => o.status === 'Pending').length, icon: Loader2, color: 'yellow' },
            { label: 'Secured', value: orders.filter(o => o.status === 'Secured').length, icon: ShieldCheck, color: 'green' },
          ].map((s, i) => (
            <div key={i} className="bg-[#12121e] border border-white/5 rounded-2xl p-5">
              <s.icon size={20} className={`text-${s.color}-400 mb-2`} />
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: 'concerts', label: 'Konser', icon: Music },
            { key: 'orders', label: 'Orders', icon: ClipboardList },
            { key: 'announce', label: 'Pengumuman', icon: Megaphone },
            { key: 'shorturl', label: 'Short URL', icon: Link2 },
          ].map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key as any); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-purple-600/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
          <button onClick={() => fetchAll()} className="ml-auto flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/5 text-gray-500 hover:text-white transition">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* SEARCH BAR */}
        {activeTab !== 'announce' && (
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'concerts' ? 'Cari konser...' : activeTab === 'orders' ? 'Cari order (ID, nama, konser, status)...' : 'Cari short URL...'}
              className="w-full bg-[#12121e] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-purple-500/30 outline-none text-white placeholder:text-gray-600 transition" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>
            )}
          </div>
        )}

        {/* TAB: KONSER */}
        {activeTab === 'concerts' && (
          <div className="space-y-6">
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-neon flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-900/20">
              <Plus size={16} /> Tambah Konser
            </button>

            {showForm && (
              <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 space-y-4 animate-fade-in-up">
                <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-300">{editingId ? 'Edit Konser' : 'Konser Baru'}</span>
                  <button onClick={resetForm} className="text-gray-500 hover:text-white"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Nama Konser *</label><input value={concertForm.name} onChange={e => setConcertForm({ ...concertForm, name: e.target.value })} placeholder="Nama konser..." className={inputCls('name')} />{formErrors.name && <p className={errCls}>{formErrors.name}</p>}</div>
                  <div><label className={labelCls}>Venue *</label><input value={concertForm.venue} onChange={e => setConcertForm({ ...concertForm, venue: e.target.value })} placeholder="Nama venue..." className={inputCls('venue')} />{formErrors.venue && <p className={errCls}>{formErrors.venue}</p>}</div>
                  <div><label className={labelCls}>Tanggal Mulai *</label><input type="date" value={concertForm.dateStart} onChange={e => setConcertForm({ ...concertForm, dateStart: e.target.value })} min="2025-01-01" max="2030-12-31" className={inputCls('dateStart')} />{formErrors.dateStart && <p className={errCls}>{formErrors.dateStart}</p>}</div>
                  <div><label className={labelCls}>Tanggal Selesai <span className="normal-case text-gray-600">(opsional, multi-hari)</span></label><input type="date" value={concertForm.dateEnd} onChange={e => setConcertForm({ ...concertForm, dateEnd: e.target.value })} min={concertForm.dateStart || '2025-01-01'} max="2030-12-31" className={inputCls('dateEnd')} />{formErrors.dateEnd && <p className={errCls}>{formErrors.dateEnd}</p>}</div>
                  <div><label className={labelCls}>Fee (Min) <span className="normal-case text-gray-600">(opsional)</span></label><input type="number" min="0" value={concertForm.priceMin} onChange={e => setConcertForm({ ...concertForm, priceMin: e.target.value })} placeholder="50000" className={inputCls('priceMin')} />{formErrors.priceMin && <p className={errCls}>{formErrors.priceMin}</p>}</div>
                  <div><label className={labelCls}>Fee (Max) <span className="normal-case text-gray-600">(opsional)</span></label><input type="number" min="0" value={concertForm.priceMax} onChange={e => setConcertForm({ ...concertForm, priceMax: e.target.value })} placeholder="100000" className={inputCls('priceMax')} />{formErrors.priceMax && <p className={errCls}>{formErrors.priceMax}</p>}</div>
                  <div onPaste={handlePaste}>
                    <label className={labelCls}>Poster (URL / Upload / Paste)</label>
                    <div className="space-y-2">
                      <input value={concertForm.image} onChange={e => setConcertForm({ ...concertForm, image: e.target.value })} placeholder="Paste URL atau paste gambar (Ctrl+V)..." className={inputCls('image')} />
                      <div className="flex gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider hover:bg-purple-600/30 transition disabled:opacity-50">
                          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} {uploading ? 'Uploading...' : 'Upload File'}
                        </button>
                        {concertForm.image && <span className="text-[10px] text-green-400 flex items-center gap-1"><ImageIcon size={12} /> Gambar terpasang</span>}
                      </div>
                      {formErrors.image && <p className={errCls}>{formErrors.image}</p>}
                    </div>
                  </div>
                  <div><label className={labelCls}>Seatplan (URL / Opsional)</label><input value={concertForm.seatplan} onChange={e => setConcertForm({ ...concertForm, seatplan: e.target.value })} placeholder="URL gambar seatplan..." className={inputCls('seatplan')} /></div>
                  <div className="relative"><label className={labelCls}>Status</label>
                    <select value={concertForm.status} onChange={e => setConcertForm({ ...concertForm, status: e.target.value })} className={inputCls() + " appearance-none cursor-pointer"}>
                      <option value="active">Active</option><option value="upcoming">Upcoming</option><option value="soldout">Slot Full</option><option value="closed">Closed</option>
                    </select><ChevronDown className="absolute right-3 top-9 pointer-events-none text-gray-500" size={16} />
                  </div>
                  <div><label className={labelCls}>Jumlah Tiket *</label><input type="number" min="1" max="100" value={concertForm.maxTicket} onChange={e => setConcertForm({ ...concertForm, maxTicket: e.target.value })} placeholder="10" className={inputCls('maxTicket')} />{formErrors.maxTicket && <p className={errCls}>{formErrors.maxTicket}</p>}</div>
                  <div className="flex items-center gap-3 self-end pb-1 md:col-span-2">
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input type="checkbox" checked={concertForm.dayOption} onChange={e => setConcertForm({ ...concertForm, dayOption: e.target.checked })} className="sr-only peer" />
                      <div className="w-10 h-5 bg-white/10 border border-white/10 rounded-full peer-checked:bg-purple-600/40 peer-checked:border-purple-500/50 transition-all after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-gray-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-purple-300"></div>
                      <span className="ml-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-300 transition">Pilihan Hari (Day 1/2)</span>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer group ml-4">
                      <input type="checkbox" checked={concertForm.jasaEnabled} onChange={e => setConcertForm({ ...concertForm, jasaEnabled: e.target.checked })} className="sr-only peer" />
                      <div className="w-10 h-5 bg-white/10 border border-white/10 rounded-full peer-checked:bg-pink-600/40 peer-checked:border-pink-500/50 transition-all after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-gray-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-pink-300"></div>
                      <span className="ml-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-300 transition">Aktifkan Pilihan Jasa (Jaswar/Jastip)</span>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer group ml-4">
                      <input type="checkbox" checked={concertForm.rentMembershipEnabled} onChange={e => setConcertForm({ ...concertForm, rentMembershipEnabled: e.target.checked })} className="sr-only peer" />
                      <div className="w-10 h-5 bg-white/10 border border-white/10 rounded-full peer-checked:bg-amber-600/40 peer-checked:border-amber-500/50 transition-all after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-gray-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-amber-300"></div>
                      <span className="ml-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-300 transition">Aktifkan Rent Membership 🪪</span>
                    </label>
                  </div>
                  <div className="md:col-span-2"><label className={labelCls}>Tipe Sale <span className="normal-case text-gray-600">(pisah koma, kosongkan untuk default: General Sale, Presale, General Sale &amp; Presale)</span></label><input value={concertForm.saleTypes} onChange={e => setConcertForm({ ...concertForm, saleTypes: e.target.value })} placeholder="General Sale, Presale, Presale BCA, Presale Mandiri" className={inputCls()} /><p className="text-[10px] text-gray-600 mt-1 ml-1">Jika mengandung kata "presale", customer wajib isi kode membership.</p></div>

                  <div className="md:col-span-2">
                    <label className={labelCls}>Batas Slot per Tipe Sale <span className="normal-case text-gray-600">(opsional, format: TipeSale:jumlah pisah koma)</span></label>
                    <input
                      value={concertForm.slotLimits}
                      onChange={e => setConcertForm({ ...concertForm, slotLimits: e.target.value })}
                      placeholder="General Sale:15, Presale:10, Presale BCA:5"
                      className={inputCls()}
                    />
                    <p className="text-[10px] text-gray-600 mt-1 ml-1">Kosongkan = tidak ada batas. Jika slot tipe sale sudah penuh, pilihan itu akan tampil <span className="text-red-400 font-bold">Full Slot</span> dan tidak bisa dipilih.</p>
                  </div>

                  {concertForm.jasaEnabled && (
                    <div className="md:col-span-2">
                      <label className={labelCls}>Batas Slot per Jenis Jasa <span className="normal-case text-gray-600">(opsional, format: Jaswar:jumlah,Jastip:jumlah)</span></label>
                      <input
                        value={concertForm.serviceLimits}
                        onChange={e => setConcertForm({ ...concertForm, serviceLimits: e.target.value })}
                        placeholder="Jaswar:20, Jastip:30"
                        className={inputCls()}
                      />
                      <p className="text-[10px] text-gray-600 mt-1 ml-1">Kosongkan = tidak ada batas. Jika slot jenis jasa penuh, pilihan itu akan tampil <span className="text-red-400 font-bold">Full Slot</span> dan tidak bisa dipilih.</p>
                    </div>
                  )}

                  <div className="md:col-span-2"><label className={labelCls}>Kategori Tiket Prioritas (pisah koma) *</label><input value={concertForm.categories} onChange={e => setConcertForm({ ...concertForm, categories: e.target.value })} placeholder="CAT 1, CAT 2, VIP, VVIP, Festival" className={inputCls('categories')} />{formErrors.categories && <p className={errCls}>{formErrors.categories}</p>}</div>

                  <div className="md:col-span-2"><label className={labelCls}>Deskripsi</label><textarea value={concertForm.description} onChange={e => setConcertForm({ ...concertForm, description: e.target.value })} placeholder="Deskripsi konser..." rows={4} className={inputCls() + " resize-none"} /></div>
                </div>
                <button onClick={saveConcert} className="btn-neon flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-900/20 mt-2">
                  <Save size={16} /> {editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            )}

            {/* Concert list */}
            <div className="space-y-3">
              {filteredConcerts.length === 0 ? (
                <div className="text-center py-16 bg-[#12121e] rounded-2xl border border-white/5"><Music className="mx-auto text-gray-700 mb-3" size={40} /><p className="text-gray-600 text-xs font-bold uppercase tracking-widest">{searchQuery ? 'Tidak ada hasil' : 'Belum ada konser'}</p></div>
              ) : filteredConcerts.map(c => (
                <div key={c.id} className="bg-[#12121e] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:border-purple-500/20 transition">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/30 shrink-0">
                    {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music size={24} className="text-gray-700" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{c.name}</h4>
                    <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {c.date}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {c.venue}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {c.saleTypes && <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md px-2 py-0.5 font-bold"><Tag size={10} className="inline mr-1" />{c.saleTypes}</span>}
                      {c.dayOption && <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md px-2 py-0.5 flex items-center gap-1 font-bold"><Calendar size={10} /> Pilihan Hari Aktif</span>}
                      {c.jasaEnabled && <span className="text-[10px] bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-md px-2 py-0.5 flex items-center gap-1 font-bold"><Star size={10} /> Jasa Aktif</span>}
                      {c.rentMembershipEnabled && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md px-2 py-0.5 flex items-center gap-1 font-bold">🪪 Rent Member Aktif</span>}
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shrink-0 ${c.status === 'active' ? 'bg-green-500/10 text-green-400' : c.status === 'upcoming' ? 'bg-blue-500/10 text-blue-400' : c.status === 'soldout' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.status === 'soldout' ? 'Slot Full' : c.status}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editConcert(c)} className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition"><Edit3 size={14} /></button>
                    <button onClick={() => deleteConcert(c.id, c.name)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{filteredOrders.length} order{searchQuery ? ` (filtered)` : ''}</p>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-[#12121e] rounded-2xl border border-white/5"><ClipboardList className="mx-auto text-gray-700 mb-3" size={40} /><p className="text-gray-600 text-xs font-bold uppercase tracking-widest">{searchQuery ? 'Tidak ada hasil' : 'Belum ada order'}</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredOrders.map(o => (
                  <div key={o.orderId} className="bg-[#12121e] border border-white/5 rounded-2xl p-5 hover:border-purple-500/20 transition-all group">
                    {/* Header: ID + Status */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-purple-400 tracking-wide">{o.orderId}</span>
                        <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${o.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : o.status === 'Dikonfirmasi' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : o.status === 'Secured' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : o.status === 'Ditolak' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>{o.status}</span>
                      </div>
                      <div className="relative">
                        <select onChange={e => { if (e.target.value) handleStatusChange(o.orderId, e.target.value); e.target.value = ''; }} defaultValue="" className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none cursor-pointer appearance-none pr-7 hover:border-purple-500/30 transition">
                          <option value="" disabled>Ubah Status</option>
                          <option value="Pending">Pending</option><option value="Dikonfirmasi">Dikonfirmasi</option><option value="Ditolak">Ditolak</option><option value="Secured">Secured</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" size={12} />
                      </div>
                    </div>
                    {/* Concert & Date */}
                    <div className="flex items-center gap-3 mb-3">
                      <Music size={14} className="text-purple-400 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">{o.concertName}</span>
                      <span className="text-[10px] text-gray-500 ml-auto whitespace-nowrap">{o.date}</span>
                    </div>
                    {/* Person info */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                      <div className="flex items-center gap-2"><User size={11} className="text-gray-500 shrink-0" /><span className="text-white font-medium truncate">{o.name}</span></div>
                      <div className="flex items-center gap-2"><Phone size={11} className="text-gray-500 shrink-0" /><span className="text-gray-400 truncate">{o.phone}</span></div>
                      <div className="flex items-center gap-2"><Mail size={11} className="text-gray-500 shrink-0" /><span className="text-gray-400 truncate">{o.email}</span></div>
                      <div className="flex items-center gap-2"><Hash size={11} className="text-gray-500 shrink-0" /><span className="text-gray-400 truncate">{o.identityType} — {o.identityNumber}</span></div>
                    </div>
                    {/* Ticket details */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/10 font-bold">{o.category}</span>
                      {o.backupCategories && o.backupCategories !== '-' && <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/5">Cadangan: {o.backupCategories}</span>}
                      <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/5">Qty: {o.ticketCount}</span>
                      <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/5">{o.paymentMethod || '-'}</span>
                      {o.saleType && o.saleType !== '-' && <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/10 font-bold"><Tag size={10} className="inline mr-1" />{o.saleType}</span>}
                      {o.serviceType && o.serviceType !== '-' && <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${o.serviceType === 'Jaswar' ? 'bg-purple-500/10 text-purple-300 border-purple-500/10' : 'bg-pink-500/10 text-pink-300 border-pink-500/10'}`}>{o.serviceType}</span>}
                      {o.rentMembership && o.rentMembership === 'Ya' && <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">🪪 Rent Membership</span>}
                      {o.membership && o.membership !== '-' && <span className="text-[10px] px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/10"><Star size={10} className="inline mr-1" />{o.membership}</span>}
                    </div>
                    {/* Reason */}
                    {o.reason && <p className="text-[10px] text-red-400/80 mt-2 italic">Alasan: {o.reason}</p>}
                    {/* WhatsApp Confirmation */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <a href={buildWaLink(o)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:shadow-lg"
                        style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.15)'; }}>
                        <MessageCircle size={14} /> Kirim Konfirmasi WA
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: PENGUMUMAN & SETTING */}
        {activeTab === 'announce' && (
          <div className="space-y-6">
            <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 space-y-4 max-w-2xl animate-fade-in-up">
              <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-3">
                <Volume2 size={14} className="text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Edit Pengumuman Homepage</span>
              </div>
              <p className="text-[11px] text-gray-500">Teks ini akan muncul sebagai banner berjalan di bagian atas homepage.</p>
              <textarea value={announceDraft} onChange={e => setAnnounceDraft(e.target.value)} rows={3} placeholder="Tulis pengumuman di sini..." className={inputCls() + " resize-none"} />
            </div>

            <div className="bg-[#12121e] border border-white/5 rounded-2xl p-6 space-y-4 max-w-2xl animate-fade-in-up">
              <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-3">
                <ClipboardList size={14} className="text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Edit Terms & Conditions (TNC)</span>
              </div>
              <p className="text-[11px] text-gray-500">Teks TNC akan tampil di bagian bawah announcement pada homepage.</p>
              <textarea value={tncDraft} onChange={e => setTncDraft(e.target.value)} rows={5} placeholder="Syarat dan ketentuan..." className={inputCls() + " resize-none"} />
            </div>

            <button onClick={saveWebSetting} className="btn-neon flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-900/20">
              <Save size={16} /> Simpan Semua Pengaturan
            </button>
          </div>
        )}

        {/* TAB: SHORT URL */}
        {activeTab === 'shorturl' && (
          <div className="space-y-6">
            <button onClick={addShortUrl} className="btn-neon flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-900/20">
              <Plus size={16} /> Tambah Short URL
            </button>
            {filteredShortUrls.length === 0 ? (
              <div className="text-center py-16 bg-[#12121e] rounded-2xl border border-white/5"><Link2 className="mx-auto text-gray-700 mb-3" size={40} /><p className="text-gray-600 text-xs font-bold uppercase tracking-widest">{searchQuery ? 'Tidak ada hasil' : 'Belum ada Short URL'}</p></div>
            ) : (
              <div className="space-y-3">
                {filteredShortUrls.map((s: any) => (
                  <div key={s.id} className="bg-[#12121e] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:border-purple-500/20 transition">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">ID:</span>
                        <span className="text-xs font-mono text-purple-400">{s.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link2 size={12} className="text-purple-400 shrink-0" />
                        <span className="text-sm text-white font-medium">/s/{s.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ExternalLink size={12} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-400 truncate max-w-[400px]">{s.dest}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/s/${s.source}`); Swal.fire({ icon: 'success', title: 'Copied!', timer: 1000, showConfirmButton: false, background: '#12121e', color: '#fff' }); }} className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition" title="Copy URL"><Copy size={14} /></button>
                      <button onClick={() => deleteShortUrl(s.id)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
