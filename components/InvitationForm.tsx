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
  MessageCircle
} from "lucide-react";
import { InvitationData, CommitteeMember } from "../types";

interface InvitationFormProps {
  data: InvitationData;
  onChange: (newData: InvitationData) => void;
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

export default function InvitationForm({ data, onChange }: InvitationFormProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({
      ...data,
      [name]: value,
    });
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
          Taarifa za Sherehe
        </h2>
        <p className="text-stone-500 text-sm mt-1">
          Jaza fomu hii kwa Kiswahili ili kutengeneza kadi yako ya mwaliko wa harusi.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Wafadhili / Waandaaji */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            1. Waandaaji / Wafadhili (Waalikaji)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="wafadhili" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                Jina la Wafadhili / Familia
              </label>
              <input
                id="wafadhili"
                type="text"
                name="wafadhili"
                value={data.wafadhili}
                onChange={handleInputChange}
                placeholder="e.g., Familia ya Bw. & Bibi John Nchwali"
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

        {/* Section 2: Maelezo ya Ndoa */}
        <div className="space-y-4 pt-2 border-t border-stone-50">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            2. Vijana & Ibada ya Ndoa
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="jinaLaKijana" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                Jina la Kijana (Maharusi)
              </label>
              <input
                id="jinaLaKijana"
                type="text"
                name="jinaLaKijana"
                value={data.jinaLaKijana}
                onChange={handleInputChange}
                placeholder="e.g., Bright Mujulizi & Mercy Joel"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
              />
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
                  Mahali pa Ndoa (Kanisa/Msikiti/Ukumbi)
                </label>
                <input
                  id="mahaliPaNdoa"
                  type="text"
                  name="mahaliPaNdoa"
                  value={data.mahaliPaNdoa}
                  onChange={handleInputChange}
                  placeholder="e.g., Kanisa la KKKT Ipagala, Dodoma"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Michango ya Harusi */}
        <div className="space-y-4 pt-2 border-t border-stone-50">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            3. Maelezo ya Michango
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="ainaYaMchango" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                Njia / Aina ya Mchango
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
                Namba ya Simu / Akaunti
              </label>
              <input
                id="nambaYaSimuMchango"
                type="text"
                name="nambaYaSimuMchango"
                value={data.nambaYaSimuMchango}
                onChange={handleInputChange}
                placeholder="e.g., 0712345678 au 0152..."
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="jinaLaAkauntiYaMchango" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                Jina la Akaunti ya Mchango
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

        {/* Section 4: Kamati Kuu Mawasiliano */}
        <div className="space-y-4 pt-2 border-t border-stone-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              4. Kamati Kuu ya Mawasiliano
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
                Hakuna wajumbe wa kamati waliowekwa. Bofya kitufe cha &quot;Ongeza Mjumbe&quot; juu.
              </p>
            ) : (
              data.kamatiKuu.map((member, index) => (
                <div key={member.id} className="flex gap-3 items-end bg-stone-50/60 p-3 rounded-lg border border-stone-100 animate-fadeIn">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-stone-500">Jina la Mjumbe {index + 1}</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleCommitteeChange(member.id, "name", e.target.value)}
                        placeholder="e.g., Bw. John Joel"
                        className="w-full text-xs px-3 py-2 rounded border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 outline-none bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-stone-500">Namba ya Simu</label>
                      <input
                        type="text"
                        value={member.phone}
                        onChange={(e) => handleCommitteeChange(member.id, "phone", e.target.value)}
                        placeholder="e.g., 0712345678"
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
