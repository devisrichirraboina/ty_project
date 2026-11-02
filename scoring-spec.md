# AlphaCare — Questionnaire Scoring System Prompt (All 57 Questions)

## Important design note before you use this

Your questionnaire mixes two very different question types, and treating them the same will break your scoring:

1. **Direct (risk-worded) questions** — e.g. "Do you feel lonely?" → the MORE often the answer, the HIGHER the risk.
2. **Reverse (protective-worded) questions** — e.g. "Do you feel supported by your family?" → the LESS often the answer, the HIGHER the risk. These must be score-inverted, or a well-supported child and a poorly-supported child could get the same number.

Q52–Q57 ("AI Project Questions") are **product-feedback questions**, not stress/risk indicators — they should be **excluded entirely** from the risk score and only used for your app-engagement analytics.

Q29 (bullying) and Q47 (giving up when things get hard) are **critical-override questions** — a single concerning answer should force human review regardless of the composite score, the same way PHQ-9 treats its self-harm item as a standalone flag rather than one point among many.

---

## Full Question Metadata Table

`dir` = D (direct: higher frequency = higher risk) or R (reverse: higher frequency = lower risk, so it's inverted before scoring)

| Q# | Section | Category | dir | Weight |
|----|---------|----------|-----|--------|
| 1 | Academic Stress | academic_stress | D | 2 |
| 2 | Academic Stress | academic_stress | D | 2 |
| 3 | Academic Stress | academic_stress | D | 2 |
| 4 | Academic Stress | academic_stress | D | 2 |
| 5 | Academic Stress | academic_stress | D | 2 |
| 6 | Academic Stress | academic_stress | D | 2 |
| 7 | Academic Stress | academic_stress | D | 2 |
| 8 | Emotional Well-being | emotional_wellbeing | D | 3 |
| 9 | Emotional Well-being | emotional_wellbeing | D | 3 |
| 10 | Emotional Well-being | emotional_wellbeing | D | 3 |
| 11 | Emotional Well-being | emotional_wellbeing | D | 3 |
| 12 | Emotional Well-being | emotional_wellbeing | D | 3 |
| 13 | Emotional Well-being | emotional_wellbeing | D | 3 |
| 14 | Emotional Well-being | emotional_wellbeing | R | 3 |
| 15 | Sleep & Physical | sleep_physical | D | 2 |
| 16 | Sleep & Physical | sleep_physical | D | 2 |
| 17 | Sleep & Physical | sleep_physical | D | 2 |
| 18 | Sleep & Physical | sleep_physical | D | 2 |
| 19 | Sleep & Physical | sleep_physical | R | 2 |
| 20 | Family & Friends | family_support | R | 3 |
| 21 | Family & Friends | family_support | R | 3 |
| 22 | Family & Friends | peer_social | R | 2 |
| 23 | Family & Friends | peer_social_exclusion | D | 3 |
| 24 | Family & Friends | home_safety | R | 4 |
| 25 | Family & Friends | help_seeking_support | R | 2 |
| 26 | School Environment | school_climate | R | 2 |
| 27 | School Environment | school_climate | R | 2 |
| 28 | School Environment | social_anxiety | D | 2 |
| 29 | School Environment | **bullying_indicator** | D | **5 — CRITICAL** |
| 30 | School Environment | school_support | R | 2 |
| 31 | Coping Strategies | coping_unhealthy | D | 2 |
| 32 | Coping Strategies | coping_unhealthy | D | 1 |
| 33 | Coping Strategies | coping_healthy | R | 1 |
| 34 | Coping Strategies | coping_healthy | R | 1 |
| 35 | Coping Strategies | coping_healthy | R | 1 |
| 36 | Coping Strategies | coping_healthy | R | 2 |
| 37 | Coping Strategies | coping_unhealthy_isolation | D | 3 |
| 38 | Life Events | life_events | D | 3 |
| 39 | Life Events | life_events | D | 2 |
| 40 | Life Events | life_events_resilience | D | 3 |
| 41 | Life Events | life_events_impairment | D | 3 |
| 42 | Self-Esteem & Resilience | self_esteem | R | 2 |
| 43 | Self-Esteem & Resilience | self_esteem | R | 2 |
| 44 | Self-Esteem & Resilience | self_esteem | R | 2 |
| 45 | Self-Esteem & Resilience | self_esteem_hope | R | 3 |
| 46 | Self-Esteem & Resilience | self_esteem | R | 2 |
| 47 | Self-Esteem & Resilience | **hopelessness_indicator** | D | **5 — CRITICAL** |
| 48 | Help-Seeking | help_seeking_attitude | R | 1 |
| 49 | Help-Seeking | help_seeking_attitude | R | 1 |
| 50 | Help-Seeking | help_seeking_attitude | R | 1 |
| 51 | Help-Seeking | help_seeking_attitude | R | 1 |
| 52–57 | AI Project Questions | **excluded** | — | 0 (feedback only, not scored) |

---

## The System Prompt

QUESTION_BANK = [
  {"q":1,"category":"academic_stress","dir":"D","weight":2},
  {"q":2,"category":"academic_stress","dir":"D","weight":2},
  {"q":3,"category":"academic_stress","dir":"D","weight":2},
  {"q":4,"category":"academic_stress","dir":"D","weight":2},
  {"q":5,"category":"academic_stress","dir":"D","weight":2},
  {"q":6,"category":"academic_stress","dir":"D","weight":2},
  {"q":7,"category":"academic_stress","dir":"D","weight":2},
  {"q":8,"category":"emotional_wellbeing","dir":"D","weight":3},
  {"q":9,"category":"emotional_wellbeing","dir":"D","weight":3},
  {"q":10,"category":"emotional_wellbeing","dir":"D","weight":3},
  {"q":11,"category":"emotional_wellbeing","dir":"D","weight":3},
  {"q":12,"category":"emotional_wellbeing","dir":"D","weight":3},
  {"q":13,"category":"emotional_wellbeing","dir":"D","weight":3},
  {"q":14,"category":"emotional_wellbeing","dir":"R","weight":3},
  {"q":15,"category":"sleep_physical","dir":"D","weight":2},
  {"q":16,"category":"sleep_physical","dir":"D","weight":2},
  {"q":17,"category":"sleep_physical","dir":"D","weight":2},
  {"q":18,"category":"sleep_physical","dir":"D","weight":2},
  {"q":19,"category":"sleep_physical","dir":"R","weight":2},
  {"q":20,"category":"family_support","dir":"R","weight":3},
  {"q":21,"category":"family_support","dir":"R","weight":3},
  {"q":22,"category":"peer_social","dir":"R","weight":2},
  {"q":23,"category":"peer_social_exclusion","dir":"D","weight":3},
  {"q":24,"category":"home_safety","dir":"R","weight":4},
  {"q":25,"category":"help_seeking_support","dir":"R","weight":2},
  {"q":26,"category":"school_climate","dir":"R","weight":2},
  {"q":27,"category":"school_climate","dir":"R","weight":2},
  {"q":28,"category":"social_anxiety","dir":"D","weight":2},
  {"q":29,"category":"bullying_indicator","dir":"D","weight":5,"critical":true},
  {"q":30,"category":"school_support","dir":"R","weight":2},
  {"q":31,"category":"coping_unhealthy","dir":"D","weight":2},
  {"q":32,"category":"coping_unhealthy","dir":"D","weight":1},
  {"q":33,"category":"coping_healthy","dir":"R","weight":1},
  {"q":34,"category":"coping_healthy","dir":"R","weight":1},
  {"q":35,"category":"coping_healthy","dir":"R","weight":1},
  {"q":36,"category":"coping_healthy","dir":"R","weight":2},
  {"q":37,"category":"coping_unhealthy_isolation","dir":"D","weight":3},
  {"q":38,"category":"life_events","dir":"D","weight":3},
  {"q":39,"category":"life_events","dir":"D","weight":2},
  {"q":40,"category":"life_events_resilience","dir":"D","weight":3},
  {"q":41,"category":"life_events_impairment","dir":"D","weight":3},
  {"q":42,"category":"self_esteem","dir":"R","weight":2},
  {"q":43,"category":"self_esteem","dir":"R","weight":2},
  {"q":44,"category":"self_esteem","dir":"R","weight":2},
  {"q":45,"category":"self_esteem_hope","dir":"R","weight":3},
  {"q":46,"category":"self_esteem","dir":"R","weight":2},
  {"q":47,"category":"hopelessness_indicator","dir":"D","weight":5,"critical":true},
  {"q":48,"category":"help_seeking_attitude","dir":"R","weight":1},
  {"q":49,"category":"help_seeking_attitude","dir":"R","weight":1},
  {"q":50,"category":"help_seeking_attitude","dir":"R","weight":1},
  {"q":51,"category":"help_seeking_attitude","dir":"R","weight":1}
]

EXCLUDED_QUESTIONS = [52, 53, 54, 55, 56, 57]
