export interface ExcelContact {
  name: string;
  phone: string;
  originalName?: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  phone: string;
}

export interface InvitationData {
  cardType?: "invitation" | "contribution";
  jinaLaMwalikwa: string;
  wafadhili: string;
  mahaliPaWafadhili: string;
  jinaLaKijana: string;
  uhusianoWaKijana?: string; // e.g. "kijana wao mpendwa"
  tareheYaNdoa: string;
  mahaliPaNdoa: string;
  ainaYaMchango: string;
  jinaLaAkauntiYaMchango: string;
  nambaYaSimuMchango: string;
  ainaYaMchangoPili?: string;
  nambaYaSimuMchangoPili?: string;
  mwishoWaKutoaMchango: string;
  kamatiKuu: CommitteeMember[];
  mtindoWaMapambo: "classic" | "floral" | "royal" | "gold-leaf" | "gold-leaf-full";
}

