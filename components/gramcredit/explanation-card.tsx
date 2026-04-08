"use client";

import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

interface SignalScore {
  name: string;
  score: number;
  confidence: number;
  contribution: number;
  direction: "positive" | "negative" | "neutral";
}

interface ExplanationCardProps {
  gramScore: number;
  signals: SignalScore[];
  topReasons: string[];
  improvements?: string[];
}

export function ExplanationCard({
  gramScore,
  signals,
  topReasons,
  improvements,
}: ExplanationCardProps) {
  const chartData = signals.map((signal) => ({
    name: signal.name,
    score: signal.score,
    contribution: Math.round(signal.contribution * 100),
  }));

  const positiveSignals = signals.filter((s) => s.direction === "positive");
  const negativeSignals = signals.filter((s) => s.direction === "negative");

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Decision Breakdown</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s how your GramScore of <strong>{gramScore.toFixed(1)}/100</strong> was calculated.
        </p>
      </div>

      {/* Signal Scores Chart */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-sm text-foreground mb-4">Signal Scores</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="score" fill="#3b82f6" name="Score" />
            <Bar dataKey="contribution" fill="#10b981" name="Weight (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Signal Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals.map((signal) => (
          <div
            key={signal.name}
            className={`p-4 rounded-lg border ${
              signal.direction === "positive"
                ? "bg-green-50 border-green-200"
                : signal.direction === "negative"
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-sm text-foreground">{signal.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Confidence: {(signal.confidence * 100).toFixed(0)}%
                </p>
              </div>
              {signal.direction === "positive" ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : signal.direction === "negative" ? (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ) : null}
            </div>
            <p className="text-2xl font-bold text-foreground">{signal.score.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Contribution: {(signal.contribution * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      {/* Top Reasons */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-foreground">Why This Decision?</h4>
        <div className="space-y-2">
          {topReasons.map((reason, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">{reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Improvement Suggestions */}
      {improvements && improvements.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">How to Improve</h4>
          <div className="space-y-2">
            {improvements.map((suggestion, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-900">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-muted-foreground">Positive Signals</p>
          <p className="text-lg font-bold text-green-600 mt-1">{positiveSignals.length}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-muted-foreground">Areas to Improve</p>
          <p className="text-lg font-bold text-orange-600 mt-1">{negativeSignals.length}</p>
        </div>
      </div>
    </Card>
  );
}
