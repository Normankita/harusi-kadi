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

// --- Background Watermark & Center Motif ---

const WatermarkPattern = () => (
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none z-0">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="card-floral-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* Delicate repeating botanical/floral shape */}
          <path d="M 40 10 C 42 20, 50 20, 40 30 C 30 20, 38 20, 40 10 Z" fill="currentColor" />
          <path d="M 40 50 C 42 60, 50 60, 40 70 C 30 60, 38 60, 40 50 Z" fill="currentColor" />
          <path d="M 10 40 C 20 42, 20 50, 30 40 C 20 30, 20 38, 10 40 Z" fill="currentColor" />
          <path d="M 50 40 C 60 42, 60 50, 70 40 C 60 30, 60 38, 50 40 Z" fill="currentColor" />
          {/* Fine network line connectors */}
          <path d="M 0 0 L 80 80 M 80 0 L 0 80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#card-floral-pattern)" className="text-amber-800" />
    </svg>
  </div>
);

const CenterMotif = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.035]">
    <svg viewBox="0 0 200 200" width="340" height="340" className="w-[340px] h-[340px] text-amber-700" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Delicate outer circular frame */}
      <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.8" />
      {[72, 64, 56].map((r, i) => (
        <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="0.5" opacity={0.6 - i * 0.1} />
      ))}
      {/* Interlocking Hearts */}
      <path 
        d="M 85 90 C 70 70, 45 75, 55 100 Q 85 130 85 130 Q 85 130 115 100 C 125 75, 100 70, 85 90 Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="currentColor"
        fillOpacity="0.04"
      />
      <path 
        d="M 115 90 C 100 70, 75 75, 85 100 Q 115 130 115 130 Q 115 130 145 100 C 155 75, 130 70, 115 90 Z" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.04"
      />
      {/* Decorative leaf scrolls around the hearts */}
      <path d="M 85 70 C 80 55, 100 50, 100 60 C 100 70, 90 70, 95 65" stroke="currentColor" strokeWidth="0.8" />
      <path d="M 115 70 C 120 55, 100 50, 100 60 C 100 70, 110 70, 105 65" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  </div>
);

// --- Asymmetrical Theme-based Ornaments ---

// 1. Classic Corners
const ClassicOrnamentLarge = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    width="96" 
    height="96"
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-24 h-24 text-amber-600/35 select-none pointer-events-none z-0 ${className}`}
  >
    <path d="M 6 6 L 94 6 M 6 6 L 6 94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M 12 12 L 80 12 M 12 12 L 12 80" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    <path d="M 16 16 L 16 70 M 16 16 L 70 16" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
    <path d="M 6 30 C 18 30, 30 18, 30 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 12 40 C 24 40, 40 24, 40 12" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    <path d="M 6 6 L 60 60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 38 38 L 44 32 L 50 38 L 44 44 Z" fill="currentColor" fillOpacity="0.8" />
    <path d="M 22 22 L 26 18 L 30 22 L 26 26 Z" fill="currentColor" fillOpacity="0.6" />
    <circle cx="6" cy="6" r="3.5" fill="currentColor" />
    <circle cx="94" cy="6" r="2" fill="currentColor" />
    <circle cx="6" cy="94" r="2" fill="currentColor" />
  </svg>
);

const ClassicOrnamentSmall = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 80 80" 
    width="56"
    height="56"
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-14 h-14 text-amber-600/20 select-none pointer-events-none z-0 ${className}`}
  >
    <path d="M 6 6 L 74 6 M 6 6 L 6 74" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 12 12 L 50 12 M 12 12 L 12 50" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
    <path d="M 6 6 L 35 35" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M 22 22 L 25 19 L 28 22 L 25 25 Z" fill="currentColor" fillOpacity="0.7" />
    <circle cx="6" cy="6" r="2.5" fill="currentColor" />
  </svg>
);

// 2. Floral Corners
const FloralOrnamentLarge = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 120 120" 
    width="110"
    height="110"
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-[110px] h-[110px] text-amber-600/35 select-none pointer-events-none z-0 ${className}`}
  >
    {/* Frame guide line */}
    <path d="M 6 6 L 110 6 M 6 6 L 6 110" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
    
    {/* Winding vines */}
    <path d="M 6 6 Q 35 8, 70 20 Q 95 32, 112 50" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 6 6 Q 8 35, 20 70 Q 32 95, 50 112" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    
    {/* Intricate peony blossom (approx center (56, 46)) */}
    <path d="M 40 40 C 35 30, 48 20, 58 28 C 68 18, 80 30, 72 40 C 82 48, 70 65, 55 58 C 42 62, 32 50, 40 40 Z" fill="currentColor" fillOpacity="0.45" />
    <path d="M 45 42 C 42 35, 52 28, 56 34 C 60 28, 70 35, 67 42 C 70 48, 62 55, 56 50 C 50 55, 42 48, 45 42 Z" fill="#FFFDF9" fillRule="evenodd" />
    <path d="M 45 42 C 42 35, 52 28, 56 34 C 60 28, 70 35, 67 42 C 70 48, 62 55, 56 50 C 50 55, 42 48, 45 42 Z" stroke="currentColor" strokeWidth="1" />
    <circle cx="56" cy="40" r="3.5" fill="currentColor" fillOpacity="0.75" />
    
    {/* Rosebud 1 */}
    <path d="M 22 22 C 16 16, 26 10, 28 18 C 30 10, 38 18, 30 26 C 28 28, 18 26, 22 22 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 22 22 L 14 14" stroke="currentColor" strokeWidth="1" />
    
    {/* Rosebud 2 */}
    <path d="M 85 85 C 80 78, 90 72, 92 80 C 94 72, 102 80, 94 88 C 92 90, 80 88, 85 85 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 85 85 L 77 77" stroke="currentColor" strokeWidth="1" />
    
    {/* Detailed Leaves */}
    <path d="M 70 20 C 80 15, 88 18, 92 25 C 85 30, 77 28, 70 20 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 70 20 L 86 23" stroke="currentColor" strokeWidth="0.8" />
    
    <path d="M 20 70 C 15 80, 18 88, 25 92 C 30 85, 28 77, 20 70 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 20 70 L 23 86" stroke="currentColor" strokeWidth="0.8" />

    <path d="M 12 12 C 15 5, 25 5, 28 12 C 22 18, 15 18, 12 12 Z" fill="currentColor" fillOpacity="0.7" />
    <path d="M 12 12 C 5 15, 5 25, 12 28 C 18 22, 18 15, 12 12 Z" fill="currentColor" fillOpacity="0.7" />
    
    <circle cx="6" cy="6" r="3.5" fill="currentColor" />
    <circle cx="112" cy="50" r="2" fill="currentColor" />
    <circle cx="50" cy="112" r="2" fill="currentColor" />
  </svg>
);

const FloralOrnamentSmall = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 80 80" 
    width="56"
    height="56"
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-14 h-14 text-amber-600/20 select-none pointer-events-none z-0 ${className}`}
  >
    <path d="M 6 6 L 70 6 M 6 6 L 6 70" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
    <path d="M 6 6 Q 30 8, 55 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M 6 6 Q 8 30, 22 55" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M 25 10 C 32 6, 38 8, 40 13 C 34 17, 28 15, 25 10 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 10 25 C 6 32, 8 38, 13 40 C 17 34, 15 28, 10 25 Z" fill="currentColor" fillOpacity="0.6" />
    <circle cx="16" cy="16" r="5" fill="currentColor" fillOpacity="0.65" />
    <circle cx="16" cy="16" r="1.5" fill="#FFFDF9" />
    <circle cx="6" cy="6" r="2.5" fill="currentColor" />
  </svg>
);

// Side Vine Ornament for margins (Floral style)
const SideVineOrnament = ({ isLeft }: { isLeft: boolean }) => (
  <div 
    className={`absolute top-[18%] bottom-[18%] flex flex-col justify-between items-center text-amber-600/25 pointer-events-none select-none z-0 ${
      isLeft ? "left-2.5" : "right-2.5"
    }`}
  >
    <svg viewBox="0 0 20 360" width="16" height="360" className="w-4 h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// 3. Royal Baroque Corners
const RoyalOrnamentLarge = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 120 120" 
    width="112"
    height="112"
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-28 h-28 text-amber-600/35 select-none pointer-events-none z-0 ${className}`}
  >
    <path d="M 6 6 C 25 3, 62 10, 52 35 C 44 47, 26 40, 30 25 C 33 15, 48 16, 42 28 C 39 34, 32 32, 34 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M 6 6 C 3 25, 10 62, 35 52 C 47 44, 40 26, 25 30 C 15 33, 16 48, 28 42 C 34 39, 32 32, 24 34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M 6 6 L 65 65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 65 65 C 75 75, 80 65, 75 58 C 70 52, 60 58, 62 68 C 64 74, 72 70, 68 64" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <path d="M 45 15 C 50 10, 56 12, 55 18 C 51 22, 44 20, 45 15 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 15 45 C 10 50, 12 56, 18 55 C 22 51, 20 44, 15 45 Z" fill="currentColor" fillOpacity="0.6" />
    <path d="M 32 32 C 38 26, 43 28, 41 34 C 37 38, 30 36, 32 32 Z" fill="currentColor" fillOpacity="0.75" />
    <circle cx="6" cy="6" r="3.5" fill="currentColor" />
    <circle cx="75" cy="58" r="2" fill="currentColor" />
  </svg>
);

const RoyalOrnamentSmall = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 80 80" 
    width="56"
    height="56"
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-14 h-14 text-amber-600/20 select-none pointer-events-none z-0 ${className}`}
  >
    <path d="M 6 6 C 18 4, 35 8, 30 20 C 25 28, 15 24, 18 15 C 20 9, 28 10, 25 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 6 6 C 4 18, 8 35, 20 30 C 28 25, 24 15, 15 18 C 9 20, 10 28, 16 25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 6 6 L 40 40" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <circle cx="6" cy="6" r="2.5" fill="currentColor" />
  </svg>
);

// Header/Footer Center Divider (Royal style)
const HeaderDividerOrnament = ({ isTop }: { isTop: boolean }) => (
  <div className={`w-full flex justify-center text-amber-600/50 pointer-events-none select-none z-10 ${
    isTop ? "mb-1" : "mt-2"
  }`}>
    <svg viewBox="0 0 200 20" width="192" height="20" className="w-48 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// --- Gold Leaf Theme Ornaments ---

const GoldLeafBackground = () => (
  <div className="absolute inset-0 opacity-[0.025] pointer-events-none select-none z-0">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="card-leaf-pattern" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 50 20 C 55 35, 65 35, 50 50 C 35 35, 45 35, 50 20 Z" fill="currentColor" />
          <path d="M 10 50 L 90 50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#card-leaf-pattern)" className="text-amber-850" />
    </svg>
  </div>
);

const GoldLeafBranchTopRight = () => (
  <svg 
    viewBox="0 0 250 250" 
    width="220" 
    height="220" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className="absolute top-0 right-0 text-amber-600/35 select-none pointer-events-none z-0"
  >
    <path d="M 250 0 C 180 50, 110 80, 50 90 C 20 95, 0 110, -20 130" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 200 20 C 160 60, 130 110, 110 160" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
    <path d="M 230 10 C 190 30, 160 40, 120 40" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />

    {/* Leaves */}
    <path d="M 160 55 C 150 35, 135 40, 140 50 C 145 60, 155 60, 160 55 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 120 70 C 110 50, 95 55, 100 65 C 105 75, 115 75, 120 70 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 80 82 C 70 65, 55 70, 60 80 C 65 90, 75 90, 80 82 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 40 90 C 30 75, 15 80, 20 90 C 25 100, 35 100, 40 90 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />

    <path d="M 215 15 C 200 -5, 185 0, 190 10 C 195 20, 205 20, 215 15 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 180 32 C 165 15, 150 20, 155 30 C 160 40, 170 40, 180 32 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />

    <path d="M 175 45 C 180 65, 195 60, 190 50 C 185 40, 180 40, 175 45 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 148 78 C 153 98, 168 93, 163 83 C 158 73, 153 73, 148 78 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 125 115 C 130 135, 145 130, 140 120 C 135 110, 130 110, 125 115 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 112 150 C 117 170, 132 165, 127 155 C 122 145, 117 145, 112 150 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const GoldLeafBranchBottomLeft = () => (
  <svg 
    viewBox="0 0 250 250" 
    width="220" 
    height="220" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className="absolute bottom-0 left-0 text-amber-600/35 select-none pointer-events-none z-0 rotate-180"
  >
    <path d="M 250 0 C 180 50, 110 80, 50 90 C 20 95, 0 110, -20 130" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 200 20 C 160 60, 130 110, 110 160" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
    <path d="M 230 10 C 190 30, 160 40, 120 40" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />

    {/* Leaves */}
    <path d="M 160 55 C 150 35, 135 40, 140 50 C 145 60, 155 60, 160 55 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 120 70 C 110 50, 95 55, 100 65 C 105 75, 115 75, 120 70 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 80 82 C 70 65, 55 70, 60 80 C 65 90, 75 90, 80 82 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 40 90 C 30 75, 15 80, 20 90 C 25 100, 35 100, 40 90 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />

    <path d="M 215 15 C 200 -5, 185 0, 190 10 C 195 20, 205 20, 215 15 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 180 32 C 165 15, 150 20, 155 30 C 160 40, 170 40, 180 32 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />

    <path d="M 175 45 C 180 65, 195 60, 190 50 C 185 40, 180 40, 175 45 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 148 78 C 153 98, 168 93, 163 83 C 158 73, 153 73, 148 78 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 125 115 C 130 135, 145 130, 140 120 C 135 110, 130 110, 125 115 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 112 150 C 117 170, 132 165, 127 155 C 122 145, 117 145, 112 150 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const GoldLeafBranchTopLeftSmall = () => (
  <svg 
    viewBox="0 0 250 250" 
    width="110" 
    height="110" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className="absolute top-0 left-0 text-amber-600/20 select-none pointer-events-none z-0 -rotate-90"
  >
    <path d="M 250 0 C 180 50, 110 80, 50 90 C 20 95, 0 110, -20 130" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 160 55 C 150 35, 135 40, 140 50 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 120 70 C 110 50, 95 55, 100 65 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const GoldLeafBranchBottomRightSmall = () => (
  <svg 
    viewBox="0 0 250 250" 
    width="110" 
    height="110" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className="absolute bottom-0 right-0 text-amber-600/20 select-none pointer-events-none z-0 rotate-90"
  >
    <path d="M 250 0 C 180 50, 110 80, 50 90 C 20 95, 0 110, -20 130" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 160 55 C 150 35, 135 40, 140 50 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 120 70 C 110 50, 95 55, 100 65 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

// --- Detailed Gold Leaf Landscape (Lalo) Ornaments ---

interface SweepingFrondClusterProps {
  className?: string;
  style?: React.CSSProperties;
}

const SweepingFrondCluster = ({ className, style }: SweepingFrondClusterProps) => (
  <svg 
    viewBox="0 0 220 260" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute w-2/5 h-3/5 select-none pointer-events-none z-0 stroke-[#d4af37] opacity-[0.28] ${className || ""}`}
    style={style}
  >
    {/* Frond 1: Large sweeping diagonal palm frond */}
    {/* Stem */}
    <path d="M 5 5 C 60 60, 120 130, 210 210" strokeWidth="1.2" strokeLinecap="round" />
    
    {/* Leaflets radiating from the stem */}
    {/* Left side leaflets */}
    <path d="M 20 20 Q 5 45, -10 65 Q 10 50, 30 31" strokeWidth="0.8" />
    <path d="M 40 40 Q 15 75, -5 105 Q 25 80, 52 52" strokeWidth="0.8" />
    <path d="M 60 60 Q 30 105, 5 145 Q 42 110, 74 74" strokeWidth="0.8" />
    <path d="M 80 80 Q 45 135, 15 185 Q 60 140, 95 95" strokeWidth="0.8" />
    <path d="M 100 100 Q 60 165, 30 220 Q 80 170, 117 117" strokeWidth="0.8" />
    <path d="M 120 120 Q 80 195, 50 255 Q 98 198, 138 138" strokeWidth="0.8" />
    <path d="M 140 140 Q 100 215, 80 270 Q 120 218, 158 158" strokeWidth="0.8" />
    
    {/* Right side leaflets */}
    <path d="M 20 20 Q 45 5, 65 -10 Q 50 10, 30 31" strokeWidth="0.8" />
    <path d="M 40 40 Q 75 15, 105 -5 Q 80 25, 52 52" strokeWidth="0.8" />
    <path d="M 60 60 Q 105 30, 145 5 Q 110 42, 74 74" strokeWidth="0.8" />
    <path d="M 80 80 Q 135 45, 185 15 Q 140 60, 95 95" strokeWidth="0.8" />
    <path d="M 100 100 Q 165 60, 220 30 Q 170 80, 117 117" strokeWidth="0.8" />
    <path d="M 120 120 Q 195 80, 255 50 Q 198 98, 138 138" strokeWidth="0.8" />
    <path d="M 140 140 Q 215 100, 270 80 Q 218 120, 158 158" strokeWidth="0.8" />

    {/* Frond 2: Tropical Fan Leaf in the corner */}
    {/* Stem */}
    <path d="M 0 30 Q 30 50, 60 70" strokeWidth="1" strokeLinecap="round" />
    {/* Fan leaf segments radiating from (60,70) */}
    <path d="M 60 70 Q 40 100, 15 130 Q 43 98, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 30 115, 0 160 Q 35 110, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 25 130, -10 190 Q 30 125, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 30 150, 0 220 Q 38 138, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 45 160, 25 240 Q 52 148, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 65 170, 60 255 Q 70 155, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 85 165, 100 245 Q 85 152, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 100 155, 135 225 Q 98 145, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 115 140, 165 200 Q 108 132, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 125 120, 185 165 Q 115 115, 60 70" strokeWidth="0.8" />
    <path d="M 60 70 Q 130 95, 200 125 Q 120 95, 60 70" strokeWidth="0.8" />
    
    {/* Frond 3: Smaller secondary frond layering behind */}
    {/* Stem */}
    <path d="M 30 0 Q 60 30, 100 60" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
    {/* Leaflets */}
    <path d="M 45 15 Q 35 35, 20 50 Q 38 32, 52 22" strokeWidth="0.6" opacity="0.7" />
    <path d="M 60 30 Q 50 55, 35 75 Q 52 50, 68 38" strokeWidth="0.6" opacity="0.7" />
    <path d="M 75 45 Q 65 75, 50 100 Q 68 70, 84 54" strokeWidth="0.6" opacity="0.7" />
    <path d="M 90 60 Q 80 95, 65 125 Q 82 88, 98 68" strokeWidth="0.6" opacity="0.7" />
  </svg>
);

const GoldLeafScreenshotBackground = () => {
  return (
    <div className="absolute inset-0 bg-[#FFFDF9] pointer-events-none select-none z-0">
      {/* 4 Distinct, Massive Corner SVG Elements */}
      <SweepingFrondCluster className="top-0 left-0" />
      <SweepingFrondCluster className="top-0 right-0" style={{ transform: "scaleX(-1)" }} />
      <SweepingFrondCluster className="bottom-0 left-0" style={{ transform: "scaleY(-1)" }} />
      <SweepingFrondCluster className="bottom-0 right-0" style={{ transform: "scale(-1, -1)" }} />
    </div>
  );
};

// --- Contribution Card Content Component ---

interface ContributionCardContentProps {
  data: InvitationData;
  isCapture?: boolean;
}

const ContributionCardContent = React.forwardRef<HTMLDivElement, ContributionCardContentProps>(
  ({ data, isCapture }, ref) => {
    const wafadhiliText = data.wafadhili.trim() || "Familia ya Bw. John Nchwali Joel na Mercy Nchwali";
    const mahaliWafadhiliText = data.mahaliPaWafadhili.trim() ? `wa ${data.mahaliPaWafadhili}` : "wa Ipagala -Dodoma";
    const jinaKijanaText = data.jinaLaKijana.trim() || "Bright Mujulizi Kimaro";
    const uhusianoText = data.uhusianoWaKijana?.trim() || "kijana wao mpendwa";
    
    // YYYY-MM-DD to DD/MM/YYYY formatting helper
    const formatSwahiliDateShort = (dateStr: string) => {
      if (!dateStr) return "";
      try {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      } catch (e) {
        return dateStr;
      }
    };
    
    const tareheNdoaText = data.tareheYaNdoa.trim() 
      ? formatSwahiliDateShort(data.tareheYaNdoa) 
      : "12/09/2026";
      
    const mahaliNdoaText = data.mahaliPaNdoa.trim() || "mjini Dodoma";
    
    const mwishoMchangoText = data.mwishoWaKutoaMchango.trim()
      ? formatSwahiliDateShort(data.mwishoWaKutoaMchango)
      : "30/08/2026";

    const style = data.mtindoWaMapambo || "gold-leaf";

    // 1. Strict Landscape Card Layout (Luxury Gold Leaf Lalo)
    if (style === "gold-leaf-full") {
      const cardEl = (
        <div 
          ref={ref}
          id={isCapture ? "wedding-card-capture" : undefined}
          className="relative w-[900px] h-[650px] shrink-0 overflow-hidden flex justify-center items-center shadow-2xl rounded-xl font-sans select-none text-stone-900"
        >
          {/* Layer 2: Background Image Element (The Bulletproof Fix) */}
          <img src="/gold-leaves-bg.jpg" alt="background" className="absolute w-[650px] h-[900px] -rotate-90 object-cover z-0 opacity-90" />

          {/* Layer 3: Inner Content Card */}
          <div className="relative z-10 w-[85%] h-full mx-auto flex flex-col justify-center items-center text-center bg-transparent py-8">
            
            {/* Header Title */}
            <div className="mt-1">
              <h1 className="whitespace-nowrap text-3xl font-serif font-bold not-italic mb-3 text-[#8b5a2b] text-center">
                Mchango wa Harusi
              </h1>
            </div>

            {/* Continuous Typography Flow */}
            <div className="flex-1 flex flex-col justify-center items-center w-full max-w-[88%] space-y-1.5 mt-1 mx-auto">
              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center font-bold">
                {wafadhiliText} {mahaliWafadhiliText}
              </p>
              
              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center">
                Wanayo furaha kukutaarifu/kuwataarifu
              </p>
              
              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center">
                Mhe./Prof./Dkt./Mch./Bw&Bibi/Bw./Bibi/Dr./Miss
              </p>

              {/* Guest name line (commas if empty) */}
              <div className="w-full text-center py-0.5">
                <div className="font-serif font-bold italic text-amber-955 text-base md:text-lg leading-relaxed text-center">
                  {data.jinaLaMwalikwa.trim() || ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"}
                </div>
              </div>

              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center">
                Kuwa {uhusianoText}
              </p>

              <h2 className="text-3xl md:text-4xl font-serif font-bold not-italic text-[#8b5a2b] my-2 text-center">
                {jinaKijanaText}
              </h2>

              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center max-w-[95%]">
                Anatarajia kufunga ndoa tarahe <span className="font-bold not-italic">{tareheNdoaText}</span> {mahaliNdoaText}. Hivyo ukiwa ndugu, jamaa na rafiki wa karibu wa familia hii unaombwa/mnaombwa kutoa mchango wako/wenu wa hali na mali kufanikisha shughuli hii muhimu. Tafadhali kabidhi mchango wako kwa <span className="not-italic font-sans font-bold text-gray-900 tracking-wide text-lg">{data.jinaLaAkauntiYaMchango || "Mercy Joel Nchwali"}</span>
              </p>

              {/* Payment Details embedded in paragraph/flow - no outer card */}
              <p className="not-italic font-sans font-bold text-gray-900 tracking-wide text-lg leading-relaxed text-center pt-0.5">
                {data.ainaYaMchango || "MPESA"} – {data.nambaYaSimuMchango || "0754388813"}
                {data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili && (
                  <span> au {data.ainaYaMchangoPili} - {data.nambaYaSimuMchangoPili}</span>
                )}
              </p>

              <p className="not-italic font-sans font-bold text-gray-900 tracking-wide text-base md:text-lg leading-relaxed text-center">
                Mwisho wa kutoa mchango ni {mwishoMchangoText}
              </p>

              <p className="font-serif italic font-bold text-gray-800 text-base md:text-lg leading-relaxed text-center pt-0.5">
                “Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana”
              </p>
            </div>

            {/* Bottom-left aligned contacts inside the frame */}
            <div className="w-full flex justify-start items-end mt-3 pl-4">
              {data.kamatiKuu.length > 0 && (
                <div className="text-left space-y-1 text-sm md:text-base text-gray-900 font-sans not-italic font-semibold">
                  <p className="not-italic font-sans font-semibold text-gray-900 text-sm md:text-base uppercase tracking-wider mb-1">
                    Kwa mawasiliano
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {data.kamatiKuu.map((m) => (
                      <React.Fragment key={m.id}>
                        <span className="not-italic font-sans font-semibold text-gray-900 pr-2">{m.name || "Mhusika"}</span>
                        <span className="not-italic font-sans font-semibold text-gray-900">{m.phone || "---"}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      );

      if (isCapture) {
        return cardEl;
      }

      return (
        <div className="w-full overflow-auto flex justify-center items-center p-4">
          {cardEl}
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        id={isCapture ? "wedding-card-capture" : undefined}
        className="w-[550px] relative bg-[#FFFDF9] text-stone-900 border border-amber-700/60 rounded-2xl p-1.5 overflow-hidden font-sans select-none"
        style={{
          boxShadow: isCapture ? undefined : "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08), inset 0 0 40px rgba(180, 134, 34, 0.02)"
        }}
      >
        <div className="border-2 border-double border-amber-600/50 rounded-xl p-0.5">
          <div className="border border-amber-600/30 rounded-lg p-3 relative bg-[#FFFDF9] overflow-hidden">
            <GoldLeafBackground />
            {style === "gold-leaf" && (
              <>
                <GoldLeafBranchTopRight />
                <GoldLeafBranchTopLeftSmall />
                <GoldLeafBranchBottomRightSmall />
                <GoldLeafBranchBottomLeft />
              </>
            )}
            {style === "classic" && (
              <>
                <ClassicOrnamentLarge className="top-2.5 left-2.5" />
                <ClassicOrnamentSmall className="top-2.5 right-2.5 rotate-90" />
                <ClassicOrnamentSmall className="bottom-2.5 left-2.5 -rotate-90" />
                <ClassicOrnamentLarge className="bottom-2.5 right-2.5 rotate-180" />
              </>
            )}
            {style === "floral" && (
              <>
                <FloralOrnamentLarge className="top-2 left-2" />
                <FloralOrnamentSmall className="top-2.5 right-2.5 rotate-90" />
                <FloralOrnamentSmall className="bottom-2.5 left-2.5 -rotate-90" />
                <FloralOrnamentLarge className="bottom-2 right-2 rotate-180" />
                <SideVineOrnament isLeft={true} />
                <SideVineOrnament isLeft={false} />
              </>
            )}
            {style === "royal" && (
              <>
                <RoyalOrnamentLarge className="top-2 left-2" />
                <RoyalOrnamentSmall className="top-2.5 right-2.5 rotate-90" />
                <RoyalOrnamentSmall className="bottom-2.5 left-2.5 -rotate-90" />
                <RoyalOrnamentLarge className="bottom-2 right-2 rotate-180" />
              </>
            )}
            <div className="border border-amber-300/40 rounded-md p-8 flex flex-col justify-between items-center text-center min-h-[640px] relative z-10 bg-transparent">
              <div className="my-2 relative z-10">
                <h1 className="text-xl font-serif font-extrabold italic text-amber-950 tracking-wider">
                  Mchango wa Harusi
                </h1>
                <div className="flex items-center justify-center gap-2 w-32 mx-auto mt-1.5 text-amber-600/40">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500/60" />
                  <Heart className="w-3.5 h-3.5 fill-current text-amber-600" />
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500/60" />
                </div>
              </div>
              <div className="space-y-4 my-2 px-2 max-w-[95%] relative z-10 text-xs md:text-sm">
                <div className="space-y-1">
                  <p className="font-serif italic font-bold text-stone-800 leading-relaxed">
                    {wafadhiliText} {mahaliWafadhiliText}
                  </p>
                  <p className="font-serif italic text-stone-500">
                    Wanayo furaha kukutaarifu/kuwataarifu
                  </p>
                  <p className="text-[11px] font-semibold text-stone-400 tracking-wide">
                    Mhe./Prof./Dkt./Mch./Bw&Bibi/Bw./Bibi/Dr./Miss
                  </p>
                </div>
                <div className="py-1 w-full">
                  <div className="border-b border-dashed border-amber-600/40 pb-1 italic max-w-xs mx-auto text-center font-serif text-sm font-bold text-amber-900 min-h-[24px]">
                    {data.jinaLaMwalikwa.trim() || "..........................................................................."}
                  </div>
                </div>
                <div className="space-y-3 leading-relaxed text-stone-800">
                  <p className="font-serif italic">
                    Kuwa {uhusianoText}
                  </p>
                  <h2 
                    className="text-2xl font-serif font-black italic text-amber-900 tracking-wide my-1.5 drop-shadow-[0_2px_4px_rgba(217,119,6,0.1)]"
                  >
                    {jinaKijanaText}
                  </h2>
                  <p className="font-serif italic px-2 text-stone-700">
                    Anatarajia kufunga ndoa tarahe <span className="font-bold not-italic">{tareheNdoaText}</span> {mahaliNdoaText}. Hivyo ukiwa ndugu, jamaa na rafiki wa karibu wa familia hii unaombwa/mnaombwa kutoa mchango wako/wenu wa hali na mali kufanikisha shughuli hii muhimu. Tafadhali kabidhi mchango wako kwa <span className="font-bold not-italic text-amber-950">{data.jinaLaAkauntiYaMchango || "Mercy Joel Nchwali"}</span>
                  </p>
                </div>
                <div className="bg-[#FEFCF5] border border-amber-200/40 rounded-xl p-3.5 max-w-md mx-auto my-3 space-y-1.5 shadow-2xs">
                  <div className="text-sm font-mono font-bold text-amber-900 tracking-wider">
                    {data.ainaYaMchango || "MPESA"} – {data.nambaYaSimuMchango || "0754388813"}
                    {data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili && (
                      <span className="font-serif font-normal text-stone-600">
                        {" "}au <strong className="font-mono font-bold text-amber-900">{data.ainaYaMchangoPili} - {data.nambaYaSimuMchangoPili}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Mwisho wa kutoa mchango ni <span className="font-bold text-stone-700">{mwishoMchangoText}</span>
                  </div>
                </div>
                <p className="font-serif italic font-bold text-amber-850 my-1 text-xs">
                  “Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana”
                </p>
              </div>
              {data.kamatiKuu.length > 0 && (
                <div className="w-full text-left pl-2.5 mt-2 space-y-1 relative z-10 max-w-[90%] border-t border-stone-100 pt-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-amber-800 italic mb-1.5">
                    Kwa mawasiliano
                  </p>
                  <div className="grid grid-cols-1 gap-y-1 text-xs text-stone-850">
                    {data.kamatiKuu.map((m) => (
                      <div key={m.id} className="flex justify-between max-w-[280px]">
                        <span className="font-serif font-semibold">{m.name || "Mhusika"}</span>
                        <span className="font-mono font-bold text-amber-950 tracking-wider">{m.phone || "---"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ContributionCardContent.displayName = "ContributionCardContent";

interface InvitationCardContentProps {
  data: InvitationData;
  isCapture?: boolean;
}

const InvitationCardContent = React.forwardRef<HTMLDivElement, InvitationCardContentProps>(
  ({ data, isCapture }, ref) => {
    if (data.cardType === "contribution") {
      return <ContributionCardContent ref={ref} data={data} isCapture={isCapture} />;
    }

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

    // 1. Strict Landscape Card Layout (Luxury Gold Leaf Lalo)
    if (style === "gold-leaf-full") {
      const cardEl = (
        <div 
          ref={ref}
          id={isCapture ? "wedding-card-capture" : undefined}
          className="relative w-[900px] h-[650px] shrink-0 overflow-hidden flex justify-center items-center shadow-2xl rounded-xl font-sans select-none text-stone-900"
        >
          {/* Layer 2: Background Image Element (The Bulletproof Fix) */}
          <img src="/gold-leaves-bg.jpg" alt="background" className="absolute w-[650px] h-[900px] -rotate-90 object-cover z-0 opacity-90" />

          {/* Layer 3: Inner Content Card */}
          <div className="relative z-10 w-[85%] h-full mx-auto flex flex-col justify-center items-center text-center bg-transparent py-8">
            
            {/* Header Title */}
            <div className="mt-1">
              <h1 className="whitespace-nowrap text-3xl font-serif font-bold not-italic mb-3 text-[#8b5a2b] text-center">
                MWALIKO WA HARUSI
              </h1>
            </div>

            {/* Continuous Typography Flow */}
            <div className="flex-1 flex flex-col justify-center items-center w-full max-w-[88%] space-y-1.5 mt-1 mx-auto">
              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center uppercase tracking-wider font-bold">
                Ndugu, Jamaa na Rafiki
              </p>
              
              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center">
                Inayo heshima kubwa kukualika:
              </p>

              {/* Guest name line */}
              <div className="w-full text-center py-0.5">
                <div className="font-serif font-bold italic text-amber-955 text-base md:text-lg leading-relaxed text-center">
                  Mhe./Prof./Dkt./Bw&Bibi/ {data.jinaLaMwalikwa.trim() || ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"}
                </div>
              </div>

              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center">
                Kwenye sherehe ya ndoa ya watoto wao wapendwa:
              </p>

              <h2 className="text-3xl md:text-4xl font-serif font-bold not-italic text-[#8b5a2b] my-2 text-center">
                {jinaKijanaText}
              </h2>

              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center">
                Mawifi na Maamuma wa:
              </p>
              <p className="font-serif italic font-bold text-gray-800 text-base md:text-lg leading-relaxed text-center">
                {wafadhiliText} {mahaliWafadhiliText}
              </p>

              <p className="font-serif italic text-gray-800 text-base md:text-lg leading-relaxed text-center max-w-[95%]">
                Ibada na sherehe zitafanyika tarehe <span className="font-bold not-italic">{tareheNdoaText}</span> katika ukumbi wa {mahaliNdoaText}.
              </p>

              {/* Payment Details embedded in paragraph/flow - no outer card */}
              {hasPaymentDetails && (
                <p className="not-italic font-sans font-bold text-gray-900 tracking-wide text-base md:text-lg leading-relaxed text-center pt-0.5">
                  Michango itumwe kwa <span className="not-italic font-sans font-bold text-gray-900 tracking-wide text-lg">{data.jinaLaAkauntiYaMchango || "Mercy Joel Nchwali"}</span>: <span className="not-italic font-sans font-bold text-gray-900 tracking-wide text-lg">{data.ainaYaMchango || "MPESA"} - {data.nambaYaSimuMchango || "0754388813"}{data.ainaYaMchangoPili && data.nambaYaSimuMchangoPili && ` au ${data.ainaYaMchangoPili} - ${data.nambaYaSimuMchangoPili}`}</span>
                  {data.mwishoWaKutoaMchango && <span> mwisho tarehe {mwishoMchangoText}</span>}
                </p>
              )}

              <p className="font-serif italic font-bold text-gray-800 text-base md:text-lg leading-relaxed text-center pt-0.5">
                “Tunatanguliza shukrani zetu za dhati na Mungu awabariki sana”
              </p>
            </div>

            {/* Bottom-left aligned contacts inside the frame */}
            <div className="w-full flex justify-start items-end mt-3 pl-4">
              {data.kamatiKuu.length > 0 && (
                <div className="text-left space-y-1 text-sm md:text-base text-gray-900 font-sans not-italic font-semibold">
                  <p className="not-italic font-sans font-semibold text-gray-900 text-sm md:text-base uppercase tracking-wider mb-1">
                    Kwa mawasiliano
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {data.kamatiKuu.map((m) => (
                      <React.Fragment key={m.id}>
                        <span className="not-italic font-sans font-semibold text-gray-900 pr-2">{m.name || "Mhusika"}</span>
                        <span className="not-italic font-sans font-semibold text-gray-900">{m.phone || "---"}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      );

      if (isCapture) {
        return cardEl;
      }

      return (
        <div className="w-full overflow-auto flex justify-center items-center p-4">
          {cardEl}
        </div>
      );
    }

    return (
      <div 
        ref={ref}
        id={isCapture ? "wedding-card-capture" : undefined}
        className="w-[550px] relative bg-[#FFFDF9] text-stone-900 border border-amber-700/60 rounded-2xl p-1.5 overflow-hidden font-sans select-none"
        style={{
          boxShadow: isCapture ? undefined : "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08), inset 0 0 40px rgba(180, 134, 34, 0.02)"
        }}
      >
        <div className="border-2 border-double border-amber-600/50 rounded-xl p-0.5">
          <div className="border border-amber-600/30 rounded-lg p-3 relative bg-[#FFFDF9] overflow-hidden">
            {style === "gold-leaf" ? <GoldLeafBackground /> : <WatermarkPattern />}
            <CenterMotif />
            {style === "classic" && (
              <>
                <ClassicOrnamentLarge className="top-2.5 left-2.5" />
                <ClassicOrnamentSmall className="top-2.5 right-2.5 rotate-90" />
                <ClassicOrnamentSmall className="bottom-2.5 left-2.5 -rotate-90" />
                <ClassicOrnamentLarge className="bottom-2.5 right-2.5 rotate-180" />
              </>
            )}
            {style === "floral" && (
              <>
                <FloralOrnamentLarge className="top-2 left-2" />
                <FloralOrnamentSmall className="top-2.5 right-2.5 rotate-90" />
                <FloralOrnamentSmall className="bottom-2.5 left-2.5 -rotate-90" />
                <FloralOrnamentLarge className="bottom-2 right-2 rotate-180" />
                <SideVineOrnament isLeft={true} />
                <SideVineOrnament isLeft={false} />
              </>
            )}
            {style === "royal" && (
              <>
                <RoyalOrnamentLarge className="top-2 left-2" />
                <RoyalOrnamentSmall className="top-2.5 right-2.5 rotate-90" />
                <RoyalOrnamentSmall className="bottom-2.5 left-2.5 -rotate-90" />
                <RoyalOrnamentLarge className="bottom-2 right-2 rotate-180" />
              </>
            )}
            {style === "gold-leaf" && (
              <>
                <GoldLeafBranchTopRight />
                <GoldLeafBranchTopLeftSmall />
                <GoldLeafBranchBottomRightSmall />
                <GoldLeafBranchBottomLeft />
              </>
            )}
            <div className="border border-amber-300/40 rounded-md p-8 flex flex-col justify-between items-center text-center min-h-[640px] relative z-10 bg-transparent">
              <div className="mt-2 flex flex-col items-center space-y-1.5 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500" />
                  <Heart className="w-5 h-5 text-amber-600 fill-amber-500/10" />
                  <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-700">
                  Umoja na Upendo
                </span>
              </div>
              {style === "royal" && <HeaderDividerOrnament isTop={true} />}
              <div className="my-2 relative z-10">
                <h1 className="text-2xl font-serif font-bold text-amber-800 tracking-wider">
                  MWALIKO WA HARUSI
                </h1>
                <div className="flex items-center justify-center gap-2 w-48 mx-auto mt-1.5 text-amber-600/60">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500/60" />
                  <svg viewBox="0 0 24 24" width="14" height="14" className="w-3.5 h-3.5 fill-current text-amber-600" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500/60" />
                </div>
              </div>
              <div className="space-y-4 my-2 px-2 max-w-[90%] relative z-10">
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
                <div className="my-1.5 relative">
                  <h2 
                    className="text-4xl font-script text-amber-700 py-1.5 font-normal select-none drop-shadow-[0_2px_8px_rgba(217,119,6,0.18)]"
                    style={{ textShadow: "0 2px 12px rgba(180, 134, 34, 0.18)" }}
                  >
                    {jinaKijanaText}
                  </h2>
                </div>
                <div className="space-y-2 pt-2 bg-stone-50/40 backdrop-blur-[0.5px] rounded-lg p-3.5 border border-amber-100/40 relative z-10">
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
              {style === "royal" && <HeaderDividerOrnament isTop={false} />}
              <div className="w-full mt-4 space-y-3 relative z-10">
                <div className="flex items-center justify-center gap-2 w-full text-amber-600/30 my-3">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-amber-500/45" />
                  <svg viewBox="0 0 24 24" width="12" height="12" className="w-3 h-3 fill-current text-amber-600/50" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" />
                  </svg>
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-amber-500/45" />
                </div>
                {hasPaymentDetails ? (
                  <div className="text-[11px] text-stone-700 bg-amber-50/30 rounded p-2.5 border border-amber-200/25 max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-1 text-amber-800 font-semibold uppercase tracking-wider mb-1">
                      <CreditCard className="w-3 h-3" />
                      <span>Maelezo ya Mchango</span>
                    </div>
                    <p className="leading-relaxed">
                      Michango itumwe kupitia:{" "}
                      <strong className="text-amber-950 font-bold">
                        {data.ainaYaMchango || "[Njia ya Malipo]"}
                      </strong>{" "}
                      kwenda Jina:{" "}
                      <strong className="text-amber-950 font-bold">
                        {data.jinaLaAkauntiYaMchango || "[Jina la Akaunti]"}
                      </strong>
                      {data.nambaYaSimuMchango && (
                        <>
                          , Namba:{" "}
                          <strong className="text-amber-950 font-mono tracking-wider font-bold">
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
                <p className="text-[9px] font-serif tracking-widest text-amber-700/80 uppercase font-bold pt-1">
                  *** KARIBUNI SANA SHANGAZI NA MJOMBA ***
                </p>
              </div>
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
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    if (data.mtindoWaMapambo === "gold-leaf-full") {
      setOrientation("landscape");
    } else {
      setOrientation("portrait");
    }
  }, [data.mtindoWaMapambo]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.clientWidth || 550;
        const targetWidth = parentWidth - 16;
        const baseWidth = orientation === "landscape" ? 900 : 550;
        if (targetWidth < baseWidth) {
          setScale(targetWidth / baseWidth);
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
  }, [orientation]);

  const cardHeight = orientation === "landscape" ? 650 : 660;

  return (
    <div 
      ref={containerRef} 
      className="w-full flex flex-col justify-center items-center overflow-hidden py-4 relative"
    >
      <div 
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          width: orientation === "landscape" ? "900px" : "550px",
          minWidth: orientation === "landscape" ? "900px" : "550px",
          marginBottom: scale < 1 ? `calc(${cardHeight}px * (${scale} - 1))` : "0px",
        }}
        className="transition-transform duration-200 ease-out"
      >
        <InvitationCardContent data={data} isCapture={false} />
      </div>

      <div 
        className="fixed top-0 left-0 pointer-events-none z-[-50] opacity-0"
        aria-hidden="true"
      >
        <InvitationCardContent ref={cardRef} data={data} isCapture={true} />
      </div>
    </div>
  );
}
