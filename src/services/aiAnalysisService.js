// Modules M6 (AI Stress Prediction Engine) & M15 (Cyberbullying Detection)[cite: 1]
const HAZARD_KEYWORDS = [
  'bully', 'bullied', 'tease', 'teased', 'cyberbully', 'mean', 'threat',
  'hate', 'scared', 'hurt', 'abuse', 'harass', 'alone', 'lonely', 'ugly',
  'die', 'hopeless', 'quit'
];

const ACADEMIC_KEYWORDS = ['exam', 'grades', 'failed', 'homework', 'study', 'teacher', 'school'];

export const analyzeChildTextInput = async (userText) => {
  const textLower = userText.toLowerCase();

  // M15: Cyberbullying and Risk Detection[cite: 1]
  const isCyberbullyingRisk = HAZARD_KEYWORDS.some(word => textLower.includes(word));
  const isAcademicRisk = ACADEMIC_KEYWORDS.some(word => textLower.includes(word));

  if (isCyberbullyingRisk) {
    return {
      stressLevel: 'Critical Alert',
      flagged: true,
      category: 'Cyberbullying & Peer Distress',
      reply: "I hear you, and I want you to know you are safe here. What happened is not your fault. I have flagged this support check so parents/counselors can help keep you safe.",
      triggerAlert: true // For M11 Emergency Notification System[cite: 1]
    };
  }

  if (isAcademicRisk) {
    return {
      stressLevel: 'Moderate Stress',
      flagged: false,
      category: 'Academic Pressure',
      reply: "Schoolwork and exams can definitely feel overwhelming! Let's take a 3-second deep breath together. Remember, doing your best is what truly matters.",
      triggerAlert: false
    };
  }

  return {
    stressLevel: 'Low Risk',
    flagged: false,
    category: 'General Wellness',
    reply: "Thank you for sharing that with me! You are doing great. Is there anything else on your mind today?",
    triggerAlert: false
  };
};