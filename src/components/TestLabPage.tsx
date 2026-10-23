import React, { useState } from 'react';
import { SEED_TEST_SCENARIOS } from '../data/seedData';
import { TestScenario } from '../types';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TestLabPageProps {
  onLoadScenarioIntoCheckout: (scenario: TestScenario) => void;
}

export const TestLabPage: React.FC<TestLabPageProps> = ({
  onLoadScenarioIntoCheckout,
}) => {
  const [running, setRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  // Auto-run all 4 official test scenarios on initial visit so audit results are immediately available (Suggestion 7)
  React.useEffect(() => {
    if (testResults.length === 0 && !running) {
      runAllTests();
    }
  }, []);

  const runAllTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setTestResults(data.results || []);
    } catch (err) {
      console.error('Test run failed:', err);
    } finally {
      setRunning(false);
    }
  };

  const runSingleTest = async (scenarioId: string) => {
    setRunning(true);
    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setTestResults((prev) => {
          const map = new Map(prev.map((r) => [r.scenario.id, r]));
          map.set(scenarioId, data.results[0]);
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Test run error:', err);
    } finally {
      setRunning(false);
    }
  };

  const getResultForScenario = (id: string) => {
    return testResults.find((r) => r.scenario.id === id);
  };

  const passedCount = testResults.filter((r) => r.pass).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Controls */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              LangGraph Invariant & Precision Lab
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Suggestion 7 Official Runs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Interactive Test Suite (4 Labelled Scenarios)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Each official run preserves specified input, expected result, actual result, scraped evidence, and explains any differences or audit rollbacks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {testResults.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
              <span>Results:</span>
              <span className={passedCount === SEED_TEST_SCENARIOS.length ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                {passedCount} / {SEED_TEST_SCENARIOS.length} Runs Passed
              </span>
            </div>
          )}

          <button
            onClick={runAllTests}
            disabled={running}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Executing Runs...' : 'Re-run All 4 Labelled Runs'}</span>
          </button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="space-y-6">
        {SEED_TEST_SCENARIOS.map((scenario, index) => {
          const result = getResultForScenario(scenario.id);
          const isExpanded = expandedTraceId === scenario.id;

          return (
            <div
              key={scenario.id}
              className={`rounded-2xl border transition-all ${
                result
                  ? result.pass
                    ? 'border-emerald-200 bg-white shadow-xs'
                    : 'border-red-200 bg-red-50/20 shadow-xs'
                  : 'border-slate-200 bg-white shadow-xs'
              }`}
            >
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        OFFICIAL RUN #{index + 1}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">{scenario.name}</h2>
                      {result && (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                            result.pass
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.pass ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>AUDIT VERIFIED</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>AUDIT FAILED</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {scenario.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onLoadScenarioIntoCheckout(scenario)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Load these exact items into live checkout and test voice or approval"
                    >
                      <span>Load into Checkout</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => runSingleTest(scenario.id)}
                      disabled={running}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Re-run only this scenario"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Audit Matrix (Suggestion 7) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      1. Specified Input
                    </span>
                    <p className="text-slate-800 font-semibold">{scenario.cartDescription}</p>
                    <p className="text-slate-500 text-[11px] font-mono mt-1">
                      Stable IDs: {scenario.cartItems.map((ci) => `${ci.productId} (${ci.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      2. Expected Result
                    </span>
                    <p className="text-slate-800 font-semibold">
                      Winner: <span className="font-mono text-blue-700">{scenario.expectedWinnerCard}</span>
                    </p>
                    <p className="text-slate-600 text-[11px] font-mono mt-0.5">
                      Code: {scenario.expectedOfferCode}
                    </p>
                    <p className="text-emerald-700 text-[11px] font-mono font-bold">
                      Saves: ₹{scenario.expectedSavings.toLocaleString('en-IN')} · Payable: ₹{scenario.expectedFinalTotal.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      3. Actual Result
                    </span>
                    {result ? (
                      <div>
                        <p className="text-slate-800 font-semibold">
                          Winner: <span className="font-mono text-blue-700">{result.actual.winnerCard}</span>
                        </p>
                        <p className="text-slate-600 text-[11px] font-mono mt-0.5">
                          Code: {result.actual.offerCode}
                        </p>
                        <p className="text-emerald-700 text-[11px] font-mono font-bold">
                          Saves: ₹{result.actual.savings.toLocaleString('en-IN')} · Observed: ₹{result.actual.finalTotal.toLocaleString('en-IN')}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Pending execution...</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      4. Decision Rule & Invariant
                    </span>
                    <p className="text-slate-700 leading-snug">{scenario.specialCheckDescription}</p>
                  </div>
                </div>

                {/* Test Run Output & Evidence */}
                {result && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <strong className="text-slate-800">Audit Outcome & Rationale:</strong>{' '}
                        <span className={result.pass ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                          {result.reason}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedTraceId(isExpanded ? null : scenario.id)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>{isExpanded ? 'Hide LangGraph Node Trace' : 'View 10-Node Graph Trace'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Scraped Evidence Box (Suggestion 2 & 7) */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                          <span>Scraped Audit Evidence from Named Bank Feed:</span>
                        </span>
                        <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {result.retrievalUrl}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-700 italic bg-slate-50 p-2 rounded">
                        "{result.evidence}"
                      </p>
                    </div>

                    {/* Expandable 10-Node Graph Step Trace */}
                    {isExpanded && result.stepTrace && (
                      <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5 overflow-x-auto max-h-64">
                        <div className="text-xs text-blue-400 font-bold mb-2">
                          LangGraph State Transition Trace (10 Nodes):
                        </div>
                        {result.stepTrace.map((st: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-3">
                            <span className="text-slate-500 w-6">[{sIdx + 1}]</span>
                            <span className="text-amber-300 w-48">{st.name}</span>
                            <span className={st.status === 'completed' ? 'text-emerald-400 font-bold' : st.status === 'failed' ? 'text-red-400 font-bold' : 'text-blue-300'}>
                              {st.status.toUpperCase()}
                            </span>
                            <span className="text-slate-400">{st.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
