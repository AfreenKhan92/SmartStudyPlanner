import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const SUBJECT_COLORS = [
  '#5b8df6','#2dd4bf','#fbbf24','#fb7185',
  '#a78bfa','#34d399','#f97316','#38bdf8',
];

const DIFFICULTY_META = {
  easy:   { label: 'Easy',   color: 'badge-green' },
  medium: { label: 'Medium', color: 'badge-amber' },
  hard:   { label: 'Hard',   color: 'badge-rose'  },
};

// ─── Inline subject card ──────────────────────────────────────────────────────
function SubjectCard({ subject, onDelete, onAddTopic, onDeleteTopic, expanded, onToggle }) {
  const [topicForm, setTopicForm] = useState({ name: '', estimatedHours: '1', difficulty: 'medium' });
  const [adding, setAdding]       = useState(false);
  const [showForm, setShowForm]   = useState(false);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await onAddTopic(subject._id, topicForm);
      setTopicForm({ name: '', estimatedHours: '1', difficulty: 'medium' });
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const daysLeft = Math.ceil(
    (new Date(subject.examDate) - new Date()) / 86400000
  );

  return (
    <div className="card-hover overflow-hidden">
      {/* Subject header */}
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white/10"
              style={{ backgroundColor: subject.color }}
            />
            <div className="min-w-0">
              <h3 className="font-display font-600 text-text truncate">{subject.name}</h3>
              <p className="text-xs text-ghost mt-0.5">
                Exam: {new Date(subject.examDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
                {daysLeft > 0
                  ? <span className={`ml-2 font-mono ${daysLeft <= 7 ? 'text-rose' : daysLeft <= 14 ? 'text-amber' : 'text-teal'}`}>
                      {daysLeft}d left
                    </span>
                  : <span className="ml-2 text-rose font-mono">Exam passed</span>
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="badge-blue">{subject.topics?.length || 0} topics</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(subject._id); }}
              className="text-muted hover:text-rose transition-colors p-1"
            >
              ✕
            </button>
            <span className="text-ghost text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Expanded topics section */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {/* Topic list */}
          {subject.topics?.length > 0 ? (
            <div className="space-y-2 mb-4">
              {subject.topics.map((topic) => (
                <div key={topic._id}
                  className="flex items-center justify-between gap-3 bg-ink/40 rounded-xl px-4 py-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-text text-sm truncate">{topic.name}</span>
                    <span className={DIFFICULTY_META[topic.difficulty]?.color || 'badge-blue'}>
                      {DIFFICULTY_META[topic.difficulty]?.label}
                    </span>
                    <span className="text-ghost text-xs font-mono">{topic.estimatedHours}h</span>
                  </div>
                  <button
                    onClick={() => onDeleteTopic(subject._id, topic._id)}
                    className="text-muted hover:text-rose transition-colors opacity-0 group-hover:opacity-100 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm italic mb-4">No topics yet — add your first one below.</p>
          )}

          {/* Add topic form */}
          {showForm ? (
            <form onSubmit={handleAddTopic} className="bg-ink/40 rounded-xl p-4 space-y-3">
              <div>
                <label className="input-label">Topic Name</label>
                <input
                  type="text"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Linked Lists, World War II, Photosynthesis"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Est. Hours</label>
                  <input
                    type="number"
                    value={topicForm.estimatedHours}
                    onChange={(e) => setTopicForm({ ...topicForm, estimatedHours: e.target.value })}
                    className="input"
                    min="0.25" max="20" step="0.25"
                  />
                </div>
                <div>
                  <label className="input-label">Difficulty</label>
                  <select
                    value={topicForm.difficulty}
                    onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value })}
                    className="input"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={adding} className="btn-primary text-sm">
                  {adding ? 'Adding…' : 'Add Topic'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="btn-ghost text-sm w-full justify-center border-dashed"
            >
              + Add Topic
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InputForm() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [subjects,     setSubjects]     = useState([]);
  const [expandedId,   setExpandedId]   = useState(null);
  const [showSubjForm, setShowSubjForm] = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const [subjForm, setSubjForm] = useState({
    name: '', examDate: '', priority: 'medium',
    color: SUBJECT_COLORS[0],
  });

  // Load existing subjects
  useEffect(() => {
    api.get('/subjects')
      .then(({ data }) => setSubjects(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/subjects', subjForm);
      const newSubj  = { ...data.data, topics: [] };
      setSubjects((prev) => [...prev, newSubj]);
      setExpandedId(newSubj._id);
      setSubjForm({ name: '', examDate: '', priority: 'medium', color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length] });
      setShowSubjForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add subject.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete this subject and all its topics?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSubjects((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete subject.');
    }
  };

  const handleAddTopic = async (subjectId, topicData) => {
    const { data } = await api.post(`/subjects/${subjectId}/topics`, topicData);
    setSubjects((prev) => prev.map((s) =>
      s._id === subjectId ? { ...s, topics: [...(s.topics || []), data.data] } : s
    ));
  };

  const handleDeleteTopic = async (subjectId, topicId) => {
    await api.delete(`/subjects/${subjectId}/topics/${topicId}`);
    setSubjects((prev) => prev.map((s) =>
      s._id === subjectId
        ? { ...s, topics: s.topics.filter((t) => t._id !== topicId) }
        : s
    ));
  };

  const handleGenerate = async () => {
    const subjectIds = subjects.map((s) => s._id);
    if (!subjectIds.length) { setError('Add at least one subject first.'); return; }

    const missingTopics = subjects.filter((s) => !s.topics?.length);
    if (missingTopics.length) {
      setError(`Add topics to: ${missingTopics.map((s) => s.name).join(', ')}`);
      return;
    }

    setGenerating(true);
    setError('');
    try {
      await api.post('/studyplan/generate', {
        subjectIds,
        dailyHours: user?.dailyStudyHours || 4,
      });
      setSuccess('Study plan generated! Redirecting to dashboard…');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate plan.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-700 text-text mb-2">Study Planner</h1>
          <p className="text-ghost">Add your subjects, topics, and exam dates — we'll build the plan.</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-rose/10 border border-rose/20 rounded-xl px-4 py-3 text-rose text-sm mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald/10 border border-emerald/20 rounded-xl px-4 py-3 text-emerald text-sm mb-6">
            ✓ {success}
          </div>
        )}

        {/* Subjects list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {subjects.map((subj) => (
              <SubjectCard
                key={subj._id}
                subject={subj}
                expanded={expandedId === subj._id}
                onToggle={() => setExpandedId(expandedId === subj._id ? null : subj._id)}
                onDelete={handleDeleteSubject}
                onAddTopic={handleAddTopic}
                onDeleteTopic={handleDeleteTopic}
              />
            ))}
          </div>
        )}

        {/* Add Subject */}
        {showSubjForm ? (
          <form onSubmit={handleAddSubject} className="card p-6 space-y-4 mb-6">
            <h3 className="font-display font-600 text-text">New Subject</h3>

            <div>
              <label className="input-label">Subject Name</label>
              <input
                type="text"
                value={subjForm.name}
                onChange={(e) => setSubjForm({ ...subjForm, name: e.target.value })}
                className="input"
                placeholder="e.g. Mathematics, History, Biology"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Exam Date</label>
                <input
                  type="date"
                  value={subjForm.examDate}
                  onChange={(e) => setSubjForm({ ...subjForm, examDate: e.target.value })}
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="input-label">Priority</label>
                <select
                  value={subjForm.priority}
                  onChange={(e) => setSubjForm({ ...subjForm, priority: e.target.value })}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Color</label>
              <div className="flex gap-2 flex-wrap">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubjForm({ ...subjForm, color: c })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      subjForm.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-card scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Add Subject</button>
              <button type="button" onClick={() => setShowSubjForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowSubjForm(true)}
            className="btn-ghost w-full justify-center py-4 border-dashed mb-6 text-sm"
          >
            + Add Subject
          </button>
        )}

        {/* Generate Plan CTA */}
        {subjects.length > 0 && (
          <div className="card p-6 bg-gradient-to-r from-accent/5 to-teal/5 border-accent/20">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-display font-600 text-text mb-1">Ready to generate?</h3>
                <p className="text-ghost text-sm">
                  {subjects.length} subject{subjects.length !== 1 ? 's' : ''} ·{' '}
                  {subjects.reduce((n, s) => n + (s.topics?.length || 0), 0)} topics ·{' '}
                  {user?.dailyStudyHours}h/day
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary px-6 py-3 text-base"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating…
                  </>
                ) : '⚡ Generate Plan'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
