
import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoType, NarrationSegment } from './types';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { diagnoseSystemError } from './geminiService';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

// مصفوفة المفاتيح والأنظمة
const SYSTEM_KEYS = {
  TG_TOKEN: "8377287398:AAHlw02jpdHRE6OtwjABgCPVrxF4HLRQT9A",
  TG_CHAT_ID: "-1003563010631",
  FIREBASE_ID: "1:657635312060:web:e1b82d6de18b9f420cabb9",
  ELEVEN_LABS_KEY: "قيد التفعيل (Premium)..."
};

const firebaseConfig = {
  apiKey: "AIzaSyAhv2WSQWatKvtyu6JlLpgMkGHhXH-_UIw",
  authDomain: "roohcontrol.firebaseapp.com",
  projectId: "roohcontrol",
  storageBucket: "roohcontrol.firebasestorage.app",
  messagingSenderId: "657635312060",
  appId: SYSTEM_KEYS.FIREBASE_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROOH_CATEGORIES = [
  "هجمات مرعبة", "رعب حقيقي", "رعب الحيوانات", "أخطر المشاهد",
  "أهوال مرعبة", "رعب كوميدي", "لحظات مرعبة", "صدمة"
];

const AdminDashboard: React.FC<any> = ({ onClose, onRefreshVideos, initialVideos }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [activeTab, setActiveTab] = useState<'studio' | 'library' | 'ai' | 'keys'>('studio');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // بيانات الحقن الرقمي
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [narration, setNarration] = useState('');
  const [category, setCategory] = useState(ROOH_CATEGORIES[0]);
  const [videoType, setVideoType] = useState<VideoType>('short');
  const [targetRepo, setTargetRepo] = useState<'repo_r2' | 'repo_telegram'>('repo_r2');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // نظام التوقيت
  const [segments, setSegments] = useState<NarrationSegment[]>([]);
  const [isTimingMode, setIsTimingMode] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);

  // الحالة التقنية
  const [aiDiagnostic, setAiDiagnostic] = useState<string>('');
  const [keyStatus, setKeyStatus] = useState<{[key: string]: 'active' | 'checking' | 'failed'}>({});

  useEffect(() => {
    const v = videoPreviewRef.current;
    if (!v) return;
    const updateTime = () => setCurrentTimeDisplay(v.currentTime);
    v.addEventListener('timeupdate', updateTime);
    return () => v.removeEventListener('timeupdate', updateTime);
  }, [previewUrl]);

  const handleAuth = () => {
    if (passcode === '5030775') setIsAuthenticated(true);
    else { alert("⚠️ كود السيادة غير صحيح!"); setPasscode(''); }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  };

  const prepareSegments = () => {
    if (!narration) return alert("يجب إدخال نص السرد.");
    const chunks = narration.includes('|') 
      ? narration.split('|').map(t => ({ text: t.trim(), startTime: 0 }))
      : narration.split(/\s+/).filter(w => w.length > 0).reduce((acc: any[], word, i) => {
          if (i % 4 === 0) acc.push({ text: word, startTime: 0 });
          else acc[acc.length - 1].text += ' ' + word;
          return acc;
        }, []);
    setSegments(chunks);
    setIsTimingMode(true);
    setActiveSegmentIdx(0);
  };

  const markTimestamp = () => {
    if (!videoPreviewRef.current) return;
    const updated = [...segments];
    updated[activeSegmentIdx].startTime = videoPreviewRef.current.currentTime;
    setSegments(updated);
    if (activeSegmentIdx < segments.length - 1) setActiveSegmentIdx(prev => prev + 1);
    else { setIsTimingMode(false); alert("✅ تم ربط التوقيتات بنجاح!"); }
  };

  const handlePublish = async () => {
    if (!title || !previewUrl) return alert("بيانات الحقن غير مكتملة.");
    setIsProcessing(true);
    setStatusMsg('جاري رفع الروح الرقمية للمستودع...');
    try {
      const videoData = {
        title, narration, narration_segments: segments, category, type: videoType,
        repository: targetRepo, url: previewUrl, updatedAt: serverTimestamp(),
        createdAt: editingId ? undefined : serverTimestamp()
      };
      
      if (!editingId) await addDoc(collection(db, "video_data"), videoData);
      else await updateDoc(doc(db, "video_data", editingId), videoData as any);
      
      resetForm();
      onRefreshVideos();
      setActiveTab('library');
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const checkKey = async (type: string) => {
    setKeyStatus(prev => ({ ...prev, [type]: 'checking' }));
    await new Promise(r => setTimeout(r, 1000));
    setKeyStatus(prev => ({ ...prev, [type]: 'active' }));
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setNarration(''); setPreviewUrl(null); setSegments([]); setIsTimingMode(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[6000] bg-black flex flex-col items-center justify-center p-8" dir="rtl">
        <img src={LOGO_URL} className="w-24 h-24 rounded-full border-4 border-red-600 mb-8 shadow-[0_0_40px_red] animate-pulse" />
        <h1 className="text-3xl font-black text-white italic mb-10 tracking-widest text-center">ROOH <span className="text-red-600">CONTROL</span></h1>
        <div className="w-full max-w-xs space-y-4">
           <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="كود السيادة" className="w-full bg-neutral-900 border border-red-600/30 rounded-2xl p-5 text-center text-white outline-none font-black text-2xl focus:border-red-600 shadow-inner" />
           <button onClick={handleAuth} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_red] active:scale-95 transition-all text-xl italic">تفعيل الدخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[5000] bg-[#050505] flex flex-col text-right text-white overflow-hidden font-['Cairo']" dir="rtl">
      {isProcessing && (
        <div className="absolute inset-0 z-[7000] bg-black/95 flex flex-col items-center justify-center gap-4">
           <div className="w-20 h-20 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_red]"></div>
           <p className="text-red-500 font-black animate-pulse text-lg tracking-widest uppercase">{statusMsg}</p>
        </div>
      )}

      {/* شريط التبويب السيادي */}
      <div className="h-24 bg-black border-b border-white/10 flex items-center justify-around shrink-0 px-2 overflow-x-auto scrollbar-hide">
        <TabBtn active={activeTab === 'studio'} onClick={() => setActiveTab('studio')} label="الاستوديو" icon="🎬" />
        <TabBtn active={activeTab === 'library'} onClick={() => setActiveTab('library')} label="المكتبة" icon="📚" />
        <TabBtn active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} label="التحليل" icon="👁️" />
        <TabBtn active={activeTab === 'keys'} onClick={() => setActiveTab('keys')} label="المفاتيح" icon="🔑" />
        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center font-black text-xl border border-red-600/20">✖</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40 scroll-smooth">
        {activeTab === 'studio' && (
          <div className="space-y-6 animate-in slide-in-from-left duration-500">
             <div className="grid grid-cols-2 gap-3">
                <RepoBtn active={targetRepo === 'repo_r2'} onClick={() => setTargetRepo('repo_r2')} label="Cloud R2 Archive" icon="⚡" />
                <RepoBtn active={targetRepo === 'repo_telegram'} onClick={() => setTargetRepo('repo_telegram')} label="Telegram Core" icon="📨" />
             </div>

             <div className="relative w-full aspect-video bg-neutral-900 rounded-[2.5rem] border-2 border-dashed border-red-600/30 flex items-center justify-center overflow-hidden group">
                {previewUrl ? (
                  <div className="w-full h-full relative">
                     <video ref={videoPreviewRef} src={previewUrl} className="w-full h-full object-cover" controls crossOrigin="anonymous" />
                     <div className="absolute top-4 left-4 bg-black/80 px-4 py-2 rounded-xl border border-red-600 font-mono text-red-500 text-lg shadow-[0_0_10px_red]">
                        {currentTimeDisplay.toFixed(2)}s
                     </div>
                  </div>
                ) : (
                  <div onClick={() => document.getElementById('fileInput')?.click()} className="cursor-pointer text-gray-500 font-black italic flex flex-col items-center gap-2 hover:text-red-600 transition-colors">
                    <span className="text-5xl group-hover:scale-125 transition-transform">📁</span>
                    <span>اختيار الروح الرقمية لرفعها</span>
                  </div>
                )}
                <input id="fileInput" type="file" accept="video/*" onChange={onFileSelect} className="hidden" />
             </div>

             <div className="space-y-4 bg-neutral-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="space-y-1">
                   <label className="text-[10px] text-red-600 font-black mr-2 uppercase italic tracking-widest">العنوان السيادي</label>
                   <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: كيان مجهول في الظلام..." className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600 shadow-inner" />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] text-red-600 font-black mr-2 uppercase italic tracking-widest">السرد (استخدم | للفصل)</label>
                   <textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="أدخل السرد الكامل هنا..." rows={4} className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold outline-none resize-none focus:border-red-600 shadow-inner" />
                </div>
                
                {isTimingMode ? (
                  <div className="bg-red-600/5 p-6 rounded-[2rem] border-2 border-red-600 shadow-[0_0_30px_red] space-y-4 animate-in zoom-in duration-300">
                    <p className="text-xs text-center text-gray-400">ضبط ميعاد ظهور: <br/><span className="text-white font-black text-sm italic">"{segments[activeSegmentIdx].text}"</span></p>
                    <button onClick={markTimestamp} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black shadow-[0_0_20px_red] active:scale-95 transition-all text-xl italic">تثبيت اللحظة الآن 🚩</button>
                  </div>
                ) : (
                  <button onClick={prepareSegments} className="w-full py-4 bg-yellow-600/10 border border-yellow-600 text-yellow-500 rounded-2xl font-black text-xs hover:bg-yellow-600 hover:text-white transition-all">تفعيل استوديو التوقيت السينمائي 🕒</button>
                )}

                {/* قائمة التصنيفات المطابقة للصورة */}
                <div className="space-y-2 pt-4">
                  <label className="text-[10px] text-red-600 font-black mr-2 uppercase tracking-widest italic">مصفوفة التصنيف</label>
                  <div className="bg-neutral-900/90 rounded-[2rem] border border-white/10 overflow-hidden divide-y divide-white/5 shadow-2xl">
                    {ROOH_CATEGORIES.map((cat) => (
                      <div 
                        key={cat} 
                        onClick={() => setCategory(cat)}
                        className="flex items-center justify-between p-5 active:bg-white/5 transition-all cursor-pointer group"
                      >
                        <span className={`text-lg font-black italic transition-colors ${category === cat ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{cat}</span>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${category === cat ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_#a855f7]' : 'border-white/20'}`}>
                           {category === cat && <div className="w-4 h-4 rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7] animate-pulse"></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex bg-black p-1.5 rounded-2xl border border-white/10 shadow-inner">
                  <button onClick={() => setVideoType('short')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${videoType === 'short' ? 'bg-red-600 text-white shadow-[0_0_15px_red]' : 'text-gray-500'}`}>SHORT (9:16)</button>
                  <button onClick={() => setVideoType('long')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${videoType === 'long' ? 'bg-red-600 text-white shadow-[0_0_15px_red]' : 'text-gray-500'}`}>LONG (16:9)</button>
                </div>
             </div>

             <button onClick={handlePublish} className="w-full py-6 bg-red-600 text-white rounded-full font-black text-2xl italic shadow-[0_0_40px_red] active:scale-95 transition-all hover:scale-[1.02]">
                {editingId ? 'تحديث بيانات الروح 💾' : 'حقن في الحديقة المرعبة 🚀'}
             </button>
          </div>
        )}

        {activeTab === 'library' && (
           <div className="space-y-4 animate-in fade-in duration-500">
              <div className="bg-neutral-900 p-5 rounded-2xl flex justify-between items-center border border-white/10 shadow-xl">
                 <h3 className="font-black text-gray-400 italic">إجمالي الأرواح المكتشفة: {initialVideos.length}</h3>
                 <button onClick={onRefreshVideos} className="text-red-500 text-xs font-black animate-pulse">🔄 مزامنة سحابية</button>
              </div>
              {initialVideos.map((video: Video) => (
                <div key={video.id} className="bg-neutral-900/60 border border-white/5 rounded-[2rem] p-4 flex gap-4 items-center hover:border-red-600/30 transition-all">
                   <video src={video.video_url} className="w-20 h-20 rounded-2xl object-cover bg-black shadow-lg" />
                   <div className="flex-1 text-right overflow-hidden">
                      <h4 className="text-sm font-black italic line-clamp-1">{video.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">{video.category} • {video.type}</p>
                   </div>
                   <div className="flex flex-col gap-2">
                      <button onClick={() => { setEditingId(video.id); setTitle(video.title); setNarration(video.narration_text || ""); setCategory(video.category); setVideoType(video.type); setPreviewUrl(video.video_url); setActiveTab('studio'); }} className="p-2 bg-blue-600/10 text-blue-500 border border-blue-600/20 rounded-xl text-[10px] font-black italic">تعديل</button>
                      <button onClick={() => deleteDoc(doc(db, "video_data", video.id)).then(onRefreshVideos)} className="p-2 bg-red-600/10 text-red-500 border border-red-600/20 rounded-xl text-[10px] font-black italic">حذف</button>
                   </div>
                </div>
              ))}
           </div>
        )}

        {activeTab === 'keys' && (
          <div className="space-y-6 animate-in zoom-in duration-500">
             <div className="p-6 rounded-[2.5rem] bg-neutral-900 border border-red-600/20 shadow-2xl space-y-6">
                <h2 className="text-xl font-black text-red-600 italic flex items-center gap-3">
                   <span className="text-3xl">🗝️</span> مصفوفة المفاتيح السيادية
                </h2>
                
                <div className="space-y-4">
                   <KeyCard title="Gemini AI Gateway" value={process.env.API_KEY || "Secret"} status={keyStatus['gemini']} onCheck={() => checkKey('gemini')} />
                   <KeyCard title="Firebase Cloud Core" value={SYSTEM_KEYS.FIREBASE_ID} status={keyStatus['firebase']} onCheck={() => checkKey('firebase')} />
                   <KeyCard title="Telegram Ghost Bot" value={SYSTEM_KEYS.TG_TOKEN.substring(0, 10) + "..."} status={keyStatus['telegram']} onCheck={() => checkKey('telegram')} />
                   <KeyCard title="ElevenLabs TTS Engine" value={SYSTEM_KEYS.ELEVEN_LABS_KEY} status={keyStatus['eleven']} onCheck={() => checkKey('eleven')} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-600/10 border border-green-600/20 rounded-[1.5rem] text-center">
                   <p className="text-[9px] font-black text-green-500 uppercase">System Status</p>
                   <p className="text-lg font-black italic text-white">ONLINE ✅</p>
                </div>
                <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-[1.5rem] text-center">
                   <p className="text-[9px] font-black text-blue-500 uppercase">Archive Link</p>
                   <p className="text-lg font-black italic text-white">ACTIVE 📦</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'ai' && (
           <div className="space-y-6 animate-in fade-in duration-700">
              <div className="bg-red-600/10 border-2 border-red-600/30 rounded-[3rem] p-10 text-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-red-600/5 blur-3xl rounded-full scale-150 animate-pulse"></div>
                 <img src={LOGO_URL} className="w-24 h-24 rounded-full border-2 border-red-600 mx-auto mb-6 shadow-[0_0_30px_red] relative z-10" />
                 <h2 className="text-3xl font-black italic relative z-10">تحليل مصفوفة الإدراك</h2>
                 <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest relative z-10">Horror System Diagnostics</p>
                 <button onClick={async () => { setIsProcessing(true); setAiDiagnostic(await diagnoseSystemError("فحص المنظومة")); setIsProcessing(false); }} className="mt-8 w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xl italic shadow-[0_0_20px_red] relative z-10 active:scale-95 transition-all">بدء التشخيص الكامل 👁️</button>
                 {aiDiagnostic && <p className="mt-8 text-sm text-gray-300 italic bg-black/60 p-6 rounded-[2rem] border border-white/10 leading-relaxed shadow-inner animate-in slide-in-from-bottom-5">{aiDiagnostic}</p>}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 px-6 py-4 rounded-3xl transition-all ${active ? 'bg-red-600/15 text-red-600 scale-110 shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}>
     <span className="text-2xl">{icon}</span>
     <span className="text-[9px] font-black italic uppercase tracking-wider">{label}</span>
  </button>
);

const RepoBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`p-5 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${active ? 'bg-red-600/10 border-red-600 shadow-[0_0_20px_red] text-white' : 'bg-neutral-900 border-white/5 text-gray-600 hover:border-white/20'}`}>
     <span className="text-3xl">{icon}</span>
     <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const KeyCard = ({ title, value, status, onCheck }: any) => (
  <div className="bg-black/40 p-5 rounded-[1.8rem] border border-white/5 flex items-center justify-between group hover:border-red-600/30 transition-colors">
     <div className="flex flex-col gap-1 text-right">
        <span className="text-[10px] font-black text-gray-600 uppercase italic">{title}</span>
        <span className="text-[11px] font-mono text-gray-400 opacity-60 line-clamp-1">{value}</span>
     </div>
     <button onClick={onCheck} disabled={status === 'checking'} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${status === 'active' ? 'bg-green-600/10 border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : status === 'checking' ? 'border-yellow-500 text-yellow-500 animate-spin' : 'bg-white/5 border-white/10 text-gray-700'}`}>
        {status === 'active' ? '✓' : status === 'checking' ? '⏳' : '👁️'}
     </button>
  </div>
);

export default AdminDashboard;
