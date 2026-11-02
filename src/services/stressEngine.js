import { supabase } from './supabaseClient';
import { getApiHost } from './apiConfig';

/**
 * Calculates a comprehensive stress risk assessment based on recent user data.
 * DOES NOT diagnose medical conditions.
 */
export const calculateStressAssessment = async (userId, newQuestionnaireScore = null, questionnaireDetails = null) => {
  try {
    const factors = [];
    
    // 1. Get recent Moods (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let moodData = [];
    try {
      const stored = await AsyncStorage.getItem('@alphacare_child_mood_entries');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          moodData = list.filter(m => new Date(m.created_at || Date.now()).getTime() >= sevenDaysAgo.getTime());
        }
      }
    } catch (e) {}
      
    let averageMoodScore = 3; // Neutral default
    if (moodData && moodData.length > 0) {
      const sum = moodData.reduce((acc, curr) => acc + (curr.mood_score || 3), 0);
      averageMoodScore = sum / moodData.length;
      
      const negativeCount = moodData.filter(m => m.mood_score <= 2).length;
      if (negativeCount >= 3) {
        factors.push("Repeated negative mood entries recently");
      }
    } else {
      factors.push("No recent mood entries available");
    }
    
    // 2. Get Questionnaire Score
    let qScore = newQuestionnaireScore;
    if (qScore === null) {
      // Fetch latest if not provided
      try {
        const { data: latestQ } = await supabase
          .from('questionnaire_responses')
          .select('score')
          .eq('child_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        qScore = latestQ?.score || 0;
      } catch (e) {
        qScore = 0;
      }
    }
    
    // Check if score is already a 0-100 normalized score or raw score
    const normalizedQScore = questionnaireDetails?.normalized_score !== undefined
      ? questionnaireDetails.normalized_score
      : (qScore <= 100 ? qScore : Math.min(100, Math.max(0, (qScore / 114) * 100)));
    
    if (questionnaireDetails?.flagged_questions?.length > 0) {
      questionnaireDetails.flagged_questions.forEach(flag => {
        factors.push(`Clinical Flag (Q${flag.q}): ${flag.reason}`);
      });
    } else if (normalizedQScore > 60) {
      factors.push("High stress markers in recent check-in questionnaire");
    }

    // 3. Get recent Journal Sentiment (last 7 days)
    const { data: journalData } = await supabase
      .from('journal_entries')
      .select('sentiment_score')
      .eq('child_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());
      
    let averageJournalSentiment = 0; // -1 to 1 scale
    if (journalData && journalData.length > 0) {
      const sum = journalData.reduce((acc, curr) => acc + (parseFloat(curr.sentiment_score) || 0), 0);
      averageJournalSentiment = sum / journalData.length;
      
      if (averageJournalSentiment < -0.3) {
        factors.push("Negative emotional patterns detected in recent journal entries");
      }
    }

    // --- Calculation Engine ---
    // Invert mood score so higher = more stressed (mood scale 1-5, where 1 is Angry, 5 is Happy)
    // 5 -> 0 stress
    // 1 -> 100 stress
    const moodStressScore = (5 - averageMoodScore) * 25; 
    
    // Invert journal sentiment so higher = more stressed (sentiment -1 to 1)
    // 1 -> 0 stress
    // -1 -> 100 stress
    const journalStressScore = ((1 - averageJournalSentiment) / 2) * 100;
    
    // Weighted Average (0-100 scale)
    // 50% Questionnaire, 30% Mood, 20% Journal
    const finalStressScore = Math.round(
      (normalizedQScore * 0.50) + 
      (moodStressScore * 0.30) + 
      (journalStressScore * 0.20)
    );
    
    // Determine Level
    let stressLevel = "Low";
    if (finalStressScore >= 76) stressLevel = "Critical";
    else if (finalStressScore >= 51) stressLevel = "High";
    else if (finalStressScore >= 26) stressLevel = "Moderate";
    
    // Clinical override from questionnaire (e.g. reported bullying or hopelessness)
    if (questionnaireDetails?.final_risk_level === 'Critical') {
      stressLevel = 'Critical';
      if (!factors.some(f => f.includes('Clinical Flag') || f.includes('override'))) {
        factors.push("Critical clinical override triggered in questionnaire assessment");
      }
    }
    
    if (factors.length === 0 && stressLevel !== "Low") {
      factors.push("General elevated stress across activities");
    }

    // Prepare DB object
    const assessmentData = {
      child_id: userId,
      questionnaire_score: Math.round(qScore),
      mood_score: Math.round(averageMoodScore),
      journal_score: Math.round(averageJournalSentiment * 100), // scaled to integer for DB if needed
      final_stress_score: finalStressScore,
      stress_level: stressLevel,
      contributing_factors: factors // Requires the ALTER TABLE to have run
    };

    // Save assessment locally
    try {
      await AsyncStorage.setItem('@alphacare_latest_assessment', JSON.stringify(assessmentData));
    } catch (e) {}
    const insertedData = { id: `asmt_${Date.now()}`, ...assessmentData };
    const error = null;

    if (error) {
      console.error("Error saving stress assessment:", error.message);
    } else if (insertedData && (stressLevel === 'High' || stressLevel === 'Critical')) {
      // Create an alert in alerts table
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          child_id: userId,
          assessment_id: insertedData.id,
          risk_level: stressLevel,
          contributing_factors: factors,
          status: 'New'
        });
        
      if (alertError) {
        console.error("Error creating alert:", alertError.message);
      }

      // M10: Dispatch in-app and push notification alert to authorized parent and counselor
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiHost = getApiHost();

        await fetch(`${apiHost}/api/notifications/trigger-alert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event_type: 'stress_alert',
            child_id: userId,
            details: {
              risk_level: stressLevel,
              contributing_factors: factors
            }
          })
        });
      } catch (notifErr) {
        console.warn('M10 alert dispatch notice:', notifErr.message);
      }
    }
    
    return assessmentData;

  } catch (error) {
    console.error("Stress Engine Error:", error);
    return null;
  }
};
