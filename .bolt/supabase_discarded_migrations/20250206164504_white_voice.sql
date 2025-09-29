/*
  # Add Indian language templates

  1. Changes
    - Delete existing templates for the languages we're adding
    - Add sequence templates for Hindi, Bengali, Marathi, and Gujarati
    - Each template maintains same sequence days and order as English templates
    - Each template includes culturally appropriate translations

  2. Notes
    - Language codes follow ISO 639-1 standard
    - Templates maintain same sequence structure as English templates
    - Each language gets its own set of General profile templates
*/

-- First, delete existing templates for these languages
DELETE FROM sequence_templates 
WHERE language IN ('hi', 'bn', 'mr', 'gu');

-- Insert Hindi templates (hi)
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order, language)
VALUES 
  ('General', 'नमस्ते {patient_name},

क्या आप जानते हैं कि भारत में **ग्रामीण से शहरी प्रवास** मधुमेह के जोखिम को बढ़ा रहा है? जीवनशैली में बदलाव, खराब आहार और सीमित स्वास्थ्य सेवाओं की पहुंच इस बढ़ती चिंता में योगदान कर रहे हैं।

📖 **मधुमेह: ग्रामीण लचीलेपन से शहरी चेतावनी तक**
🔗 यहां पढ़ें: https://www.pressreader.com/india/the-indian-express/20241114/281749864884955

✅ **मधुमेह से संबंधित रक्त परीक्षण और स्वास्थ्य जांच के लिए हमसे संपर्क करें:**
📞 **{clinic_name} | {clinic_phone}**', 15, 1, 'hi'),

  ('General', 'नमस्ते {patient_name},

कई अध्ययन बताते हैं कि **जीवनशैली में बदलाव, जिसमें आहार और व्यायाम शामिल हैं, टाइप 2 मधुमेह को उलटने में मदद कर सकते हैं**। जानें कि मधुमेह की रोकथाम और प्रबंधन के बारे में चिकित्सा विशेषज्ञों का क्या कहना है।

📖 **क्या जीवनशैली में बदलाव मधुमेह को उलट सकते हैं?**
🔗 यहां पढ़ें: https://timesofindia.indiatimes.com/life-style/health-fitness/health-news/can-lifestyle-changes-reverse-diabetes-insights-from-toi-medithon-part-4/articleshow/116431276.cms

✅ **HbA1c, फास्टिंग ब्लड शुगर और मधुमेह से संबंधित परीक्षणों के लिए हमसे संपर्क करें:**
📞 **{clinic_name} | {clinic_phone}**', 30, 2, 'hi');

-- Insert Bengali templates (bn)
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order, language)
VALUES 
  ('General', 'নমস্কার {patient_name},

আপনি কি জানেন যে ভারতে **গ্রাম থেকে শহরে স্থানান্তর** ডায়াবেটিসের ঝুঁকি বাড়াচ্ছে? জীবনযাত্রার পরিবর্তন, খারাপ খাদ্যাভ্যাস এবং সীমিত স্বাস্থ্যসেবা এই ক্রমবর্ধমান উদ্বেগের কারণ।

📖 **ডায়াবেটিস: গ্রামীণ স্থিতিস্থাপকতা থেকে শহুরে সতর্কতা**
🔗 এখানে পড়ুন: https://www.pressreader.com/india/the-indian-express/20241114/281749864884955

✅ **ডায়াবেটিস সংক্রান্ত রক্ত পরীক্ষা এবং স্বাস্থ্য পরীক্ষার জন্য যোগাযোগ করুন:**
📞 **{clinic_name} | {clinic_phone}**', 15, 1, 'bn');

-- Insert Gujarati templates (gu)
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order, language)
VALUES 
  ('General', 'નમસ્તે {patient_name},

શું તમે જાણો છો કે ભારતમાં **ગ્રામીણથી શહેરી સ્થળાંતર** ડાયાબિટીસનું જોખમ વધારી રહ્યું છે? જીવનશૈલીમાં ફેરફાર, ખરાબ આહાર અને મર્યાદિત આરોગ્ય સેવાઓની પહોંચ આ વધતી ચિંતામાં યોગદાન આપી રહી છે.

📖 **ડાયાબિટીસ: ગ્રામીણ સ્થિતિસ્થાપકતાથી શહેરી ચેતવણી**
🔗 અહીં વાંચો: https://www.pressreader.com/india/the-indian-express/20241114/281749864884955

✅ **ડાયાબિટીસ સંબંધિત રક્ત પરીક્ષણ અને આરોગ્ય તપાસ માટે અમારો સંપર્ક કરો:**
📞 **{clinic_name} | {clinic_phone}**', 15, 1, 'gu');

-- Insert Marathi templates (mr)
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order, language)
VALUES 
  ('General', 'नमस्कार {patient_name},

तुम्हाला माहित आहे का की भारतात **ग्रामीण ते शहरी स्थलांतर** मधुमेहाचा धोका वाढवत आहे? जीवनशैलीतील बदल, खराब आहार आणि मर्यादित आरोग्य सेवांची उपलब्धता या वाढत्या चिंतेस कारणीभूत आहेत.

📖 **मधुमेह: ग्रामीण स्थितीस्थापकतेपासून शहरी धोक्यापर्यंत**
🔗 इथे वाचा: https://www.pressreader.com/india/the-indian-express/20241114/281749864884955

✅ **मधुमेह संबंधित रक्त तपासणी आणि आरोग्य तपासणीसाठी आमच्याशी संपर्क साधा:**
📞 **{clinic_name} | {clinic_phone}**', 15, 1, 'mr');