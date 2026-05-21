"use client";

import React, { useState } from "react";
import { Image, FileDown, Send, Check, AlertCircle } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { InvitationData } from "../types";

interface ActionButtonsProps {
  data: InvitationData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

// Swahili date formatting helper for WhatsApp message
const formatSwahiliDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"];
    const months = [
      "Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", 
      "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

export default function ActionButtons({ data, cardRef }: ActionButtonsProps) {
  const [isImageExporting, setIsImageExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Format WhatsApp number to international standard (Tanzania 255)
  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    
    if (cleaned.startsWith("0")) {
      cleaned = "255" + cleaned.substring(1);
    }
    
    if (cleaned.length === 9 && !cleaned.startsWith("255")) {
      cleaned = "255" + cleaned;
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone: string) => {
    const cleaned = formatWhatsAppNumber(phone);
    // Tanzania numbers in international format have 12 digits (255XXXXXXXXX)
    return cleaned.startsWith("255") && cleaned.length === 12;
  };

  // Generate polite Swahili invite message
  const generateWhatsAppMessage = () => {
    const wafadhili = data.wafadhili.trim() || "Kamati ya Waandaaji";
    const mahaliWafadhili = data.mahaliPaWafadhili.trim() ? ` ya ${data.mahaliPaWafadhili}` : "";
    const kijana = data.jinaLaKijana.trim() || "Maharusi wetu";
    const tarehe = data.tareheYaNdoa.trim() ? formatSwahiliDate(data.tareheYaNdoa) : "[Siku ya Sherehe]";
    const mahali = data.mahaliPaNdoa.trim() || "[Ukumbi wa Sherehe]";
    
    let msg = `Habari Ndugu Mwalikwa, \n\n*YAH: MWALIKO WA HARUSI*\n\n`;
    msg += `Ndugu, jamaa na rafiki, tunayo furaha kubwa kukujulisha kuwa ${wafadhili}${mahaliWafadhili} inakualika wewe pamoja na familia yako katika sherehe ya ndoa ya kijana wao mpendwa *${kijana}*.\n\n`;
    msg += `📌 *Ibada na Sherehe itafanyika:*\n`;
    msg += `📅 *Tarehe:* ${tarehe}\n`;
    msg += `📍 *Mahali:* ${mahali}\n\n`;
    
    if (data.nambaYaSimuMchango.trim()) {
      msg += `💰 *Michango na Malipo ya Uthibitisho:*\n`;
      msg += `💳 *Njia ya Malipo:* ${data.ainaYaMchango || "M-PESA / BANK"}\n`;
      msg += `👤 *Jina la Akaunti:* ${data.jinaLaAkauntiYaMchango || "Mratibu"}\n`;
      msg += `🔢 *Namba ya Malipo:* ${data.nambaYaSimuMchango}\n`;
      if (data.mwishoWaKutoaMchango) {
        msg += `⏰ *Mwisho wa Kutoa Mchango:* ${formatSwahiliDate(data.mwishoWaKutoaMchango)}\n`;
      }
      msg += `\n`;
    }
    
    if (data.kamatiKuu.length > 0) {
      msg += `📞 *Mawasiliano ya Kamati Kuu:*\n`;
      data.kamatiKuu.forEach(m => {
        if (m.name.trim() && m.phone.trim()) {
          msg += `- ${m.name}: ${m.phone}\n`;
        }
      });
      msg += `\n`;
    }
    
    msg += `Tunathamini sana uwepo wako. Karibu sana tushirikiane katika kufanikisha siku hii adhimu! 🙌💍`;
    
    return encodeURIComponent(msg);
  };

  // Export card as PNG Image
  const handleExportImage = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    try {
      setIsImageExporting(true);
      
      // Momentarily disable shadows and borders that can look bad on capture if needed,
      // but html2canvas handle them fine at high scale.
      const canvas = await html2canvas(cardElement, {
        scale: 2.5, // Crisp HD rendering
        useCORS: true,
        backgroundColor: "#FFFDF9",
        logging: false,
        allowTaint: true,
      });

      const imageUri = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      const cleanFileName = (data.jinaLaKijana || "Mwaliko").trim().replace(/\s+/g, "_");
      downloadLink.href = imageUri;
      downloadLink.download = `Mwaliko_Harusi_${cleanFileName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error("Image generation failed:", error);
    } finally {
      setIsImageExporting(false);
    }
  };

  // Export card as PDF Document
  const handleExportPdf = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    try {
      setIsPdfExporting(true);

      const canvas = await html2canvas(cardElement, {
        scale: 2.5, // Crisp rendering
        useCORS: true,
        backgroundColor: "#FFFDF9",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const ratio = canvas.width / canvas.height;
      const margin = 15; // 15mm border spacing
      const contentWidth = pdfWidth - 2 * margin;
      const contentHeight = contentWidth / ratio;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      // Fit to A4 height constraint if necessary
      if (contentHeight > pdfHeight - 2 * margin) {
        finalHeight = pdfHeight - 2 * margin;
        finalWidth = finalHeight * ratio;
      }

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
      
      const cleanFileName = (data.jinaLaKijana || "Mwaliko").trim().replace(/\s+/g, "_");
      pdf.save(`Mwaliko_Harusi_${cleanFileName}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsPdfExporting(false);
    }
  };

  // Perform WhatsApp Share Redirect
  const handleWhatsAppShare = (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappError("");

    if (!whatsappNumber.trim()) {
      setWhatsappError("Tafadhali weka namba ya WhatsApp.");
      return;
    }

    if (!validatePhoneNumber(whatsappNumber)) {
      setWhatsappError("Namba ya simu si sahihi. Weka mfano: 0712345678");
      return;
    }

    const targetNumber = formatWhatsAppNumber(whatsappNumber);
    const textMsg = generateWhatsAppMessage();
    const url = `https://api.whatsapp.com/send?phone=${targetNumber}&text=${textMsg}`;
    
    window.open(url, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-serif font-bold text-stone-800">
          Utoaji na Ushiriki (Actions)
        </h3>
        <p className="text-stone-500 text-xs mt-0.5">
          Pakua kadi yako au ushiriki moja kwa moja na waalikwa.
        </p>
      </div>

      {/* Primary Actions: Download */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleExportImage}
          disabled={isImageExporting}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-600 bg-white hover:bg-amber-50 text-amber-800 font-semibold text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <Image className={`w-4 h-4 ${isImageExporting ? "animate-spin" : ""}`} />
          {isImageExporting ? "Inatengeneza Picha..." : "Pakua kama Picha (PNG)"}
        </button>

        <button
          onClick={handleExportPdf}
          disabled={isPdfExporting}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <FileDown className={`w-4 h-4 ${isPdfExporting ? "animate-spin" : ""}`} />
          {isPdfExporting ? "Inatengeneza PDF..." : "Pakua kama PDF"}
        </button>
      </div>

      {/* Secondary Actions: WhatsApp Share */}
      <div className="border-t border-stone-100 pt-5 space-y-3">
        <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
          Mwaliko wa Haraka kupitia WhatsApp
        </h4>

        <form onSubmit={handleWhatsAppShare} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  if (whatsappError) setWhatsappError("");
                }}
                placeholder="Namba ya mwalikwa (mfano: 0712345678)"
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all pl-9"
              />
              <Send className="absolute left-3 top-3.5 w-3.5 h-3.5 text-stone-400" />
            </div>
            
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 rotate-45" />
              Tuma Mwaliko WhatsApp
            </button>
          </div>

          {whatsappError && (
            <p className="text-red-500 text-xs flex items-center gap-1 mt-1 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5" />
              {whatsappError}
            </p>
          )}

          <p className="text-[10px] text-stone-400 leading-relaxed italic">
            * Kitufe hiki kitafungua mazungumzo ya WhatsApp na kutuma ujumbe uliotengenezwa tayari kwa Kiswahili na maelezo yote ya fomu hapo juu.
          </p>
        </form>
      </div>
    </div>
  );
}
