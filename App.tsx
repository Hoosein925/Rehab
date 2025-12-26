
import React, { useState } from 'react';
import { PatientStatus, AssessmentResult, PatientCategory, PediatricAgeGroup } from './types';
import Header from './components/Header';
import PainAssessment from './components/PainAssessment';
import PediatricAssessment from './components/PediatricAssessment';
import ManagementPlan from './components/ManagementPlan';
import Footer from './components/Footer';
import PressureUlcerAssessment from './components/PressureUlcerAssessment';
import FallRiskAssessment from './components/FallRiskAssessment';
import ConsciousnessAssessment from './components/ConsciousnessAssessment';
import ThromboembolismAssessment from './components/ThromboembolismAssessment';
import SuicideRiskAssessment from './components/SuicideRiskAssessment';
import BMICalculator from './components/BMICalculator';
import ICUAssessment from './components/ICUAssessment';
import ModuleHeader from './components/common/ModuleHeader';
import NIHSSAssessment from './components/NIHSSAssessment';

const App: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [category, setCategory] = useState<PatientCategory | null>(null);
  const [patientStatus, setPatientStatus] = useState<PatientStatus | null>(null);
  const [pediatricAge, setPediatricAge] = useState<PediatricAgeGroup | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);

  const reset = () => {
    setSelectedModule(null);
    setCategory(null);
    setPatientStatus(null);
    setPediatricAge(null);
    setAssessment(null);
  };
  
  const handleBackToMenu = () => {
    setSelectedModule(null);
    setAssessment(null); // Clear previous assessment
  };
  
  const handleBackFromAssessment = () => {
    setAssessment(null);
    if(category === PatientCategory.ADULT) {
        setPatientStatus(null);
    } else {
        setPediatricAge(null);
    }
  };

  const renderModule = () => {
    switch (selectedModule) {
      case 'PAIN':
        return renderPainModule();
      case 'PRESSURE_ULCER':
        return <PressureUlcerAssessment onBack={handleBackToMenu} onHome={reset} />;
      case 'FALL_RISK':
        return <FallRiskAssessment onBack={handleBackToMenu} onHome={reset} />;
      case 'LOC':
        return <ConsciousnessAssessment onBack={handleBackToMenu} onHome={reset} />;
      case 'NIHSS':
        return <NIHSSAssessment onBack={handleBackToMenu} onHome={reset} />;
      case 'THROMBO':
        return <ThromboembolismAssessment onBack={handleBackToMenu} onHome={reset} />;
      case 'SUICIDE':
        return <SuicideRiskAssessment onBack={handleBackToMenu} onHome={reset} />;
      case 'BMI':
        return <BMICalculator onBack={handleBackToMenu} onHome={reset} />;
      case 'ICU':
        return <ICUAssessment onBack={handleBackToMenu} onHome={reset} />;
      default:
        return null;
    }
  }

  const renderPainModule = () => (
    <>
      {!category ? (
        <div className="space-y-8">
            <ModuleHeader onBack={() => setSelectedModule(null)} onHome={reset} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              <MainCard 
                title="پروتکل بزرگسالان"
                subtitle="Adult Protocols"
                description="شامل ابزارهای VAS، BPS و پایش همودینامیک برای بیماران بالای ۱۸ سال."
                onClick={() => setCategory(PatientCategory.ADULT)}
                icon="🧑"
              />
              <MainCard 
                title="شیرخواران و کودکان"
                subtitle="Pediatric (1mo - 18yr)"
                description="بر اساس ابلاغیه جدید زمستان ۱۴۰۳ شامل مقیاس‌های FLACC، CHIPPS و Wong-Baker."
                onClick={() => setCategory(PatientCategory.PEDIATRIC)}
                icon="👶"
                highlight
              />
            </div>
        </div>
      ) : category === PatientCategory.ADULT && !patientStatus ? (
        <div className="space-y-12">
           <ModuleHeader onBack={() => setCategory(null)} onHome={reset} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatusCard title="بیمار هوشیار" subtitle="VAS Scale" description="گزارش مستقیم شدت درد (۰ تا ۱۰)." onClick={() => setPatientStatus(PatientStatus.CONSCIOUS)} icon="🧑‍⚕️" />
            <StatusCard title="کاهش سطح هوشیاری" subtitle="BPS Scale" description="ارزیابی رفتاری در بخش‌های ویژه." onClick={() => setPatientStatus(PatientStatus.DECREASED_CONSCIOUSNESS)} icon="🏥" />
            <StatusCard title="بیمار تحت پارالیز" subtitle="Vital Signs" description="پایش پاسخ‌های همودینامیک." onClick={() => setPatientStatus(PatientStatus.PARALYZED)} icon="⚡" />
          </div>
        </div>
      ) : category === PatientCategory.PEDIATRIC && !pediatricAge ? (
        <div className="space-y-12">
           <ModuleHeader onBack={() => setCategory(null)} onHome={reset} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard title="۱ ماه تا ۴ سال" subtitle="FLACC Scale" description="ارزیابی رفتاری (چهره، پا، گریه)." onClick={() => setPediatricAge(PediatricAgeGroup.INFANT_TODDLER)} icon="🍼" />
              <StatusCard title="۳ تا ۷ سال" subtitle="Wong-Baker" description="استفاده از مقیاس چهره‌های کارتونی." onClick={() => setPediatricAge(PediatricAgeGroup.PRE_SCHOOL)} icon="🎨" />
              <StatusCard title="بالای ۷ سال" subtitle="NRS Scale" description="ارزیابی عددی مستقیم (۰ تا ۱۰)." onClick={() => setPediatricAge(PediatricAgeGroup.SCHOOL_ADOLESCENT)} icon="🎒" />
              <StatusCard title="بعد از عمل (تا ۷ سال)" subtitle="CHIPPS Scale" description="پروتکل اختصاصی ریکاوری و بخش." onClick={() => setPediatricAge(PediatricAgeGroup.POST_OP)} icon="🩹" />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
            <ModuleHeader onBack={handleBackFromAssessment} onHome={reset} />
            <div className="premium-card p-6 flex flex-col md:flex-row items-center justify-center gap-6 border-indigo-500/20">
             <div className="bg-indigo-950 px-8 py-4 rounded-2xl border border-indigo-500/30">
              <span className="text-lg font-black text-indigo-100 uppercase">
                {category === PatientCategory.ADULT ? 'پروتکل بزرگسال' : 'پروتکل کودکان و شیرخواران'}
              </span>
            </div>
          </div>

          {category === PatientCategory.ADULT ? (
            <PainAssessment status={patientStatus!} onAssess={setAssessment} />
          ) : (
            <PediatricAssessment ageGroup={pediatricAge!} onAssess={setAssessment} />
          )}

          {assessment && <ManagementPlan assessment={assessment} category={category!} />}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-48 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {!selectedModule ? (
           <div className="space-y-16 animate-in">
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                سامانه جامع <span className="text-indigo-500">ارزیابی پرستاری</span>
              </h2>
              <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">
                ابزارهای استاندارد جهت ارتقاء کیفیت مراقبت‌های بالینی
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <ModuleCard title="مدیریت درد" icon="😣" onClick={() => setSelectedModule('PAIN')} enabled={true} />
              <ModuleCard title="زخم فشاری" icon="🩹" onClick={() => setSelectedModule('PRESSURE_ULCER')} enabled={true} />
              <ModuleCard title="ریسک سقوط" icon="🚶" onClick={() => setSelectedModule('FALL_RISK')} enabled={true} />
              <ModuleCard title="سطح هوشیاری" icon="🧠" onClick={() => setSelectedModule('LOC')} enabled={true} />
              <ModuleCard title="مقیاس سکته NIHSS" icon="🕰️" onClick={() => setSelectedModule('NIHSS')} enabled={true} />
              <ModuleCard title="ریسک ترومبوآمبولی" icon="🩸" onClick={() => setSelectedModule('THROMBO')} enabled={true} />
              <ModuleCard title="محاسبه BMI" icon="📏" onClick={() => setSelectedModule('BMI')} enabled={true} />
              <ModuleCard title="ریسک خودکشی" icon="❤️‍🩹" onClick={() => setSelectedModule('SUICIDE')} enabled={true} />
              <ModuleCard title="ابزارهای ICU" icon="❤️‍🔥" onClick={() => setSelectedModule('ICU')} enabled={true} />
            </div>
          </div>
        ) : (
          <div className="animate-in">{renderModule()}</div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const ModuleCard = ({ title, icon, onClick, enabled }: any) => (
  <button 
    onClick={enabled ? onClick : undefined}
    disabled={!enabled}
    className={`group premium-card p-6 transition-all flex flex-col items-center text-center border-white/5 ${enabled ? 'hover:bg-white/5 hover:-translate-y-2 cursor-pointer' : 'opacity-40 grayscale cursor-not-allowed'}`}
  >
    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 text-5xl transition-all ${enabled ? 'bg-white/5 group-hover:scale-110' : 'bg-white/5'}`}>{icon}</div>
    <h3 className="text-xl font-black text-white">{title}</h3>
    {!enabled && <span className="text-[10px] mt-2 bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full font-bold">به زودی</span>}
  </button>
);

const MainCard = ({ title, subtitle, description, icon, onClick, highlight }: any) => (
  <button onClick={onClick} className={`group relative premium-card p-10 transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden ${highlight ? 'border-indigo-500 shadow-indigo-500/20 shadow-2xl' : 'border-white/5'}`}>
    <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all text-6xl">{icon}</div>
    <span className="text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-[0.3em]">{subtitle}</span>
    <h3 className="text-3xl font-black text-white mb-4">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed mb-6">{description}</p>
    <div className="mt-auto text-indigo-400 font-black text-xs group-hover:gap-4 transition-all flex items-center gap-2">ورود به پروتکل <span className="text-xl">→</span></div>
  </button>
);

const StatusCard = ({ title, subtitle, description, icon, onClick }: any) => (
  <button onClick={onClick} className="group premium-card p-6 hover:bg-white/5 transition-all flex flex-col items-center text-center border-white/5">
    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-4xl group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[8px] font-black text-indigo-400 mb-1 uppercase">{subtitle}</span>
    <h3 className="text-xl font-black text-white mb-2">{title}</h3>
    <p className="text-slate-500 text-[11px] leading-tight line-clamp-2">{description}</p>
  </button>
);

export default App;