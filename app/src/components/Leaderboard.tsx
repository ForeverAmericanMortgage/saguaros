"use client";

import { useState } from "react";
import { teams, type Team } from "@/data/mock";

type Filter = "ALL" | "ABC" | "BFK";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function TeamRow({ team, rank }: { team: Team; rank: number }) {
  const progress = Math.min((team.totalRaised / team.goal) * 100, 100);
  const isTopThree = rank <= 3;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg ${isTopThree ? "bg-gold-50 border border-gold-200" : "bg-white border border-gray-100"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        rank === 1 ? "bg-gold-500 text-white" :
        rank === 2 ? "bg-gray-300 text-gray-800" :
        rank === 3 ? "bg-orange-400 text-white" :
        "bg-gray-100 text-gray-500"
      }`}>
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            team.division === "ABC" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
          }`}>
            {team.division}
          </span>
        </div>
        <p className="text-sm text-gray-500">{team.company} &middot; Capt. {team.captain}</p>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 100 ? "bg-saguaro-500" :
                progress >= 75 ? "bg-saguaro-400" :
                progress >= 50 ? "bg-gold-400" :
                "bg-gold-300"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-lg font-bold text-gray-900">{formatCurrency(team.totalRaised)}</p>
        <p className="text-xs text-gray-400">of {formatCurrency(team.goal)}</p>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = filter === "ALL" ? teams : teams.filter((t) => t.division === filter);
  const sorted = [...filtered].sort((a, b) => b.totalRaised - a.totalRaised);

  const grandTotal = teams.reduce((sum, t) => sum + t.totalRaised, 0);
  const orgGoal = 2000000;
  const orgProgress = (grandTotal / orgGoal) * 100;

  return (
    <section id="leaderboard" className="py-20 bg-gray-50 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Team Leaderboard
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See where your team stands in the race for the Captain&apos;s Cup and Broker&apos;s Cup.
          </p>
        </div>

        {/* Grand total */}
        <div className="bg-saguaro-900 text-white rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-saguaro-300 text-sm font-medium">Total Raised Across All Teams</p>
              <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-saguaro-300 text-sm font-medium">2026 Goal</p>
              <p className="text-2xl font-bold text-gold-400">{formatCurrency(orgGoal)}</p>
            </div>
          </div>
          <div className="h-3 bg-saguaro-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-400 rounded-full transition-all"
              style={{ width: `${Math.min(orgProgress, 100)}%` }}
            />
          </div>
          <p className="text-saguaro-400 text-sm mt-2 text-center">
            {Math.round(orgProgress)}% of goal
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["ALL", "ABC", "BFK"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-saguaro-800 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-saguaro-300 hover:text-saguaro-700"
              }`}
            >
              {f === "ALL" ? "All Teams" : f}
            </button>
          ))}
        </div>

        {/* Award labels */}
        <div className="flex justify-center gap-4 mb-6 text-sm">
          {filter !== "BFK" && (
            <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Captain&apos;s Cup (ABC)
            </span>
          )}
          {filter !== "ABC" && (
            <span className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Broker&apos;s Cup (BFK)
            </span>
          )}
        </div>

        {/* Team list */}
        <div className="space-y-3">
          {sorted.map((team, index) => (
            <TeamRow key={team.id} team={team} rank={index + 1} />
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Leaderboard updated weekly. Last update: Feb 18, 2026.
        </p>
      </div>
    </section>
  );
}
