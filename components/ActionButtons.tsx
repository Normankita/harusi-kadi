"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Image,
  FileDown,
  FileText,
  Send,
  AlertCircle,
  Heart,
  Copy,
  Check,
  WifiOff,
  MessageSquare,
  Users,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  Smartphone,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageOrientation,
} from "docx";
import * as XLSX from "xlsx";
import { InvitationData, ExcelContact } from "../types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const SECONDS_PER_MSG = 4;

interface ActionButtonsProps {
  data: InvitationData;
  cardRef: React.RefObject<HTMLDivElement | null>;
  excelData: ExcelContact[] | null;
  onUpdateData: React.Dispatch<React.SetStateAction<InvitationData>>;
}

interface FailedContact {
  name: string;
  phone: string;
  reason: string;
}

interface ProgressPayload {
  sent: number;
  total: number;
  current: string;
  success: number;
  failed: number;
  done: boolean;
  failures?: FailedContact[];
  errors?: FailedContact[];
}

type WhatsAppStatus = "checking" | "connected" | "disconnected" | "unreachable";

// ─── Swahili date helpers ───────────────────────────────────────────────────
const formatSwahiliDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"];
    const months = ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const formatSwahiliDateShort = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

// ─── Format seconds into readable time ─────────────────────────────────────
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}dk ${s}s` : `${m} dakika`;
};

// ─── SMS style types & helpers ──────────────────────────────────────────────
type SmsStyle = 'short' | 'detailed';

function buildSmsTemplate(
  style: SmsStyle,
  lang: 'sw' | 'en',
  cardType: 'invitation' | 'contribution',
  d: InvitationData
): string {
  const groomName = d.jinaLaKijana?.trim() || (lang === 'en' ? 'Couple' : 'Maharusi');
  const date = d.tareheYaNdoa ? formatSwahiliDateShort(d.tareheYaNdoa) : (lang === 'en' ? '[Date]' : '[Tarehe]');
  const venue = d.mahaliPaNdoa?.trim() || (lang === 'en' ? '[Venue]' : '[Mahali]');
  const family = d.wafadhili?.trim() || (lang === 'en' ? 'Family' : 'Familia');
  const method = d.ainaYaMchango?.trim() || 'MPESA';
  const number = d.nambaYaSimuMchango?.trim() || '';
  const accountName = d.jinaLaAkauntiYaMchango?.trim() || '';
  const deadline = d.mwishoWaKutoaMchango ? formatSwahiliDateShort(d.mwishoWaKutoaMchango) : (lang === 'en' ? '[Deadline]' : '[Tarehe]');
  const committeePhone = d.kamatiKuu.find(m => m.phone?.trim())?.phone?.trim() ?? d.nambaYaSimuMchango ?? '';

  if (cardType === 'contribution') {
    if (style === 'short') {
      return lang === 'en'
        ? `Hi {{name}}, kindly contribute to ${groomName}'s wedding. ${method}: ${number}. Deadline: ${deadline}`
        : `Habari {{name}}, sherehe ya ${groomName} inakuomba mchango wako. ${method}: ${number}. Mwisho: ${deadline}`;
    }
    if (lang === 'en') {
      let msg = `Dear {{name}},\nPlease contribute to ${groomName}'s wedding.\nSend via ${method}: ${number}`;
      if (accountName) msg += `\nName: ${accountName}`;
      return msg + `\nDeadline: ${deadline}\n-${family}`;
    }
    let msg = `Habari {{name}},\nUnaalikwa kutoa mchango wa harusi ya ${groomName}.\nTuma kwa ${method}: ${number}`;
    if (accountName) msg += `\nJina: ${accountName}`;
    return msg + `\nMwisho: ${deadline}\n-${family}`;
  }

  // invitation
  if (style === 'short') {
    return lang === 'en'
      ? `Hi {{name}}, you're invited to ${groomName}'s wedding on ${date} at ${venue}. -${family}`
      : `Habari {{name}}, unaalikwa harusi ya ${groomName} tarehe ${date} - ${venue}. -${family}`;
  }
  if (lang === 'en') {
    let msg = `Dear {{name}},\n${family} cordially invites you to the wedding of ${groomName}.\nDate: ${date}\nVenue: ${venue}`;
    if (committeePhone) msg += `\nContact: ${committeePhone}`;
    return msg;
  }
  let msg = `Habari {{name}},\nFamilia ya ${family} inakualika kwenye harusi ya ${groomName}.\nTarehe: ${date}\nMahali: ${venue}`;
  if (committeePhone) msg += `\nKwa maelezo: ${committeePhone}`;
  return msg;
}

function getSmsStats(len: number): { icon: string; colorClass: string; label: string; smsLabel: string } {
  if (len <= 160) return { icon: '✅', colorClass: 'text-emerald-600', label: `${len}/160`, smsLabel: 'SMS 1' };
  if (len <= 306) return { icon: '⚠️', colorClass: 'text-amber-600', label: `${len}/320`, smsLabel: 'SMS 1-2' };
  return { icon: '❌', colorClass: 'text-red-600', label: `${len} chars`, smsLabel: 'SMS 2+' };
}

export default function ActionButtons({ data, cardRef, excelData, onUpdateData }: ActionButtonsProps) {
  const { language, tr } = useLanguage();

  // ── Export states ──────────────────────────────────────────────────────────
  const [isImageExporting, setIsImageExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // ── WhatsApp manual share ─────────────────────────────────────────────────
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [copyToast, setCopyToast] = useState(false);

  // ── Backend / bulk send states ────────────────────────────────────────────
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>("checking");
  const [qrCode, setQrCode] = useState<string>("");
  const [backendOffline, setBackendOffline] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<ProgressPayload | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [captureProgress, setCaptureProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const sessionIdRef = useRef<string>("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasBulkContacts = !!(excelData && excelData.length > 0);

  // ── SMS composer state ─────────────────────────────────────────────────────
  const [smsComposerOpen, setSmsComposerOpen] = useState(false);
  const [smsSinglePhone, setSmsSinglePhone] = useState("");
  const [smsSingleMessage, setSmsSingleMessage] = useState("");
  const [smsSinglePhoneError, setSmsSinglePhoneError] = useState("");
  const [smsSingleSending, setSmsSingleSending] = useState(false);
  const [smsSingleResult, setSmsSingleResult] = useState<"success" | "error" | null>(null);
  const [smsBulkMessage, setSmsBulkMessage] = useState("");
  const [smsBulkSending, setSmsBulkSending] = useState(false);
  const [smsBulkResult, setSmsBulkResult] = useState<{ sent: number; failed: number; done: boolean } | null>(null);

  // ── SMS fallback state (after WhatsApp bulk failures) ──────────────────────
  const [smsFallbackDismissed, setSmsFallbackDismissed] = useState(false);
  const [smsFallbackSending, setSmsFallbackSending] = useState(false);
  const [smsFallbackResult, setSmsFallbackResult] = useState<{ sent: number; failed: number; done: boolean } | null>(null);

  // ── SMS style state ────────────────────────────────────────────────────────
  const [smsMessageStyle, setSmsMessageStyle] = useState<SmsStyle>('short');
  const [smsFallbackMessageStyle, setSmsFallbackMessageStyle] = useState<SmsStyle>('short');
  const [smsDisclaimerOpen, setSmsDisclaimerOpen] = useState(false);
  const [smsMessageEdited, setSmsMessageEdited] = useState(false);

  // ── Poll WhatsApp status ──────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    if (!BACKEND_URL) {
      setBackendOffline(true);
      setWaStatus("unreachable");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/status`, { headers: { 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error("not ok");
      const json = await res.json();
      setBackendOffline(false);
      if (json.connected) {
        setWaStatus("connected");
        setQrCode("");
      } else {
        setWaStatus("disconnected");
        setQrCode(json.qr || "");
      }
    } catch {
      setBackendOffline(true);
      setWaStatus("unreachable");
    }
  }, []);

  // Only poll when bulk contacts are present
  useEffect(() => {
    if (!hasBulkContacts) return;
    checkStatus();
    const id = setInterval(checkStatus, 10_000);
    return () => clearInterval(id);
  }, [hasBulkContacts, checkStatus]);

  // ── Stop progress polling ─────────────────────────────────────────────────
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // ── Poll send progress ────────────────────────────────────────────────────
  const pollProgress = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/progress/${sessionId}`, { headers: { 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const json: ProgressPayload = await res.json();
      setSendingProgress(json);
      if (json.done) {
        stopPolling();
        setIsSending(false);
      }
    } catch {
      // ignore transient errors during polling
    }
  }, []);

  // ── Normalize a phone number to international format (255XXXXXXXXX) ────────
  const normalizePhone = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0") && cleaned.length === 10) cleaned = "255" + cleaned.substring(1);
    else if (cleaned.length === 9 && !cleaned.startsWith("255")) cleaned = "255" + cleaned;
    return cleaned;
  };

  // ── Start bulk send ───────────────────────────────────────────────────────
  const handleBulkSend = async () => {
    if (!excelData || excelData.length === 0) return;
    const sessionId = Date.now().toString();
    sessionIdRef.current = sessionId;

    // Pre-format all phone numbers to international format
    const normalizedContacts = excelData.map(c => ({
      name: c.name,
      phone: normalizePhone(c.phone),
    }));

    // Show the modal immediately so the user sees capture progress
    setShowModal(true);
    setCaptureProgress({ current: 0, total: normalizedContacts.length, name: "" });

    // ── Step 1: Capture a personalised card for every contact ───────────────
    const originalName = data.jinaLaMwalikwa;
    const contactsWithImages: { name: string; phone: string; cardImageBase64: string }[] = [];

    try {
      if (typeof window !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }

      for (let i = 0; i < normalizedContacts.length; i++) {
        const contact = normalizedContacts[i];

        // Update the preview card with this contact's name
        onUpdateData(prev => ({ ...prev, jinaLaMwalikwa: contact.name }));
        setCaptureProgress({ current: i + 1, total: normalizedContacts.length, name: contact.name });

        // Wait for React to re-render the card before capturing
        await new Promise(r => setTimeout(r, 350));

        const cardElement = cardRef.current;
        if (!cardElement) throw new Error("Card element not found");

        const canvas = await html2canvas(cardElement, {
          scale: 1.5,          // was 2 — lower scale halves canvas memory
          useCORS: true,
          backgroundColor: "#FFFDF9",
          logging: false,
          allowTaint: true,
        });

        // JPEG at 0.8 quality is ~8-10x smaller than PNG — critical for large contact lists
        const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);

        // Free GPU/canvas memory immediately — don't hold 350 canvases at once
        canvas.width = 0;
        canvas.height = 0;

        contactsWithImages.push({
          name: contact.name,
          phone: contact.phone,
          cardImageBase64: imageBase64,
        });

        // Yield to event loop every 50 contacts so the GC can reclaim freed canvas memory
        if ((i + 1) % 50 === 0) {
          await new Promise(r => setTimeout(r, 80));
        }
      }
    } catch (captureErr) {
      console.error("Card capture failed:", captureErr);
      // Restore original name before bailing out
      onUpdateData(prev => ({ ...prev, jinaLaMwalikwa: originalName }));
      setCaptureProgress(null);
      setSendingProgress({
        sent: 0,
        total: normalizedContacts.length,
        current: "",
        success: 0,
        failed: normalizedContacts.length,
        done: true,
        failures: normalizedContacts.map(c => ({
          name: c.name,
          phone: c.phone,
          reason: "Imeshindwa kuandaa picha ya kadi",
        })),
      });
      return;
    }

    // Restore original name (empty = blank line on card) after all captures
    onUpdateData(prev => ({ ...prev, jinaLaMwalikwa: originalName }));
    setCaptureProgress(null);

    // ── Step 2: Start sending phase ──────────────────────────────────────────
    setSendingProgress({
      sent: 0,
      total: contactsWithImages.length,
      current: contactsWithImages[0]?.name || "",
      success: 0,
      failed: 0,
      done: false,
      failures: [],
    });
    setIsSending(true);

    // ── Step 3: POST to backend with per-contact images ──────────────────────
    try {
      const res = await fetch(`${BACKEND_URL}/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' },
        body: JSON.stringify({
          sessionId,
          contacts: contactsWithImages,   // each contact has its own cardImageBase64
          cardImageBase64: contactsWithImages[0]?.cardImageBase64 || "", // Fallback at root for older backends
          weddingInfo: {
            family: data.wafadhili || "Familia",
            groomName: data.jinaLaKijana || "Maharusi",
            brideName: data.jinaLaKijana || "",
            weddingDate: data.tareheYaNdoa || "",
            venue: data.mahaliPaNdoa || "",
          },
        }),
      });

      if (!res.ok) {
        let errBody = "";
        try {
          const ct = res.headers.get("content-type") || "";
          errBody = ct.includes("json")
            ? JSON.stringify(await res.json())
            : await res.text();
        } catch {
          errBody = "(hakuna maelezo ya hitilafu)";
        }
        console.error(`Bulk send HTTP ${res.status}:`, errBody);
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
    } catch (err) {
      console.error("Bulk send failed to start:", err);
      const reason = err instanceof Error ? err.message : "Imeshindwa kuunganisha na seva";
      setSendingProgress(prev =>
        prev
          ? {
              ...prev,
              done: true,
              failures: contactsWithImages.map(c => ({
                name: c.name,
                phone: c.phone,
                reason,
              })),
            }
          : null
      );
      setIsSending(false);
      return;
    }

    // Start polling for progress
    pollIntervalRef.current = setInterval(() => pollProgress(sessionId), 2000);
  };

  useEffect(() => () => stopPolling(), []);

  // Auto-fill both SMS messages on data/style/language change unless user has manually edited.
  // smsMessageEdited is intentionally excluded from deps — auto-fill should only fire on real data changes.
  useEffect(() => {
    if (smsMessageEdited) return;
    const template = buildSmsTemplate(smsMessageStyle, language, data.cardType ?? 'invitation', data);
    setSmsBulkMessage(template);
    setSmsSingleMessage(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, smsMessageStyle, language]);

  // Reset edited flag when contacts load or clear so auto-fill kicks in again
  useEffect(() => {
    setSmsMessageEdited(false);
  }, [excelData]);

  // ── Download failed contacts as Excel ────────────────────────────────────
  const downloadFailedContacts = () => {
    if (!failures.length) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      ["S/N", "Jina", "Simu", "Sababu ya Kushindwa"],
      ...failures.map((f, i) => [i + 1, f.name, f.phone, f.reason]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, "Waliopungukiwa");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Waliopungukiwa_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── SMS single send ────────────────────────────────────────────────────────
  const handleSingleSMSSend = async () => {
    setSmsSinglePhoneError("");
    const cleaned = smsSinglePhone.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.startsWith("0") && cleaned.length === 10) formatted = "255" + cleaned.substring(1);
    else if (cleaned.length === 9 && !cleaned.startsWith("255")) formatted = "255" + cleaned;
    if (!formatted.startsWith("255") || formatted.length !== 12) {
      setSmsSinglePhoneError(tr('phoneInvalid'));
      return;
    }
    if (!smsSingleMessage.trim()) return;
    setSmsSingleSending(true);
    setSmsSingleResult(null);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: smsSinglePhone, message: smsSingleMessage, cardType: data.cardType }),
      });
      if (res.ok) {
        setSmsSingleResult("success");
        setTimeout(() => setSmsSingleResult(null), 3000);
      } else {
        setSmsSingleResult("error");
      }
    } catch {
      setSmsSingleResult("error");
    } finally {
      setSmsSingleSending(false);
    }
  };

  // ── SMS bulk send ──────────────────────────────────────────────────────────
  const handleBulkSMSSend = async () => {
    if (!excelData || excelData.length === 0 || !smsBulkMessage.trim()) return;
    setSmsBulkSending(true);
    setSmsBulkResult(null);
    try {
      const res = await fetch("/api/sms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: excelData.map(c => ({ name: c.originalName || c.name, phone: c.phone })),
          message: smsBulkMessage,
          cardType: data.cardType,
        }),
      });
      const result = await res.json();
      setSmsBulkResult({ sent: result.sent ?? 0, failed: result.failed ?? 0, done: true });
    } catch {
      setSmsBulkResult({ sent: 0, failed: excelData.length, done: true });
    } finally {
      setSmsBulkSending(false);
    }
  };

  // ── SMS fallback after WhatsApp failures ───────────────────────────────────
  const handleSmsFallback = async () => {
    setSmsFallbackSending(true);
    try {
      const res = await fetch("/api/sms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: failures,
          message: buildSmsTemplate(smsFallbackMessageStyle, language, data.cardType ?? 'invitation', data),
          cardType: data.cardType,
        }),
      });
      const result = await res.json();
      setSmsFallbackResult({ sent: result.sent ?? 0, failed: result.failed ?? 0, done: true });
    } catch {
      setSmsFallbackResult({ sent: 0, failed: failures.length, done: true });
    } finally {
      setSmsFallbackSending(false);
    }
  };

  // ── WhatsApp message generator ────────────────────────────────────────────
  const generateWhatsAppMessage = () => {
    if (data.cardType === "contribution") {
      const wafadhili = data.wafadhili.trim() || "Familia ya Bw. John Nchwali Joel na Mercy Nchwali";
      const mahaliWafadhili = data.mahaliPaWafadhili.trim() ? ` wa ${data.mahaliPaWafadhili}` : " wa Ipagala -Dodoma";
      const kijana = data.jinaLaKijana.trim() || "Bright Mujulizi Kimaro";
      const uhusiano = data.uhusianoWaKijana?.trim() || "kijana wao mpendwa";
      const tarehe = data.tareheYaNdoa.trim() ? formatSwahiliDateShort(data.tareheYaNdoa) : "12/09/2026";
      const mahali = data.mahaliPaNdoa.trim() || "mjini Dodoma";
      const mwalikwa = data.jinaLaMwalikwa.trim() || "Ndugu Mwalikwa";
      const jinaAkaunti = data.jinaLaAkauntiYaMchango || "Mercy Joel Nchwali";
      const mwishoMchango = data.mwishoWaKutoaMchango.trim() ? formatSwahiliDateShort(data.mwishoWaKutoaMchango) : "30/08/2026";

      let msg = `Habari ${mwalikwa},\n\n*Mchango wa Harusi*\n\n`;
      msg += `${wafadhili}${mahaliWafadhili}\n`;
      msg += `Wanayo furaha kukutaarifu/kuwataarifu\n`;
      msg += `*${mwalikwa}*\n\n`;
      msg += `Kuwa ${uhusiano}\n`;
      msg += `*${kijana}*\n`;
      msg += `anatarajia kufunga ndoa tarehe *${tarehe}* ${mahali}. Hivyo ukiwa ndugu, jamaa na rafiki wa karibu wa familia hii unaombwa/mnaombwa kutoa mchango wako/wenu wa hali na mali kufanikisha shughuli hii muhimu. Tafadhali kabidhi mchango wako kwa *${jinaAkaunti}*\n\n`;
      msg += `💰 *Njia za Uchangiaji:*\n`;
      msg += `- ${data.ainaYaMchango || "MPESA"}: *${data.nambaYaSimuMchango || "0754388813"}*\n`;
      if (data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili) {
        msg += `- ${data.ainaYaMchangoPili}: *${data.nambaYaSimuMchangoPili}*\n`;
      }
      msg += `\n⏰ *Mwisho wa kutoa mchango:* ${mwishoMchango}\n\n`;
      if (data.kamatiKuu.length > 0) {
        msg += `📞 *Mawasiliano ya Kamati Kuu:*\n`;
        data.kamatiKuu.forEach(m => { if (m.name.trim() && m.phone.trim()) msg += `- ${m.name}: ${m.phone}\n`; });
        msg += `\n`;
      }
      msg += `"Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana"`;
      return msg;
    }

    const wafadhili = data.wafadhili.trim() || "Familia ya Bw. & Bibi John Nchwali";
    const mahaliWafadhili = data.mahaliPaWafadhili.trim() ? ` ya ${data.mahaliPaWafadhili}` : "";
    const kijana = data.jinaLaKijana.trim() || "Bright Mujulizi Kimaro";
    const tarehe = data.tareheYaNdoa.trim() ? formatSwahiliDate(data.tareheYaNdoa) : "[Siku ya Sherehe]";
    const mahali = data.mahaliPaNdoa.trim() || "[Ukumbi na Mahali pa Ibada]";
    const mwalikwa = data.jinaLaMwalikwa.trim() || "Ndugu Mwalikwa";
    const jinaAkaunti = data.jinaLaAkauntiYaMchango || "Mercy Joel Nchwali";
    const mwishoMchango = data.mwishoWaKutoaMchango.trim() ? formatSwahiliDate(data.mwishoWaKutoaMchango) : "";
    const hasPaymentDetails = data.ainaYaMchango.trim() || data.nambaYaSimuMchango.trim() || data.jinaLaAkauntiYaMchango.trim();
    const isLandscape = data.mtindoWaMapambo === "gold-leaf-full";

    let msg = `Habari ${mwalikwa},\n\n*MWALIKO WA HARUSI*\n\nNdugu, Jamaa na Rafiki,\n\n`;
    if (isLandscape) {
      msg += `Inayo heshima kubwa kukualika:\n*${mwalikwa}*\n\nKwenye sherehe ya ndoa ya watoto wao wapendwa:\n*${kijana}*\n\nMawifi na Maamuma wa:\n*${wafadhili}${mahaliWafadhili}*\n\n`;
    } else {
      msg += `Inayo heshima kubwa,\n*${wafadhili}${mahaliWafadhili}*\n\ninayo heshima kubwa kukualika wewe mpendwa wetu:\n*${mwalikwa}*\n\nKwenye sherehe ya ndoa ya watoto wao wapendwa:\n*${kijana}*\n\n`;
    }
    msg += `📌 Ibada na sherehe zitafanyika tarehe *${tarehe}* katika ukumbi wa *${mahali}*.\n\n`;
    if (hasPaymentDetails) {
      msg += `💰 *Michango na Malipo ya Uthibitisho:*\nTafadhali kabidhi/tuma mchango wako kwa *${jinaAkaunti}*\n- ${data.ainaYaMchango || "MPESA"}: *${data.nambaYaSimuMchango || "0754388813"}*\n`;
      if (data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili) {
        msg += `- ${data.ainaYaMchangoPili}: *${data.nambaYaSimuMchangoPili}*\n`;
      }
      if (mwishoMchango) msg += `⏰ *Mwisho wa kupokea michango:* ${mwishoMchango}\n`;
      msg += `\n`;
    }
    if (data.kamatiKuu.length > 0) {
      msg += `📞 *Kamati ya Mawasiliano:*\n`;
      data.kamatiKuu.forEach(m => { if (m.name.trim() && m.phone.trim()) msg += `- ${m.name}: ${m.phone}\n`; });
      msg += `\n`;
    }
    msg += `"Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana"`;
    return msg;
  };

  const generateEncodedMessage = () => encodeURIComponent(generateWhatsAppMessage());

  // ── Copy message to clipboard ─────────────────────────────────────────────
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppMessage());
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } catch {
      // fallback for older browsers
    }
  };

  // ── WhatsApp number formatting ────────────────────────────────────────────
  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = "255" + cleaned.substring(1);
    if (cleaned.length === 9 && !cleaned.startsWith("255")) cleaned = "255" + cleaned;
    return cleaned;
  };

  const validatePhoneNumber = (phone: string) => {
    const cleaned = formatWhatsAppNumber(phone);
    return cleaned.startsWith("255") && cleaned.length === 12;
  };

  // ── Single image export ───────────────────────────────────────────────────
  const handleExportImageSingle = async (recipientName: string) => {
    const cardElement = cardRef.current;
    if (!cardElement) return;
    if (typeof window !== "undefined" && "fonts" in document) await document.fonts.ready;
    const canvas = await html2canvas(cardElement, { scale: 2.5, useCORS: true, backgroundColor: "#FFFDF9", logging: false, allowTaint: true });
    const imageUri = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const cleanName = recipientName.trim().replace(/\s+/g, "_");
    a.href = imageUri;
    a.download = data.cardType === "contribution" ? `Kadi_Mchango_Harusi_${cleanName}.png` : `Mwaliko_Harusi_${cleanName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportImage = async () => {
    if (excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim()) {
      try {
        setIsBatchExporting(true);
        for (let i = 0; i < excelData.length; i++) {
          const row = excelData[i];
          setBatchProgress({ current: i + 1, total: excelData.length, name: row.name });
          onUpdateData({ ...data, jinaLaMwalikwa: row.name });
          await new Promise(r => setTimeout(r, 350));
          await handleExportImageSingle(row.name);
        }
      } catch (e) { console.error(e); }
      finally { onUpdateData({ ...data, jinaLaMwalikwa: "" }); setIsBatchExporting(false); setBatchProgress(null); }
    } else {
      try { setIsImageExporting(true); await handleExportImageSingle(data.jinaLaMwalikwa || "Mwaliko"); }
      catch (e) { console.error(e); }
      finally { setIsImageExporting(false); }
    }
  };

  // ── Single PDF export ─────────────────────────────────────────────────────
  const handleExportPdfSingle = async (recipientName: string) => {
    const cardElement = cardRef.current;
    if (!cardElement) return;
    if (typeof window !== "undefined" && "fonts" in document) await document.fonts.ready;
    const canvas = await html2canvas(cardElement, { scale: 2.5, useCORS: true, backgroundColor: "#FFFDF9", logging: false, allowTaint: true });
    const imgData = canvas.toDataURL("image/png");
    const isLandscape = data.mtindoWaMapambo === "gold-leaf-full";
    const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    const margin = 15;
    const cW = pdfW - 2 * margin;
    let fW = cW, fH = cW / ratio;
    if (fH > pdfH - 2 * margin) { fH = pdfH - 2 * margin; fW = fH * ratio; }
    pdf.addImage(imgData, "PNG", (pdfW - fW) / 2, (pdfH - fH) / 2, fW, fH);
    const cleanName = recipientName.trim().replace(/\s+/g, "_");
    pdf.save(data.cardType === "contribution" ? `Kadi_Mchango_Harusi_${cleanName}.pdf` : `Mwaliko_Harusi_${cleanName}.pdf`);
  };

  const handleExportPdf = async () => {
    if (excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim()) {
      try {
        setIsBatchExporting(true);
        for (let i = 0; i < excelData.length; i++) {
          const row = excelData[i];
          setBatchProgress({ current: i + 1, total: excelData.length, name: row.name });
          onUpdateData({ ...data, jinaLaMwalikwa: row.name });
          await new Promise(r => setTimeout(r, 350));
          await handleExportPdfSingle(row.name);
        }
      } catch (e) { console.error(e); }
      finally { onUpdateData({ ...data, jinaLaMwalikwa: "" }); setIsBatchExporting(false); setBatchProgress(null); }
    } else {
      try { setIsPdfExporting(true); await handleExportPdfSingle(data.jinaLaMwalikwa || "Mwaliko"); }
      catch (e) { console.error(e); }
      finally { setIsPdfExporting(false); }
    }
  };

  // ── DOCX helpers ──────────────────────────────────────────────────────────
  const createDocxDocument = (guestName: string) => {
    const style = data.mtindoWaMapambo || "classic";
    const isLandscape = style === "gold-leaf-full";
    const getSpacing = (base: number) => isLandscape ? Math.max(20, Math.round(base * 0.45)) : base;
    const getFontSize = (base: number) => isLandscape ? Math.max(12, Math.round(base * 0.75)) : base;
    let borderColor = "B58622", borderStyle: any = BorderStyle.DOUBLE, borderSize = 24;
    let themeColorPrimary = "765117", themeColorAccent = "B58622";
    let topOrnament = "❦  ❤  ❦", subTitleColor = "936719";
    if (style === "floral") { borderColor = "768A79"; borderStyle = BorderStyle.SINGLE; borderSize = 12; themeColorPrimary = "3C5A44"; themeColorAccent = "5F7D65"; topOrnament = "🍃  🌸  🍃"; subTitleColor = "5F7D65"; }
    else if (style === "royal") { borderColor = "936719"; borderSize = 36; themeColorPrimary = "624316"; themeColorAccent = "936719"; topOrnament = "⚜  ❤  ⚜"; subTitleColor = "765117"; }
    else if (style === "gold-leaf" || style === "gold-leaf-full") { borderColor = "B58622"; themeColorPrimary = "451A03"; themeColorAccent = "D97706"; topOrnament = "🌿  ❤  🌿"; subTitleColor = "B45309"; }

    if (data.cardType === "contribution") {
      const wafadhiliText = data.wafadhili.trim() || "Familia ya Bw. John Nchwali Joel na Mercy Nchwali";
      const mahaliWafadhiliText = data.mahaliPaWafadhili.trim() ? `wa ${data.mahaliPaWafadhili}` : "wa Ipagala -Dodoma";
      const jinaKijanaText = data.jinaLaKijana.trim() || "Bright Mujulizi Kimaro";
      const uhusianoText = data.uhusianoWaKijana?.trim() || "kijana wao mpendwa";
      const tareheNdoaText = data.tareheYaNdoa.trim() ? formatSwahiliDateShort(data.tareheYaNdoa) : "12/09/2026";
      const mahaliNdoaText = data.mahaliPaNdoa.trim() || "mjini Dodoma";
      const mwishoMchangoText = data.mwishoWaKutoaMchango.trim() ? formatSwahiliDateShort(data.mwishoWaKutoaMchango) : "30/08/2026";
      const jinaAkaunti = data.jinaLaAkauntiYaMchango || "Mercy Joel Nchwali";

      return new Document({
        background: { color: "FFFDF9" },
        sections: [{
          properties: { page: { size: { width: isLandscape ? 16838 : 11906, height: isLandscape ? 11906 : 16838, orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: isLandscape ? 960 : 1440, bottom: isLandscape ? 960 : 1440, left: isLandscape ? 960 : 1440, right: isLandscape ? 960 : 1440 }, borders: { pageBorderTop: { style: borderStyle, size: borderSize, color: borderColor, space: isLandscape ? 10 : 15 }, pageBorderBottom: { style: borderStyle, size: borderSize, color: borderColor, space: 15 }, pageBorderLeft: { style: borderStyle, size: borderSize, color: borderColor, space: 15 }, pageBorderRight: { style: borderStyle, size: borderSize, color: borderColor, space: 15 } } } },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(200), after: getSpacing(100) }, children: [new TextRun({ text: topOrnament, font: "Georgia", size: getFontSize(32), color: themeColorAccent })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: "MCHANGO WA HARUSI", font: "Playfair Display", size: getFontSize(40), bold: true, color: themeColorPrimary })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: "════════════════════", font: "Georgia", size: getFontSize(20), color: themeColorAccent })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: `${wafadhiliText} ${mahaliWafadhiliText}`, font: "Playfair Display", size: getFontSize(30), bold: true, color: "38240A" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: "Wanayo furaha kukutaarifu/kuwataarifu", font: "Georgia", size: getFontSize(22), italics: true, color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: "Mhe./Prof./Dkt./Mch./Bw&Bibi/Bw./Bibi/Dr./Miss", font: "Montserrat", size: getFontSize(16), bold: true, color: "888888" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: guestName.trim() || "__________________________________", font: "Montserrat", size: getFontSize(24), bold: true, underline: {}, color: "1C1917" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(200) }, children: [new TextRun({ text: `Kuwa ${uhusianoText}`, font: "Georgia", size: getFontSize(22), italics: true, color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: jinaKijanaText, font: "Playfair Display", size: getFontSize(48), bold: true, color: themeColorAccent })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: `Anatarajia kufunga ndoa tarehe `, font: "Georgia", size: getFontSize(20), color: "444444" }), new TextRun({ text: tareheNdoaText, font: "Georgia", bold: true, size: getFontSize(20), color: "111111" }), new TextRun({ text: ` ${mahaliNdoaText}. Hivyo ukiwa ndugu, jamaa na rafiki wa karibu wa familia hii unaombwa/mnaombwa kutoa mchango wako/wenu wa hali na mali kufanikisha shughuli hii muhimu. Tafadhali kabidhi mchango wako kwa `, font: "Georgia", size: getFontSize(20), color: "444444" }), new TextRun({ text: jinaAkaunti, font: "Georgia", bold: true, size: getFontSize(20), color: "111111" })] }),
            new Table({ alignment: AlignmentType.CENTER, width: { size: 80, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ shading: { fill: "FEFCF3" }, borders: { top: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 8, color: borderColor } }, margins: { top: getSpacing(200), bottom: getSpacing(200), left: getSpacing(200), right: getSpacing(200) }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(100) }, children: [new TextRun({ text: `${data.ainaYaMchango || "MPESA"} – ${data.nambaYaSimuMchango || "0754388813"}`, font: "Courier New", bold: true, size: getFontSize(22), color: themeColorPrimary }), ...(data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili ? [new TextRun({ text: `  au  ${data.ainaYaMchangoPili} – ${data.nambaYaSimuMchangoPili}`, font: "Courier New", bold: true, size: getFontSize(22), color: themeColorPrimary })] : [])] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Mwisho wa kutoa mchango ni ${mwishoMchangoText}`, font: "Georgia", size: getFontSize(18), bold: true, color: "444444" })] })] })] })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(400), after: getSpacing(300) }, children: [new TextRun({ text: `"Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana"`, font: "Georgia", bold: true, italics: true, size: getFontSize(18), color: themeColorPrimary })] }),
            ...(data.kamatiKuu.length > 0 ? [isLandscape ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(200) }, children: [new TextRun({ text: "KWA MAWASILIANO:  ", font: "Montserrat", size: getFontSize(16), bold: true, color: themeColorPrimary }), ...data.kamatiKuu.flatMap((m, index) => [new TextRun({ text: `${m.name || "Mhusika"}: `, font: "Georgia", bold: true, size: getFontSize(18), color: "444444" }), new TextRun({ text: m.phone || "---", font: "Courier New", bold: true, size: getFontSize(18), color: "111111" }), ...(index < data.kamatiKuu.length - 1 ? [new TextRun({ text: "   |   ", font: "Georgia", size: getFontSize(18), color: themeColorAccent })] : [])])] }) : new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "KWA MAWASILIANO:", font: "Montserrat", size: 16, bold: true, color: themeColorPrimary })] }), ...(!isLandscape ? data.kamatiKuu.map(m => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 50 }, children: [new TextRun({ text: `${m.name || "Mhusika"}: `, font: "Georgia", bold: true, size: 18, color: "444444" }), new TextRun({ text: m.phone || "---", font: "Courier New", bold: true, size: 18, color: "111111" })] })) : [])] : []),
          ],
        }],
      });
    }

    const wafadhiliText = data.wafadhili.trim() || "Familia ya Bw. & Bibi John Nchwali";
    const mahaliWafadhiliText = data.mahaliPaWafadhili.trim() ? `ya ${data.mahaliPaWafadhili}` : "ya Dodoma, Tanzania";
    const jinaKijanaText = data.jinaLaKijana.trim() || "Maharusi Wapendwa";
    const tareheNdoaText = data.tareheYaNdoa.trim() ? formatSwahiliDate(data.tareheYaNdoa) : "[Siku ya Sherehe]";
    const mahaliNdoaText = data.mahaliPaNdoa.trim() || "[Ukumbi na Mahali pa Ibada]";
    const mwishoMchangoText = data.mwishoWaKutoaMchango.trim() ? formatSwahiliDate(data.mwishoWaKutoaMchango) : "[Siku ya Mwisho]";
    const hasPaymentDetails = data.ainaYaMchango.trim() || data.nambaYaSimuMchango.trim() || data.jinaLaAkauntiYaMchango.trim();

    return new Document({
      background: { color: "FFFDF9" },
      sections: [{
        properties: { page: { size: { width: isLandscape ? 16838 : 11906, height: isLandscape ? 11906 : 16838, orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: isLandscape ? 960 : 1440, bottom: isLandscape ? 960 : 1440, left: isLandscape ? 960 : 1440, right: isLandscape ? 960 : 1440 }, borders: { pageBorderTop: { style: borderStyle, size: borderSize, color: borderColor, space: isLandscape ? 10 : 15 }, pageBorderBottom: { style: borderStyle, size: borderSize, color: borderColor, space: 15 }, pageBorderLeft: { style: borderStyle, size: borderSize, color: borderColor, space: 15 }, pageBorderRight: { style: borderStyle, size: borderSize, color: borderColor, space: 15 } } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(200), after: getSpacing(100) }, children: [new TextRun({ text: topOrnament, font: "Georgia", size: getFontSize(32), color: themeColorAccent })] }),
          ...(!isLandscape ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: "UMOJA NA UPENDO", font: "Montserrat", size: getFontSize(18), bold: true, color: subTitleColor })] })] : []),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(200) }, children: [new TextRun({ text: "MWALIKO WA HARUSI", font: "Playfair Display", size: getFontSize(40), bold: true, color: themeColorPrimary })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: style === "royal" ? "⚜ ════════════════════ ⚜" : "════════════════════", font: "Georgia", size: getFontSize(20), color: themeColorAccent })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: "NDUGU, JAMAA NA RAFIKI", font: "Montserrat", size: getFontSize(20), bold: true, color: "666666" })] }),
          ...(isLandscape ? [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: "Inayo heshima kubwa kukualika:", font: "Georgia", size: getFontSize(22), italics: true, color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: "Mhe./Prof./Dkt./Bw&Bibi/  ", font: "Playfair Display", size: getFontSize(24), italics: true, color: themeColorPrimary }), new TextRun({ text: guestName.trim() || "__________________________________", font: "Montserrat", size: getFontSize(24), bold: true, underline: {}, color: "1C1917" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(200) }, children: [new TextRun({ text: "Kwenye sherehe ya ndoa ya watoto wao wapendwa:", font: "Georgia", size: getFontSize(22), color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: jinaKijanaText, font: "Lucida Calligraphy", size: getFontSize(56), bold: true, color: themeColorAccent })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: "Mawifi na Maamuma wa:", font: "Georgia", size: getFontSize(22), italics: true, color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(100) }, children: [new TextRun({ text: wafadhiliText, font: "Playfair Display", size: getFontSize(32), bold: true, color: "38240A" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: mahaliWafadhiliText, font: "Georgia", size: getFontSize(20), italics: true, color: "666666" })] }),
          ] : [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: "Inayo heshima kubwa,", font: "Georgia", size: getFontSize(22), italics: true, color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(100) }, children: [new TextRun({ text: wafadhiliText, font: "Playfair Display", size: getFontSize(32), bold: true, color: "38240A" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: mahaliWafadhiliText, font: "Georgia", size: getFontSize(20), italics: true, color: "666666" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(150) }, children: [new TextRun({ text: "inayo heshima kubwa kukualika wewe mpendwa wetu:", font: "Georgia", size: getFontSize(22), color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(300) }, children: [new TextRun({ text: "Mhe./Prof./Dkt./Bw&Bibi/  ", font: "Playfair Display", size: getFontSize(24), italics: true, color: themeColorPrimary }), new TextRun({ text: guestName.trim() || "__________________________________", font: "Montserrat", size: getFontSize(24), bold: true, underline: {}, color: "1C1917" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(200) }, children: [new TextRun({ text: "Kwenye sherehe ya ndoa ya watoto wao wapendwa:", font: "Georgia", size: getFontSize(22), color: "444444" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: jinaKijanaText, font: "Lucida Calligraphy", size: getFontSize(56), bold: true, color: themeColorAccent })] }),
          ]),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(200) }, children: [new TextRun({ text: "Ibada na sherehe zitafanyika tarehe ", font: "Georgia", size: getFontSize(20), color: "444444" }), new TextRun({ text: tareheNdoaText, font: "Georgia", bold: true, size: getFontSize(20), color: "111111" }), new TextRun({ text: " katika ukumbi wa ", font: "Georgia", size: getFontSize(20), color: "444444" }), new TextRun({ text: mahaliNdoaText, font: "Georgia", bold: true, size: getFontSize(20), color: "111111" }), new TextRun({ text: ".", font: "Georgia", size: getFontSize(20), color: "444444" })] }),
          ...(hasPaymentDetails ? [new Table({ alignment: AlignmentType.CENTER, width: { size: 80, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ shading: { fill: "FEFCF3" }, borders: { top: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 8, color: borderColor } }, margins: { top: getSpacing(150), bottom: getSpacing(150), left: getSpacing(200), right: getSpacing(200) }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(80) }, children: [new TextRun({ text: "💰 MAELEZO YA MCHANGO", font: "Montserrat", bold: true, size: getFontSize(18), color: themeColorPrimary })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Michango itumwe kupitia: ${data.ainaYaMchango || "[Njia ya Malipo]"} kwenda Jina: ${data.jinaLaAkauntiYaMchango || "[Jina la Akaunti]"}`, font: "Georgia", size: getFontSize(18), color: "333333" }), ...(data.nambaYaSimuMchango ? [new TextRun({ text: `, Namba: ${data.nambaYaSimuMchango}`, font: "Georgia", bold: true, size: getFontSize(18), color: "111111" })] : []), ...(data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili ? [new TextRun({ text: ` au ${data.ainaYaMchangoPili} - ${data.nambaYaSimuMchangoPili}`, font: "Georgia", bold: true, size: getFontSize(18), color: "111111" })] : [])] }), ...(data.mwishoWaKutoaMchango ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(80) }, children: [new TextRun({ text: `Mwisho wa kupokea michango: ${mwishoMchangoText}`, font: "Georgia", size: getFontSize(16), italics: true, color: themeColorPrimary })] })] : [])] })] })] })] : []),
          ...(data.kamatiKuu.length > 0 ? [isLandscape ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(250), after: getSpacing(100) }, children: [new TextRun({ text: "📞 KAMATI YA MAWASILIANO:  ", font: "Montserrat", size: getFontSize(16), bold: true, color: "666666" }), ...data.kamatiKuu.flatMap((m, index) => [new TextRun({ text: `${m.name || "Mjumbe"}: `, font: "Georgia", bold: true, size: getFontSize(18), color: "444444" }), new TextRun({ text: m.phone || "---", font: "Georgia", bold: true, size: getFontSize(18), color: "111111" }), ...(index < data.kamatiKuu.length - 1 ? [new TextRun({ text: "   |   ", font: "Georgia", size: getFontSize(18), color: themeColorAccent })] : [])])] }) : new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(400), after: getSpacing(100) }, children: [new TextRun({ text: "📞 KAMATI YA MAWASILIANO", font: "Montserrat", size: getFontSize(16), bold: true, color: "666666" })] }), ...(!isLandscape ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: getSpacing(400) }, children: [new TextRun({ text: data.kamatiKuu.map(m => `${m.name || "Mjumbe"}: ${m.phone || "---"}`).join("  |  "), font: "Georgia", size: getFontSize(18), color: "444444" })] })] : [])] : []),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(250), after: getSpacing(150) }, children: [new TextRun({ text: `"Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana"`, font: "Georgia", bold: true, italics: true, size: getFontSize(18), color: themeColorPrimary })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: getSpacing(200) }, children: [new TextRun({ text: style === "royal" ? "*** KARIBUNI SANA MZEE NA MAMA KWA SHEREHE ***" : "*** KARIBUNI SANA SHANGAZI NA MJOMBA ***", font: "Georgia", bold: true, size: getFontSize(16), color: themeColorPrimary })] }),
        ],
      }],
    });
  };

  const handleExportDocxSingle = async (recipientName: string) => {
    const doc = createDocxDocument(recipientName);
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    const cleanName = recipientName.trim().replace(/\s+/g, "_");
    a.href = URL.createObjectURL(blob);
    a.download = data.cardType === "contribution" ? `Kadi_Mchango_Harusi_${cleanName}.docx` : `Mwaliko_Harusi_${cleanName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportDocx = async () => {
    if (excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim()) {
      try {
        setIsBatchExporting(true);
        for (let i = 0; i < excelData.length; i++) {
          const row = excelData[i];
          setBatchProgress({ current: i + 1, total: excelData.length, name: row.name });
          onUpdateData({ ...data, jinaLaMwalikwa: row.name });
          await new Promise(r => setTimeout(r, 350));
          await handleExportDocxSingle(row.name);
        }
      } catch (e) { console.error(e); }
      finally { onUpdateData({ ...data, jinaLaMwalikwa: "" }); setIsBatchExporting(false); setBatchProgress(null); }
    } else {
      try { setIsDocxExporting(true); await handleExportDocxSingle(data.jinaLaMwalikwa || "Mwaliko"); }
      catch (e) { console.error(e); }
      finally { setIsDocxExporting(false); }
    }
  };

  // ── WhatsApp share ─────────────────────────────────────────────────────────
  const handleWhatsAppShare = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWhatsappError("");
    if (!whatsappNumber.trim()) { setWhatsappError(tr('phoneRequired')); return; }
    if (!validatePhoneNumber(whatsappNumber)) { setWhatsappError(tr('phoneInvalid')); return; }
    const targetNumber = formatWhatsAppNumber(whatsappNumber);
    window.open(`https://api.whatsapp.com/send?phone=${targetNumber}&text=${generateEncodedMessage()}`, "_blank");
  };

  const smsSenderId = data.cardType === 'contribution' ? 'MICHANGO' : 'HARUSI';

  const handleSmsStyleChange = (style: SmsStyle) => {
    setSmsMessageStyle(style);
    setSmsMessageEdited(false);
  };

  const isBatchMode = excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim();
  const estimatedRemaining = sendingProgress
    ? formatTime(Math.max(0, (sendingProgress.total - sendingProgress.sent) * SECONDS_PER_MSG))
    : "";
  const pct = sendingProgress && sendingProgress.total > 0
    ? Math.round((sendingProgress.sent / sendingProgress.total) * 100)
    : 0;
  // Normalise backend field name: backend may send `errors` or `failures`
  const failures: FailedContact[] = sendingProgress?.failures ?? sendingProgress?.errors ?? [];

  return (
    <div className="bg-ui-card rounded-2xl border border-ui-border shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-serif font-bold text-ui-text">
          {tr('actionsTitle')}
        </h3>
        <p className="text-ui-muted text-xs mt-0.5">
          {isBatchMode
            ? tr('actionsHintBatch', { count: excelData.length })
            : tr('actionsHint')}
        </p>
      </div>

      {/* Primary Actions: PNG / PDF / DOCX */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleExportImage}
          disabled={isImageExporting || isBatchExporting}
          id="btn-export-png"
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-amber-600 bg-white hover:bg-amber-50 text-amber-800 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <Image className={`w-3.5 h-3.5 shrink-0 ${isImageExporting ? "animate-spin" : ""}`} />
          <span>{isImageExporting ? tr('exporting') : isBatchMode ? tr('batchImages', { count: excelData.length }) : tr('downloadPng')}</span>
        </button>

        <button
          onClick={handleExportPdf}
          disabled={isPdfExporting || isBatchExporting}
          id="btn-export-pdf"
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <FileDown className={`w-3.5 h-3.5 shrink-0 ${isPdfExporting ? "animate-spin" : ""}`} />
          <span>{isPdfExporting ? tr('exporting') : isBatchMode ? tr('batchPdfs', { count: excelData.length }) : tr('downloadPdf')}</span>
        </button>

        <button
          onClick={handleExportDocx}
          disabled={isDocxExporting || isBatchExporting}
          id="btn-export-docx"
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <FileText className={`w-3.5 h-3.5 shrink-0 ${isDocxExporting ? "animate-spin" : ""}`} />
          <span>{isDocxExporting ? tr('exporting') : isBatchMode ? tr('batchDocs', { count: excelData.length }) : tr('downloadDocx')}</span>
        </button>
      </div>

      {/* WhatsApp Manual Share */}
      <div className="border-t border-ui-border pt-5 space-y-3">
        <h4 className="text-xs font-semibold text-ui-text uppercase tracking-wider">
          {tr('whatsappSectionTitle')}
        </h4>

        <form onSubmit={handleWhatsAppShare} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="whatsapp-number-input"
                type="text"
                value={whatsappNumber}
                onChange={(e) => { setWhatsappNumber(e.target.value); if (whatsappError) setWhatsappError(""); }}
                placeholder={tr('whatsappPlaceholder')}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all pl-9"
              />
              <Send className="absolute left-3 top-3.5 w-3.5 h-3.5 text-ui-muted" />
            </div>

            <button
              type="submit"
              id="btn-whatsapp-send"
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 rotate-45" />
              {tr('sendWhatsapp')}
            </button>

            <div className="relative">
              <button
                type="button"
                id="btn-copy-message"
                onClick={handleCopyMessage}
                className={`flex items-center justify-center gap-1.5 font-semibold text-xs px-4 py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap border ${
                  copyToast
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-ui-bg border-ui-border text-ui-text hover:bg-ui-card"
                }`}
                title={tr('copyMessage')}
              >
                {copyToast ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copyToast ? tr('copied') : tr('copyMessage')}
              </button>
            </div>
          </div>

          {whatsappError && (
            <p className="text-red-500 text-xs flex items-center gap-1 mt-1 animate-toast-in">
              <AlertCircle className="w-3.5 h-3.5" />
              {whatsappError}
            </p>
          )}

          <p className="text-[10px] text-ui-muted leading-relaxed italic">
            {tr('whatsappHint')}
          </p>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════
          SMS DIRECT SEND SECTION
      ═══════════════════════════════════════════════════ */}
      <div className="border-t border-ui-border pt-5 space-y-3">
        <button
          type="button"
          onClick={() => setSmsComposerOpen(o => !o)}
          className="w-full flex items-center justify-between text-left group"
        >
          <h4 className="text-sm font-bold text-ui-text flex items-center gap-2 group-hover:text-amber-700 transition-colors">
            <span className="text-base">📩</span>
            {tr('smsTitle')}
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              {smsSenderId}
            </span>
          </h4>
          <ChevronDown className={`w-4 h-4 text-ui-muted transition-transform duration-200 ${smsComposerOpen ? "rotate-180" : ""}`} />
        </button>

        {smsComposerOpen && (() => {
          const bulkCount = excelData?.length ?? 0;
          const uniquePeople = excelData
            ? new Set(excelData.map(c => c.originalName || c.name)).size
            : 0;
          const costPerSms = smsMessageStyle === 'short' ? 16 : 32;

          const styleLabels = {
            short: language === 'en' ? { title: 'Short', sub: '~120 chars · 1 SMS' } : { title: 'Mfupi', sub: '~120 herufi · SMS 1' },
            detailed: language === 'en' ? { title: 'Detailed', sub: '~280 chars · 1-2 SMS' } : { title: 'Kamili', sub: '~280 herufi · SMS 1-2' },
          };

          const renderStylePicker = (value: SmsStyle, onChange: (v: SmsStyle) => void) => (
            <div className="grid grid-cols-2 gap-2">
              {(['short', 'detailed'] as const).map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange(style)}
                  className={`text-left p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    value === style ? 'border-amber-500 bg-amber-50' : 'border-ui-border bg-ui-card hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${value === style ? 'border-amber-500' : 'border-ui-muted'}`}>
                      {value === style && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>
                    <span className={`text-[11px] font-bold ${value === style ? 'text-amber-800' : 'text-ui-text'}`}>
                      {styleLabels[style].title}
                    </span>
                  </div>
                  <p className="text-[10px] text-ui-muted pl-5">{styleLabels[style].sub}</p>
                </button>
              ))}
            </div>
          );

          const handleResetMessage = () => {
            const template = buildSmsTemplate(smsMessageStyle, language, data.cardType ?? 'invitation', data);
            setSmsBulkMessage(template);
            setSmsSingleMessage(template);
            setSmsMessageEdited(false);
          };

          const resetLink = smsMessageEdited ? (
            <button
              type="button"
              onClick={handleResetMessage}
              className="text-[11px] text-amber-600 hover:text-amber-700 transition-colors cursor-pointer shrink-0"
            >
              ↺ {language === 'en' ? 'Reset to default' : 'Rejesha ujumbe wa awali'}
            </button>
          ) : null;

          const countLabel = uniquePeople !== bulkCount
            ? (language === 'en'
                ? `${uniquePeople} people (${bulkCount} phone numbers) loaded`
                : `Watu ${uniquePeople} (namba ${bulkCount} za simu) wameandikwa`)
            : tr('smsBulkCount', { count: bulkCount });

          return (
            <div className="space-y-4 pt-1">
              {renderStylePicker(smsMessageStyle, handleSmsStyleChange)}

              {/* ── BULK MODE (when contacts loaded) ── */}
              {hasBulkContacts ? (
                <div className="space-y-3">
                  <p className="text-xs text-ui-text bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    {countLabel}
                  </p>

                  <div className="space-y-1">
                    <textarea
                      rows={6}
                      value={smsBulkMessage}
                      onChange={e => { setSmsBulkMessage(e.target.value.slice(0, 480)); setSmsMessageEdited(true); }}
                      placeholder={tr('smsBulkMessagePlaceholder')}
                      className="w-full text-sm px-3.5 py-3 rounded-xl border border-stone-200 bg-white text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-y"
                    />
                    <div className="flex justify-between items-center flex-wrap gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] text-ui-muted italic">
                          {tr('smsNameHelper')} <code className="bg-ui-bg px-1 rounded text-[9px]">{"{{name}}"}</code>
                        </p>
                        {resetLink}
                      </div>
                      {(() => {
                        const s = getSmsStats(smsBulkMessage.length);
                        return <p className={`text-[10px] font-mono font-bold shrink-0 ${s.colorClass}`}>{s.icon} {s.label} — {s.smsLabel}</p>;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-ui-muted flex-wrap gap-1">
                    <span>{language === 'en' ? `TZS ${costPerSms}/SMS` : `TZS ${costPerSms} kwa SMS`}</span>
                    <span className="font-semibold text-amber-700">
                      ≈ TZS {(bulkCount * costPerSms).toLocaleString()} {language === 'en' ? 'total' : 'jumla'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBulkSMSSend}
                    disabled={smsBulkSending || !smsBulkMessage.trim()}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    {smsBulkSending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {tr('smsSending')}</>
                    ) : (
                      <><Send className="w-3.5 h-3.5 rotate-45" /> {tr('smsBulkSendBtn', { count: bulkCount })}</>
                    )}
                  </button>

                  {smsBulkResult?.done && (
                    <div className="rounded-xl border border-ui-border p-3 space-y-1 text-xs animate-toast-in">
                      <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {tr('smsSentCount', { count: smsBulkResult.sent })}
                      </p>
                      {smsBulkResult.failed > 0 && (
                        <p className="flex items-center gap-1.5 text-red-600 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          {tr('smsFailedCount', { count: smsBulkResult.failed })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ── SINGLE MODE (no contacts loaded) ── */
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={smsSinglePhone}
                      onChange={e => { setSmsSinglePhone(e.target.value); if (smsSinglePhoneError) setSmsSinglePhoneError(""); }}
                      placeholder={tr('smsPhonePlaceholder')}
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all pl-9"
                    />
                    <Smartphone className="absolute left-3 top-3.5 w-3.5 h-3.5 text-ui-muted" />
                  </div>
                  {smsSinglePhoneError && (
                    <p className="text-red-500 text-xs flex items-center gap-1 animate-toast-in">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {smsSinglePhoneError}
                    </p>
                  )}

                  <div className="space-y-1">
                    <textarea
                      rows={6}
                      value={smsSingleMessage}
                      onChange={e => { setSmsSingleMessage(e.target.value.slice(0, 480)); setSmsMessageEdited(true); }}
                      placeholder={tr('smsMessagePlaceholder')}
                      className="w-full text-sm px-3.5 py-3 rounded-xl border border-stone-200 bg-white text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-y"
                    />
                    <div className="flex justify-between items-center flex-wrap gap-1">
                      {resetLink}
                      {(() => {
                        const s = getSmsStats(smsSingleMessage.length);
                        return <p className={`text-[10px] font-mono font-bold ml-auto ${s.colorClass}`}>{s.icon} {s.label} — {s.smsLabel}</p>;
                      })()}
                    </div>
                  </div>

                  {/* Quick-load buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const tpl = buildSmsTemplate(smsMessageStyle, language, 'invitation', data);
                        setSmsSingleMessage(tpl);
                        setSmsMessageEdited(false);
                      }}
                      className="flex-1 text-[11px] font-semibold px-3 py-2 rounded-xl bg-ui-bg border border-ui-border text-ui-text hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer"
                    >
                      🌸 {language === 'en' ? 'Load Invitation' : 'Pakia Mwaliko'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tpl = buildSmsTemplate(smsMessageStyle, language, 'contribution', data);
                        setSmsSingleMessage(tpl);
                        setSmsMessageEdited(false);
                      }}
                      className="flex-1 text-[11px] font-semibold px-3 py-2 rounded-xl bg-ui-bg border border-ui-border text-ui-text hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer"
                    >
                      💰 {language === 'en' ? 'Load Contribution' : 'Pakia Mchango'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSingleSMSSend}
                    disabled={smsSingleSending || !smsSingleMessage.trim()}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    {smsSingleSending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {tr('smsSending')}</>
                    ) : (
                      <><Send className="w-3.5 h-3.5 rotate-45" /> {tr('smsSend')}</>
                    )}
                  </button>

                  {smsSingleResult === "success" && (
                    <p className="text-emerald-600 text-xs font-semibold flex items-center gap-1.5 animate-toast-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {tr('smsSentOk')}
                    </p>
                  )}
                  {smsSingleResult === "error" && (
                    <p className="text-red-500 text-xs flex items-center gap-1.5 animate-toast-in">
                      <XCircle className="w-3.5 h-3.5" />
                      {tr('smsSendFailed')}
                    </p>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-ui-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSmsDisclaimerOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-ui-bg hover:bg-ui-card transition-colors cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-ui-muted flex items-center gap-1.5">
                    <span>ℹ️</span>
                    {language === 'en' ? 'Short vs Detailed — what\'s the difference?' : 'Mfupi vs Kamili — tofauti ni nini?'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-ui-muted transition-transform duration-200 ${smsDisclaimerOpen ? 'rotate-180' : ''}`} />
                </button>
                {smsDisclaimerOpen && (
                  <div className="px-3 pb-3 pt-1 bg-ui-bg border-t border-ui-border space-y-2">
                    <div className="flex gap-2 pt-1">
                      <span className="text-xs shrink-0">📱</span>
                      <p className="text-[11px] text-ui-muted leading-relaxed">
                        {language === 'en'
                          ? 'Short (~120 chars): fits in 1 SMS, costs TZS 16. Best for bulk sends to many contacts.'
                          : 'Mfupi (~120 herufi): inafaa katika SMS 1, gharama TZS 16. Inafaa kwa kutuma kwa watu wengi.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs shrink-0">📝</span>
                      <p className="text-[11px] text-ui-muted leading-relaxed">
                        {language === 'en'
                          ? 'Detailed (~280 chars): may split into 2 SMS, costs TZS 32. Includes all names, venue, and contact details.'
                          : 'Kamili (~280 herufi): inaweza kugawanywa SMS 2, gharama TZS 32. Inajumuisha majina yote, mahali, na mawasiliano.'}
                      </p>
                    </div>
                    <p className="text-[10px] text-ui-muted italic">
                      {language === 'en'
                        ? '{{name}} is replaced automatically with each recipient\'s name in bulk sends.'
                        : '{{name}} inabadilishwa kwa jina la kila mtu wakati wa kutuma wingi.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ═══════════════════════════════════════════════════
          BULK WHATSAPP SEND SECTION
          (only visible when contacts are loaded)
      ═══════════════════════════════════════════════════ */}
      {hasBulkContacts && (
        <div className="border-t border-ui-border pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-ui-text flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                {tr('bulkSendTitle')}
              </h4>
              <p className="text-xs text-ui-muted mt-0.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {tr('bulkContactsLoaded', { count: excelData.length })}
              </p>
            </div>
          </div>

          {backendOffline && (
            <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs animate-toast-in">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">{tr('waOfflineTitle')}</p>
                <p className="text-amber-700 mt-0.5">{tr('waOfflineDesc')}</p>
              </div>
            </div>
          )}

          {!backendOffline && (
            <div className="rounded-xl border border-ui-border overflow-hidden">
              <div className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold ${
                waStatus === "connected"
                  ? "bg-emerald-50 border-b border-emerald-100 text-emerald-800"
                  : waStatus === "checking"
                  ? "bg-ui-bg border-b border-ui-border text-ui-muted"
                  : "bg-orange-50 border-b border-orange-100 text-orange-800"
              }`}>
                {waStatus === "connected" && (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    {tr('waConnected')}
                  </>
                )}
                {waStatus === "checking" && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-ui-muted" />
                    {tr('waChecking')}
                  </>
                )}
                {waStatus === "disconnected" && (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                    {tr('waDisconnected')}
                  </>
                )}
              </div>

              {waStatus === "disconnected" && (
                <div className="p-4 space-y-3 bg-ui-card">
                  <div className="flex gap-3 text-xs text-ui-text bg-ui-bg rounded-lg p-3 border border-ui-border">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{tr('waHowTo')}</p>
                      <p className="mt-1">{tr('waHowToDesc')}</p>
                    </div>
                  </div>
                  {qrCode ? (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-xl border-4 border-emerald-100 shadow-md" />
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-48 bg-ui-bg rounded-xl border-2 border-dashed border-ui-border">
                      <div className="text-center text-ui-muted text-xs">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <p>{tr('waitingQR')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            id="btn-bulk-send"
            onClick={handleBulkSend}
            disabled={waStatus !== "connected" || isSending || backendOffline}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {tr('bulkSendProgress')}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 rotate-45" />
                {tr('bulkSendButton', { count: excelData.length })}
              </>
            )}
          </button>

          {waStatus === "disconnected" && !backendOffline && (
            <p className="text-xs text-center text-orange-600 font-medium">
              {tr('connectFirst')}
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          DOWNLOAD BATCH EXPORT PROGRESS OVERLAY (for file exports)
      ═══════════════════════════════════════════════════ */}
      {isBatchExporting && batchProgress && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-amber-100 flex flex-col items-center text-center space-y-4 m-4 animate-fade-slide-in">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-600 animate-spin" />
              <Heart className="w-6 h-6 text-amber-600 fill-amber-500/10 absolute animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-800">
                {data.cardType === "contribution" ? tr('downloadBatchTitleContribution') : tr('downloadBatchTitle')}
              </h3>
              <p className="text-stone-500 text-xs mt-1">{tr('downloadBatchHint')}</p>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2.5 mt-2 overflow-hidden">
              <div className="bg-amber-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
            </div>
            <div className="flex justify-between w-full text-xs font-semibold text-stone-600 px-1">
              <span>{tr('guestProgress', { current: batchProgress.current, total: batchProgress.total })}</span>
              <span className="text-amber-700 font-bold">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-2.5 w-full">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{tr('guestBeingProcessed')}</p>
              <p className="text-sm font-serif font-black text-amber-900 truncate mt-0.5" title={batchProgress.name}>{batchProgress.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          WHATSAPP BULK SEND PROGRESS MODAL
      ═══════════════════════════════════════════════════ */}
      {showModal && sendingProgress && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-100 overflow-hidden animate-fade-slide-in">

            {/* Modal header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <MessageSquare className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">
                    {captureProgress ? tr('bulkPrepTitle') : tr('bulkSendingTitle')}
                  </h3>
                  <p className="text-emerald-100 text-[11px] mt-0.5">
                    {captureProgress
                      ? tr('bulkPrepDesc', { current: captureProgress.current, total: captureProgress.total })
                      : tr('bulkSendingDesc')
                    }
                  </p>
                </div>
              </div>
              {sendingProgress.done && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSendingProgress(null);
                    setSmsFallbackDismissed(false);
                    setSmsFallbackSending(false);
                    setSmsFallbackResult(null);
                  }}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  title="Funga"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* ── CAPTURE PHASE: show image prep progress ── */}
              {captureProgress ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-stone-600">
                      <span>{tr('preparingImages', { current: captureProgress.current, total: captureProgress.total })}</span>
                      <span className="text-amber-700 font-bold">
                        {captureProgress.total > 0 ? Math.round((captureProgress.current / captureProgress.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${captureProgress.total > 0 ? Math.round((captureProgress.current / captureProgress.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">{tr('placingName')}</p>
                    <p className="text-sm font-bold text-amber-900 mt-0.5 truncate">{captureProgress.name}</p>
                  </div>
                  <p className="text-[11px] text-stone-400 text-center">
                    {tr('pleaseWait')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-stone-600">
                      <span>{tr('sentProgress', { sent: sendingProgress.sent, total: sendingProgress.total })}</span>
                      <span className="text-emerald-700 font-bold">{pct}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${sendingProgress.done ? "bg-emerald-500" : "animate-progress-pulse"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Current contact */}
                  {!sendingProgress.done && sendingProgress.current && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{tr('sendingTo')}</p>
                      <p className="text-sm font-bold text-emerald-900 mt-0.5 truncate">{sendingProgress.current}...</p>
                    </div>
                  )}

                  {/* Counters row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-emerald-600 font-bold">{tr('successCount')}</p>
                        <p className="text-xl font-black text-emerald-700">{sendingProgress.success}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-red-50 rounded-xl p-3 border border-red-100">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-red-500 font-bold">{tr('failedCount')}</p>
                        <p className="text-xl font-black text-red-600">{sendingProgress.failed}</p>
                      </div>
                    </div>
                  </div>

                  {/* Time remaining */}
                  {!sendingProgress.done && (
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{tr('timeRemaining')} <strong className="text-stone-700">{estimatedRemaining}</strong></span>
                    </div>
                  )}

                  {/* ── COMPLETION SCREEN ── */}
                  {sendingProgress.done && (
                    <div className="space-y-4 border-t border-stone-100 pt-4">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <div>
                          <p className="font-bold text-stone-800 text-sm">{tr('bulkSendComplete')}</p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {tr('bulkSendSuccess', { count: sendingProgress.success })}
                            {sendingProgress.failed > 0 && `, ${tr('bulkSendFailed', { count: sendingProgress.failed })}`}.
                          </p>
                        </div>
                      </div>

                      {/* Failed contacts list */}
                      {failures.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            {tr('failedList', { count: failures.length })}
                          </p>
                          <div className="max-h-40 overflow-y-auto rounded-xl border border-red-100 divide-y divide-red-50">
                            {failures.map((f, i) => (
                              <div key={i} className="px-3 py-2 bg-red-50/50 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-stone-800">{f.name}</span>
                                  <span className="font-mono text-stone-500">{f.phone}</span>
                                </div>
                                <p className="text-red-500 mt-0.5">{f.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── SMS FALLBACK after WhatsApp failures ── */}
                      {failures.length > 0 && !smsFallbackDismissed && smsFallbackResult === null && (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 animate-toast-in">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl shrink-0">📱</span>
                            <div>
                              <p className="font-bold text-amber-900 text-sm flex items-center gap-2">
                              {tr('smsFallbackTitle')}
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                {smsSenderId}
                              </span>
                            </p>
                              <p className="text-xs text-amber-800 mt-1">
                                {tr('smsFallbackDesc', { count: failures.length })}
                              </p>
                            </div>
                          </div>
                          {!smsFallbackSending ? (
                            <div className="space-y-2">
                              {/* Fallback style picker */}
                              <div className="grid grid-cols-2 gap-1.5">
                                {(['short', 'detailed'] as const).map(style => (
                                  <button
                                    key={style}
                                    type="button"
                                    onClick={() => setSmsFallbackMessageStyle(style)}
                                    className={`text-left px-2.5 py-2 rounded-lg border-2 transition-all cursor-pointer ${
                                      smsFallbackMessageStyle === style
                                        ? 'border-amber-500 bg-amber-50'
                                        : 'border-stone-200 bg-white hover:border-amber-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                        smsFallbackMessageStyle === style ? 'border-amber-500' : 'border-stone-400'
                                      }`}>
                                        {smsFallbackMessageStyle === style && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                                      </div>
                                      <span className={`text-[10px] font-bold ${smsFallbackMessageStyle === style ? 'text-amber-800' : 'text-stone-700'}`}>
                                        {style === 'short'
                                          ? (language === 'en' ? 'Short' : 'Mfupi')
                                          : (language === 'en' ? 'Detailed' : 'Kamili')}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-stone-400 pl-4.5 mt-0.5">
                                      {style === 'short' ? '~120 chars · TZS 16' : '~280 chars · TZS 32'}
                                    </p>
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={handleSmsFallback}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5 rotate-45" />
                                  {tr('smsFallbackYes', { count: failures.length })}
                                </button>
                                <button
                                  onClick={() => setSmsFallbackDismissed(true)}
                                  className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 font-semibold text-xs transition-all cursor-pointer"
                                >
                                  {tr('smsFallbackNo')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-amber-800 font-semibold">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              {tr('smsFallbackSending', { count: failures.length })}
                            </div>
                          )}
                        </div>
                      )}
                      {smsFallbackResult !== null && (
                        <div className="rounded-xl border border-stone-200 p-3 space-y-1 text-xs animate-toast-in">
                          <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {tr('smsFallbackSentResult', { count: smsFallbackResult.sent })}
                          </p>
                          {smsFallbackResult.failed > 0 && (
                            <p className="flex items-center gap-1.5 text-red-600 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              {tr('smsFallbackFailedResult', { count: smsFallbackResult.failed })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        {failures.length > 0 && (
                          <button
                            onClick={downloadFailedContacts}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 font-semibold text-xs transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {tr('downloadFailed')}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowModal(false);
                            setSendingProgress(null);
                            setSmsFallbackDismissed(false);
                            setSmsFallbackSending(false);
                            setSmsFallbackResult(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {tr('finish')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
