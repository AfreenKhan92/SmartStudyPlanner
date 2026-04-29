import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

const STUDY_TIMES = ['morning', 'afternoon', 'night'];

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName:           user?.fullName || user?.name || '',
    dailyStudyHours:    String(user?.dailyStudyHours || 4),
    preferredStudyTime: user?.preferredStudyTime || 'morning',
    weakSubjects:       (user?.weakSubjects || []).join(', '),
    college:            user?.college || '',
    course:             user?.course  || '',
    year:               user?.year    || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        fullName:           form.fullName.trim(),
        dailyStudyHours:    Number(form.dailyStudyHours),
        preferredStudyTime: form.preferredStudyTime,
        weakSubjects:       form.weakSubjects.split(',').map((s) => s.trim()).filter(Boolean),
        college:            form.college.trim(),
        course:             form.course.trim(),
        year:               form.year.trim(),
      };

      const { data } = await api.patch('/auth/profile', payload);
      updateUser(data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 page-enter">
        <h1 className="text-3xl font-display font-700 text-text mb-6">Edit Profile</h1>

        <Card className="p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose/10 border border-rose/20 rounded-xl px-4 py-3 text-rose text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald/10 border border-emerald/20 rounded-xl px-4 py-3 text-emerald text-sm">
                ✓ {success}
              </div>
            )}

            {/* Full Name */}
            <Input
              label="Full Name"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              required
              minLength={2}
            />

            {/* Daily Study Hours */}
            <Input
              label="Daily Study Hours"
              name="dailyStudyHours"
              type="number"
              min="0.5" max="16" step="0.5"
              value={form.dailyStudyHours}
              onChange={handleChange}
              required
            />

            {/* Preferred Study Time */}
            <div>
              <label className="input-label">Preferred Study Time</label>
              <div className="flex gap-2">
                {STUDY_TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, preferredStudyTime: t }))}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all
                      ${form.preferredStudyTime === t
                        ? 'bg-accent border-accent text-white'
                        : 'border-border text-ghost hover:border-accent/30'}`}
                  >
                    {t === 'morning' ? '🌅' : t === 'afternoon' ? '☀️' : '🌙'} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Weak Subjects */}
            <div>
              <Input
                label="Weak Subjects (comma-separated)"
                name="weakSubjects"
                type="text"
                value={form.weakSubjects}
                onChange={handleChange}
                placeholder="e.g. Mathematics, Physics"
              />
              <p className="text-xs text-muted mt-1">These will be prioritised in your study plan.</p>
            </div>

            {/* Academic info */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-ghost uppercase tracking-wider mb-3">Academic Details (Optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="College" name="college" type="text" value={form.college} onChange={handleChange} />
                <Input label="Course" name="course" type="text" value={form.course} onChange={handleChange} />
                <Input label="Year" name="year" type="text" value={form.year} onChange={handleChange} placeholder="e.g. 2nd Year" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={saving}>
                Save Changes
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate('/profile')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
