// Local sentiment & hazard keywords for offline prototype prediction
const HAZARD_KEYWORDS = [
  'cyberbully', 'bullied', 'bully', 'tease', 'hate', 'harass', 'scared',
  'threat', 'lonely', 'ugly', 'die', 'hurt', 'mean'
];

export const analyzeChildTextInput = async (userText) => {
  const textLower = userText.toLowerCase();
  
  // Cyberbullying / Danger Risk Check
  const detectedRisk = HAZARD_KEYWORDS.some(word => textLower.includes(word));
  
  if (detectedRisk) {
    return {
      stressLevel: 'High / Alert',
      flagged: true,
      category: 'Cyberbullying / Peer Distress',
      reply: "I'm really sorry you're feeling this way. You're safe here. I've noted this, and it might be helpful to share this with a counselor or trusted adult."
    };
  }

  // Standard supportive AI chatbot response template
  return {
    stressLevel: 'Low / Moderate',
    flagged: false,
    category: 'General Reflection',
    reply: "Thank you for sharing that with me! Remember to take deep breaths and take things one step at a time."
  };
};