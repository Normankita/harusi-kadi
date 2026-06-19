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

interface NeverDeliveredEntry {
  phone: string;
  name: string;
  attemptCount: number;
  lastAttemptAt: string;
  lastReason: string | null;
  batches: {
    batchId: string;
    batchCreatedAt: string;
    cardType: string;
    status: string;
    reason: string | null;
  }[];
}

interface NeverDeliveredResponse {
  neverDelivered: NeverDeliveredEntry[];
  totalNeverDelivered: number;
  totalUniquePhonesSeen: number;
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

async function fetchKnownPhones(): Promise<Set<string>> {
  const res = await fetch(`${BACKEND_URL}/sms/recipients/known-phones`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return new Set(data.phones);
}

async function fetchNeverDelivered(): Promise<NeverDeliveredResponse> {
  const res = await fetch(`${BACKEND_URL}/sms/recipients/never-delivered`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error('Failed to fetch never-delivered list');
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

// ─── Excel parsing (mirrored from InvitationForm.tsx) ────────────────────────

function parsePhoneNumbers(raw: string): string[] {
  if (!raw) return [];
  const str = raw.toString().trim();
  if (!str) return [];
  if (/[,/\\;|]/.test(str)) {
    return str.split(/[,/\\;|]+/).map(p => p.replace(/\s+/g, '').trim()).filter(p => p.length >= 9);
  }
  const stripped = str.replace(/\s+/g, '');
  if (/^\+?\d{9,13}$/.test(stripped)) return [stripped];
  const tokens = str.trim().split(/\s+/);
  const numbers: string[] = [];
  let current = '';
  for (const token of tokens) {
    const cleaned = token.replace(/\D/g, '');
    if (!cleaned) continue;
    if (current === '') { current = cleaned; }
    else if (current.length >= 9 && current.length <= 13) { numbers.push(current); current = cleaned; }
    else { current = current + cleaned; }
  }
  if (current && current.length >= 9) numbers.push(current);
  return numbers.length > 0 ? numbers : stripped.length >= 9 ? [stripped] : [];
}

function normalizeParsedPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return '255' + cleaned.substring(1);
  if (cleaned.length === 9 && !cleaned.startsWith('255')) return '255' + cleaned;
  return cleaned;
}

function parseExcelContacts(fileData: ArrayBuffer): { name: string; phone: string }[] {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 }) as unknown[][];
  if (rows.length === 0) throw new Error('Empty file');
  const headers = (rows[0] as unknown[]).map(h => String(h ?? '').trim().toLowerCase());
  const jinaIndex = headers.findIndex(h => h === 'jina' || h === 'name' || h === 'recipient name' || h === 'recipient');
  const simuIndex = headers.findIndex(h => h === 'simu' || h === 'phone' || h === 'simu ya mwalikwa' || h === 'phone number' || h === 'recipient phone');
  if (jinaIndex === -1) throw new Error('Jina column not found');
  const contacts: { name: string; phone: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;
    const name = String(row[jinaIndex] ?? '').trim();
    if (!name) continue;
    const phoneRaw = simuIndex !== -1 && row[simuIndex] !== undefined ? String(row[simuIndex] ?? '').trim() : '';
    const phones = parsePhoneNumbers(phoneRaw).map(normalizeParsedPhone).filter(p => p.length >= 9);
    if (phones.length <= 1) {
      contacts.push({ name, phone: phones[0] ?? phoneRaw });
    } else {
      phones.forEach((phone, idx) => contacts.push({ name: `${name} (${idx + 1})`, phone }));
    }
  }
  return contacts;
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

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'batches' | 'neverDelivered' | 'crossCheck'>('batches');

  // ── Batch list state ──────────────────────────────────────────────────────
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

  // ── Never-delivered state ──────────────────────────────────────────────────
  const [neverDeliveredData, setNeverDeliveredData] = useState<NeverDeliveredResponse | null>(null);
  const [loadingNeverDelivered, setLoadingNeverDelivered] = useState(false);
  const [ndSearchQuery, setNdSearchQuery] = useState('');
  const [ndSelectedPhones, setNdSelectedPhones] = useState<Set<string>>(new Set());
  const [ndCardType, setNdCardType] = useState<'invitation' | 'contribution'>('invitation');
  const [ndMessage, setNdMessage] = useState('');
  const [ndSending, setNdSending] = useState(false);
  const [ndSendResult, setNdSendResult] = useState<{ sent?: number; failed?: number } | null>(null);

  // ── Cross-check state ─────────────────────────────────────────────────────
  const [crossCheckResult, setCrossCheckResult] = useState<{
    neverAttempted: { name: string; phone: string }[];
    alreadyAttempted: { name: string; phone: string }[];
    totalFromExcel: number;
  } | null>(null);
  const [loadingCrossCheck, setLoadingCrossCheck] = useState(false);
  const [crossCheckError, setCrossCheckError] = useState<string | null>(null);

  // ── Status enrichment state ───────────────────────────────────────────────
  const [enrichResult, setEnrichResult] = useState<{
    name: string;
    phone: string;
    status: 'sent' | 'failed' | 'never_attempted';
    reason: string | null;
    attemptCount: number;
  }[] | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

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

  // ── Load never-delivered lazily when tab first opens ──────────────────────
  const refreshNeverDelivered = useCallback(() => {
    setLoadingNeverDelivered(true);
    fetchNeverDelivered()
      .then(setNeverDeliveredData)
      .catch(console.error)
      .finally(() => setLoadingNeverDelivered(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'neverDelivered' && !neverDeliveredData) {
      refreshNeverDelivered();
    }
  }, [activeTab, neverDeliveredData, refreshNeverDelivered]);

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

  // ── Batch modal: filtered recipients ─────────────────────────────────────
  const filteredRecipients = selectedBatch?.recipients.filter(r => {
    const matchesSearch = !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  // ── Batch modal: selection ────────────────────────────────────────────────
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

  // ── Batch modal: resend ───────────────────────────────────────────────────
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

  // ── Never-delivered: filtered list ────────────────────────────────────────
  const filteredNeverDelivered = (neverDeliveredData?.neverDelivered ?? []).filter(
    r => !ndSearchQuery ||
      r.name.toLowerCase().includes(ndSearchQuery.toLowerCase()) ||
      r.phone.includes(ndSearchQuery)
  );

  // ── Never-delivered: selection ────────────────────────────────────────────
  const toggleNdPhone = (phone: string) =>
    setNdSelectedPhones(prev => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });

  const toggleNdSelectAll = () => {
    const allSelected = filteredNeverDelivered.length > 0 &&
      filteredNeverDelivered.every(r => ndSelectedPhones.has(r.phone));
    setNdSelectedPhones(prev => {
      const next = new Set(prev);
      allSelected
        ? filteredNeverDelivered.forEach(r => next.delete(r.phone))
        : filteredNeverDelivered.forEach(r => next.add(r.phone));
      return next;
    });
  };

  // ── Never-delivered: send ─────────────────────────────────────────────────
  const handleSendToNeverDelivered = async () => {
    if (ndSelectedPhones.size === 0 || !ndMessage.trim()) return;
    setNdSending(true);
    setNdSendResult(null);
    const recipients = (neverDeliveredData?.neverDelivered ?? [])
      .filter(r => ndSelectedPhones.has(r.phone))
      .map(r => ({ name: r.name, phone: r.phone }));
    try {
      const res = await fetch('/api/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: recipients, message: ndMessage, cardType: ndCardType }),
      });
      const result = await res.json();
      setNdSendResult(result);
      refreshNeverDelivered();
      setNdSelectedPhones(new Set());
    } catch (err) {
      console.error('Resend failed:', err);
    } finally {
      setNdSending(false);
    }
  };

  const handleExportNeverDelivered = () => {
    exportToExcel(
      filteredNeverDelivered.map(r => ({
        name: r.name,
        phone: r.phone,
        message: '',
        status: 'failed' as const,
        reason: r.lastReason,
      })),
      'Waliokosa_SMS_Wote.xlsx'
    );
  };

  // ── Cross-check ───────────────────────────────────────────────────────────
  const handleCrossCheckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCrossCheckError(null);
    setCrossCheckResult(null);
    setLoadingCrossCheck(true);
    try {
      const buffer = await file.arrayBuffer();
      const contacts = parseExcelContacts(buffer);
      if (contacts.length === 0) throw new Error(sw ? 'Hakuna data iliyopatikana' : 'No contacts found in file');
      const known = await fetchKnownPhones();
      const neverAttempted = contacts.filter(c => !known.has(c.phone));
      const alreadyAttempted = contacts.filter(c => known.has(c.phone));
      setCrossCheckResult({ neverAttempted, alreadyAttempted, totalFromExcel: contacts.length });
    } catch (err) {
      setCrossCheckError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoadingCrossCheck(false);
      e.target.value = '';
    }
  };

  const exportCrossCheckList = (contacts: { name: string; phone: string }[], filename: string) => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['S/N', 'Jina', 'Simu'],
      ...contacts.map((c, i) => [i + 1, c.name, c.phone]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Watu');
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
  };

  // ── Status enrichment ─────────────────────────────────────────────────────
  const handleEnrichUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnrichError(null);
    setEnrichResult(null);
    setEnrichLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const contacts = parseExcelContacts(buffer);
      if (contacts.length === 0) throw new Error(sw ? 'Hakuna data iliyopatikana' : 'No contacts found in file');
      const phones = contacts.map(c => c.phone);
      const res = await fetch(`${BACKEND_URL}/sms/recipients/status-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ phones }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEnrichResult(contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        status: data.results[c.phone]?.status ?? 'never_attempted',
        reason: data.results[c.phone]?.reason ?? null,
        attemptCount: data.results[c.phone]?.attemptCount ?? 0,
      })));
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setEnrichLoading(false);
      e.target.value = '';
    }
  };

  const exportEnrichedReport = () => {
    if (!enrichResult) return;
    const statusLabel = (s: string) => {
      if (s === 'sent') return 'Imetumwa';
      if (s === 'failed') return 'Imeshindwa';
      return 'Haijajaribiwa Kabisa';
    };
    const wb = XLSX.utils.book_new();
    const rows = [
      ['S/N', 'Jina', 'Simu', 'Hali', 'Sababu', 'Idadi ya Majaribio'],
      ...enrichResult.map((r, i) => [
        i + 1, r.name, r.phone, statusLabel(r.status), r.reason || '-', r.attemptCount,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ripoti ya Hali');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ripoti_ya_Hali_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalSent = batches.reduce((s, b) => s + b.sentCount, 0);
  const failedRecipients = selectedBatch?.recipients.filter(r => r.status === 'failed') ?? [];
  const allVisibleSelected =
    filteredRecipients.length > 0 &&
    filteredRecipients.every(r => selectedRecipients.has(r.phone));
  const ndAllVisibleSelected =
    filteredNeverDelivered.length > 0 &&
    filteredNeverDelivered.every(r => ndSelectedPhones.has(r.phone));

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
            {activeTab === 'batches' && !loading && batches.length > 0 && (
              <>
                <span className="font-semibold text-ui-text">{batches.length}</span>
                {' '}{sw ? 'matumizi' : 'batches'}
                <span className="mx-0.5">·</span>
                <span className="font-semibold text-emerald-600">{totalSent.toLocaleString()}</span>
                {' '}{sw ? 'zimetumwa' : 'sent'}
              </>
            )}
            {activeTab === 'batches' && (
              <button
                type="button"
                onClick={loadBatches}
                disabled={loading}
                title={sw ? 'Onyesha upya' : 'Refresh'}
                className="ml-1 p-1.5 rounded-lg text-ui-muted hover:text-ui-text hover:bg-ui-bg transition-colors cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {activeTab === 'neverDelivered' && (
              <button
                type="button"
                onClick={refreshNeverDelivered}
                disabled={loadingNeverDelivered}
                title={sw ? 'Onyesha upya' : 'Refresh'}
                className="ml-1 p-1.5 rounded-lg text-ui-muted hover:text-ui-text hover:bg-ui-bg transition-colors cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingNeverDelivered ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ─── Tab switcher ─────────────────────────────────────────────── */}
        <div className="flex rounded-2xl border border-ui-border bg-ui-card p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('batches')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'batches'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-ui-muted hover:text-ui-text hover:bg-ui-bg'
            }`}
          >
            {sw ? 'Makundi ya SMS' : 'SMS Batches'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('neverDelivered')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'neverDelivered'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-ui-muted hover:text-ui-text hover:bg-ui-bg'
            }`}
          >
            {sw ? 'Waliokosa SMS' : 'Failed Recipients'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crossCheck')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'crossCheck'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-ui-muted hover:text-ui-text hover:bg-ui-bg'
            }`}
          >
            {sw ? 'Linganisha na Excel' : 'Cross-Check Excel'}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BATCHES TAB                                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'batches' && (
          <>
            {/* ─── Filters ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2.5 bg-ui-card rounded-2xl border border-ui-border p-3">
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

            {/* ─── Error ────────────────────────────────────────────────── */}
            {loadError && (
              <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{sw ? 'Imeshindwa kupakia data' : 'Failed to load data'}: {loadError}</span>
              </div>
            )}

            {/* ─── Loading ──────────────────────────────────────────────── */}
            {loading && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {/* ─── Empty ────────────────────────────────────────────────── */}
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

            {/* ─── Batch list ───────────────────────────────────────────── */}
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
                          <p className="text-sm font-bold text-ui-text">
                            {isContrib ? (sw ? 'Mchango' : 'Contribution') : (sw ? 'Mwaliko' : 'Invitation')}
                            {' — '}
                            <span className="font-mono text-xs font-semibold text-ui-muted">{batch.senderId}</span>
                          </p>
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* NEVER-DELIVERED TAB                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'neverDelivered' && (
          <div className="space-y-5">

            {/* ─── Summary banner ───────────────────────────────────────── */}
            {!loadingNeverDelivered && neverDeliveredData && (
              <div className="bg-ui-card rounded-2xl border border-ui-border p-4 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  {neverDeliveredData.totalNeverDelivered === 0 ? (
                    <p className="text-sm font-bold text-emerald-700">
                      {sw ? '🎉 Hongera! Watu wote wamepokea SMS.' : '🎉 Great! Everyone has received an SMS.'}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-red-700">
                        {sw
                          ? `Watu ${neverDeliveredData.totalNeverDelivered} hawajapokea SMS yoyote bado.`
                          : `${neverDeliveredData.totalNeverDelivered} people have never received any SMS.`}
                      </p>
                      <p className="text-xs text-ui-muted">
                        {sw
                          ? `Kati ya namba ${neverDeliveredData.totalUniquePhonesSeen} za kipekee zilizojaribiwa`
                          : `Out of ${neverDeliveredData.totalUniquePhonesSeen} unique numbers seen`}
                      </p>
                    </>
                  )}
                </div>
                {neverDeliveredData.totalNeverDelivered > 0 && (
                  <button
                    type="button"
                    onClick={handleExportNeverDelivered}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-ui-border bg-ui-bg hover:bg-amber-50 hover:border-amber-300 text-ui-text transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {sw ? 'Pakua Excel' : 'Export Excel'}
                  </button>
                )}
              </div>
            )}

            {/* ─── Loading skeleton ─────────────────────────────────────── */}
            {loadingNeverDelivered && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {/* ─── Content (only when loaded and there are entries) ──────── */}
            {!loadingNeverDelivered && neverDeliveredData && neverDeliveredData.totalNeverDelivered > 0 && (
              <>
                {/* ─── Search ─────────────────────────────────────────────── */}
                <div className="relative">
                  <input
                    type="text"
                    value={ndSearchQuery}
                    onChange={e => setNdSearchQuery(e.target.value)}
                    placeholder={sw ? 'Tafuta jina au simu...' : 'Search name or phone...'}
                    className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 outline-none"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-ui-muted" />
                </div>

                {/* ─── Table ──────────────────────────────────────────────── */}
                <div className="overflow-x-auto rounded-2xl border border-ui-border bg-ui-card">
                  <table className="w-full text-xs min-w-120">
                    <thead className="bg-ui-bg border-b border-ui-border">
                      <tr>
                        <th className="px-3 py-2.5 w-8 text-left">
                          <input
                            type="checkbox"
                            checked={ndAllVisibleSelected}
                            onChange={toggleNdSelectAll}
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
                          {sw ? 'Majaribio' : 'Attempts'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border">
                      {filteredNeverDelivered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-ui-muted">
                            {sw ? 'Hakuna matokeo.' : 'No results found.'}
                          </td>
                        </tr>
                      ) : filteredNeverDelivered.map((r, i) => (
                        <tr
                          key={`${r.phone}-${i}`}
                          className={`transition-colors ${ndSelectedPhones.has(r.phone) ? 'bg-amber-50/50' : 'hover:bg-ui-bg'}`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={ndSelectedPhones.has(r.phone)}
                              onChange={() => toggleNdPhone(r.phone)}
                              className="rounded cursor-pointer accent-amber-500"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-medium text-ui-text">{r.name}</td>
                          <td className="px-3 py-2.5 font-mono text-ui-muted">{r.phone}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-2.5 h-2.5" />
                              {r.attemptCount}x
                              {r.lastReason && ` · ${r.lastReason}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ─── Selection count ────────────────────────────────────── */}
                {ndSelectedPhones.size > 0 && (
                  <p className="text-xs text-amber-700 font-semibold">
                    {sw ? `Waliochaguliwa: ${ndSelectedPhones.size}` : `Selected: ${ndSelectedPhones.size}`}
                  </p>
                )}

                {/* ─── Composer (only when selection > 0) ─────────────────── */}
                {ndSelectedPhones.size > 0 && (
                  <div className="bg-ui-card rounded-2xl border border-ui-border p-5 space-y-4">
                    <p className="text-xs font-bold text-ui-text">
                      {sw ? 'Chagua aina ya ujumbe:' : 'Choose message type:'}
                    </p>

                    {/* Card type selector */}
                    <div className="flex gap-2">
                      {(['invitation', 'contribution'] as const).map(ct => (
                        <button
                          key={ct}
                          type="button"
                          onClick={() => setNdCardType(ct)}
                          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            ndCardType === ct
                              ? ct === 'invitation'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-ui-border bg-ui-bg text-ui-muted hover:bg-ui-card'
                          }`}
                        >
                          {ct === 'invitation'
                            ? (sw ? '💌 Mwaliko' : '💌 Invitation')
                            : (sw ? '💰 Mchango' : '💰 Contribution')}
                        </button>
                      ))}
                    </div>

                    {/* Message textarea */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ui-text">
                        {sw ? 'Ujumbe:' : 'Message:'}
                      </label>
                      <textarea
                        rows={4}
                        value={ndMessage}
                        onChange={e => setNdMessage(e.target.value)}
                        placeholder={sw
                          ? 'Andika ujumbe wako hapa... tumia {{name}} kwa jina'
                          : 'Write your message here... use {{name}} for name'}
                        className="w-full text-sm px-3.5 py-3 rounded-xl border border-stone-200 bg-white text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-y"
                      />
                    </div>

                    {/* Send result */}
                    {ndSendResult && (
                      <div className="rounded-xl border border-ui-border p-3 space-y-1 text-xs">
                        {(ndSendResult.sent ?? 0) > 0 && (
                          <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {sw ? `Imetumwa: ${ndSendResult.sent}` : `Sent: ${ndSendResult.sent}`}
                          </p>
                        )}
                        {(ndSendResult.failed ?? 0) > 0 && (
                          <p className="flex items-center gap-1.5 text-red-600 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            {sw ? `Imeshindwa: ${ndSendResult.failed}` : `Failed: ${ndSendResult.failed}`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={handleSendToNeverDelivered}
                      disabled={ndSending || !ndMessage.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      {ndSending
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {sw ? 'Inatuma...' : 'Sending...'}</>
                        : <><Send className="w-3.5 h-3.5 rotate-45" />
                            {sw
                              ? `📤 Tuma SMS kwa Watu ${ndSelectedPhones.size}`
                              : `📤 Send SMS to ${ndSelectedPhones.size} people`}
                          </>
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CROSS-CHECK TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'crossCheck' && (
          <div className="space-y-5">

            {/* ─── Intro card + upload ────────────────────────────────────── */}
            <div className="bg-ui-card rounded-2xl border border-ui-border p-5 space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-sm font-bold text-ui-text">
                  {sw ? '📂 Linganisha na Excel Yangu' : '📂 Cross-Check My Excel'}
                </h2>
                <p className="text-xs text-ui-muted leading-relaxed">
                  {sw
                    ? 'Pakia faili la Excel lako la awali (mfano: lenye watu 356) ili kuona ni watu gani hawajatumiwa SMS yoyote bado — sio aliyoshindwa bali hawakujaribiwa kabisa.'
                    : 'Upload your original Excel file (e.g. 356 contacts) to find contacts who were never attempted at all — not failed, simply never submitted.'}
                </p>
              </div>

              <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all text-xs font-bold ${
                loadingCrossCheck
                  ? 'border-blue-200 bg-blue-50 text-blue-400 cursor-not-allowed'
                  : 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}>
                {loadingCrossCheck
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {sw ? 'Inachunguza...' : 'Checking...'}</>
                  : <><Download className="w-4 h-4 rotate-180" /> {sw ? 'Chagua Faili la Excel' : 'Choose Excel File'}</>
                }
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={loadingCrossCheck}
                  onChange={handleCrossCheckUpload}
                />
              </label>

              {crossCheckError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{crossCheckError}</span>
                </div>
              )}
            </div>

            {/* ─── Results ────────────────────────────────────────────────── */}
            {crossCheckResult && (
              <div className="bg-ui-card rounded-2xl border border-ui-border p-5 space-y-4">
                <h3 className="text-sm font-bold text-ui-text">
                  {sw ? '📊 Matokeo ya Ulinganisho' : '📊 Cross-Check Results'}
                </h3>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-ui-border bg-ui-bg p-3 text-center space-y-0.5">
                    <p className="text-lg font-bold text-ui-text">{crossCheckResult.totalFromExcel}</p>
                    <p className="text-[10px] text-ui-muted font-semibold">
                      {sw ? 'Jumla kwenye Excel' : 'Total in Excel'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center space-y-0.5">
                    <p className="text-lg font-bold text-red-700">{crossCheckResult.neverAttempted.length}</p>
                    <p className="text-[10px] text-red-600 font-semibold">
                      {sw ? 'Hawajajaribiwa' : 'Never attempted'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center space-y-0.5">
                    <p className="text-lg font-bold text-green-700">{crossCheckResult.alreadyAttempted.length}</p>
                    <p className="text-[10px] text-green-700 font-semibold">
                      {sw ? 'Tayari wamejaribiwa' : 'Already attempted'}
                    </p>
                  </div>
                </div>

                {/* Export buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  {crossCheckResult.neverAttempted.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportCrossCheckList(crossCheckResult.neverAttempted, 'Wasiojaribiwa.xlsx')}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {sw
                        ? `📥 Pakua Excel ya Wasiojaribiwa (${crossCheckResult.neverAttempted.length})`
                        : `📥 Export Never-Attempted Excel (${crossCheckResult.neverAttempted.length})`}
                    </button>
                  )}
                  {crossCheckResult.alreadyAttempted.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportCrossCheckList(crossCheckResult.alreadyAttempted, 'Waliojaribiwa.xlsx')}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-ui-border bg-ui-bg hover:bg-ui-card text-ui-text font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {sw
                        ? `📥 Pakua Excel ya Waliojaribiwa (${crossCheckResult.alreadyAttempted.length})`
                        : `📥 Export Already-Attempted Excel (${crossCheckResult.alreadyAttempted.length})`}
                    </button>
                  )}
                  {crossCheckResult.neverAttempted.length === 0 && (
                    <p className="text-center text-sm font-bold text-emerald-700 py-2">
                      {sw ? '🎉 Watu wote kwenye Excel hii wamekwisha jaribiwa!' : '🎉 Everyone in this Excel has already been attempted!'}
                    </p>
                  )}
                </div>

                {/* Upload another */}
                <div className="pt-1 border-t border-ui-border">
                  <label className="flex items-center gap-1.5 text-xs text-ui-muted hover:text-ui-text font-semibold cursor-pointer transition-colors w-fit">
                    <RefreshCw className="w-3 h-3" />
                    {sw ? 'Pakia faili jingine' : 'Upload another file'}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleCrossCheckUpload}
                    />
                  </label>
                </div>
              </div>
            )}
            {/* ─── Status enrichment section ──────────────────────────────── */}
            <div className="bg-ui-card rounded-2xl border border-ui-border p-5 space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-sm font-bold text-ui-text">
                  {sw ? '📋 Pakua Ripoti Kamili ya Hali' : '📋 Download Full Status Report'}
                </h2>
                <p className="text-xs text-ui-muted leading-relaxed">
                  {sw
                    ? 'Pakia Excel yako ili kupata ripoti kamili yenye majina, hali (imetumwa / imeshindwa / haijajaribiwa), na sababu za kushindwa kwa kila mtu.'
                    : 'Upload your Excel to get a full report with real names, status (sent / failed / never attempted), and failure reasons for every contact.'}
                </p>
              </div>

              <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all text-xs font-bold ${
                enrichLoading
                  ? 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
                  : 'border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700'
              }`}>
                {enrichLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {sw ? 'Inachunguza...' : 'Looking up...'}</>
                  : <><Download className="w-4 h-4 rotate-180" /> {sw ? 'Chagua Faili la Excel' : 'Choose Excel File'}</>
                }
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={enrichLoading}
                  onChange={handleEnrichUpload}
                />
              </label>

              {enrichError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{enrichError}</span>
                </div>
              )}

              {enrichResult && (() => {
                const sentCount = enrichResult.filter(r => r.status === 'sent').length;
                const failedCount = enrichResult.filter(r => r.status === 'failed').length;
                const neverCount = enrichResult.filter(r => r.status === 'never_attempted').length;
                return (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-xl border border-ui-border bg-ui-bg p-2.5 text-center space-y-0.5">
                        <p className="text-base font-bold text-ui-text">{enrichResult.length}</p>
                        <p className="text-[10px] text-ui-muted font-semibold">{sw ? 'Jumla' : 'Total'}</p>
                      </div>
                      <div className="rounded-xl border border-green-200 bg-green-50 p-2.5 text-center space-y-0.5">
                        <p className="text-base font-bold text-green-700">{sentCount}</p>
                        <p className="text-[10px] text-green-700 font-semibold">{sw ? 'Imetumwa' : 'Sent'}</p>
                      </div>
                      <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center space-y-0.5">
                        <p className="text-base font-bold text-red-700">{failedCount}</p>
                        <p className="text-[10px] text-red-600 font-semibold">{sw ? 'Imeshindwa' : 'Failed'}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center space-y-0.5">
                        <p className="text-base font-bold text-amber-700">{neverCount}</p>
                        <p className="text-[10px] text-amber-700 font-semibold">{sw ? 'Haijajaribiwa' : 'Never tried'}</p>
                      </div>
                    </div>

                    {/* Download button */}
                    <button
                      type="button"
                      onClick={exportEnrichedReport}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-700 hover:bg-stone-800 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {sw
                        ? `📥 Pakua Ripoti Kamili (${enrichResult.length} watu)`
                        : `📥 Download Full Status Report (${enrichResult.length} contacts)`}
                    </button>

                    {/* Upload another */}
                    <label className="flex items-center gap-1.5 text-xs text-ui-muted hover:text-ui-text font-semibold cursor-pointer transition-colors w-fit pt-1">
                      <RefreshCw className="w-3 h-3" />
                      {sw ? 'Pakia faili jingine' : 'Upload another file'}
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleEnrichUpload} />
                    </label>
                  </div>
                );
              })()}
            </div>

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
