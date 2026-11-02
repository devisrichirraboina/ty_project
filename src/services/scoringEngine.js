/**
 * AlphaCare — Adaptive 2-Stage Clinical Questionnaire & Mood Scoring Engine
 * Stage 1: 20 Core Baseline Screening Questions (Multi-Domain)
 * Stage 2: Dynamic Dominant Mood Detection -> 10 Tailored Deep-Dive Questions
 * Final: Comprehensive Child Situation Diagnosis, Root Causes, Strengths & Clinical Stress Index (0-100)
 */

export const FREQUENCY_MAP = {
  'Never': 0,
  'Sometimes': 1,
  'Often': 2,
  'Almost Always': 3
};

export const FREQUENCY_VALUE_TO_LABEL = {
  0: 'Never',
  1: 'Sometimes',
  2: 'Often',
  3: 'Almost Always'
};

// ============================================================
// STAGE 1: 20 BASELINE CLINICAL SCREENING QUESTIONS
// ============================================================

export const BASELINE_QUESTIONS = [
  { id: 1, section: 'Academic Stress', category: 'academic', dir: 'D', weight: 2, question: 'How often do you feel overwhelmed or stressed by your schoolwork and assignments?' },
  { id: 2, section: 'Academic Stress', category: 'academic', dir: 'D', weight: 2, question: 'Do you frequently worry about your exam results, grades, or tests?' },
  { id: 3, section: 'Academic Stress', category: 'academic', dir: 'D', weight: 2, question: 'Is it hard for you to concentrate or stay focused when studying?' },
  { id: 4, section: 'Emotional Health', category: 'anxiety', dir: 'D', weight: 3, question: 'Have you been feeling unusually nervous, anxious, or on edge lately?' },
  { id: 5, section: 'Emotional Health', category: 'sadness', dir: 'D', weight: 3, question: 'Do you sometimes feel deep sadness or downhearted without knowing why?' },
  { id: 6, section: 'Emotional Health', category: 'irritability', dir: 'D', weight: 2, question: 'Do small frustrations make you feel angry or irritable easily?' },
  { id: 7, section: 'Emotional Health', category: 'sadness', dir: 'D', weight: 3, question: 'Do you ever feel lonely or isolated, even when others are around?' },
  { id: 8, section: 'Emotional Health', category: 'burnout', dir: 'D', weight: 3, question: 'Have you been feeling emotionally exhausted, tired, or drained of energy?' },
  { id: 9, section: 'Emotional Health', category: 'anxiety', dir: 'D', weight: 2, question: 'Do you find yourself overthinking small problems or worrying about the future?' },
  { id: 10, section: 'Sleep & Physical', category: 'sleep_physical', dir: 'D', weight: 2, question: 'Do you have difficulty falling asleep or staying asleep at night?' },
  { id: 11, section: 'Sleep & Physical', category: 'sleep_physical', dir: 'D', weight: 2, question: 'Do you wake up feeling exhausted or lacking energy most mornings?' },
  { id: 12, section: 'Sleep & Physical', category: 'sleep_physical', dir: 'D', weight: 2, question: 'When stressed, do you experience headaches, tight muscles, or stomach aches?' },
  { id: 13, section: 'Sleep & Physical', category: 'sleep_physical', dir: 'R', weight: 2, question: 'Do you usually feel energetic, active, and physically healthy during the day?' },
  { id: 14, section: 'Family & Friends', category: 'social', dir: 'D', weight: 3, question: 'Have you felt left out, ignored, or excluded by your classmates or friends?' },
  { id: 15, section: 'School Environment', category: 'bullying', dir: 'D', weight: 5, critical: true, question: 'Has anyone at school or online bullied, teased, or made you feel unsafe?' },
  { id: 16, section: 'Family & Friends', category: 'home_safety', dir: 'R', weight: 4, critical: true, question: 'Do you feel safe, comfortable, and respected at home with your family?' },
  { id: 17, section: 'Family & Friends', category: 'family_support', dir: 'R', weight: 3, question: 'Can you easily talk to a parent or trusted adult when something is bothering you?' },
  { id: 18, section: 'Self-Esteem & Resilience', category: 'resilience', dir: 'R', weight: 3, question: 'Do you feel hopeful, excited, and positive about your future dreams and goals?' },
  { id: 19, section: 'Self-Esteem & Resilience', category: 'hopelessness', dir: 'D', weight: 5, critical: true, question: 'When things become very difficult, do you feel like giving up on everything?' },
  { id: 20, section: 'Coping Strategies', category: 'coping', dir: 'R', weight: 2, question: 'Do you have healthy activities or hobbies (music, art, sports) that help you unwind?' },
];

// ============================================================
// STAGE 2: TARGETED MOOD BRANCH QUESTION BANKS (10 QUESTIONS EACH)
// ============================================================

export const MOOD_BRANCH_PROFILES = {
  ANXIOUS_OVERWHELMED: {
    key: 'ANXIOUS_OVERWHELMED',
    title: 'Anxious & Overwhelmed',
    emoji: '😰',
    badgeColor: '#7C3AED',
    badgeBg: '#EDE9FE',
    shortSummary: 'High worry, test anxiety & racing thoughts',
    interludeText: 'We noticed you have been feeling quite anxious and carrying heavy thoughts lately. Let us explore a few specific questions so we can understand what is triggering this worry.',
    questions: [
      { id: 'T1', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you experience racing thoughts or panic right before exams or presentations?' },
      { id: 'T2', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you constantly worry about making mistakes or disappointing parents and teachers?' },
      { id: 'T3', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Does fear of failure cause you to avoid or delay studying and starting tasks?' },
      { id: 'T4', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you find it difficult to relax your muscles or calm your body down when sitting quietly?' },
      { id: 'T5', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do sudden changes in routine or unexpected demands make you feel anxious?' },
      { id: 'T6', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you repeatedly replay conversations in your head and worry about what you said?' },
      { id: 'T7', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'When nervous, do you feel physical fluttery sensations, rapid heartbeats, or dizziness?' },
      { id: 'T8', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel immense pressure to get top marks and be perfect at everything?' },
      { id: 'T9', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel overwhelmed by too many expectations placed on your shoulders?' },
      { id: 'T10', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Are you able to calm your mind using deep breathing, relaxing music, or talking to someone?' }
    ]
  },
  LOW_MOOD_SADNESS: {
    key: 'LOW_MOOD_SADNESS',
    title: 'Low Mood & Sadness',
    emoji: '🌧️',
    badgeColor: '#EA580C',
    badgeBg: '#FFEDD5',
    shortSummary: 'Low emotional energy, sadness & withdrawal',
    interludeText: 'You seem to be experiencing heavy feelings, sadness, or emotional tiredness. Let us look deeper into what is affecting your mood so you get gentle, warm support.',
    questions: [
      { id: 'T1', section: 'Targeted Deep-Dive', dir: 'D', weight: 3, question: 'Have you lost interest or joy in hobbies and games you used to love?' },
      { id: 'T2', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel like staying in your room and pulling away from friends and family?' },
      { id: 'T3', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you find yourself feeling tearful, gloomy, or emotionally sensitive frequently?' },
      { id: 'T4', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you struggle with feeling unappreciated, invisible, or not good enough?' },
      { id: 'T5', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Does completing ordinary daily tasks feel like a heavy, exhausting mountain?' },
      { id: 'T6', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you find it hard to feel optimistic when things go wrong in your day?' },
      { id: 'T7', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you pretend to smile and put on a brave face so others do not worry about you?' },
      { id: 'T8', section: 'Targeted Deep-Dive', dir: 'D', weight: 3, question: 'Do you sometimes feel like nobody truly understands how heavy things are for you?' },
      { id: 'T9', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Is there at least one person you can be 100% honest and open with about your feelings?' },
      { id: 'T10', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'When you are down, do creative outlets (drawing, journaling, soothing sounds) bring relief?' }
    ]
  },
  BURNOUT_EXHAUSTION: {
    key: 'BURNOUT_EXHAUSTION',
    title: 'Burnout & Physical Fatigue',
    emoji: '⚡',
    badgeColor: '#D97706',
    badgeBg: '#FEF3C7',
    shortSummary: 'Sleep disruption, fatigue & academic overload',
    interludeText: 'Your body and mind seem to be feeling the weight of exhaustion and physical strain. Let us check where the energy drains are coming from.',
    questions: [
      { id: 'T1', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel completely physically and mentally wiped out by the end of school hours?' },
      { id: 'T2', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you suffer from frequent tension headaches, sore shoulders, or upset stomachs?' },
      { id: 'T3', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you stay up very late at night studying or scrolling because daytime felt rushed?' },
      { id: 'T4', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Does your mind feel foggy or slow when trying to retain facts or read textbooks?' },
      { id: 'T5', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel like you have almost zero free time for pure play, rest, and relaxation?' },
      { id: 'T6', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you skip meals or lose your appetite when under heavy school schedules?' },
      { id: 'T7', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Have you noticed yourself losing patience and snapping simply because you are exhausted?' },
      { id: 'T8', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you wake up feeling groggy and tired even after a full night in bed?' },
      { id: 'T9', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel trapped in a continuous, endless cycle of classes, tuition, and homework?' },
      { id: 'T10', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Are you able to take restful breaks without feeling guilty about what you need to do?' }
    ]
  },
  SOCIAL_RELATIONAL: {
    key: 'SOCIAL_RELATIONAL',
    title: 'Social & Relational Strain',
    emoji: '💔',
    badgeColor: '#E11D48',
    badgeBg: '#FFE4E6',
    shortSummary: 'Peer pressure, feeling left out & communication gaps',
    interludeText: 'Your answers indicate that peer dynamics, friendships, or social environments may be causing friction or hurt. Let us explore this deeper.',
    questions: [
      { id: 'T1', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you worry that classmates or friends talk behind your back or judge you?' },
      { id: 'T2', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel forced to change your personality to fit into your school friend circle?' },
      { id: 'T3', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Have you felt deliberately excluded from games, group chats, or lunch groups?' },
      { id: 'T4', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do arguments with friends or siblings cause you intense distress that lasts for days?' },
      { id: 'T5', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you hesitate to express yourself because you fear being teased or mocked?' },
      { id: 'T6', section: 'Targeted Deep-Dive', dir: 'D', weight: 3, question: 'Has someone made unkind jokes or spread rumors about you at school or online?' },
      { id: 'T7', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel uncomfortable asking teachers or adults for help when friends treat you badly?' },
      { id: 'T8', section: 'Targeted Deep-Dive', dir: 'R', weight: 3, question: 'Do you have at least one genuine, loyal friend you can truly trust and rely on?' },
      { id: 'T9', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you feel accepted, valued, and safe when you are at home with your family?' },
      { id: 'T10', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Are you confident in setting healthy boundaries and saying no when uncomfortable?' }
    ]
  },
  FRUSTRATION_IRRITABILITY: {
    key: 'FRUSTRATION_IRRITABILITY',
    title: 'Frustration & Irritability',
    emoji: '😤',
    badgeColor: '#DC2626',
    badgeBg: '#FEE2E2',
    shortSummary: 'Feeling misunderstood, mood swings & emotional tension',
    interludeText: 'We noticed signs of frustration and irritability. Stress often shows up as anger when we feel overwhelmed or unheard. Let us explore what is triggering this.',
    questions: [
      { id: 'T1', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do small delays, interruptions, or minor mistakes make you feel intensely frustrated?' },
      { id: 'T2', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel like adults around you do not listen to or respect your opinions?' },
      { id: 'T3', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'When angry, do you feel a strong impulse to yell, throw things, or slam doors?' },
      { id: 'T4', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Is it hard for you to cool down once an argument or conflict has started?' },
      { id: 'T5', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel annoyed or impatient with classmates or family members often?' },
      { id: 'T6', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Does stress in your life tend to show up as anger rather than quiet sadness?' },
      { id: 'T7', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel remorseful or regretful after losing your temper with people you care about?' },
      { id: 'T8', section: 'Targeted Deep-Dive', dir: 'D', weight: 2, question: 'Do you feel that expectations and rules placed on you are unfair or too strict?' },
      { id: 'T9', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Does physical exertion, sports, or taking space help you release built-up frustration?' },
      { id: 'T10', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you have effective strategies to calm yourself before reacting when triggered?' }
    ]
  },
  BALANCED_THRIVING: {
    key: 'BALANCED_THRIVING',
    title: 'Balanced & Thriving',
    emoji: '🌱',
    badgeColor: '#16A34A',
    badgeBg: '#DCFCE7',
    shortSummary: 'Positive emotional well-being & healthy coping',
    interludeText: 'You are showing healthy balance and strong resilience! Let us ask 10 quick questions to celebrate your strengths and learn what helps you stay thriving.',
    questions: [
      { id: 'T1', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you regularly feel enthusiastic, curious, and motivated about your day?' },
      { id: 'T2', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you make regular time for creative hobbies and sports that make you smile?' },
      { id: 'T3', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'When faced with a tough problem, do you feel capable of working through it?' },
      { id: 'T4', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you feel comfortable reaching out to friends or family when you need a listening ear?' },
      { id: 'T5', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Are you proud of who you are and the positive efforts you make every day?' },
      { id: 'T6', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'When something goes wrong, are you able to recover and move forward with hope?' },
      { id: 'T7', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you maintain a steady, restorative sleep and morning routine most days?' },
      { id: 'T8', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you practice gratitude and appreciate the good moments in your week?' },
      { id: 'T9', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you enjoy helping and encouraging classmates when they are feeling down?' },
      { id: 'T10', section: 'Targeted Deep-Dive', dir: 'R', weight: 2, question: 'Do you feel excited, confident, and optimistic about your future goals?' }
    ]
  }
};

// ============================================================
// DYNAMIC DOMINANT MOOD DETECTION ALGORITHM
// ============================================================

/**
 * Analyzes the 20 baseline answers to detect the child's primary dominant emotional state
 * @param {Array<number>} baselineAnswers Array of 20 answers (0-3)
 * @returns {Object} Detected mood profile
 */
export function detectDominantMoodState(baselineAnswers) {
  if (!baselineAnswers) {
    return MOOD_BRANCH_PROFILES.BALANCED_THRIVING;
  }

  // Aggregate category loads (normalized to 0..1 scale)
  const scores = {
    academic: 0,
    anxiety: 0,
    sadness: 0,
    burnout: 0,
    sleep_physical: 0,
    social: 0,
    irritability: 0,
    resilience_deficit: 0,
  };

  const counts = {
    academic: 0,
    anxiety: 0,
    sadness: 0,
    burnout: 0,
    sleep_physical: 0,
    social: 0,
    irritability: 0,
    resilience_deficit: 0,
  };

  BASELINE_QUESTIONS.forEach((q, idx) => {
    let val = undefined;
    if (Array.isArray(baselineAnswers)) {
      val = baselineAnswers[idx];
    } else if (typeof baselineAnswers === 'object') {
      val = baselineAnswers[idx] !== undefined ? baselineAnswers[idx] : baselineAnswers[q.id];
    }

    if (val === null || val === undefined || isNaN(val)) return;

    let distressVal = q.dir === 'D' ? Number(val) : (3 - Number(val));
    const cat = q.category;

    if (cat === 'academic') {
      scores.academic += distressVal;
      counts.academic += 3;
    } else if (cat === 'anxiety') {
      scores.anxiety += distressVal;
      counts.anxiety += 3;
    } else if (cat === 'sadness' || cat === 'hopelessness') {
      scores.sadness += distressVal;
      counts.sadness += 3;
    } else if (cat === 'burnout') {
      scores.burnout += distressVal;
      counts.burnout += 3;
    } else if (cat === 'sleep_physical') {
      scores.sleep_physical += distressVal;
      counts.sleep_physical += 3;
    } else if (cat === 'social' || cat === 'bullying') {
      scores.social += distressVal;
      counts.social += 3;
    } else if (cat === 'irritability') {
      scores.irritability += distressVal;
      counts.irritability += 3;
    } else if (cat === 'resilience' || cat === 'coping' || cat === 'family_support' || cat === 'home_safety') {
      scores.resilience_deficit += distressVal;
      counts.resilience_deficit += 3;
    }
  });

  const anxietyLoad = ((scores.anxiety + scores.academic) / Math.max(1, counts.anxiety + counts.academic)) * 100;
  const sadnessLoad = (scores.sadness / Math.max(1, counts.sadness)) * 100;
  const burnoutLoad = ((scores.burnout + scores.sleep_physical) / Math.max(1, counts.burnout + counts.sleep_physical)) * 100;
  const socialLoad = (scores.social / Math.max(1, counts.social)) * 100;
  const irritabilityLoad = (scores.irritability / Math.max(1, counts.irritability)) * 100;

  // Find dominant load
  const maxLoad = Math.max(anxietyLoad, sadnessLoad, burnoutLoad, socialLoad, irritabilityLoad);

  // If all stress loads are low (< 28%), the child is balanced & thriving
  let detected = MOOD_BRANCH_PROFILES.BALANCED_THRIVING;
  if (maxLoad >= 28) {
    if (anxietyLoad === maxLoad) {
      detected = MOOD_BRANCH_PROFILES.ANXIOUS_OVERWHELMED;
    } else if (sadnessLoad === maxLoad) {
      detected = MOOD_BRANCH_PROFILES.LOW_MOOD_SADNESS;
    } else if (burnoutLoad === maxLoad) {
      detected = MOOD_BRANCH_PROFILES.BURNOUT_EXHAUSTION;
    } else if (socialLoad === maxLoad) {
      detected = MOOD_BRANCH_PROFILES.SOCIAL_RELATIONAL;
    } else {
      detected = MOOD_BRANCH_PROFILES.FRUSTRATION_IRRITABILITY;
    }
  }

  return {
    ...detected,
    id: detected.key,
    name: detected.title,
  };
}

// ============================================================
// ADAPTIVE QUESTIONNAIRE CLINICAL SCORING ENGINE
// ============================================================

/**
 * Computes holistic risk scoring, child situation diagnosis, root causes & recommendations
 */
export function calculateAdaptiveQuestionnaireRisk(arg1, arg2, arg3) {
  let baselineAnswers = [];
  let targetedAnswers = [];
  let detectedMoodKey = null;

  if (arg1 && typeof arg1 === 'object' && ('baselineAnswers' in arg1 || 'targetedAnswers' in arg1 || 'detectedMoodKey' in arg1)) {
    baselineAnswers = arg1.baselineAnswers || [];
    targetedAnswers = arg1.targetedAnswers || [];
    detectedMoodKey = arg1.detectedMoodKey || null;
  } else {
    baselineAnswers = arg1 || [];
    targetedAnswers = arg2 || [];
    detectedMoodKey = arg3 || null;
  }

  let raw_total = 0;
  let max_possible = 0;
  const flagged_questions = [];
  const root_triggers = [];
  const strengths = [];
  let override_triggered = false;
  let requires_human_review = false;
  let forced_critical = false;

  const category_breakdown = {
    'Academic Stress': { score: 0, maxScore: 0 },
    'Emotional Well-being': { score: 0, maxScore: 0 },
    'Sleep & Physical': { score: 0, maxScore: 0 },
    'Family & Friends': { score: 0, maxScore: 0 },
    'School Environment': { score: 0, maxScore: 0 },
    'Self-Esteem & Resilience': { score: 0, maxScore: 0 },
    'Coping Strategies': { score: 0, maxScore: 0 },
  };

  // 1. Process Phase 1 Baseline answers (20 items)
  BASELINE_QUESTIONS.forEach((q, idx) => {
    let val = 0;
    if (Array.isArray(baselineAnswers)) {
      val = baselineAnswers[idx] ?? 0;
    } else if (typeof baselineAnswers === 'object') {
      val = (baselineAnswers[idx] !== undefined ? baselineAnswers[idx] : baselineAnswers[q.id]) ?? 0;
    }
    const clampedVal = Math.max(0, Math.min(3, Number(val) || 0));

    let questionScore = 0;
    if (q.dir === 'D') {
      questionScore = clampedVal * q.weight;
    } else {
      questionScore = (3 - clampedVal) * q.weight;
    }

    raw_total += questionScore;
    max_possible += 3 * q.weight;

    const catName = q.section;
    if (category_breakdown[catName]) {
      category_breakdown[catName].score += questionScore;
      category_breakdown[catName].maxScore += 3 * q.weight;
    }

    // Overrides: Bullying Q15
    if (q.id === 15 && clampedVal >= 1) {
      override_triggered = true;
      forced_critical = true;
      flagged_questions.push({
        q: 15,
        category: 'Bullying Concern',
        reason: 'Child reported bullying, teasing, or feeling unsafe at school/online.'
      });
      root_triggers.push('School/Peer bullying or teasing');
    }

    // Overrides: Hopelessness Q19
    if (q.id === 19 && clampedVal >= 2) {
      override_triggered = true;
      forced_critical = true;
      requires_human_review = true;
      flagged_questions.push({
        q: 19,
        category: 'Despair Indicator',
        reason: 'Child reported frequently feeling like giving up — recommend prompt counselor review.'
      });
      root_triggers.push('Feelings of giving up & emotional hopelessness');
    }

    // Overrides: Home Safety Q16 (Protective: if <= 1, feels unsafe)
    if (q.id === 16 && clampedVal <= 1) {
      flagged_questions.push({
        q: 16,
        category: 'Home Safety',
        reason: 'Child rarely feels safe or comfortable at home.'
      });
      root_triggers.push('Unsettled or stressful home environment');
    }

    // Identify Strengths from protective items
    if (q.id === 17 && clampedVal >= 2) {
      strengths.push('Strong communication & trust with family/parents');
    }
    if (q.id === 18 && clampedVal >= 2) {
      strengths.push('Positive future hope & goal motivation');
    }
    if (q.id === 20 && clampedVal >= 2) {
      strengths.push('Active personal coping outlets (music, sports, art)');
    }
    if (q.id === 13 && clampedVal >= 2) {
      strengths.push('Good daytime physical vitality');
    }
  });

  // 2. Process Phase 2 Targeted answers (10 items)
  const branchMeta = MOOD_BRANCH_PROFILES[detectedMoodKey] || MOOD_BRANCH_PROFILES.BALANCED_THRIVING;
  const targetedQuestions = branchMeta.questions || [];

  targetedQuestions.forEach((tq, idx) => {
    let val = 0;
    if (Array.isArray(targetedAnswers)) {
      val = targetedAnswers[idx] ?? 0;
    } else if (typeof targetedAnswers === 'object') {
      val = (targetedAnswers[idx] !== undefined ? targetedAnswers[idx] : targetedAnswers[tq.id]) ?? 0;
    }
    const clampedVal = Math.max(0, Math.min(3, Number(val) || 0));

    let questionScore = 0;
    if (tq.dir === 'D') {
      questionScore = clampedVal * (tq.weight || 2);
    } else {
      questionScore = (3 - clampedVal) * (tq.weight || 2);
    }

    raw_total += questionScore;
    max_possible += 3 * (tq.weight || 2);

    // Identify specific root triggers from targeted answers
    if (clampedVal >= 2 && tq.dir === 'D') {
      if (idx === 0) root_triggers.push('Acute performance & test panic');
      if (idx === 1) root_triggers.push('Fear of making mistakes or disappointing adults');
      if (idx === 2) root_triggers.push('Procrastination & study avoidance due to fear');
      if (idx === 3) root_triggers.push('Muscle tension & inability to physically relax');
      if (idx === 4) root_triggers.push('Sensitivity to unexpected changes or disruptions');
    }
  });

  // Calculate normalized percentage score (0 - 100)
  const normalized_score = max_possible > 0
    ? Math.round((raw_total / max_possible) * 1000) / 10
    : 0;

  // Determine computed risk band
  let computed_band = 'Low';
  if (normalized_score >= 75) computed_band = 'Critical';
  else if (normalized_score >= 50) computed_band = 'High';
  else if (normalized_score >= 25) computed_band = 'Medium';
  else computed_band = 'Low';

  let final_risk_level = forced_critical ? 'Critical' : computed_band;

  // Synthesize "What is happening with the child" (Clinical Diagnosis Narrative)
  let situationDiagnosis = '';
  if (final_risk_level === 'Critical') {
    situationDiagnosis = override_triggered
      ? `The child is experiencing intense emotional distress with specific priority indicators (${flagged_questions.map(f => f.category).join(', ')}). Immediate supportive adult and counselor presence is strongly recommended.`
      : `The child is carrying acute, continuous multi-area stress (${branchMeta.title}), with significant strain on daily emotional functioning, concentration, and somatic recovery.`;
  } else if (final_risk_level === 'High') {
    situationDiagnosis = `The child is undergoing elevated ${branchMeta.title.toLowerCase()} pressure. Triggers like academic demands and fatigue are interfering with emotional ease. Gentle adult guidance and counseling check-ins will provide immense relief.`;
  } else if (final_risk_level === 'Medium') {
    situationDiagnosis = `The child is managing routine demands reasonably well, but noticeable friction in ${branchMeta.title.toLowerCase()} and daily workload is causing tiredness. Structured relaxation breaks will restore equilibrium.`;
  } else {
    situationDiagnosis = `The child demonstrates healthy emotional balance, positive resilience, and good self-care habits (${branchMeta.title}). Continue supporting their positive routines and friendships!`;
  }

  // Fallback defaults for triggers and strengths if empty
  if (root_triggers.length === 0) {
    if (final_risk_level === 'Low') {
      root_triggers.push('No significant negative stress triggers identified');
    } else {
      root_triggers.push('Cumulative routine demands & temporary emotional strain');
    }
  }
  if (strengths.length === 0) {
    strengths.push('Willingness to take the wellness check-in honestly', 'Openness to self-reflection and support');
  }

  // Actionable steps
  let actionPlan = [];
  if (final_risk_level === 'Critical' || final_risk_level === 'High') {
    actionPlan = [
      'Schedule a warm, supportive 1-on-1 check-in with a trusted parent or school counselor.',
      'Establish a 10-minute guided breathing routine before bedtime to reduce nervous tension.',
      'Temporarily scale back non-essential study pressure to allow physical rest and emotional reset.',
      'Encourage open, judgment-free conversations about school and peer feelings.'
    ];
  } else if (final_risk_level === 'Medium') {
    actionPlan = [
      'Incorporate 5-minute relaxation pauses between homework sessions.',
      'Practice rhythmic breathing (4-7-8 method) during moments of worry.',
      'Write feelings in the AlphaCare journal to untangle racing thoughts.',
      'Maintain an 8-hour restful sleep schedule every night.'
    ];
  } else {
    actionPlan = [
      'Celebrate your steady emotional balance and healthy daily habits.',
      'Continue engaging in your favorite hobbies, sports, and creative projects.',
      'Stay open to checking in with friends and family regularly.'
    ];
  }

  return {
    raw_total,
    max_possible,
    normalized_score,
    clinicalStressIndex: normalized_score,
    computed_band,
    final_risk_level,
    riskLevel: final_risk_level,
    override_triggered,
    requires_human_review,
    flagged_questions,
    dominant_mood: branchMeta,
    dominantMood: branchMeta,
    situation_diagnosis: situationDiagnosis,
    situationDiagnosis: {
      level: final_risk_level,
      summary: situationDiagnosis
    },
    root_triggers,
    rootTriggers: root_triggers,
    strengths,
    action_plan: actionPlan,
    actionPlan,
    category_breakdown
  };
}

// Master backward compatibility exports
export const MASTER_QUESTIONS = BASELINE_QUESTIONS;
export const calculateQuestionnaireRisk = (answers) => {
  const baseline = Array.isArray(answers) ? answers.slice(0, 20) : [];
  const detected = detectDominantMoodState(baseline);
  const targeted = Array.isArray(answers) ? answers.slice(20, 30) : [];
  return calculateAdaptiveQuestionnaireRisk({
    baselineAnswers: baseline,
    targetedAnswers: targeted,
    detectedMoodKey: detected.key
  });
};
