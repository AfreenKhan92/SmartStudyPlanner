export default function ProgressBar({ value = 0, label, showPercent = true, size = 'md', color }) {
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-xs text-ghost font-medium">{label}</span>}
          {showPercent && (
            <span className="text-xs font-mono text-accent">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <div className={`${heights[size]} bg-border rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: color || 'linear-gradient(90deg, #5b8df6, #2dd4bf)',
          }}
        />
      </div>
    </div>
  );
}
