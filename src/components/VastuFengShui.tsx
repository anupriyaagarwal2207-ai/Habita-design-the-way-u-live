'use client';

import React from 'react';
import { HousePlan } from '../types/designer';
import { CheckCircle2, AlertTriangle, Info, HelpCircle } from 'lucide-react';

interface VastuFengShuiProps {
  plan: HousePlan;
}

export default function VastuFengShui({ plan }: VastuFengShuiProps) {
  const { vastuReport } = plan;
  const { score, items } = vastuReport;

  // Compute ring parameters for SVG circle score indicator
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color based on score
  let scoreColorClass = 'text-green-400';
  let scoreStroke = '#10B981'; // green
  if (score < 50) {
    scoreColorClass = 'text-red-400';
    scoreStroke = '#EF4444'; // red
  } else if (score < 80) {
    scoreColorClass = 'text-amber-400';
    scoreStroke = '#F59E0B'; // amber
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl h-full flex flex-col md:flex-row gap-8">
      
      {/* Left Column: Big Score Ring */}
      <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-slate-850 p-6 rounded-2xl shrink-0 md:w-64 text-center">
        <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Vastu Harmony Score</h3>
        
        <div className="relative w-36 h-36 flex items-center justify-center select-none">
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke={scoreStroke}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          <div className="flex flex-col items-center justify-center">
            <span className={`text-4xl font-extrabold ${scoreColorClass}`}>{score}%</span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">Compliance</span>
          </div>
        </div>

        <div className="mt-5 text-xs text-slate-400 leading-relaxed px-2">
          {score >= 80 ? (
            <p className="text-green-300 font-medium">🌟 Excellent layout alignment! Your design is highly optimized for cosmic flow.</p>
          ) : score >= 50 ? (
            <p className="text-amber-300 font-medium">⚖️ Fair alignment. Minor adjustments can significantly boost positive energy flow.</p>
          ) : (
            <p className="text-red-300 font-medium">⚠️ Suboptimal layout. We recommend relocating bathrooms or entrance doors to restore balance.</p>
          )}
        </div>
      </div>

      {/* Right Column: Detailed Rules List */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          Detailed Vastu & Feng Shui Analysis
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 max-h-[360px]">
          {items.map((item, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-xl border flex gap-3.5 transition hover:bg-slate-850/30 ${
                item.status === 'passed' 
                  ? 'bg-green-950/10 border-green-900/30' 
                  : item.status === 'warning' 
                    ? 'bg-red-950/10 border-red-900/30' 
                    : 'bg-blue-950/10 border-blue-900/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {item.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                {item.status === 'warning' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                {item.status === 'info' && <Info className="w-5 h-5 text-blue-400" />}
              </div>
              
              <div className="flex-1 flex flex-col gap-1">
                <span className={`text-sm font-semibold ${
                  item.status === 'passed' 
                    ? 'text-green-300' 
                    : item.status === 'warning' 
                      ? 'text-red-300' 
                      : 'text-blue-300'
                }`}>
                  {item.rule}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-light">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
