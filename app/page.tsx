"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Heart, Sparkles, HelpCircle, CheckCircle2, Trash2 } from "lucide-react";
import { InvitationData, ExcelContact } from "../types";
import InvitationForm from "../components/InvitationForm";
import InvitationPreview from "../components/InvitationPreview";
import ActionButtons from "../components/ActionButtons";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import ThemeSwitcher from "../components/ui/ThemeSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useFormPersistence } from "../lib/useFormPersistence";

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
    { id: "2", name: "Bi. Mercy Nchwali (Mhazini)", phone: "0712345678" },
    { id: "3", name: "Bw. George Nchwali (Mhazini)", phone: "0754413117" }
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
    { id: "2", name: "Mercy Nchwali", phone: "0754388813" },
    { id: "3", name: "George Nchwali", phone: "0754413117" }
  ],
  mtindoWaMapambo: "gold-leaf"
};

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const { tr } = useLanguage();
  const steps = [
    { num: 1, label: tr('step1') },
    { num: 2, label: tr('step2') },
    { num: 3, label: tr('step3') },
  ] as const;

  return (
    <div className="flex items-center justify-center gap-0 max-w-lg mx-auto">
      {steps.map((step, idx) => {
        const isDone = currentStep > step.num;
        const isActive = currentStep === step.num;
        return (
          <React.Fragment key={step.num}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                  isDone
                    ? "bg-amber-500 border-amber-500 text-white"
                    : isActive
                    ? "bg-white border-amber-500 text-amber-600 shadow-sm shadow-amber-100"
                    : "bg-stone-100 border-stone-200 text-stone-400"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 fill-white text-white" />
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide whitespace-nowrap transition-colors ${
                  isActive ? "text-amber-700" : isDone ? "text-amber-500" : "text-stone-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-10 sm:w-16 mb-5 mx-1 rounded-full transition-all duration-500 ${
                  currentStep > step.num ? "bg-amber-400" : "bg-stone-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { language, tr } = useLanguage();
  const [data, setData] = useState<InvitationData>(INITIAL_INVITATION_DATA);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [excelData, setExcelData] = useState<ExcelContact[] | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { clearSavedData, hasSaved } = useFormPersistence(data, setData);

  const handleFormChange = (newData: InvitationData) => {
    setData(newData);
    setHasUserEdited(true);
  };

  const handleCardTypeChange = (type: "invitation" | "contribution") => {
    setExcelData(null);
    setExcelFileName("");
    setHasUserEdited(false);
    if (type === "invitation") {
      setData(INITIAL_INVITATION_DATA);
    } else {
      setData(INITIAL_CONTRIBUTION_DATA);
    }
  };

  const handleClearForm = () => {
    const message = language === 'en'
      ? 'Are you sure? All form data will be cleared.'
      : 'Una uhakika? Data yote itafutwa.';
    if (window.confirm(message)) {
      clearSavedData();
      setData(data.cardType === 'contribution' ? INITIAL_CONTRIBUTION_DATA : INITIAL_INVITATION_DATA);
      setExcelData(null);
      setExcelFileName("");
      setHasUserEdited(false);
    }
  };

  // Determine current step
  const hasFormData = !!(data.wafadhili || data.jinaLaKijana);
  const hasContacts = !!(excelData && excelData.length > 0);
  const currentStep: 1 | 2 | 3 = hasContacts || hasFormData ? (hasContacts ? 3 : 2) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-ui-bg">
      {/* Premium Header */}
      <header className="bg-ui-card border-b border-ui-border py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-amber-500 p-2 rounded-xl text-white">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-black tracking-wide text-ui-text flex items-center gap-1.5">
                NorZah Designs
              </h1>
              <p className="text-[10px] text-ui-muted font-semibold tracking-wider uppercase -mt-0.5">
                {tr('tagline')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Link
              href="/dashboard/sms"
              className="text-xs font-semibold text-ui-muted hover:text-ui-text transition-colors px-2 py-1.5 rounded-lg hover:bg-ui-bg"
            >
              {language === 'sw' ? '📊 Dashibodi ya SMS' : '📊 SMS Dashboard'}
            </Link>
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 xl:space-y-8">
        
        {/* Step Indicator */}
        <div className="bg-ui-card border border-ui-border rounded-2xl px-4 py-4 shadow-xs">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* Card Type Selector Tabs */}
        <div className="flex bg-ui-bg p-1.5 rounded-2xl max-w-lg mx-auto shadow-xs border border-ui-border">
          <button
            onClick={() => handleCardTypeChange("invitation")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
              data.cardType !== "contribution"
                ? "bg-ui-card text-ui-text shadow-sm"
                : "text-ui-muted hover:text-ui-text"
            }`}
          >
            <Heart className={`w-4 h-4 ${data.cardType !== "contribution" ? "text-amber-500 fill-amber-500" : "text-ui-muted"}`} />
            {tr('cardTypeInvitation')}
          </button>
          <button
            onClick={() => handleCardTypeChange("contribution")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
              data.cardType === "contribution"
                ? "bg-ui-card text-ui-text shadow-sm"
                : "text-ui-muted hover:text-ui-text"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${data.cardType === "contribution" ? "text-amber-500" : "text-ui-muted"}`} />
            {tr('cardTypeContribution')}
          </button>
        </div>

        {/* Saved indicator + Clear Form row */}
        <div className="flex items-center justify-between max-w-lg mx-auto px-1">
          <span className={`text-xs text-stone-400 flex items-center gap-1 transition-opacity duration-300 ${hasSaved && hasUserEdited ? 'opacity-100' : 'opacity-0'}`}>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {language === 'en' ? 'Auto-saved ✓' : 'Imehifadhiwa ✓'}
          </span>
          <button
            type="button"
            onClick={handleClearForm}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500 transition-colors py-1 px-2 rounded-lg hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            {language === 'en' ? 'Clear Form' : 'Anza Upya'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 xl:gap-10 items-start">
          
          {/* LEFT COLUMN: Input Form (Takes 5 cols on lg) */}
          <div className="lg:col-span-5 w-full">
            <InvitationForm
              data={data}
              onChange={handleFormChange}
              excelData={excelData}
              setExcelData={setExcelData}
              excelFileName={excelFileName}
              setExcelFileName={setExcelFileName}
            />
          </div>

          {/* RIGHT COLUMN: Sticky Live Preview + Export Panel (Takes 7 cols on lg) */}
          <div className="lg:col-span-7 w-full lg:sticky lg:top-[90px] space-y-6 max-h-[85vh] xl:max-h-[90vh] lg:overflow-y-auto pr-1">

            {/* Live Preview Label Banner */}
            <div className="bg-amber-50/70 border border-amber-200/40 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-xs font-semibold text-amber-900">
                  {tr('previewTitle')}
                </span>
              </div>
              <div className="text-[11px] text-ui-muted flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{tr('previewHint')}</span>
              </div>
            </div>

            {/* Card Live Render Component */}
            <div className="bg-ui-bg rounded-2xl border border-ui-border shadow-inner flex items-center justify-center p-4 xl:p-6 min-h-125 xl:min-h-[36rem] w-full">
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
      <footer className="bg-ui-card border-t border-ui-border py-6 text-center text-xs text-ui-muted font-medium">
        <div className="max-w-7xl mx-auto px-6 space-y-1">
          <p className="flex items-center justify-center gap-1">
            {tr('footerMadeWith')} <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mx-0.5" /> {tr('footerFor')}
          </p>
          <p>
            {tr('footerDesigned')}{" "}
            <a
              href="https://norman-kita.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-700 underline font-semibold transition-all"
            >
              Norman Kita (NorZah)
            </a>.
          </p>
          <p>{tr('footerCopyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
