
import React, { useMemo, useState } from 'react';
import { SessionResult, Language, ModuleID } from '../types';
import { storage } from '../services/storage';
import { translations, dir } from '../services/localization';
import { Calendar, Clock, Trophy, Activity, AlertCircle, FileText, Download, Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel } from 'docx';
import FileSaver from 'file-saver';

interface DashboardProps {
  userId: string;
  userName: string;
  language: Language;
}

const getCat = (modId: string) => {
  const idStr = modId.toString();
  if ([ModuleID.SACC, ModuleID.DIVI, ModuleID.VIGI].includes(idStr as ModuleID)) return 'Attention';
  if ([ModuleID.TOPO, ModuleID.PHYS, ModuleID.VERB].includes(idStr as ModuleID)) return 'Memory';
  if ([ModuleID.REAK, ModuleID.LOGI, ModuleID.PLAN, ModuleID.SAGU].includes(idStr as ModuleID)) return 'Executive';
  if ([ModuleID.VIST, ModuleID.EXPL, ModuleID.NEGT].includes(idStr as ModuleID)) return 'Visual Field';
  if ([ModuleID.CORSI, ModuleID.NBACK].includes(idStr as ModuleID)) return 'Working Memory';
  return 'Attention';
};

export const Dashboard: React.FC<DashboardProps> = ({ userId, userName, language }) => {
  const sessions = storage.getUserSessions(userId);
  const t = translations[language];
  const [isExporting, setIsExporting] = useState(false);

  const statsByModule = useMemo(() => {
    const groups: Record<string, SessionResult[]> = {};
    sessions.forEach(s => {
      if (!groups[s.moduleId]) groups[s.moduleId] = [];
      groups[s.moduleId].push(s);
    });
    return groups;
  }, [sessions]);

  const cognitiveProfile = useMemo(() => {
    const CATEGORIES = ['Attention', 'Memory', 'Executive', 'Visual Field', 'Working Memory'];
    const domains: Record<string, { totalScore: number, count: number, maxLevel: number, totalRT: number, rtCount: number, totalAcc: number }> = {};
    
    CATEGORIES.forEach(cat => {
      domains[cat] = { totalScore: 0, count: 0, maxLevel: 0, totalRT: 0, rtCount: 0, totalAcc: 0 };
    });

    let totalGlobalRT = 0;
    let globalRTCount = 0;

    sessions.forEach(s => {
      const cat = getCat(s.moduleId);
      if (domains[cat]) {
        const accuracy = s.totalTrials > 0 ? (s.correctCount / s.totalTrials) : 0;
        const levelFactor = Math.min(s.level, 20) / 20;
        const sessionScore = (accuracy * 70) + (levelFactor * 30);

        domains[cat].totalScore += sessionScore;
        domains[cat].totalAcc += accuracy;
        domains[cat].count += 1;
        domains[cat].maxLevel = Math.max(domains[cat].maxLevel, s.level);

        if (s.averageReactionTimeMs > 0) {
          domains[cat].totalRT += s.averageReactionTimeMs;
          domains[cat].rtCount++;
          totalGlobalRT += s.averageReactionTimeMs;
          globalRTCount++;
        }
      }
    });

    const domainScores = CATEGORIES.map(name => {
      const d = domains[name];
      const hasData = d.count > 0;
      return {
        name,
        displayName: t.categories[name as keyof typeof t.categories],
        score: hasData ? Math.round(d.totalScore / d.count * 100) / 100 : 0,
        accuracy: hasData ? (d.totalAcc / d.count) : 0,
        avgRT: hasData && d.rtCount > 0 ? Math.round(d.totalRT / d.rtCount) : 0,
        hasData
      };
    });

    const activeDomains = domainScores.filter(d => d.hasData);
    if (activeDomains.length === 0) return null;
    
    const finalGlobalScore = Math.round(activeDomains.reduce((acc, d) => acc + d.score, 0) / activeDomains.length);
    const globalAvgAcc = activeDomains.reduce((acc, d) => acc + d.accuracy, 0) / activeDomains.length;
    const globalAvgRT = globalRTCount > 0 ? totalGlobalRT / globalRTCount : 0;

    const sorted = [...activeDomains].sort((a, b) => b.score - a.score);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    const notes: string[] = [];
    if (finalGlobalScore >= 80) notes.push(t.analysis.intro_good);
    else if (finalGlobalScore < 50) notes.push(t.analysis.intro_poor);
    else notes.push(t.analysis.intro_mixed);

    if (globalAvgRT > 0 && globalAvgRT < 600 && globalAvgAcc < 0.60) notes.push(t.analysis.impulsivity_warning);
    if (globalAvgRT > 2000 && globalAvgAcc > 0.85) notes.push(t.analysis.slowness_warning);

    if (weakest.score < 60) {
      const adviceKey = `advice_${weakest.name}` as keyof typeof t.analysis;
      if (t.analysis[adviceKey]) notes.push(t.analysis[adviceKey] as string);
    }

    return {
      globalScore: finalGlobalScore,
      domainScores: domainScores,
      sortedDomains: sorted,
      strongest,
      weakest,
      interpretation: notes.join(" "),
      hasSufficientData: sessions.length >= 3
    };
  }, [sessions, t]);

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const isRTL = language === Language.FA || language === Language.AR;
      const introText = t.reportIntro.replace('{name}', userName);
      
      const docChildren: any[] = [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "NeuroRehab Clinical Report", bold: true })],
          spacing: { after: 200 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: isRTL,
          children: [new TextRun({ text: introText, bold: true, size: 28 })],
          spacing: { after: 100 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `${t.date}: ${new Date().toLocaleDateString()}`, size: 24 })],
          spacing: { after: 400 }
        }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: isRTL, children: [new TextRun({ text: t.analysis.title, bold: true })] }),
        new Paragraph({ bidirectional: isRTL, children: [new TextRun({ text: `${t.analysis.neuroScore}: ${cognitiveProfile?.globalScore || 0}/100`, bold: true })] }),
        new Paragraph({ bidirectional: isRTL, children: [new TextRun({ text: cognitiveProfile?.interpretation || "" })], spacing: { after: 400 } })
      ];

      Object.entries(statsByModule).forEach(([modId, modSessions]) => {
        const modInfo = t.modInfo[modId as keyof typeof t.modInfo];
        docChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: isRTL, children: [new TextRun({ text: modInfo?.name || modId, bold: true })] }));
        
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.date, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.level, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.score, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Acc %", bold: true })] })] })
            ]
          })
        ];

        modSessions.slice(0, 10).forEach(s => {
          tableRows.push(new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: new Date(s.timestamp).toLocaleDateString() })] }),
              new TableCell({ children: [new Paragraph({ text: s.level.toString() })] }),
              new TableCell({ children: [new Paragraph({ text: s.correctCount.toString() })] }),
              new TableCell({ children: [new Paragraph({ text: `${Math.round((s.correctCount/s.totalTrials)*100)}%` })] })
            ]
          }));
        });
        docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      });

      const doc = new Document({ sections: [{ children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      FileSaver.saveAs(blob, `NeuroRehab_Report_${userName}.docx`);
    } catch (error) {
      console.error(error);
      alert("Error generating report.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalTimeMin = Math.round(sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);
  const avgLevel = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.level, 0) / sessions.length) : 0;
  const accuracy = sessions.reduce((acc, s) => acc + s.totalTrials, 0) > 0 ? Math.round((sessions.reduce((acc, s) => acc + s.correctCount, 0) / sessions.reduce((acc, s) => acc + s.totalTrials, 0)) * 100) : 0;

  return (
    <div className="space-y-10" dir={dir(language)}>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          <StatCard icon={<Calendar className="text-blue-600"/>} label={t.stats.totalSessions} value={sessions.length.toString()} color="bg-blue-50 text-blue-900" />
          <StatCard icon={<Clock className="text-emerald-600"/>} label={t.stats.totalTime} value={`${totalTimeMin} min`} color="bg-emerald-50 text-emerald-900" />
          <StatCard icon={<Trophy className="text-amber-600"/>} label={t.stats.avgLevel} value={avgLevel.toString()} color="bg-amber-50 text-amber-900" />
          <StatCard icon={<Activity className="text-purple-600"/>} label={t.stats.accuracy} value={`${accuracy}%`} color="bg-purple-50 text-purple-900" />
        </div>
        <Button onClick={handleExportWord} disabled={isExporting} className="h-full min-h-[80px] w-full md:w-40 flex flex-col items-center justify-center gap-2 bg-slate-900 text-white">
          {isExporting ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><FileText size={24} /><span className="text-xs font-bold uppercase">{t.exportWord}</span></>}
        </Button>
      </div>

      {cognitiveProfile && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/40 shadow-xl bg-gradient-to-br from-white/80 to-blue-50/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30"><Brain size={24} /></div><h2 className="text-2xl font-bold text-slate-800">{t.analysis.title}</h2></div>
           <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-w-[200px]">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90"><circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12" /><circle cx="64" cy="64" r="56" fill="none" stroke="#2563eb" strokeWidth="12" strokeDasharray={351} strokeDashoffset={351 - (351 * cognitiveProfile.globalScore / 100)} className="transition-all duration-1000 ease-out" strokeLinecap="round"/></svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black text-slate-800">{cognitiveProfile.globalScore}</span><span className="text-xs font-bold text-slate-400">/100</span></div>
                 </div>
                 <div className="mt-4 text-center"><h3 className="font-bold text-slate-700">{t.analysis.neuroScore}</h3><p className="text-xs text-slate-400 mt-1">{t.analysis.neuroScoreDesc}</p></div>
              </div>
              <div className="flex-1 space-y-4">
                 {cognitiveProfile.domainScores.filter(d => d.hasData).map((domain, i) => (
                    <div key={i} className="group">
                       <div className="flex justify-between items-center mb-1"><span className="text-sm font-bold text-slate-700">{domain.displayName}</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${domain.score >= 80 ? 'bg-emerald-100 text-emerald-700' : domain.score >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{domain.score >= 80 ? t.analysis.excellent : domain.score >= 50 ? t.analysis.good : t.analysis.fair}</span></div>
                       <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${domain.score >= 80 ? 'bg-emerald-500' : domain.score >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${domain.score}%` }}></div></div>
                    </div>
                 ))}
              </div>
              <div className="lg:w-1/3 bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col gap-4">
                 <h3 className="font-bold text-slate-600 flex items-center gap-2 text-sm uppercase tracking-wider"><FileText size={16}/> {t.analysis.clinicalNotes}</h3>
                 <p className="text-sm text-slate-600 leading-relaxed italic">"{cognitiveProfile.interpretation}"</p>
                 {cognitiveProfile.strongest && (<div className="border-t border-slate-200 pt-3 mt-auto flex items-start gap-2"><CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" /><div><span className="text-xs font-bold text-slate-400 uppercase block">{t.analysis.strongestDomain}</span><span className="font-bold text-slate-700">{cognitiveProfile.strongest.displayName}</span></div></div>)}
              </div>
           </div>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(statsByModule).map(([modId, modSessions]) => (
          <div key={modId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">{t.modInfo[modId as keyof typeof t.modInfo]?.name || modId}</h3>
              <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{modSessions.length} sessions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50/80 font-bold">
                  <tr><th className="px-6 py-4">{t.date}</th><th className="px-6 py-4">{t.level}</th><th className="px-6 py-4">{t.score}</th><th className="px-6 py-4">{t.stats.accuracy}</th><th className="px-6 py-4">{t.reactionTime}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30">
                      <td className="px-6 py-4 text-slate-600">{new Date(s.timestamp).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold">{s.level}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">{s.correctCount}</td>
                      <td className="px-6 py-4">{Math.round((s.correctCount/s.totalTrials)*100)}%</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{Math.round(s.averageReactionTimeMs)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
     </div>
     <div>
       <div className="text-xs text-slate-400 font-bold uppercase mb-1">{label}</div>
       <div className="text-2xl font-bold text-slate-800">{value}</div>
     </div>
  </div>
);
