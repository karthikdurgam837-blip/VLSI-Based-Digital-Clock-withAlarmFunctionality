import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  Clock, 
  Sliders, 
  Link, 
  Plus, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  ArrowRight, 
  Compass, 
  BadgeAlert, 
  Volume1, 
  FileAudio, 
  Bookmark, 
  CheckSquare, 
  ExternalLink,
  BookOpen,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface Article {
  id: string;
  title: string;
  text: string;
  sourceName?: string;
  url?: string;
  selected: boolean;
}

interface Briefing {
  id: string;
  title: string;
  audioScript: string;
  bulletPoints: string[];
  audioUrl?: string;
  createdAt: string;
  commuteLength: string;
  vibe: string;
  voice: string;
}

const DEFAULT_ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "Fusion Energy Milestone: Clean Power Sustained for Five Minutes",
    text: "In a groundbreaking experiment, scientists at the National Ignition Facility have successfully sustained a fusion reaction yielding more net energy than ever before, keeping it stable for just over five minutes. The achievement is hailed as a major leap toward commercializing infinite, clean, zero-carbon fusion energy. Project lead Dr. Aris Vance noted that resolving thermal turbulence was the golden ticket to this breakthrough.",
    sourceName: "TechScience Daily",
    url: "https://techscience.example.com/fusion-milestone-2026",
    selected: true
  },
  {
    id: "art-2",
    title: "The Renaissance of Urban Micro-Farming and Green Rooftops",
    text: "Urban centers worldwide are experiencing a vibrant agricultural boom. Vertical farming startups and neighborhood rooftop collectives are converting abandoned high-rises and old warehouses into dense, automated vegetable farms. Experts say localized agriculture is slashing transport emissions by 85% and improving metropolitan resilience against global supply chain disruptions. Cities like Tokyo and Paris have already subsidized 20% of flat roofs for gardening.",
    sourceName: "Global Ecology",
    url: "https://globaleco.example.com/urban-farms",
    selected: true
  },
  {
    id: "art-3",
    title: "Voyager 1 Sends Historic Deep Space Data Using Legacy Transmitter",
    text: "NASA engineers have successfully commanded the aging Voyager 1 probe to activate a backup multi-decade-old antenna system. Operating over fifteen billion miles from Earth, the probe had experienced telemetry interference from its main transmitter. The successful switch restores high-fidelity diagnostic data, allowing scientists to continue sampling the interstellar medium outside our solar system for at least another four years.",
    sourceName: "AstroSpace Weekly",
    url: "https://astrospace.example.com/voyager-legacy",
    selected: false
  }
];

const LOADING_MESSAGES = [
  "Scouring uploaded articles & linking context...",
  "Running deep summarization with Google Gemini...",
  "Formatting script structure & removing markdown fluff...",
  "Warming up the prebuilt TTS synthesizer elements...",
  "Conducting voice auditions & tuning sample rates...",
  "Structuring digital WAV binary channels...",
  "Stitch-rendering high-fidelity commute briefing...",
  "Briefing is almost ready! Adjust your commute volume..."
];

export default function App() {
  // Persistence
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem("commute_articles");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_ARTICLES;
  });

  const [history, setHistory] = useState<Briefing[]>(() => {
    const saved = localStorage.getItem("commute_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Settings
  const [commuteLength, setCommuteLength] = useState<string>("medium"); // short, medium, long
  const [vibe, setVibe] = useState<string>("podcast"); // radio, podcast, bullet, narrative
  const [voice, setVoice] = useState<string>("Kore"); // Puck, Charon, Kore, Fenrir, Zephyr
  const [focusArea, setFocusArea] = useState<string>("");

  // Temp Inputs
  const [inputTab, setInputTab] = useState<"url" | "text">("url");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [inputTextVal, setInputTextVal] = useState<string>("");
  const [inputTextTitle, setInputTextTitle] = useState<string>("");
  const [fetchingUrl, setFetchingUrl] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>("");

  // Generator & Active Briefings
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);
  const [activeBrief, setActiveBrief] = useState<Briefing | null>(() => {
    const saved = localStorage.getItem("commute_active_brief");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  });

  // Audition Voice Player state
  const [isAuditioning, setIsAuditioning] = useState<boolean>(false);
  const [auditionVoice, setAuditionVoice] = useState<string | null>(null);

  // Hidden Audio Element Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Auto save variables
  useEffect(() => {
    localStorage.setItem("commute_articles", JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem("commute_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (activeBrief) {
      localStorage.setItem("commute_active_brief", JSON.stringify(activeBrief));
    } else {
      localStorage.removeItem("commute_active_brief");
    }
  }, [activeBrief]);

  // Loading indicator narrative cycler
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingMsgIdx(0);
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Sync volume to audio tag
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync playback speed to audio tag
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isPlaying]);

  // Handle URL fetch
  async function handleScrape() {
    if (!inputUrl) return;
    setFetchingUrl(true);
    setFetchError("");
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process the requested URL page");
      }
      const data = await res.json();
      
      const newArticle: Article = {
        id: "art-" + Date.now(),
        title: data.title || "Scraped Article",
        text: data.content || "",
        sourceName: new URL(inputUrl).hostname.replace("www.", ""),
        url: inputUrl,
        selected: true
      };

      setArticles((prev) => [newArticle, ...prev]);
      setInputUrl("");
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || "Network error. Please paste text directly if page is blocked.");
    } finally {
      setFetchingUrl(false);
    }
  }

  // Handle Custom Text append
  function handleAddText() {
    if (!inputTextVal) return;
    const cleanTitle = inputTextTitle.trim() || "Pasted Update (" + new Date().toLocaleDateString() + ")";
    const newArticle: Article = {
      id: "art-" + Date.now(),
      title: cleanTitle,
      text: inputTextVal,
      sourceName: "My Library Context",
      selected: true
    };
    setArticles((prev) => [newArticle, ...prev]);
    setInputTextVal("");
    setInputTextTitle("");
  }

  // Audition speaker voice
  async function testSpeaker(vName: string) {
    if (isAuditioning) return;
    setAuditionVoice(vName);
    setIsAuditioning(true);
    try {
      const msg = `This is the ${vName} voice host custom tailored for your Daily Commute News briefing. Enjoy the ride!`;
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg, voice: vName })
      });
      if (!res.ok) throw new Error("TTS preview error");
      const data = await res.json();
      
      const auditionAudio = new Audio(data.audioUrl);
      auditionAudio.onended = () => {
        setIsAuditioning(false);
        setAuditionVoice(null);
      };
      await auditionAudio.play();
    } catch (e) {
      console.error("Audition playback failed", e);
      setIsAuditioning(false);
      setAuditionVoice(null);
    }
  }

  // Summarize Articles & TTS Audio Generative flow
  async function generateCommuteDigest() {
    const selectedArticles = articles.filter((a) => a.selected);
    if (selectedArticles.length === 0) {
      alert("Please select at least one article or add your own to summarize!");
      return;
    }

    setIsLoading(true);
    setIsPlaying(false);
    try {
      // Step 1: Request script & bullets summary
      const sumRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: selectedArticles,
          commuteLength,
          vibe,
          focusArea
        })
      });

      if (!sumRes.ok) {
        throw new Error("Unable to synthesize script briefing summary. Try fewer articles.");
      }
      const sumData = await sumRes.json();

      // Step 2: Request High-Quality Audio TTS
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sumData.audioScript,
          voice
        })
      });

      if (!ttsRes.ok) {
        throw new Error("WAV vocal synthesis failed. Check text content length limits.");
      }
      const ttsData = await ttsRes.json();

      const newBrief: Briefing = {
        id: "brief-" + Date.now(),
        title: sumData.title,
        audioScript: sumData.audioScript,
        bulletPoints: sumData.bulletPoints,
        audioUrl: ttsData.audioUrl,
        createdAt: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        commuteLength,
        vibe,
        voice
      };

      setActiveBrief(newBrief);
      setHistory((prev) => [newBrief, ...prev]);

      // Highlight new track immediately in audio element
      if (audioRef.current) {
        audioRef.current.src = ttsData.audioUrl;
        audioRef.current.load();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Synthesis pipeline failed. Please try again with simple news articles.");
    } finally {
      setIsLoading(false);
    }
  }

  // Player controls
  const togglePlay = () => {
    if (!audioRef.current || !activeBrief?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Audio playback error", e));
    }
  };

  const handleSeekChange = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  // Skip back 10s / forward 10s
  const skipTime = (offset: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(duration, currentTime + offset));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  // Remove single article from list
  const deleteArticle = (id: string, e: any) => {
    e.stopPropagation();
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  // Toggle selection filter state
  const toggleSelectArticle = (id: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  // Clear current history archives
  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your saved commute history?")) {
      setHistory([]);
      setActiveBrief(null);
      localStorage.removeItem("commute_history");
      localStorage.removeItem("commute_active_brief");
    }
  };

  return (
    <div id="app_root" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-teal-100">
      
      {/* Implements standard background hidden audio engine */}
      <audio 
        ref={audioRef}
        src={activeBrief?.audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Styled Executive Application Header */}
      <header id="header_pane" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-emerald-500 text-white rounded-xl shadow-md shadow-teal-500/10">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">
                Commute News Summary Coordinator
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                AI Speech Digest &amp; Personalized Audio Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-ping" />
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              Host Environment Running
            </span>
          </div>
        </div>
      </header>

      {/* Main body canvas content */}
      <main id="main_container" className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Input desk & Settings Configuration (7 Columns) */}
        <section id="input_settings_desk" className="lg:col-span-7 flex flex-col gap-8">

          {/* INPUT HUB CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-semibold text-slate-900 font-display">
                1. Article Desk &amp; Link Collector
              </h2>
            </div>
            
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Queue web links or paste manual text below. Our scraper extracts paragraph bodies for Gemini's summary broadcaster.
            </p>

            {/* TAB SELECT */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
              <button 
                onClick={() => setInputTab("url")}
                className={`py-2 rounded-lg transition-all ${inputTab === "url" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Scan Web URL Link
              </button>
              <button 
                onClick={() => setInputTab("text")}
                className={`py-2 rounded-lg transition-all ${inputTab === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Paste Direct Text Block
              </button>
            </div>

            {/* TAB DETAILS */}
            <div className="space-y-4">
              {inputTab === "url" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                        <Link className="w-4 h-4" />
                      </div>
                      <input 
                        type="url"
                        placeholder="Paste article page link (e.g. https://bbc.com/news/...)"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-sans text-slate-800"
                      />
                    </div>
                    <button 
                      onClick={handleScrape}
                      disabled={fetchingUrl || !inputUrl}
                      className="px-4 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/15 disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {fetchingUrl ? (
                        <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Scrape Link
                    </button>
                  </div>
                  {fetchError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2">
                      <BadgeAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{fetchError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <input 
                    type="text"
                    placeholder="Brief headline or custom title (optional)"
                    value={inputTextTitle}
                    onChange={(e) => setInputTextTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <textarea 
                    rows={4}
                    placeholder="Paste the full paragraph copy text of your newsletter or news item here..."
                    value={inputTextVal}
                    onChange={(e) => setInputTextVal(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-sans text-slate-800 resize-none"
                  />
                  <button 
                    onClick={handleAddText}
                    disabled={!inputTextVal}
                    className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Article to Briefing Queue
                  </button>
                </div>
              )}
            </div>

            {/* LIVE QUEUE CONTAINER */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Queued Articles ({articles.length})</span>
                <span>Include in broadcast</span>
              </div>

              {articles.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium font-display">No articles queued inside desk</p>
                  <p className="text-[10px] text-slate-400 mt-1">Submit links or text to see options.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {articles.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleSelectArticle(item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${item.selected ? "bg-teal-50/40 border-teal-200/80 hover:bg-teal-50/65" : "bg-white border-slate-200/80 hover:bg-slate-50"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.url ? "bg-blue-100/75 text-blue-700" : "bg-amber-100/75 text-amber-700"}`}>
                            {item.url ? "Link Scraped" : "Manual Text"}
                          </span>
                          {item.sourceName && (
                            <span className="text-[10px] text-slate-400 font-mono font-medium truncate max-w-40">{item.sourceName}</span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 truncate pr-4">
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => deleteArticle(item.id, e)}
                          title="Remove article"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <input 
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleSelectArticle(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>

          {/* COMMUTE SETTINGS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Sliders className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-semibold text-slate-900 font-display">
                2. Commute Configuration &amp; Voices
              </h2>
            </div>

            <div className="space-y-6">
              
              {/* TARGET COMMUTE DURATION */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Target Commute Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "short", label: "Short Sync", time: "~2 min Summary" },
                    { value: "medium", label: "Medium Podcast", time: "~4 min Summary" },
                    { value: "long", label: "Long Briefing", time: "~8 min Summary" }
                  ].map((len) => (
                    <button
                      key={len.value}
                      onClick={() => setCommuteLength(len.value)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${commuteLength === len.value ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                    >
                      <div className="text-xs font-semibold">{len.label}</div>
                      <div className={`text-[10px] mt-0.5 font-mono ${commuteLength === len.value ? "text-slate-300" : "text-slate-400"}`}>
                        {len.time}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* TONE / VIBE STYLE */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Delivery Broadcast Style
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { value: "podcast", label: "Conversational Host", spec: "Relaxed & smooth" },
                    { value: "radio", label: "Morning Radio Show", spec: "Upbeat DJ energy" },
                    { value: "bullet", label: "Executive TL;DR", spec: "Bullet-by-bullet headlines" },
                    { value: "narrative", label: "Deep Narrative", spec: "Slow paced story doc" }
                  ].map((v) => (
                    <button
                      key={v.value}
                      onClick={() => setVibe(v.value)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${vibe === v.value ? "bg-teal-50 border-teal-300 text-teal-900 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"}`}
                    >
                      <div className="text-xs font-bold">{v.label}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 font-mono leading-none">{v.spec}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* VOCAL HOST SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Broadcaster Voice
                </label>
                <div className="space-y-2">
                  {[
                    { name: "Kore", desc: "Warm and balanced female speaker. Articulate presentational tone.", gender: "Female" },
                    { name: "Puck", desc: "Energetic and charismatic male presenter. Upbeat pace, ideal for morning DJ style.", gender: "Male" },
                    { name: "Zephyr", desc: "Technical presentational companion. Fluid modern pace.", gender: "Male" },
                    { name: "Fenrir", desc: "Warm storytelling narrator. Deeply expressive and friendly conversationalist.", gender: "Male" },
                    { name: "Charon", desc: "Deep, calm, and measured corporate baritone.", gender: "Male" }
                  ].map((vc) => (
                    <div
                      key={vc.name}
                      onClick={() => setVoice(vc.name)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${voice === vc.name ? "bg-teal-50/50 border-teal-300 shadow-sm" : "bg-white border-slate-200/80 hover:bg-slate-50"}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{vc.name}</span>
                          <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {vc.gender} Host
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          {vc.desc}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testSpeaker(vc.name);
                        }}
                        disabled={isAuditioning}
                        className={`px-2.5 py-1.5 text-[10px] font-semibold border rounded-lg transition-all whitespace-nowrap flex items-center gap-1 ${auditionVoice === vc.name ? "bg-teal-600 border-teal-600 text-white" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"}`}
                      >
                        {auditionVoice === vc.name ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                        Voice Test
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SPECIFIC DIRECTIONS FOCUS */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Special Directions or Focus (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 'explain financial metrics carefully', 'focus heavily on space updates'"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800"
                />
              </div>

              {/* ACTION GENERATE BRIEFING */}
              <button
                onClick={generateCommuteDigest}
                disabled={isLoading || articles.filter(a => a.selected).length === 0}
                className="w-full py-4 bg-gradient-to-tr from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-sm tracking-wide hover:shadow-lg hover:shadow-teal-600/15 transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rendering Commute Audio (Please Wait...)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compile Daily Briefing &amp; Voice Broadcast</span>
                  </>
                )}
              </button>

            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: Playback terminal, script & highlights (5 Columns) */}
        <section id="playback_deck" className="lg:col-span-12 xl:col-span-5 flex flex-col gap-8">
          
          {/* GENERATIVE LOADER SHEATH */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div 
                key="loader_overlay"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl p-6 text-center space-y-4 flex flex-col items-center justify-center py-16 min-h-[400px]"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <Sparkles className="w-6 h-6 text-teal-400 absolute top-5 left-5 animate-pulse" />
                </div>
                
                <h3 className="text-lg font-bold font-display tracking-tight text-teal-300">
                  Synthesizing Personal Commute Digest
                </h3>
                
                <div className="p-3 bg-slate-800/80 rounded-xl max-w-sm border border-slate-700/50">
                  <p className="text-xs text-slate-300 italic min-h-[36px] flex items-center justify-center px-4 font-mono leading-relaxed">
                    "{LOADING_MESSAGES[loadingMsgIdx]}"
                  </p>
                </div>

                <div className="w-full max-w-xs bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full transition-all duration-1000"
                    style={{ width: `${((loadingMsgIdx + 1) / LOADING_MESSAGES.length) * 100}%` }}
                  />
                </div>
                
                <p className="text-[10px] text-slate-500 font-mono">
                  Using gemini-3.1-flash-tts-preview &amp; gemini-3.5-flash models
                </p>
              </motion.div>
            )}

            {!isLoading && !activeBrief && (
              <motion.div 
                key="empty_sheath"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 text-center py-16 flex flex-col items-center justify-center gap-3 min-h-[400px]"
              >
                <div className="p-4 bg-slate-100 text-slate-400 rounded-full">
                  <FileAudio className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  No Commute Briefing Compiled Yet
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Select your daily news packet and hit "Compile Briefing". We will produce a pristine audio host reading a custom script personalized for your commute.
                </p>
                <div className="flex gap-2 items-center text-[10px] text-slate-500 bg-slate-100/60 px-3 py-1.5 rounded-full mt-4">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Includes live sample articles to test immediately!</span>
                </div>
              </motion.div>
            )}

            {!isLoading && activeBrief && (
              <motion.div 
                key="player_desk"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                
                {/* ACTIVE BROADCAST DECK */}
                <div className="p-6 bg-slate-900 text-white relative">
                  
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 px-2 py-0.5 rounded-full text-[9px] font-mono text-slate-300">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span>Loaded Core</span>
                  </div>

                  <p className="text-[10px] font-mono tracking-wider font-bold text-teal-400 uppercase">
                    Commute Briefing Active
                  </p>

                  <h3 className="text-lg font-bold font-display mt-1 text-white leading-tight">
                    {activeBrief.title}
                  </h3>

                  <div className="flex items-center gap-2 text-slate-400 text-xs mt-2.5 font-sans font-medium">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                      {activeBrief.createdAt}
                    </span>
                    <span>•</span>
                    <span className="text-slate-300 font-semibold">{activeBrief.voice} Voice Host</span>
                    <span>•</span>
                    <span className="capitalize">{activeBrief.vibe} Vibe</span>
                  </div>

                  {/* HIGH-FIDELITY ACTIVE EQUALIZER ANIMS */}
                  <div className="my-8 flex justify-center items-center h-16 gap-1 bg-slate-950/40 p-4 rounded-xl border border-slate-800/40 overflow-hidden">
                    {isPlaying ? (
                      <div className="flex items-end gap-1 h-12">
                        <div className="w-1.5 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full eq-bar-1" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full eq-bar-2" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full eq-bar-3" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full eq-bar-4" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full eq-bar-5" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full eq-bar-6" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-400 to-teal-200 rounded-full eq-bar-2" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-400 to-teal-200 rounded-full eq-bar-4" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-400 to-teal-200 rounded-full eq-bar-1" style={{ height: "40px" }} />
                        <div className="w-1.5 bg-gradient-to-t from-teal-400 to-teal-200 rounded-full eq-bar-5" style={{ height: "40px" }} />
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 text-center flex items-center gap-1.5 font-mono">
                        <Bookmark className="w-4 h-4 text-slate-700 animate-pulse" />
                        <span>Audio playback paused. Ready to broadcast.</span>
                      </div>
                    )}
                  </div>

                  {/* STANDARD AUDIO BAR TIMERS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>

                    <input 
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
                      className="w-full accent-teal-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* TRANSIT CONTROL WIDGETS */}
                  <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-800/60">
                    
                    {/* BACK-SPEED CONTROLS */}
                    <div className="flex items-center gap-1 leading-none shrink-0" title="Adjust listening speed">
                      <button 
                        onClick={() => {
                          const nextRates = [1, 1.25, 1.5, 1.75, 2, 0.8];
                          const idx = nextRates.indexOf(playbackRate);
                          const nextRate = nextRates[(idx + 1) % nextRates.length];
                          setPlaybackRate(nextRate);
                        }}
                        className="text-[10px] font-bold text-slate-400 bg-slate-800 hover:bg-slate-750 px-2 py-1 rounded transition-all font-mono hover:text-white"
                      >
                        {playbackRate}x speed
                      </button>
                    </div>

                    {/* CORE BUTTON GROUP */}
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => skipTime(-15)}
                        title="Rewind 15 seconds"
                        className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={togglePlay}
                        className="p-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-full transition-all scale-100 hover:scale-105 active:scale-95 shadow-lg shadow-teal-500/20 cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
                      </button>

                      <a 
                        href={activeBrief.audioUrl} 
                        download={`CommuteDigest_${activeBrief.id}.wav`}
                        title="Save MP3/WAV briefing file"
                        className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-all flex items-center justify-center cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>

                    {/* VOLUME SLIDE BAR */}
                    <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
                      <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-14 accent-teal-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                  </div>

                </div>

                {/* SCRIPT READ-ALONG & SUMMARIES */}
                <div className="p-6 space-y-6">
                  
                  {/* BENTO HIGHLIGHT POINTS */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-display">
                      News Headlines Visual Brief
                    </span>
                    <div className="space-y-2">
                      {activeBrief.bulletPoints.map((pt, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{pt}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WORD-FOR-WORD SCRIPT DIGEST */}
                  <div className="pt-5 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">
                        Teleprompter Word-For-Word Script
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-medium">
                        Pure speech formatting
                      </span>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-100/50 rounded-xl p-4 max-h-60 overflow-y-auto leading-relaxed text-slate-600 text-xs font-sans space-y-3">
                      {activeBrief.audioScript.split("\n\n").map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* HISTORY ARCHIVE CARDS */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4.5 h-4.5 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    Broadcasting Library / Archives
                  </h3>
                </div>
                <button 
                  onClick={clearHistory}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-semibold"
                >
                  Clear Archives
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {history.map((hItem) => (
                  <div 
                    key={hItem.id}
                    onClick={() => {
                      setActiveBrief(hItem);
                      if (audioRef.current) {
                        audioRef.current.src = hItem.audioUrl || "";
                        audioRef.current.load();
                        setCurrentTime(0);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all text-left cursor-pointer flex items-center justify-between gap-3 ${activeBrief?.id === hItem.id ? "bg-teal-50/20 border-teal-300" : "bg-white border-slate-200/60 hover:bg-slate-50"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                        <span>{hItem.createdAt}</span>
                        <span>•</span>
                        <span className="capitalize">{hItem.vibe} Vibe</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                        {hItem.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {hItem.voice}
                      </span>
                      <div className="p-1.5 bg-slate-100/80 rounded-full text-slate-500 group-hover:bg-teal-600 group-hover:text-white transition-all">
                        <Play className="w-3 h-3 fill-slate-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Aesthetic Footer and Attribution Disclaimer */}
      <footer id="footer_banner" className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-20">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            AuraCast News Summary Coordinator &copy; 2026. Powered by High-Fidelity Neural Speech Pipelines.
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Secure local-first architecture. Runs high-fidelity voice synthesis engine seamlessly.
          </p>
        </div>
      </footer>

    </div>
  );
}
