"use client";

import React, { useState, useRef } from "react";
import { Heart, Sparkles, HelpCircle } from "lucide-react";
import { InvitationData } from "../types";
import InvitationForm from "../components/InvitationForm";
import InvitationPreview from "../components/InvitationPreview";
import ActionButtons from "../components/ActionButtons";

const INITIAL_DATA: InvitationData = {
  jinaLaMwalikwa: "",
  wafadhili: "Familia ya Bw. & Bibi John Nchwali",
  mahaliPaWafadhili: "Ipagala - Dodoma",
  jinaLaKijana: "Bright Mujulizi & Mercy Joel",
  tareheYaNdoa: "2026-08-22",
  mahaliPaNdoa: "Kanisa la KKKT Ipagala, mjini Dodoma",
  ainaYaMchango: "M-PESA",
  jinaLaAkauntiYaMchango: "Mercy Joel Nchwali",
  nambaYaSimuMchango: "0754123456",
  mwishoWaKutoaMchango: "2026-08-10",
  kamatiKuu: [
    { id: "1", name: "Bw. John Joel (Mwenyekiti)", phone: "0754123456" },
    { id: "2", name: "Bi. Mercy Nchwali (Mhazini)", phone: "0712345678" }
  ],
  mtindoWaMapambo: "classic"
};

export default function Home() {
  const [data, setData] = useState<InvitationData>(INITIAL_DATA);
  const cardRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F5]">
      {/* Premium Header */}
      <header className="bg-white border-b border-stone-100 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-2 rounded-xl text-white">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-black tracking-wide text-stone-800 flex items-center gap-1.5">
                Kadi<span className="text-amber-600">.tz</span>
              </h1>
              <p className="text-[10px] text-stone-400 font-semibold tracking-wider uppercase -mt-0.5">
                Mtengenezaji wa Kadi za Harusi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-full font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
            <span>Toleo la Kifahari (Swahili)</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* LEFT COLUMN: Input Form (Takes 5 cols on lg) */}
          <div className="lg:col-span-5 w-full">
            <InvitationForm data={data} onChange={setData} />
          </div>

          {/* RIGHT COLUMN: Sticky Live Preview + Export Panel (Takes 7 cols on lg) */}
          <div className="lg:col-span-7 w-full lg:sticky lg:top-[90px] space-y-6 max-h-[85vh] lg:overflow-y-auto pr-1">
            
            {/* Live Preview Label Banner */}
            <div className="bg-amber-50/70 border border-amber-200/40 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-xs font-semibold text-amber-900">
                  Uhakiki wa Moja kwa Moja (Live Preview Card)
                </span>
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Inavyoonekana hapa ndivyo itakavyopakuliwa</span>
              </div>
            </div>

            {/* Card Live Render Component */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/40 shadow-inner flex items-center justify-center">
              <InvitationPreview data={data} cardRef={cardRef} />
            </div>

            {/* Export and Sharing Integrations Component */}
            <ActionButtons data={data} cardRef={cardRef} />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-100 py-6 text-center text-xs text-stone-400 font-medium">
        <div className="max-w-7xl mx-auto px-6 space-y-1">
          <p className="flex items-center justify-center gap-1">
            Imetengenezwa kwa <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> kwa ajili ya Maharusi wa Kitanzania.
          </p>
          <p>Hakimiliki &copy; {new Date().getFullYear()} Kadi.tz. Haki zote zimehifadhiwa.</p>
        </div>
      </footer>
    </div>
  );
}
