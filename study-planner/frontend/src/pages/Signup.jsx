import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', dailyStudyHours: '4',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, Number(form.dailyStudyHours));
      navigate('/plan');
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Signup failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dot-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md page-enter">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-teal shadow-glow mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="text-3xl font-display font-700 text-text mb-2">Create account</h1>
          <p className="text-ghost text-sm">Start planning smarter, not harder</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {error && (
            <div className="bg-rose/10 border border-rose/20 rounded-xl px-4 py-3 text-rose text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input"
                placeholder="Alex Johnson"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="alex@example.com"
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input"
                placeholder="Min. 6 characters"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="input-label">Daily Study Hours</label>
              <div className="relative">
                <input
                  type="number"
                  name="dailyStudyHours"
                  value={form.dailyStudyHours}
                  onChange={handleChange}
                  className="input pr-12"
                  min="0.5"
                  max="16"
                  step="0.5"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ghost text-sm">hrs</span>
              </div>
              <p className="text-xs text-muted mt-1.5">How many hours can you study each day?</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : 'Get Started →'}
            </button>
          </form>
        </div>

        <p className="text-center text-ghost text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
