/**
 * aiService.js
 * AI-powered plan optimization and weak topic detection.
 *
 * Supports Groq (Free), Grok (xAI), and Rule-based fallback.
 */

const { startOfDay } = require('./plannerService');

// Lazy-load AI client so the app doesn't crash if the package is missing
let aiClient = null;
let aiSource = null;

function getAIClient() {
  if (aiClient) return { client: aiClient, source: aiSource };

  const groqKey = process.env.GROQ_API_KEY;
  const xaiKey  = process.env.XAI_API_KEY;

  if (!groqKey && !xaiKey) return { client: null, source: 'rule-based' };

  try {
    const { OpenAI } = require('openai');
    
    if (groqKey) {
      aiClient = new OpenAI({ 
        apiKey: groqKey, 
        baseURL: 'https://api.groq.com/openai/v1' 
      });
      aiSource = 'groq';
    } else {
      aiClient = new OpenAI({ 
        apiKey: xaiKey, 
        baseURL: 'https://api.x.ai/v1' 
      });
      aiSource = 'grok';
    }
    
    return { client: aiClient, source: aiSource };
  } catch (err) {
    console.error('[aiService] Failed to load AI client:', err.message);
    return { client: null, source: 'rule-based' };
  }
}

// ─── Build a compact plan summary to send to the AI ──────────────────────────
function buildPlanSummary(plan) {
  const today    = startOfDay(new Date());
  const upcoming = plan.days.filter((d) => new Date(d.date) >= today);
  const past     = plan.days.filter((d) => new Date(d.date) < today);

  // Subject completion rates
  const subjects = {};
  for (const day of plan.days) {
    for (const task of day.tasks) {
      const k = task.subjectName;
      if (!subjects[k]) subjects[k] = { total: 0, done: 0, missed: 0 };
      subjects[k].total++;
      if (task.status === 'completed' || task.isCompleted) subjects[k].done++;
      if (task.status === 'missed') subjects[k].missed++;
    }
  }

  const subjectSummary = Object.entries(subjects).map(([name, s]) => ({
    name,
    total:          s.total,
    done:           s.done,
    missed:         s.missed,
    completionRate: s.total ? Math.round((s.done / s.total) * 100) : 0,
  }));

  // Upcoming day loads
  const upcomingSummary = upcoming.slice(0, 14).map((d) => ({
    date:        d.date.toISOString().slice(0, 10),
    dayNumber:   d.dayNumber,
    totalHours:  d.totalHours,
    taskCount:   d.tasks.length,
    isRevision:  d.isRevisionDay,
  }));

  return {
    overallCompletion: plan.totalTasks
      ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
      : 0,
    totalTasks:        plan.totalTasks,
    completedTasks:    plan.completedTasks,
    missedTasks:       plan.missedTasks || 0,
    dailyHours:        plan.dailyHours,
    daysRemaining:     upcoming.length,
    daysPassed:        past.length,
    subjects:          subjectSummary,
    upcomingDays:      upcomingSummary,
  };
}

// ─── Rule-based fallback optimizer (no API needed) ────────────────────────────
function ruleBasedOptimize(plan) {
  const today    = startOfDay(new Date());
  const upcoming = plan.days.filter((d) => new Date(d.date) >= today);

  // Find weak subjects (low completion rate)
  const subjects  = {};
  for (const day of plan.days) {
    for (const task of day.tasks) {
      const k = task.subjectName;
      if (!subjects[k]) subjects[k] = { total: 0, done: 0, missed: 0 };
      subjects[k].total++;
      if (task.status === 'completed' || task.isCompleted) subjects[k].done++;
      if (task.status === 'missed') subjects[k].missed++;
    }
  }

  const weakSubjects = Object.entries(subjects)
    .filter(([, s]) => s.total > 0 && (s.done / s.total) < 0.5)
    .map(([name]) => name);

  // Boost weak-subject tasks in upcoming days (move them earlier)
  let moved = 0;
  for (const day of upcoming) {
    day.tasks.sort((a, b) => {
      const aWeak = weakSubjects.includes(a.subjectName) ? -1 : 1;
      const bWeak = weakSubjects.includes(b.subjectName) ? -1 : 1;
      return aWeak - bWeak;
    });
    moved++;
  }

  const suggestions = [];
  if (weakSubjects.length > 0) {
    suggestions.push(`Prioritised weak subjects in upcoming days: ${weakSubjects.join(', ')}.`);
  }

  // Add revision notes for overloaded days
  const overloaded = upcoming.filter((d) => d.totalHours > plan.dailyHours * 1.1);
  if (overloaded.length > 0) {
    suggestions.push(`${overloaded.length} days exceed daily hour limit — consider spreading tasks.`);
  }

  if (!suggestions.length) {
    suggestions.push('Your schedule looks balanced. Keep up the good work!');
  }

  return {
    optimized:   true,
    source:      'rule-based',
    suggestions,
    upcomingDays: upcoming.map((d) => ({
      date:      d.date,
      dayNumber: d.dayNumber,
      taskOrder: d.tasks.map((t) => ({ id: t._id, subjectName: t.subjectName, topicName: t.topicName })),
    })),
  };
}

/**
 * optimizePlan
 * Calls OpenAI to suggest schedule rebalancing, or falls back to rule-based.
 *
 * @param {Object} plan  — StudyPlan document
 * @returns {Object}     — { optimized, source, suggestions, changes }
 */
async function optimizePlan(plan) {
  const summary = buildPlanSummary(plan);
  const { client, source } = getAIClient();

  if (!client) {
    // No API key — use rule-based
    const result = ruleBasedOptimize(plan);
    result.summary = summary;
    return result;
  }

  // Choose model based on source
  let model;
  if (source === 'groq') {
    model = 'llama-3.3-70b-versatile';
  } else {
    model = process.env.XAI_MODEL || 'grok-2';
  }

  const prompt = `
You are a study plan optimizer. Analyze the following study plan data and suggest concrete improvements.

PLAN DATA (JSON):
${JSON.stringify(summary, null, 2)}

TASK:
1. Identify the weakest subjects (lowest completion rate).
2. Identify overloaded or underloaded days.
3. Suggest how to rebalance the schedule.
4. Recommend revision insertions for weak topics.

Respond ONLY with valid JSON in this exact structure:
{
  "suggestions": ["string", "string", ...],
  "weakSubjects": ["subjectName", ...],
  "overloadedDays": [dayNumber, ...],
  "revisionRecommendations": ["string", ...]
}
`.trim();

  try {
    const response = await client.chat.completions.create({
      model:       model,
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens:  800,
    });

    const raw = response.choices[0]?.message?.content?.trim() || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    const jsonStr   = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
    const parsed    = JSON.parse(jsonStr);

    // Validate required fields
    if (!Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid AI response structure');
    }

    return {
      optimized:                true,
      source:                   source,
      suggestions:              parsed.suggestions,
      weakSubjects:             parsed.weakSubjects || [],
      overloadedDays:           parsed.overloadedDays || [],
      revisionRecommendations:  parsed.revisionRecommendations || [],
      summary,
    };
  } catch (err) {
    console.error(`[aiService] ${source} error, falling back to rule-based:`, err.message);
    const result = ruleBasedOptimize(plan);
    result.summary = summary;
    result.aiError = err.message;
    return result;
  }
}

/**
 * detectWeakTopics
 * Analyses task completion data to rank subjects/topics by weakness score.
 *
 * @param {Object} plan  — StudyPlan document
 * @returns {Array}      — Ranked list of weak subjects
 */
function detectWeakTopics(plan) {
  const subjects = {};

  for (const day of plan.days) {
    for (const task of day.tasks) {
      const k = task.subjectName;
      if (!subjects[k]) {
        subjects[k] = {
          name:       k,
          color:      task.subjectColor,
          total:      0,
          done:       0,
          missed:     0,
          hard:       0,
          topics:     {},
        };
      }
      subjects[k].total++;
      if (task.status === 'completed' || task.isCompleted) subjects[k].done++;
      if (task.status === 'missed')    subjects[k].missed++;
      if (task.difficulty === 'hard')  subjects[k].hard++;

      // Topic-level tracking
      const tKey = task.topicName.replace(/^Revise: /, '').replace(/ \(Part \d\)$/, '');
      if (!subjects[k].topics[tKey]) {
        subjects[k].topics[tKey] = { total: 0, done: 0, missed: 0 };
      }
      subjects[k].topics[tKey].total++;
      if (task.status === 'completed' || task.isCompleted) subjects[k].topics[tKey].done++;
      if (task.status === 'missed')    subjects[k].topics[tKey].missed++;
    }
  }

  // Weakness score: lower completion + more misses = higher score
  const ranked = Object.values(subjects).map((s) => {
    const completionRate = s.total ? (s.done / s.total) : 0;
    const missRate       = s.total ? (s.missed / s.total) : 0;
    const weaknessScore  = Math.round(((1 - completionRate) * 60 + missRate * 40) * 100);

    // Top weak topics in this subject
    const weakTopics = Object.entries(s.topics)
      .filter(([, t]) => t.total > 0)
      .map(([name, t]) => ({
        name,
        completionRate: Math.round((t.done / t.total) * 100),
        missed:         t.missed,
      }))
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 5);

    return {
      name:           s.name,
      color:          s.color,
      total:          s.total,
      done:           s.done,
      missed:         s.missed,
      completionRate: Math.round(completionRate * 100),
      missRate:       Math.round(missRate * 100),
      weaknessScore,
      weakTopics,
      recommendation: weaknessScore > 60
        ? 'Critical — needs immediate attention'
        : weaknessScore > 30
        ? 'Needs extra focus'
        : 'On track',
    };
  })
  .sort((a, b) => b.weaknessScore - a.weaknessScore);

  return ranked;
}

module.exports = { optimizePlan, detectWeakTopics, buildPlanSummary };
