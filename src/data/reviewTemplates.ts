export const reviewTemplates = [
  "My visit to [Clinic Name] on [Date of Visit] with Dr. [Doctor's Name] was exceptional. Their compassionate approach and clear explanations reassured me throughout my [Treatment/Service]. Highly recommended!",
  "Dr. [Doctor's Name] at [Clinic Name] provided outstanding care during my [Treatment/Service] on [Date of Visit]. The clinic's welcoming environment and attention to detail made all the difference.",
  "I had an excellent experience at [Clinic Name] on [Date of Visit]. Dr. [Doctor's Name] was attentive and explained my [Treatment/Service] thoroughly, ensuring I felt comfortable throughout.",
  "During my visit to [Clinic Name] on [Date of Visit], Dr. [Doctor's Name] demonstrated expertise and genuine care during my [Treatment/Service]. The professionalism was truly commendable.",
  "[Clinic Name] exceeded my expectations during my [Treatment/Service] on [Date of Visit] with Dr. [Doctor's Name]. Their attention to detail and compassionate approach were outstanding."
];

export const getRandomTemplate = () => {
  const randomIndex = Math.floor(Math.random() * reviewTemplates.length);
  return reviewTemplates[randomIndex];
};

export const formatTemplate = (
  template: string,
  {
    clinicName,
    doctorName,
    treatment,
    date
  }: {
    clinicName: string;
    doctorName: string;
    treatment: string;
    date: string;
  }
) => {
  return template
    .replace(/\[Clinic Name\]/g, clinicName)
    .replace(/\[Doctor's Name\]/g, doctorName)
    .replace(/\[Treatment\/Service\]/g, treatment)
    .replace(/\[Date of Visit\]/g, date);
};