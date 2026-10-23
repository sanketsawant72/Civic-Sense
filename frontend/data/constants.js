// ============================================================
// CivicSense — Static data: categories, statuses, colors, i18n
// ============================================================

// Default map center — set to geographic center of India.
// Override with your municipality's coordinates when deploying.
export const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India center
// Legacy alias kept so existing code using ASHTA still works
export const ASHTA = DEFAULT_CENTER;

export const CATEGORIES = [
  {
    id: 'pothole',
    label: { en: 'Pothole & Road Damage', hi: 'गड्ढे और सड़क क्षति', mr: 'खड्डे व रस्ता नुकसान' },
    color: '#C96E10',
    dept: 'Public Works Department',
    kw: ['pothole','potholes','road crack','cracked road','road damage','broken road','uneven road','asphalt','tar road'],
  },
  {
    id: 'garbage',
    label: { en: 'Garbage & Waste', hi: 'कचरा और अपशिष्ट', mr: 'कचरा व टाकाऊ पदार्थ' },
    color: '#6B4F2A',
    dept: 'Sanitation Department',
    kw: ['garbage','trash','waste','litter','dump','overflowing bin','dustbin','rubbish','stink','smell'],
  },
  {
    id: 'drainage',
    label: { en: 'Drainage & Sewage', hi: 'जल निकासी और सीवेज', mr: 'गटार व सांडपाणी' },
    color: '#2E6F95',
    dept: 'Drainage & Sewage Department',
    kw: ['drainage','sewage','drain','blocked drain','manhole','gutter','stagnant water','clog'],
  },
  {
    id: 'water',
    label: { en: 'Water Supply & Leakage', hi: 'जल आपूर्ति और रिसाव', mr: 'पाणीपुरवठा व गळती' },
    color: '#1B8F8F',
    dept: 'Water Supply Department',
    kw: ['water leak','pipe burst','leakage','water supply','no water','pipeline','tap water','burst pipe'],
  },
  {
    id: 'streetlight',
    label: { en: 'Streetlight & Electrical', hi: 'स्ट्रीट लाइट और बिजली', mr: 'रस्ता दिवा व वीज' },
    color: '#A98600',
    dept: 'Electrical Department',
    kw: ['streetlight','street light','electric pole','wire','power line','dark street','transformer','sparking','no light'],
  },
  {
    id: 'construction',
    label: { en: 'Illegal Construction', hi: 'अवैध निर्माण', mr: 'अवैध बांधकाम' },
    color: '#8E3B46',
    dept: 'Town Planning Department',
    kw: ['illegal construction','encroachment','unauthorized','without permission','footpath blocked','shop extension'],
  },
  {
    id: 'other',
    label: { en: 'Other Civic Issue', hi: 'अन्य नागरी समस्या', mr: 'इतर नागरी समस्या' },
    color: '#5B6472',
    dept: 'General Administration',
    kw: [],
  },
];

export function catById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export const STATUSES = ['Submitted','Under Review','Assigned','In Progress','Resolved','Rejected'];

export const STATUS_COLOR = {
  'Submitted':     '#5B6472',
  'Under Review':  '#A98600',
  'Assigned':      '#2E6F95',
  'In Progress':   '#E8871E',
  'Resolved':      '#2F9E5B',
  'Rejected':      '#D64545',
};

export const PRIORITY_COLOR = {
  Low:      '#2F9E5B',
  Medium:   '#A98600',
  High:     '#E8871E',
  Critical: '#D64545',
};

export const HIGH_SEV_KW = [
  'urgent','danger','dangerous','accident','fire','collapse','collapsed',
  'severe','major','injury','overflowing','flooding','flooded',
  'live wire','exposed wire','electrocution','sinkhole',
];

export const MED_SEV_KW = [
  'broken','damaged','blocked','leak','leaking','crack','cracked',
  'unsafe','deep','large','huge',
];

// i18n — UI chrome strings only
export const T = {
  en: {
    home: 'Home', report: 'Report Issue', mine: 'My Complaints',
    cmap: 'Community Map', track: 'Track Complaint',
    dash: 'Dashboard', manage: 'Manage Complaints', amap: 'Map Overview',
    citizen: 'Citizen', admin: 'Admin',
    resetData: 'Reset demo data', appName: 'CivicSense', appTag: 'Civic Reporting Platform',
  },
  hi: {
    home: 'होम', report: 'शिकायत दर्ज करें', mine: 'मेरी शिकायतें',
    cmap: 'सामुदायिक मानचित्र', track: 'शिकायत ट्रैक करें',
    dash: 'डैशबोर्ड', manage: 'शिकायतें प्रबंधित करें', amap: 'मानचित्र अवलोकन',
    citizen: 'नागरिक', admin: 'प्रशासक',
    resetData: 'डेमो डेटा रीसेट करें', appName: 'CivicSense', appTag: 'नागरिक शिकायत प्रणाली',
  },
  mr: {
    home: 'मुख्यपृष्ठ', report: 'तक्रार नोंदवा', mine: 'माझ्या तक्रारी',
    cmap: 'सामुदायिक नकाशा', track: 'तक्रार ट्रॅक करा',
    dash: 'डॅशबोर्ड', manage: 'तक्रारी व्यवस्थापित करा', amap: 'नकाशा विहंगावलोकन',
    citizen: 'नागरिक', admin: 'प्रशासक',
    resetData: 'डेमो डेटा रीसेट करा', appName: 'CivicSense', appTag: 'नागरी तक्रार प्रणाली',
  },
};

export function t(key, lang) {
  return (T[lang] && T[lang][key]) || T.en[key] || key;
}
