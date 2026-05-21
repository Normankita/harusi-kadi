"use client";

import React, { useState, useEffect, useRef } from "react";
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

// 1. Classic Corner Ornament (original)
const ClassicOrnament = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-16 h-16 text-amber-600/70 select-none ${className}`}
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

// 2. Floral Corner Ornament (vines/leaves)
const FloralOrnament = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-16 h-16 text-amber-600/70 select-none ${className}`}
  >
    <path 
      d="M 6 6 C 30 6, 70 12, 90 40 C 80 60, 60 80, 40 90" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <path d="M 25 15 C 30 8, 38 8, 42 12 C 38 20, 30 20, 25 15 Z" fill="currentColor" opacity="0.8" />
    <path d="M 50 25 C 58 20, 64 22, 67 28 C 62 34, 54 32, 50 25 Z" fill="currentColor" opacity="0.8" />
    <path d="M 15 25 C 8 30, 8 38, 12 42 C 20 38, 20 30, 15 25 Z" fill="currentColor" opacity="0.8" />
    <path d="M 25 50 C 20 58, 22 64, 28 67 C 34 62, 32 54, 25 50 Z" fill="currentColor" opacity="0.8" />
    <circle cx="6" cy="6" r="3.5" fill="currentColor" />
    <circle cx="90" cy="40" r="2.5" fill="currentColor" />
    <circle cx="40" cy="90" r="2.5" fill="currentColor" />
  </svg>
);

// Side Vine Ornament for margins (Floral style)
const SideVineOrnament = ({ isLeft }: { isLeft: boolean }) => (
  <div 
    className={`absolute top-[18%] bottom-[18%] flex flex-col justify-between items-center text-amber-600/30 pointer-events-none select-none ${
      isLeft ? "left-2" : "right-2"
    }`}
  >
    <svg viewBox="0 0 20 360" className="w-4 h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 10 0 L 10 360" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      {[30, 90, 150, 210, 270, 330].map((y) => (
        <React.Fragment key={y}>
          <path d={`M 10 ${y} C 16 ${y-5}, 19 ${y-5}, 19 ${y} C 16 ${y+5}, 13 ${y+5}, 10 ${y} Z`} fill="currentColor" />
          <path d={`M 10 ${y} C 4 ${y-5}, 1 ${y-5}, 1 ${y} C 4 ${y+5}, 7 ${y+5}, 10 ${y} Z`} fill="currentColor" />
        </React.Fragment>
      ))}
    </svg>
  </div>
);

// 3. Royal Corner Ornament (Baroque curls)
const RoyalOrnament = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-16 h-16 text-amber-600/70 select-none ${className}`}
  >
    <path 
      d="M 6 6 C 22 2, 40 10, 35 22 C 30 30, 18 26, 20 16 C 22 9, 32 10, 28 18" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M 6 6 C 2 22, 10 40, 22 35 C 30 30, 26 18, 16 20 C 9 22, 10 32, 18 28" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M 6 6 C 20 20, 38 38, 48 48" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <circle cx="48" cy="48" r="2.5" fill="currentColor" />
    <path d="M 2 6 L 6 2 M 10 6 L 6 10" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// Header/Footer Center Ornament (Royal style)
const HeaderDividerOrnament = ({ isTop }: { isTop: boolean }) => (
  <div className={`w-full flex justify-center text-amber-600/60 pointer-events-none select-none ${
    isTop ? "mb-1" : "mt-2"
  }`}>
    <svg viewBox="0 0 200 20" className="w-48 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M 10 10 C 50 10, 70 3, 100 10 C 130 3, 150 10, 190 10" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />
      <path 
        d="M 85 10 C 95 18, 105 18, 115 10 C 120 6, 125 10, 122 14 C 119 18, 112 15, 115 11" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />
      <path 
        d="M 115 10 C 105 2, 95 2, 85 10 C 80 14, 75 10, 78 6 C 81 2, 88 5, 85 9" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />
      <circle cx="100" cy="10" r="2" fill="currentColor" />
    </svg>
  </div>
);

// REUSABLE CARD INNER CONTENT
interface InvitationCardContentProps {
  data: InvitationData;
  isCapture?: boolean;
}

const InvitationCardContent = React.forwardRef<HTMLDivElement, InvitationCardContentProps>(
  ({ data, isCapture }, ref) => {
    const wafadhiliText = data.wafadhili.trim() || "Familia ya Bw. & Bibi John Nchwali";
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
    const style = data.mtindoWaMapambo || "classic";

    return (
      <div 
        ref={ref}
        id={isCapture ? "wedding-card-capture" : undefined}
        className="w-[550px] relative bg-[#FFFDF9] text-stone-900 border-4 border-amber-600 rounded-2xl p-1.5 overflow-hidden font-sans select-none"
        style={{
          boxShadow: isCapture ? undefined : "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1), inset 0 0 40px rgba(180, 134, 34, 0.03)"
        }}
      >
        {/* Double Border Gap Simulation */}
        <div className="border border-amber-600 rounded-xl p-3 relative">
          
          {/* Corner & Side Ornaments based on style */}
          {style === "classic" && (
            <>
              <ClassicOrnament className="top-2 left-2" />
              <ClassicOrnament className="top-2 right-2 rotate-90" />
              <ClassicOrnament className="bottom-2 left-2 -rotate-90" />
              <ClassicOrnament className="bottom-2 right-2 rotate-180" />
            </>
          )}
          {style === "floral" && (
            <>
              <FloralOrnament className="top-2 left-2" />
              <FloralOrnament className="top-2 right-2 rotate-90" />
              <FloralOrnament className="bottom-2 left-2 -rotate-90" />
              <FloralOrnament className="bottom-2 right-2 rotate-180" />
              <SideVineOrnament isLeft={true} />
              <SideVineOrnament isLeft={false} />
            </>
          )}
          {style === "royal" && (
            <>
              <RoyalOrnament className="top-2 left-2" />
              <RoyalOrnament className="top-2 right-2 rotate-90" />
              <RoyalOrnament className="bottom-2 left-2 -rotate-90" />
              <RoyalOrnament className="bottom-2 right-2 rotate-180" />
            </>
          )}

          {/* Inner Border Frame (Static padding p-8 instead of responsive md:p-8) */}
          <div className="border border-amber-300/50 rounded-lg p-8 flex flex-col justify-between items-center text-center min-h-[640px] relative">
            
            {/* Header Ornament */}
            <div className="mt-2 flex flex-col items-center space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500" />
                <Heart className="w-5 h-5 text-amber-600 fill-amber-500/10" />
                <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-700">
                Umoja na Upendo
              </span>
            </div>

            {/* Royal header divider */}
            {style === "royal" && <HeaderDividerOrnament isTop={true} />}

            {/* Title (Static text-2xl instead of md:text-2xl) */}
            <div className="my-2">
              <h1 className="text-2xl font-serif font-bold text-amber-800 tracking-wider">
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
                <p className="text-xs font-medium text-stone-600">
                  Inayo heshima kubwa,
                </p>
                <h3 className="text-lg font-serif font-bold text-amber-950 leading-snug">
                  {wafadhiliText}
                </h3>
                <p className="text-xs text-stone-500 italic">
                  {mahaliWafadhiliText}
                </p>
              </div>

              <p className="text-xs text-stone-600">
                inayo heshima kubwa kukualika wewe mpendwa wetu:
              </p>

              {/* Guest Name Line (Static text-sm instead of md:text-sm) */}
              <div className="py-2.5 w-full">
                <p className="text-sm font-serif text-amber-800/80 font-bold border-b border-dashed border-amber-600/40 pb-1 italic max-w-xs mx-auto">
                  Mhe./Prof./Dkt./Bw&Bibi/{" "}
                  <span className="text-stone-800 not-italic font-sans font-bold tracking-wide">
                    {data.jinaLaMwalikwa.trim() || ".................................."}
                  </span>
                </p>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Kwenye sherehe ya ndoa ya watoto wao wapendwa:
              </p>

              {/* Couple Names (Static text-4xl instead of md:text-4xl) */}
              <div className="my-1">
                <h2 className="text-4xl font-script text-amber-700 py-1 font-normal">
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

            {/* Royal footer divider */}
            {style === "royal" && <HeaderDividerOrnament isTop={false} />}

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
);

InvitationCardContent.displayName = "InvitationCardContent";

export default function InvitationPreview({ data, cardRef }: InvitationPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Responsive scaling logic for preview wrapper
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.clientWidth || 550;
        const targetWidth = parentWidth - 16;
        if (targetWidth < 550) {
          setScale(targetWidth / 550);
        } else {
          setScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex flex-col justify-center items-center overflow-hidden py-4 relative"
    >
      {/* 1. VISIBLE RESPONSIVE PREVIEW CARD */}
      <div 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          width: "550px",
          minWidth: "550px",
          marginBottom: scale < 1 ? `calc(550px * (${scale} - 1))` : "0px",
        }}
        className="transition-transform duration-200 ease-out"
      >
        <InvitationCardContent data={data} isCapture={false} />
      </div>

      {/* 2. HIDDEN OFF-SCREEN STATIC A4 CAPTURE TARGET (ALWAYS SCALE 1.0) */}
      <div 
        className="absolute top-0 left-[-9999px] pointer-events-none"
        aria-hidden="true"
      >
        <InvitationCardContent ref={cardRef} data={data} isCapture={true} />
      </div>
    </div>
  );
}
