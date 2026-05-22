"use client";

import React, { useState, useRef } from "react";
import { Heart, Sparkles, HelpCircle } from "lucide-react";
import { InvitationData } from "../types";
import InvitationForm from "../components/InvitationForm";
import InvitationPreview from "../components/InvitationPreview";
import ActionButtons from "../components/ActionButtons";

const INITIAL_INVITATION_DATA: InvitationData = {
  cardType: "invitation",
  jinaLaMwalikwa: "",
  wafadhili: "Familia ya Bw. & Bibi John Nchwali",
  mahaliPaWafadhili: "Ipagala - Dodoma",
  jinaLaKijana: "Bright Mujulizi & Mercy Joel",
  uhusianoWaKijana: "watoto wao wapendwa",
  tareheYaNdoa: "2026-08-22",
  mahaliPaNdoa: "Kanisa la KKKT Ipagala, mjini Dodoma",
  ainaYaMchango: "M-PESA",
  jinaLaAkauntiYaMchango: "Mercy Joel Nchwali",
  nambaYaSimuMchango: "0754123456",
  ainaYaMchangoPili: "",
  nambaYaSimuMchangoPili: "",
  mwishoWaKutoaMchango: "2026-08-10",
  kamatiKuu: [
    { id: "1", name: "Bw. John Joel (Mwenyekiti)", phone: "0754123456" },
    { id: "2", name: "Bi. Mercy Nchwali (Mhazini)", phone: "0712345678" }
  ],
  mtindoWaMapambo: "classic"
};

const INITIAL_CONTRIBUTION_DATA: InvitationData = {
  cardType: "contribution",
  jinaLaMwalikwa: "",
  wafadhili: "Familia ya Bw. John Nchwali Joel na Mercy Nchwali",
  mahaliPaWafadhili: "Ipagala -Dodoma",
  jinaLaKijana: "Bright Mujulizi Kimaro",
  uhusianoWaKijana: "kijana wao mpendwa",
  tareheYaNdoa: "2026-09-12",
  mahaliPaNdoa: "Dodoma",
  ainaYaMchango: "MPESA",
  jinaLaAkauntiYaMchango: "Mercy Joel Nchwali",
  nambaYaSimuMchango: "0754388813",
  ainaYaMchangoPili: "CRDB",
  nambaYaSimuMchangoPili: "0152081488900",
  mwishoWaKutoaMchango: "2026-08-30",
  kamatiKuu: [
    { id: "1", name: "John Nchwali Joel", phone: "0754260831" },
    { id: "2", name: "Mercy Nchwali", phone: "0754388813" }
  ],
  mtindoWaMapambo: "gold-leaf"
};

export default function Home() {
  const [data, setData] = useState<InvitationData>(INITIAL_INVITATION_DATA);
  const [excelData, setExcelData] = useState<{ name: string; phone: string }[] | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const cardRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (data.mtindoWaMapambo === "gold-leaf-full") {
      setOrientation("landscape");
    } else {
      setOrientation("portrait");
    }
  }, [data.mtindoWaMapambo]);

  const handleCardTypeChange = (type: "invitation" | "contribution") => {
    // Reset data and excel details when switching modes
    setExcelData(null);
    setExcelFileName("");
    if (type === "invitation") {
      setData(INITIAL_INVITATION_DATA);
    } else {
      setData(INITIAL_CONTRIBUTION_DATA);
    }
  };

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
                NorZah Designs
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
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Card Type Selector Tabs */}
        <div className="flex bg-stone-100 p-1.5 rounded-2xl max-w-md mx-auto shadow-xs border border-stone-200/30">
          <button
            onClick={() => handleCardTypeChange("invitation")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
              data.cardType !== "contribution"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Heart className={`w-4 h-4 ${data.cardType !== "contribution" ? "text-amber-500 fill-amber-500" : "text-stone-400"}`} />
            Kadi ya Mwaliko
          </button>
          <button
            onClick={() => handleCardTypeChange("contribution")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
              data.cardType === "contribution"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${data.cardType === "contribution" ? "text-amber-500" : "text-stone-400"}`} />
            Kadi ya Mchango
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* LEFT COLUMN: Input Form (Takes 5 cols on lg) */}
          <div className="lg:col-span-5 w-full">
            <InvitationForm 
              data={data} 
              onChange={setData} 
              excelData={excelData}
              setExcelData={setExcelData}
              excelFileName={excelFileName}
              setExcelFileName={setExcelFileName}
            />
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
            <div className="bg-stone-50 rounded-2xl border border-stone-200/40 shadow-inner flex items-center justify-center p-4 min-h-[500px] w-full">
              <InvitationPreview data={data} cardRef={cardRef} />
            </div>

            {/* Export and Sharing Integrations Component */}
            <ActionButtons 
              data={data} 
              cardRef={cardRef} 
              excelData={excelData}
              onUpdateData={setData}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-100 py-6 text-center text-xs text-stone-400 font-medium">
        <div className="max-w-7xl mx-auto px-6 space-y-1">
          <p className="flex items-center justify-center gap-1">
            Imetengenezwa kwa <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> kwa ajili ya Maharusi wa Kitanzania.
          </p>
          <p>
            Imesanifiwa na kuundwa na {" "}
            <a 
              href="https://norman-kita.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-600 hover:text-amber-700 underline font-semibold transition-all"
            >
              Norman Kita (NorZah)
            </a>.
          </p>
          <p>Hakimiliki &copy; {new Date().getFullYear()} NorZah. Haki zote zimehifadhiwa.</p>
        </div>
      </footer>
    </div>
  );
}
