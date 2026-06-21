'use client';

import React from 'react';
import { HousePlan } from '../types/designer';
import { IndianRupee, BarChart3, Info, Download, ShieldCheck } from 'lucide-react';

interface CostEstimatorViewProps {
  plan: HousePlan;
}

export default function CostEstimatorView({ plan }: CostEstimatorViewProps) {
  const { costEstimate, config } = plan;
  const { totalCost, costPerSqFt, categories } = costEstimate;
  const area = config.plotWidth * config.plotLength;

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl h-full flex flex-col gap-6">
      
      {/* Top Banner: Total Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/50 border border-slate-850 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-slate-850 pb-3.5 md:pb-0 md:pr-4">
          <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Estimated Total Cost</span>
            <span className="text-2xl font-black text-white">{formatCurrency(totalCost)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-slate-850 pb-3.5 md:pb-0 md:px-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Build Rate per Sq. Ft.</span>
            <span className="text-xl font-bold text-white">{formatCurrency(costPerSqFt)} / sq.ft</span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 md:pl-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Total Built-Up Area</span>
            <span className="text-xl font-bold text-white">{area} Sq. Ft. <span className="text-xs text-slate-450 font-normal">({config.plotWidth}′ × {config.plotLength}′)</span></span>
          </div>
        </div>
      </div>

      {/* Main Breakdown Area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Budget & Category Breakdown
          </h3>
          <span className="text-[10px] text-slate-450 font-semibold tracking-wide bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            STYLE: {config.style.toUpperCase()}
          </span>
        </div>

        {/* Categories Progress Bars */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 max-h-[290px]">
          {categories.map((category, idx) => (
            <div key={idx} className="bg-slate-950/20 border border-slate-850/60 p-4 rounded-xl flex flex-col gap-2.5 hover:bg-slate-850/20 transition-all duration-150">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-250 text-sm">{category.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">{formatCurrency(category.cost)}</span>
                  <span className="text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">{category.percentage}%</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-850 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${category.percentage}%` }}
                />
              </div>

              {/* Note */}
              <div className="flex items-start gap-1.5 mt-1 text-[11px] text-slate-400 font-light leading-relaxed">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{category.notes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer warning info */}
      <div className="text-[10px] text-slate-550 border-t border-slate-850/80 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>* Estimates are based on average national builder pricing rates and are subject to localized material fluctuations.</span>
        <button 
          onClick={() => {
            alert('Cost report downloaded successfully (JSON mock)');
          }}
          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold pointer-events-auto transition cursor-pointer"
        >
          <Download className="w-3 h-3" />
          Export Estimate PDF
        </button>
      </div>

    </div>
  );
}
