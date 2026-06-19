'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Download,
  Send,
  Search,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const API_KEY = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchSummary {
  id: string;
  createdAt: string;
  cardType: string;
  senderId: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  imported?: boolean;
}

interface Recipient {
  name: string;
  phone: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  reason?: string | null;
  messageId?: string | null;
}

interface BatchDetail extends BatchSummary {
  messageTemplate: string;
  recipients: Recipient[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchBatches(filters?: {
  cardType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<BatchSummary[]> {
  const params = new URLSearchParams();
  if (filters?.cardType) params.set('cardType', filters.cardType);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);

  const res = await fetch(`${BACKEND_URL}/sms/batches?${params}`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.batches ?? [];
}

async function fetchBatchDetail(id: string): Promise<BatchDetail> {
  const res = await fetch(`${BACKEND_URL}/sms/batches/${id}`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data; // backend returns the batch object directly, no wrapper
}

async function updateBatchMessage(id: string, message: string) {
  const res = await fetch(`${BACKEND_URL}/sms/batches/${id}/message`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Local utilities ──────────────────────────────────────────────────────────

const MONTHS_SW = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso: string, lang: 'sw' | 'en'): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const months = lang === 'sw' ? MONTHS_SW : MONTHS_EN;
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
  } catch {
    return iso;
  }
}

function exportToExcel(recipients: Recipient[], filename: string) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ['S/N', 'Jina', 'Simu', 'Hali', 'Sababu'],
    ...recipients.map((r, i) => [
      i + 1,
      r.name,
      r.phone,
      r.status === 'sent' ? 'Imetumwa' : 'Imeshindwa',
      r.reason || '-',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Ripoti');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-ui-border bg-ui-card p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-44 rounded-full bg-stone-200" />
        <div className="h-4 w-20 rounded-full bg-stone-100" />
      </div>
      <div className="h-3 w-36 rounded-full bg-stone-200" />
      <div className="flex gap-3">
        <div className="h-3 w-16 rounded-full bg-stone-100" />
        <div className="h-3 w-12 rounded-full bg-green-100" />
        <div className="h-3 w-12 rounded-full bg-red-100" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SmsDashboardPage() {
  const { language } = useLanguage();
  const sw = language === 'sw';

  // List state
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [cardTypeFilter, setCardTypeFilter] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal / detail state
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [messageDirty, setMessageDirty] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [resending, setResending] = useState(false);
  const [resendProgress, setResendProgress] = useState<{ sent: number; failed: number } | null>(null);

  // ── Load batches ──────────────────────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let dateFrom: string | undefined;
      const now = new Date();
      if (dateFilter === 'today') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (dateFilter === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        dateFrom = d.toISOString();
      } else if (dateFilter === 'month') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }
      const data = await fetchBatches({
        cardType: cardTypeFilter || undefined,
        status: batchStatusFilter || undefined,
        dateFrom,
      });
      setBatches(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [cardTypeFilter, batchStatusFilter, dateFilter]);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // ── Open batch detail ─────────────────────────────────────────────────────
  const openBatch = async (id: string) => {
    setLoadingDetail(true);
    setSelectedBatch(null);
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedRecipients(new Set());
    setResendProgress(null);
    setMessageDirty(false);
    try {
      const detail = await fetchBatchDetail(id);
      setSelectedBatch(detail);
      setEditedMessage(detail.messageTemplate ?? '');
    } catch (err) {
      console.error('Failed to load batch detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeBatch = () => {
    setSelectedBatch(null);
    setLoadingDetail(false);
  };

  // ── Message save ──────────────────────────────────────────────────────────
  const handleSaveMessage = async () => {
    if (!selectedBatch) return;
    setSavingMessage(true);
    try {
      await updateBatchMessage(selectedBatch.id, editedMessage);
      setSelectedBatch({ ...selectedBatch, messageTemplate: editedMessage });
      setMessageDirty(false);
    } catch (err) {
      console.error('Failed to save message:', err);
    } finally {
      setSavingMessage(false);
    }
  };

  // ── Filtered recipients ───────────────────────────────────────────────────
  const filteredRecipients = selectedBatch?.recipients.filter(r => {
    const matchesSearch = !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleRecipient = (phone: string) =>
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });

  const selectAllFailed = () =>
    setSelectedRecipients(new Set(
      selectedBatch?.recipients.filter(r => r.status === 'failed').map(r => r.phone) ?? []
    ));

  const toggleSelectAllVisible = () => {
    const allSelected = filteredRecipients.length > 0 &&
      filteredRecipients.every(r => selectedRecipients.has(r.phone));
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      allSelected
        ? filteredRecipients.forEach(r => next.delete(r.phone))
        : filteredRecipients.forEach(r => next.add(r.phone));
      return next;
    });
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResendSelected = async () => {
    if (!selectedBatch || selectedRecipients.size === 0) return;
    setResending(true);
    setResendProgress(null);
    const toResend = selectedBatch.recipients.filter(r => selectedRecipients.has(r.phone));
    try {
      const res = await fetch('/api/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: toResend.map(r => ({ name: r.name, phone: r.phone })),
          message: selectedBatch.messageTemplate,
          cardType: selectedBatch.cardType,
        }),
      });
      const result = await res.json();
      setResendProgress({ sent: result.sent ?? 0, failed: result.failed ?? 0 });
      const updated = await fetchBatches();
      setBatches(updated);
    } catch (err) {
      console.error('Resend failed:', err);
    } finally {
      setResending(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalSent = batches.reduce((s, b) => s + b.sentCount, 0);
  const failedRecipients = selectedBatch?.recipients.filter(r => r.status === 'failed') ?? [];
  const allVisibleSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every(r => selectedRecipients.has(r.phone));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ui-bg">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-ui-card border-b border-ui-border px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-xs text-ui-muted hover:text-ui-text transition-colors font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {sw ? 'Rudi' : 'Back'}
            </Link>
            <span className="text-ui-border select-none">|</span>
            <h1 className="text-sm font-bold text-ui-text flex items-center gap-2">
              <span className="text-base">📊</span>
              {sw ? 'Dashibodi ya SMS' : 'SMS Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-ui-muted">
            {!loading && batches.length > 0 && (
              <>
                <span className="font-semibold text-ui-text">{batches.length}</span>
                {' '}{sw ? 'matumizi' : 'batches'}
                <span className="mx-0.5">·</span>
                <span className="font-semibold text-emerald-600">{totalSent.toLocaleString()}</span>
                {' '}{sw ? 'zimetumwa' : 'sent'}
              </>
            )}
            <button
              type="button"
              onClick={loadBatches}
              disabled={loading}
              title={sw ? 'Onyesha upya' : 'Refresh'}
              className="ml-1 p-1.5 rounded-lg text-ui-muted hover:text-ui-text hover:bg-ui-bg transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ─── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2.5 bg-ui-card rounded-2xl border border-ui-border p-3">
          {/* Date */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="appearance-none text-xs font-semibold pl-3 pr-7 py-2 rounded-xl border border-ui-border bg-ui-bg text-ui-text focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="">{sw ? 'Tarehe: Zote' : 'Date: All'}</option>
              <option value="today">{sw ? 'Leo' : 'Today'}</option>
              <option value="week">{sw ? 'Wiki hii' : 'This week'}</option>
              <option value="month">{sw ? 'Mwezi huu' : 'This month'}</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-ui-muted pointer-events-none" />
          </div>

          {/* Card type */}
          <div className="relative">
            <select
              value={cardTypeFilter}
              onChange={e => setCardTypeFilter(e.target.value)}
              className="appearance-none text-xs font-semibold pl-3 pr-7 py-2 rounded-xl border border-ui-border bg-ui-bg text-ui-text focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="">{sw ? 'Aina: Zote' : 'Type: All'}</option>
              <option value="invitation">{sw ? 'Mwaliko' : 'Invitation'}</option>
              <option value="contribution">{sw ? 'Mchango' : 'Contribution'}</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-ui-muted pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={batchStatusFilter}
              onChange={e => setBatchStatusFilter(e.target.value)}
              className="appearance-none text-xs font-semibold pl-3 pr-7 py-2 rounded-xl border border-ui-border bg-ui-bg text-ui-text focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="">{sw ? 'Hali: Zote' : 'Status: All'}</option>
              <option value="complete">{sw ? 'Imekamilika' : 'Complete'}</option>
              <option value="partial">{sw ? 'Sehemu' : 'Partial'}</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-ui-muted pointer-events-none" />
          </div>
        </div>

        {/* ─── Error ────────────────────────────────────────────────────── */}
        {loadError && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {sw ? 'Imeshindwa kupakia data' : 'Failed to load data'}: {loadError}
            </span>
          </div>
        )}

        {/* ─── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* ─── Empty ────────────────────────────────────────────────────── */}
        {!loading && !loadError && batches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-stone-300" />
            <p className="font-semibold text-ui-muted text-sm">
              {sw ? 'Hakuna SMS zilizotumwa bado.' : 'No SMS batches sent yet.'}
            </p>
            <p className="text-xs text-ui-muted max-w-xs">
              {sw
                ? 'SMS utakaotumwa kupitia programu utaonekana hapa.'
                : 'SMS batches sent through the app will appear here.'}
            </p>
          </div>
        )}

        {/* ─── Batch list ───────────────────────────────────────────────── */}
        {!loading && !loadError && batches.length > 0 && (
          <div className="space-y-3">
            {batches.map(batch => {
              const isContrib = batch.cardType === 'contribution';
              return (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => openBatch(batch.id)}
                  className={`w-full text-left rounded-2xl border bg-ui-card p-4 transition-all hover:shadow-sm active:scale-[0.99] cursor-pointer border-l-4 ${
                    isContrib
                      ? 'border-l-amber-400 border-ui-border hover:border-amber-200'
                      : 'border-l-emerald-500 border-ui-border hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Date + imported badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-ui-muted font-mono">
                          {formatDate(batch.createdAt, language)}
                        </span>
                        {batch.imported && (
                          <span className="text-[10px] bg-stone-100 text-stone-500 rounded-full px-2 py-0.5 font-semibold border border-stone-200">
                            {sw ? 'Historia ya Awali' : 'Previous History'}
                          </span>
                        )}
                      </div>
                      {/* Type + sender */}
                      <p className="text-sm font-bold text-ui-text">
                        {isContrib ? (sw ? 'Mchango' : 'Contribution') : (sw ? 'Mwaliko' : 'Invitation')}
                        {' — '}
                        <span className="font-mono text-xs font-semibold text-ui-muted">{batch.senderId}</span>
                      </p>
                      {/* Counts */}
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="text-ui-muted">
                          {sw ? `Watu ${batch.totalContacts}` : `${batch.totalContacts} contacts`}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {batch.sentCount}
                        </span>
                        {batch.failedCount > 0 ? (
                          <span className="flex items-center gap-1 text-red-600 font-semibold">
                            <XCircle className="w-3 h-3" />
                            {batch.failedCount}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-semibold">
                            {sw ? 'Imekamilika ✓' : 'Complete ✓'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-amber-600 font-semibold shrink-0 mt-1">
                      {sw ? 'Angalia →' : 'View →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Batch detail modal ───────────────────────────────────────────────── */}
      {(loadingDetail || selectedBatch) && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) closeBatch(); }}
        >
          <div className="bg-ui-card rounded-2xl border border-ui-border shadow-2xl w-full max-w-2xl my-8">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-amber-600 to-amber-500 rounded-t-2xl">
              <div>
                <h2 className="text-sm font-bold text-white">
                  {sw ? 'Maelezo ya SMS' : 'SMS Batch Detail'}
                </h2>
                {selectedBatch && (
                  <p className="text-[11px] text-amber-100 mt-0.5">
                    {formatDate(selectedBatch.createdAt, language)}
                    {' · '}
                    {selectedBatch.cardType === 'contribution'
                      ? (sw ? 'Mchango' : 'Contribution')
                      : (sw ? 'Mwaliko' : 'Invitation')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeBatch}
                className="text-amber-100 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Loading inside modal */}
            {loadingDetail && !selectedBatch && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            )}

            {/* Detail body */}
            {selectedBatch && (
              <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">

                {/* ── Message editor ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-ui-text">
                      {sw ? 'Ujumbe uliotumwa' : 'Message template'}
                    </label>
                    {messageDirty && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        {sw ? 'Mabadiliko hayajahifadhiwa' : 'Unsaved changes'}
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={editedMessage}
                    onChange={e => { setEditedMessage(e.target.value); setMessageDirty(true); }}
                    className="w-full text-sm px-3.5 py-3 rounded-xl border border-stone-200 bg-white text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-y"
                  />
                  <button
                    type="button"
                    onClick={handleSaveMessage}
                    disabled={!messageDirty || savingMessage}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {savingMessage
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {sw ? 'Inahifadhi...' : 'Saving...'}</>
                      : `💾 ${sw ? 'Hifadhi Mabadiliko ya Ujumbe' : 'Save Message Changes'}`
                    }
                  </button>
                </div>

                {/* ── Search + filter ── */}
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-36">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={sw ? 'Tafuta jina au simu...' : 'Search name or phone...'}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-ui-border bg-ui-bg text-ui-text focus:border-amber-500 outline-none"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-ui-muted" />
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as 'all' | 'sent' | 'failed')}
                      className="appearance-none text-xs font-semibold pl-3 pr-7 py-2 rounded-xl border border-ui-border bg-ui-bg text-ui-text focus:border-amber-500 outline-none cursor-pointer"
                    >
                      <option value="all">{sw ? 'Hali: Zote' : 'Status: All'}</option>
                      <option value="sent">{sw ? 'Zilizotumwa' : 'Sent'}</option>
                      <option value="failed">{sw ? 'Zilizoshindwa' : 'Failed'}</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-ui-muted pointer-events-none" />
                  </div>
                </div>

                {/* ── Select all failed ── */}
                {selectedBatch.recipients.some(r => r.status === 'failed') && (
                  <button
                    type="button"
                    onClick={selectAllFailed}
                    className="text-[11px] text-red-600 hover:text-red-800 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    ☑ {sw ? 'Chagua Waliyoshindwa Wote' : 'Select All Failed'}
                    {' '}({selectedBatch.recipients.filter(r => r.status === 'failed').length})
                  </button>
                )}

                {/* ── Recipients table ── */}
                <div className="overflow-x-auto rounded-xl border border-ui-border">
                  <table className="w-full text-xs min-w-120">
                    <thead className="bg-ui-bg border-b border-ui-border">
                      <tr>
                        <th className="px-3 py-2.5 w-8 text-left">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAllVisible}
                            className="rounded cursor-pointer accent-amber-500"
                          />
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold text-ui-text">
                          {sw ? 'Jina' : 'Name'}
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold text-ui-text">
                          {sw ? 'Simu' : 'Phone'}
                        </th>
                        <th className="px-3 py-2.5 text-left font-semibold text-ui-text">
                          {sw ? 'Hali' : 'Status'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border">
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-ui-muted">
                            {sw ? 'Hakuna matokeo.' : 'No results found.'}
                          </td>
                        </tr>
                      ) : filteredRecipients.map((r, i) => (
                        <tr
                          key={`${r.phone}-${i}`}
                          className={`transition-colors ${selectedRecipients.has(r.phone) ? 'bg-amber-50/50' : 'hover:bg-ui-bg'}`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedRecipients.has(r.phone)}
                              onChange={() => toggleRecipient(r.phone)}
                              className="rounded cursor-pointer accent-amber-500"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-medium text-ui-text">{r.name}</td>
                          <td className="px-3 py-2.5 font-mono text-ui-muted">{r.phone}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              r.status === 'sent'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : r.status === 'failed'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {r.status === 'sent'
                                ? <><CheckCircle2 className="w-2.5 h-2.5" />{sw ? 'Imetumwa' : 'Sent'}</>
                                : r.status === 'failed'
                                ? <><XCircle className="w-2.5 h-2.5" />{sw ? 'Imeshindwa' : 'Failed'}</>
                                : <><Loader2 className="w-2.5 h-2.5 animate-spin" />{sw ? 'Inasubiri' : 'Pending'}</>
                              }
                            </span>
                            {r.reason && (
                              <p className="text-[10px] text-red-600 mt-0.5 max-w-35 truncate" title={r.reason}>
                                {r.reason}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Selection count ── */}
                {selectedRecipients.size > 0 && (
                  <p className="text-xs text-amber-700 font-semibold">
                    {sw
                      ? `Waliochaguliwa: ${selectedRecipients.size}`
                      : `Selected: ${selectedRecipients.size}`}
                  </p>
                )}

                {/* ── Resend result ── */}
                {resendProgress && (
                  <div className="rounded-xl border border-ui-border p-3 space-y-1 text-xs">
                    {resendProgress.sent > 0 && (
                      <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {sw ? `Imetumwa: ${resendProgress.sent}` : `Sent: ${resendProgress.sent}`}
                      </p>
                    )}
                    {resendProgress.failed > 0 && (
                      <p className="flex items-center gap-1.5 text-red-600 font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        {sw ? `Imeshindwa: ${resendProgress.failed}` : `Failed: ${resendProgress.failed}`}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div className="flex flex-col gap-2 pt-2 border-t border-ui-border">
                  {/* Resend selected */}
                  <button
                    type="button"
                    onClick={handleResendSelected}
                    disabled={resending || selectedRecipients.size === 0}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {resending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {sw ? 'Inatuma...' : 'Sending...'}</>
                      : <><Send className="w-3.5 h-3.5 rotate-45" />
                          {selectedRecipients.size > 0
                            ? (sw ? `📤 Tuma Tena Waliochaguliwa (${selectedRecipients.size})` : `📤 Resend to Selected (${selectedRecipients.size})`)
                            : (sw ? '📤 Tuma Tena Waliyoshindwa' : '📤 Resend Failed')}
                        </>
                    }
                  </button>

                  <div className="flex gap-2">
                    {failedRecipients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => exportToExcel(failedRecipients, `Waliyoshindwa_${selectedBatch.id}.xlsx`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {sw ? 'Pakua Excel ya Waliyoshindwa' : 'Export Failed (.xlsx)'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => exportToExcel(selectedBatch.recipients, `Wote_${selectedBatch.id}.xlsx`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-ui-border bg-ui-bg hover:bg-ui-card text-ui-text font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {sw ? 'Pakua Excel ya Wote' : 'Export All (.xlsx)'}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
