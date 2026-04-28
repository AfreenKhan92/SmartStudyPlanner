import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-ghost font-medium uppercase tracking-wider">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-display font-700 ${accent || 'text-text'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

// ─── Mini day bar (for heatmap strip) ─────────────────────────────────────────
function DayBar({ day }) {
  const pct = day.total ? Math.round((day.done / day.total) * 100) : 0;
  const color = {
    completed: 'bg-emerald',
    partial:   'bg-amber',
    missed:    'bg-rose',
    pending:   'bg-border',
  }[day.dayStatus] || 'bg-border';

  return (
    <div className="flex flex-col items-center gap-1" title={`${day.date?.slice(0, 10)} — ${pct}%`}>
      <div className="w-5 h-16 bg-surface rounded-md overflow-hidden flex flex-col-reverse">
        <div className={`w-full ${color} transition-all`} style={{ height: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-muted font-mono">{day.dayNumber}</span>
    </div>
  );
}

// ─── Subject row ──────────────────────────────────────────────────────────────
function SubjectRow({ subject }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subject.color || '#6366f1' }} />
          <span className="text-sm text-text">{subject.name}</span>
          {subject.missed > 0 && (
            <span className="badge-rose text-[10px]">{subject.missed} missed</span>
          )}
        </div>
        <span className="text-xs font-mono text-ghost">
          {subject.done}/{subject.total} ({subject.completionRate}%)
        </span>
      </div>
      <ProgressBar
        value={subject.completionRate}
        showPercent={false}
        size="sm"
        color={subject.color}
      />
    </div>
  );
}

// ─── Main Progress page ───────────────────────────────────────────────────────
// ─── Main Progress page ───────────────────────────────────────────────────────
export default function Progress() {
  const [progress,  setProgress]  = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [insights,  setInsights]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const [progRes, insRes, statRes, analyticsRes] = await Promise.all([
        api.get('/studyplan/progress').catch(() => null),
        api.get('/studyplan/insights').catch(() => null),
        api.get('/auth/stats').catch(() => null),
        api.get('/analytics').catch(() => null),
      ]);
      if (progRes) setProgress(progRes.data.data);
      if (insRes)  setInsights(insRes.data.data || []);
      if (statRes) setStats(statRes.data.data);
      if (analyticsRes) setAnalytics(analyticsRes.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  if (!progress) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center page-enter">
          <div className="text-6xl mb-6">📊</div>
          <h1 className="text-2xl font-display font-700 text-text mb-3">No progress data</h1>
          <p className="text-ghost mb-8">Generate a study plan and start completing tasks to see your progress.</p>
          <a href="/plan" className="btn-primary px-8 py-3 text-base">Create Your Plan →</a>
        </div>
      </div>
    );
  }

  const { global: g, daily, subjectWise } = progress;

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 page-enter">

        <h1 className="text-3xl font-display font-700 text-text mb-2">Progress Tracking</h1>
        <p className="text-ghost text-sm mb-8">Your complete study performance overview</p>

        {/* ── Global stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Overall Progress"
            value={`${g.progressPercentage}%`}
            sub={`${g.completedTasks} / ${g.totalTasks} tasks`}
            accent="text-accent"
            icon="🎯"
          />
          <StatCard
            label="Tasks Completed"
            value={stats?.totalTasksCompleted ?? g.completedTasks}
            sub="all time"
            accent="text-emerald"
            icon="✅"
          />
          <StatCard
            label="Tasks Missed"
            value={g.missedTasks || 0}
            sub="auto-rescheduled"
            accent="text-rose"
            icon="⚠️"
          />
          <StatCard
            label="Current Streak"
            value={`${stats?.currentStreak ?? 0}d`}
            sub={`Best: ${stats?.longestStreak ?? 0} days`}
            accent="text-amber"
            icon="🔥"
          />
        </div>

        {/* ── Overall progress bar ── */}
        <div className="card p-5 mb-8">
          <ProgressBar
            value={g.progressPercentage}
            label={`Overall Completion — ${g.progressPercentage}%`}
            size="lg"
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-display font-700 text-emerald">{g.completedTasks}</p>
              <p className="text-xs text-ghost">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-700 text-amber">{g.totalTasks - g.completedTasks - (g.missedTasks || 0)}</p>
              <p className="text-xs text-ghost">Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-700 text-rose">{g.missedTasks || 0}</p>
              <p className="text-xs text-ghost">Missed</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left col: daily history + subject breakdown */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Daily history bars (Recharts) ── */}
            {analytics?.daily?.length > 0 && (
              <div className="card p-5">
                <h2 className="font-display font-600 text-text mb-4">Daily Performance</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e3a52" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.slice(5)} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e2433', borderColor: '#2e3a52' }} />
                      <Bar dataKey="done" stackId="a" fill="#34d399" name="Completed" />
                      <Bar dataKey="missed" stackId="a" fill="#fb7185" name="Missed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Subject-wise breakdown (Recharts) ── */}
            {analytics?.subjects?.length > 0 && (
              <div className="card p-5">
                <h2 className="font-display font-600 text-text mb-4">Subject Focus (Hours)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.subjects}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        label
                      >
                        {analytics.subjects.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e2433', borderColor: '#2e3a52' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Weekly Trend (Recharts) ── */}
            {analytics?.weekly?.length > 0 && (
              <div className="card p-5">
                <h2 className="font-display font-600 text-text mb-4">Weekly Trend</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e3a52" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e2433', borderColor: '#2e3a52' }} />
                      <Line type="monotone" dataKey="rate" stroke="#5b8df6" strokeWidth={3} name="Completion %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Right col: insights + user stats */}
          <div className="space-y-5">

            {/* ── Insights ── */}
            <div className="card p-5">
              <h2 className="font-display font-600 text-text mb-4">🧠 AI Insights</h2>
              <div className="space-y-3">
                {insights.length > 0 ? insights.map((ins, i) => (
                  <div key={i} className="text-sm text-ghost bg-surface rounded-xl p-3 border border-border leading-relaxed">
                    {ins}
                  </div>
                )) : (
                  <p className="text-muted text-sm italic">No insights yet. Keep studying!</p>
                )}
              </div>
            </div>

            {/* ── User stats ── */}
            {stats && (
              <div className="card p-5">
                <h2 className="font-display font-600 text-text mb-4">👤 Your Stats</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Consistency Score', value: `${stats.consistencyScore ?? 0}%`, color: 'text-accent' },
                    { label: 'Current Streak',    value: `${stats.currentStreak ?? 0} days`, color: 'text-amber' },
                    { label: 'Longest Streak',    value: `${stats.longestStreak ?? 0} days`, color: 'text-teal' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-xs text-ghost">{row.label}</span>
                      <span className={`text-sm font-display font-600 ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
