"use client";

import React, { useState } from "react";
import { Image, FileDown, FileText, Send, AlertCircle, Heart } from "lucide-react";
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
  PageOrientation
} from "docx";
import { InvitationData } from "../types";

interface ActionButtonsProps {
  data: InvitationData;
  cardRef: React.RefObject<HTMLDivElement | null>;
  excelData: { name: string; phone: string }[] | null;
  onUpdateData: (newData: InvitationData) => void;
}

// Swahili date formatting helper for exports
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

const formatSwahiliDateShort = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch (e) {
    return dateStr;
  }
};

export default function ActionButtons({ data, cardRef, excelData, onUpdateData }: ActionButtonsProps) {
  const [isImageExporting, setIsImageExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  
  // Batch states
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

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
        data.kamatiKuu.forEach(m => {
          if (m.name.trim() && m.phone.trim()) {
            msg += `- ${m.name}: ${m.phone}\n`;
          }
        });
        msg += `\n`;
      }

      msg += `“Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana”`;
      return encodeURIComponent(msg);
    }

    const wafadhili = data.wafadhili.trim() || "Kamati ya Waandaaji";
    const mahaliWafadhili = data.mahaliPaWafadhili.trim() ? ` ya ${data.mahaliPaWafadhili}` : "";
    const kijana = data.jinaLaKijana.trim() || "Maharusi wetu";
    const tarehe = data.tareheYaNdoa.trim() ? formatSwahiliDate(data.tareheYaNdoa) : "[Siku ya Sherehe]";
    const mahali = data.mahaliPaNdoa.trim() || "[Ukumbi wa Sherehe]";
    const mwalikwa = data.jinaLaMwalikwa.trim() || "Ndugu Mwalikwa";
    
    let msg = `Habari ${mwalikwa}, \n\n*YAH: MWALIKO WA HARUSI*\n\n`;
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

  // Helper to export a single PNG
  const handleExportImageSingle = async (recipientName: string) => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    // Wait for fonts to load completely in the browser context before drawing
    if (typeof window !== "undefined" && "fonts" in document) {
      await document.fonts.ready;
    }
    
    const canvas = await html2canvas(cardElement, {
      scale: 2.5, // Crisp HD rendering
      useCORS: true,
      backgroundColor: "#FFFDF9",
      logging: false,
      allowTaint: true,
    });

    const imageUri = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    const cleanFileName = recipientName.trim().replace(/\s+/g, "_");
    downloadLink.href = imageUri;
    downloadLink.download = data.cardType === "contribution"
      ? `Kadi_Mchango_Harusi_${cleanFileName}.png`
      : `Mwaliko_Harusi_${cleanFileName}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Export card as PNG Image (Single or Batch)
  const handleExportImage = async () => {
    if (excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim()) {
      // BATCH MODE
      try {
        setIsBatchExporting(true);
        for (let i = 0; i < excelData.length; i++) {
          const row = excelData[i];
          setBatchProgress({ current: i + 1, total: excelData.length, name: row.name });
          
          // Override name in layout
          onUpdateData({ ...data, jinaLaMwalikwa: row.name });
          
          // Wait for DOM to update and browser to render
          await new Promise(resolve => setTimeout(resolve, 350));
          
          await handleExportImageSingle(row.name);
        }
      } catch (error) {
        console.error("Batch image generation failed:", error);
      } finally {
        // Reset override
        onUpdateData({ ...data, jinaLaMwalikwa: "" });
        setIsBatchExporting(false);
        setBatchProgress(null);
      }
    } else {
      // SINGLE MODE
      try {
        setIsImageExporting(true);
        await handleExportImageSingle(data.jinaLaMwalikwa || "Mwaliko");
      } catch (error) {
        console.error("Image generation failed:", error);
      } finally {
        setIsImageExporting(false);
      }
    }
  };

  // Helper to export a single PDF
  const handleExportPdfSingle = async (recipientName: string) => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    if (typeof window !== "undefined" && "fonts" in document) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(cardElement, {
      scale: 2.5, // Crisp rendering
      useCORS: true,
      backgroundColor: "#FFFDF9",
      logging: false,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const isLandscape = data.mtindoWaMapambo === "gold-leaf-full";
    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
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
    
    const cleanFileName = recipientName.trim().replace(/\s+/g, "_");
    pdf.save(data.cardType === "contribution"
      ? `Kadi_Mchango_Harusi_${cleanFileName}.pdf`
      : `Mwaliko_Harusi_${cleanFileName}.pdf`
    );
  };

  // Export card as PDF Document (Single or Batch)
  const handleExportPdf = async () => {
    if (excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim()) {
      // BATCH MODE
      try {
        setIsBatchExporting(true);
        for (let i = 0; i < excelData.length; i++) {
          const row = excelData[i];
          setBatchProgress({ current: i + 1, total: excelData.length, name: row.name });
          
          // Override name
          onUpdateData({ ...data, jinaLaMwalikwa: row.name });
          
          // Wait for DOM to update and render
          await new Promise(resolve => setTimeout(resolve, 350));
          
          await handleExportPdfSingle(row.name);
        }
      } catch (error) {
        console.error("Batch PDF generation failed:", error);
      } finally {
        onUpdateData({ ...data, jinaLaMwalikwa: "" });
        setIsBatchExporting(false);
        setBatchProgress(null);
      }
    } else {
      // SINGLE MODE
      try {
        setIsPdfExporting(true);
        await handleExportPdfSingle(data.jinaLaMwalikwa || "Mwaliko");
      } catch (error) {
        console.error("PDF generation failed:", error);
      } finally {
        setIsPdfExporting(false);
      }
    }
  };

  // Helper to generate the docx document model with custom styling matching presets
  const createDocxDocument = (guestName: string) => {
    const style = data.mtindoWaMapambo || "classic";
    const isLandscape = style === "gold-leaf-full";
    
    // Default Gold Style
    let borderColor = "B58622";
    let borderStyle: any = BorderStyle.DOUBLE;
    let borderSize = 24;
    let themeColorPrimary = "765117"; 
    let themeColorAccent = "B58622";
    let topOrnament = "❦  ❤  ❦";
    let subTitleColor = "936719";
    
    if (style === "floral") {
      borderColor = "768A79"; // Sage Green
      borderStyle = BorderStyle.SINGLE;
      borderSize = 12;
      themeColorPrimary = "3C5A44"; // Botanical Dark Green
      themeColorAccent = "5F7D65"; // Sage Accent Green
      topOrnament = "🍃  🌸  🍃";
      subTitleColor = "5F7D65";
    } else if (style === "royal") {
      borderColor = "936719"; // Royal Gold
      borderStyle = BorderStyle.DOUBLE;
      borderSize = 36; // Thick borders
      themeColorPrimary = "624316"; 
      themeColorAccent = "936719";
      topOrnament = "⚜  ❤  ⚜"; // Royal Fleur-de-lis
      subTitleColor = "765117";
    } else if (style === "gold-leaf" || style === "gold-leaf-full") {
      borderColor = "B58622"; // Rich Gold
      borderStyle = BorderStyle.DOUBLE;
      borderSize = 24;
      themeColorPrimary = "451A03"; // Amber-950
      themeColorAccent = "D97706"; // Amber-600
      topOrnament = "🌿  ❤  🌿"; // Leafy ornament
      subTitleColor = "B45309"; // Amber-700
    }

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
        background: {
          color: "FFFDF9",
        },
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 11906,
                  height: 16838,
                  orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
                },
                margin: {
                  top: 1440,
                  bottom: 1440,
                  left: 1440,
                  right: 1440,
                },
                borders: {
                  pageBorderTop: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                  pageBorderBottom: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                  pageBorderLeft: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                  pageBorderRight: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                },
              },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 100 },
                children: [
                  new TextRun({
                    text: topOrnament,
                    font: "Georgia",
                    size: 32,
                    color: themeColorAccent,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: "MCHANGO WA HARUSI",
                    font: "Playfair Display",
                    size: 40,
                    bold: true,
                    color: themeColorPrimary,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: "════════════════════",
                    font: "Georgia",
                    size: 20,
                    color: themeColorAccent,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 150 },
                children: [
                  new TextRun({
                    text: `${wafadhiliText} ${mahaliWafadhiliText}`,
                    font: "Playfair Display",
                    size: 30,
                    bold: true,
                    color: "38240A",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 150 },
                children: [
                  new TextRun({
                    text: "Wanayo furaha kukutaarifu/kuwataarifu",
                    font: "Georgia",
                    size: 22,
                    italics: true,
                    color: "444444",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: "Mhe./Prof./Dkt./Mch./Bw&Bibi/Bw./Bibi/Dr./Miss",
                    font: "Montserrat",
                    size: 16,
                    bold: true,
                    color: "888888",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: guestName.trim() || "__________________________________",
                    font: "Montserrat",
                    size: 24,
                    bold: true,
                    underline: {},
                    color: "1C1917",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `Kuwa ${uhusianoText}`,
                    font: "Georgia",
                    size: 22,
                    italics: true,
                    color: "444444",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: jinaKijanaText,
                    font: "Playfair Display",
                    size: 48,
                    bold: true,
                    color: themeColorAccent,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: `Anatarajia kufunga ndoa tarehe `,
                    font: "Georgia",
                    size: 20,
                    color: "444444",
                  }),
                  new TextRun({
                    text: tareheNdoaText,
                    font: "Georgia",
                    bold: true,
                    size: 20,
                    color: "111111",
                  }),
                  new TextRun({
                    text: ` ${mahaliNdoaText}. Hivyo ukiwa ndugu, jamaa na rafiki wa karibu wa familia hii unaombwa/mnaombwa kutoa mchango wako/wenu wa hali na mali kufanikisha shughuli hii muhimu. Tafadhali kabidhi mchango wako kwa `,
                    font: "Georgia",
                    size: 20,
                    color: "444444",
                  }),
                  new TextRun({
                    text: jinaAkaunti,
                    font: "Georgia",
                    bold: true,
                    size: 20,
                    color: "111111",
                  }),
                ],
              }),
              new Table({
                alignment: AlignmentType.CENTER,
                width: {
                  size: 80,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: "FEFCF3" },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                          bottom: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                          left: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                          right: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                        },
                        margins: { top: 200, bottom: 200, left: 200, right: 200 },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 },
                            children: [
                              new TextRun({
                                text: `${data.ainaYaMchango || "MPESA"} – ${data.nambaYaSimuMchango || "0754388813"}`,
                                font: "Courier New",
                                bold: true,
                                size: 22,
                                color: themeColorPrimary,
                              }),
                              ...(data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili ? [
                                new TextRun({
                                  text: `  au  ${data.ainaYaMchangoPili} – ${data.nambaYaSimuMchangoPili}`,
                                  font: "Courier New",
                                  bold: true,
                                  size: 22,
                                  color: themeColorPrimary,
                                })
                              ] : []),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `Mwisho wa kutoa mchango ni ${mwishoMchangoText}`,
                                font: "Georgia",
                                size: 18,
                                bold: true,
                                color: "444444",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 300 },
                children: [
                  new TextRun({
                    text: `“Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana”`,
                    font: "Georgia",
                    bold: true,
                    italics: true,
                    size: 18,
                    color: themeColorPrimary,
                  }),
                ],
              }),
              ...(data.kamatiKuu.length > 0 ? [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 300, after: 100 },
                  children: [
                    new TextRun({
                      text: "KWA MAWASILIANO:",
                      font: "Montserrat",
                      size: 16,
                      bold: true,
                      color: themeColorPrimary,
                    }),
                  ],
                }),
                ...data.kamatiKuu.map((m) => (
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 50 },
                    children: [
                      new TextRun({
                        text: `${m.name || "Mhusika"}: `,
                        font: "Georgia",
                        bold: true,
                        size: 18,
                        color: "444444",
                      }),
                      new TextRun({
                        text: m.phone || "---",
                        font: "Courier New",
                        bold: true,
                        size: 18,
                        color: "111111",
                      }),
                    ],
                  })
                ))
              ] : []),
            ],
          },
        ],
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
      background: {
        color: "FFFDF9", // Matching Ivory card background color
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906, // A4 size width in dxa (8.27 in)
                height: 16838, // A4 size height in dxa (11.69 in)
                orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              },
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
              borders: {
                pageBorderTop: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                pageBorderBottom: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                pageBorderLeft: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
                pageBorderRight: { style: borderStyle, size: borderSize, color: borderColor, space: 15 },
              },
            },
          },
          children: [
            // Decorative header ornament
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 100 },
              children: [
                new TextRun({
                  text: topOrnament,
                  font: "Georgia",
                  size: 32, // 16pt
                  color: themeColorAccent,
                }),
              ],
            }),
            
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: "UMOJA NA UPENDO",
                  font: "Montserrat",
                  size: 18, // 9pt
                  bold: true,
                  color: subTitleColor,
                }),
              ],
            }),

            // Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: "MWALIKO WA HARUSI",
                  font: "Playfair Display",
                  size: 40, // 20pt
                  bold: true,
                  color: themeColorPrimary,
                }),
              ],
            }),

            // Horizontal spacer
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: style === "royal" ? "⚜ ════════════════════ ⚜" : "════════════════════",
                  font: "Georgia",
                  size: 20,
                  color: themeColorAccent,
                }),
              ],
            }),

            // Invitee salutation
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 150 },
              children: [
                new TextRun({
                  text: "NDUGU, JAMAA NA RAFIKI",
                  font: "Montserrat",
                  size: 20,
                  bold: true,
                  color: "666666",
                }),
              ],
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: "Inayo heshima kubwa,",
                  font: "Georgia",
                  size: 22,
                  italics: true,
                  color: "444444",
                }),
              ],
            }),

            // Host / Wafadhili
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: wafadhiliText,
                  font: "Playfair Display",
                  size: 32,
                  bold: true,
                  color: "38240A",
                }),
              ],
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: mahaliWafadhiliText,
                  font: "Georgia",
                  size: 20,
                  italics: true,
                  color: "666666",
                }),
              ],
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: "inayo heshima kubwa kukualika wewe mpendwa wetu:",
                  font: "Georgia",
                  size: 22,
                  color: "444444",
                }),
              ],
            }),

            // Dynamic Guest Name input
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: "Mhe./Prof./Dkt./Bw&Bibi/  ",
                  font: "Playfair Display",
                  size: 24,
                  italics: true,
                  color: themeColorPrimary,
                }),
                new TextRun({
                  text: guestName.trim() || "__________________________________",
                  font: "Montserrat",
                  size: 24,
                  bold: true,
                  underline: {},
                  color: "1C1917",
                }),
              ],
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: "Kwenye sherehe ya ndoa ya watoto wao wapendwa:",
                  font: "Georgia",
                  size: 22,
                  color: "444444",
                }),
              ],
            }),

            // Couple names (Uses calligraphic script fallback font)
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: jinaKijanaText,
                  font: "Lucida Calligraphy",
                  size: 56,
                  bold: true,
                  color: themeColorAccent,
                }),
              ],
            }),

            // Date
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 150 },
              children: [
                new TextRun({
                  text: `📅  TAREHE: ${tareheNdoaText}`,
                  font: "Montserrat",
                  size: 22,
                  bold: true,
                  color: "38240A",
                }),
              ],
            }),

            // Venue
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 500 },
              children: [
                new TextRun({
                  text: `📍  MAHALI: ${mahaliNdoaText}`,
                  font: "Montserrat",
                  size: 20,
                  bold: true,
                  color: "38240A",
                }),
              ],
            }),

            // Payment Box Table
            ...(hasPaymentDetails ? [
              new Table({
                alignment: AlignmentType.CENTER,
                width: {
                  size: 80,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: "FEFCF3" },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                          bottom: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                          left: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                          right: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                        },
                        margins: { top: 200, bottom: 200, left: 200, right: 200 },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 100 },
                            children: [
                              new TextRun({
                                text: "💰 MAELEZO YA MCHANGO",
                                font: "Montserrat",
                                bold: true,
                                size: 18,
                                color: themeColorPrimary,
                              }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: `Michango itumwe kupitia: ${data.ainaYaMchango || "[Njia ya Malipo]"} kwenda Jina: ${data.jinaLaAkauntiYaMchango || "[Jina la Akaunti]"}`,
                                font: "Georgia",
                                size: 18,
                                color: "333333",
                              }),
                              ...(data.nambaYaSimuMchango ? [
                                new TextRun({
                                  text: `, Namba: ${data.nambaYaSimuMchango}`,
                                  font: "Georgia",
                                  bold: true,
                                  size: 18,
                                  color: "111111",
                                })
                              ] : []),
                            ],
                          }),
                          ...(data.mwishoWaKutoaMchango ? [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              spacing: { before: 100 },
                              children: [
                                new TextRun({
                                  text: `Mwisho wa kupokea michango: ${mwishoMchangoText}`,
                                  font: "Georgia",
                                  size: 16,
                                  italics: true,
                                  color: themeColorPrimary,
                                }),
                              ],
                            })
                          ] : []),
                        ],
                      }),
                    ],
                  }),
                ],
              })
            ] : []),

            // Committee contacts list
            ...(data.kamatiKuu.length > 0 ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 100 },
                children: [
                  new TextRun({
                    text: "📞 KAMATI YA MAWASILIANO",
                    font: "Montserrat",
                    size: 16,
                    bold: true,
                    color: "666666",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: data.kamatiKuu
                      .map((m) => `${m.name || "Mjumbe"}: ${m.phone || "---"}`)
                      .join("  |  "),
                    font: "Georgia",
                    size: 18,
                    color: "444444",
                  }),
                ],
              }),
            ] : []),

            // Welcome message
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 300 },
              children: [
                new TextRun({
                  text: style === "royal" ? "*** KARIBUNI SANA MZEE NA MAMA KWA SHEREHE ***" : "*** KARIBUNI SANA SHANGAZI NA MJOMBA ***",
                  font: "Georgia",
                  bold: true,
                  size: 16,
                  color: themeColorPrimary,
                }),
              ],
            })
          ],
        },
      ],
    });
  };

  // Helper to export a single Word document
  const handleExportDocxSingle = async (recipientName: string) => {
    const doc = createDocxDocument(recipientName);
    const blob = await Packer.toBlob(doc);
    const downloadLink = document.createElement("a");
    const cleanFileName = recipientName.trim().replace(/\s+/g, "_");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = data.cardType === "contribution"
      ? `Kadi_Mchango_Harusi_${cleanFileName}.docx`
      : `Mwaliko_Harusi_${cleanFileName}.docx`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Export card as Microsoft Word Document (Single or Batch)
  const handleExportDocx = async () => {
    if (excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim()) {
      // BATCH MODE
      try {
        setIsBatchExporting(true);
        for (let i = 0; i < excelData.length; i++) {
          const row = excelData[i];
          setBatchProgress({ current: i + 1, total: excelData.length, name: row.name });
          
          // Override name
          onUpdateData({ ...data, jinaLaMwalikwa: row.name });
          
          // Wait for DOM to render
          await new Promise(resolve => setTimeout(resolve, 350));
          
          await handleExportDocxSingle(row.name);
        }
      } catch (error) {
        console.error("Batch DOCX generation failed:", error);
      } finally {
        onUpdateData({ ...data, jinaLaMwalikwa: "" });
        setIsBatchExporting(false);
        setBatchProgress(null);
      }
    } else {
      // SINGLE MODE
      try {
        setIsDocxExporting(true);
        await handleExportDocxSingle(data.jinaLaMwalikwa || "Mwaliko");
      } catch (error) {
        console.error("DOCX generation failed:", error);
      } finally {
        setIsDocxExporting(false);
      }
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

  const isBatchMode = excelData && excelData.length > 0 && !data.jinaLaMwalikwa.trim();

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-serif font-bold text-stone-800">
          Utoaji na Ushiriki (Actions)
        </h3>
        <p className="text-stone-500 text-xs mt-0.5">
          {isBatchMode 
            ? `Utapakua faili ${excelData.length} kwa pamoja (Batch Mode).` 
            : "Pakua kadi yako au ushiriki moja kwa moja na waalikwa."}
        </p>
      </div>

      {/* Primary Actions: Download PNG, PDF, and MS Word DOCX */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleExportImage}
          disabled={isImageExporting || isBatchExporting}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-amber-600 bg-white hover:bg-amber-50 text-amber-800 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <Image className={`w-3.5 h-3.5 flex-shrink-0 ${isImageExporting ? "animate-spin" : ""}`} />
          <span>
            {isImageExporting 
              ? "Inapakua..." 
              : isBatchMode 
                ? `Picha Zote (${excelData.length})` 
                : "Picha (PNG)"}
          </span>
        </button>

        <button
          onClick={handleExportPdf}
          disabled={isPdfExporting || isBatchExporting}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <FileDown className={`w-3.5 h-3.5 flex-shrink-0 ${isPdfExporting ? "animate-spin" : ""}`} />
          <span>
            {isPdfExporting 
              ? "Inapakua..." 
              : isBatchMode 
                ? `PDF Zote (${excelData.length})` 
                : "Nyaraka (PDF)"}
          </span>
        </button>

        <button
          onClick={handleExportDocx}
          disabled={isDocxExporting || isBatchExporting}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isDocxExporting ? "animate-spin" : ""}`} />
          <span>
            {isDocxExporting 
              ? "Inapakua..." 
              : isBatchMode 
                ? `Word Zote (${excelData.length})` 
                : "Word (.docx)"}
          </span>
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

      {/* Batch Export Progress Overlay */}
      {isBatchExporting && batchProgress && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-amber-100 flex flex-col items-center text-center space-y-4 m-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-600 animate-spin" />
              <Heart className="w-6 h-6 text-amber-600 fill-amber-500/10 absolute animate-pulse" />
            </div>
            
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-800">
                {data.cardType === "contribution" ? "Inaandaa Kadi za Mchango" : "Inaandaa Kadi za Harusi"}
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Tafadhali usifunge kivinjari chako wakati wa kupakua.
              </p>
            </div>

            <div className="w-full bg-stone-100 rounded-full h-2.5 mt-2 overflow-hidden">
              <div 
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>

            <div className="flex justify-between w-full text-xs font-semibold text-stone-600 px-1">
              <span>Mwalikwa wa {batchProgress.current} kati ya {batchProgress.total}</span>
              <span className="text-amber-700 font-bold">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-2.5 w-full">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Mwalikwa Anayesindikwa</p>
              <p className="text-sm font-serif font-black text-amber-900 truncate mt-0.5" title={batchProgress.name}>
                {batchProgress.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
