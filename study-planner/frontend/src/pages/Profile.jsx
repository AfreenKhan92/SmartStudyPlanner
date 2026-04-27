import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const TIME_ICONS = { morning: '🌅', afternoon: '☀️', night: '🌙' };

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/auth/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, []);

  const initials = (user?.name || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 page-enter">
        <h1 className="text-3xl font-display font-700 text-text mb-8">Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Avatar + basic info */}
          <div className="md:col-span-1">
            <div className="card p-6 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-teal flex items-center justify-center text-2xl font-bold text-white shadow-glow">
                {initials}
              </div>
              <div>
                <h2 className="font-display font-700 text-text text-xl">{user?.name || '—'}</h2>
                <p className="text-ghost text-sm mt-0.5">{user?.email || '—'}</p>
                {user?.course && (
                  <p className="text-muted text-xs mt-1">
                    {user.course}{user.year ? `, ${user.year}` : ''}{user.college ? ` · ${user.college}` : ''}
                  </p>
                )}
              </div>
              <Link to="/profile/edit" className="btn-primary text-sm w-full text-center">
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-5">

            {/* Study preferences */}
            <div className="card p-5">
              <h3 className="font-display font-600 text-text mb-4">Study Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  label="Daily Study Hours"
                  value={`${user?.dailyStudyHours || 4}h / day`}
                />
                <InfoRow
                  label="Preferred Study Time"
                  value={
                    user?.preferredStudyTime
                      ? `${TIME_ICONS[user.preferredStudyTime] || ''} ${user.preferredStudyTime}`
                      : '—'
                  }
                />
              </div>

              {user?.weakSubjects?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-ghost uppercase tracking-wider mb-2">Weak Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {user.weakSubjects.map((s) => (
                      <span key={s} className="badge-rose">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Performance stats */}
            <div className="card p-5">
              <h3 className="font-display font-600 text-text mb-4">Performance Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <StatMini
                  label="Tasks Done"
                  value={stats?.totalTasksCompleted ?? 0}
                  icon="✅"
                  color="text-emerald"
                />
                <StatMini
                  label="Current Streak"
                  value={`${stats?.currentStreak ?? 0}d`}
                  icon="🔥"
                  color="text-amber"
                />
                <StatMini
                  label="Consistency"
                  value={`${stats?.consistencyScore ?? 0}%`}
                  icon="📈"
                  color="text-accent"
                />
              </div>

              {stats && (
                <div className="mt-4 bg-surface rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-ghost">Plan Progress</span>
                    <span className="text-xs font-mono text-text">{stats.planProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-ink rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-teal rounded-full transition-all"
                      style={{ width: `${stats.planProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-2">
                    {stats.completedTasks} / {stats.totalTasks} tasks completed in active plan
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ghost uppercase tracking-wider mb-1">{label}</p>
      <p className="text-text text-sm capitalize">{value || '—'}</p>
    </div>
  );
}

function StatMini({ label, value, icon, color }) {
  return (
    <div className="bg-surface rounded-xl p-3 border border-border text-center">
      <p className="text-xl mb-1">{icon}</p>
      <p className={`text-xl font-display font-700 ${color}`}>{value}</p>
      <p className="text-xs text-ghost mt-1">{label}</p>
    </div>
  );
}
