/**
 * AlphaCare Backend Clinical Questionnaire Scoring Service
 * Mirror of client scoring engine for backend verification and assessment calculations.
 */

const FREQUENCY_MAP = {
  'Never': 0,
  'Sometimes': 1,
  'Often': 2,
  'Almost Always': 3
};

const QUESTION_BANK = [
  { q: 1, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 2, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 3, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 4, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 5, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 6, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 7, category: 'academic_stress', dir: 'D', weight: 2 },
  { q: 8, category: 'emotional_wellbeing', dir: 'D', weight: 3 },
  { q: 9, category: 'emotional_wellbeing', dir: 'D', weight: 3 },
  { q: 10, category: 'emotional_wellbeing', dir: 'D', weight: 3 },
  { q: 11, category: 'emotional_wellbeing', dir: 'D', weight: 3 },
  { q: 12, category: 'emotional_wellbeing', dir: 'D', weight: 3 },
  { q: 13, category: 'emotional_wellbeing', dir: 'D', weight: 3 },
  { q: 14, category: 'emotional_wellbeing', dir: 'R', weight: 3 },
  { q: 15, category: 'sleep_physical', dir: 'D', weight: 2 },
  { q: 16, category: 'sleep_physical', dir: 'D', weight: 2 },
  { q: 17, category: 'sleep_physical', dir: 'D', weight: 2 },
  { q: 18, category: 'sleep_physical', dir: 'D', weight: 2 },
  { q: 19, category: 'sleep_physical', dir: 'R', weight: 2 },
  { q: 20, category: 'family_support', dir: 'R', weight: 3 },
  { q: 21, category: 'family_support', dir: 'R', weight: 3 },
  { q: 22, category: 'peer_social', dir: 'R', weight: 2 },
  { q: 23, category: 'peer_social_exclusion', dir: 'D', weight: 3 },
  { q: 24, category: 'home_safety', dir: 'R', weight: 4 },
  { q: 25, category: 'help_seeking_support', dir: 'R', weight: 2 },
  { q: 26, category: 'school_climate', dir: 'R', weight: 2 },
  { q: 27, category: 'school_climate', dir: 'R', weight: 2 },
  { q: 28, category: 'social_anxiety', dir: 'D', weight: 2 },
  { q: 29, category: 'bullying_indicator', dir: 'D', weight: 5, critical: true },
  { q: 30, category: 'school_support', dir: 'R', weight: 2 },
  { q: 31, category: 'coping_unhealthy', dir: 'D', weight: 2 },
  { q: 32, category: 'coping_unhealthy', dir: 'D', weight: 1 },
  { q: 33, category: 'coping_healthy', dir: 'R', weight: 1 },
  { q: 34, category: 'coping_healthy', dir: 'R', weight: 1 },
  { q: 35, category: 'coping_healthy', dir: 'R', weight: 1 },
  { q: 36, category: 'coping_healthy', dir: 'R', weight: 2 },
  { q: 37, category: 'coping_unhealthy_isolation', dir: 'D', weight: 3 },
  { q: 38, category: 'life_events', dir: 'D', weight: 3 },
  { q: 39, category: 'life_events', dir: 'D', weight: 2 },
  { q: 40, category: 'life_events_resilience', dir: 'D', weight: 3 },
  { q: 41, category: 'life_events_impairment', dir: 'D', weight: 3 },
  { q: 42, category: 'self_esteem', dir: 'R', weight: 2 },
  { q: 43, category: 'self_esteem', dir: 'R', weight: 2 },
  { q: 44, category: 'self_esteem', dir: 'R', weight: 2 },
  { q: 45, category: 'self_esteem_hope', dir: 'R', weight: 3 },
  { q: 46, category: 'self_esteem', dir: 'R', weight: 2 },
  { q: 47, category: 'hopelessness_indicator', dir: 'D', weight: 5, critical: true },
  { q: 48, category: 'help_seeking_attitude', dir: 'R', weight: 1 },
  { q: 49, category: 'help_seeking_attitude', dir: 'R', weight: 1 },
  { q: 50, category: 'help_seeking_attitude', dir: 'R', weight: 1 },
  { q: 51, category: 'help_seeking_attitude', dir: 'R', weight: 1 }
];

const EXCLUDED_QUESTIONS = [52, 53, 54, 55, 56, 57];
const QUESTION_MAP = new Map(QUESTION_BANK.map(item => [item.q, item]));

function calculateRisk(userAnswers) {
  let raw_total = 0;
  let max_possible = 0;
  const category_breakdown = {};
  const flagged_questions = [];
  const warnings = [];
  let override_triggered = false;
  let requires_human_review = false;
  let forced_critical = false;
  const product_feedback_items = [];

  const answersMap = new Map();

  if (Array.isArray(userAnswers)) {
    userAnswers.forEach((ans, index) => {
      let qNum;
      let val;

      if (typeof ans === 'object' && ans !== null && 'q' in ans) {
        qNum = Number(ans.q);
        if (typeof ans.frequency === 'number') {
          val = ans.frequency;
        } else if (typeof ans.frequency === 'string') {
          val = FREQUENCY_MAP[ans.frequency] ?? null;
        } else if (typeof ans.answer === 'number') {
          val = ans.answer;
        }
      } else {
        qNum = index + 1;
        val = typeof ans === 'number' ? ans : (FREQUENCY_MAP[ans] ?? null);
      }

      if (val !== null && !isNaN(val)) {
        answersMap.set(qNum, Math.max(0, Math.min(3, val)));
      }
    });
  }

  answersMap.forEach((freqValue, qNum) => {
    if (EXCLUDED_QUESTIONS.includes(qNum)) {
      product_feedback_items.push(`Q${qNum}`);
      return;
    }

    const meta = QUESTION_MAP.get(qNum);
    if (!meta) {
      warnings.push(`Question #${qNum} was not found in QUESTION_BANK.`);
      return;
    }

    let question_score = 0;
    if (meta.dir === 'D') {
      question_score = freqValue * meta.weight;
    } else if (meta.dir === 'R') {
      question_score = (3 - freqValue) * meta.weight;
    }

    raw_total += question_score;
    max_possible += 3 * meta.weight;

    category_breakdown[meta.category] = (category_breakdown[meta.category] || 0) + question_score;

    if (qNum === 29 && freqValue >= 1) {
      override_triggered = true;
      forced_critical = true;
      flagged_questions.push({
        q: 29,
        category: meta.category,
        reason: 'Bullying reported at school.'
      });
    }

    if (qNum === 47 && freqValue >= 2) {
      override_triggered = true;
      forced_critical = true;
      requires_human_review = true;
      flagged_questions.push({
        q: 47,
        category: meta.category,
        reason: 'Child reports frequently feeling like giving up — recommend immediate counselor review; do not rely on automated scoring alone for this item.'
      });
    }

    if (qNum === 24 && freqValue <= 1) {
      flagged_questions.push({
        q: 24,
        category: meta.category,
        reason: 'Possible home-safety concern — recommend counselor follow-up.'
      });
    }
  });

  const normalized_score = max_possible > 0
    ? Math.round((raw_total / max_possible) * 1000) / 10
    : 0;

  let computed_band = 'Low';
  if (normalized_score >= 76) {
    computed_band = 'Critical';
  } else if (normalized_score >= 51) {
    computed_band = 'High';
  } else if (normalized_score >= 26) {
    computed_band = 'Medium';
  } else {
    computed_band = 'Low';
  }

  let final_risk_level = computed_band;
  if (forced_critical) {
    final_risk_level = 'Critical';
  }

  let recommendation = 'No action needed';
  if (final_risk_level === 'Critical') {
    recommendation = requires_human_review || forced_critical
      ? 'Immediate parent + counselor alert'
      : 'Notify counselor';
  } else if (final_risk_level === 'High') {
    recommendation = 'Notify counselor';
  } else if (final_risk_level === 'Medium') {
    recommendation = 'Suggest coping resources';
  }

  return {
    raw_total,
    max_possible,
    normalized_score,
    computed_band,
    override_triggered,
    final_risk_level,
    requires_human_review,
    flagged_questions,
    category_breakdown,
    recommendation,
    product_feedback_notes: product_feedback_items.length > 0 ? `${product_feedback_items.length} product feedback questions answered` : null,
    warnings
  };
}

module.exports = {
  calculateRisk,
  QUESTION_BANK,
  EXCLUDED_QUESTIONS
};
