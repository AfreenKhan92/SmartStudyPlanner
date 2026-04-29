import { useState } from 'react';

const TYPE_META = {
  study:    { label: 'Study',    color: 'badge-blue'  },
  revision: { label: 'Revision', color: 'badge-amber' },
  practice: { label: 'Practice', color: 'badge-teal'  },
};

export default function TaskCard({ task, planId, dayId, onToggle, disabled }) {
  const [loading, setLoading] = useState(false);
  const meta = TYPE_META[task.taskType] || TYPE_META.study;

  const handleToggle = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      await onToggle(planId, dayId, task._id, !task.isCompleted);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer
        ${task.isCompleted
          ? 'bg-emerald/5 border-emerald/20 opacity-70'
          : 'bg-surface border-border hover:border-accent/30 hover:bg-card'
        }`}
      onClick={handleToggle}
    >
      {/* Checkbox */}
      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
        ${task.isCompleted
          ? 'bg-emerald border-emerald'
          : 'border-border group-hover:border-accent/50'
        } ${loading ? 'animate-pulse' : ''}`}
      >
        {task.isCompleted && (
          <svg className="w-3 h-3 text-ink" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`text-sm font-medium leading-snug ${task.isCompleted ? 'line-through text-muted' : 'text-text'}`}
          >
            {task.topicName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subject dot + name */}
          <span className="flex items-center gap-1.5 text-xs text-ghost">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.subjectColor || '#6366f1' }}
            />
            {task.subjectName}
          </span>

          {/* Type badge */}
          <span className={meta.color}>{meta.label}</span>

          {/* Duration */}
          <span className="badge bg-surface border border-border text-ghost">
            ⏱ {task.duration}h
          </span>
        </div>
      </div>
    </div>
  );
}
