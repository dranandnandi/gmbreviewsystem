/*
  # Add Kannada language sequence templates
  
  1. New Templates
    - Adds 10 Kannada language sequence templates for General profile type
    - Templates start from day 7 with 15-day intervals
    - Each template includes health tips and educational content in Kannada
    - Proper placeholders for clinic name and phone
    
  2. Content
    - Heart health tips
    - Diabetes management
    - Diet recommendations
    - Warning signs
    - Natural remedies
    - Protein importance
    - Stress management
    
  3. Structure
    - Each template has proper emoji usage
    - Links to relevant Kannada health articles
    - Consistent formatting
*/

-- Insert Kannada language sequence templates
INSERT INTO sequence_templates (
  profile_type,
  message_template,
  language,
  sequence_days,
  sequence_order
) VALUES 
  ('General', 
   E'Heart Health Tips\n\n📌 ನಿಮ್ಮ ಹೃದಯದ ಆರೋಗ್ಯ ಉಳಿಸಿಕೊಳ್ಳಲು ಈ ಸಲಹೆಗಳನ್ನು ಅನುಸರಿಸಿ!\nನಮಸ್ಕಾರ {patient_name},\n\nನಿಮ್ಮ ಹೃದಯ ಆರೋಗ್ಯವಾಗಿರಬೇಕೆಂದರೆ ನೀವು ಈ ಅಭ್ಯಾಸಗಳನ್ನು ಅಳವಡಿಸಿಕೊಳ್ಳಬೇಕು:\n\n✅ ಉಪ್ಪಿನ ಸೇವನೆ ಕಡಿಮೆ ಮಾಡಿ – ಹೆಚ್ಚು ಉಪ್ಪಿನ ಸೇವನೆ ರಕ್ತದೊತ್ತಡ ಹೆಚ್ಚಿಸಲು ಕಾರಣವಾಗಬಹುದು.\n✅ ಹಣ್ಣು-ತರಕಾರಿಗಳನ್ನು ಹೆಚ್ಚಿಸಿ – ಪ್ರತಿ ದಿನ ಹಣ್ಣುಗಳು ಮತ್ತು ತರಕಾರಿಗಳ ಸೇವನೆ ಹೃದಯದ ಆರೋಗ್ಯಕ್ಕೆ ಸಹಕಾರಿ.\n✅ ನಿಯಮಿತ ವ್ಯಾಯಾಮ ಮಾಡಿ – ಪ್ರತಿದಿನ 30 ನಿಮಿಷಗಳ ವ್ಯಾಯಾಮ ಹೃದಯವನ್ನು ಬಲಪಡಿಸುತ್ತದೆ.\n\n📖 ಹೃದಯದ ಆರೋಗ್ಯ ಕಾಪಾಡಿಕೊಳ್ಳಲು ಏನು ಮಾಡಬೇಕು?\n🔗 ಓದಲು ಇಲ್ಲಿ: https://tv9kannada.com/health/follow-these-tips-to-avoid-a-heart-attack-in-kannada-news-pgt-973927.html\n\n✅ ಹೃದಯದ ಆರೋಗ್ಯ ತಪಾಸಣೆ ಅಥವಾ ಪ್ಯಾಥಾಲಜಿ ಟೆಸ್ಟ್‌ಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   7,
   1
  ),
  ('General',
   E'Diabetes and Diet\n\n📌 ಮಧುಮೇಹ ನಿಯಂತ್ರಣಕ್ಕೆ ಸರಿಯಾದ ಆಹಾರ ಆಯ್ಕೆ ಮಾಡಿಕೊಳ್ಳಿ!\nನಮಸ್ಕಾರ {patient_name},\n\nಭಾರತದಲ್ಲಿ ಮಧುಮೇಹದ ಪ್ರಮಾಣ ಏಕೆ ಹೆಚ್ಚುತ್ತಿದೆ?\n\n👉 ಅತಿಯಾಗಿ ಕಾರ್ಬೋಹೈಡ್ರೇಟ್ ಆಹಾರ ಸೇವನೆ – ಚಪಾತಿ, ಭಾತ್, ಜಂಕ್ ಫುಡ್ ಹೆಚ್ಚಾಗಿ ತಿನ್ನುವುದು ರಕ್ತದಲ್ಲಿನ ಶುಗರ್ ಮಟ್ಟವನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.\n👉 ಸಾಂಪ್ರದಾಯಿಕ ಆಹಾರ ಮಾರ್ಗ ಅನುಸರಿಸಿ – ರಾಗಿ, ಜೋಳ, ಕಡಲೆಹಿಟ್ಟು, ಮೆಂತೆ ಈ ರೀತಿ ಆಹಾರಗಳು ಮಧುಮೇಹ ನಿಯಂತ್ರಣಕ್ಕೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ.\n\n📖 ಆಹಾರದ ಸರಿಯಾದ ಆಯ್ಕೆಯ ಮೂಲಕ ಮಧುಮೇಹ ನಿಯಂತ್ರಣ ಹೇಗೆ?\n🔗 ಓದಲು ಇಲ್ಲಿ: https://www.kannadaprabha.com/karnataka/2025/Jan/10/former-cji-carb-rich-diet-major-contributor-of-diabetes-in-india\n\n✅ ಮಧುಮೇಹ ಪರೀಕ್ಷೆ ಅಥವಾ ಆರೋಗ್ಯ ತಪಾಸಣೆಗೆ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   22,
   2
  ),
  ('General',
   E'Diabetes Warning Signs\n\n📌 ನೀವು ಈ ಲಕ್ಷಣಗಳನ್ನು ಗಮನಿಸಿದ್ದರೆ ಎಚ್ಚರವಾಗಿರಿ!\nನಮಸ್ಕಾರ {patient_name},\n\n🌡️ ನೀವು ಬೆಳಗ್ಗೆ ಎದ್ದ ತಕ್ಷಣ ಈ ಲಕ್ಷಣಗಳನ್ನು ಗಮನಿಸುತ್ತಿದ್ದರೆ, ಮಧುಮೇಹದ ಇಙ್ಗಿತವಾಗಬಹುದು:\n\n🚨 ಹಸಿವಿಲ್ಲದಿದ್ದರೂ ಜೋರಾಗಿ ತೊಳಲುವಿಕೆ\n🚨 ಅತಿಯಾಗಿ ದಾಹವಾಗುವುದು\n🚨 ನಿಧಾನಗತಿಯ ಪಚನಕ್ರಿಯೆ ಮತ್ತು ಅತಿಯಾಗಿ ಕ್ಲಾಂತಿ\n\n📖 ಶರೀರದಲ್ಲಿ ಮಧುಮೇಹದ ಮೊದಲ ಹಂತದ ಲಕ್ಷಣಗಳ ಬಗ್ಗೆ ತಿಳಿದುಕೊಳ್ಳಿ!\n🔗 ಓದಲು ಇಲ್ಲಿ: https://kannada.news18.com/photogallery/lifestyle/5-warning-signs-of-diabetes-in-morning-kvd-1984607.html\n\n✅ ಮಧುಮೇಹ ಪರೀಕ್ಷೆಗೆ ಅಥವಾ ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಸೇವೆಗಳಿಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   37,
   3
  ),
  ('General',
   E'Okra Water Benefits\n\n📌 ಬೆಂಡಕಾಯಿ ನೀರು ಕುಡಿಯುವುದು ಮಧುಮೇಹ ನಿಯಂತ್ರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆಯೇ?\nನಮಸ್ಕಾರ {patient_name},\n\n🟢 ಬೆಂಡಕಾಯಿ ನೀರಿನಲ್ಲಿ ಫೈಬರ್ ಮತ್ತು ಆಂಟಿಆಕ್ಸಿಡಂಟ್‌ಗಳು ಅಧಿಕವಾಗಿವೆ. ಇದರಿಂದ:\n\n✔️ ರಕ್ತದಲ್ಲಿನ ಶುಗರ್ ನಿಯಂತ್ರಣವಾಗಬಹುದು\n✔️ ಪಚನಕ್ರಿಯೆ ಉತ್ತಮಗೊಳ್ಳಬಹುದು\n✔️ ಇನ್ಸುಲಿನ್ ಪ್ರತಿಕ್ರಿಯೆ ಸುಧಾರಿಸಬಹುದು\n\n📖 ಬೆಂಡಕಾಯಿ ನೀರಿನ ಆರೋಗ್ಯ ಪ್ರಯೋಜನಗಳ ಬಗ್ಗೆ ಓದಿ!\n🔗 ಓದಲು ಇಲ್ಲಿ: https://zeenews.india.com/kannada/health/webstory/okra-water-to-lowering-blood-sugar-281826\n\n✅ ಮಧುಮೇಹ ಪರೀಕ್ಷೆಗೆ ಅಥವಾ ಆರೋಗ್ಯ ತಪಾಸಣೆಗೆ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   52,
   4
  ),
  ('General',
   E'Superfoods for Diabetes\n\n📌 ಈ ಆಹಾರಗಳು ಮಧುಮೇಹ ನಿಯಂತ್ರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ!\nನಮಸ್ಕಾರ {patient_name},\n\n🥦 ಹೆಚ್ಚು ಫೈಬರ್ ಇರುವ ಆಹಾರ ಸೇವನೆ ಮೂಲಕ ಬ್ಲಡ್ ಶುಗರ್ ನಿಯಂತ್ರಿಸಬಹುದು.\n\nಇವು ಮಧುಮೇಹ ನಿಯಂತ್ರಣಕ್ಕೆ ಸಹಾಯಕ ಎಂದು ಪೋಷಕ ತಜ್ಞರು ಸಲಹೆ ನೀಡುತ್ತಾರೆ:\n\n🍏 ಆಪಲ್ ಮತ್ತು ಬೆರಿಗಳು\n🥑 ಅವಕಾಡೋ\n🌾 ಜೋಳ ಮತ್ತು ರಾಗಿ\n🥜 ಬಾದಾಮಿ, ಕಡಲೆಕಾಯಿ\n\n📖 ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಈ ಲೇಖನ ಓದಿ!\n🔗 ಓದಲು ಇಲ್ಲಿ: https://zeenews.india.com/kannada/health/blood-sugar-lowering-superfoods-278504\n\n✅ ಮಧುಮೇಹ ಪರೀಕ್ಷೆಗೆ ಅಥವಾ ಆರೋಗ್ಯ ತಪಾಸಣೆಗೆ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   67,
   5
  ),
  ('General',
   E'Black Garlic Benefits\n\n🖤 ಹೃದಯದ ಆರೋಗ್ಯಕ್ಕಾಗಿ ಕಪ್ಪು ಬೆಳ್ಳುಳ್ಳಿ – ಆರೋಗ್ಯಕರ ಆಯ್ಕೆ!\nನಮಸ್ಕಾರ {patient_name},\n\nನೀವು ಕಪ್ಪು ಬೆಳ್ಳುಳ್ಳಿ (Black Garlic) ಸೇವನೆಯ ಪ್ರಯೋಜನಗಳನ್ನು ಕೇಳಿದ್ದೀರಾ?\n\n👉 ಇದು ಹೃದಯ ಆರೋಗ್ಯವನ್ನು ಸುಧಾರಿಸುತ್ತದೆ\n👉 ರಕ್ತದಲ್ಲಿನ ಕೋಲೆಸ್ಟರಾಲ್ ಮಟ್ಟವನ್ನು ಕಡಿಮೆ ಮಾಡಬಹುದು\n👉 ಶುಗರ್ ಲೆವೆಲ್ ನಿಯಂತ್ರಣ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ\n\n📖 ಹೃದಯದ ಆರೋಗ್ಯವನ್ನು ಹೆಚ್ಚಿಸಲು ಕಪ್ಪು ಬೆಳ್ಳುಳ್ಳಿಯ ಮಹತ್ವವೇನು?\n🔗 ಓದಲು ಇಲ್ಲಿ: https://zeenews.india.com/kannada/health/black-garlic-eating-black-garlic-improves-heart-health-immunity-268137\n\n✅ ಹೃದಯದ ತಪಾಸಣೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ಪರೀಕ್ಷೆಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   82,
   6
  ),
  ('General',
   E'Types of Diabetes\n\n💉 ನಿಮ್ಮ ದೇಹಕ್ಕೆ ಯಾವ ಪ್ರಕಾರದ ಮಧುಮೇಹ (Diabetes)?\nನಮಸ್ಕಾರ {patient_name},\n\nನೀವು ಮಧುಮೇಹದ ವಿವಿಧ ಪ್ರಕಾರಗಳ ಬಗ್ಗೆ ತಿಳಿದಿರಾ?\n\n✔️ Type 1 Diabetes: ಇನ್ಸುಲಿನ್ ಉತ್ಪತ್ತಿ ಕಡಿಮೆಯಾಗುತ್ತದೆ\n✔️ Type 2 Diabetes: ದೇಹದಲ್ಲಿನ ಇನ್ಸುಲಿನ್ ಬಳಸುವ ಸಾಮರ್ಥ್ಯ ಕಡಿಮೆಯಾಗುತ್ತದೆ\n✔️ Gestational Diabetes: ಗರ್ಭಿಣಿಯರಲ್ಲಿ ಕಂಡುಬರುವ ತಾತ್ಕಾಲಿಕ ಮಧುಮೇಹ\n\n📖 ವಿವಿಧ ಪ್ರಕಾರದ ಮಧುಮೇಹದ ಬಗ್ಗೆ ತಿಳಿದುಕೊಳ್ಳಿ:\n🔗 ಓದಲು ಇಲ್ಲಿ: https://kannada.timesnownews.com/lifestyle/several-types-of-diabetes-of-type-1-diabetes-type-2-diabetes-gestational-diabetes-article-112629083\n\n✅ ಮಧುಮೇಹ ತಪಾಸಣೆಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   97,
   7
  ),
  ('General',
   E'Stress and Diabetes\n\n😰 ಮಧುಮೇಹಕ್ಕೆ ಕೇವಲ ಸಕ್ಕರೆ ಕಾರಣವಲ್ಲ, ಒತ್ತಡವೂ ಪ್ರಮುಖ!\nನಮಸ್ಕಾರ {patient_name},\n\nಹದಗೆಟ್ಟ ಜೀವನಶೈಲಿ ಮತ್ತು ಮನೋಸ್ಥಿತಿ ಮಧುಮೇಹದ ಅಪಾಯ ಹೆಚ್ಚಿಸಬಹುದು!\n\n⚠️ ಒತ್ತಡ (Stress) ಹೆಚ್ಚಿದರೆ ಬ್ಲಡ್ ಶುಗರ್ ಮಟ್ಟ ಹೆಚ್ಚಾಗುತ್ತದೆ\n⚠️ ತಯಾರಿಸಿದ ಆಹಾರ ಪದಾರ್ಥಗಳು ಮಧುಮೇಹದ ಅಪಾಯವನ್ನು ಹೆಚ್ಚಿಸುತ್ತವೆ\n⚠️ ನಿಯಮಿತ ವ್ಯಾಯಾಮ ಮತ್ತು ಆರಾಮದಾಯಕ ಜೀವನಶೈಲಿ ಅನುಸರಿಸಿದರೆ ಮಧುಮೇಹ ನಿಯಂತ್ರಿಸಬಹುದು\n\n📖 ಒತ್ತಡ ಮತ್ತು ಮಧುಮೇಹ ನಡುವಿನ ಸಂಬಂಧವನ್ನು ತಿಳಿದುಕೊಳ್ಳಿ:\n🔗 ಓದಲು ಇಲ್ಲಿ: https://kannada.timesnownews.com/lifestyle/diabetes-awareness-month-not-just-sugar-over-pressure-and-tension-could-up-your-risk-for-type-2-diabetes-says-nutritionist-article-114900757\n\n✅ ಸಂಪೂರ್ಣ ಆರೋಗ್ಯ ತಪಾಸಣೆಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!\n {clinic_name} | {clinic_phone}',
   'kn',
   112,
   8
  ),
  ('General',
   E'Eggs and Diabetes\n\n🥚 ಮಧುಮೇಹ ನಿಯಂತ್ರಣಕ್ಕೆ ಮೊಟ್ಟೆ ಸಹಾಯ ಮಾಡುತ್ತದೆಯಾ?\nನಮಸ್ಕಾರ {patient_name},\n\nಮೊಟ್ಟೆ (Eggs) ಮಧುಮೇಹ ನಿಯಂತ್ರಿಸಲು ಸಹಾಯ ಮಾಡಬಹುದು ಎಂಬುದು ನಿಮಗೆ ಗೊತ್ತೇ?\n\n✔️ ಮೊಟ್ಟೆಯಲ್ಲಿರುವ ಪ್ರೋಟೀನ್ ಹತ್ತಿರದ ಶುಗರ್ ಅಬ್ಸಾರ್ಪ್ಶನ್ ನಿಧಾನಗೊಳಿಸುತ್ತದೆ\n✔️ ಇದರಿಂದ ರಕ್ತದಲ್ಲಿನ ಇನ್ಸುಲಿನ್ ನಿಯಂತ್ರಣ ಸಾಧ್ಯ\n✔️ ದಿನಕ್ಕೊಂದು ಅಡಿಕೆ ಗಾತ್ರದ ಮೊಟ್ಟೆ ಸೇವನೆಯಿಂದ ಹೃದಯ ಆರೋಗ್ಯ ಸುಧಾರಿಸಬಹುದು\n\n📖 ಮೊಟ್ಟೆ ಮತ್ತು ಮಧುಮೇಹ ನಿಯಂತ್ರಣದ ಬಗ್ಗೆ ಸಂಪೂರ್ಣ ಮಾಹಿತಿ:\n🔗 ಓದಲು ಇಲ್ಲಿ: https://tv9kannada.com/health/eggs-health-benefits-in-kannada-can-eggs-help-you-control-diabetes-sct-820342.html\n\n✅ ಆಹಾರ ತಜ್ಞರ ಸಲಹೆ ಅಥವಾ ಲ್ಯಾಬ್ ಪರೀಕ್ಷೆಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!\n📞 {clinic_name} | {clinic_phone}',
   'kn',
   127,
   9
  ),
  ('General',
   E'Proteins for Heart Health\n\n🍖 ಹೃದಯದ ಆರೋಗ್ಯಕ್ಕೆ ಪ್ರೋಟೀನ್‌ಗಳು ಕೇವಲ ಉತ್ತಮವಲ್ಲ, ಅಗತ್ಯವೂ ಹೌದು!\nನಮಸ್ಕಾರ {patient_name},\n\nನೀವು ಈ ಪೋಷಕಾಂಶಗಳನ್ನು ಪ್ರತಿದಿನದ ಆಹಾರದಲ್ಲಿ ಸೇರಿಸಬಹುದೇ?\n\n💪 ಸೊಯಾ ಪ್ರೋಟೀನ್ – ಕೊಲೆಸ್ಟರಾಲ್ ಕಡಿಮೆಗೆ ಸಹಾಯ\n🐟 ಮೀನು ಮತ್ತು ಮೆತ್ತೆ ತೊಗರಿ – ಹೃದಯ ಸ್ನೇಹಿ ಪ್ರೋಟೀನ್‌ ```
ಗಳು
🥜 ಬಾದಾಮಿ, ವಾಲ್ನಟ್ – ಒಮೇಗಾ-3 ಫ್ಯಾಟಿ ಆಮ್ಲಗಳು ಹೃದಯ ಆರೋಗ್ಯಕ್ಕೆ ಉತ್ತಮ

📖 ಹೃದಯಕ್ಕಾಗಿ ಪ್ರೋಟೀನ್ ಅತ್ಯಗತ್ಯ ಎಂಬ ಬಗ್ಗೆ ಓದಿ:
🔗 ಓದಲು ಇಲ್ಲಿ: https://tv9kannada.com/health/heart-health-tips-in-kannada-these-proteins-important-for-heart-care-sct-821506.html

✅ ಹೃದಯ ತಪಾಸಣೆ ಅಥವಾ ಪ್ಯಾಥಾಲಜಿ ಟೆಸ್ಟ್‌ಗಾಗಿ ಸಂಪರ್ಕಿಸಿ!
📞 {clinic_name} | {clinic_phone}',
   'kn',
   142,
   10
  );
```