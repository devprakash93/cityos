import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
const resources = {
  en: {
    translation: {
      "Good Morning": "Good Morning",
      "Good Afternoon": "Good Afternoon",
      "Good Evening": "Good Evening",
      "City Status": "City Status",
      "Traffic Status": "Traffic Status",
      "Air Quality (AQI)": "Air Quality (AQI)",
      "Water Supply": "Water Supply",
      "Electricity": "Electricity",
      "Waste Collection": "Waste Collection",
      "Public Transport": "Public Transport",
      "Emergency Alerts": "Emergency Alerts",
      "Notifications": "Notifications",
      "My Complaints": "My Complaints",
      "Active": "Active",
      "Resolved": "Resolved",
      "Pending": "Pending",
      "Quick Actions": "Quick Actions",
      "Report Problem": "Report Problem",
      "Track Complaint": "Track Complaint",
      "Emergency SOS": "Emergency SOS",
      "View Traffic": "View Traffic",
      "View Pollution": "View Pollution",
      "Transport": "Transport",
      "Recent Complaints": "Recent Complaints",
      "Recent Notifications": "Recent Notifications"
    }
  },
  or: {
    translation: {
      "Good Morning": "ଶୁଭ ସକାଳ",
      "Good Afternoon": "ଶୁଭ ଅପରାହ୍ନ",
      "Good Evening": "ଶୁଭ ସନ୍ଧ୍ୟା",
      "City Status": "ସହରର ସ୍ଥିତି",
      "Traffic Status": "ଟ୍ରାଫିକ୍ ସ୍ଥିତି",
      "Air Quality (AQI)": "ବାୟୁ ଗୁଣବତ୍ତା (AQI)",
      "Water Supply": "ଜଳ ଯୋଗାଣ",
      "Electricity": "ବିଦ୍ୟୁତ୍",
      "Waste Collection": "ଆବର୍ଜନା ସଂଗ୍ରହ",
      "Public Transport": "ଜନସାଧାରଣ ପରିବହନ",
      "Emergency Alerts": "ଜରୁରୀକାଳୀନ ସୂଚନା",
      "Notifications": "ବିଜ୍ଞପ୍ତିଗୁଡ଼ିକ",
      "My Complaints": "ମୋର ଅଭିଯୋଗ",
      "Active": "ସକ୍ରିୟ",
      "Resolved": "ସମାଧାନ ହୋଇଛି",
      "Pending": "ପେଣ୍ଡିଂ",
      "Quick Actions": "ଦ୍ରୁତ କାର୍ଯ୍ୟ",
      "Report Problem": "ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ",
      "Track Complaint": "ଅଭିଯୋଗ ଟ୍ରାକ୍ କରନ୍ତୁ",
      "Emergency SOS": "ଜରୁରୀକାଳୀନ SOS",
      "View Traffic": "ଟ୍ରାଫିକ୍ ଦେଖନ୍ତୁ",
      "View Pollution": "ପ୍ରଦୂଷଣ ଦେଖନ୍ତୁ",
      "Transport": "ପରିବହନ",
      "Recent Complaints": "ସାମ୍ପ୍ରତିକ ଅଭିଯୋଗଗୁଡ଼ିକ",
      "Recent Notifications": "ସାମ୍ପ୍ରତିକ ବିଜ୍ଞପ୍ତିଗୁଡ଼ିକ"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
