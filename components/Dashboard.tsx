import React, { useMemo, useState } from 'react';
import { SessionResult, Language } from '../types';
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

export const Dashboard: React.FC<DashboardProps> = ({ userId, userName, language }) => {
  const sessions = storage.getUserSessions(userId);
  const t = translations[language];
  const [isExporting, setIsExporting] = useState(false);

  // Group by Module
  const statsByModule = useMemo(() => {
    const groups: Record<string, SessionResult[]> = {};
    sessions.forEach(s => {
      if (!groups[s.moduleId]) groups[s.moduleId] = [];
      groups[s.moduleId].push(s);
    });
    return groups;
  }, [sessions]);

  // --- ANALYTICS ENGINE (Rewritten for Robustness) ---
  const cognitiveProfile = useMemo(() => {
    // 1. Initialize all categories to ensure no "undefined" errors
    const CATEGORIES = ['Attention', 'Memory', 'Executive', 'Visual Field', 'Working Memory'];
    
    // Structure: { Attention: { totalScore: 0, count: 0, ... } }
    const domains: Record<string, { totalScore: number, count: number, maxLevel: number, totalRT: number, rtCount: number, totalAcc: number }> = {};
    
    CATEGORIES.forEach(cat => {
      domains[cat] = { totalScore: 0, count: 0, maxLevel: 0, totalRT: 0, rtCount: 0, totalAcc: 0 };
    });

    // Helper to get category from ID safely
    const getCat = (modId: string) => {
      const info = t.modInfo[modId as keyof typeof t.modInfo];
      const idStr = modId.toString();
      if (['SACC', 'DIVI', 'VIGI'].includes(idStr)) return 'Attention';
      if (['TOPO', 'PHYS', 'VERB'].includes(idStr)) return 'Memory';
      if (['REAK', 'LOGI', 'PLAN', 'SAGU'].includes(idStr)) return 'Executive';
      if (['VIST', 'EXPL', 'NEGT'].includes(idStr)) return 'Visual Field';
      if (['CORSI', 'NBACK'].includes(idStr)) return 'Working Memory';
      return 'Attention'; // Fallback
    };

    let totalGlobalRT = 0;
    let globalRTCount = 0;

    // 2. Process Sessions
    sessions.forEach(s => {
      const cat = getCat(s.moduleId);
      if (domains[cat]) {
        // Calculate Score: (Accuracy * 60) + (Level Factor * 40)
        const accuracy = s.totalTrials > 0 ? (s.correctCount / s.totalTrials) : 0;
        const levelFactor = Math.min(s.level, 20) / 20;
        const sessionScore = (accuracy * 70) + (levelFactor * 30); // Adjusted weights

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

    // 3. Flatten to Array and Calculate Averages
    const domainScores = CATEGORIES.map(name => {
      const d = domains[name];
      const hasData = d.count > 0;
      return {
        name, // English key
        displayName: t.categories[name as keyof typeof t.categories], // Localized Name
        score: hasData ? Math.round(d.totalScore / d.count * 100) / 100 : 0, // Keep decimals for precision then round later
        accuracy: hasData ? (d.totalAcc / d.count) : 0,
        avgRT: hasData && d.rtCount > 0 ? Math.round(d.totalRT / d.rtCount) : 0,
        hasData
      };
    });

    // 4. Global Stats
    const activeDomains = domainScores.filter(d => d.hasData);
    
    if (activeDomains.length === 0) {
       return null; // No data at all
    }
    
    const finalGlobalScore = Math.round(activeDomains.reduce((acc, d) => acc + d.score, 0) / activeDomains.length);
    const globalAvgAcc = activeDomains.reduce((acc, d) => acc + d.accuracy, 0) / activeDomains.length;
    const globalAvgRT = globalRTCount > 0 ? totalGlobalRT / globalRTCount : 0;

    // 5. Ranking (Only active domains)
    const sorted = [...activeDomains].sort((a, b) => b.score - a.score);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    // 6. Interpretation Logic
    const notes: string[] = [];

    // General Status
    if (finalGlobalScore >= 80) notes.push(t.analysis.intro_good);
    else if (finalGlobalScore < 50) notes.push(t.analysis.intro_poor);
    else notes.push(t.analysis.intro_mixed);

    // Impulsivity / Slowness Check
    // Impulsivity: Fast RT (< 600ms) but Low Accuracy (< 60%)
    if (globalAvgRT > 0 && globalAvgRT < 600 && globalAvgAcc < 0.60) {
      notes.push(t.analysis.impulsivity_warning);
    }
    // Slowness: Slow RT (> 2000ms) but High Accuracy (> 85%) (Obsessive/Slow)
    if (globalAvgRT > 2000 && globalAvgAcc > 0.85) {
      notes.push(t.analysis.slowness_warning);
    }

    // Domain Specific Advice (Only for Weakest if score is low)
    if (weakest.score < 60) {
      // Use the English key to find the advice key
      const adviceKey = `advice_${weakest.name}` as keyof typeof t.analysis;
      if (t.analysis[adviceKey]) {
        notes.push(t.analysis[adviceKey]);
      }
    }

    return {
      globalScore: finalGlobalScore,
      domainScores: domainScores, // Return all for the chart, even empty ones (handled in UI)
      sortedDomains: sorted,
      strongest,
      weakest,
      interpretation: notes.join(" "),
      hasSufficientData: sessions.length >= 3
    };
  }, [sessions, t]);


  // Generate Word Document
  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const isRTL = language === Language.FA || language === Language.AR;
      
      const introText = t.reportIntro.replace('{name}', userName);

      const tableHeaderStyle = {
        fill: { color: "E2E8F0" },
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      };

      const docChildren = [
        new Paragraph({
          text: `NeuroRehab Report`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: isRTL,
          children: [
            new TextRun({ 
              text: introText, 
              bold: true, 
              size: language === Language.FA ? 24 : 28 
            }),
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${t.date}: ${new Date().toLocaleDateString(language === Language.FA ? 'fa-IR' : (language === Language.AR ? 'ar-SA' : 'en-US'))}`, size: 24 }),
          ],
          spacing: { after: 400 }
        }),
        // Analysis Section in Word
        new Paragraph({
          text: t.analysis.title,
          heading: HeadingLevel.HEADING_2,
          bidirectional: isRTL,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: `${t.analysis.neuroScore}: ${cognitiveProfile?.globalScore || 0}/100`,
          bold: true,
          bidirectional: isRTL,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: cognitiveProfile?.interpretation || "",
          bidirectional: isRTL,
          spacing: { after: 400 }
        }),

        // Overall Stats
        new Paragraph({
          text: t.dashboard,
          heading: HeadingLevel.HEADING_2,
          bidirectional: isRTL,
          spacing: { after: 200 }
        }),
        new Paragraph({
            text: `${t.stats.totalSessions}: ${sessions.length} | ${t.stats.totalTime}: ${Math.round(sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)} min`,
            bullet: { level: 0 },
            bidirectional: isRTL
        }),
        new Paragraph({
            text: `Average Accuracy: ${sessions.length > 0 ? Math.round((sessions.reduce((acc, s) => acc + s.correctCount, 0) / sessions.reduce((acc, s) => acc + s.totalTrials, 0)) * 100) : 0}%`,
            bullet: { level: 0 },
            bidirectional: isRTL,
            spacing: { after: 400 }
        })
      ];

      // Add Tables for each module
      Object.entries(statsByModule).forEach(([modId, modSessions]: [string, SessionResult[]]) => {
        const modInfo = t.modInfo[modId as keyof typeof t.modInfo];
        const displayName = modInfo ? modInfo.name : modId;

        docChildren.push(
          new Paragraph({
            text: displayName,
            heading: HeadingLevel.HEADING_2,
            bidirectional: isRTL,
            spacing: { before: 400, after: 200 }
          })
        );

        const tableRows = [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [new Paragraph({ text: t.date, bold: true })], ...tableHeaderStyle }),
              new TableCell({ children: [new Paragraph({ text: t.level, bold: true })], ...tableHeaderStyle }),
              new TableCell({ children: [new Paragraph({ text: t.score, bold: true })], ...tableHeaderStyle }),
              new TableCell({ children: [new Paragraph({ text: t.errors, bold: true })], ...tableHeaderStyle }),
              new TableCell({ children: [new Paragraph({ text: "Accuracy %", bold: true })], ...tableHeaderStyle }),
            ],
          })
        ];

        modSessions.forEach(s => {
          const accuracy = s.totalTrials > 0 ? Math.round((s.correctCount / s.totalTrials) * 100) : 0;
          tableRows.push(
             new TableRow({
               children: [
                 new TableCell({ children: [new Paragraph(new Date(s.timestamp).toLocaleDateString(language === Language.FA ? 'fa-IR' : (language === Language.AR ? 'ar-SA' : 'en-US')))] }),
                 new TableCell({ children: [new Paragraph(s.level.toString())] }),
                 new TableCell({ children: [new Paragraph(s.correctCount.toString())] }),
                 new TableCell({ children: [new Paragraph(s.errorCount.toString())] }),
                 new TableCell({ children: [new Paragraph(`${accuracy}%`)] }),
               ]
             })
          );
        });

        docChildren.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      });

      const doc = new Document({
        sections: [{
          children: docChildren
        }]
      });

      const blob = await Packer.toBlob(doc);
      const saveAs = (FileSaver as any).saveAs || FileSaver;
      saveAs(blob, `NeuroRehab_Report_${userName.replace(/\s+/g, '_')}.docx`);
      
    } catch (error) {
      console.error("Error generating Word doc:", error);
      alert("Error generating report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-slate-400" />
         </div>
         <p className="text-lg text-slate-500 font-medium">{t.noData}</p>
      </div>
    );
  }

  const totalTimeMin = Math.round(sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);
  const avgLevel = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.level, 0) / sessions.length) : 0;
  const totalTrials = sessions.reduce((acc, s) => acc + s.totalTrials, 0);
  const totalCorrect = sessions.reduce((acc, s) => acc + s.correctCount, 0);
  const accuracy = totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0;

  return (
    <div className="space-y-10" dir={dir(language)}>
      
      {/* Overview Cards & Actions */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          <StatCard 
            icon={<Calendar className="text-blue-600"/>} 
            label={t.stats.totalSessions} 
            value={sessions.length.toString()} 
            color="bg-blue-50 text-blue-900"
          />
          <StatCard 
            icon={<Clock className="text-emerald-600"/>} 
            label={t.stats.totalTime} 
            value={`${totalTimeMin} min`} 
            color="bg-emerald-50 text-emerald-900"
          />
          <StatCard 
            icon={<Trophy className="text-amber-600"/>} 
            label={t.stats.avgLevel} 
            value={avgLevel.toString()} 
            color="bg-amber-50 text-amber-900"
          />
          <StatCard 
            icon={<Activity className="text-purple-600"/>} 
            label={t.stats.accuracy} 
            value={`${accuracy}%`} 
            color="bg-purple-50 text-purple-900"
          />
        </div>
        
        <div className="flex flex-col justify-center">
           <Button 
             onClick={handleExportWord} 
             disabled={isExporting}
             className="h-full min-h-[80px] w-full md:w-40 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 hover:to-slate-800 text-white shadow-xl"
           >
             {isExporting ? (
               <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             ) : (
               <>
                 <FileText size={24} />
                 <span className="text-xs font-bold uppercase tracking-wider">{t.exportWord}</span>
               </>
             )}
           </Button>
        </div>
      </div>

      {/* --- CLINICAL ANALYSIS SECTION --- */}
      {cognitiveProfile && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/40 shadow-xl bg-gradient-to-br from-white/80 to-blue-50/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30">
                 <Brain size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{t.analysis.title}</h2>
           </div>

           <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              
              {/* Left: Global Score */}
              <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-w-[200px]">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                       <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                       <circle 
                         cx="64" cy="64" r="56" fill="none" stroke="#2563eb" strokeWidth="12" 
                         strokeDasharray={351} 
                         strokeDashoffset={351 - (351 * cognitiveProfile.globalScore / 100)} 
                         className="transition-all duration-1000 ease-out"
                         strokeLinecap="round"
                       />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-3xl font-black text-slate-800">{cognitiveProfile.globalScore}</span>
                       <span className="text-xs font-bold text-slate-400">/100</span>
                    </div>
                 </div>
                 <div className="mt-4 text-center">
                    <h3 className="font-bold text-slate-700">{t.analysis.neuroScore}</h3>
                    <p className="text-xs text-slate-400 mt-1">{t.analysis.neuroScoreDesc}</p>
                 </div>
              </div>

              {/* Middle: Domain Breakdown (Show active only for clarity, or all with 0) */}
              <div className="flex-1 space-y-4">
                 {cognitiveProfile.domainScores.filter(d => d.hasData).map((domain, i) => (
                    <div key={i} className="group">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-slate-700">{domain.displayName}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${domain.score >= 80 ? 'bg-emerald-100 text-emerald-700' : domain.score >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                             {domain.score >= 80 ? t.analysis.excellent : domain.score >= 50 ? t.analysis.good : t.analysis.fair} ({domain.score}%)
                          </span>
                       </div>
                       <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                             className={`h-full rounded-full transition-all duration-1000 ${domain.score >= 80 ? 'bg-emerald-500' : domain.score >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                             style={{ width: `${domain.score}%` }}
                          ></div>
                       </div>
                    </div>
                 ))}
                 {cognitiveProfile.domainScores.filter(d => !d.hasData).length > 0 && (
                   <div className="text-xs text-slate-400 pt-2 italic border-t border-slate-200 mt-2">
                     * No data: {cognitiveProfile.domainScores.filter(d => !d.hasData).map(d => d.displayName).join(", ")}
                   </div>
                 )}
              </div>

              {/* Right: Automated Insights */}
              <div className="lg:w-1/3 bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col gap-4">
                 <h3 className="font-bold text-slate-600 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <FileText size={16}/> {t.analysis.clinicalNotes}
                 </h3>
                 
                 {!cognitiveProfile.hasSufficientData ? (
                    <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                       <AlertCircle className="shrink-0 w-5 h-5" />
                       <p className="text-sm">{t.analysis.insufficient_data}</p>
                    </div>
                 ) : (
                   <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{cognitiveProfile.interpretation}"
                   </p>
                 )}
                 
                 {cognitiveProfile.strongest && cognitiveProfile.weakest && (
                   <div className="border-t border-slate-200 pt-3 mt-auto space-y-2">
                      <div className="flex items-start gap-2">
                         <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                         <div>
                            <span className="text-xs font-bold text-slate-400 uppercase block">{t.analysis.strongestDomain}</span>
                            <span className="font-bold text-slate-700">{cognitiveProfile.strongest.displayName}</span>
                         </div>
                      </div>
                      
                      {/* Show Weakest only if it differs from strongest or score is low */}
                      {(cognitiveProfile.weakest.name !== cognitiveProfile.strongest.name || cognitiveProfile.weakest.score < 60) && (
                        <div className="flex items-start gap-2">
                           <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                           <div>
                              <span className="text-xs font-bold text-slate-400 uppercase block">{t.analysis.needsFocus}</span>
                              <span className="font-bold text-slate-700">{cognitiveProfile.weakest.displayName}</span>
                           </div>
                        </div>
                      )}
                   </div>
                 )}
              </div>

           </div>
        </div>
      )}

      {/* --- DETAILED TABLES --- */}
      <div className="space-y-8">
        {Object.entries(statsByModule).map(([modId, modSessions]: [string, SessionResult[]]) => {
          const modInfo = t.modInfo[modId as keyof typeof t.modInfo];
          const displayName = modInfo ? modInfo.name : modId;
          const category = modInfo ? t.categories[modInfo.category as any] : 'General';

          return (
            <div key={modId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 shadow-sm">
                     {modId.substring(0,2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{displayName}</h3>
                    <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2 py-0.5 rounded text-nowrap">{category}</span>
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                   {modSessions.length} {t.stats.totalSessions}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50/80 font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">{t.date}</th>
                      <th className="px-6 py-4">{t.level}</th>
                      <th className="px-6 py-4">{t.score}</th>
                      <th className="px-6 py-4">{t.errors}</th>
                      <th className="px-6 py-4">{t.stats.accuracy}</th>
                      <th className="px-6 py-4">{t.reactionTime}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {new Date(s.timestamp).toLocaleDateString(language === Language.FA ? 'fa-IR' : (language === Language.AR ? 'ar-SA' : 'en-US'))} 
                          <span className="text-slate-400 text-xs ml-2">{new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block w-8 text-center bg-slate-100 rounded text-slate-700 font-bold py-0.5">{s.level}</span>
                        </td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">{s.correctCount}</td>
                        <td className="px-6 py-4 text-rose-500 font-bold">
                           {s.errorCount > 0 ? (
                             <span className="flex items-center gap-1">
                               {s.errorCount} <AlertCircle className="w-3 h-3"/>
                             </span>
                           ) : 0}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${s.totalTrials > 0 && (s.correctCount / s.totalTrials) > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                  style={{ width: `${s.totalTrials > 0 ? (s.correctCount / s.totalTrials) * 100 : 0}%` }}
                                ></div>
                             </div>
                             <span className="text-xs text-slate-500">{s.totalTrials > 0 ? Math.round((s.correctCount / s.totalTrials) * 100) : 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                          {Math.round(s.averageReactionTimeMs)} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:shadow-md transition-shadow">
     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-sm`}>
        {React.cloneElement(icon as React.ReactElement, { size: 28 })}
     </div>
     <div>
       <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</div>
       <div className="text-2xl font-bold text-slate-800">{value}</div>
     </div>
  </div>
);