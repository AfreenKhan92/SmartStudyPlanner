import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const SUBJECT_COLORS = [
  '#5b8df6','#2dd4bf','#fbbf24','#fb7185',
  '#a78bfa','#34d399','#f97316','#38bdf8',
];

const COMMON_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 
  'Economics', 'Computer Science', 'English', 'Literature', 'Psychology', 
  'Sociology', 'Philosophy', 'Art', 'Music', 'Business Studies', 'Accounting', 
  'Law', 'Engineering', 'Medicine'
];

const DIFFICULTY_META = {
  easy:   { label: 'Easy',   color: 'badge-green' },
  medium: { label: 'Medium', color: 'badge-amber' },
  hard:   { label: 'Hard',   color: 'badge-rose'  },
};

// ─── Topic item ───────────────────────────────────────────────────────────────
function TopicItem({ topic, subjectId, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    name:           topic.name,
    estimatedHours: String(topic.estimatedHours),
    difficulty:     topic.difficulty,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(subjectId, topic._id, form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={handleSave} className="bg-[var(--color-surface)] backdrop-blur-md rounded-xl p-3 space-y-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input text-sm py-2"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={form.estimatedHours}
            onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
            className="input text-sm py-2"
            min="0.25" max="20" step="0.25"
          />
          <select
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            className="input text-sm py-2"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-[var(--color-surface)] backdrop-blur-md rounded-xl px-4 py-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-text text-sm truncate">{topic.name}</span>
        <span className={DIFFICULTY_META[topic.difficulty]?.color || 'badge-blue'}>
          {DIFFICULTY_META[topic.difficulty]?.label}
        </span>
        <span className="text-ghost text-xs font-mono">{topic.estimatedHours}h</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="text-ghost hover:text-accent transition-colors text-sm px-1"
          title="Edit topic"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(subjectId, topic._id)}
          className="text-muted hover:text-rose transition-colors text-sm px-1"
          title="Delete topic"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Subject card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, onDelete, onUpdate, onAddTopic, onUpdateTopic, onDeleteTopic, expanded, onToggle }) {
  const [topicForm, setTopicForm] = useState({ name: '', estimatedHours: '1', difficulty: 'medium' });
  const [addingTopic, setAddingTopic] = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editingSubj, setEditingSubj] = useState(false);
  const [subjForm,    setSubjForm]    = useState({
    name:     subject.name,
    examDate: subject.examDate?.slice(0, 10) || '',
    priority: subject.priority,
  });
  const [savingSubj, setSavingSubj] = useState(false);

  const daysLeft = Math.ceil((new Date(subject.examDate) - new Date()) / 86400000);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    setAddingTopic(true);
    try {
      await onAddTopic(subject._id, topicForm);
      setTopicForm({ name: '', estimatedHours: '1', difficulty: 'medium' });
      setShowForm(false);
    } finally {
      setAddingTopic(false);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    setSavingSubj(true);
    try {
      await onUpdate(subject._id, subjForm);
      setEditingSubj(false);
    } finally {
      setSavingSubj(false);
    }
  };

  return (
    <div className="card-hover overflow-hidden">
      {/* Subject header */}
      <div className="p-5 cursor-pointer" onClick={!editingSubj ? onToggle : undefined}>
        {editingSubj ? (
          <form onSubmit={handleUpdateSubject} className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                list="subject-suggestions"
                value={subjForm.name}
                onChange={(e) => setSubjForm({ ...subjForm, name: e.target.value })}
                className="input text-sm"
                placeholder="Subject name"
                required
              />
              <input
                type="date"
                value={subjForm.examDate}
                onChange={(e) => setSubjForm({ ...subjForm, examDate: e.target.value })}
                className="input text-sm"
                required
              />
              <select
                value={subjForm.priority}
                onChange={(e) => setSubjForm({ ...subjForm, priority: e.target.value })}
                className="input text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingSubj} className="btn-primary text-sm">
                {savingSubj ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingSubj(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white/10"
                style={{ backgroundColor: subject.color }}
              />
              <div className="min-w-0">
                <h3 className="font-display font-600 text-text truncate">{subject.name}</h3>
                <p className="text-xs text-ghost mt-0.5">
                  Exam: {new Date(subject.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {daysLeft > 0
                    ? <span className={`ml-2 font-mono ${daysLeft <= 7 ? 'text-rose' : daysLeft <= 14 ? 'text-amber' : 'text-teal'}`}>
                        {daysLeft}d left
                      </span>
                    : <span className="ml-2 text-rose font-mono">Exam passed</span>}
                  <span className="ml-2 badge-blue capitalize">{subject.priority}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="badge-blue">{subject.topics?.length || 0} topics</span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingSubj(true); }}
                className="text-muted hover:text-accent transition-colors p-1 text-sm"
                title="Edit subject"
              >
                ✎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(subject._id); }}
                className="text-muted hover:text-rose transition-colors p-1"
              >
                ✕
              </button>
              <span className="text-ghost text-sm">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Topics */}
      {expanded && !editingSubj && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {subject.topics?.length > 0 ? (
            <div className="space-y-2 mb-4">
              {subject.topics.map((topic) => (
                <TopicItem
                  key={topic._id}
                  topic={topic}
                  subjectId={subject._id}
                  onDelete={onDeleteTopic}
                  onUpdate={onUpdateTopic}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm italic mb-4">No topics yet — add your first one below.</p>
          )}

          {showForm ? (
            <form onSubmit={handleAddTopic} className="bg-[var(--color-surface)] backdrop-blur-md rounded-xl p-4 space-y-3">
              <div>
                <label className="input-label">Topic Name</label>
                <input
                  type="text"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Linked Lists, World War II"
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
                <button type="submit" disabled={addingTopic} className="btn-primary text-sm">
                  {addingTopic ? 'Adding…' : 'Add Topic'}
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

// ─── Main Subjects Page ───────────────────────────────────────────────────────
export default function Subjects() {
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

  useEffect(() => {
    api.get('/subjects')
      .then(({ data }) => setSubjects(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const flash = (msg, type = 'error') => {
    if (type === 'error') { setError(msg); setTimeout(() => setError(''), 4000); }
    else                  { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

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
      flash('Subject added!', 'success');
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to add subject.');
    }
  };

  const handleUpdateSubject = async (id, updates) => {
    try {
      const { data } = await api.put(`/subjects/${id}`, updates);
      setSubjects((prev) => prev.map((s) => s._id === id ? { ...data.data, topics: s.topics } : s));
      flash('Subject updated!', 'success');
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to update subject.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete this subject and all its topics?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSubjects((prev) => prev.filter((s) => s._id !== id));
      flash('Subject deleted.', 'success');
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const handleAddTopic = async (subjectId, topicData) => {
    const { data } = await api.post(`/subjects/${subjectId}/topics`, topicData);
    setSubjects((prev) => prev.map((s) =>
      s._id === subjectId ? { ...s, topics: [...(s.topics || []), data.data] } : s
    ));
  };

  const handleUpdateTopic = async (subjectId, topicId, updates) => {
    const { data } = await api.put(`/subjects/${subjectId}/topics/${topicId}`, updates);
    setSubjects((prev) => prev.map((s) =>
      s._id === subjectId
        ? { ...s, topics: s.topics.map((t) => t._id === topicId ? data.data : t) }
        : s
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
    if (!subjectIds.length) { flash('Add at least one subject first.'); return; }
    const missingTopics = subjects.filter((s) => !s.topics?.length);
    if (missingTopics.length) {
      flash(`Add topics to: ${missingTopics.map((s) => s.name).join(', ')}`);
      return;
    }
    setGenerating(true);
    setError('');
    try {
      await api.post('/studyplan/generate', { subjectIds, dailyHours: user?.dailyStudyHours || 4 });
      flash('Study plan generated! Redirecting…', 'success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to generate plan.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 page-enter">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-700 text-text mb-2">Subjects & Topics</h1>
          <p className="text-ghost">Manage your study subjects, topics, and generate a personalised plan.</p>
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

        {/* Summary stats */}
        {subjects.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-700 text-accent">{subjects.length}</p>
              <p className="text-xs text-ghost mt-1">Subjects</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-700 text-teal">
                {subjects.reduce((n, s) => n + (s.topics?.length || 0), 0)}
              </p>
              <p className="text-xs text-ghost mt-1">Topics</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-display font-700 text-amber">
                {subjects.reduce((n, s) => n + (s.topics?.reduce((h, t) => h + (t.estimatedHours || 0), 0) || 0), 0).toFixed(1)}h
              </p>
              <p className="text-xs text-ghost mt-1">Total Hours</p>
            </div>
          </div>
        )}

        {/* Subject list */}
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
                onUpdate={handleUpdateSubject}
                onAddTopic={handleAddTopic}
                onUpdateTopic={handleUpdateTopic}
                onDeleteTopic={handleDeleteTopic}
              />
            ))}
          </div>
        )}

        {/* Add Subject form */}
        {showSubjForm ? (
          <form onSubmit={handleAddSubject} className="card p-6 space-y-4 mb-6">
            <h3 className="font-display font-600 text-text">New Subject</h3>
            <div>
              <label className="input-label">Subject Name</label>
              <input
                list="subject-suggestions"
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
      <datalist id="subject-suggestions">
        {COMMON_SUBJECTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
