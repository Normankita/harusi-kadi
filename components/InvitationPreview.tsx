"use client";

import React from "react";
import { Heart, Calendar, MapPin, CreditCard, PhoneCall } from "lucide-react";
import { InvitationData } from "../types";

interface InvitationPreviewProps {
  data: InvitationData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

// Swahili date formatter utility
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
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

// SVG Corner Ornament for elegant premium frames
const CornerOrnament = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-12 h-12 md:w-16 md:h-16 text-amber-600/70 select-none ${className}`}
  >
    <path 
      d="M 6 6 L 50 6 M 6 6 L 6 50" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M 12 12 L 30 12 M 12 12 L 12 30" 
      stroke="currentColor" 
      strokeWidth="1" 
      strokeLinecap="round" 
      strokeDasharray="2 2"
    />
    <path 
      d="M 6 6 C 25 25, 25 25, 40 40" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <circle cx="40" cy="40" r="2" fill="currentColor" />
  </svg>
);

export default function InvitationPreview({ data, cardRef }: InvitationPreviewProps) {
  // Fallback calculations
  const wafadhiliText = data.wafadhili.trim() || "Familia ya Wafadhili (Waandaaji)";
  const mahaliWafadhiliText = data.mahaliPaWafadhili.trim() ? `ya ${data.mahaliPaWafadhili}` : "ya Dodoma, Tanzania";
  const jinaKijanaText = data.jinaLaKijana.trim() || "Maharusi Wapendwa";
  
  const tareheNdoaText = data.tareheYaNdoa.trim() 
    ? formatSwahiliDate(data.tareheYaNdoa) 
    : "[Siku ya Sherehe]";
    
  const mahaliNdoaText = data.mahaliPaNdoa.trim() || "[Ukumbi na Mahali pa Ibada]";
  
  const mwishoMchangoText = data.mwishoWaKutoaMchango.trim()
    ? formatSwahiliDate(data.mwishoWaKutoaMchango)
    : "[Siku ya Mwisho]";

  const hasPaymentDetails = data.ainaYaMchango.trim() || data.nambaYaSimuMchango.trim() || data.jinaLaAkauntiYaMchango.trim();

  return (
    <div className="w-full flex justify-center py-2">
      {/* Containerized Card with fixed-aspect-ratio scaling wrapper */}
      <div 
        ref={cardRef}
        id="wedding-card-capture"
        className="w-full max-w-[550px] relative bg-[#FFFDF9] text-stone-900 border-[12px] border-double border-amber-600 rounded-xl p-5 md:p-8 shadow-xl overflow-hidden font-sans select-none"
        style={{
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), inset 0 0 40px rgba(180, 134, 34, 0.05)"
        }}
      >
        {/* Corner Ornaments */}
        <CornerOrnament className="top-2 left-2" />
        <CornerOrnament className="top-2 right-2 rotate-90" />
        <CornerOrnament className="bottom-2 left-2 -rotate-90" />
        <CornerOrnament className="bottom-2 right-2 rotate-180" />

        {/* Inner Border Frame */}
        <div className="border border-amber-300/60 rounded p-4 md:p-6 flex flex-col justify-between items-center text-center min-h-[640px] relative">
          
          {/* Header Ornament */}
          <div className="mt-4 flex flex-col items-center space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500" />
              <Heart className="w-5 h-5 text-amber-600 fill-amber-500/10" />
              <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-700">
              Umoja na Upendo
            </span>
          </div>

          {/* Title */}
          <div className="my-3">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-amber-800 tracking-wider">
              MWALIKO WA HARUSI
            </h1>
            <div className="w-16 h-[2px] bg-amber-400 mx-auto mt-1" />
          </div>

          {/* Invitation Message Body */}
          <div className="space-y-4 my-2 px-2 max-w-[90%]">
            <p className="text-xs uppercase tracking-wider font-semibold text-stone-500">
              Ndugu, Jamaa na Rafiki
            </p>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-stone-600">
                Inayo heshima kubwa,
              </p>
              <h3 className="text-base md:text-lg font-serif font-bold text-amber-950 leading-snug">
                {wafadhiliText}
              </h3>
              <p className="text-xs md:text-sm text-stone-500 italic">
                {mahaliWafadhiliText}
              </p>
            </div>

            <p className="text-xs text-stone-600">
              inayo heshima kubwa kukualika wewe mpendwa wetu:
            </p>

            {/* Guest Name Line */}
            <div className="py-2.5 w-full">
              <p className="text-xs md:text-sm font-serif text-amber-800/80 font-bold border-b border-dashed border-amber-600/40 pb-1 italic max-w-xs mx-auto">
                Mhe./Prof./Dkt./Bw&Bibi/..................................
              </p>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Kwenye sherehe ya ndoa ya watoto wao wapendwa:
            </p>

            {/* Couple Names */}
            <div className="my-1.5 animate-fadeIn">
              <h2 className="text-3xl md:text-4xl font-script text-amber-700 py-1 font-normal">
                {jinaKijanaText}
              </h2>
            </div>

            {/* Ceremony Details */}
            <div className="space-y-2 pt-2 bg-stone-50/50 rounded-lg p-3 border border-amber-100/30">
              <div className="flex items-center justify-center gap-1.5 text-xs text-stone-700">
                <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="font-semibold">{tareheNdoaText}</span>
              </div>
              <div className="flex items-start justify-center gap-1.5 text-xs text-stone-700 max-w-xs mx-auto">
                <MapPin className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="font-medium text-stone-800">{mahaliNdoaText}</span>
              </div>
            </div>
          </div>

          {/* Contributions & RSVP Footer */}
          <div className="w-full mt-4 border-t border-amber-300/40 pt-4 space-y-3">
            
            {/* Payment instructions */}
            {hasPaymentDetails ? (
              <div className="text-[11px] text-stone-700 bg-amber-50/40 rounded p-2.5 border border-amber-200/30 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-1 text-amber-800 font-semibold uppercase tracking-wider mb-1">
                  <CreditCard className="w-3 h-3" />
                  <span>Maelezo ya Mchango</span>
                </div>
                <p className="leading-relaxed">
                  Michango itumwe kupitia:{" "}
                  <strong className="text-amber-950">
                    {data.ainaYaMchango || "[Njia ya Malipo]"}
                  </strong>{" "}
                  kwenda Jina:{" "}
                  <strong className="text-amber-950">
                    {data.jinaLaAkauntiYaMchango || "[Jina la Akaunti]"}
                  </strong>
                  {data.nambaYaSimuMchango && (
                    <>
                      , Namba:{" "}
                      <strong className="text-amber-950 font-mono tracking-wider">
                        {data.nambaYaSimuMchango}
                      </strong>
                    </>
                  )}
                </p>
                {data.mwishoWaKutoaMchango && (
                  <p className="text-[10px] text-amber-800 mt-1">
                    Mwisho wa kupokea michango: <span className="font-semibold">{mwishoMchangoText}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-stone-400 italic">
                Taarifa za mchango bado hazijawekwa. Jaza fomu ili zionekane hapa.
              </p>
            )}

            {/* Committee contacts */}
            {data.kamatiKuu.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                  <PhoneCall className="w-2.5 h-2.5 text-stone-400" />
                  <span>Kamati ya Mawasiliano</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 max-w-sm mx-auto text-[10px] text-stone-600">
                  {data.kamatiKuu.map((member) => (
                    <span key={member.id} className="whitespace-nowrap font-medium">
                      {member.name || "Mjumbe"}: <strong className="text-stone-800 font-mono">{member.phone || "---"}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Card ending message */}
            <p className="text-[9px] font-serif tracking-widest text-amber-700/80 uppercase font-bold pt-1">
              *** KARIBUNI SANA SHANGAZI NA MJOMBA ***
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
