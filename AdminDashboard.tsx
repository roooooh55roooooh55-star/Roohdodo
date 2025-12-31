
import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoType, NarrationSegment } from './types';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { diagnoseSystemError } from './geminiService';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

const SYSTEM_KEYS = {
  TG_TOKEN: "8377287398:AAHlw02jpdHRE6OtwjABgCPVrxF4HLRQT9A",
  FIREBASE_APP_ID: "1:657635312060:web:e1b82d6de18b9f420cabb9",
  FIREBASE_API_KEY: "AIzaSyAhv2WSQWatKvtyu6JlLpgMkGHhXH-_UIw",
};

const firebaseConfig = {
  apiKey: SYSTEM_KEYS.FIREBASE_API_KEY,
  authDomain: "roohcontrol.firebaseapp.com",
  projectId: "roohcontrol",
  storageBucket: "roohcontrol.firebasestorage.app",
  messagingSenderId: "657635312060",
  appId: SYSTEM_KEYS.FIREBASE_APP_ID
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [narration, setNarration] = useState('');
  const [fileName, setFileName] = useState(''); // حقل اسم الملف لـ R2
  const [category, setCategory] = useState(ROOH_CATEGORIES[0]);
  const [videoType, setVideoType] = useState<VideoType>('short');
  const [targetRepo, setTargetRepo] = useState<'repo_r2' | 'repo_telegram'>('repo_r2');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [segments, setSegments] = useState<NarrationSegment[]>([]);
  const [isTimingMode, setIsTimingMode] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const handleAuth = () => {
    if (passcode === '5030775') setIsAuthenticated(true);
    else { alert("⚠️ كود السيادة غير صحيح!"); setPasscode(''); }
  };

  const handlePublish = async () => {
    if (!title || (!previewUrl && !fileName)) return alert("بيانات الحقن غير مكتملة.");
    setIsProcessing(true);
    setStatusMsg('جاري مزامنة الروح مع المستودعات السيادية...');
    try {
      const videoData = {
        title, narration, narration_segments: segments, category, type: videoType,
        repository: targetRepo, 
        fileName: fileName || "", 
        url: previewUrl || fileName || "", // الرابط أو اسم الملف
        updatedAt: serverTimestamp(),
        createdAt: editingId ? undefined : serverTimestamp()
      };
      
      if (!editingId) await addDoc(collection(db, "video_data"), videoData);
      else await updateDoc(doc(db, "video_data", editingId), videoData as any);
      
      resetForm();
      onRefreshVideos();
      setActiveTab('library');
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setNarration(''); setPreviewUrl(null); setSegments([]); setFileName('');
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[6000] bg-black flex flex-col items-center justify-center p-8" dir="rtl">
        <img src={LOGO_URL} className="w-24 h-24 rounded-full border-4 border-red-600 mb-8 shadow-[0_0_40px_red]" />
        <h1 className="text-3xl font-black text-white italic mb-10 tracking-widest text-center">ROOH <span className="text-red-600">SYSTEM</span></h1>
        <div className="w-full max-w-xs space-y-4">
           <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="كود السيادة" className="w-full bg-neutral-900 border border-red-600/30 rounded-2xl p-5 text-center text-white outline-none font-black text-2xl" />
           <button onClick={handleAuth} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_red]">دخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[5000] bg-[#050505] flex flex-col text-right text-white overflow-hidden font-['Cairo']" dir="rtl">
      <div className="h-24 bg-black border-b border-white/10 flex items-center justify-around shrink-0 px-2 overflow-x-auto scrollbar-hide">
        <TabBtn active={activeTab === 'studio'} onClick={() => setActiveTab('studio')} label="الاستوديو" icon="🎬" />
        <TabBtn active={activeTab === 'library'} onClick={() => setActiveTab('library')} label="المكتبة" icon="📚" />
        <TabBtn active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} label="التحليل" icon="👁️" />
        <TabBtn active={activeTab === 'keys'} onClick={() => setActiveTab('keys')} label="المفاتيح" icon="🔑" />
        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center font-black">✖</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40">
        {activeTab === 'studio' && (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-3">
                <RepoBtn active={targetRepo === 'repo_r2'} onClick={() => setTargetRepo('repo_r2')} label="Cloud R2 Archive" icon="⚡" />
                <RepoBtn active={targetRepo === 'repo_telegram'} onClick={() => setTargetRepo('repo_telegram')} label="Telegram Core" icon="📨" />
             </div>

             <div className="space-y-4 bg-neutral-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                <div className="space-y-1">
                   <label className="text-[10px] text-red-600 font-black mr-2 italic tracking-widest">اسم الملف في R2 (مثال: video1.mp4)</label>
                   <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="video.mp4" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-600" />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] text-red-600 font-black mr-2 italic tracking-widest">العنوان السيادي</label>
                   <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الفيديو..." className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] text-red-600 font-black mr-2 italic tracking-widest">السرد (اختياري)</label>
                   <textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="جملة 1 | جملة 2..." rows={3} className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold outline-none" />
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-[10px] text-red-600 font-black mr-2 italic">مصفوفة التصنيف</label>
                  <div className="bg-neutral-900/90 rounded-[2rem] border border-white/10 overflow-hidden divide-y divide-white/5">
                    {ROOH_CATEGORIES.map((cat) => (
                      <div key={cat} onClick={() => setCategory(cat)} className="flex items-center justify-between p-4 cursor-pointer">
                        <span className={`text-lg font-black italic ${category === cat ? 'text-white' : 'text-gray-500'}`}>{cat}</span>
                        <div className={`w-6 h-6 rounded-full border-2 ${category === cat ? 'border-purple-500 bg-purple-500/10' : 'border-white/20'}`}>
                           {category === cat && <div className="w-full h-full flex items-center justify-center text-[10px]">●</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex bg-black p-1.5 rounded-2xl border border-white/10">
                  <button onClick={() => setVideoType('short')} className={`flex-1 py-3 rounded-xl font-black text-xs ${videoType === 'short' ? 'bg-red-600' : 'text-gray-500'}`}>SHORT (9:16)</button>
                  <button onClick={() => setVideoType('long')} className={`flex-1 py-3 rounded-xl font-black text-xs ${videoType === 'long' ? 'bg-red-600' : 'text-gray-500'}`}>LONG (16:9)</button>
                </div>
             </div>

             <button onClick={handlePublish} className="w-full py-6 bg-red-600 text-white rounded-full font-black text-2xl italic shadow-[0_0_30px_red]">
                {editingId ? 'تحديث البيانات' : 'حقن في الحديقة'}
             </button>
          </div>
        )}

        {activeTab === 'library' && (
           <div className="space-y-4">
              <div className="bg-neutral-900 p-5 rounded-2xl flex justify-between items-center border border-white/10">
                 <h3 className="font-black text-gray-400 italic">إجمالي الأرواح المكتشفة: {initialVideos.length}</h3>
              </div>
              {initialVideos.map((video: Video) => (
                <div key={video.id} className="bg-neutral-900/60 border border-white/5 rounded-[2rem] p-4 flex gap-4 items-center">
                   <video key={video.video_url} className="w-20 h-20 rounded-2xl object-cover bg-black shadow-lg">
                      <source src={video.video_url} type="video/mp4" />
                   </video>
                   <div className="flex-1 text-right overflow-hidden">
                      <h4 className="text-sm font-black italic line-clamp-1">{video.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">{video.category}</p>
                   </div>
                   <button onClick={() => deleteDoc(doc(db, "video_data", video.id)).then(onRefreshVideos)} className="p-2 text-red-500">🗑️</button>
                </div>
              ))}
           </div>
        )}

        {activeTab === 'keys' && (
          <div className="space-y-6">
             <div className="p-6 rounded-[2.5rem] bg-neutral-900 border border-red-600/20 shadow-2xl space-y-6">
                <h2 className="text-xl font-black text-red-600 italic">🗝️ المفاتيح النشطة</h2>
                <div className="space-y-4">
                   <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-gray-600 uppercase">R2 Root Access</p>
                      <p className="text-xs text-white truncate">pub-82d22c4b0b8b4b1e8a32d6366b7546c8.r2.dev</p>
                   </div>
                   <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-gray-600 uppercase">Firebase Core</p>
                      <p className="text-xs text-white truncate">roohcontrol-default-rtdb</p>
                   </div>
                </div>
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

export default AdminDashboard;
