"use client";

import React, { useState } from "react";
import { Image, FileDown, FileText, Send, AlertCircle } from "lucide-react";
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
  WidthType 
} from "docx";
import { InvitationData } from "../types";

interface ActionButtonsProps {
  data: InvitationData;
  cardRef: React.RefObject<HTMLDivElement | null>;
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

export default function ActionButtons({ data, cardRef }: ActionButtonsProps) {
  const [isImageExporting, setIsImageExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
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

  // Export card as PNG Image
  const handleExportImage = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    try {
      setIsImageExporting(true);
      
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

      // Wait for fonts to load completely in the browser context before drawing
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

  // Export card as Microsoft Word Document (.docx)
  const handleExportDocx = async () => {
    try {
      setIsDocxExporting(true);

      const wafadhiliText = data.wafadhili.trim() || "Familia ya Bw. & Bibi John Nchwali";
      const mahaliWafadhiliText = data.mahaliPaWafadhili.trim() ? `ya ${data.mahaliPaWafadhili}` : "ya Dodoma, Tanzania";
      const jinaKijanaText = data.jinaLaKijana.trim() || "Maharusi Wapendwa";
      const tareheNdoaText = data.tareheYaNdoa.trim() ? formatSwahiliDate(data.tareheYaNdoa) : "[Siku ya Sherehe]";
      const mahaliNdoaText = data.mahaliPaNdoa.trim() || "[Ukumbi na Mahali pa Ibada]";
      const mwishoMchangoText = data.mwishoWaKutoaMchango.trim() ? formatSwahiliDate(data.mwishoWaKutoaMchango) : "[Siku ya Mwisho]";
      const hasPaymentDetails = data.ainaYaMchango.trim() || data.nambaYaSimuMchango.trim() || data.jinaLaAkauntiYaMchango.trim();

      // Assemble OpenXML DOCX Document
      const doc = new Document({
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
                },
                margin: {
                  top: 1440,
                  bottom: 1440,
                  left: 1440,
                  right: 1440,
                },
                borders: {
                  pageBorderTop: { style: BorderStyle.DOUBLE, size: 24, color: "B58622", space: 15 },
                  pageBorderBottom: { style: BorderStyle.DOUBLE, size: 24, color: "B58622", space: 15 },
                  pageBorderLeft: { style: BorderStyle.DOUBLE, size: 24, color: "B58622", space: 15 },
                  pageBorderRight: { style: BorderStyle.DOUBLE, size: 24, color: "B58622", space: 15 },
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
                    text: "❦  ❤  ❦",
                    font: "Georgia",
                    size: 32, // 16pt
                    color: "B58622",
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
                    color: "936719",
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
                    color: "765117",
                  }),
                ],
              }),

              // Horizontal spacer
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: "════════════════════",
                    font: "Georgia",
                    size: 20,
                    color: "E6BD58",
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
                    color: "765117",
                  }),
                  new TextRun({
                    text: data.jinaLaMwalikwa.trim() || "__________________________________",
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

              // Couple names
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
                children: [
                  new TextRun({
                    text: jinaKijanaText,
                    font: "Georgia", // Script font fallback
                    size: 56,
                    bold: true,
                    color: "B58622",
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
                            top: { style: BorderStyle.SINGLE, size: 8, color: "E6BD58" },
                            bottom: { style: BorderStyle.SINGLE, size: 8, color: "E6BD58" },
                            left: { style: BorderStyle.SINGLE, size: 8, color: "E6BD58" },
                            right: { style: BorderStyle.SINGLE, size: 8, color: "E6BD58" },
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
                                  color: "765117",
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
                                    color: "765117",
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
                    text: "*** KARIBUNI SANA SHANGAZI NA MJOMBA ***",
                    font: "Georgia",
                    bold: true,
                    size: 16,
                    color: "765117",
                  }),
                ],
              })
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const downloadLink = document.createElement("a");
      const cleanFileName = (data.jinaLaKijana || "Mwaliko").trim().replace(/\s+/g, "_");
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `Mwaliko_Harusi_${cleanFileName}.docx`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error("DOCX generation failed:", error);
    } finally {
      setIsDocxExporting(false);
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

      {/* Primary Actions: Download PNG, PDF, and MS Word DOCX */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleExportImage}
          disabled={isImageExporting}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-amber-600 bg-white hover:bg-amber-50 text-amber-800 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <Image className={`w-3.5 h-3.5 flex-shrink-0 ${isImageExporting ? "animate-spin" : ""}`} />
          <span>{isImageExporting ? "Inapakua..." : "Picha (PNG)"}</span>
        </button>

        <button
          onClick={handleExportPdf}
          disabled={isPdfExporting}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <FileDown className={`w-3.5 h-3.5 flex-shrink-0 ${isPdfExporting ? "animate-spin" : ""}`} />
          <span>{isPdfExporting ? "Inapakua..." : "Nyaraka (PDF)"}</span>
        </button>

        <button
          onClick={handleExportDocx}
          disabled={isDocxExporting}
          className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer text-center"
        >
          <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isDocxExporting ? "animate-spin" : ""}`} />
          <span>{isDocxExporting ? "Inapakua..." : "Word (.docx)"}</span>
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
