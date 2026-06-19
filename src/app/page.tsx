"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { 
  Terminal, 
  Cpu, 
  Brain, 
  Activity, 
  CheckCircle, 
  ArrowRight,
  Layers,
  Code
} from "lucide-react";

// Dynamically import the WebGL canvas with ssr disabled to prevent hydration errors
const WebGLBackground = dynamic(() => import("@/components/WebGLBackground"), {
  ssr: false,
});

// Custom GitHub Icon since brand icons were removed in Lucide v1+
function Github({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const PORTFOLIO_CONFIG = {
  name: "Sampanna Shibabhakti",
  githubUrl: "https://github.com/sampshib-art", 
  email: "sampanna@example.com", 
};

// Interface for layout styling configurations
interface ThemeStyle {
  text: string;
  textMuted: string;
  border: string;
  borderMuted: string;
  bgMuted: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  hoverBorder: string;
  hoverBg: string;
  badge: string;
  webgl: string;
  glow: string;
}

// Dragonfly-style Keyplate theme setups for the scrollable dark segments
const THEME_STYLES: Record<string, ThemeStyle> = {
  white: {
    text: "text-white",
    textMuted: "text-zinc-500",
    border: "border-zinc-800",
    borderMuted: "border-zinc-900",
    bgMuted: "bg-zinc-950",
    accent: "text-white",
    accentBg: "bg-white text-black",
    accentBorder: "border-zinc-800",
    hoverBorder: "hover:border-white",
    hoverBg: "hover:bg-zinc-900",
    badge: "border-zinc-800 text-zinc-300 bg-zinc-950",
    webgl: "#ffffff",
    glow: "shadow-zinc-800/10",
  },
  emerald: {
    text: "text-emerald-400",
    textMuted: "text-emerald-600/70",
    border: "border-emerald-500/20",
    borderMuted: "border-emerald-500/10",
    bgMuted: "bg-emerald-950/20",
    accent: "text-emerald-300",
    accentBg: "bg-emerald-400 text-black",
    accentBorder: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-400",
    hoverBg: "hover:bg-emerald-950/40",
    badge: "border-emerald-500/20 text-emerald-400 bg-emerald-950/20",
    webgl: "#34d399",
    glow: "shadow-emerald-500/5",
  },
  amber: {
    text: "text-amber-400",
    textMuted: "text-amber-600/70",
    border: "border-amber-500/20",
    borderMuted: "border-amber-500/10",
    bgMuted: "bg-amber-950/20",
    accent: "text-amber-300",
    accentBg: "bg-amber-400 text-black",
    accentBorder: "border-amber-500/20",
    hoverBorder: "hover:border-amber-400",
    hoverBg: "hover:bg-amber-950/40",
    badge: "border-amber-500/20 text-amber-400 bg-amber-950/20",
    webgl: "#fbbf24",
    glow: "shadow-amber-500/5",
  },
  cyan: {
    text: "text-cyan-400",
    textMuted: "text-cyan-600/70",
    border: "border-cyan-500/20",
    borderMuted: "border-cyan-500/10",
    bgMuted: "bg-cyan-950/20",
    accent: "text-cyan-300",
    accentBg: "bg-cyan-400 text-black",
    accentBorder: "border-cyan-500/20",
    hoverBorder: "hover:border-cyan-400",
    hoverBg: "hover:bg-cyan-950/40",
    badge: "border-cyan-500/20 text-cyan-400 bg-cyan-950/20",
    webgl: "#22d3ee",
    glow: "shadow-cyan-500/5",
  }
};

// Custom characters/glyphs used in text scrambling effects
const GLYPHS = "XX-++//\\{}[]~_#@!$%^&*()=";

// React text scramble component utilizing high-performance interval ticking
function ScrambleText({ text, active = false }: { text: string; active?: boolean }) {
  const [displayText, setDisplayText] = useState(text);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    
    frameRef.current = 0;
    const interval = setInterval(() => {
      setDisplayText(() => {
        return text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            // Gradually settle letters starting from the left
            if (index < frameRef.current / 3) {
              return text[index];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("");
      });

      frameRef.current += 1;
      if (frameRef.current >= text.length * 3) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [active, text]);

  return <span>{active ? displayText : text}</span>;
}

// Scramble Menu Link wrapper that keeps structural brackets static
function ScrambleLink({ href, label, t }: { href: string; label: string; t: ThemeStyle }) {
  const [hovered, setHovered] = useState(false);
  const cleanText = label.replace(/[\[\]]/g, "");

  return (
    <a 
      href={href} 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`px-2 py-1 border border-transparent ${t.hoverBorder} ${t.text} transition-all font-mono`}
    >
      <span>[</span>
      <ScrambleText text={cleanText} active={hovered} />
      <span>]</span>
    </a>
  );
}

// Scramble Text Label wrapper
function ScrambleLabel({ text, className }: { text: string; className?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
    >
      <ScrambleText text={text} active={hovered} />
    </span>
  );
}

// Interactive Project index list element for Bachelor's Level Projects
function ProjectIndexItem({ 
  num, 
  title, 
  tech, 
  desc, 
  focus, 
  t 
}: { 
  num: string; 
  title: string; 
  tech: string; 
  desc: string; 
  focus: string; 
  t: ThemeStyle 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div className={`border-b ${t.border} transition-colors duration-300`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full text-left py-4 flex items-center justify-between font-mono text-xs cursor-pointer select-none"
      >
        <div className="flex items-center gap-4">
          <span className={t.textMuted}>[{num}]</span>
          <span className={`${t.text} font-bold tracking-tight`}>
            <ScrambleText text={title} active={hovered} />
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`hidden md:inline ${t.textMuted}`}>{tech}</span>
          <span className={t.text}>{isOpen ? "[-]" : "[+]"}</span>
        </div>
      </button>
      
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-6 pt-1 font-mono text-xs space-y-3"
        >
          <p className={`${t.textMuted} leading-relaxed max-w-3xl`}>
            {desc}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${t.text} bg-zinc-900 border ${t.border} px-2 py-0.5 text-[10px]`}>
              SYSTEM_FOCUS: {focus}
            </span>
            <span className={`text-[10px] ${t.textMuted}`}>
              {"// COMPILER: CLANG_OPTIMIZED | NODE_VERIFIED"}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Section Header component with Dragonfly aesthetic - Declared statically outside render to satisfy eslint
function SectionHeader({ num, title, t }: { num: string; title: string; t: ThemeStyle }) {
  return (
    <div className={`relative w-full border-t border-b ${t.border} ${t.bgMuted} px-4 py-3 flex items-center justify-between font-mono text-xs mb-8 transition-colors duration-300`}>
      <div className="flex items-center gap-2">
        <span className={t.textMuted}>[{num}]</span>
        <span className={`${t.text} font-bold`}>{title}</span>
      </div>
      <div className={t.textMuted}>{"// MODULE_STATUS: ONLINE"}</div>
    </div>
  );
}

export default function Home() {
  const [activeTheme, setActiveTheme] = useState<'white' | 'emerald' | 'amber' | 'cyan'>('white');
  const t = THEME_STYLES[activeTheme];

  // 1. Refs for scroll target elements
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);

  // Hover states for hero buttons to run scramble animations
  const [gitHovered, setGitHovered] = useState(false);
  const [caseHovered, setCaseHovered] = useState(false);

  // 2. Hero Scroll Physics (Sticky Parallax Scale/Fade)
  const { scrollYProgress: heroScrollY } = useScroll({
    target: heroContainerRef,
    offset: ["start start", "end start"],
  });
  
  const heroScale = useTransform(heroScrollY, [0, 1], [1, 0.95]);
  const heroOpacity = useTransform(heroScrollY, [0, 0.8], [1, 0]);
  const heroY = useTransform(heroScrollY, [0, 1], [0, 20]); // Tightened range to reduce translation paint costs

  // 3. Experience / Dashboard Scroll Physics (Flat Scale and Subtle Parallax - 3D rotate removed for 60FPS lock)
  const { scrollYProgress: experienceScrollY } = useScroll({
    target: experienceRef,
    offset: ["start end", "center center"],
  });

  const dashScale = useTransform(experienceScrollY, [0, 1], [0.97, 1]);
  const dashParallaxY = useTransform(experienceScrollY, [0, 1], [15, -15]); // Tightened to prevent layout/blend thrashing
  const dashOpacity = useTransform(experienceScrollY, [0, 0.8], [0.7, 1]);



  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-hidden flex flex-col">
      {/* 3D WebGL Background Rendered behind all content with active color palette */}
      <WebGLBackground color={t.webgl} />

      {/* Header Navigation */}
      <header className={`relative w-full border-b ${t.border} z-20 font-mono text-xs text-white transition-colors duration-300`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${t.border} ${t.bgMuted} ${t.text} transition-colors duration-300`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activeTheme === 'white' ? 'bg-white' : activeTheme === 'emerald' ? 'bg-emerald-400 animate-pulse' : activeTheme === 'amber' ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'}`}></span>
              <span>SYS_ACTIVE</span>
            </span>
            <span className={`${t.textMuted} transition-colors duration-300`}>{"// DEV_PORTFOLIO_V4.0"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex items-center gap-2 text-zinc-400">
              <ScrambleLink href="#about" label="[01_HERO]" t={t} />
              <ScrambleLink href="#experience" label="[02_CASE]" t={t} />
              <ScrambleLink href="#projects" label="[03_REPOS]" t={t} />
              <ScrambleLink href="#skills" label="[04_STACK]" t={t} />
            </nav>

            {/* Dynamic keyplate color toggle */}
            <div className={`flex items-center gap-1.5 px-3 py-1 border ${t.border} ${t.bgMuted} transition-colors duration-300`}>
              <ScrambleLabel text="KEYPLATE:" className={`${t.textMuted} mr-1 cursor-default`} />
              <motion.button 
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTheme('white')} 
                className={`w-3.5 h-3.5 border ${activeTheme === 'white' ? 'bg-white border-white' : 'border-zinc-700 bg-transparent'} transition-all cursor-pointer`} 
                title="White"
              />
              <motion.button 
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTheme('emerald')} 
                className={`w-3.5 h-3.5 border ${activeTheme === 'emerald' ? 'bg-emerald-400 border-emerald-400' : 'border-emerald-950 bg-transparent'} transition-all cursor-pointer`} 
                title="Emerald"
              />
              <motion.button 
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTheme('amber')} 
                className={`w-3.5 h-3.5 border ${activeTheme === 'amber' ? 'bg-amber-400 border-amber-400' : 'border-amber-950 bg-transparent'} transition-all cursor-pointer`} 
                title="Amber"
              />
              <motion.button 
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTheme('cyan')} 
                className={`w-3.5 h-3.5 border ${activeTheme === 'cyan' ? 'bg-cyan-400 border-cyan-400' : 'border-cyan-950 bg-transparent'} transition-all cursor-pointer`} 
                title="Cyan"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative flex-1 w-full max-w-5xl mx-auto px-6 z-10">
        
        {/* 1. Hero Section (Sticky Parallax wrapper - bg-transparent to let WebGL show through) */}
        <div ref={heroContainerRef} className="relative h-[85vh] md:h-screen w-full z-0 bg-transparent transform-gpu will-change-transform">
          <motion.section 
            style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
            id="about" 
            className="sticky top-0 h-full flex flex-col justify-center space-y-8 pt-4 bg-transparent transform-gpu will-change-transform"
          >
            <div className="overflow-hidden">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className={`inline-flex items-center gap-2 px-2.5 py-1 border ${t.badge} font-mono text-[11px] self-start transition-colors duration-300`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeTheme === 'white' ? 'bg-white' : activeTheme === 'emerald' ? 'bg-emerald-400' : activeTheme === 'amber' ? 'bg-amber-400' : 'bg-cyan-400'} animate-pulse`}></span>
                <span>SYSTEMS HACKER & INFRASTRUCTURE ORCHESTRATOR</span>
              </motion.div>
            </div>
            
            <div className="space-y-4 font-mono select-none text-white">
              <pre className={`text-[1.8vw] sm:text-[1.3vw] md:text-[0.75vw] leading-[1.2] ${t.text} opacity-90 overflow-x-auto transition-colors duration-300`}>
{` ___   _   _   ___   ___  ___   _   _   ___   ___   _   _   ___ 
| _ \\ | |_| | / _ \\ / __|| _ \\ | |_| | / _ \\ | _ \\ | | | | / __|
|  _/ |  _  || (_) |\\__ \\|  _/ |  _  || (_) ||   / | |_| | \\__ \\
|_|   |_| |_| \\___/ |___/|_|   |_| |_| \\___/ |_|_\\  \\___/  |___/`}
              </pre>
              <h1 className={`text-4xl md:text-6xl font-bold tracking-tighter uppercase ${t.text} transition-colors duration-300`}>
                {PORTFOLIO_CONFIG.name.toUpperCase()}
              </h1>
              <p className={`${t.textMuted} text-xs transition-colors duration-300`}>{"// LOW_LEVEL_AUTOMATION_AND_AI_INFRASTRUCTURE"}</p>
            </div>
            
            <p className={`text-sm md:text-base ${t.textMuted} leading-relaxed font-light max-w-xl font-mono transition-colors duration-300`}>
              Operating close to the hardware. Specializing in low-latency execution loops, physical HID hardware scripting, and custom AI pipeline orchestration. Relocating to New Zealand to study AI & Computer Science.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <motion.a 
                onMouseEnter={() => setGitHovered(true)}
                onMouseLeave={() => setGitHovered(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                href={PORTFOLIO_CONFIG.githubUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`flex h-12 items-center justify-center gap-2 border ${t.accentBorder} ${t.accentBg} font-mono text-xs px-6 transition-all duration-300 group ${t.hoverBorder} transform-gpu will-change-transform`}
              >
                <Github size={15} />
                <ScrambleText text="EXPLORE_GITHUB_REPOS" active={gitHovered} />
                <ArrowRight size={13} className="ml-1 text-zinc-650 group-hover:translate-x-0.5 transition-transform" />
              </motion.a>
              
              <motion.a 
                onMouseEnter={() => setCaseHovered(true)}
                onMouseLeave={() => setCaseHovered(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                href="#experience" 
                className={`flex h-12 items-center justify-center gap-2 border ${t.border} ${t.bgMuted} ${t.text} font-mono text-xs px-6 transition-all duration-300 ${t.hoverBorder} transform-gpu will-change-transform`}
              >
                <ScrambleText text="VIEW_CASE_STUDIES" active={caseHovered} />
              </motion.a>
            </div>
          </motion.section>
        </div>

        {/* Scrollable content wrapper that overlaps the Hero. Set to semi-transparent to display the floating WebGL structure */}
        <div className="relative z-10 bg-black/40 backdrop-blur-[1px] space-y-24 md:space-y-36 pt-12 md:pt-24 pb-12 shadow-[0_-30px_50px_rgba(0,0,0,0.8)] transform-gpu will-change-transform">

          {/* 2. Experience / Core Project Section */}
          <section ref={experienceRef} id="experience" className="space-y-8 scroll-mt-24">
            <SectionHeader num="02" title="CASE STUDY: HIGH-VELOCITY DIGITAL COMMERCE OPERATIONS" t={t} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Project Details */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h3 className={`text-xl font-bold ${t.text} tracking-tight transition-colors duration-300`}>Eldorado Digital Storefront</h3>
                  <p className={`text-xs font-mono ${t.textMuted} mt-1 transition-colors duration-300`}>{"// Low-Overhead Fulfillment & Trading Bot Orchestrator"}</p>
                </div>
                
                <p className={`leading-relaxed text-sm ${t.textMuted} font-light font-mono transition-colors duration-300`}>
                  Co-founded a high-velocity digital storefront. Engineered Python transaction bots to handle low-overhead asset fulfillment pipelines, parsing real-time market data to execute automated transfers with under 3-second SLAs.
                </p>
                
                <div className="space-y-4">
                  <h4 className={`text-xs font-mono ${t.text} uppercase tracking-wider transition-colors duration-300`}>Key Implementations</h4>
                  <ul className={`space-y-3 font-mono text-xs ${t.textMuted} transition-colors duration-300`}>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={14} className={`${t.text} shrink-0 mt-0.5 transition-colors duration-300`} />
                      <span>Python-based automated ledger hooks parsing market endpoints</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={14} className={`${t.text} shrink-0 mt-0.5 transition-colors duration-300`} />
                      <span>Instant asset routing (&lt; 3s transaction execution SLA)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={14} className={`${t.text} shrink-0 mt-0.5 transition-colors duration-300`} />
                      <span>Database cache mechanisms correcting inventory race conditions</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Simulated Live Dashboard Visual */}
              <div className="lg:col-span-7 w-full [perspective:1000px] transform-gpu will-change-transform">
                <motion.div 
                  style={{ 
                    scale: dashScale, 
                    y: dashParallaxY, 
                    opacity: dashOpacity,
                    transformOrigin: "top center"
                  }}
                  className={`border ${t.border} shadow-2xl p-0.5 overflow-hidden transform-gpu will-change-transform ${t.bgMuted} transition-colors duration-300`}
                >
                  <DashboardMock t={t} activeTheme={activeTheme} />
                </motion.div>
                <p className={`text-[10px] font-mono ${t.textMuted} text-center mt-3 transition-colors duration-300`}>
                  Figure 1.0: Real-time visual metrics dashboard representation. Fully automated digital asset logistics nodes.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Technical Projects Grid */}
          <section ref={projectsRef} id="projects" className="space-y-8 scroll-mt-24 font-mono">
            <SectionHeader num="03" title="REPOS: BACHELOR'S LEVEL STATE-OF-PURPOSE DEVELOPMENT CORE" t={t} />

            <div className={`border-t ${t.border} flex flex-col w-full`}>
              {[
                { 
                  num: "01", 
                  title: "AGRITECH_IOT_NODE", 
                  tech: "MicroPython / Python FastAPI / Local Llama",
                  desc: "Asynchronous edge-to-cloud reactive pipeline processing real-time telemetry from RP2040 microcontrollers and local LLM diagnostics.",
                  focus: "Unidirectional event loops, hardware ADC scaling, offline AI inference"
                },
                { 
                  num: "02", 
                  title: "SENTINEL_THREAT_INTEL", 
                  tech: "Python / Local Llama / System Sockets",
                  desc: "Autonomous background security daemon scanning network socket states and local authentication logs to trigger offline LLM threat analysis and Discord webhook alerts.",
                  focus: "System socket monitoring, threat classification, offline AI agent loops"
                },
                { 
                  num: "03", 
                  title: "LUA_STATE_HOOKING_ENGINE", 
                  tech: "Lua / C / Memory Assembly",
                  desc: "Memory scanning and application hooking tool that reads local application address buffers to intercept execution loops and inject performance macros.",
                  focus: "Pointer offsets, memory layout analysis, binary hooking"
                },
                { 
                  num: "04", 
                  title: "OLLAMA_AGENT_INFRASTRUCTURE", 
                  tech: "Python / Llama 3 / Ollama",
                  desc: "Offline multi-agent workflow engine utilizing local Ollama pipelines to process system metrics diagnostics and execute autonomous tasks.",
                  focus: "Local model orchestrations, JSON schema calling, AI pipelines"
                },
                { 
                  num: "05", 
                  title: "WIN32_RAW_INPUT_FILTER", 
                  tech: "C++ / Windows API",
                  desc: "Raw input device driver query engine using Win32 API to filter mouse report packages directly, bypassing standard window manager delays to optimize pointer latency.",
                  focus: "Raw input APIs, low-overhead event processing, latency tuning"
                },
                { 
                  num: "06", 
                  title: "DISTRIBUTED_SYNC_DAEMON", 
                  tech: "Go / FS-Notify / Cryptography",
                  desc: "Lightweight file synchronization service checking OS directory watchpoints and deploying atomic delta syncing utilizing blake3 verification hashes.",
                  focus: "Golang channels, watchpoint registers, conflict resolution logic"
                },
                { 
                  num: "07", 
                  title: "NET_PACKET_SNIFFER_CLI", 
                  tech: "Rust / Raw Sockets / Multi-threading",
                  desc: "Raw socket listener capturing layer-3 packages to log latency spikes and network anomalies inside circular multi-threaded memory buffers.",
                  focus: "Raw socket binding, TCP headers decoding, concurrency buffers"
                },
                { 
                  num: "08", 
                  title: "8BIT_CPU_EMULATOR", 
                  tech: "C / Virtual Machine Core",
                  desc: "Low-level software emulator that decodes custom register structures, stack layouts, and memory maps, executing a custom assembly instruction set.",
                  focus: "VM registers, instruction decoding, custom stack emulators"
                },
                { 
                  num: "09", 
                  title: "INVENTORY_RACE_CACHE", 
                  tech: "Go / Redis / Atomic Lock",
                  desc: "High-concurrency data cacher incorporating distributed lock leases to prevent storefront race conditions under concurrent client requests.",
                  focus: "Atomic leases, Go pipelines, transactional Redis queries"
                },
                { 
                  num: "10", 
                  title: "SYSTEM_AUTO_DAEMON", 
                  tech: "Bash / Unix Shell / Process control",
                  desc: "Unix daemon script monitoring process trees, system resource limits, and triggering automated database backups and container deploys.",
                  focus: "Process control registers, shell automation, background daemons"
                }
              ].map((proj, idx) => (
                <ProjectIndexItem 
                  key={idx}
                  num={proj.num}
                  title={proj.title}
                  tech={proj.tech}
                  desc={proj.desc}
                  focus={proj.focus}
                  t={t}
                />
              ))}
            </div>
          </section>

          {/* 4. Skills Stack */}
          <section id="skills" className="space-y-8 scroll-mt-24">
            <SectionHeader num="04" title="STACK: SYSTEMS AUTOMATION & HARDWARE METRICS" t={t} />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { name: "Python", desc: "Automated Ledger Bots", icon: Terminal },
                { name: "Lua", desc: "Game Scripting & Reverse Eng.", icon: Code },
                { name: "Pi Pico", desc: "HID payloader execution", icon: Cpu },
                { name: "Local LLMs", desc: "Ollama task orchestrators", icon: Brain },
                { name: "Next.js Console", desc: "Dashboard interface loops", icon: Layers },
                { name: "Perf Tuning", desc: "Input delays & frame specs", icon: Activity },
              ].map((skill, index) => {
                const IconComponent = skill.icon;
                return (
                  <motion.div 
                    key={index}
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-black border-t ${t.border} pt-4 pb-6 flex flex-col items-start justify-between h-28 ${t.hoverBg} transition-all duration-300 transform-gpu will-change-transform`}
                  >
                    <div className={`p-1.5 ${t.bgMuted} border ${t.border} transition-colors duration-300`}>
                      <IconComponent className={`${t.text} transition-colors duration-300`} size={16} />
                    </div>
                    <div>
                      <h3 className={`text-xs font-mono font-semibold ${t.text} uppercase transition-colors duration-300`}>{skill.name}</h3>
                      <p className={`text-[10px] ${t.textMuted} truncate mt-0.5 max-w-full font-mono transition-colors duration-300`}>{skill.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t ${t.border} bg-black/85 backdrop-blur z-10 transition-colors duration-300`}>
        <div className={`w-full max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] ${t.textMuted} transition-colors duration-300`}>
          <div>
            <span>© {new Date().getFullYear()} {PORTFOLIO_CONFIG.name.toUpperCase()}.</span>
            <span className="hidden sm:inline"> System Hacker & AI Infrastructure Engineer. New Zealand Bound.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={PORTFOLIO_CONFIG.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
            <span>•</span>
            <a href={`mailto:${PORTFOLIO_CONFIG.email}`} className="hover:text-zinc-300 transition-colors">Email</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simulated Sales Dashboard Mock Component for visual impact and context
function DashboardMock({ t, activeTheme }: { t: ThemeStyle; activeTheme: string }) {
  const activeColor = activeTheme === 'white' ? '#ffffff' : activeTheme === 'emerald' ? '#34d399' : activeTheme === 'amber' ? '#fbbf24' : '#22d3ee';
  
  return (
    <div className="w-full bg-black rounded-lg overflow-hidden font-mono text-[10px] md:text-xs select-none">
      {/* Top simulated window bar */}
      <div className={`bg-zinc-950 px-4 py-3 border-b ${t.border} flex items-center justify-between transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
          <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
          <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
          <span className="text-zinc-650 ml-2 text-[9px] hidden sm:inline">phosphorus.io/live-analytics</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[9px] ${t.text} bg-zinc-900 px-2 py-0.5 rounded border ${t.border} transition-colors duration-300`}>
          <span className={`w-1 h-1 rounded-full ${activeTheme === 'white' ? 'bg-white' : activeTheme === 'emerald' ? 'bg-emerald-400 animate-pulse' : activeTheme === 'amber' ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'}`}></span>
          Fulfillment Active
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className={`p-3 grid grid-cols-3 gap-2.5 border-b ${t.border} bg-black transition-colors duration-300`}>
        <div className={`bg-black p-2.5 border ${t.border} transition-colors duration-300`}>
          <div className="text-zinc-600 text-[9px] mb-0.5">REVENUE (24H)</div>
          <div className={`text-xs md:text-sm font-semibold ${t.text} transition-colors duration-300`}>$1,482.50</div>
          <div className={`text-[9px] ${t.text} mt-0.5 flex items-center gap-0.5 transition-colors duration-300`}>
            <span>↑</span> +18.4%
          </div>
        </div>
        <div className={`bg-black p-2.5 border ${t.border} transition-colors duration-300`}>
          <div className="text-zinc-600 text-[9px] mb-0.5">FULFILLMENT SLA</div>
          <div className={`text-xs md:text-sm font-semibold ${t.text} transition-colors duration-300`}>99.98%</div>
          <div className="text-[9px] text-zinc-500 mt-0.5">Avg: 1.8s latency</div>
        </div>
        <div className={`bg-black p-2.5 border ${t.border} transition-colors duration-300`}>
          <div className="text-zinc-600 text-[9px] mb-0.5">AUTO DISPATCHED</div>
          <div className={`text-xs md:text-sm font-semibold ${t.text} transition-colors duration-300`}>12,482</div>
          <div className="text-[9px] text-zinc-400 mt-0.5 flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full ${activeTheme === 'white' ? 'bg-white' : activeTheme === 'emerald' ? 'bg-emerald-400' : activeTheme === 'amber' ? 'bg-amber-400' : 'bg-cyan-400'}`}></span>
            Sync OK
          </div>
        </div>
      </div>

      {/* Analytics Content Block */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-black">
        {/* SVG Chart area */}
        <div className={`bg-black p-2.5 border ${t.border} flex flex-col justify-between h-36 transition-colors duration-300`}>
          <div className="flex items-center justify-between text-zinc-605 text-[9px] mb-1">
            <span>TRANSACTION VELOCITY (30D)</span>
            <span className={`${t.text} transition-colors duration-300`}>12,482 total</span>
          </div>
          <div className={`w-full flex-1 flex items-end pt-2 text-white`}>
            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d="M0,28 L5,25 L10,26 Q15,22 20,24 Q25,20 30,15 T40,18 T50,12 T60,16 T70,8 T80,10 T90,3 L100,1 L100,30 L0,30 Z"
                fill="url(#theme-gradient-mock)"
                opacity="0.08"
              />
              <path
                d="M0,28 L5,25 L10,26 Q15,22 20,24 Q25,20 30,15 T40,18 T50,12 T60,16 T70,8 T80,10 T90,3 L100,1"
                fill="none"
                stroke={activeColor}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="theme-gradient-mock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeColor} />
                  <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className={`flex justify-between text-zinc-700 text-[8px] mt-1 pt-1 border-t ${t.border} transition-colors duration-300`}>
            <span>30d ago</span>
            <span>15d ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Real-time terminal log feedback */}
        <div className={`bg-black p-2.5 border ${t.border} h-36 flex flex-col justify-between transition-colors duration-300`}>
          <div className="text-zinc-600 text-[9px] mb-1 flex items-center justify-between">
            <span>PIPELINE LOGS</span>
            <span className="text-[8px] text-zinc-700">LEVEL: SUCCESS</span>
          </div>
          <div className="flex-1 overflow-hidden space-y-1.5 text-[8px] md:text-[9px] text-zinc-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span className={`${t.text} transition-colors duration-300`}>[OK]</span>
              <span className="text-zinc-700">02:14:15</span>
              <span className="truncate">Auth check: payload signature signature_hash matches.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`${t.text} transition-colors duration-300`}>[OK]</span>
              <span className="text-zinc-700">02:14:16</span>
              <span className="truncate">Synced stock level: Item_4922 (Stock: 148).</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">[TX]</span>
              <span className="text-zinc-700">02:14:22</span>
              <span className="truncate">Dispatched license key node pipeline check ok.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`${t.text} transition-colors duration-300`}>[OK]</span>
              <span className="text-zinc-700">02:14:23</span>
              <span className="truncate">Completed webhooks to backend master database.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`${t.text} transition-colors duration-300`}>[OK]</span>
              <span className="text-zinc-700">02:15:01</span>
              <span className="truncate">Database status OK. Sync completed successfully.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
