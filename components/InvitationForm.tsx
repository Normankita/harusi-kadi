"use client";

import React, { useState, useEffect } from "react";
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
  Upload,
  Download,
  Pencil,
  Check,
  X,
  AlertTriangle,
  UserPlus
} from "lucide-react";
import * as XLSX from "xlsx";
import { InvitationData, CommitteeMember, ExcelContact } from "../types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface InvitationFormProps {
  data: InvitationData;
  onChange: (newData: InvitationData) => void;
  excelData: ExcelContact[] | null;
  setExcelData: (data: ExcelContact[] | null) => void;
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

const isValidPhone = (phone: string): boolean => {
  if (!phone.trim()) return true;
  const cleaned = phone.replace(/\D/g, "");
  return (
    (cleaned.length === 10 && /^0[67]\d{8}$/.test(cleaned)) ||
    (cleaned.length === 12 && /^255[67]\d{8}$/.test(cleaned))
  );
};

interface ContactRow {
  id: string;
  name: string;
  phone: string;
  originalName?: string;
}

function parsePhoneNumbers(raw: string): string[] {
  if (!raw) return [];
  const str = raw.toString().trim();
  if (!str) return [];

  // Unambiguous separators — split on them
  if (/[,/\\;|]/.test(str)) {
    return str
      .split(/[,/\\;|]+/)
      .map(p => p.replace(/\s+/g, '').trim())
      .filter(p => p.length >= 9);
  }

  // No separators — strip spaces and check if it looks like one number
  const stripped = str.replace(/\s+/g, '');
  if (/^\+?\d{9,13}$/.test(stripped)) {
    return [stripped];
  }

  // Multiple numbers separated only by spaces — merge token groups
  const tokens = str.trim().split(/\s+/);
  const numbers: string[] = [];
  let current = '';

  for (const token of tokens) {
    const cleaned = token.replace(/\D/g, '');
    if (!cleaned) continue;
    if (current === '') {
      current = cleaned;
    } else if (current.length >= 9 && current.length <= 13) {
      numbers.push(current);
      current = cleaned;
    } else {
      current = current + cleaned;
    }
  }
  if (current && current.length >= 9) numbers.push(current);

  return numbers.length > 0 ? numbers : stripped.length >= 9 ? [stripped] : [];
}

function normalizeParsedPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return '255' + cleaned.substring(1);
  if (cleaned.length === 9 && !cleaned.startsWith('255')) return '255' + cleaned;
  return cleaned;
}

export default function InvitationForm({
  data,
  onChange,
  excelData,
  setExcelData,
  excelFileName,
  setExcelFileName
}: InvitationFormProps) {
  const { language, tr } = useLanguage();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [excelError, setExcelError] = useState<string>("");
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (excelData) {
      setContacts(
        excelData.map((row, i) => ({
          id: `row-${i}-${Date.now()}`,
          name: row.name,
          phone: row.phone,
        }))
      );
    } else {
      setContacts([]);
    }
  }, [excelData]);

  const syncToParent = (updated: ContactRow[]) => {
    setExcelData(updated.map(c => ({ name: c.name, phone: c.phone, originalName: c.originalName })));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["S/N", "Jina", "Simu"],
      [1, "Mama Mariam", "0712345678"],
      [2, "Baba Joseph", "0754987654"],
      [3, "Shangazi Grace", "0765111222"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Waalikwa");
    const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbOut], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Kiolezo_Waalikwa.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError("");
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
          setExcelError("Faili halina data yoyote. Hakikisha faili ina data.");
          return;
        }

        const headers = rows[0].map((h: any) => String(h || "").trim().toLowerCase());
        const jinaIndex = headers.findIndex((h: string) => h === "jina" || h === "recipient name" || h === "recipient" || h === "name");
        const simuIndex = headers.findIndex((h: string) => h === "simu" || h === "phone" || h === "simu ya mwalikwa" || h === "phone number" || h === "recipient phone");

        if (jinaIndex === -1) {
          setExcelError(
            `Safu ya "Jina" haikupatikana. Safu inayohitajika: S/N | Jina | Simu. ` +
            `Pakua kiolezo na ujaribu tena.`
          );
          setExcelFileName("");
          return;
        }

        const dataRows: ContactRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const name = String(row[jinaIndex] || "").trim();
          if (!name) continue;

          const phoneRaw = simuIndex !== -1 && row[simuIndex] !== undefined
            ? String(row[simuIndex] || "").trim()
            : "";

          const phones = parsePhoneNumbers(phoneRaw)
            .map(normalizeParsedPhone)
            .filter(p => p.length >= 9);

          if (phones.length <= 1) {
            dataRows.push({
              id: `row-${i}-${Date.now()}`,
              name,
              phone: phones[0] ?? phoneRaw,
            });
          } else {
            phones.forEach((phone, phoneIdx) => {
              dataRows.push({
                id: `row-${i}-${phoneIdx}-${Date.now()}`,
                name: `${name} (${phoneIdx + 1})`,
                phone,
                originalName: name,
              });
            });
          }
        }

        if (dataRows.length === 0) {
          setExcelError("Hakuna majina yaliyopatikana. Hakikisha data iko chini ya kichwa cha habari 'Jina'.");
          setExcelFileName("");
          return;
        }

        setContacts(dataRows);
        setExcelData(dataRows.map(c => ({ name: c.name, phone: c.phone, originalName: c.originalName })));
      } catch (err) {
        console.error(err);
        setExcelError("Imeshindwa kusoma faili. Hakikisha ni faili la Excel (.xlsx, .xls) au CSV.");
        setExcelFileName("");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const startEdit = (contact: ContactRow) => {
    setEditingId(contact.id);
    setEditValues({ name: contact.name, phone: contact.phone });
  };

  const saveEdit = () => {
    const updated = contacts.map(c =>
      c.id === editingId ? { ...c, name: editValues.name, phone: editValues.phone } : c
    );
    setContacts(updated);
    syncToParent(updated);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const deleteContact = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    if (updated.length === 0) {
      setExcelData(null);
      setExcelFileName("");
    } else {
      syncToParent(updated);
    }
  };

  const saveNewContact = () => {
    if (!newContact.name.trim()) return;
    const newRow: ContactRow = {
      id: `manual-${Date.now()}`,
      name: newContact.name.trim(),
      phone: newContact.phone.trim(),
    };
    const updated = [...contacts, newRow];
    setContacts(updated);
    syncToParent(updated);
    setNewContact({ name: "", phone: "" });
    setAddingNew(false);
  };

  const handleCommitteeChange = (id: string, field: "name" | "phone", value: string) => {
    const updatedCommittee = data.kamatiKuu.map((member) =>
      member.id === id ? { ...member, [field]: value } : member
    );
    onChange({ ...data, kamatiKuu: updatedCommittee });
  };

  const addCommitteeMember = () => {
    const newMember: CommitteeMember = { id: crypto.randomUUID(), name: "", phone: "" };
    onChange({ ...data, kamatiKuu: [...data.kamatiKuu, newMember] });
  };

  const removeCommitteeMember = (id: string) => {
    onChange({ ...data, kamatiKuu: data.kamatiKuu.filter((member) => member.id !== id) });
  };

  const PREVIEW_COUNT = 10;
  const visibleContacts = showAllContacts ? contacts : contacts.slice(0, PREVIEW_COUNT);
  const hiddenCount = contacts.length - PREVIEW_COUNT;

  return (
    <div className="bg-ui-card rounded-2xl border border-ui-border shadow-sm p-6 md:p-8 xl:p-10 space-y-8 max-h-[85vh] overflow-y-auto">
      <div className="border-b border-ui-border pb-4">
        <h2 className="text-2xl font-serif font-bold text-ui-text flex items-center gap-2">
          <Heart className="text-amber-500 fill-amber-500 w-6 h-6 animate-pulse" />
          {data.cardType === "contribution" ? tr('formTitleContribution') : tr('formTitle')}
        </h2>
        <p className="text-ui-muted text-sm mt-1">
          {data.cardType === "contribution" ? tr('formDescContribution') : tr('formDesc')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Design Style Selector */}
        <div className="space-y-3 pb-5 border-b border-ui-border">
          <label className="text-xs font-bold text-ui-text uppercase tracking-wider">
            {tr('designStyle')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 text-[10px] font-bold text-ui-muted uppercase tracking-wider mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-2 bg-ui-border rounded-[1px]" />
              <span>{tr('portrait')}</span>
            </div>
            {[
              { value: "classic", label: tr('styleClassicGold'), desc: tr('portrait') },
              { value: "floral", label: tr('styleElegantFloral'), desc: tr('portrait') },
              { value: "royal", label: tr('styleRoyalBaroque'), desc: tr('portrait') },
              { value: "gold-leaf", label: tr('styleGoldLeaf'), desc: tr('portrait') }
            ].map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => onChange({ ...data, mtindoWaMapambo: style.value as any })}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  data.mtindoWaMapambo === style.value
                    ? "border-amber-600 bg-amber-50/50 text-amber-900 shadow-xs"
                    : "border-ui-border bg-ui-card text-ui-muted hover:bg-ui-bg"
                }`}
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-2 h-3 border border-current rounded-[1px] opacity-75" />
                  <span className="text-xs font-bold">{style.label}</span>
                </div>
                <span className="text-[9px] text-ui-muted mt-1 leading-tight">{style.desc}</span>
              </button>
            ))}

            <div className="col-span-2 text-[10px] font-bold text-ui-muted uppercase tracking-wider mt-2 flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-ui-border rounded-[1px]" />
              <span>{tr('landscape')}</span>
            </div>
            {[
              { value: "gold-leaf-full", label: tr('styleLuxuryGold'), desc: tr('landscape') }
            ].map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => onChange({ ...data, mtindoWaMapambo: style.value as any })}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  data.mtindoWaMapambo === style.value
                    ? "border-amber-600 bg-amber-50/50 text-amber-900 shadow-xs"
                    : "border-ui-border bg-ui-card text-ui-muted hover:bg-ui-bg"
                }`}
              >
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-3 h-2 border border-current rounded-[1px] opacity-75" />
                  <span className="text-xs font-bold">{style.label}</span>
                </div>
                <span className="text-[9px] text-ui-muted mt-1 leading-tight">{style.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 1 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            {tr('sectionGuest')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
              {/* Guest name */}
              <div className="space-y-1.5">
                <label htmlFor="jinaLaMwalikwa" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('guestName')}
                </label>
                <input
                  id="jinaLaMwalikwa"
                  type="text"
                  name="jinaLaMwalikwa"
                  value={data.jinaLaMwalikwa}
                  onChange={handleInputChange}
                  disabled={!!excelData}
                  placeholder={excelData ? tr('guestNameBlockedPlaceholder') : tr('guestNamePlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all disabled:opacity-50"
                />
                <p className="text-[10px] text-ui-muted italic">
                  {excelData ? tr('guestNameBlockedHint') : tr('guestNameHint')}
                </p>
              </div>

              {/* Excel upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('uploadExcel')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
                    title={tr('downloadTemplate')}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {tr('downloadTemplate')}
                  </button>

                  {!excelData ? (
                    <div className="relative flex-1">
                      <input
                        type="file"
                        id="excel-upload"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="excel-upload"
                        className="flex items-center justify-center gap-2 w-full text-xs font-semibold px-4 py-2 rounded-lg border border-dashed border-amber-600/40 bg-amber-50/20 text-amber-900 hover:bg-amber-50 cursor-pointer transition-all text-center"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-700" />
                        <span>{tr('chooseFile')}</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-1 p-2 rounded-lg border border-emerald-200 bg-emerald-50/40 text-emerald-950 text-xs min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold truncate" title={excelFileName}>{excelFileName}</p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {tr('fileLoaded', { count: contacts.length })}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExcelData(null);
                          setExcelFileName("");
                          setContacts([]);
                          setExcelError("");
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-all ml-1.5 shrink-0 cursor-pointer"
                        title={tr('removeFile')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {excelError && (
                  <div className="flex gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs animate-toast-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{tr('fileErrorTitle')}</p>
                      <p className="text-red-600 mt-0.5">{excelError}</p>
                      <p className="text-red-500 mt-1 italic">{tr('excelFormatHint')}</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-ui-muted italic">{tr('excelUploadHint')}</p>
              </div>
            </div>

            {/* Contact table */}
            {contacts.length > 0 && (
              <div className="mt-4 space-y-3 border border-ui-border rounded-xl overflow-hidden">
                <div className="bg-ui-bg px-4 py-3 flex items-center justify-between border-b border-ui-border">
                  <div>
                    <p className="text-xs font-bold text-ui-text">{tr('contactListTitle')}</p>
                    <p className="text-[10px] text-ui-muted mt-0.5">
                      {(() => {
                        const uniquePeople = new Set(contacts.map(c => c.originalName || c.name)).size;
                        const totalNums = contacts.length;
                        if (uniquePeople !== totalNums) {
                          return language === 'en'
                            ? `${uniquePeople} people (${totalNums} phone numbers) loaded`
                            : `Watu ${uniquePeople} (namba ${totalNums} za simu) wameandikwa`;
                        }
                        return tr('guestsInExcel', { count: contacts.length });
                      })()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAddingNew(true); setShowAllContacts(true); }}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {tr('addPerson')}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-ui-bg text-ui-muted uppercase tracking-wider text-[10px]">
                        <th className="px-3 py-2 text-left font-bold w-10">{tr('colNum')}</th>
                        <th className="px-3 py-2 text-left font-bold">{tr('colName')}</th>
                        <th className="px-3 py-2 text-left font-bold">{tr('colPhone')}</th>
                        <th className="px-3 py-2 text-left font-bold w-24">{tr('colStatus')}</th>
                        <th className="px-3 py-2 text-center font-bold w-16">{tr('colEdit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border">
                      {visibleContacts.map((contact, idx) => {
                        const phoneInvalid = contact.phone.trim() !== "" && !isValidPhone(contact.phone);
                        const isEditing = editingId === contact.id;

                        return (
                          <tr
                            key={contact.id}
                            className={`transition-colors ${isEditing ? "bg-amber-50/30" : "hover:bg-ui-bg/60"}`}
                          >
                            <td className="px-3 py-2 text-ui-muted font-mono">{idx + 1}</td>
                            {isEditing ? (
                              <>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={editValues.name}
                                    onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                                    className="w-full text-xs px-2 py-1 rounded border border-amber-300 focus:ring-1 focus:ring-amber-200 outline-none bg-white"
                                    autoFocus
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={editValues.phone}
                                    onChange={e => setEditValues(v => ({ ...v, phone: e.target.value }))}
                                    placeholder="0712345678"
                                    className="w-full text-xs px-2 py-1 rounded border border-amber-300 focus:ring-1 focus:ring-amber-200 outline-none bg-white"
                                  />
                                </td>
                                <td className="px-3 py-2"></td>
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <button type="button" onClick={saveEdit} className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all cursor-pointer" title={tr('save')}>
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={cancelEdit} className="p-1 rounded bg-stone-100 text-stone-500 hover:bg-stone-200 transition-all cursor-pointer" title={tr('cancel')}>
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 font-medium text-ui-text">{contact.name}</td>
                                <td className={`px-3 py-2 font-mono ${phoneInvalid ? "text-red-500 font-semibold" : "text-ui-muted"}`}>
                                  {phoneInvalid ? (
                                    <span className="inline-flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-red-400" />
                                      {contact.phone}
                                    </span>
                                  ) : (
                                    contact.phone || <span className="text-ui-border italic">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-ui-bg text-ui-muted">
                                    {tr('notSent')}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <button type="button" onClick={() => startEdit(contact)} className="p-1 rounded text-ui-muted hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer" title={tr('edit')}>
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={() => deleteContact(contact.id)} className="p-1 rounded text-ui-muted hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer" title={tr('delete')}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}

                      {addingNew && (
                        <tr className="bg-emerald-50/30">
                          <td className="px-3 py-2 text-ui-muted font-mono">{contacts.length + 1}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={newContact.name}
                              onChange={e => setNewContact(v => ({ ...v, name: e.target.value }))}
                              placeholder={tr('fullName')}
                              className="w-full text-xs px-2 py-1 rounded border border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none bg-white"
                              autoFocus
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={newContact.phone}
                              onChange={e => setNewContact(v => ({ ...v, phone: e.target.value }))}
                              placeholder="0712345678"
                              className="w-full text-xs px-2 py-1 rounded border border-emerald-300 focus:ring-1 focus:ring-emerald-200 outline-none bg-white"
                            />
                          </td>
                          <td className="px-3 py-2"></td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={saveNewContact} className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all cursor-pointer" title={tr('save')}>
                                <Check className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => { setAddingNew(false); setNewContact({ name: "", phone: "" }); }} className="p-1 rounded bg-stone-100 text-stone-500 hover:bg-stone-200 transition-all cursor-pointer" title={tr('cancel')}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!showAllContacts && hiddenCount > 0 && (
                  <div className="px-4 pb-3">
                    <button type="button" onClick={() => setShowAllContacts(true)} className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold transition-colors cursor-pointer">
                      {tr('showAll', { count: hiddenCount })}
                    </button>
                  </div>
                )}
                {showAllContacts && contacts.length > PREVIEW_COUNT && (
                  <div className="px-4 pb-3">
                    <button type="button" onClick={() => setShowAllContacts(false)} className="text-[11px] text-ui-muted hover:text-ui-text font-semibold transition-colors cursor-pointer">
                      {tr('showLess', { count: PREVIEW_COUNT })}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
              <div className="space-y-1.5">
                <label htmlFor="wafadhili" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('familyName')}
                </label>
                <input
                  id="wafadhili"
                  type="text"
                  name="wafadhili"
                  value={data.wafadhili}
                  onChange={handleInputChange}
                  placeholder={tr('familyNamePlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mahaliPaWafadhili" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('familyLocation')}
                </label>
                <input
                  id="mahaliPaWafadhili"
                  type="text"
                  name="mahaliPaWafadhili"
                  value={data.mahaliPaWafadhili}
                  onChange={handleInputChange}
                  placeholder={tr('familyLocationPlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-4 pt-2 border-t border-ui-border">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            {tr('sectionCouple')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
              <div className="space-y-1.5">
                <label htmlFor="jinaLaKijana" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('groomName')}
                </label>
                <input
                  id="jinaLaKijana"
                  type="text"
                  name="jinaLaKijana"
                  value={data.jinaLaKijana}
                  onChange={handleInputChange}
                  placeholder={tr('groomNamePlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="uhusianoWaKijana" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('relationship')}
                </label>
                <input
                  id="uhusianoWaKijana"
                  type="text"
                  name="uhusianoWaKijana"
                  value={data.uhusianoWaKijana || ""}
                  onChange={handleInputChange}
                  placeholder={tr('relationshipPlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
              <div className="space-y-1.5">
                <label htmlFor="tareheYaNdoa" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('weddingDate')}
                </label>
                <input
                  id="tareheYaNdoa"
                  type="date"
                  name="tareheYaNdoa"
                  value={data.tareheYaNdoa}
                  onChange={handleInputChange}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mahaliPaNdoa" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ui-muted" />
                  {data.cardType === "contribution" ? tr('venueContribution') : tr('venue')}
                </label>
                <input
                  id="mahaliPaNdoa"
                  type="text"
                  name="mahaliPaNdoa"
                  value={data.mahaliPaNdoa}
                  onChange={handleInputChange}
                  placeholder={data.cardType === "contribution" ? tr('venuePlaceholderContribution') : tr('venuePlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="space-y-4 pt-2 border-t border-ui-border">
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
            {tr('sectionPayment')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
              <div className="space-y-1.5">
                <label htmlFor="ainaYaMchango" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('paymentMethod')}
                </label>
                <select
                  id="ainaYaMchango"
                  name="ainaYaMchango"
                  value={data.ainaYaMchango}
                  onChange={handleInputChange}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all cursor-pointer"
                >
                  <option value="">{tr('selectMethod')}</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="nambaYaSimuMchango" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('accountNumber')}
                </label>
                <input
                  id="nambaYaSimuMchango"
                  type="text"
                  name="nambaYaSimuMchango"
                  value={data.nambaYaSimuMchango}
                  onChange={handleInputChange}
                  placeholder="e.g., 0754388813"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>

            {data.cardType === "contribution" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="ainaYaMchangoPili" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-ui-muted" />
                    {tr('paymentMethodOptional')}
                  </label>
                  <select
                    id="ainaYaMchangoPili"
                    name="ainaYaMchangoPili"
                    value={data.ainaYaMchangoPili || ""}
                    onChange={handleInputChange}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="">{tr('noSecondMethod')}</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="nambaYaSimuMchangoPili" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-ui-muted" />
                    {tr('accountNumberOptional')}
                  </label>
                  <input
                    id="nambaYaSimuMchangoPili"
                    type="text"
                    name="nambaYaSimuMchangoPili"
                    value={data.nambaYaSimuMchangoPili || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 0152081488900"
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
              <div className="space-y-1.5">
                <label htmlFor="jinaLaAkauntiYaMchango" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('accountName')}
                </label>
                <input
                  id="jinaLaAkauntiYaMchango"
                  type="text"
                  name="jinaLaAkauntiYaMchango"
                  value={data.jinaLaAkauntiYaMchango}
                  onChange={handleInputChange}
                  placeholder="e.g., Mercy Joel Nchwali"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mwishoWaKutoaMchango" className="text-xs font-semibold text-ui-text flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ui-muted" />
                  {tr('deadline')}
                </label>
                <input
                  id="mwishoWaKutoaMchango"
                  type="date"
                  name="mwishoWaKutoaMchango"
                  value={data.mwishoWaKutoaMchango}
                  onChange={handleInputChange}
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="space-y-4 pt-2 border-t border-ui-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              {tr('sectionCommittee')}
            </h3>
            <button
              type="button"
              onClick={addCommitteeMember}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {tr('addCommitteeMember')}
            </button>
          </div>

          <div className="space-y-3">
            {data.kamatiKuu.length === 0 ? (
              <p className="text-xs text-ui-muted italic bg-ui-bg/50 p-4 rounded-lg text-center border border-dashed border-ui-border">
                {tr('noCommittee')}
              </p>
            ) : (
              data.kamatiKuu.map((member, index) => (
                <div key={member.id} className="flex gap-3 items-end bg-ui-bg/60 p-3 rounded-lg border border-ui-border animate-toast-in">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-ui-muted">
                        {tr('memberName', { num: index + 1 })}
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleCommitteeChange(member.id, "name", e.target.value)}
                        placeholder={tr('memberNamePlaceholder')}
                        className="w-full text-xs px-3 py-2 rounded border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-1 focus:ring-amber-100 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-ui-muted">
                        {tr('memberPhone')}
                      </label>
                      <input
                        type="text"
                        value={member.phone}
                        onChange={(e) => handleCommitteeChange(member.id, "phone", e.target.value)}
                        placeholder={tr('memberPhonePlaceholder')}
                        className="w-full text-xs px-3 py-2 rounded border border-ui-border bg-ui-card text-ui-text focus:border-amber-500 focus:ring-1 focus:ring-amber-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCommitteeMember(member.id)}
                    className="p-2 text-ui-muted hover:text-red-500 hover:bg-red-50 rounded transition-all border border-transparent hover:border-red-100 cursor-pointer"
                    title={tr('removeCommitteeMember')}
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
