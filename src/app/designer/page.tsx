'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DesignConfig, 
  HousePlan, 
  DesignStyle, 
  Room, 
  Furniture 
} from '../../types/designer';
import { generateProceduralPlan } from '../../utils/aiGenerator';
import FloorPlanner2D from '../../components/FloorPlanner2D';
import Walkthrough3D from '../../components/Walkthrough3D';
import VastuFengShui from '../../components/VastuFengShui';
import CostEstimatorView from '../../components/CostEstimatorView';
import confetti from 'canvas-confetti';
import { 
  Compass, 
  Hammer, 
  Sparkles, 
  Eye, 
  Layers, 
  Save, 
  Settings, 
  FolderHeart, 
  HelpCircle,
  FileCode,
  Image as ImageIcon,
  IndianRupee,
  Share2,
  Trash2,
  BookOpen,
  ArrowRight,
  FlameKindling
} from 'lucide-react';

const PRESET_REQUIREMENTS = [
  { id: 'garden', name: 'Front Garden 🌿' },
  { id: 'pool', name: 'Swimming Pool 🏊' },
  { id: 'home office', name: 'Home Office 💻' },
  { id: 'gym', name: 'Home Gym 🏋️' },
  { id: 'garage', name: 'Car Garage 🚗' }
];

export default function Home() {
  // Config state
  const [config, setConfig] = useState<DesignConfig>({
    style: 'Modern',
    budget: 1500000,
    bedrooms: 2,
    bathrooms: 2,
    plotWidth: 30,
    plotLength: 50,
    requirements: ['garden', 'home office']
  });

  // Active plan state (initially null, user generates or loads one)
  const [activePlan, setActivePlan] = useState<HousePlan | null>(null);
  
  // App UI states
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'ai' | 'vastu' | 'cost'>('2d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPlans, setSavedPlans] = useState<HousePlan[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  
  // Custom image generation prompt & result state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageTabStyle, setImageTabStyle] = useState('Modern');

  // Load saved designs and API key from local storage on mount
  useEffect(() => {
    const plans = localStorage.getItem('dream_house_plans');
    if (plans) {
      try {
        setSavedPlans(JSON.parse(plans));
      } catch (e) {
        console.error(e);
      }
    }
    const key = localStorage.getItem('dream_house_openai_key');
    if (key) {
      setUserApiKey(key);
    }

    // Load quick config from the home page configurator (if user came from there)
    const quickConfigRaw = localStorage.getItem('habita_quick_config');
    let startConfig = {
      style: 'Modern' as const,
      budget: 1800000,
      bedrooms: 2,
      bathrooms: 2,
      plotWidth: 35,
      plotLength: 60,
      requirements: ['garden', 'pool', 'home office']
    };
    if (quickConfigRaw) {
      try {
        const parsed = JSON.parse(quickConfigRaw);
        startConfig = { ...startConfig, ...parsed };
        setConfig(parsed);
        localStorage.removeItem('habita_quick_config');
      } catch (e) {
        console.error(e);
      }
    }

    // Generate an initial plan using the resolved config
    const defaultPlan = generateProceduralPlan(startConfig);
    setActivePlan(defaultPlan);
    setAiPrompt(`High-quality detailed render of a ${startConfig.style} style house interior, open-plan living room, warm ambient lighting.`);
    if (defaultPlan.variations && defaultPlan.variations.length > 0) {
      setGeneratedImageUrl(defaultPlan.variations[0].imageUrl);
    }
  }, []);

  // Sync API key to local storage
  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('dream_house_openai_key', key);
    setShowSettings(false);
  };

  // Generate a plan via API or local fallback
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, userApiKey })
      });

      if (!response.ok) {
        throw new Error('Server generation route failed');
      }

      const data = await response.json();
      setActivePlan(data.plan);
      
      // Update image tab states
      setImageTabStyle(config.style);
      setAiPrompt(`High-quality photorealistic render of a ${config.style} style house interior, featuring detailed furnishings, luxury layout, volumetric soft lighting.`);
      if (data.plan.variations && data.plan.variations.length > 0) {
        setGeneratedImageUrl(data.plan.variations[0].imageUrl);
      }

      // Celebrate success!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      console.error(err);
      // Fallback local procedural generation
      const fallback = generateProceduralPlan(config);
      setActivePlan(fallback);
      if (fallback.variations && fallback.variations.length > 0) {
        setGeneratedImageUrl(fallback.variations[0].imageUrl);
      }
    } finally {
      setIsGenerating(false);
      setActiveTab('2d');
    }
  };

  // Generate Custom AI Concept image
  const handleGenerateConceptImage = async () => {
    if (!activePlan) return;
    setIsGeneratingImage(true);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt, 
          style: imageTabStyle,
          userApiKey 
        })
      });

      if (!response.ok) throw new Error('Image API call failed');
      const data = await response.json();
      setGeneratedImageUrl(data.imageUrl);

      // Save variation into the current active plan
      if (activePlan) {
        const newVariation = {
          id: Math.random().toString(36).substring(2, 9),
          name: data.name || 'AI Generated Render',
          description: data.description || aiPrompt,
          imageUrl: data.imageUrl
        };
        const updatedVariations = [newVariation, ...(activePlan.variations || [])];
        const updatedPlan = { ...activePlan, variations: updatedVariations };
        setActivePlan(updatedPlan);
        
        // Update local storage if this plan was already saved
        const updatedPlans = savedPlans.map(p => p.id === activePlan.id ? updatedPlan : p);
        setSavedPlans(updatedPlans);
        localStorage.setItem('dream_house_plans', JSON.stringify(updatedPlans));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate image. Using stock fallback.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Save plan to Library
  const handleSavePlan = () => {
    if (!activePlan) return;
    
    const isAlreadySaved = savedPlans.some(p => p.id === activePlan.id);
    let updated: HousePlan[] = [];

    if (isAlreadySaved) {
      updated = savedPlans.map(p => p.id === activePlan.id ? activePlan : p);
    } else {
      updated = [activePlan, ...savedPlans];
    }

    setSavedPlans(updated);
    localStorage.setItem('dream_house_plans', JSON.stringify(updated));
    
    confetti({
      particleCount: 50,
      spread: 50,
      colors: ['#4F46E5', '#818CF8']
    });
    alert('Design saved successfully to your library!');
  };

  // Delete plan from Library
  const handleDeletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this design?')) return;
    const updated = savedPlans.filter(p => p.id !== id);
    setSavedPlans(updated);
    localStorage.setItem('dream_house_plans', JSON.stringify(updated));
    if (activePlan?.id === id) {
      setActivePlan(null);
    }
  };

  // Handle manual 2D floor plan modifications
  const handlePlanChange = (updatedPlan: HousePlan) => {
    // Dynamically re-evaluate Vastu & Cost estimates since coordinates/rooms changed
    const area = updatedPlan.config.plotWidth * updatedPlan.config.plotLength;
    
    // Simple dynamic cost recalculate
    let baseRate = 1500;
    if (updatedPlan.config.style === 'Modern') baseRate = 1800;
    if (updatedPlan.config.style === 'Luxury') baseRate = 2800;
    if (updatedPlan.config.style === 'Traditional') baseRate = 1650;
    
    const totalCost = area * baseRate;
    const updatedCost = {
      ...updatedPlan.costEstimate,
      totalCost: Math.round(totalCost),
      categories: updatedPlan.costEstimate.categories.map(c => ({
        ...c,
        cost: Math.round(totalCost * (c.percentage / 100))
      }))
    };

    // Vastu recalculation helper imported
    const evaluateVastuReport = require('../../utils/aiGenerator').evaluateVastuReport;
    const updatedVastu = evaluateVastuReport(updatedPlan.rooms, updatedPlan.config);

    const fullUpdatedPlan = {
      ...updatedPlan,
      costEstimate: updatedCost,
      vastuReport: updatedVastu
    };

    setActivePlan(fullUpdatedPlan);
  };

  // Toggle checklist options
  const handleToggleRequirement = (id: string) => {
    setConfig(prev => {
      const exists = prev.requirements.includes(id);
      const requirements = exists
        ? prev.requirements.filter(r => r !== id)
        : [...prev.requirements, id];
      return { ...prev, requirements };
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Header Banner */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent uppercase">Habita</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Interactive Designer</span>
            </div>
          </Link>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-400 transition text-xs font-semibold px-3 flex items-center gap-1.5"
          >
            ← Home
          </Link>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-indigo-400 transition"
            title="API Key Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          {activePlan && (
            <button
              onClick={handleSavePlan}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-xs transition active:scale-95 shadow-md shadow-indigo-600/10 border border-indigo-500/30"
            >
              <Save className="w-3.5 h-3.5" />
              Save Design
            </button>
          )}
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden w-full mx-auto p-4 sm:p-6 gap-4">
        
        {/* Left Column: Generator Form (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* Config form */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 backdrop-blur-md shadow-lg flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              House Configuration
            </h2>

            <form onSubmit={handleGeneratePlan} className="flex flex-col gap-4">
              
              {/* Style selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-450 font-bold uppercase tracking-wider">Architectural Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Modern', 'Minimalist', 'Luxury', 'Traditional'] as DesignStyle[]).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, style }))}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                        config.style === style 
                          ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200' 
                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900 hover:border-slate-800'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid: Bedrooms & Bathrooms */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-450 font-bold uppercase tracking-wider">Bedrooms (BHK)</label>
                  <select
                    value={config.bedrooms}
                    onChange={(e) => setConfig(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
                    className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n} Bedroom{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-450 font-bold uppercase tracking-wider">Bathrooms</label>
                  <select
                    value={config.bathrooms}
                    onChange={(e) => setConfig(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
                    className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n} Bathroom{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Plot Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-450 font-bold uppercase tracking-wider">Plot Width (ft)</label>
                  <input
                    type="number"
                    min="15"
                    max="100"
                    value={config.plotWidth}
                    onChange={(e) => setConfig(prev => ({ ...prev, plotWidth: Number(e.target.value) }))}
                    className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-450 font-bold uppercase tracking-wider">Plot Length (ft)</label>
                  <input
                    type="number"
                    min="20"
                    max="150"
                    value={config.plotLength}
                    onChange={(e) => setConfig(prev => ({ ...prev, plotLength: Number(e.target.value) }))}
                    className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Budget Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-455">
                  <span>Target Budget</span>
                  <span className="text-indigo-400 font-black">₹{config.budget.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="8000000"
                  step="100000"
                  value={config.budget}
                  onChange={(e) => setConfig(prev => ({ ...prev, budget: Number(e.target.value) }))}
                  className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Special Features Checklist */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-450 font-bold uppercase tracking-wider mb-1">Special Requirements</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_REQUIREMENTS.map((req) => {
                    const active = config.requirements.includes(req.id);
                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => handleToggleRequirement(req.id)}
                        className={`px-3 py-1.5 rounded-full text-xs transition border ${
                          active 
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200' 
                            : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        {req.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3 rounded-xl text-sm transition active:scale-98 shadow-md flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Synthesizing House Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 group-hover:animate-pulse" />
                    Generate AI Layout
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 2. Library/Saved Designs */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 backdrop-blur-md shadow-lg flex flex-col gap-3.5">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <FolderHeart className="w-4.5 h-4.5 text-purple-400" />
              Saved Layouts Library ({savedPlans.length})
            </h3>
            
            {savedPlans.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 italic">
                No designs saved yet. Generate a layout and save it!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {savedPlans.map((planItem) => (
                  <div
                    key={planItem.id}
                    onClick={() => {
                      setActivePlan(planItem);
                      if (planItem.variations && planItem.variations.length > 0) {
                        setGeneratedImageUrl(planItem.variations[0].imageUrl);
                      }
                      confetti({ particleCount: 20 });
                    }}
                    className={`p-3 rounded-xl border transition flex items-center justify-between group cursor-pointer ${
                      activePlan?.id === planItem.id
                        ? 'bg-indigo-950/35 border-indigo-500/60 text-white'
                        : 'bg-slate-950/50 border-slate-900/60 hover:bg-slate-900/70 hover:border-slate-800 text-slate-350'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 max-w-[75%]">
                      <span className="text-xs font-semibold truncate">{planItem.name}</span>
                      <span className="text-[9px] text-slate-550 font-medium capitalize">
                        {planItem.config.style} • {planItem.config.bedrooms}BHK • {planItem.config.plotWidth}x{planItem.config.plotLength} ft
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeletePlan(planItem.id, e)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-slate-850 hover:border-red-900/40 transition opacity-0 group-hover:opacity-100"
                      title="Delete Design"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Workspaces (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-4 h-[850px] lg:h-auto min-h-[700px]">
          
          {/* Workspace Tab Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-1.5 border border-slate-900 rounded-xl select-none shrink-0">
            <div className="flex flex-wrap gap-1">
              {[
                { id: '2d', name: '2D Floor Planner', icon: Layers },
                { id: '3d', name: '3D Walkthrough', icon: Eye },
                { id: 'ai', name: 'AI Interiors', icon: ImageIcon },
                { id: 'vastu', name: 'Vastu Analysis', icon: FlameKindling },
                { id: 'cost', name: 'Cost Estimator', icon: IndianRupee }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow shadow-indigo-600/10'
                        : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
            
            {activePlan && (
              <span className="text-[10px] text-indigo-400 bg-indigo-950/30 border border-indigo-900 px-2 py-0.5 rounded font-mono mr-2 hidden sm:block">
                PLAN: {activePlan.name}
              </span>
            )}
          </div>

          {/* Workspace Body */}
          <div className="flex-1 min-h-0 relative">
            {activePlan ? (
              <>
                {activeTab === '2d' && (
                  <FloorPlanner2D 
                    plan={activePlan} 
                    onChange={handlePlanChange} 
                  />
                )}

                {activeTab === '3d' && (
                  <Walkthrough3D plan={activePlan} />
                )}

                {activeTab === 'vastu' && (
                  <VastuFengShui plan={activePlan} />
                )}

                {activeTab === 'cost' && (
                  <CostEstimatorView plan={activePlan} />
                )}

                {activeTab === 'ai' && (
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl h-full flex flex-col md:flex-row gap-6 overflow-hidden">
                    {/* Visualizer controls */}
                    <div className="md:w-72 flex flex-col gap-4 shrink-0 justify-between">
                      <div className="flex flex-col gap-3.5">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            AI Concept Visuals
                          </h3>
                          <span className="text-[10px] text-slate-500 font-light leading-relaxed">
                            Generate photo-realistic renders of interior styles using DALL-E.
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Target Area Style</label>
                          <select
                            value={imageTabStyle}
                            onChange={(e) => setImageTabStyle(e.target.value)}
                            className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {['Modern', 'Minimalist', 'Luxury', 'Traditional'].map(st => (
                              <option key={st} value={st}>{st} Style</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Prompt Guide</label>
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={4}
                            className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-light leading-normal"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateConceptImage}
                        disabled={isGeneratingImage}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-98 shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isGeneratingImage ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Rendering Concept...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Render New Concept
                          </>
                        )}
                      </button>
                    </div>

                    {/* Visualizer Image Canvas */}
                    <div className="flex-1 bg-slate-950/80 border border-slate-850 rounded-2xl overflow-hidden relative flex items-center justify-center group shadow-inner min-h-[300px]">
                      {generatedImageUrl ? (
                        <>
                          <img
                            src={generatedImageUrl}
                            alt="Concept visual rendering"
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-101"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition duration-200">
                            <h4 className="text-xs font-bold text-indigo-300">Design Concept Illustration</h4>
                            <p className="text-[10px] text-slate-350 leading-relaxed font-light mt-0.5">{aiPrompt}</p>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-650 text-xs italic flex flex-col items-center gap-2 select-none">
                          <ImageIcon className="w-8 h-8 text-slate-700 animate-pulse" />
                          <span>No concept generated. Tap "Render New Concept" to begin.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full border border-slate-900 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-900/10">
                <Compass className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-slate-300">No active house plan</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Select a preset plan from the library or input your parameters on the left to synthesize a new custom layout.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. API Key Settings Modal overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative select-none">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Settings & Integrations
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Enter your own OpenAI API key. We store this credentials securely in your browser's local storage. This enables custom AI floor plan synthesis and custom DALL-E concept image generation.
            </p>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">OpenAI API Key</label>
              <input
                type="password"
                placeholder="sk-..."
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-700 w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-400 transition"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleSaveApiKey(userApiKey)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white transition shadow shadow-indigo-600/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
