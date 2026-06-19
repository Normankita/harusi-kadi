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

interface DeliveryReport {
  messageId: string;
  to: string;
  status: string;
  statusId: number;
  description: string;
}

const DELIVERY_CATEGORY: Record<number, 'delivered' | 'pending' | 'failed'> = {
  73: 'delivered',
  74: 'failed', 75: 'failed', 76: 'failed', 78: 'failed', 79: 'failed',
  53: 'failed', 54: 'failed', 55: 'failed', 56: 'failed', 57: 'failed', 58: 'failed',
  50: 'pending', 51: 'pending', 52: 'pending', 77: 'pending', 88: 'pending',
};
const deliveryCategory = (id: number): 'delivered' | 'pending' | 'failed' =>
  DELIVERY_CATEGORY[id] ?? 'pending';

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

// ─── Browser notification helper ────────────────────────────────────────────
// Fires a desktop notification only when the tab is hidden (user switched away).
function fireNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch {
    // iOS Safari and some sandboxed environments throw even when the API exists
  }
}

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

function buildReminderTemplate(lang: 'sw' | 'en', d: InvitationData): string {
  const couple = d.jinaLaKijana?.trim() || (lang === 'en' ? 'the couple' : 'maharusi');
  const method = d.ainaYaMchango?.trim() || 'MPESA';
  const number = d.nambaYaSimuMchango?.trim() || '';
  const method2 = d.ainaYaMchangoPili?.trim() || '';
  const number2 = d.nambaYaSimuMchangoPili?.trim() || '';
  const accountName = d.jinaLaAkauntiYaMchango?.trim() || '';
  const deadline = d.mwishoWaKutoaMchango ? formatSwahiliDateShort(d.mwishoWaKutoaMchango) : '';

  if (lang === 'en') {
    let msg = `Hi {{name}}, this is a gentle reminder to contribute to ${couple}'s upcoming wedding.`;
    if (number) { msg += ` Please send via ${method}: ${number}`; if (accountName) msg += ` (${accountName})`; msg += '.'; }
    if (method2 && number2) msg += ` Also via ${method2}: ${number2}.`;
    if (deadline) msg += ` Deadline: ${deadline}.`;
    return msg + ` Thank you for your support! 🙏`;
  }
  let msg = `Habari {{name}}, tunakukumbusha kutoa mchango wako kwa harusi ya ${couple}.`;
  if (number) { msg += ` Tuma kwa ${method}: ${number}`; if (accountName) msg += ` (${accountName})`; msg += '.'; }
  if (method2 && number2) msg += ` Pia kwa ${method2}: ${number2}.`;
  if (deadline) msg += ` Mwisho wa mchango: ${deadline}.`;
  return msg + ` Asante sana kwa msaada wako! 🙏`;
}

function getSmsStats(len: number): { icon: string; colorClass: string; label: string; smsLabel: string } {
  if (len <= 160) return { icon: '✅', colorClass: 'text-emerald-600', label: `${len}/160`, smsLabel: 'SMS 1' };
  if (len <= 306) return { icon: '⚠️', colorClass: 'text-amber-600', label: `${len}/320`, smsLabel: 'SMS 1-2' };
  return { icon: '❌', colorClass: 'text-red-600', label: `${len} chars`, smsLabel: 'SMS 2+' };
}

export default function ActionButtons({ data, cardRef, excelData, onUpdateData }: ActionButtonsProps) {
  const { language, tr } = useLanguage();
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);

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
  const cancelRef = useRef(false);
  const [isCancelled, setIsCancelled] = useState(false);

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

  // ── Delivery status state ──────────────────────────────────────────────────
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [deliveryReports, setDeliveryReports] = useState<DeliveryReport[]>([]);
  const [showDeliveryReports, setShowDeliveryReports] = useState(false);
  const [lowBalanceWarning, setLowBalanceWarning] = useState<{ balance: number; needed: number } | null>(null);
  const proceedDespiteLowBalance = useRef(false);

  // ── Reminder state ────────────────────────────────────────────────────────
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderMessageEdited, setReminderMessageEdited] = useState(false);
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderPhoneError, setReminderPhoneError] = useState('');
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderProgress, setReminderProgress] = useState<{ current: number; total: number } | null>(null);
  const [reminderResult, setReminderResult] = useState<{ sent: number; failed: number } | null>(null);

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

  const handleCancelBulkSend = () => {
    cancelRef.current = true;
    setIsCancelled(true);
    stopPolling();
    setIsSending(false);
    setCaptureProgress(null);
    setSendingProgress(prev => prev ? { ...prev, done: true, current: '' } : null);
    fireNotification(
      language === 'en' ? 'Send cancelled' : 'Kutuma kumesimamishwa',
      language === 'en'
        ? 'WhatsApp bulk send was stopped by user.'
        : 'Utumaji wa WhatsApp umesimamishwa na mtumiaji.'
    );
  };

  const closeModal = () => {
    setShowModal(false);
    setSendingProgress(null);
    setCaptureProgress(null);
    setSmsFallbackDismissed(false);
    setSmsFallbackSending(false);
    setSmsFallbackResult(null);
    setIsCancelled(false);
    cancelRef.current = false;
  };


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

    // Request notification permission now — must be inside a user-gesture handler
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission(); // fire-and-forget, don't block send
    }

    // Reset cancel state and open the modal immediately
    cancelRef.current = false;
    setIsCancelled(false);
    setShowModal(true);
    setCaptureProgress({ current: 0, total: normalizedContacts.length, name: "" });
    // Initialize sendingProgress now so the modal renders during capture phase
    setSendingProgress({ sent: 0, total: normalizedContacts.length, current: '', success: 0, failed: 0, done: false });

    // ── Step 1: Capture a personalised card for every contact ───────────────
    const originalName = data.jinaLaMwalikwa;
    const contactsWithImages: { name: string; phone: string; cardImageBase64: string }[] = [];

    try {
      if (typeof window !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }

      for (let i = 0; i < normalizedContacts.length; i++) {
        if (cancelRef.current) break;

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

        // JPEG at 0.8 quality is ~8-10x smaller than PNG — critical for large contact lists.
        // Strip the data URL prefix ("data:image/jpeg;base64,") — whatsapp-web.js calls atob()
        // directly on this string and atob() only accepts raw base64 without the prefix.
        const imageBase64 = canvas.toDataURL("image/jpeg", 0.8).split(',')[1] ?? '';

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
      fireNotification(
        language === 'en' ? 'Preparation failed ✗' : 'Kuandaa kumeshindwa ✗',
        language === 'en'
          ? 'Failed to prepare card images. Please try again.'
          : 'Imeshindwa kuandaa picha za kadi. Tafadhali jaribu tena.'
      );
      return;
    }

    // Restore original name after all captures
    onUpdateData(prev => ({ ...prev, jinaLaMwalikwa: originalName }));
    setCaptureProgress(null);

    // If user cancelled during image capture, bail out
    if (cancelRef.current) {
      setSendingProgress(prev => prev ? { ...prev, done: true, current: '' } : null);
      fireNotification(
        language === 'en' ? 'Send cancelled' : 'Kutuma kumesimamishwa',
        language === 'en'
          ? `WhatsApp send was stopped after preparing ${contactsWithImages.length} card(s).`
          : `Utumaji umesimamishwa baada ya kuandaa kadi ${contactsWithImages.length}.`
      );
      return;
    }

    fireNotification(
      language === 'en' ? 'Cards ready — sending now…' : 'Kadi ziko tayari — inatuma…',
      language === 'en'
        ? `${contactsWithImages.length} card(s) prepared. WhatsApp messages are now being sent.`
        : `Kadi ${contactsWithImages.length} zimeandaliwa. Ujumbe wa WhatsApp unatumwa sasa.`
    );

    // ── Step 2 & 3: Send in chunks to stay under the backend body-size limit ──
    // Each chunk is a separate /send-bulk call with its own sessionId.
    // 30 contacts × ~50KB JPEG ≈ 1.5MB per POST — well under typical limits.
    const CHUNK_SIZE = 30;
    const chunks: (typeof contactsWithImages)[] = [];
    for (let i = 0; i < contactsWithImages.length; i += CHUNK_SIZE) {
      chunks.push(contactsWithImages.slice(i, i + CHUNK_SIZE));
    }

    setIsSending(true);
    let successTotal = 0;
    let failedTotal = 0;
    const allFailures: FailedContact[] = [];

    const weddingInfo = {
      family: data.wafadhili || "Familia",
      groomName: data.jinaLaKijana || "Maharusi",
      brideName: data.jinaLaKijana || "",
      weddingDate: data.tareheYaNdoa || "",
      venue: data.mahaliPaNdoa || "",
    };

    for (let ci = 0; ci < chunks.length; ci++) {
      if (cancelRef.current) break;

      const chunk = chunks[ci];
      const chunkSessionId = `${sessionId}_${ci}`;
      sessionIdRef.current = chunkSessionId;

      setSendingProgress({
        sent: successTotal + failedTotal,
        total: contactsWithImages.length,
        current: chunk[0]?.name || "",
        success: successTotal,
        failed: failedTotal,
        done: false,
        failures: allFailures,
      });

      // POST this chunk
      try {
        const res = await fetch(`${BACKEND_URL}/send-bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json", 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' },
          body: JSON.stringify({
            sessionId: chunkSessionId,
            contacts: chunk,
            cardImageBase64: chunk[0]?.cardImageBase64 || "",
            weddingInfo,
          }),
        });

        if (!res.ok) {
          let errBody = "";
          try {
            const ct = res.headers.get("content-type") || "";
            errBody = ct.includes("json") ? JSON.stringify(await res.json()) : await res.text();
          } catch { errBody = "(hakuna maelezo)"; }
          throw new Error(`HTTP ${res.status}: ${errBody}`);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Imeshindwa kuunganisha na seva";
        console.error(`Chunk ${ci + 1}/${chunks.length} POST failed:`, reason);
        failedTotal += chunk.length;
        allFailures.push(...chunk.map(c => ({ name: c.name, phone: c.phone, reason })));
        // Continue to the next chunk rather than aborting everything
        continue;
      }

      // Poll this chunk until it reports done
      await new Promise<void>((resolve) => {
        const chunkInterval = setInterval(async () => {
          if (cancelRef.current) {
            clearInterval(chunkInterval);
            resolve();
            return;
          }
          try {
            const res = await fetch(`${BACKEND_URL}/progress/${chunkSessionId}`, {
              headers: { 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' },
              signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return;
            const json: ProgressPayload = await res.json();

            setSendingProgress({
              sent: successTotal + failedTotal + (json.sent ?? 0),
              total: contactsWithImages.length,
              current: json.current || "",
              success: successTotal + (json.success ?? 0),
              failed: failedTotal + (json.failed ?? 0),
              done: false,
              failures: [...allFailures, ...(json.failures ?? json.errors ?? [])],
            });

            if (json.done) {
              clearInterval(chunkInterval);
              successTotal += json.success ?? 0;
              failedTotal += json.failed ?? 0;
              allFailures.push(...(json.failures ?? json.errors ?? []));
              resolve();
            }
          } catch {
            // ignore transient poll errors
          }
        }, 2000);

        pollIntervalRef.current = chunkInterval;
      });
    }

    // All chunks finished (or cancelled)
    setIsSending(false);
    setSendingProgress({
      sent: successTotal + failedTotal,
      total: contactsWithImages.length,
      current: "",
      success: successTotal,
      failed: failedTotal,
      done: true,
      failures: allFailures,
    });

    if (!cancelRef.current) {
      fireNotification(
        failedTotal === 0
          ? (language === 'en' ? 'All messages sent ✓' : 'Ujumbe wote umetumwa ✓')
          : (language === 'en' ? 'Sending complete ⚠️' : 'Kutuma kumekamilika ⚠️'),
        language === 'en'
          ? `${successTotal} sent successfully${failedTotal > 0 ? `, ${failedTotal} failed` : ''}.`
          : `${successTotal} zimetumwa${failedTotal > 0 ? `, ${failedTotal} zimeshindwa` : ''}.`
      );
    }
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

  // Auto-fill reminder message when data/language changes (unless user has edited)
  useEffect(() => {
    if (reminderMessageEdited) return;
    setReminderMessage(buildReminderTemplate(language, data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, language]);

  // ── Send Reminder ─────────────────────────────────────────────────────────
  const handleSendReminder = async () => {
    if (!reminderMessage.trim()) return;
    setReminderResult(null);
    setReminderProgress(null);

    // Validate phone in single mode
    if (!hasBulkContacts) {
      if (!reminderPhone.trim()) {
        setReminderPhoneError(language === 'en' ? 'Phone number required' : 'Namba ya simu inahitajika');
        return;
      }
      const num = normalizePhone(reminderPhone);
      if (num.length < 11) {
        setReminderPhoneError(language === 'en' ? 'Invalid phone number' : 'Namba si sahihi');
        return;
      }
      setReminderPhoneError('');

      setReminderSending(true);
      if (reminderChannel === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(reminderMessage)}`, '_blank');
        setReminderResult({ sent: 1, failed: 0 });
      } else {
        try {
          const res = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: num, message: reminderMessage, cardType: data.cardType ?? 'invitation' }),
          });
          setReminderResult(res.ok ? { sent: 1, failed: 0 } : { sent: 0, failed: 1 });
        } catch {
          setReminderResult({ sent: 0, failed: 1 });
        }
      }
      setReminderSending(false);
      return;
    }

    // Bulk mode
    setReminderSending(true);
    const total = excelData!.length;

    if (reminderChannel === 'sms') {
      try {
        const contacts = excelData!.map(c => ({ name: c.originalName || c.name, phone: c.phone }));
        const res = await fetch('/api/sms/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts, message: reminderMessage, cardType: data.cardType ?? 'invitation' }),
        });
        const result = await res.json();
        setReminderResult({ sent: result.sent ?? 0, failed: result.failed ?? 0 });
      } catch {
        setReminderResult({ sent: 0, failed: total });
      }
      setReminderSending(false);
      return;
    }

    // WhatsApp bulk reminder — chunked, no card images, passes custom message
    const contacts = excelData!.map(c => ({
      name: c.originalName || c.name,
      phone: normalizePhone(c.phone),
      cardImageBase64: '',
    }));
    const CHUNK_SIZE = 30;
    const chunks: (typeof contacts)[] = [];
    for (let i = 0; i < contacts.length; i += CHUNK_SIZE) chunks.push(contacts.slice(i, i + CHUNK_SIZE));

    let successTotal = 0;
    let failedTotal = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      const chunkSessionId = `reminder_${Date.now()}_${ci}`;
      setReminderProgress({ current: successTotal + failedTotal, total });

      try {
        const res = await fetch(`${BACKEND_URL}/send-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' },
          body: JSON.stringify({
            sessionId: chunkSessionId,
            contacts: chunk,
            message: reminderMessage,
            weddingInfo: { family: data.wafadhili || 'Familia', groomName: data.jinaLaKijana || 'Maharusi' },
          }),
        });
        if (!res.ok) { failedTotal += chunk.length; continue; }

        await new Promise<void>((resolve) => {
          const iv = setInterval(async () => {
            try {
              const pr = await fetch(`${BACKEND_URL}/progress/${chunkSessionId}`, {
                headers: { 'x-api-key': process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '' },
                signal: AbortSignal.timeout(5000),
              });
              if (!pr.ok) return;
              const json: ProgressPayload = await pr.json();
              setReminderProgress({ current: successTotal + failedTotal + (json.sent ?? 0), total });
              if (json.done) {
                clearInterval(iv);
                successTotal += json.success ?? 0;
                failedTotal += json.failed ?? 0;
                resolve();
              }
            } catch { /* ignore */ }
          }, 2000);
        });
      } catch {
        failedTotal += chunk.length;
      }
    }

    setReminderProgress(null);
    setReminderResult({ sent: successTotal, failed: failedTotal });
    setReminderSending(false);
  };

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

  // ── Check SMS delivery reports ────────────────────────────────────────────
  const checkSmsDelivery = async () => {
    setCheckingDelivery(true);
    try {
      const sender = data.cardType === 'contribution' ? 'MICHANGO' : 'HARUSI';
      const res = await fetch(`/api/sms/reports?sender=${sender}&size=100`);
      const result = await res.json();
      if (result.success) {
        setDeliveryReports(result.reports);
        setShowDeliveryReports(true);
      }
    } catch (err) {
      console.error('Failed to check delivery:', err);
    } finally {
      setCheckingDelivery(false);
    }
  };

  // ── SMS bulk send ──────────────────────────────────────────────────────────
  const handleBulkSMSSend = async () => {
    if (!excelData || excelData.length === 0 || !smsBulkMessage.trim()) return;

    // Balance check — skip if user already confirmed low-balance warning
    if (!proceedDespiteLowBalance.current) {
      const estimatedCost = excelData.length * (smsBulkMessage.length > 160 ? 32 : 16);
      try {
        const res = await fetch('/api/sms/balance');
        const result = await res.json();
        if (result.success && typeof result.balance === 'number' && result.balance < estimatedCost) {
          setLowBalanceWarning({ balance: result.balance, needed: estimatedCost });
          return;
        }
      } catch { /* fail open — don't block sending */ }
    }
    proceedDespiteLowBalance.current = false;
    setLowBalanceWarning(null);

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
  const currentStep = captureProgress ? 1 : (!sendingProgress?.done && !isCancelled) ? 2 : 3;

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

                  {/* Low-balance warning — shown before send if balance is insufficient */}
                  {lowBalanceWarning && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2 text-xs animate-toast-in">
                      <p className="flex items-start gap-2 text-red-800 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                        {language === 'en'
                          ? `Warning: Your balance is TZS ${lowBalanceWarning.balance.toLocaleString()} but you need approx. TZS ${lowBalanceWarning.needed.toLocaleString()} to send these SMS. Some messages may not go through.`
                          : `Onyo: Salio lako ni TZS ${lowBalanceWarning.balance.toLocaleString()} lakini unahitaji takriban TZS ${lowBalanceWarning.needed.toLocaleString()} kutuma SMS hizi. Baadhi ya ujumbe huenda usitumwe.`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { proceedDespiteLowBalance.current = true; handleBulkSMSSend(); }}
                          className="flex-1 py-2 px-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          {language === 'en' ? 'Proceed Anyway' : 'Endelea Hata Hivyo'}
                        </button>
                        <a
                          href="https://app.nextsms.co.tz"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setLowBalanceWarning(null)}
                          className="flex-1 py-2 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] transition-all cursor-pointer text-center"
                        >
                          {language === 'en' ? 'Cancel — Add Balance' : 'Ghairi — Ongeza Salio'}
                        </a>
                      </div>
                    </div>
                  )}

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
                    <div className="rounded-xl border border-ui-border p-3 space-y-2 text-xs animate-toast-in">
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
                      <button
                        type="button"
                        onClick={checkSmsDelivery}
                        disabled={checkingDelivery}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 hover:text-amber-900 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {checkingDelivery ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔍'}
                        {language === 'en' ? 'Check Delivery Status' : 'Angalia Hali ya Kufikishwa'}
                      </button>
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
                    <div className="space-y-2 animate-toast-in">
                      <p className="text-emerald-600 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {tr('smsSentOk')}
                      </p>
                      <button
                        type="button"
                        onClick={checkSmsDelivery}
                        disabled={checkingDelivery}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 hover:text-amber-900 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {checkingDelivery ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔍'}
                        {language === 'en' ? 'Check Delivery Status' : 'Angalia Hali ya Kufikishwa'}
                      </button>
                    </div>
                  )}
                  {smsSingleResult === "error" && (
                    <p className="text-red-500 text-xs flex items-center gap-1.5 animate-toast-in">
                      <XCircle className="w-3.5 h-3.5" />
                      {tr('smsSendFailed')}
                    </p>
                  )}
                </div>
              )}

              {/* Delivery Reports Panel */}
              {showDeliveryReports && (() => {
                const delivered = deliveryReports.filter(r => deliveryCategory(r.statusId) === 'delivered');
                const pending   = deliveryReports.filter(r => deliveryCategory(r.statusId) === 'pending');
                const failed    = deliveryReports.filter(r => deliveryCategory(r.statusId) === 'failed');
                const hasInsufficientBalance = deliveryReports.some(r => r.statusId === 57);
                return (
                  <div className="rounded-xl border border-ui-border overflow-hidden animate-toast-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-ui-bg border-b border-ui-border">
                      <h5 className="text-xs font-bold text-ui-text">
                        {language === 'en' ? 'SMS Delivery Status' : 'Hali ya Kufikishwa SMS'}
                      </h5>
                      <button type="button" onClick={() => setShowDeliveryReports(false)} className="text-ui-muted hover:text-ui-text transition-colors cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* One-time retrieval note */}
                    <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-800 flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      {language === 'en'
                        ? 'Note: Reports can only be retrieved once — they won\'t appear again in future checks.'
                        : 'Kumbuka: Ripoti hizi zinaweza kuangaliwa mara moja tu — hazitaonekana tena.'}
                    </div>

                    {/* Insufficient balance warning */}
                    {hasInsufficientBalance && (
                      <div className="px-3 py-2.5 bg-red-50 border-b border-red-100 space-y-1.5">
                        <p className="text-xs text-red-800 font-semibold flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                          {language === 'en'
                            ? 'Some SMS were not sent due to insufficient balance. Please top up your NextSMS account.'
                            : 'Baadhi ya SMS hazikutumwa kwa sababu ya salio kuwa chini. Tafadhali ongeza salio kwenye akaunti yako ya NextSMS.'}
                        </p>
                        <a
                          href="https://app.nextsms.co.tz"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-5 text-[11px] text-red-600 underline font-semibold flex items-center gap-1"
                        >
                          {language === 'en' ? 'Open NextSMS Dashboard ↗' : 'Fungua NextSMS Dashboard ↗'}
                        </a>
                      </div>
                    )}

                    {/* Summary counts */}
                    <div className="grid grid-cols-3 divide-x divide-ui-border border-b border-ui-border text-center">
                      {[
                        { label: language === 'en' ? 'Delivered' : 'Imefika',  count: delivered.length, color: 'text-emerald-600' },
                        { label: language === 'en' ? 'Pending'   : 'Inasubiri', count: pending.length,   color: 'text-amber-600'   },
                        { label: language === 'en' ? 'Failed'    : 'Haikufika', count: failed.length,    color: 'text-red-600'     },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="py-2 px-1">
                          <p className="text-[10px] text-ui-muted">{label}</p>
                          <p className={`text-sm font-bold ${color}`}>{count}</p>
                        </div>
                      ))}
                    </div>

                    {/* Report list */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-ui-border">
                      {deliveryReports.length === 0 ? (
                        <p className="p-4 text-xs text-ui-muted text-center">
                          {language === 'en' ? 'No reports available yet.' : 'Hakuna ripoti zinazopatikana bado.'}
                        </p>
                      ) : deliveryReports.map((r, i) => {
                        const cat = deliveryCategory(r.statusId);
                        return (
                          <div key={`${r.messageId}-${i}`} className="flex items-center justify-between px-3 py-2 gap-2">
                            <span className="text-[11px] text-ui-muted font-mono shrink-0">{r.to}</span>
                            <span className={`text-[10px] font-semibold flex items-center gap-1 text-right ${
                              cat === 'delivered' ? 'text-emerald-600' : cat === 'failed' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {cat === 'delivered' ? '✅' : cat === 'failed' ? '❌' : '⏳'}
                              {r.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
          REMINDER SECTION
      ═══════════════════════════════════════════════════ */}
      <div className="border-t border-ui-border pt-5 space-y-3">
        <button
          type="button"
          onClick={() => { setReminderOpen(o => !o); setReminderResult(null); }}
          className="w-full flex items-center justify-between text-left group"
        >
          <h4 className="text-sm font-bold text-ui-text flex items-center gap-2 group-hover:text-amber-700 transition-colors">
            <span className="text-base">🔔</span>
            {language === 'en' ? 'Reminder' : 'Kikumbusha'}
            <span className="text-[10px] font-normal text-ui-muted">
              {language === 'en' ? '— contributions / event' : '— mchango / sherehe'}
            </span>
          </h4>
          <ChevronDown className={`w-4 h-4 text-ui-muted transition-transform duration-200 ${reminderOpen ? 'rotate-180' : ''}`} />
        </button>

        {reminderOpen && (
          <div className="space-y-4 pt-1">
            {/* Channel picker */}
            <div className="grid grid-cols-2 gap-2">
              {(['sms', 'whatsapp'] as const).map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => { setReminderChannel(ch); setReminderResult(null); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    reminderChannel === ch
                      ? ch === 'sms'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-ui-border bg-ui-card text-ui-muted hover:border-stone-300'
                  }`}
                >
                  {ch === 'sms' ? '📩 SMS' : '💬 WhatsApp'}
                </button>
              ))}
            </div>

            {/* WhatsApp bulk warning if disconnected */}
            {reminderChannel === 'whatsapp' && hasBulkContacts && waStatus !== 'connected' && (
              <div className="flex gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{language === 'en' ? 'WhatsApp is not connected. Connect first in the section below.' : 'WhatsApp haijaunganishwa. Unganisha kwanza katika sehemu iliyo chini.'}</span>
              </div>
            )}

            {/* Recipient info / phone input */}
            {hasBulkContacts ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-ui-bg border border-ui-border text-xs text-ui-muted">
                <Users className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>
                  {language === 'en'
                    ? `Sending to ${excelData!.length} contact${excelData!.length !== 1 ? 's' : ''} from your Excel list`
                    : `Itatumia kwa watu ${excelData!.length} kutoka kwenye orodha yako`}
                </span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={reminderPhone}
                  onChange={e => { setReminderPhone(e.target.value); setReminderPhoneError(''); setReminderResult(null); }}
                  placeholder={language === 'en' ? 'Phone number (e.g. 0754123456)' : 'Namba ya simu (mfano 0754123456)'}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all pl-9"
                />
                <Smartphone className="absolute left-3 top-3.5 w-3.5 h-3.5 text-ui-muted" />
                {reminderPhoneError && (
                  <p className="text-red-500 text-xs flex items-center gap-1 mt-1 animate-toast-in">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {reminderPhoneError}
                  </p>
                )}
              </div>
            )}

            {/* Message textarea */}
            <div className="space-y-1">
              <textarea
                rows={6}
                value={reminderMessage}
                onChange={e => { setReminderMessage(e.target.value.slice(0, 640)); setReminderMessageEdited(true); setReminderResult(null); }}
                placeholder={language === 'en' ? 'Type your reminder message…' : 'Andika ujumbe wa kikumbusha…'}
                className="w-full text-sm px-3.5 py-3 rounded-xl border border-stone-200 bg-white text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-y"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setReminderMessage(buildReminderTemplate(language, data)); setReminderMessageEdited(false); }}
                  className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  ↺ {language === 'en' ? 'Reset to template' : 'Rejesha mfano'}
                </button>
                <span className="text-[10px] text-ui-muted font-mono">{reminderMessage.length}/640</span>
              </div>
              <p className="text-[10px] text-ui-muted">
                {language === 'en'
                  ? '{{name}} is replaced with each recipient\'s name automatically.'
                  : '{{name}} inabadilishwa kiotomatiki na jina la mtu anayepokea.'}
              </p>
            </div>

            {/* Progress (WhatsApp bulk only) */}
            {reminderSending && reminderProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-ui-muted font-mono">
                  <span>{language === 'en' ? 'Sending…' : 'Inatuma…'}</span>
                  <span>{reminderProgress.current}/{reminderProgress.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-ui-bg overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(reminderProgress.current / reminderProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Result banner */}
            {reminderResult && (
              <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs animate-toast-in ${
                reminderResult.failed === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : reminderResult.sent === 0
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {reminderResult.failed === 0
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                <span>
                  {reminderResult.sent > 0 && (language === 'en' ? `${reminderResult.sent} sent successfully.` : `${reminderResult.sent} zimetumwa.`)}
                  {reminderResult.failed > 0 && ` ${language === 'en' ? `${reminderResult.failed} failed.` : `${reminderResult.failed} zimeshindwa.`}`}
                </span>
              </div>
            )}

            {/* Send button */}
            <button
              type="button"
              onClick={handleSendReminder}
              disabled={reminderSending || !reminderMessage.trim() || (reminderChannel === 'whatsapp' && hasBulkContacts && waStatus !== 'connected')}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                reminderChannel === 'sms'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white disabled:bg-stone-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-stone-300'
              }`}
            >
              {reminderSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {language === 'en' ? 'Sending…' : 'Inatuma…'}</>
              ) : (
                <>
                  <Send className="w-4 h-4 rotate-45" />
                  {hasBulkContacts
                    ? (language === 'en'
                        ? `Send Reminder to ${excelData!.length} contacts via ${reminderChannel === 'sms' ? 'SMS' : 'WhatsApp'}`
                        : `Tuma Kikumbusha kwa watu ${excelData!.length} via ${reminderChannel === 'sms' ? 'SMS' : 'WhatsApp'}`)
                    : (language === 'en'
                        ? `Send via ${reminderChannel === 'sms' ? 'SMS' : 'WhatsApp'}`
                        : `Tuma via ${reminderChannel === 'sms' ? 'SMS' : 'WhatsApp'}`)}
                </>
              )}
            </button>
          </div>
        )}
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
        <div className="fixed inset-0 bg-stone-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-slide-in">

            {/* ── Header with steps ── */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 pt-5 pb-5">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5 text-white min-w-0">
                  <MessageSquare className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm leading-tight">
                      {isCancelled
                        ? (language === 'en' ? 'Send cancelled' : 'Utumaji umesimamishwa')
                        : currentStep === 1
                          ? (language === 'en' ? 'Preparing cards…' : 'Kuandaa kadi…')
                          : currentStep === 2
                            ? (language === 'en' ? 'Sending messages…' : 'Kutuma ujumbe…')
                            : (language === 'en' ? 'Send complete' : 'Kutuma kumekamilika')}
                    </h3>
                    <p className="text-emerald-100 text-[11px] mt-0.5 truncate">
                      {currentStep === 1 && captureProgress
                        ? (language === 'en'
                          ? `${captureProgress.current} of ${captureProgress.total} cards ready`
                          : `Kadi ${captureProgress.current} kati ya ${captureProgress.total} zimeandaliwa`)
                        : currentStep === 2
                          ? (language === 'en'
                            ? `${sendingProgress.sent} of ${sendingProgress.total} sent`
                            : `${sendingProgress.sent} kati ya ${sendingProgress.total} zimetumwa`)
                          : isCancelled
                            ? (language === 'en' ? 'Process stopped by user' : 'Mchakato ulisimamishwa na mtumiaji')
                            : (language === 'en'
                              ? `${sendingProgress.success} sent · ${sendingProgress.failed} failed`
                              : `${sendingProgress.success} zimetumwa · ${sendingProgress.failed} zimeshindwa`)}
                    </p>
                  </div>
                </div>

                {/* Cancel / Close */}
                {!sendingProgress.done ? (
                  <button
                    onClick={handleCancelBulkSend}
                    className="flex items-center gap-1.5 shrink-0 bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Cancel' : 'Simama'}
                  </button>
                ) : (
                  <button
                    onClick={closeModal}
                    className="shrink-0 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Step indicators */}
              <div className="flex items-center">
                {/* Step 1 */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    currentStep > 1 ? 'bg-white border-white text-emerald-700' : 'border-white bg-white/20 text-white'
                  }`}>
                    {currentStep > 1
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                    {language === 'en' ? 'Prepare' : 'Kuandaa'}
                  </span>
                </div>

                {/* Connector 1→2 */}
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500 ${currentStep > 1 ? 'bg-white' : 'bg-white/30'}`} />

                {/* Step 2 */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    currentStep === 3 && !isCancelled ? 'bg-white border-white text-emerald-700'
                    : currentStep === 3 && isCancelled ? 'bg-orange-400/30 border-orange-300 text-orange-200'
                    : currentStep === 2 ? 'border-white bg-white/20 text-white'
                    : 'border-white/30 bg-transparent text-white/40'
                  }`}>
                    {currentStep === 3 && !isCancelled ? <CheckCircle2 className="w-4 h-4" />
                    : currentStep === 3 && isCancelled ? <X className="w-4 h-4" />
                    : currentStep === 2 ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <span className="text-xs font-bold">2</span>}
                  </div>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${
                    currentStep >= 2 ? (currentStep === 3 && isCancelled ? 'text-orange-200' : 'text-white') : 'text-white/40'
                  }`}>
                    {language === 'en' ? 'Send' : 'Tuma'}
                  </span>
                </div>

                {/* Connector 2→3 */}
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500 ${currentStep === 3 && !isCancelled ? 'bg-white' : 'bg-white/30'}`} />

                {/* Step 3 */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    currentStep === 3 && !isCancelled ? 'bg-white border-white text-emerald-700'
                    : currentStep === 3 && isCancelled ? 'bg-orange-400/30 border-orange-300 text-orange-200'
                    : 'border-white/30 bg-transparent text-white/40'
                  }`}>
                    {currentStep === 3 && !isCancelled ? <CheckCircle2 className="w-4 h-4" />
                    : currentStep === 3 && isCancelled ? <span className="text-sm font-bold">!</span>
                    : <span className="text-xs font-bold">3</span>}
                  </div>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${
                    currentStep === 3 ? (isCancelled ? 'text-orange-200' : 'text-white') : 'text-white/40'
                  }`}>
                    {currentStep === 3 && isCancelled
                      ? (language === 'en' ? 'Stopped' : 'Imesimama')
                      : (language === 'en' ? 'Done' : 'Imekamilika')}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="p-6 space-y-5">

              {/* ── CANCELLED notice ── */}
              {isCancelled && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200 animate-toast-in">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-800 text-sm">
                      {language === 'en' ? 'Send was cancelled' : 'Utumaji umesimamishwa'}
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {language === 'en'
                        ? `${sendingProgress.success} message(s) were sent before cancellation.`
                        : `Ujumbe ${sendingProgress.success} ulitumwa kabla ya kusimama.`}
                    </p>
                  </div>
                </div>
              )}

              {/* ── STEP 1: Capture phase ── */}
              {captureProgress && !isCancelled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-stone-600">
                      <span>
                        {language === 'en'
                          ? `Preparing image ${captureProgress.current} of ${captureProgress.total}`
                          : `Kuandaa picha ${captureProgress.current} kati ya ${captureProgress.total}`}
                      </span>
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
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                      {language === 'en' ? 'Placing name on card' : 'Kuweka jina kwenye kadi'}
                    </p>
                    <p className="text-sm font-bold text-amber-900 mt-0.5 truncate">
                      {captureProgress.name || '…'}
                    </p>
                  </div>
                  <p className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {language === 'en' ? 'Please keep this window open…' : 'Tafadhali usifunge dirisha hili…'}
                  </p>
                </div>
              )}

              {/* ── STEP 2: Sending phase ── */}
              {!captureProgress && !sendingProgress.done && !isCancelled && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-stone-600">
                      <span>
                        {language === 'en'
                          ? `Sending ${sendingProgress.sent} of ${sendingProgress.total}`
                          : `Kutuma ${sendingProgress.sent} kati ya ${sendingProgress.total}`}
                      </span>
                      <span className="text-emerald-700 font-bold">{pct}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full animate-progress-pulse transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {sendingProgress.current && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                        {language === 'en' ? 'Sending to' : 'Inatumia kwa'}
                      </p>
                      <p className="text-sm font-bold text-emerald-900 mt-0.5 truncate">{sendingProgress.current}…</p>
                    </div>
                  )}

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

                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{tr('timeRemaining')} <strong className="text-stone-700">{estimatedRemaining}</strong></span>
                  </div>
                </>
              )}

              {/* ── STEP 3: Complete / cancelled ── */}
              {sendingProgress.done && (
                <div className="space-y-4">
                  {!isCancelled && (
                    <>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-stone-800 text-sm">{tr('bulkSendComplete')}</p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {tr('bulkSendSuccess', { count: sendingProgress.success })}
                            {sendingProgress.failed > 0 && `, ${tr('bulkSendFailed', { count: sendingProgress.failed })}`}.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-[10px] text-emerald-600 font-bold">{tr('successCount')}</p>
                            <p className="text-lg font-black text-emerald-700">{sendingProgress.success}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-red-50 rounded-xl p-3 border border-red-100">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <div>
                            <p className="text-[10px] text-red-500 font-bold">{tr('failedCount')}</p>
                            <p className="text-lg font-black text-red-600">{sendingProgress.failed}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Failed contacts */}
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

                  {/* SMS fallback */}
                  {failures.length > 0 && !smsFallbackDismissed && smsFallbackResult === null && !isCancelled && (
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
                          <div className="grid grid-cols-2 gap-1.5">
                            {(['short', 'detailed'] as const).map(style => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setSmsFallbackMessageStyle(style)}
                                className={`text-left px-2.5 py-2 rounded-lg border-2 transition-all cursor-pointer ${
                                  smsFallbackMessageStyle === style ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white hover:border-amber-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${smsFallbackMessageStyle === style ? 'border-amber-500' : 'border-stone-400'}`}>
                                    {smsFallbackMessageStyle === style && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                                  </div>
                                  <span className={`text-[10px] font-bold ${smsFallbackMessageStyle === style ? 'text-amber-800' : 'text-stone-700'}`}>
                                    {style === 'short' ? (language === 'en' ? 'Short' : 'Mfupi') : (language === 'en' ? 'Detailed' : 'Kamili')}
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
                    <div className="rounded-xl border border-stone-200 p-3 space-y-2 text-xs animate-toast-in">
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
                      <button
                        type="button"
                        onClick={checkSmsDelivery}
                        disabled={checkingDelivery}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 hover:text-amber-900 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {checkingDelivery ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔍'}
                        {language === 'en' ? 'Check Delivery Status' : 'Angalia Hali ya Kufikishwa'}
                      </button>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-stone-100">
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
                      onClick={closeModal}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {tr('finish')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
