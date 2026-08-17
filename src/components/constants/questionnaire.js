// Questions extracted from KidCare AI Child Stress Assessment Questionnaire[cite: 2]
export const QUESTIONNAIRE_DATA = [
  // Academic Stress (Q1-Q7)[cite: 2]
  { id: 1, category: 'Academic Stress', question: 'How have you been feeling about your schoolwork lately?' },
  { id: 2, category: 'Academic Stress', question: 'Do you often worry about your exams or your grades?' },
  { id: 3, category: 'Academic Stress', question: 'Is it hard for you to concentrate when you are studying?' },
  { id: 4, category: 'Academic Stress', question: 'Do you ever feel pressured to do really well in school?' },
  { id: 5, category: 'Academic Stress', question: 'Do homework or assignments sometimes make you feel overwhelmed?' },
  { id: 6, category: 'Academic Stress', question: 'Do you feel nervous before a test or presentation?' },
  { id: 7, category: 'Academic Stress', question: 'Have you ever avoided studying because it made you feel stressed?' },

  // Emotional Well-being (Q8-Q14)[cite: 2]
  { id: 8, category: 'Emotional Well-being', question: 'Do you sometimes feel sad without knowing why?' },
  { id: 9, category: 'Emotional Well-being', question: 'Have you been feeling nervous or anxious lately?' },
  { id: 10, category: 'Emotional Well-being', question: 'Do little things make you feel angry or irritated easily?' },
  { id: 11, category: 'Emotional Well-being', question: 'Do you ever feel lonely, even when other people are around?' },
  { id: 12, category: 'Emotional Well-being', question: 'Have you been feeling emotionally tired or drained?' },

  // School Environment & Cyberbullying (Q26-Q30)[cite: 2]
  { id: 26, category: 'School Environment', question: 'Do you feel comfortable and happy when you are at school?' },
  { id: 27, category: 'School Environment', question: 'Do you feel accepted by your classmates?' },
  { id: 29, category: 'School & Online Safety', question: 'Has anyone at school or online ever bullied, teased, or made you feel bad?' },

  // Coping Strategies & AI Project Check (Q31, Q35, Q52, Q56)[cite: 2]
  { id: 31, category: 'Coping Strategies', question: 'When you are feeling stressed, do you spend a lot of time on your phone or social media?' },
  { id: 35, category: 'Coping Strategies', question: 'Have you ever tried taking deep breaths or doing simple relaxation exercises when you are stressed?' },
  { id: 52, category: 'AI Project Check', question: 'Would you like an app that lets you track your mood every day?' },
  { id: 56, category: 'AI Project Check', question: 'Do you think AI can help notice stress early and support children?' }
];