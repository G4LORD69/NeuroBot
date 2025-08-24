import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Brain, Grid, Repeat, Palette, Hash, Calculator, Layers, Play, BarChart2, Settings, BookOpen, Home, Library, Flame, Trophy, Sparkles, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./components/ui/dialog";
import { Progress } from "./components/ui/progress";
import { Toaster } from "./components/ui/toaster";
import { toast } from "./hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Calendar } from "./components/ui/calendar";
import { Switch } from "./components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./components/ui/select";

// Env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helpers
const dateISO = (d = new Date()) => d.toISOString().slice(0,10);
const parseISO = (s) => { const [y,m,dd] = s.split("-").map(Number); return new Date(y, m-1, dd); };
const dayName = (d) => ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()];

// i18n
const STR = {
  ru: {
    hero_title: "Твой коуч мозга в Telegram",
    hero_sub: "Ежедневные упражнения: память, внимание, скорость, логика. Адаптивная сложность и прогресс в одном месте.",
    start_daily: "Ежедневная тренировка",
    open_library: "Библиотека игр",
    progress: "Прогресс",
    settings: "Настройки",
    about: "О проекте",
    menu_title: "Календарь тренировок",
    games_title: "Мини‑игры (дизайн)",
    coming_soon: "Скоро будет функционал. Сейчас — дизайн и минимальные клики.",
    next: "Далее",
    finish: "Завершить",
    rules: "Правила",
    home: "Главная",
    daily: "Ежедневка",
    library: "Библиотека",
    streak: "Стрик",
    done_days: "Дней выполнено",
    shader: "Шейдер",
    intensity: "Интенсивность",
    haptics: "Хаптика",
    reduce_motion: "Снижать анимации",
    shader_type: "Тип шейдера",
    all: "Все",
    memory: "Память",
    attention: "Внимание",
    speed: "Скорость",
    logic: "Логика"
  },
  en: {
    hero_title: "Your brain coach in Telegram",
    hero_sub: "Daily drills: memory, attention, speed, logic. Adaptive difficulty and progress in one place.",
    start_daily: "Daily Training",
    open_library: "Games Library",
    progress: "Progress",
    settings: "Settings",
    about: "About",
    menu_title: "Training calendar",
    games_title: "Mini‑games (design)",
    coming_soon: "Functionality coming soon. Design + minimal clicks now.",
    next: "Next",
    finish: "Finish",
    rules: "Rules",
    home: "Home",
    daily: "Daily",
    library: "Library",
    streak: "Streak",
    done_days: "Days completed",
    shader: "Shader",
    intensity: "Intensity",
    haptics: "Haptics",
    reduce_motion: "Reduce motion",
    shader_type: "Shader type",
    all: "All",
    memory: "Memory",
    attention: "Attention",
    speed: "Speed",
    logic: "Logic"
  },
};

function useLang() { const [lang, setLang] = useState(() => "ru"); return { lang, setLang, t: STR[lang] }; }

// Icons mapping
const ICON_MAP = { GridIcon: Grid, RepeatIcon: Repeat, PaletteIcon: Palette, HashIcon: Hash, CalculatorIcon: Calculator, LayersIcon: Layers };

// Telegram haptics helper
const haptic = { impact: (s = "light") => { try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(s); } catch {} }, success: () => { try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {} } };

/******** Shader Canvases ********/
function NeuralFlowCanvas({ intensity = "medium", reduceMotion = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext("2d", { alpha: true });
    let w = canvas.clientWidth, h = canvas.clientHeight; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }; resize();
    const onResize = () => resize(); window.addEventListener("resize", onResize);
    const baseCount = Math.round(Math.min(160, Math.max(60, (w * h) / 22000))); const mult = intensity === "low" ? 0.7 : intensity === "high" ? 1.35 : 1; const count = Math.round(baseCount * mult); const speed = reduceMotion ? 0.2 : 0.45 * mult;
    const nodes = Array.from({ length: count }).map(() => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed }));
    let frame; const maxDist = Math.min(220 * mult, Math.max(90, Math.min(w, h) * 0.28));
    const draw = () => { frame = requestAnimationFrame(draw); ctx.fillStyle = "rgba(7,9,12,0.08)"; ctx.fillRect(0, 0, w, h); for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20; if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20; }
      for (let i = 0; i < nodes.length; i++) { for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j]; const dx = a.x - b.x, dy = a.y - b.y; const dist = Math.hypot(dx, dy); if (dist < maxDist) { const t = 1 - dist / maxDist; const hue = 200 + t * 60; ctx.strokeStyle = `hsla(${hue},92%,60%,${0.28 * t})`; ctx.lineWidth = Math.max(0.35, 1.6 * t); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } }
      for (const n of nodes) { ctx.fillStyle = "rgba(124,92,255,0.35)"; ctx.beginPath(); ctx.arc(n.x, n.y, 1.3, 0, Math.PI * 2); ctx.fill(); }
    }; draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); };
  }, [intensity, reduceMotion]);
  return <canvas className="shader-canvas" ref={ref} />;
}

function SynapseParticlesCanvas({ intensity = "medium", reduceMotion = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext("2d", { alpha: true });
    let w = canvas.clientWidth, h = canvas.clientHeight; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }; resize();
    const onResize = () => resize(); window.addEventListener("resize", onResize);
    const mult = intensity === "low" ? 0.7 : intensity === "high" ? 1.4 : 1; const count = Math.round(Math.min(130, Math.max(40, (w*h)/26000)) * mult);
    const parts = Array.from({ length: count }).map(() => ({ x: Math.random()*w, y: Math.random()*h, a: Math.random()*Math.PI*2, r: 12 + Math.random()*48, s: (reduceMotion?0.2:0.5)*(0.6+Math.random()*0.6) }));
    let t = 0, frame;
    const draw = () => { frame = requestAnimationFrame(draw); t += 0.008*mult; ctx.fillStyle = "rgba(7,9,12,0.1)"; ctx.fillRect(0,0,w,h);
      for (const p of parts) { p.a += 0.004*p.s; p.x += Math.cos(p.a)*0.6*p.s; p.y += Math.sin(p.a)*0.6*p.s; if (p.x<0) p.x=w; if (p.x>w) p.x=0; if (p.y<0) p.y=h; if (p.y>h) p.y=0; ctx.beginPath(); ctx.arc(p.x,p.y,1.1,0,Math.PI*2); ctx.fillStyle = "rgba(34,184,255,0.55)"; ctx.fill(); if (Math.random()<0.02) { ctx.beginPath(); ctx.arc(p.x,p.y,6+Math.random()*10,0,Math.PI*2); ctx.strokeStyle="rgba(124,92,255,0.2)"; ctx.lineWidth=0.6; ctx.stroke(); } }
    }; draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); };
  }, [intensity, reduceMotion]);
  return <canvas className="shader-canvas" ref={ref} />;
}

function AuroraCanvas({ intensity = "medium", reduceMotion = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext("2d", { alpha: true }); let w=c.clientWidth,h=c.clientHeight; const dpr=Math.min(window.devicePixelRatio||1,2);
    const resize=()=>{ w=c.clientWidth; h=c.clientHeight; c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }; resize(); const onResize=()=>resize(); window.addEventListener("resize",onResize);
    let t=0, frame; const speed = reduceMotion?0.2:0.5; const amp = intensity==="high"? 0.8: intensity==="low"?0.35:0.6;
    const draw=()=>{ frame=requestAnimationFrame(draw); t+=0.005*speed; ctx.clearRect(0,0,w,h); const g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0, `rgba(34,184,255,${0.20+0.1*Math.sin(t)})`); g.addColorStop(1, `rgba(124,92,255,${0.18+0.1*Math.cos(t*1.3)})`); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); ctx.globalCompositeOperation='overlay'; ctx.fillStyle=`rgba(255,255,255,${0.08*amp})`; for(let i=0;i<6;i++){ ctx.beginPath(); const y=h*(i/6)+Math.sin(t*2+i)*30*amp; ctx.ellipse(w*0.6, y, w*0.9, 60*amp, Math.sin(t+i)*0.6,0,Math.PI*2); ctx.fill(); } ctx.globalCompositeOperation='source-over'; };
    draw(); return ()=>{ cancelAnimationFrame(frame); window.removeEventListener("resize",onResize); };
  }, [intensity, reduceMotion]);
  return <canvas className="shader-canvas" ref={ref} />;
}

/******** Header ********/
function Header({ lang, setLang }) {
  return (
    <div className="header">
      <div className="brand">
        <Brain size={22} color="#22b8ff" />
        <strong>NeuroTrain</strong>
        <div style={{ flex: 1 }} />
        <div className="lang-switch" role="tablist" aria-label="Language switcher">
          <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")} aria-selected={lang === "ru"}>RU</button>
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")} aria-selected={lang === "en"}>EN</button>
      </div>
      </div>
    </div>
  );
}

/******** Completion (local) ********/
function useCompletion() {
  const [days, setDays] = useState(() => { try { return JSON.parse(localStorage.getItem("nt_completed") || "[]"); } catch { return []; } });
  const addToday = () => { const today = dateISO(); setDays((prev) => { if (prev.includes(today)) return prev; const next = [...prev, today]; localStorage.setItem("nt_completed", JSON.stringify(next)); return next; }); };
  const isDone = (iso) => days.includes(iso);
  const streak = useMemo(() => { let s = 0; let d = new Date(); while (isDone(dateISO(d))) { s++; d.setDate(d.getDate()-1); } return s; }, [days]);
  return { days, addToday, isDone, streak };
}

/******** Hero + Calendar (month) ********/
function Hero({ t, onStart, completion, shaderCfg }) {
  const ShaderNode = shaderCfg.type === 'synapses' ? SynapseParticlesCanvas : shaderCfg.type === 'aurora' ? AuroraCanvas : NeuralFlowCanvas;
  const base = new Date(); const monthStart = new Date(base.getFullYear(), base.getMonth(), 1); const monthEnd = new Date(base.getFullYear(), base.getMonth()+1, 0);
  const doneDates = completion.days.map(parseISO).filter(d => d.getMonth() === base.getMonth());
  const modifiers = { done: doneDates, today: [new Date()] };
  const modifiersStyles = { done: { backgroundColor: "rgba(34,184,255,0.28)", color: "#eaf6ff", borderRadius: 8 }, today: { border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8 } };

  return (
    <section className="hero">
      <ShaderNode intensity={shaderCfg.intensity} reduceMotion={shaderCfg.reduceMotion} />
      <div className="container hero-grid">
        <div className="glass hero-card">
          <h1 className="hero-title">{t.hero_title}</h1>
          <p className="hero-sub">{t.hero_sub}</p>
          <div className="cta-row">
            <button className="btn" onClick={() => { haptic.impact("medium"); onStart(); }}><Play size={18} style={{marginRight:8}} /> {t.start_daily}</button>
            <button className="btn secondary" onClick={() => { haptic.impact("light"); toast({ title: "Совет", description: "Лучше тренироваться ежедневно!" }); }}><BookOpen size={18} style={{marginRight:8}} /> {t.open_library}</button>
          </div>
        </div>
        <div className="glass hero-card">
          <div className="section-title">{t.menu_title}</div>
          <Calendar mode="single" selected={new Date()} fromMonth={monthStart} toMonth={monthEnd} modifiers={modifiers} modifiersStyles={modifiersStyles} />
          <div className="legend" style={{marginTop:8}}>
            <span><span className="dot today"></span> Сегодня</span>
            <span><span className="dot done"></span> Выполнено</span>
            <span style={{marginLeft:"auto"}}>{t.streak}: <strong>{completion.streak}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
}

/******** Daily (with week strip) ********/
function WeekStrip({ completion }) {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate()-i); days.push(d); }
  return (
    <div className="week-strip">
      {days.map((d) => { const iso = dateISO(d); const done = completion.isDone(iso); const today = dateISO() === iso; return (
        <div key={iso} className={`day-pill ${done ? 'done' : ''} ${today ? 'today' : ''}`}>
          <div className="circle" />
          <div className="w">{dayName(d)}</div>
        </div>
      ); })}
    </div>
  );
}

function DailyFlow({ t, games, onExit, onFinished, completion }) {
  const [step, setStep] = useState(0); const total = 3; const shown = games.slice(0, total); const current = shown[step] || null;
  const finish = () => { haptic.success(); toast({ title: "Готово!", description: "+150 очков • Стрик +1" }); onFinished?.(); onExit(); };
  return (
    <section className="container">
      <div className="glass hero-card">
        <WeekStrip completion={completion} />
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <Flame size={18} color="#ff9f1a" /> <strong>{t.start_daily}</strong>
          <div style={{flex:1}} />
          <span style={{color:"var(--muted)"}}>{Math.min(step+1,total)}/{total}</span>
        </div>
        <div className="game-canvas" style={{marginTop:12}}>{current ? (current.domain.toUpperCase()) : "DONE"}</div>
        <div style={{display:"flex", gap:8, marginTop:12}}>
          {step < total-1 ? (
            <button className="btn" onClick={() => { haptic.impact("light"); setStep(s => s + 1); }}>{t.next}</button>
          ) : (
            <button className="btn" onClick={finish}>{t.finish}</button>
          )}
          <button className="btn secondary" onClick={onExit}>Exit</button>
        </div>
      </div>
      {step >= total-1 && (
        <div className="glass hero-card" style={{marginTop:12}}>
          <div className="final-score">+150 <small style={{color:"var(--muted)"}}>очков</small></div>
          <div className="summary" style={{marginTop:6}}>
            <div className="kpis">
              <div className="kpi">Accuracy: 88%</div>
              <div className="kpi">Time: 05:10</div>
              <div className="kpi">{t.streak}: {completion.streak + 1}</div>
            </div>
            <div className="badges">
              <span className="badge"><Sparkles size={12} style={{marginRight:6}}/> +1 Streak</span>
              <span className="badge"><Trophy size={12} style={{marginRight:6}}/> New best today</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/******** Library (tabs + beautified cards) ********/
function GamesShelf({ t, games, onOpenGame }) {
  const [tab, setTab] = useState('all');
  const items = games.filter(g => tab==='all' ? true : g.domain === tab);
  const domLabels = { memory: t.memory, attention: t.attention, speed: t.speed, logic: t.logic };
  return (
    <section className="container">
      <Tabs defaultValue="all" onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">{t.all}</TabsTrigger>
          <TabsTrigger value="memory">{t.memory}</TabsTrigger>
          <TabsTrigger value="attention">{t.attention}</TabsTrigger>
          <TabsTrigger value="speed">{t.speed}</TabsTrigger>
          <TabsTrigger value="logic">{t.logic}</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <div className="card-grid" style={{marginTop:10}}>
            {items.map((g) => { const Icon = ICON_MAP[g.icon] || Grid; return (
              <button key={g.id} className="gcard" onClick={() => { haptic.impact('light'); onOpenGame(g); }}>
                <span className="gbadge">{domLabels[g.domain] || g.domain}</span>
                <Icon size={18} />
                <div className="gtitle">{g.title_ru} / {g.title_en}</div>
                <div className="gdesc">{g.description_ru}</div>
                <div className="gactions">
                  <span className="badge">Rules</span>
                  <span className="badge">Demo</span>
                  <span className="badge">Start</span>
                </div>
              </button>
            ); })}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function GameDialog({ game, open, onOpenChange, t, onStart }) {
  if (!game) return null; const Icon = ICON_MAP[game.icon] || Grid;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-2">
        <DialogTitle style={{display:"flex", alignItems:"center", gap:8}}>
          <Icon size={18} /> {game.title_ru} / {game.title_en}
        </DialogTitle>
        <DialogDescription>
          <Tabs defaultValue="rules">
            <TabsList>
              <TabsTrigger value="rules">{t.rules}</TabsTrigger>
              <TabsTrigger value="progress">{t.progress}</TabsTrigger>
              <TabsTrigger value="start">Start</TabsTrigger>
            </TabsList>
            <TabsContent value="rules">
              <div className="dialog-grid">
                <div style={{color:"var(--muted)"}}>{game.description_ru}</div>
                <ul style={{marginLeft:16, color:"var(--muted)"}}>
                  <li>— 1–3 минуты, короткие раунды</li>
                  <li>— Адаптивная сложность (в разработке)</li>
                  <li>— Точность и скорость важнее, чем «тыканье»</li>
                </ul>
                <div className="game-canvas">{game.domain.toUpperCase()}</div>
              </div>
            </TabsContent>
            <TabsContent value="progress">
              <div className="dialog-grid">
                <div className="kpis">
                  <div className="kpi"><Trophy size={14} style={{marginRight:6}}/> Best: 1240</div>
                  <div className="kpi">Avg Acc: 87%</div>
                  <div className="kpi">Sessions: 12</div>
                </div>
                <label style={{fontSize:12, color:"var(--muted)"}}>Mastery</label>
                <Progress value={68} />
              </div>
            </TabsContent>
            <TabsContent value="start">
              <div style={{display:"flex", gap:8, marginTop:8}}>
                <button className="btn" onClick={() => { haptic.impact("medium"); onStart(); }}><Play size={16} style={{marginRight:6}} /> Start</button>
                <button className="btn secondary" onClick={() => onOpenChange(false)}>{t.finish}</button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

/******** TabBar & Panes ********/
function TabBar({ active, setActive, t }) {
  const Item = ({ id, icon: Icon, label }) => (<button className={`tab ${active === id ? "active" : ""}`} onClick={() => { haptic.impact('light'); setActive(id); }}><Icon size={16} /> <span style={{fontWeight:700}}>{label}</span></button>);
  return (<div className="tabbar"><Item id="home" icon={Home} label={t.home} /><Item id="library" icon={Library} label={t.library} /><Item id="progress" icon={BarChart2} label={t.progress} /><Item id="settings" icon={Settings} label={t.settings} /></div>);
}

function SettingsPane({ t, shaderCfg, setShaderCfg }) {
  return (
    <section className="container">
      <div className="glass hero-card">
        <div className="section-title">{t.settings}</div>
        <div style={{display:"grid", gap:12}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <span>{t.haptics}</span>
            <Switch checked={shaderCfg.haptics} onCheckedChange={(v) => setShaderCfg(s => ({ ...s, haptics: v }))} />
          </div>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <span>{t.reduce_motion}</span>
            <Switch checked={shaderCfg.reduceMotion} onCheckedChange={(v) => setShaderCfg(s => ({ ...s, reduceMotion: v }))} />
          </div>
          <div>
            <label style={{fontSize:12, color:"var(--muted)"}}>{t.intensity}</label>
            <Select value={shaderCfg.intensity} onValueChange={(v) => setShaderCfg(s => ({ ...s, intensity: v }))}>
              <SelectTrigger className="w-[180px] mt-1"><SelectValue placeholder="Medium" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectLabel>{t.intensity}</SelectLabel><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectGroup></SelectContent>
            </Select>
          </div>
          <div>
            <label style={{fontSize:12, color:"var(--muted)"}}>{t.shader_type}</label>
            <Select value={shaderCfg.type} onValueChange={(v) => setShaderCfg(s => ({ ...s, type: v }))}>
              <SelectTrigger className="w-[220px] mt-1"><SelectValue placeholder="Flow" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectLabel>{t.shader_type}</SelectLabel><SelectItem value="flow">Flow Field</SelectItem><SelectItem value="synapses">Synapses</SelectItem><SelectItem value="aurora">Aurora</SelectItem></SelectGroup></SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressPane({ t, completion }) {
  const doneDates = completion.days.map(parseISO); const modifiers = { done: doneDates, today: [new Date()] }; const modifiersStyles = { done: { backgroundColor: "rgba(34,184,255,0.28)", color: "#eaf6ff", borderRadius: 8 }, today: { border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8 } }; const thisMonthDone = doneDates.filter(d => d.getMonth() === new Date().getMonth()).length;
  return (
    <section className="container">
      <div className="glass hero-card">
        <div className="section-title">{t.progress}</div>
        <Calendar mode="single" selected={new Date()} modifiers={modifiers} modifiersStyles={modifiersStyles} />
        <div className="legend" style={{marginTop:8}}>
          <span><span className="dot today"></span> Сегодня</span>
          <span><span className="dot done"></span> Выполнено</span>
          <span style={{marginLeft:"auto"}}>{t.streak}: <strong>{completion.streak}</strong> • {t.done_days}: <strong>{thisMonthDone}</strong></span>
        </div>
      </div>
    </section>
  );
}

/******** Main ********/
function MainPage() {
  const { lang, setLang, t } = useLang();
  const [games, setGames] = useState([]);
  const [dialogGame, setDialogGame] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const completion = useCompletion();
  const [shaderCfg, setShaderCfg] = useState(() => ({ type: 'flow', intensity: "high", reduceMotion: false, haptics: true }));
  const [dailyOpen, setDailyOpen] = useState(false);

  useEffect(() => { const load = async () => { try { await axios.get(`${API}/`); const res = await axios.get(`${API}/games`); setGames(res.data || []); } catch (e) { console.error("API error", e); } }; load(); }, []);

  useEffect(() => { if (typeof document !== "undefined") { document.documentElement.classList.add("dark"); } const tg = window.Telegram?.WebApp; if (tg) { try { tg.expand(); } catch {} const accent = tg.themeParams?.button_color || tg.themeParams?.accent_text_color; if (accent) { document.documentElement.style.setProperty("--accent", accent); } } }, []);

  const openGame = (g) => { setDialogGame(g); setDialogOpen(true); };
  const startDaily = () => { setDailyOpen(true); };

  return (
    <div className="App-shell">
      <Header lang={lang} setLang={setLang} />

      {activeTab === "home" && (<Hero t={t} onStart={startDaily} completion={completion} shaderCfg={shaderCfg} />)}
      {activeTab === "library" && (<GamesShelf t={t} games={games} onOpenGame={openGame} />)}
      {activeTab === "progress" && (<ProgressPane t={t} completion={completion} />)}
      {activeTab === "settings" && (<SettingsPane t={t} shaderCfg={shaderCfg} setShaderCfg={setShaderCfg} />)}

      <GameDialog game={dialogGame} open={dialogOpen} onOpenChange={setDialogOpen} t={t} onStart={() => { setDialogOpen(false); startDaily(); }} />

      <Dialog open={dailyOpen} onOpenChange={setDailyOpen}>
        <DialogContent className="glass-2">
          <DialogTitle style={{display:"flex", alignItems:"center", gap:8}}><Flame size={18} color="#ff9f1a" /> {t.start_daily}</DialogTitle>
          <DialogDescription>
            <DailyFlow t={t} games={games} onExit={() => setDailyOpen(false)} onFinished={() => { completion.addToday(); setActiveTab("progress"); }} completion={completion} />
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <TabBar active={activeTab} setActive={setActiveTab} t={t} />

      <footer className="footer">© {new Date().getFullYear()} NeuroTrain • Telegram WebApp ready</footer>
      <Toaster />
    </div>
  );
}

function App() { return (<BrowserRouter><Routes><Route path="/" element={<MainPage />} /></Routes></BrowserRouter>); }

export default App;