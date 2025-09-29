/*
  # Update General Profile Sequence Templates

  1. Changes
    - Update existing General profile sequence templates with new content
    - Add new sequence templates for General profile
    - Maintain sequence order and days between messages

  2. Security
    - Maintains existing RLS policies
    - Templates remain globally accessible to authenticated users
*/

-- Update existing templates and insert new ones for General profile
INSERT INTO sequence_templates (profile_type, message_template, sequence_days, sequence_order)
VALUES 
  -- First message (15 days)
  ('General', 'Hello,  

Did you know that **rural-to-urban migration in India** is increasing the risk of diabetes? Changes in lifestyle, poor diet, and limited healthcare access are contributing to this growing concern.  

📖 **Diabetes in India: From Rural Resilience to Urban Alarm**  
🔗 Read here: [https://www.pressreader.com/india/the-indian-express/20241114/281749864884955](https://www.pressreader.com/india/the-indian-express/20241114/281749864884955)  

✅ **For diabetes-related blood tests and health check-ups, contact us at:**  
📞 **{clinic_name} | {clinic_phone}**', 15, 1),

  -- Second message (30 days)
  ('General', 'Hello,  

Many studies suggest that **lifestyle changes, including diet and exercise, can help in reversing Type 2 Diabetes**. Learn what medical experts have to say about diabetes prevention and management.  

📖 **Can lifestyle changes reverse diabetes? Insights from TOI Medithon**  
🔗 Read here: [https://timesofindia.indiatimes.com/life-style/health-fitness/health-news/can-lifestyle-changes-reverse-diabetes-insights-from-toi-medithon-part-4/articleshow/116431276.cms](https://timesofindia.indiatimes.com/life-style/health-fitness/health-news/can-lifestyle-changes-reverse-diabetes-insights-from-toi-medithon-part-4/articleshow/116431276.cms)  

✅ **For HbA1c, fasting blood sugar, and diabetes-related tests, reach out to us:**  
📞 **{clinic_name} | {clinic_phone}**', 30, 2),

  -- Third message (45 days)
  ('General', 'Hello,  

Managing **diabetes in older adults** requires a personalized approach. In India, **more than 43% of diabetic patients are above the age of 60**, making it crucial to focus on age-specific diabetes care.  

📖 **Challenges of Managing Diabetes in the Elderly**  
🔗 Read here: [https://timesofindia.indiatimes.com/life-style/health-fitness/health-news/challenges-of-managing-diabetes-in-the-elderly/articleshow/115384840.cms](https://timesofindia.indiatimes.com/life-style/health-fitness/health-news/challenges-of-managing-diabetes-in-the-elderly/articleshow/115384840.cms)  

✅ **Regular diabetes check-ups can help prevent complications. Contact us for tests:**  
📞 **{clinic_name} | {clinic_phone}**', 45, 3),

  -- Fourth message (60 days)
  ('General', 'Hello,  

India''s **rapid urbanization** is leading to an alarming rise in **chronic diseases like diabetes**. A combination of **poor diet, sedentary lifestyle, and stress** is driving this increase. Learn how early detection and a healthy routine can help.  

📖 **Diabetes Management in the Time of Urbanisation: An Indian Perspective**  
🔗 Read here: [https://economictimes.indiatimes.com/industry/healthcare/biotech/healthcare/diabetes-management-in-the-time-of-urbanisation-an-indian-perspective/articleshow/112015823.cms](https://economictimes.indiatimes.com/industry/healthcare/biotech/healthcare/diabetes-management-in-the-time-of-urbanisation-an-indian-perspective/articleshow/112015823.cms)  

✅ **Early diabetes screening is essential. Contact us for blood tests and consultations:**  
📞 **{clinic_name} | {clinic_phone}**', 60, 4),

  -- Fifth message (75 days)
  ('General', 'Hello,  

The future of **diabetes care in India and Southeast Asia** depends on **early prevention, lifestyle awareness, and community-based healthcare initiatives**. Find out what healthcare experts recommend.  

📖 **Diabetes Care in India and Southeast Asia: The Way Forward**  
🔗 Read here: [https://link.springer.com/article/10.1007/s13410-025-01450-9](https://link.springer.com/article/10.1007/s13410-025-01450-9)  

✅ **Regular monitoring can prevent complications. Get tested today at:**  
📞 **{clinic_name} | {clinic_phone}**', 75, 5),

  -- Sixth message (90 days)
  ('General', 'Hello,  

Even among diagnosed patients, **only 25% manage to control their diabetes effectively**. In addition, **40% of the general population and 50% of Indian women (aged 30-49) are at high risk** of developing diabetes.  

📖 **A Comprehensive Approach to Diabetes Care**  
🔗 Read here: [https://economictimes.indiatimes.com/industry/healthcare/biotech/healthcare/a-comprehensive-approach-to-diabetes-care/articleshow/116009136.cms](https://economictimes.indiatimes.com/industry/healthcare/biotech/healthcare/a-comprehensive-approach-to-diabetes-care/articleshow/116009136.cms)  

✅ **Regular glucose and HbA1c tests help in diabetes control. Book your test today:**  
📞 **{clinic_name} | {clinic_phone}**', 90, 6),

  -- Seventh message (105 days)
  ('General', 'Hello,  

Diabetes care in India is undergoing **major transformation**, with **new treatment strategies and technologies** offering better management options. Learn more about the **latest innovations in diabetes care**.  

📖 **Targeted Transformation of Diabetes Care in India**  
🔗 Read here: [https://www.pressreader.com/india/biospectrum-asia9gut/20241106/281797109509246](https://www.pressreader.com/india/biospectrum-asia9gut/20241106/281797109509246)  

✅ **Stay ahead with regular diabetes screenings. Book your test today:**  
📞 **{clinic_name} | {clinic_phone}**', 105, 7),

  -- Eighth message (120 days)
  ('General', 'Hello,  

Diabetes cases in India are rising rapidly due to **urbanization, sedentary lifestyles, and unhealthy diets**. The **most economically productive age group (40-59 years) is the hardest hit**, affecting overall productivity and well-being.  

📖 **Diabetes in India: A Growing Crisis Demands Immediate Action**  
🔗 Read here: [https://pharma.economictimes.indiatimes.com/news/pharma-industry/diabetes-in-india-a-growing-crisis-demands-immediate-action/115256552](https://pharma.economictimes.indiatimes.com/news/pharma-industry/diabetes-in-india-a-growing-crisis-demands-immediate-action/115256552)  

✅ **Take control of your health with early diagnosis. Contact us for tests:**  
📞 **{clinic_name} | {clinic_phone}**', 120, 8),

  -- Ninth message (135 days)
  ('General', 'Hello,  

India''s **Diabetes Care Market is evolving rapidly**, with **digital health solutions playing a major role in disease management**. Learn how **technology is transforming diabetes care**.  

📖 **India Diabetes Care Market Report 2024: Focus on Digital Health**  
🔗 Read here: [https://finance.yahoo.com/news/india-diabetes-care-market-report-091100471.html](https://finance.yahoo.com/news/india-diabetes-care-market-report-091100471.html)  

✅ **Monitor your blood sugar levels with regular testing. Book your test today:**  
📞 **{clinic_name} | {clinic_phone}**', 135, 9)

ON CONFLICT (profile_type, sequence_order) 
DO UPDATE SET 
  message_template = EXCLUDED.message_template,
  sequence_days = EXCLUDED.sequence_days;