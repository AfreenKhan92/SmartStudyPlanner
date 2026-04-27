import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isPast } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import ProgressBar from '../components/ProgressBar';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-ghost font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-display font-700 ${accent || 'text-text'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

// ─── Day nav pill ─────────────────────────────────────────────────────────────
function DayPill({ day, isSelected, onClick }) {
  const date = new Date(day.date);
  const done = day.tasks.filter((t) => t.isCompleted).length;
  const pct  = day.tasks.length ? Math.round((done / day.tasks.length) * 100) : 0;

  const isExamDay  = false; // could flag if exam is that day
  const dayIsPast  = isPast(date) && !isToday(date);

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl
        border text-xs font-medium transition-all duration-200 min-w-[3.5rem]
        ${isSelected
          ? 'bg-accent border-accent text-white shadow-glow'
          : isToday(date)
          ? 'bg-accent/10 border-accent/30 text-accent'
          : dayIsPast
          ? 'bg-surface border-border text-muted'
          : 'bg-surface border-border text-ghost hover:border-accent/30 hover:text-text'
        }`}
    >
      <span className="font-mono">{format(date, 'EEE')}</span>
      <span className={`font-display font-700 text-base leading-none ${isSelected ? 'text-white' : ''}`}>
        {format(date, 'd')}
      </span>
      {day.tasks.length > 0 && (
        <div className={`w-6 h-1 rounded-full ${pct === 100 ? 'bg-emerald' : 'bg-border'}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? undefined : '#5b8df6' }}
          />
        </div>
      )}
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }  = useAuth();
  const [plan,     setPlan]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selDay,   setSelDay]   = useState(null);
  const [filter,   setFilter]   = useState('all');
  const [insights, setInsights] = useState([]);
  const [regen,    setRegen]    = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadPlan = useCallback(async () => {
    try {
      const [planRes, insRes] = await Promise.all([
        api.get('/studyplan'),
        api.get('/studyplan/insights').catch(() => null),
      ]);
      setPlan(planRes.data.data);
      if (insRes) setInsights(insRes.data.data || []);

      const today = planRes.data.days?.find((d) => isToday(new Date(d.date)))
        || planRes.data.data.days?.find((d) => isToday(new Date(d.date)));
      const first = planRes.data.data.days?.find(
        (d) => !isPast(new Date(d.date)) || isToday(new Date(d.date))
      );
      setSelDay(today || first || planRes.data.data.days?.[0]);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleRegeneratePlan = async (mode = 'partial') => {
    if (!confirm(`Regenerate plan (${mode} mode)? This will create a new version.`)) return;
    setRegen(true);
    try {
      await api.post('/studyplan/regenerate', { mode });
      await loadPlan();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to regenerate.');
    } finally {
      setRegen(false);
    }
  };

  const handleOptimizePlan = async () => {
    setOptimizing(true);
    try {
      const { data } = await api.post('/ai/optimize');
      alert('Plan optimized successfully! AI Suggestions:\n\n' + data.data.suggestions.join('\n'));
      await loadPlan();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to optimize plan.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/pdf/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `study_plan_v${plan.version}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleTask = async (planId, dayId, taskId, isCompleted) => {
    const { data } = await api.patch(`/studyplan/task/${planId}/${dayId}/${taskId}`, { isCompleted });

    // Update local state immutably
    setPlan((prev) => {
      const updatedDays = prev.days.map((d) => {
        if (d._id !== dayId) return d;
        return {
          ...d,
          tasks: d.tasks.map((t) =>
            t._id === taskId ? { ...t, isCompleted, completedAt: isCompleted ? new Date() : undefined } : t
          ),
        };
      });
      return {
        ...prev,
        days:           updatedDays,
        completedTasks: data.completedTasks,
        totalTasks:     data.totalTasks,
      };
    });

    // Keep selDay in sync
    setSelDay((prev) => {
      if (!prev || prev._id !== dayId) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t._id === taskId ? { ...t, isCompleted } : t
        ),
      };
    });
  };

  const handleDeletePlan = async () => {
    if (!confirm('Delete your current study plan?')) return;
    await api.delete('/studyplan');
    setPlan(null);
  };

  // ── No plan state ──────────────────────────────────────────────────────────
  if (!loading && !plan) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center page-enter">
          <div className="text-6xl mb-6">📋</div>
          <h2 className="text-2xl font-display font-700 text-text mb-3">No study plan yet</h2>
          <p className="text-ghost mb-8">Add your subjects and topics to generate a personalised plan.</p>
          <Link to="/plan" className="btn-primary px-8 py-3 text-base">
            Create Your Plan →
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const overallPct = plan.totalTasks ? Math.round((plan.completedTasks / plan.totalTasks) * 100) : 0;
  const todayDay   = plan.days.find((d) => isToday(new Date(d.date)));
  const todayPct   = todayDay?.tasks?.length
    ? Math.round((todayDay.tasks.filter((t) => t.isCompleted).length / todayDay.tasks.length) * 100)
    : 0;
  const upcoming   = plan.days.filter((d) => !isPast(new Date(d.date)) || isToday(new Date(d.date)));

  const filteredTasks = selDay?.tasks?.filter((t) => {
    if (filter === 'pending') return !t.isCompleted;
    if (filter === 'done')    return t.isCompleted;
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 page-enter">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-700 text-text mb-1">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="text-accent">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-ghost text-sm">{plan.title}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {plan.status === 'paused' && (
              <span className="badge-amber text-xs self-center">⏸ Paused</span>
            )}
            <button onClick={handleOptimizePlan} disabled={optimizing} className="btn-primary text-sm bg-purple-600 hover:bg-purple-700 border-purple-600">
              {optimizing ? 'Optimizing…' : '✨ AI Optimize'}
            </button>
            <button onClick={() => handleRegeneratePlan('partial')} disabled={regen} className="btn-ghost text-sm">
              {regen ? '…' : '🔄 Regenerate'}
            </button>
            <button onClick={handleDownloadPDF} disabled={downloading} className="btn-ghost text-sm">
              {downloading ? '⬇️...' : '⬇️ Export PDF'}
            </button>
            <Link to="/planner" className="btn-ghost text-sm">Full Planner</Link>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Overall Progress"
            value={`${overallPct}%`}
            sub={`${plan.completedTasks} / ${plan.totalTasks} tasks`}
            accent="text-accent"
          />
          <StatCard
            label="Today's Tasks"
            value={todayDay ? `${todayDay.tasks.filter(t => t.isCompleted).length}/${todayDay.tasks.length}` : '—'}
            sub={todayDay ? `${todayPct}% done` : 'No tasks today'}
            accent="text-teal"
          />
          <StatCard
            label="Days Remaining"
            value={upcoming.length}
            sub={`of ${plan.days.length} total days`}
            accent="text-amber"
          />
          <StatCard
            label="Daily Target"
            value={`${user?.dailyStudyHours}h`}
            sub="study hours"
            accent="text-ghost"
          />
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <div className="card p-5 mb-8">
          <ProgressBar value={overallPct} label="Overall completion" size="lg" />
        </div>

        {/* ── Main layout ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Day scroll strip + tasks ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Horizontal day scroll */}
            <div className="card p-4">
              <p className="text-xs text-ghost uppercase tracking-wider mb-3">Days</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {plan.days.map((day) => (
                  <DayPill
                    key={day._id}
                    day={day}
                    isSelected={selDay?._id === day._id}
                    onClick={() => setSelDay(day)}
                  />
                ))}
              </div>
            </div>

            {/* Selected day tasks */}
            {selDay && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-600 text-text">
                        {format(new Date(selDay.date), 'EEEE, MMMM d')}
                      </h2>
                      {isToday(new Date(selDay.date)) && (
                        <span className="badge-blue animate-pulse-glow">Today</span>
                      )}
                      {selDay.isRevisionDay && (
                        <span className="badge-amber">Revision Day</span>
                      )}
                    </div>
                    <p className="text-xs text-ghost mt-1">
                      Day {selDay.dayNumber} · {selDay.totalHours}h planned
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 bg-surface rounded-xl p-1">
                    {['all', 'pending', 'done'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                          ${filter === f ? 'bg-accent text-white' : 'text-ghost hover:text-text'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task cards */}
                {filteredTasks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        planId={plan._id}
                        dayId={selDay._id}
                        onToggle={handleToggleTask}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted text-sm py-8 italic">
                    {filter === 'pending' ? 'All tasks done for this day! 🎉' : 'No tasks to show.'}
                  </p>
                )}

                {/* Day progress */}
                {selDay.tasks.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <ProgressBar
                      value={selDay.tasks.length
                        ? (selDay.tasks.filter((t) => t.isCompleted).length / selDay.tasks.length) * 100
                        : 0}
                      label={`${selDay.tasks.filter((t) => t.isCompleted).length} of ${selDay.tasks.length} complete`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar: upcoming days ───────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-display font-600 text-text mb-4">Upcoming Days</h3>
              <div className="space-y-3">
                {upcoming.slice(0, 7).map((day) => {
                  const done = day.tasks.filter((t) => t.isCompleted).length;
                  const pct  = day.tasks.length ? Math.round((done / day.tasks.length) * 100) : 0;

                  return (
                    <button
                      key={day._id}
                      onClick={() => setSelDay(day)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200
                        ${selDay?._id === day._id
                          ? 'border-accent/30 bg-accent/5'
                          : 'border-border bg-surface hover:border-accent/20'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-text">
                          {isToday(new Date(day.date))
                            ? 'Today'
                            : format(new Date(day.date), 'EEE, MMM d')}
                        </span>
                        <span className="text-xs font-mono text-ghost">{day.totalHours}h</span>
                      </div>
                      <ProgressBar value={pct} showPercent={false} size="sm" />
                      <p className="text-xs text-muted mt-1.5">
                        {done}/{day.tasks.length} tasks
                        {day.isRevisionDay && ' · Revision'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="card p-5">
              <h3 className="font-display font-600 text-text mb-4">Subjects</h3>
              <div className="space-y-3">
                {Object.values(
                  plan.days.flatMap((d) => d.tasks).reduce((acc, t) => {
                    if (!acc[t.subjectName]) {
                      acc[t.subjectName] = { name: t.subjectName, color: t.subjectColor, total: 0, done: 0 };
                    }
                    acc[t.subjectName].total++;
                    if (t.isCompleted || t.status === 'completed') acc[t.subjectName].done++;
                    return acc;
                  }, {})
                ).map((subj) => (
                  <div key={subj.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subj.color }} />
                        <span className="text-sm text-text">{subj.name}</span>
                      </div>
                      <span className="text-xs font-mono text-ghost">{subj.done}/{subj.total}</span>
                    </div>
                    <ProgressBar
                      value={subj.total ? (subj.done / subj.total) * 100 : 0}
                      showPercent={false}
                      size="sm"
                      color={subj.color}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Insights panel */}
            {insights.length > 0 && (
              <div className="card p-5">
                <h3 className="font-display font-600 text-text mb-3">🧠 Insights</h3>
                <div className="space-y-2">
                  {insights.slice(0, 3).map((ins, i) => (
                    <p key={i} className="text-xs text-ghost bg-surface rounded-xl p-3 border border-border leading-relaxed">
                      {ins}
                    </p>
                  ))}
                  <Link to="/progress" className="block text-xs text-accent text-center mt-2 hover:underline">
                    View full progress →
                  </Link>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
