import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';

export default function Optimize() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Analyzing your study patterns...",
    "Identifying subject bottlenecks...",
    "Calculating optimal revision gaps...",
    "Finalizing AI suggestions..."
  ];

  useEffect(() => {
    let stepInterval;
    if (loading) {
      stepInterval = setInterval(() => {
        setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 1500);
    }

    const runOptimization = async () => {
      try {
        const { data } = await api.post('/ai/optimize');
        setResults(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to optimize plan.');
      } finally {
        setTimeout(() => {
          setLoading(false);
          clearInterval(stepInterval);
        }, 1000);
      }
    };

    runOptimization();

    return () => clearInterval(stepInterval);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-display font-bold text-text mb-2">Optimization Failed</h2>
          <p className="text-ghost mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary px-6 py-2">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!loading && !results) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-display font-bold text-text mb-2">No Results Found</h2>
          <p className="text-ghost mb-6">We couldn't generate optimization results at this time.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary px-6 py-2">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🧠</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-text mb-2">AI Optimizing...</h2>
              <p className="text-ghost font-medium animate-pulse">{steps[currentStep]}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-display font-bold text-text mb-2">Optimization Results</h1>
                <p className="text-ghost font-medium">AI-driven improvements for your Study Plan</p>
              </div>
              <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm">
                ← Back
              </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6 border-accent/20 bg-accent/5">
                <p className="text-xs text-ghost font-semibold uppercase mb-1">Source</p>
                <p className="text-xl font-bold text-accent capitalize">{results.source || 'Standard'}</p>
              </div>
              <div className="card p-6 border-emerald/20 bg-emerald/5">
                <p className="text-xs text-ghost font-semibold uppercase mb-1">Weak Subjects</p>
                <p className="text-xl font-bold text-emerald">{results.weakSubjects?.length || 0}</p>
              </div>
              <div className="card p-6 border-amber/20 bg-amber/5">
                <p className="text-xs text-ghost font-semibold uppercase mb-1">Revision Points</p>
                <p className="text-xl font-bold text-amber">{results.revisionRecommendations?.length || 0}</p>
              </div>
            </div>

            {/* Suggestions Section */}
            <div className="card p-8">
              <h3 className="text-xl font-display font-bold text-text mb-6 flex items-center gap-2">
                <span className="text-accent">✨</span> Strategic Suggestions
              </h3>
              <div className="space-y-4">
                {results.suggestions?.map((s, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-surface/50 border border-border group hover:border-accent/40 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 font-bold group-hover:bg-accent group-hover:text-white transition-colors">
                      {i + 1}
                    </div>
                    <p className="text-text font-medium leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail sections if available */}
            {(results.weakSubjects?.length > 0 || results.overloadedDays?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.weakSubjects?.length > 0 && (
                  <div className="card p-6">
                    <h4 className="font-bold text-text mb-4">Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {results.weakSubjects.map((s, i) => (
                        <span key={i} className="badge-blue px-3 py-1.5">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {results.overloadedDays?.length > 0 && (
                  <div className="card p-6">
                    <h4 className="font-bold text-text mb-4">Overloaded Days</h4>
                    <p className="text-sm text-ghost mb-3">These days exceed your daily study goal:</p>
                    <div className="flex flex-wrap gap-2">
                      {results.overloadedDays.map((d, i) => (
                        <span key={i} className="badge-amber px-3 py-1.5">Day {d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Final Action */}
            <div className="flex justify-center pt-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-primary px-12 py-3 text-lg shadow-glow hover:scale-105 transition-all"
              >
                Apply & Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
