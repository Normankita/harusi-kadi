export interface CommitteeMember {
  id: string;
  name: string;
  phone: string;
}

export interface InvitationData {
  jinaLaMwalikwa: string;
  wafadhili: string;
  mahaliPaWafadhili: string;
  jinaLaKijana: string;
  tareheYaNdoa: string;
  mahaliPaNdoa: string;
  ainaYaMchango: string;
  jinaLaAkauntiYaMchango: string;
  nambaYaSimuMchango: string;
  mwishoWaKutoaMchango: string;
  kamatiKuu: CommitteeMember[];
  mtindoWaMapambo: "classic" | "floral" | "royal";
}
