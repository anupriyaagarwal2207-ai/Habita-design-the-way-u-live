'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Compass,
  Sparkles,
  ArrowRight,
  Layers,
  Eye,
  Cpu,
  Home,
  Bed,
  Bath,
  Maximize2,
  ChevronDown,
  Star,
  CheckCircle2,
  Play,
  TreePine,
  Waves,
  Car,
  Dumbbell,
  IndianRupee,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type DesignStyle = 'Modern' | 'Minimalist' | 'Luxury' | 'Traditional';

interface QuickConfig {
  style: DesignStyle;
  bedrooms: number;
  bathrooms: number;
  plotWidth: number;
  plotLength: number;
  budget: number;
  requirements: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STYLES: { id: DesignStyle; label: string; emoji: string; desc: string }[] = [
  { id: 'Modern', label: 'Modern', emoji: '🏙️', desc: 'Clean lines & glass' },
  { id: 'Minimalist', label: 'Minimalist', emoji: '⬜', desc: 'Less is more' },
  { id: 'Luxury', label: 'Luxury', emoji: '✨', desc: 'Premium finishes' },
  { id: 'Traditional', label: 'Traditional', emoji: '🏡', desc: 'Timeless warmth' },
];

const FEATURES = [
  {
    icon: Layers,
    title: '2D Floor Planner',
    description: 'Drag-and-drop rooms and furniture on an accurate grid. Customise every corner of your layout in real time.',
    color: 'from-indigo-600 to-blue-600',
    glow: 'shadow-indigo-500/30',
  },
  {
    icon: Eye,
    title: '3D Walkthrough',
    description: `Step inside your home before it's built. Walk through rooms, explore every angle and feel the space.`,
    color: 'from-violet-600 to-purple-600',
    glow: 'shadow-violet-500/30',
  },
  {
    icon: Compass,
    title: 'Vastu & Feng Shui',
    description: 'AI-powered directional analysis scores your layout against ancient wisdom for harmony and prosperity.',
    color: 'from-emerald-600 to-teal-600',
    glow: 'shadow-emerald-500/30',
  },
  {
    icon: IndianRupee,
    title: 'Cost Estimator',
    description: 'Instant, itemised construction cost breakdowns by category—foundation, finishes, MEP and more.',
    color: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/30',
  },
  {
    icon: Sparkles,
    title: 'AI Concept Renders',
    description: 'Generate photorealistic concept images of your future home with a single click using AI image generation.',
    color: 'from-pink-600 to-rose-600',
    glow: 'shadow-pink-500/30',
  },
  {
    icon: Cpu,
    title: 'AI Floor Plan Generation',
    description: 'Describe your dream home and let our AI design a full floor plan complete with furniture placement.',
    color: 'from-cyan-600 to-sky-600',
    glow: 'shadow-cyan-500/30',
  },
];

const STATS = [
  { value: '50+', label: 'Design Styles' },
  { value: '∞', label: 'Customisations' },
  { value: '100%', label: 'Free to Try' },
  { value: '4', label: 'AI Engines' },
];

const REQUIREMENTS = [
  { id: 'garden', label: 'Garden', icon: TreePine },
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'garage', label: 'Garage', icon: Car },
  { id: 'gym', label: 'Home Gym', icon: Dumbbell },
];

const GALLERY = [
  {
    src: '/images/hero_house.png',
    label: 'Modern Villa',
    tag: 'Exterior',
    style: 'Modern',
  },
  {
    src: '/images/interior_modern.png',
    label: 'Contemporary Living',
    tag: 'Interior',
    style: 'Minimalist',
  },
  {
    src: '/images/interior_luxury.png',
    label: 'Luxury Penthouse',
    tag: 'Interior',
    style: 'Luxury',
  },
];

// ─── Animated Counter ─────────────────────────────────────────────────────────
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [config, setConfig] = useState<QuickConfig>({
    style: 'Modern',
    bedrooms: 3,
    bathrooms: 2,
    plotWidth: 35,
    plotLength: 55,
    budget: 2000000,
    requirements: ['garden'],
  });

  const [scrolled, setScrolled] = useState(false);
  const [activeGallery, setActiveGallery] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-rotate gallery
  useEffect(() => {
    const id = setInterval(() => setActiveGallery(g => (g + 1) % GALLERY.length), 4000);
    return () => clearInterval(id);
  }, []);

  const toggleRequirement = (id: string) => {
    setConfig(prev => ({
      ...prev,
      requirements: prev.requirements.includes(id)
        ? prev.requirements.filter(r => r !== id)
        : [...prev.requirements, id],
    }));
  };

  const launchDesigner = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('habita_quick_config', JSON.stringify(config));
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 overflow-x-hidden font-sans selection:bg-indigo-500/40">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-[#070b13]/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/40'
            : 'bg-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Compass className="w-4 h-4 text-white" style={{ animation: 'spin 12s linear infinite' }} />
            </div>
            <div>
              <span className="font-black tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent text-5xl leading-none block drop-shadow-[0_0_18px_rgba(139,92,246,0.7)]">
                Habita
              </span>
              <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">design the way u live</span>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#gallery" className="hover:text-white transition">Gallery</a>
            <a href="#configurator" className="hover:text-white transition">Configurator</a>
          </div>

          {/* CTA */}
          <Link
            href="/designer"
            onClick={launchDesigner}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Open Designer
          </Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero_house.png"
            alt="Modern luxury villa rendered by Habita AI"
            fill
            priority
            className="object-cover object-center scale-105"
            style={{ filter: 'brightness(0.35) saturate(1.2)' }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b13]/60 via-transparent to-[#070b13]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b13]/50 via-transparent to-transparent" />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold tracking-wide mb-8">
            <Sparkles className="w-3 h-3" />
            AI-Powered Architectural Design
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="text-white">Design your</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              dream home
            </span>
            <br />
            <span className="text-white">in minutes.</span>
          </h1>

          <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Habita combines AI floor plan generation, interactive 2D editing, immersive 3D walkthroughs,
            Vastu analysis, and real-time cost estimation — all in one beautiful tool.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/designer"
              onClick={launchDesigner}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition-all duration-200 shadow-2xl shadow-indigo-600/30 active:scale-95 group"
            >
              <Sparkles className="w-5 h-5" />
              Start Designing for Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all duration-200 backdrop-blur-sm"
            >
              <Play className="w-4 h-4" />
              See How It Works
            </a>
          </div>

          {/* Scroll cue */}
          <div className="mt-16 flex justify-center animate-bounce">
            <ChevronDown className="w-6 h-6 text-slate-500" />
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="relative py-16 border-y border-white/5 bg-white/2">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1"
              style={{ opacity: statsInView ? 1 : 0, transform: statsInView ? 'none' : 'translateY(20px)', transition: `opacity 0.6s ${i * 0.1}s, transform 0.6s ${i * 0.1}s` }}
            >
              <span className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {s.value}
              </span>
              <span className="text-slate-400 text-sm font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-semibold tracking-wide mb-5">
            <Star className="w-3 h-3" />
            Everything you need
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            A complete design studio
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Every feature you'd find in professional architectural software, reimagined for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`group relative bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:border-white/10 hover:bg-slate-900/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:${f.glow}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GALLERY ────────────────────────────────────────────────────────── */}
      <section id="gallery" className="py-28 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-semibold tracking-wide mb-5">
              <Sparkles className="w-3 h-3" />
              AI Generated Renders
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Stunning results, instantly
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every image below was generated by Habita&apos;s AI from simple design parameters — no artistic skills needed.
            </p>
          </div>

          {/* Main gallery display */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Large featured image */}
            <div className="lg:col-span-3 relative rounded-3xl overflow-hidden aspect-[4/3] cursor-pointer group">
              <Image
                src={GALLERY[activeGallery].src}
                alt={GALLERY[activeGallery].label}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white mb-2 inline-block">
                  {GALLERY[activeGallery].tag}
                </span>
                <h3 className="text-white text-2xl font-black">{GALLERY[activeGallery].label}</h3>
                <p className="text-slate-300 text-sm">{GALLERY[activeGallery].style} Style</p>
              </div>
            </div>

            {/* Thumbnail stack */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {GALLERY.map((img, idx) => (
                <button
                  key={img.src}
                  onClick={() => setActiveGallery(idx)}
                  className={`relative rounded-2xl overflow-hidden h-36 group transition-all duration-300 ${activeGallery === idx
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#070b13] scale-[1.02]'
                      : 'opacity-60 hover:opacity-90'
                    }`}
                >
                  <Image src={img.src} alt={img.label} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <p className="text-white font-bold text-sm">{img.label}</p>
                    <p className="text-slate-300 text-xs">{img.style}</p>
                  </div>
                  {activeGallery === idx && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {GALLERY.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveGallery(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${activeGallery === idx ? 'bg-indigo-500 w-6' : 'bg-slate-600 hover:bg-slate-400'
                  }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK CONFIGURATOR ─────────────────────────────────────────────── */}
      <section id="configurator" className="py-28 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold tracking-wide mb-6">
              <Cpu className="w-3 h-3" />
              Quick Start
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
              Configure your dream home in seconds
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Pick your architectural style, set your parameters, and launch the full designer pre-loaded with your preferences — ready to customise every detail.
            </p>
            <ul className="space-y-3">
              {['AI-generated floor plan on launch', 'Fully editable 2D & 3D layouts', 'Real-time cost breakdowns', 'Save & share your designs'].map(item => (
                <li key={item} className="flex items-center gap-3 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: configurator card */}
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl" />

            <div className="relative bg-slate-900/60 border border-white/8 rounded-3xl p-8 backdrop-blur-sm">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-400" />
                House Configuration
              </h3>

              {/* Style picker */}
              <div className="mb-6">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 block">Architectural Style</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setConfig(p => ({ ...p, style: s.id }))}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${config.style === s.id
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-200'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bedrooms & Bathrooms */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 block flex items-center gap-1">
                    <Bed className="w-3 h-3" /> Bedrooms
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setConfig(p => ({ ...p, bedrooms: n }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${config.bedrooms === n
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 block flex items-center gap-1">
                    <Bath className="w-3 h-3" /> Bathrooms
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setConfig(p => ({ ...p, bathrooms: n }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${config.bathrooms === n
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plot Size */}
              <div className="mb-6">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 block flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" /> Plot Size (ft)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min={15} max={120}
                      value={config.plotWidth}
                      onChange={e => setConfig(p => ({ ...p, plotWidth: Number(e.target.value) }))}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">W</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={20} max={200}
                      value={config.plotLength}
                      onChange={e => setConfig(p => ({ ...p, plotLength: Number(e.target.value) }))}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">L</span>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="mb-6">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 block">
                  Budget: <span className="text-indigo-300">₹{config.budget.toLocaleString('en-IN')}</span>
                </label>
                <input
                  type="range"
                  min={500000}
                  max={10000000}
                  step={100000}
                  value={config.budget}
                  onChange={e => setConfig(p => ({ ...p, budget: Number(e.target.value) }))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>₹5L</span><span>₹1Cr</span>
                </div>
              </div>

              {/* Requirements */}
              <div className="mb-8">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 block">Add-ons</label>
                <div className="grid grid-cols-2 gap-2">
                  {REQUIREMENTS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => toggleRequirement(r.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${config.requirements.includes(r.id)
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-600'
                        }`}
                    >
                      <r.icon className="w-3.5 h-3.5" />
                      {r.label}
                      {config.requirements.includes(r.id) && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Launch CTA */}
              <Link
                href="/designer"
                onClick={launchDesigner}
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition-all duration-200 shadow-xl shadow-indigo-600/25 active:scale-95 group"
              >
                <Sparkles className="w-5 h-5" />
                Launch Designer
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-pink-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.15)_0%,_transparent_70%)]" />

        <div className="relative max-w-3xl mx-auto text-center px-6">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
            Ready to build your dream home?
          </h2>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed">
            Join thousands of homeowners and architects who plan better, faster, and smarter with Habita.
          </p>
          <Link
            href="/designer"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg transition-all duration-200 shadow-2xl shadow-indigo-600/30 active:scale-95 group"
          >
            <Sparkles className="w-6 h-6" />
            Start Designing — It&apos;s Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-slate-400 text-sm font-semibold">
              Habita — <span className="text-slate-500">design the way u live</span>
            </span>
          </div>
          <p className="text-slate-600 text-xs">
            Built with AI · Floor Plans · 3D Walkthroughs · Vastu Analysis · Cost Estimates
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link href="/designer" className="hover:text-slate-300 transition">Designer</Link>
            <a href="#features" className="hover:text-slate-300 transition">Features</a>
            <a href="#gallery" className="hover:text-slate-300 transition">Gallery</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
