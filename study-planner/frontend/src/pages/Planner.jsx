import { useState, useEffect, useCallback } from 'react';
import { format, isToday, isPast, isFuture, parseISO, startOfDay } from 'date-fns';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import ProgressBar from '../components/ProgressBar';

// ── Helpers ──────────────────────────────────────────────────────────────────
function dayStatus(day) {
  if (!day.tasks.length) return 'empty';
  const done   = day.tasks.filter((t) => t.status === 'completed' || t.isCompleted).length;
  const missed = day.tasks.filter((t) => t.status === 'missed').length;
  if (done === day.tasks.length) return 'completed';
  if (done > 0 || missed > 0)   return 'partial';
  const date = new Date(day.date);
  if (isPast(date) && !isToday(date)) return 'missed';
  return 'pending';
}

function statusColor(s) {
  return {
    completed: 'border-emerald/40 bg-emerald/5',
    partial:   'border-amber/40 bg-amber/5',
    missed:    'border-rose/40 bg-rose/5',
    pending:   'border-border bg-surface',
    empty:     'border-border bg-surface',
  }[s] || 'border-border bg-surface';
}

function statusBadge(s) {
  return {
    completed: <span className="badge-green">✓ Completed</span>,
    partial:   <span className="badge-amber">◑ Partial</span>,
    missed:    <span className="badge-rose">✗ Missed</span>,
    pending:   <span className="badge-blue">○ Pending</span>,
    empty:     null,
  }[s];
}

// ── Day Pill ─────────────────────────────────────────────────────────────────
function DayPill({ day, isSelected, onClick }) {
  const date = new Date(day.date);
  const done = day.tasks.filter((t) => t.isCompleted || t.status === 'completed').length;
  const pct  = day.tasks.length ? Math.round((done / day.tasks.length) * 100) : 0;
  const st   = dayStatus(day);

  const base = 'flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 min-w-[3.5rem]';
  const active = isSelected ? 'bg-accent border-accent text-white shadow-glow' : '';
  const today  = !isSelected && isToday(date) ? 'bg-accent/10 border-accent/30 text-accent' : '';
  const past   = !isSelected && !isToday(date) && isPast(date) ? 'bg-surface border-border text-muted' : '';
  const future = !isSelected && isFuture(date) ? 'bg-surface border-border text-ghost hover:border-accent/30' : '';

  return (
    <button onClick={onClick} className={`${base} ${active || today || past || future}`}>
      <span className="font-mono">{format(date, 'EEE')}</span>
      <span className={`font-display font-700 text-base leading-none ${isSelected ? 'text-white' : ''}`}>
        {format(date, 'd')}
      </span>
      {day.tasks.length > 0 && (
        <div className={`w-6 h-1 rounded-full ${st === 'completed' ? 'bg-emerald' : 'bg-border'}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: st === 'completed' ? undefined : '#5b8df6' }}
          />
        </div>
      )}
    </button>
  );
}

// ── Main Planner Page ─────────────────────────────────────────────────────────
export default function Planner() {
  const [plan,       setPlan]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [selDay,     setSelDay]     = useState(null);
  const [filter,     setFilter]     = useState('all');
  const [detecting,  setDetecting]  = useState(false);
  const [viewMode,   setViewMode]   = useState('day'); // 'day' | 'week'
  const [weekOffset, setWeekOffset] = useState(0);
  const [msg,        setMsg]        = useState('');

  const loadPlan = useCallback(async () => {
    try {
      const { data } = await api.get('/studyplan');
      setPlan(data.data);
      const today = data.data.days.find((d) => isToday(new Date(d.date)));
      const first = data.data.days.find((d) => !isPast(new Date(d.date)) || isToday(new Date(d.date)));
      setSelDay(today || first || data.data.days[0]);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const handleToggleTask = async (planId, dayId, taskId, isCompleted) => {
    const { data } = await api.patch(`/studyplan/task/${planId}/${dayId}/${taskId}`, { isCompleted });
    setPlan((prev) => ({
      ...prev,
      completedTasks: data.completedTasks,
      totalTasks:     data.totalTasks,
      days: prev.days.map((d) => {
        if (d._id !== dayId) return d;
        return {
          ...d,
          tasks: d.tasks.map((t) =>
            t._id === taskId ? { ...t, isCompleted, status: isCompleted ? 'completed' : 'pending' } : t
          ),
        };
      }),
    }));
    setSelDay((prev) => {
      if (!prev || prev._id !== dayId) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t._id === taskId ? { ...t, isCompleted, status: isCompleted ? 'completed' : 'pending' } : t
        ),
      };
    });
  };

  const handleDetectMissed = async () => {
    setDetecting(true);
    setMsg('');
    try {
      const { data } = await api.post('/studyplan/detect-missed');
      setMsg(data.message);
      setPlan(data.data);
      // Re-select today if available
      const today = data.data.days.find((d) => isToday(new Date(d.date)));
      if (today) setSelDay(today);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error detecting missed tasks.');
    } finally {
      setDetecting(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const filteredTasks = selDay?.tasks?.filter((t) => {
    if (filter === 'pending')   return t.status === 'pending'   || (!t.status && !t.isCompleted);
    if (filter === 'completed') return t.status === 'completed' || t.isCompleted;
    if (filter === 'missed')    return t.status === 'missed';
    return true;
  }) || [];

  // Week view: show 7 days at a time
  const weekStart = weekOffset * 7;
  const weekDays  = plan?.days.slice(weekStart, weekStart + 7) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center page-enter">
          <div className="text-6xl mb-6">📅</div>
          <h1 className="text-2xl font-display font-700 text-text mb-3">No study plan yet</h1>
          <p className="text-ghost mb-8">Generate a plan first to view your full planner.</p>
          <a href="/plan" className="btn-primary px-8 py-3 text-base">Create Your Plan →</a>
        </div>
      </div>
    );
  }

  const overallPct = plan.totalTasks
    ? Math.round((plan.completedTasks / plan.totalTasks) * 100)
    : 0;

  const selSt = selDay ? dayStatus(selDay) : 'pending';

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-700 text-text mb-1">Full Planner</h1>
            <p className="text-ghost text-sm">{plan.title} · {plan.days.length} days</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
              {['day', 'week'].map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                    ${viewMode === m ? 'bg-accent text-white' : 'text-ghost hover:text-text'}`}
                >
                  {m === 'day' ? '📋 Day View' : '📅 Week View'}
                </button>
              ))}
            </div>
            <button
              onClick={handleDetectMissed}
              disabled={detecting}
              className="btn-ghost text-sm"
              title="Detect past incomplete tasks and reschedule them"
            >
              {detecting ? 'Checking…' : '🔄 Reschedule Missed'}
            </button>
          </div>
        </div>

        {/* Flash message */}
        {msg && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-accent text-sm mb-6">
            {msg}
          </div>
        )}

        {/* Overall progress bar */}
        <div className="card p-4 mb-6">
          <ProgressBar value={overallPct} label={`Overall — ${plan.completedTasks}/${plan.totalTasks} tasks`} size="lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Day navigation + tasks */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Day scroll strip ── */}
            {viewMode === 'day' && (
              <div className="card p-4">
                <p className="text-xs text-ghost uppercase tracking-wider mb-3">All Days</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
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
            )}

            {/* ── Week view ── */}
            {viewMode === 'week' && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-ghost uppercase tracking-wider">
                    Week {weekOffset + 1} of {Math.ceil(plan.days.length / 7)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                      disabled={weekOffset === 0}
                      className="text-ghost hover:text-text disabled:opacity-30 text-sm px-2"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setWeekOffset((w) => Math.min(Math.ceil(plan.days.length / 7) - 1, w + 1))}
                      disabled={weekStart + 7 >= plan.days.length}
                      className="text-ghost hover:text-text disabled:opacity-30 text-sm px-2"
                    >
                      Next →
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const st   = dayStatus(day);
                    const done = day.tasks.filter((t) => t.isCompleted || t.status === 'completed').length;
                    return (
                      <button
                        key={day._id}
                        onClick={() => { setSelDay(day); setViewMode('day'); }}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs transition-all
                          ${selDay?._id === day._id ? 'border-accent bg-accent/10' : statusColor(st)}`}
                      >
                        <span className="text-muted font-mono">{format(new Date(day.date), 'EEE')}</span>
                        <span className="font-display font-700 text-text">{format(new Date(day.date), 'd')}</span>
                        <span className="text-ghost">{done}/{day.tasks.length}</span>
                        {isToday(new Date(day.date)) && <span className="text-accent text-[10px] font-bold">TODAY</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Selected day tasks ── */}
            {selDay && (
              <div className={`card p-5 border ${statusColor(selSt)}`}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display font-600 text-text">
                        {format(new Date(selDay.date), 'EEEE, MMMM d')}
                      </h2>
                      {isToday(new Date(selDay.date)) && (
                        <span className="badge-blue animate-pulse-glow">Today</span>
                      )}
                      {selDay.isRevisionDay && <span className="badge-amber">Revision Day</span>}
                      {statusBadge(selSt)}
                    </div>
                    <p className="text-xs text-ghost mt-1">
                      Day {selDay.dayNumber} · {selDay.totalHours}h planned
                    </p>
                  </div>

                  {/* Filter */}
                  <div className="flex gap-1 bg-surface rounded-xl p-1">
                    {['all', 'pending', 'completed', 'missed'].map((f) => (
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
                    {filter === 'pending' ? 'All tasks done for this day! 🎉' : `No ${filter} tasks.`}
                  </p>
                )}

                {selDay.tasks.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <ProgressBar
                      value={selDay.tasks.length
                        ? (selDay.tasks.filter((t) => t.isCompleted || t.status === 'completed').length / selDay.tasks.length) * 100
                        : 0}
                      label={`${selDay.tasks.filter((t) => t.isCompleted || t.status === 'completed').length} of ${selDay.tasks.length} complete`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Plan status */}
            <div className="card p-5">
              <h3 className="font-display font-600 text-text mb-3">Plan Status</h3>
              <PlanStatusControl planId={plan._id} currentStatus={plan.status} onReload={loadPlan} />
            </div>

            {/* Day summary */}
            <div className="card p-5">
              <h3 className="font-display font-600 text-text mb-3">Day Summary</h3>
              <div className="space-y-2">
                {[
                  { label: 'Total Days',     value: plan.days.length },
                  { label: 'Completed Days', value: plan.days.filter((d) => dayStatus(d) === 'completed').length, color: 'text-emerald' },
                  { label: 'Partial Days',   value: plan.days.filter((d) => dayStatus(d) === 'partial').length,   color: 'text-amber' },
                  { label: 'Missed Days',    value: plan.days.filter((d) => dayStatus(d) === 'missed').length,    color: 'text-rose' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs text-ghost">{row.label}</span>
                    <span className={`text-sm font-mono font-600 ${row.color || 'text-text'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick jump to today */}
            <button
              onClick={() => {
                const t = plan.days.find((d) => isToday(new Date(d.date)));
                if (t) { setSelDay(t); setViewMode('day'); }
              }}
              className="btn-primary w-full text-sm"
            >
              📅 Jump to Today
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Plan status control component ────────────────────────────────────────────
function PlanStatusControl({ currentStatus, onReload }) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api.patch('/studyplan/status', { status: newStatus });
      onReload();
    } catch (e) {
      alert(e.response?.data?.message || 'Error updating plan status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${currentStatus === 'active' ? 'bg-emerald animate-pulse' : 'bg-amber'}`} />
        <span className="text-sm text-text capitalize">{currentStatus}</span>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`btn-ghost text-sm w-full ${currentStatus === 'active' ? 'hover:text-amber' : 'hover:text-emerald'}`}
      >
        {saving ? 'Updating…' : currentStatus === 'active' ? '⏸ Pause Plan' : '▶ Resume Plan'}
      </button>
    </div>
  );
}
