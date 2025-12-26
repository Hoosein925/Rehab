
import React, { useState, useEffect, useRef } from 'react';
import { Language, User, ModuleID, SessionResult, ModuleConfig } from './types';
import { translations, dir } from './services/localization';
import { storage } from './services/storage';
import { audioService } from './services/audio';
import { Button } from './components/Button';
import { 
  Brain, User as UserIcon, LogOut, BarChart2, PlayCircle, Plus, ChevronRight,
  Zap, Eye, Activity, Grid, Layers, Target, Box, Timer, Info, X, Globe, Clock,
  Download, Upload, Calendar, VolumeX, AlertTriangle, Trash2
} from 'lucide-react';

// Import Modules
import { Sacc } from './modules/Sacc';
import { Reak } from './modules/Reak';
import { Corsi } from './modules/Corsi';
import { Nback } from './modules/Nback';
import { Logi } from './modules/Logi';
import { Divi } from './modules/Divi';
import { Vigi } from './modules/Vigi';
import { Topo } from './modules/Topo';
import { Phys } from './modules/Phys';
import { Vist } from './modules/Vist';
import { Plan } from './modules/Plan';
import { Verb } from './modules/Verb';
import { Expl } from './modules/Expl';
import { Negt } from './modules/Negt';
import { Sagu } from './modules/Sagu';

import { Dashboard } from './components/Dashboard';

// Helper icon
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

// Custom Icons for Social Links
const AparatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM9.5 16.5V7.5L16.5 12L9.5 16.5Z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.82 14.39 15.48 16.2C15.34 16.97 15.06 17.23 14.79 17.25C14.2 17.3 13.76 16.86 13.19 16.49C12.3 15.9 11.79 15.54 10.93 14.97C9.93 14.31 10.58 13.95 11.15 13.36C11.3 13.2 13.88 10.86 13.93 10.65C13.94 10.62 13.94 10.52 13.88 10.46C13.82 10.41 13.73 10.43 13.66 10.44C13.57 10.46 12.12 11.42 9.32 13.31C8.91 13.59 8.54 13.73 8.09 13.72C7.6 13.71 6.66 13.44 5.96 13.22C5.11 12.94 4.43 12.8 4.5 12.33C4.54 12.09 4.87 11.84 5.54 11.57C8.68 10.13 10.77 9.23 11.83 8.79C14.86 7.53 15.49 7.31 15.9 7.31C15.99 7.31 16.2 7.33 16.33 7.44C16.44 7.53 16.47 7.65 16.48 7.74C16.49 7.8 16.65 8.51 16.64 8.8Z" />
  </svg>
);


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'login' | 'menu' | 'training' | 'dashboard' | 'countdown'>('login');
  const [language, setLanguage] = useState<Language>(Language.FA);
  const [activeModule, setActiveModule] = useState<ModuleID | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [count, setCount] = useState(3);
  const [showAbout, setShowAbout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  useEffect(() => {
    document.body.dir = dir(language);
  }, [language]);

  useEffect(() => {
    let timer: number;
    if (view === 'countdown' && count > 0) {
      timer = window.setTimeout(() => {
        setCount(c => c - 1);
      }, 1000);
    } else if (view === 'countdown' && count === 0) {
      setSessionStartTime(Date.now());
      setView('training');
    }
    return () => clearTimeout(timer);
  }, [view, count]);

  const getModules = (): ModuleConfig[] => [
    { id: ModuleID.SACC, name: t.modInfo.SACC.name, category: 'Attention', description: t.modInfo.SACC.desc },
    { id: ModuleID.DIVI, name: t.modInfo.DIVI.name, category: 'Attention', description: t.modInfo.DIVI.desc },
    { id: ModuleID.VIGI, name: t.modInfo.VIGI.name, category: 'Attention', description: t.modInfo.VIGI.desc },
    { id: ModuleID.TOPO, name: t.modInfo.TOPO.name, category: 'Memory', description: t.modInfo.TOPO.desc },
    { id: ModuleID.PHYS, name: t.modInfo.PHYS.name, category: 'Memory', description: t.modInfo.PHYS.desc },
    { id: ModuleID.VERB, name: t.modInfo.VERB.name, category: 'Memory', description: t.modInfo.VERB.desc },
    { id: ModuleID.REAK, name: t.modInfo.REAK.name, category: 'Executive', description: t.modInfo.REAK.desc },
    { id: ModuleID.LOGI, name: t.modInfo.LOGI.name, category: 'Executive', description: t.modInfo.LOGI.desc },
    { id: ModuleID.PLAN, name: t.modInfo.PLAN.name, category: 'Executive', description: t.modInfo.PLAN.desc },
    { id: ModuleID.SAGU, name: t.modInfo.SAGU.name, category: 'Executive', description: t.modInfo.SAGU.desc },
    { id: ModuleID.CORSI, name: t.modInfo.CORSI.name, category: 'Working Memory', description: t.modInfo.CORSI.desc },
    { id: ModuleID.NBACK, name: t.modInfo.NBACK.name, category: 'Working Memory', description: t.modInfo.NBACK.desc },
    { id: ModuleID.VIST, name: t.modInfo.VIST.name, category: 'Visual Field', description: t.modInfo.VIST.desc },
    { id: ModuleID.EXPL, name: t.modInfo.EXPL.name, category: 'Visual Field', description: t.modInfo.EXPL.desc },
    { id: ModuleID.NEGT, name: t.modInfo.NEGT.name, category: 'Visual Field', description: t.modInfo.NEGT.desc },
  ];

  useEffect(() => {
    setUsers(storage.getUsers());
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setView('menu');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setActiveModule(null);
  };

  const handleCreateUser = (name: string) => {
    if (!name.trim()) return;
    const newUser = storage.addUser(name);
    setUsers([...users, newUser]);
    handleLogin(newUser);
  };

  const handleDeleteUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (window.confirm(t.deleteConfirm)) {
      storage.deleteUser(userId);
      setUsers(storage.getUsers());
    }
  };
  
  const handleExportData = () => {
    const data = storage.getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurorehab_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (storage.importData(data)) {
          setUsers(storage.getUsers());
          alert(t.dataImported);
        } else {
          alert(t.errorFile);
        }
      } catch (err) {
        alert(t.errorFile);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startModule = (id: ModuleID) => {
    audioService.init();
    setActiveModule(id);
    setCount(3);
    setView('countdown');
  };

  const handleModuleComplete = (result: Omit<SessionResult, 'id' | 'userId' | 'timestamp'>) => {
    if (!user || !activeModule) return;

    const fullResult: SessionResult = {
      ...result,
      id: crypto.randomUUID(),
      userId: user.id,
      timestamp: Date.now(),
      durationSeconds: Math.floor((Date.now() - sessionStartTime) / 1000)
    };

    storage.saveSession(fullResult);
    setView('menu');
    setActiveModule(null);
  };

  const renderModule = () => {
    if (!user || !activeModule) return null;
    
    switch (activeModule) {
      case ModuleID.SACC: return <Sacc language={language} userId={user.id} onComplete={handleModuleComplete} />;
      case ModuleID.REAK: return <Reak language={language} onComplete={handleModuleComplete} />;
      case ModuleID.CORSI: return <Corsi language={language} onComplete={handleModuleComplete} />;
      case ModuleID.NBACK: return <Nback language={language} onComplete={handleModuleComplete} />;
      case ModuleID.LOGI: return <Logi language={language} onComplete={handleModuleComplete} />;
      case ModuleID.DIVI: return <Divi language={language} onComplete={handleModuleComplete} />;
      case ModuleID.VIGI: return <Vigi language={language} onComplete={handleModuleComplete} />;
      case ModuleID.TOPO: return <Topo language={language} onComplete={handleModuleComplete} />;
      case ModuleID.PHYS: return <Phys language={language} onComplete={handleModuleComplete} />;
      case ModuleID.VIST: return <Vist language={language} onComplete={handleModuleComplete} />;
      case ModuleID.PLAN: return <Plan language={language} onComplete={handleModuleComplete} />;
      case ModuleID.VERB: return <Verb language={language} onComplete={handleModuleComplete} />;
      case ModuleID.EXPL: return <Expl language={language} onComplete={handleModuleComplete} />;
      case ModuleID.NEGT: return <Negt language={language} onComplete={handleModuleComplete} />;
      case ModuleID.SAGU: return <Sagu language={language} onComplete={handleModuleComplete} />;
      default: return null;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Attention': return <Target className="text-rose-500" />;
      case 'Memory': return <Grid className="text-blue-500" />;
      case 'Executive': return <Activity className="text-violet-500" />;
      case 'Visual Field': return <Eye className="text-emerald-500" />;
      case 'Working Memory': return <Layers className="text-amber-500" />;
      default: return <Box />;
    }
  };
  
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Attention': return "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-100 group-hover:border-rose-300";
      case 'Memory': return "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100 group-hover:border-blue-300";
      case 'Executive': return "bg-violet-50 text-violet-600 border-violet-100 group-hover:bg-violet-100 group-hover:border-violet-300";
      case 'Visual Field': return "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100 group-hover:border-emerald-300";
      case 'Working Memory': return "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100 group-hover:border-amber-300";
      default: return "bg-slate-50 text-slate-600";
    }
  };

  if (view === 'training') {
    return renderModule();
  }

  if (view === 'countdown') {
    const activeModInfo = getModules().find(m => m.id === activeModule);
    const requiresAudio = activeModule === ModuleID.DIVI || activeModule === ModuleID.REAK;
    
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xl text-white p-6" dir={dir(language)}>
         <div className="text-3xl font-bold mb-4 opacity-80 text-center px-4">
           {activeModInfo?.name}
         </div>
         
         <div className="relative mb-12">
            <div className="w-48 h-48 rounded-full border-4 border-white/20 flex items-center justify-center animate-pulse">
               <span className="text-9xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                 {count}
               </span>
            </div>
            <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin duration-1000"></div>
         </div>

         {requiresAudio && (
            <div className="bg-amber-500/20 border border-amber-500/50 p-6 rounded-3xl flex flex-col items-center gap-4 max-w-sm w-full animate-bounce shadow-2xl shadow-amber-500/20 mb-8">
               <div className="bg-amber-500 p-3 rounded-2xl text-slate-900 shadow-lg">
                  <VolumeX size={32} strokeWidth={2.5} />
               </div>
               <div className="text-center">
                  <p className="text-lg font-black text-amber-400 mb-1">{t.silentModeWarning}</p>
                  <p className="text-xs text-amber-200/70 font-bold uppercase tracking-widest">Audio Required for this Module</p>
               </div>
            </div>
         )}

         <div className="text-2xl font-bold text-blue-300 animate-pulse">
            {t.getReady}
         </div>
      </div>
    );
  }

  const AboutModal = () => {
    if (!showAbout) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" dir={dir(language)}>
         <div className="bg-white rounded-3xl p-8 max-w-lg w-full relative shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors rtl:right-auto rtl:left-4 z-10">
              <X size={24} />
            </button>
            
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                <Brain size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{t.appDescTitle}</h2>
            </div>
            
            <p className="text-slate-600 leading-relaxed text-center mb-6 font-medium text-sm">
               {t.appDescription}
            </p>

            <div className="w-full border-t border-slate-100 pt-6 flex flex-col gap-6">
                <div className="text-center">
                   <p className="font-bold text-slate-700">{t.creator}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.watchVideos}</span>
                   <a href="https://www.aparat.com/Amazing.Nurse" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl transition-colors font-bold w-full justify-center group">
                     <AparatIcon className="w-6 h-6" />
                     <span className="group-hover:text-pink-700">Aparat</span>
                   </a>
                </div>
                <div className="flex flex-col items-center gap-2 mb-4">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.contactCreator}</span>
                   <a href="https://t.me/ho3in925" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl transition-colors font-bold w-full justify-center group">
                     <TelegramIcon className="w-6 h-6" />
                     <span className="group-hover:text-sky-700">Telegram</span>
                   </a>
                </div>
            </div>
            <Button className="w-full py-4 rounded-xl mt-2" onClick={() => setShowAbout(false)}>
              {t.close}
            </Button>
         </div>
      </div>
    );
  }

  const LoginView = () => {
    const [newName, setNewName] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    const locale = language === Language.FA ? 'fa-IR' : (language === Language.AR ? 'ar-SA' : 'en-US');
    const timeString = currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const dateString = currentTime.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden" dir={dir(language)}>
        <AboutModal />
        <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />

        <header className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-20">
            <div className="flex items-center gap-4">
               <div className="bg-gradient-to-br from-blue-600 to-indigo-700 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                 <Brain className="text-white w-7 h-7 md:w-8 md:h-8"/>
               </div>
               <div>
                 <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-md">NeuroRehab</h1>
                 <span className="text-xs text-blue-200 font-bold uppercase tracking-widest opacity-90">Professional Therapy</span>
               </div>
            </div>
            <Button variant="ghost" onClick={() => setShowAbout(true)} className="text-white hover:bg-white/10 hover:text-white backdrop-blur-sm border border-transparent hover:border-white/20 gap-2">
               <Info className="w-5 h-5" />
               <span className="hidden md:inline">{t.about}</span>
            </Button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="glass-panel w-full max-w-lg rounded-[2rem] shadow-2xl p-8 md:p-12 relative animate-in fade-in zoom-in-95 duration-500 border border-white/40">
            
            <div className="w-full flex justify-end gap-2 mb-6 md:absolute md:mb-0 md:top-6 md:right-6 rtl:md:right-auto rtl:md:left-6 z-20">
               <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-white/50 shadow-sm">
                  <button onClick={handleExportData} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-blue-600 transition-colors" title={t.saveData}><Download className="w-4 h-4" /></button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-emerald-600 transition-colors" title={t.loadData}><Upload className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  <div className="relative group">
                    <Globe className="absolute top-1/2 -translate-y-1/2 left-2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors rtl:left-auto rtl:right-2" />
                    <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="appearance-none bg-transparent hover:bg-white/50 rounded-md pl-7 pr-3 py-1 text-xs font-bold text-slate-600 focus:ring-0 focus:outline-none cursor-pointer transition-all rtl:pl-3 rtl:pr-7 w-20">
                      <option value={Language.FA}>فارسی</option>
                      <option value={Language.EN}>English</option>
                      <option value={Language.AR}>العربية</option>
                    </select>
                  </div>
               </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center md:pt-4">{t.welcome}</h2>

            <div className="space-y-8">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block ml-1">{t.selectUser}</label>
                <div className="grid gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {users.map(u => (
                    <div key={u.id} className="relative group/item">
                      <button
                        onClick={() => handleLogin(u)}
                        className="flex items-center justify-between w-full p-3.5 bg-white/60 hover:bg-white border border-slate-100 hover:border-blue-400 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left rtl:text-right"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-blue-50 group-hover:to-blue-100 flex items-center justify-center text-slate-600 group-hover:text-blue-700 font-bold text-base transition-colors shadow-inner">
                            {u.name[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-base text-slate-700 group-hover:text-slate-900">{u.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={(e) => handleDeleteUser(e, u.id)}
                             className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                           >
                             <Trash2 size={18} />
                           </button>
                           <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors rtl:rotate-180" />
                        </div>
                      </button>
                    </div>
                  ))}
                  {users.length === 0 && (
                     <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                       <UserIcon className="w-8 h-8 mx-auto text-slate-300 mb-2"/>
                       <p className="text-slate-400 text-sm font-medium">{t.noData}</p>
                     </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block ml-1">{t.newUser}</label>
                <div className="flex gap-3">
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t.enterName} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none shadow-inner transition-all" />
                  <Button onClick={() => handleCreateUser(newName)} disabled={!newName} className="rounded-xl px-6 shadow-lg shadow-blue-500/20">
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 w-full z-20 flex justify-center pointer-events-none">
             <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl border border-white/30 bg-slate-900/40 backdrop-blur-xl pointer-events-auto ring-1 ring-white/20">
                <Clock className="w-5 h-5 text-blue-300" strokeWidth={2.5}/>
                <div className="flex items-baseline gap-3">
                   <span className="text-2xl font-bold text-white font-mono tabular-nums leading-none tracking-tight">{timeString}</span>
                   <div className="w-px h-4 bg-white/20"></div>
                   <span className="text-sm font-bold text-slate-200 leading-none">{dateString}</span>
                </div>
             </div>
        </div>
      </div>
    );
  };

  const MenuView = () => {
    const modules = getModules();
    const categories = Array.from(new Set(modules.map(m => m.category)));

    return (
      <div className="min-h-screen flex flex-col bg-transparent" dir={dir(language)}>
        <header className="glass-panel sticky top-4 z-30 mx-4 md:mx-8 px-5 py-3.5 flex justify-between items-center rounded-2xl mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-blue-600 to-indigo-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <Brain className="text-white w-6 h-6"/>
             </div>
             <div>
                <span className="font-extrabold text-lg text-slate-800 leading-none block mb-1">NeuroRehab</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">Therapy Dashboard</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white/80 border border-white/50 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
              <UserIcon size={16} className="text-blue-600"/>
              <span className="font-bold text-slate-700 text-xs">{user?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs py-2 px-3">
              <LogOut size={16} className={`mr-1.5 inline ${language === Language.FA || language === Language.AR ? 'ml-1.5 mr-0' : 'mr-1.5 ml-0'}`}/> {t.logout}
            </Button>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
             <div>
               <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-sm">{t.modules}</h2>
               <p className="text-blue-100 font-medium max-w-xl text-base opacity-90">{t.selectProgramDesc}</p>
             </div>
             <Button variant="secondary" onClick={() => setView('dashboard')} className="shadow-lg bg-white border-white hover:bg-blue-50 text-blue-700 px-5 py-2.5 h-auto text-sm">
               <BarChart2 className={`w-4 h-4 inline ${language === Language.FA || language === Language.AR ? 'ml-1.5' : 'mr-1.5'} text-blue-600`} />
               {t.dashboard}
             </Button>
          </div>

          <div className="space-y-10 pb-20">
            {categories.map(cat => (
              <div key={cat} className="animate-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 text-white shadow-lg">
                    {React.cloneElement(getCategoryIcon(cat) as React.ReactElement<any>, { size: 20 })}
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight drop-shadow-md">{t.categories[cat] || cat}</h3>
                  <div className="h-0.5 bg-gradient-to-r from-white/30 to-transparent flex-1 ml-4 rounded-full"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {modules.filter(m => m.category === cat).map(mod => (
                    <div 
                      key={mod.id}
                      className="glass-card group rounded-2xl p-4 cursor-pointer relative overflow-hidden flex flex-col"
                      onClick={() => startModule(mod.id)}
                    >
                      <div className="flex justify-between items-start mb-4">
                         <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors border shadow-inner ${getCategoryColor(cat)}`}>
                            <span className="font-extrabold text-base">{mod.id.substring(0,2)}</span>
                         </div>
                         <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 shadow-lg">
                            <PlayCircle className="w-5 h-5 text-white ml-0.5" />
                         </div>
                      </div>
                      
                      <div className="flex-1">
                         <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight group-hover:text-blue-700 transition-colors truncate">{mod.name.split('-')[0]}</h3>
                         <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3 h-8 font-medium">{mod.description}</p>
                         
                         <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 group-hover:border-blue-100 transition-colors">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.categories[cat]}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors rtl:rotate-180" />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  };

  const DashboardView = () => (
    <div className="min-h-screen bg-transparent" dir={dir(language)}>
      <header className="glass-panel mx-4 mt-4 rounded-xl px-6 py-4 flex items-center gap-4 sticky top-4 z-20 shadow-lg">
        <Button variant="secondary" onClick={() => setView('menu')} className="rounded-full !px-4 hover:bg-slate-100">
           <ArrowLeftIcon className={language === Language.FA || language === Language.AR ? "ml-1" : "mr-1"} />
           {t.back}
        </Button>
        <h1 className="text-xl font-bold text-slate-800">{t.dashboard} <span className="text-slate-300 font-light mx-2">|</span> <span className="text-blue-600">{user?.name}</span></h1>
      </header>
      <div className="p-4 md:p-8 container mx-auto max-w-7xl">
        {user && <Dashboard userId={user.id} userName={user.name} language={language} />}
      </div>
    </div>
  );

  return (
    <>
      {view === 'login' && <LoginView />}
      {view === 'menu' && <MenuView />}
      {view === 'dashboard' && <DashboardView />}
    </>
  );
}

export default App;
