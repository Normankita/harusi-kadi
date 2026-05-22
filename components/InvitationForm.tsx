"use client";

import React from "react";
import { 
  Users, 
  MapPin, 
  User, 
  Calendar, 
  CreditCard, 
  Phone, 
  Plus, 
  Trash2, 
  Heart,
  MessageCircle,
  FileSpreadsheet,
  Upload
} from "lucide-react";
import * as XLSX from "xlsx";
import { InvitationData, CommitteeMember } from "../types";

interface InvitationFormProps {
  data: InvitationData;
  onChange: (newData: InvitationData) => void;
  excelData: { name: string; phone: string }[] | null;
  setExcelData: (data: { name: string; phone: string }[] | null) => void;
  excelFileName: string;
  setExcelFileName: (name: string) => void;
}

const PAYMENT_METHODS = [
  { value: "M-PESA", label: "M-Pesa (Vodacom)" },
  { value: "TIGO PESA", label: "Tigo Pesa" },
  { value: "AIRTEL MONEY", label: "Airtel Money" },
  { value: "HALOPESA", label: "HaloPesa" },
  { value: "CRDB BANK", label: "CRDB Bank" },
  { value: "NMB BANK", label: "NMB Bank" },
  { value: "NBC BANK", label: "NBC Bank" },
  { value: "KADI / PESA TASLIMU", label: "Pesa Taslimu / Cash" },
];

export default function InvitationForm({ 
  data, 
  onChange,
  excelData,
  setExcelData,
  excelFileName,
  setExcelFileName
}: InvitationFormProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({
      ...data,
      [name]: value,
    });
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const fileData = evt.target?.result;
        if (!fileData) return;
        const workbook = XLSX.read(fileData, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (rows.length === 0) {
          alert("Faili halina data yoyote.");
          return;
        }

        // Find headers
        const headers = rows[0].map(h => String(h || "").trim().toLowerCase());
        const jinaIndex = headers.findIndex(h => h === "jina" || h === "recipient name" || h === "recipient" || h === "name");
        const simuIndex = headers.findIndex(h => h === "simu" || h === "phone" || h === "simu ya mwalikwa" || h === "phone number" || h === "recipient phone" || h === "phone");
        
        if (jinaIndex === -1) {
          alert("Safu ya 'Jina' haikupatikana kwenye faili. Hakikisha kuna safu inayoitwa 'Jina'.");
          return;
        }

        const dataRows: { name: string; phone: string }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const name = String(row[jinaIndex] || "").trim();
          const phone = simuIndex !== -1 && row[simuIndex] !== undefined ? String(row[simuIndex] || "").trim() : "";
          if (name) {
            dataRows.push({ name, phone });
          }
        }

        if (dataRows.length === 0) {
          alert("Hakuna majina yaliyopatikana chini ya safu ya 'Jina'.");
          return;
        }

        setExcelData(dataRows);
      } catch (err) {
        console.error(err);
        alert("Imeshindwa kusoma faili la Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitteeChange = (id: string, field: "name" | "phone", value: string) => {
    const updatedCommittee = data.kamatiKuu.map((member) => {
      if (member.id === id) {
        return { ...member, [field]: value };
      }
      return member;
    });
    onChange({
      ...data,
      kamatiKuu: updatedCommittee,
    });
  };

  const addCommitteeMember = () => {
    const newMember: CommitteeMember = {
      id: crypto.randomUUID(),
      name: "",
      phone: "",
    };
    onChange({
      ...data,
      kamatiKuu: [...data.kamatiKuu, newMember],
    });
  };

  const removeCommitteeMember = (id: string) => {
    onChange({
      ...data,
      kamatiKuu: data.kamatiKuu.filter((member) => member.id !== id),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 md:p-8 space-y-8 max-h-[85vh] overflow-y-auto">
      <div className="border-b border-stone-100 pb-4">
        <h2 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
          <Heart className="text-amber-500 fill-amber-500 w-6 h-6 animate-pulse" />
          {data.cardType === "contribution" ? "Taarifa za Mchango" : "Taarifa za Sherehe"}
        </h2>
        <p className="text-stone-500 text-sm mt-1">
          {data.cardType === "contribution" 
            ? "Jaza fomu hii kwa Kiswahili ili kutengeneza kadi ya mchango wa harusi."
            : "Jaza fomu hii kwa Kiswahili ili kutengeneza kadi yako ya mwaliko wa harusi."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Mtindo wa Mapambo Selector */}
        <div className="space-y-3 pb-5 border-b border-stone-100">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Mtindo wa Mapambo (Card Design Style)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Category: Wima (Portrait) */}
            <div className="col-span-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-2 bg-stone-300 rounded-[1px]" />
              <span>Wima (Portrait)</span>
            </div>
            {[
              { value: "classic", label: "Classic Gold", desc: "Wima (Portrait)", orientation: "portrait" },
              { value: "floral", label: "Elegant Floral", desc: "Wima (Portrait)", orientation: "portrait" },
              { value: "royal", label: "Royal Baroque", desc: "Wima (Portrait)", orientation: "portrait" },
              { value: "gold-leaf", label: "Gold Leaf Corners", desc: "Wima (Portrait)", orientation: "portrait" }
            ].map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => onChange({ ...data, mtindoWaMapambo: style.value as any })}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  data.mtindoWaMapambo === style.value
                    ? "border-amber-600 bg-amber-50/50 text-amber-900 shadow-xs"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-2 h-3 border border-current rounded-[1px] opacity-75" title="Wima (Portrait)" />
                  <span className="text-xs font-bold">{style.label}</span>
                </div>
                <span className="text-[9px] text-stone-400 mt-1 leading-tight">{style.desc}</span>
              </button>
            ))}

            {/* Category: Lalo (Landscape) */}
            <div className="col-span-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-stone-300 rounded-[1px]" />
              <span>Lalo (Landscape)</span>
            </div>
            {[
              { value: "gold-leaf-full", label: "Luxury Gold Leaf (Lalo)", desc: "Lalo (Landscape)", orientation: "landscape" }
            ].map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => onChange({ ...data, mtindoWaMapambo: style.value as any })}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  data.mtindoWaMapambo === style.value
                    ? "border-amber-600 bg-amber-50/50 text-amber-900 shadow-xs"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-3 h-2 border border-current rounded-[1px] opacity-75" title="Lalo (Landscape)" />
                  <span className="text-xs font-bold">{style.label}</span>
                </div>
                <span className="text-[9px] text-stone-400 mt-1 leading-tight">{style.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Wafadhili / Waandaaji */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            1. Mwalikwa & Waandaaji (Waalikaji)
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Jina la Mwalikwa Input */}
              <div className="space-y-1.5">
                <label htmlFor="jinaLaMwalikwa" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  Jina la Mwalikwa (Kadi Moja)
                </label>
                <input
                  id="jinaLaMwalikwa"
                  type="text"
                  name="jinaLaMwalikwa"
                  value={data.jinaLaMwalikwa}
                  onChange={handleInputChange}
                  disabled={!!excelData}
                  placeholder={excelData ? "Imezuiwa kwa sababu umechagua Excel" : "e.g., Bw. & Bibi Joseph Nyerere"}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all disabled:bg-stone-50 disabled:text-stone-400"
                />
                <p className="text-[10px] text-stone-400 italic">
                  {excelData 
                    ? "Ondoa Excel iliyopakiwa ili kuandika jina moja." 
                    : "Ukiacha wazi, kadi itabaki na nukta ya kuandika kwa mkono."}
                </p>
              </div>

              {/* Excel Batch Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-stone-400" />
                  Pakia Majina mengi (Excel / CSV)
                </label>
                
                {!excelData ? (
                  <div className="relative">
                    <input
                      type="file"
                      id="excel-upload"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="flex items-center justify-center gap-2 w-full text-xs font-semibold px-4 py-3 rounded-lg border border-dashed border-amber-600/40 bg-amber-50/20 text-amber-900 hover:bg-amber-50 cursor-pointer transition-all text-center"
                    >
                      <Upload className="w-4 h-4 text-amber-700" />
                      <span>Chagua Excel (.xlsx, .csv)</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 text-emerald-950 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold truncate" title={excelFileName}>
                          {excelFileName}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-medium">
                          Waalikwa: <span className="font-bold">{excelData.length}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExcelData(null);
                        setExcelFileName("");
                      }}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-all ml-1.5 flex-shrink-0 cursor-pointer"
                      title="Ondoa faili"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-stone-400 italic">
                  Safu lazima iwe na kichwa cha habari &quot;Jina&quot; (S/N, Jina, Simu).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="wafadhili" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  Jina la Familia / Waalika
                </label>
                <input
                  id="wafadhili"
                  type="text"
                  name="wafadhili"
                  value={data.wafadhili}
                  onChange={handleInputChange}
                  placeholder="e.g., Familia ya Bw. John Joel na Mercy Joel"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mahaliPaWafadhili" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  Mahali pa Wafadhili
                </label>
                <input
                  id="mahaliPaWafadhili"
                  type="text"
                  name="mahaliPaWafadhili"
                  value={data.mahaliPaWafadhili}
                  onChange={handleInputChange}
                  placeholder="e.g., Ipagala - Dodoma"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Maelezo ya Ndoa / Kijana */}
        <div className="space-y-4 pt-2 border-t border-stone-50">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            2. Taarifa za Maharusi
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="jinaLaKijana" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  Jina la Kijana / Maharusi
                </label>
                <input
                  id="jinaLaKijana"
                  type="text"
                  name="jinaLaKijana"
                  value={data.jinaLaKijana}
                  onChange={handleInputChange}
                  placeholder="e.g., Bright Mujulizi Kimaro"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="uhusianoWaKijana" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-stone-400" />
                  Uhusiano (e.g., Kijana wao mpendwa)
                </label>
                <input
                  id="uhusianoWaKijana"
                  type="text"
                  name="uhusianoWaKijana"
                  value={data.uhusianoWaKijana || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., kijana wao mpendwa"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="tareheYaNdoa" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Tarehe ya Ndoa
                </label>
                <input
                  id="tareheYaNdoa"
                  type="date"
                  name="tareheYaNdoa"
                  value={data.tareheYaNdoa}
                  onChange={handleInputChange}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mahaliPaNdoa" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  {data.cardType === "contribution" ? "Mji/Wilaya ya Ndoa" : "Mahali pa Ibada / Ukumbi"}
                </label>
                <input
                  id="mahaliPaNdoa"
                  type="text"
                  name="mahaliPaNdoa"
                  value={data.mahaliPaNdoa}
                  onChange={handleInputChange}
                  placeholder={data.cardType === "contribution" ? "e.g., mjini Dodoma" : "e.g., Kanisa la KKKT Ipagala, mjini Dodoma"}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Michango ya Harusi */}
        <div className="space-y-4 pt-2 border-t border-stone-50">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            3. Maelezo ya Michango & Malipo
          </h3>
          <div className="space-y-4">
            
            {/* Payment Method 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ainaYaMchango" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                  Njia ya Mchango (1)
                </label>
                <select
                  id="ainaYaMchango"
                  name="ainaYaMchango"
                  value={data.ainaYaMchango}
                  onChange={handleInputChange}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 bg-white outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Chagua Njia --</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="nambaYaSimuMchango" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  Namba ya Simu / Akaunti (1)
                </label>
                <input
                  id="nambaYaSimuMchango"
                  type="text"
                  name="nambaYaSimuMchango"
                  value={data.nambaYaSimuMchango}
                  onChange={handleInputChange}
                  placeholder="e.g., 0754388813"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>

            {/* Payment Method 2 (For contribution cards or optional) */}
            {data.cardType === "contribution" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="ainaYaMchangoPili" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                    Njia ya Mchango (2) - Hiari
                  </label>
                  <select
                    id="ainaYaMchangoPili"
                    name="ainaYaMchangoPili"
                    value={data.ainaYaMchangoPili || ""}
                    onChange={handleInputChange}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 bg-white outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Hakuna Njia ya Pili --</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="nambaYaSimuMchangoPili" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    Namba ya Simu / Akaunti (2) - Hiari
                  </label>
                  <input
                    id="nambaYaSimuMchangoPili"
                    type="text"
                    name="nambaYaSimuMchangoPili"
                    value={data.nambaYaSimuMchangoPili || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 0152081488900"
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="jinaLaAkauntiYaMchango" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  Mpokeaji wa Mchango (Jina la Akaunti)
                </label>
                <input
                  id="jinaLaAkauntiYaMchango"
                  type="text"
                  name="jinaLaAkauntiYaMchango"
                  value={data.jinaLaAkauntiYaMchango}
                  onChange={handleInputChange}
                  placeholder="e.g., Mercy Joel Nchwali"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mwishoWaKutoaMchango" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Mwisho wa Kutoa Mchango
                </label>
                <input
                  id="mwishoWaKutoaMchango"
                  type="date"
                  name="mwishoWaKutoaMchango"
                  value={data.mwishoWaKutoaMchango}
                  onChange={handleInputChange}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Section 4: Kamati Kuu Mawasiliano */}
        <div className="space-y-4 pt-2 border-t border-stone-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              4. Mawasiliano / Kamati Kuu
            </h3>
            <button
              type="button"
              onClick={addCommitteeMember}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Ongeza Mjumbe
            </button>
          </div>

          <div className="space-y-3">
            {data.kamatiKuu.length === 0 ? (
              <p className="text-xs text-stone-400 italic bg-stone-50/50 p-4 rounded-lg text-center border border-dashed border-stone-200">
                Hakuna mawasiliano yaliyowekwa. Bofya kitufe cha &quot;Ongeza Mjumbe&quot; juu.
              </p>
            ) : (
              data.kamatiKuu.map((member, index) => (
                <div key={member.id} className="flex gap-3 items-end bg-stone-50/60 p-3 rounded-lg border border-stone-100 animate-fadeIn">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-stone-500">Jina la Mhusika {index + 1}</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleCommitteeChange(member.id, "name", e.target.value)}
                        placeholder="e.g., John Nchwali Joel"
                        className="w-full text-xs px-3 py-2 rounded border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 outline-none bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-stone-500">Namba ya Simu</label>
                      <input
                        type="text"
                        value={member.phone}
                        onChange={(e) => handleCommitteeChange(member.id, "phone", e.target.value)}
                        placeholder="e.g., 0754260831"
                        className="w-full text-xs px-3 py-2 rounded border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 outline-none bg-white transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCommitteeMember(member.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-all border border-transparent hover:border-red-100"
                    title="Ondoa Mjumbe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
