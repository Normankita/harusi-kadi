export type Language = 'sw' | 'en';

export const translations = {
  sw: {
    // App
    appName: 'Kadi za Harusi',
    tagline: 'Mtengenezaji wa Kadi za Harusi',
    premiumBadge: 'Toleo la Kifahari',

    // Card types
    cardTypeInvitation: 'Kadi ya Mwaliko',
    cardTypeContribution: 'Kadi ya Mchango',

    // Steps
    step1: 'Jaza Fomu',
    step2: 'Angalia Kadi',
    step3: 'Tuma au Pakua',

    // Preview
    previewTitle: 'Uhakiki wa Moja kwa Moja (Live Preview)',
    previewHint: 'Inavyoonekana hapa ndivyo itakavyopakuliwa',

    // Form meta
    formTitle: 'Taarifa za Sherehe',
    formTitleContribution: 'Taarifa za Mchango',
    formDesc: 'Jaza fomu hii kwa Kiswahili ili kutengeneza kadi yako ya mwaliko wa harusi.',
    formDescContribution: 'Jaza fomu hii kwa Kiswahili ili kutengeneza kadi ya mchango wa harusi.',

    // Design
    designStyle: 'Mtindo wa Mapambo (Card Design Style)',
    portrait: 'Wima (Portrait)',
    landscape: 'Lalo (Landscape)',
    styleClassicGold: 'Classic Gold',
    styleElegantFloral: 'Elegant Floral',
    styleRoyalBaroque: 'Royal Baroque',
    styleGoldLeaf: 'Gold Leaf Corners',
    styleLuxuryGold: 'Luxury Gold Leaf (Lalo)',

    // Section 1
    sectionGuest: '1. Mwalikwa & Waandaaji (Waalikaji)',
    guestName: 'Jina la Mwalikwa (Kadi Moja)',
    guestNamePlaceholder: 'e.g., Bw. & Bibi Joseph Nyerere',
    guestNameHint: 'Ukiacha wazi, kadi itabaki na nukta ya kuandika kwa mkono.',
    guestNameBlockedHint: 'Ondoa Excel iliyopakiwa ili kuandika jina moja.',
    guestNameBlockedPlaceholder: 'Imezuiwa kwa sababu umechagua Excel',
    uploadExcel: 'Pakia Majina mengi (Excel / CSV)',
    downloadTemplate: 'Kiolezo',
    chooseFile: 'Chagua Faili',
    fileLoaded: 'Waalikwa: {count}',
    removeFile: 'Ondoa faili',
    contactListTitle: 'Orodha ya Waalikwa',
    guestsInExcel: 'Watu {count} wameandikwa kwenye Excel',
    addPerson: 'Ongeza Mtu',
    showAll: '...na wengine {count} — Bonyeza kuona wote',
    showLess: 'Ficha — Onyesha {count} tu',
    fileErrorTitle: 'Hitilafu ya Faili',
    excelFormatHint: 'Muundo unaohitajika: S/N | Jina | Simu',
    excelUploadHint: 'Pakua kiolezo au weka faili lenye safu: S/N, Jina, Simu.',
    colNum: '#',
    colName: 'Jina',
    colPhone: 'Simu',
    colStatus: 'Hali',
    colEdit: 'Hariri',
    notSent: '◌ Haijatumwa',
    fullName: 'Jina kamili',

    // Common actions
    save: 'Hifadhi',
    cancel: 'Ghairi',
    edit: 'Hariri',
    delete: 'Futa',
    close: 'Funga',
    finish: 'Maliza',
    loading: 'Inapakia...',
    error: 'Hitilafu',
    success: 'Imefanikiwa',

    familyName: 'Jina la Familia / Waalika',
    familyNamePlaceholder: 'e.g., Familia ya Bw. John Joel na Mercy Joel',
    familyLocation: 'Mahali pa Wafadhili',
    familyLocationPlaceholder: 'e.g., Ipagala - Dodoma',

    // Section 2
    sectionCouple: '2. Taarifa za Maharusi',
    groomName: 'Jina la Kijana / Maharusi',
    groomNamePlaceholder: 'e.g., Bright Mujulizi Kimaro',
    relationship: 'Uhusiano (e.g., Kijana wao mpendwa)',
    relationshipPlaceholder: 'e.g., kijana wao mpendwa',
    weddingDate: 'Tarehe ya Ndoa',
    venue: 'Mahali pa Ibada / Ukumbi',
    venueContribution: 'Mji/Wilaya ya Ndoa',
    venuePlaceholder: 'e.g., Kanisa la KKKT Ipagala, mjini Dodoma',
    venuePlaceholderContribution: 'e.g., mjini Dodoma',

    // Section 3
    sectionPayment: '3. Maelezo ya Michango & Malipo',
    paymentMethod: 'Njia ya Mchango (1)',
    paymentMethodOptional: 'Njia ya Mchango (2) - Hiari',
    selectMethod: '-- Chagua Njia --',
    noSecondMethod: '-- Hakuna Njia ya Pili --',
    accountNumber: 'Namba ya Simu / Akaunti (1)',
    accountNumberOptional: 'Namba ya Simu / Akaunti (2) - Hiari',
    accountName: 'Mpokeaji wa Mchango (Jina la Akaunti)',
    deadline: 'Mwisho wa Kutoa Mchango',

    // Section 4
    sectionCommittee: '4. Mawasiliano / Kamati Kuu',
    addCommitteeMember: 'Ongeza Mjumbe',
    removeCommitteeMember: 'Ondoa Mjumbe',
    memberName: 'Jina la Mhusika {num}',
    memberNamePlaceholder: 'e.g., John Nchwali Joel',
    memberPhone: 'Namba ya Simu',
    memberPhonePlaceholder: 'e.g., 0754260831',
    noCommittee: 'Hakuna mawasiliano yaliyowekwa. Bofya kitufe cha "Ongeza Mjumbe" juu.',

    // Actions panel
    actionsTitle: 'Utoaji na Ushiriki (Actions)',
    actionsHint: 'Pakua kadi yako au ushiriki moja kwa moja na waalikwa.',
    actionsHintBatch: 'Utapakua faili {count} kwa pamoja (Batch Mode).',
    downloadPng: 'Picha (PNG)',
    downloadPdf: 'Nyaraka (PDF)',
    downloadDocx: 'Word (.docx)',
    exporting: 'Inapakua...',
    batchImages: 'Picha Zote ({count})',
    batchPdfs: 'PDF Zote ({count})',
    batchDocs: 'Word Zote ({count})',

    // WhatsApp manual
    whatsappSectionTitle: 'Mwaliko wa Haraka kupitia WhatsApp',
    whatsappPlaceholder: 'Namba ya mwalikwa (mfano: 0712345678)',
    sendWhatsapp: 'Tuma WhatsApp',
    copyMessage: 'Nakili',
    copied: 'Imenakiliwa!',
    whatsappHint: '* Kitufe hiki kitafungua mazungumzo ya WhatsApp na kutuma ujumbe uliotengenezwa tayari kwa Kiswahili.',

    // WhatsApp bulk
    bulkSendTitle: 'Tuma Kadi kwa Wingi kupitia WhatsApp',
    bulkContactsLoaded: 'Watu {count} wameandikwa kwenye Excel',
    waOfflineTitle: 'Huduma ya kutuma haipo mtandaoni sasa',
    waOfflineDesc: 'Pakua kadi na uitumie manually. Au anza seva ya backend na ubadilishe NEXT_PUBLIC_BACKEND_URL kwenye .env.local.',
    waConnected: 'WhatsApp Imeunganishwa ✓',
    waDisconnected: 'WhatsApp haijaunganishwa — Scan QR Code hapa chini',
    waChecking: 'Inakagua hali ya WhatsApp...',
    waHowTo: 'Jinsi ya Kuunganisha WhatsApp:',
    waHowToDesc: 'Fungua WhatsApp → Vifaa Vilivyounganishwa → Unganisha Kifaa → Scan QR Code hii',
    waitingQR: 'Inasubiri QR Code...',
    bulkSendButton: 'Tuma Kadi kwa Watu {count} Moja kwa Moja',
    bulkSendProgress: 'Inatuma...',
    connectFirst: '↑ Unganisha WhatsApp kwanza kwa scan QR Code hapo juu',

    // Modal — capture phase
    bulkPrepTitle: 'Inaandaa Picha za Kadi...',
    bulkPrepDesc: 'Picha {current} kati ya {total} inaandaliwa...',
    bulkSendingTitle: 'Inatuma Kadi za WhatsApp',
    bulkSendingDesc: 'Kadi zinaundwa na kutumwa moja kwa moja...',
    preparingImages: 'Inaandaa picha {current} kati ya {total}',
    placingName: 'Inaweka jina la:',
    pleaseWait: 'Tafadhali subiri — kadi zinaandaliwa na jina la kila mwalikwa...',

    // Modal — progress
    sentProgress: 'Imetumwa {sent} kati ya {total}',
    sendingTo: 'Inatuma kwa:',
    successCount: 'Mafanikio',
    failedCount: 'Imeshindwa',
    timeRemaining: 'Muda uliobaki (takriban):',

    // Modal — completion
    bulkSendComplete: 'Kutuma Kumekamilika!',
    bulkSendSuccess: 'Kadi {count} zimetumwa kwa mafanikio',
    bulkSendFailed: '{count} zimeshindwa',
    failedList: 'Orodha ya Waliopungukiwa ({count}):',
    downloadFailed: 'Pakua Orodha ya Waliopungukiwa',

    // Batch export overlay
    downloadBatchTitle: 'Inaandaa Kadi za Harusi',
    downloadBatchTitleContribution: 'Inaandaa Kadi za Mchango',
    downloadBatchHint: 'Tafadhali usifunge kivinjari chako wakati wa kupakua.',
    guestBeingProcessed: 'Mwalikwa Anayesindikwa',
    guestProgress: 'Mwalikwa wa {current} kati ya {total}',

    // SMS section
    smsTitle: 'Tuma SMS Moja kwa Moja',
    smsSingle: 'Mtu Mmoja',
    smsBulk: 'Wote kutoka Excel ({count})',
    smsPhonePlaceholder: 'Namba ya simu (mfano: 0712345678)',
    smsMessagePlaceholder: 'Andika ujumbe wako hapa...',
    smsBulkMessagePlaceholder: 'Andika ujumbe... tumia {{name}} kwa jina la kila mtu',
    smsNameHelper: 'Andika {{name}} ili kujaza jina la kila mtu moja kwa moja',
    fillTemplate: '✨ Jaza Ujumbe',
    smsBulkCount: 'Utatuma SMS kwa watu {count} wote waliopo kwenye Excel',
    smsSend: 'Tuma SMS',
    smsBulkSendBtn: 'Tuma SMS kwa Watu {count}',
    smsSending: 'Inatuma...',
    smsSentOk: 'SMS imetumwa kwa mafanikio ✓',
    smsSendFailed: 'Imeshindwa kutuma SMS. Jaribu tena.',
    smsSentCount: 'Zimetumwa: {count}',
    smsFailedCount: 'Zimeshindwa: {count}',

    // SMS fallback
    smsFallbackTitle: 'Tuma SMS kwa Waliopungukiwa',
    smsFallbackDesc: 'Watu {count} hawakupokea kadi kwa WhatsApp. Ungependa kutuma SMS badala yake?',
    smsFallbackYes: 'Tuma SMS kwa Watu {count}',
    smsFallbackNo: 'Hapana, Asante',
    smsFallbackSending: 'Inatuma SMS {count}...',
    smsFallbackSentResult: 'SMS {count} zimetumwa.',
    smsFallbackFailedResult: '{count} hazikutumwa.',

    // Footer
    footerMadeWith: 'Imetengenezwa kwa',
    footerFor: 'kwa ajili ya Maharusi wa Kitanzania.',
    footerDesigned: 'Imesanifiwa na kuundwa na',
    footerCopyright: 'Hakimiliki © {year} NorZah. Haki zote zimehifadhiwa.',

    // Settings bar
    language: 'Lugha',
    theme: 'Mandhari',
    themeLight: 'Mwanga',
    themeDark: 'Giza',
    themeGold: 'Dhahabu',
    themeForest: 'Msitu',
    settings: 'Mipangilio',

    // Phone errors
    phoneInvalid: 'Namba ya simu si sahihi. Mfano: 0712345678',
    phoneRequired: 'Tafadhali weka namba ya WhatsApp.',
  },

  en: {
    // App
    appName: 'Wedding Cards',
    tagline: 'Wedding Card Generator',
    premiumBadge: 'Premium Edition',

    // Card types
    cardTypeInvitation: 'Invitation Card',
    cardTypeContribution: 'Contribution Card',

    // Steps
    step1: 'Fill Form',
    step2: 'Preview Card',
    step3: 'Send or Download',

    // Preview
    previewTitle: 'Live Preview',
    previewHint: 'What you see here is what will be downloaded',

    // Form meta
    formTitle: 'Event Information',
    formTitleContribution: 'Contribution Information',
    formDesc: 'Fill in this form to generate your wedding invitation card.',
    formDescContribution: 'Fill in this form to generate a wedding contribution card.',

    // Design
    designStyle: 'Card Design Style',
    portrait: 'Portrait',
    landscape: 'Landscape',
    styleClassicGold: 'Classic Gold',
    styleElegantFloral: 'Elegant Floral',
    styleRoyalBaroque: 'Royal Baroque',
    styleGoldLeaf: 'Gold Leaf Corners',
    styleLuxuryGold: 'Luxury Gold Leaf (Landscape)',

    // Section 1
    sectionGuest: '1. Guest & Organizers',
    guestName: 'Guest Name (Single Card)',
    guestNamePlaceholder: 'e.g., Mr. & Mrs. Joseph Nyerere',
    guestNameHint: 'Leave empty to keep blank for handwriting.',
    guestNameBlockedHint: 'Remove the uploaded Excel to type a single name.',
    guestNameBlockedPlaceholder: 'Locked — Excel file is selected',
    uploadExcel: 'Upload Multiple Names (Excel / CSV)',
    downloadTemplate: 'Template',
    chooseFile: 'Choose File',
    fileLoaded: 'Contacts: {count}',
    removeFile: 'Remove file',
    contactListTitle: 'Contact List',
    guestsInExcel: '{count} people loaded from Excel',
    addPerson: 'Add Person',
    showAll: '...{count} more — Click to show all',
    showLess: 'Hide — Show {count} only',
    fileErrorTitle: 'File Error',
    excelFormatHint: 'Required format: S/N | Name | Phone',
    excelUploadHint: 'Download the template or upload a file with: S/N, Name, Phone.',
    colNum: '#',
    colName: 'Name',
    colPhone: 'Phone',
    colStatus: 'Status',
    colEdit: 'Edit',
    notSent: '◌ Not sent',
    fullName: 'Full name',

    // Common actions
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    finish: 'Finish',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',

    familyName: 'Family Name / Hosts',
    familyNamePlaceholder: 'e.g., Family of Mr. John Joel and Mercy Joel',
    familyLocation: 'Hosts Location',
    familyLocationPlaceholder: 'e.g., Ipagala - Dodoma',

    // Section 2
    sectionCouple: '2. Couple Information',
    groomName: 'Groom / Couple Name',
    groomNamePlaceholder: 'e.g., Bright Mujulizi Kimaro',
    relationship: 'Relationship (e.g., beloved child)',
    relationshipPlaceholder: 'e.g., their beloved child',
    weddingDate: 'Wedding Date',
    venue: 'Church / Venue',
    venueContribution: 'City / Region of Wedding',
    venuePlaceholder: 'e.g., KKKT Ipagala Church, Dodoma',
    venuePlaceholderContribution: 'e.g., Dodoma City',

    // Section 3
    sectionPayment: '3. Contribution & Payment Details',
    paymentMethod: 'Payment Method (1)',
    paymentMethodOptional: 'Payment Method (2) — Optional',
    selectMethod: '-- Select Method --',
    noSecondMethod: '-- No Second Method --',
    accountNumber: 'Phone / Account Number (1)',
    accountNumberOptional: 'Phone / Account Number (2) — Optional',
    accountName: 'Account Name (Receiver)',
    deadline: 'Contribution Deadline',

    // Section 4
    sectionCommittee: '4. Contact / Main Committee',
    addCommitteeMember: 'Add Member',
    removeCommitteeMember: 'Remove Member',
    memberName: 'Member {num} Name',
    memberNamePlaceholder: 'e.g., John Nchwali Joel',
    memberPhone: 'Phone Number',
    memberPhonePlaceholder: 'e.g., 0754260831',
    noCommittee: 'No contacts added. Click "Add Member" above.',

    // Actions panel
    actionsTitle: 'Export & Share',
    actionsHint: 'Download your card or share directly with guests.',
    actionsHintBatch: 'You will download {count} files at once (Batch Mode).',
    downloadPng: 'Image (PNG)',
    downloadPdf: 'Document (PDF)',
    downloadDocx: 'Word (.docx)',
    exporting: 'Exporting...',
    batchImages: 'All Images ({count})',
    batchPdfs: 'All PDFs ({count})',
    batchDocs: 'All Word ({count})',

    // WhatsApp manual
    whatsappSectionTitle: 'Quick WhatsApp Invitation',
    whatsappPlaceholder: 'Guest number (e.g., 0712345678)',
    sendWhatsapp: 'Send WhatsApp',
    copyMessage: 'Copy',
    copied: 'Copied!',
    whatsappHint: '* This button opens a WhatsApp conversation with a pre-written message.',

    // WhatsApp bulk
    bulkSendTitle: 'Bulk Send via WhatsApp',
    bulkContactsLoaded: '{count} people loaded from Excel',
    waOfflineTitle: 'Sending service is currently offline',
    waOfflineDesc: 'Download cards and share manually. Or start the backend server and update NEXT_PUBLIC_BACKEND_URL in .env.local.',
    waConnected: 'WhatsApp Connected ✓',
    waDisconnected: 'WhatsApp not connected — Scan QR Code below',
    waChecking: 'Checking WhatsApp status...',
    waHowTo: 'How to Connect WhatsApp:',
    waHowToDesc: 'Open WhatsApp → Linked Devices → Link a Device → Scan this QR Code',
    waitingQR: 'Waiting for QR Code...',
    bulkSendButton: 'Send Cards to {count} People',
    bulkSendProgress: 'Sending...',
    connectFirst: '↑ Connect WhatsApp first by scanning the QR Code above',

    // Modal — capture phase
    bulkPrepTitle: 'Preparing Card Images...',
    bulkPrepDesc: 'Preparing image {current} of {total}...',
    bulkSendingTitle: 'Sending WhatsApp Cards',
    bulkSendingDesc: 'Cards are being created and sent one by one...',
    preparingImages: 'Preparing image {current} of {total}',
    placingName: 'Placing name of:',
    pleaseWait: "Please wait — cards are being prepared with each guest's name...",

    // Modal — progress
    sentProgress: 'Sent {sent} of {total}',
    sendingTo: 'Sending to:',
    successCount: 'Success',
    failedCount: 'Failed',
    timeRemaining: 'Estimated time remaining:',

    // Modal — completion
    bulkSendComplete: 'Sending Complete!',
    bulkSendSuccess: '{count} cards sent successfully',
    bulkSendFailed: '{count} failed',
    failedList: 'Failed Recipients ({count}):',
    downloadFailed: 'Download Failed List',

    // Batch export overlay
    downloadBatchTitle: 'Preparing Wedding Cards',
    downloadBatchTitleContribution: 'Preparing Contribution Cards',
    downloadBatchHint: 'Please do not close your browser while downloading.',
    guestBeingProcessed: 'Guest Being Processed',
    guestProgress: 'Guest {current} of {total}',

    // SMS section
    smsTitle: 'Send SMS Directly',
    smsSingle: 'Single Person',
    smsBulk: 'All from Excel ({count})',
    smsPhonePlaceholder: 'Phone number (e.g., 0712345678)',
    smsMessagePlaceholder: 'Type your message here...',
    smsBulkMessagePlaceholder: "Type message... use {{name}} for each person's name",
    smsNameHelper: 'Type {{name}} to personalise for each recipient',
    fillTemplate: '✨ Fill Message',
    smsBulkCount: 'You will send SMS to all {count} people from Excel',
    smsSend: 'Send SMS',
    smsBulkSendBtn: 'Send SMS to {count} People',
    smsSending: 'Sending...',
    smsSentOk: 'SMS sent successfully ✓',
    smsSendFailed: 'Failed to send SMS. Please try again.',
    smsSentCount: 'Sent: {count}',
    smsFailedCount: 'Failed: {count}',

    // SMS fallback
    smsFallbackTitle: 'Send SMS to Failed Recipients',
    smsFallbackDesc: '{count} people did not receive the card via WhatsApp. Would you like to send SMS instead?',
    smsFallbackYes: 'Send SMS to {count} People',
    smsFallbackNo: 'No, Thank You',
    smsFallbackSending: 'Sending {count} SMS messages...',
    smsFallbackSentResult: '{count} SMS messages sent.',
    smsFallbackFailedResult: '{count} failed to send.',

    // Footer
    footerMadeWith: 'Made with',
    footerFor: 'for Tanzanian couples.',
    footerDesigned: 'Designed and built by',
    footerCopyright: 'Copyright © {year} NorZah. All rights reserved.',

    // Settings bar
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeGold: 'Gold',
    themeForest: 'Forest',
    settings: 'Settings',

    // Phone errors
    phoneInvalid: 'Invalid phone number. Example: 0712345678',
    phoneRequired: 'Please enter a WhatsApp number.',
  },
} as const;

export type TranslationKey = keyof typeof translations.sw;

export function t(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return Object.entries(params).reduce(
    (str, [key, val]) => str.replace(`{${key}}`, String(val)),
    text
  );
}
