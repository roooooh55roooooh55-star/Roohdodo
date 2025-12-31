
import React, { useMemo } from 'react';
import { Video } from './types';
import { getDeterministicStats, formatBigNumber } from './MainContent';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

interface TrendPageProps {
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video) => void;
  excludedIds: string[];
  allVideos: Video[];
}

const TrendPage: React.FC<TrendPageProps> = ({ onPlayShort, onPlayLong, excludedIds, allVideos }) => {
  const trendVideos = useMemo(() => {
    const filtered = allVideos.filter(v => !excludedIds.includes(v.id));
    
    // ترتيب الفيديوهات بناءً على "المميزة" ثم عدد "المشاهدات الوهمية"
    return [...filtered].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      
      const statsA = getDeterministicStats(a.video_url);
      const statsB = getDeterministicStats(b.video_url);
      return statsB.views - statsA.views;
    }).slice(0, 20); // عرض أفضل 20 فيديو رائج
  }, [allVideos, excludedIds]);

  if (trendVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 opacity-30 gap-6 px-10 text-center">
         <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.55,11.2C17.32,10.93 15.33,8.19 15.33,8.19C15.33,8.19 15.1,10.03 14.19,10.82C13.21,11.66 12,12.24 12,13.91C12,15.12 12.6,16.22 13.56,16.89C13.88,17.11 14.24,17.29 14.63,17.41C15.4,17.63 16.23,17.61 17,17.33C17.65,17.1 18.23,16.69 18.66,16.15C19.26,15.38 19.5,14.41 19.34,13.44C19.16,12.56 18.63,11.83 18.05,11.33C17.9,11.23 17.73,11.25 17.55,11.2M13,3C13,3 12,5 10,7C8.5,8.5 7,10 7,13C7,15.76 9.24,18 12,18C12,18 11.5,17.5 11,16.5C10.5,15.5 10,14.5 10,13.5C10,12.5 10.5,11.5 11.5,10.5C12.5,9.5 14,8 14,8C14,8 15,10 16,12C16.5,13 17,14 17,15C17,15.5 16.9,16 16.75,16.5C17.5,16 18,15.5 18,15C18,13 17,11.5 15,10C13.5,8.88 13,3 13,3Z"/></svg>
         <p className="font-black italic">لا توجد فيديوهات رائجة حالياً.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b-2 border-red-600/30 pb-4 px-2">
        <div className="relative">
          <div className="absolute inset-0 bg-red-600 rounded-full blur-md opacity-50 animate-pulse"></div>
          <img src={LOGO_URL} className="w-14 h-14 rounded-full border-2 border-red-600 relative z-10" />
        </div>
        <div className="flex flex-col text-right">
           <h1 className="text-2xl font-black text-red-600 italic uppercase">قائمة الرعب الرائجة</h1>
           <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">الأكثر رعباً ومشاهدة في الحديقة</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 px-2">
        {trendVideos.map((video, idx) => (
          <div 
            key={video.id}
            onClick={() => video.type === 'short' ? onPlayShort(video, trendVideos.filter(v=>v.type==='short')) : onPlayLong(video)}
            className="group relative bg-neutral-900/60 rounded-[2.5rem] border-2 border-red-600/20 hover:border-red-600 shadow-xl transition-all duration-500 overflow-hidden cursor-pointer"
          >
            <div className="aspect-video relative overflow-hidden">
              <video src={video.video_url} muted autoPlay loop playsInline crossOrigin="anonymous" className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-[4s]" />
              <div className="absolute top-4 right-4 z-20">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg italic shadow-2xl border-2 bg-red-600 border-red-400 text-white">
                  {idx + 1}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none opacity-80" />
            </div>
            <div className="p-6 flex flex-col gap-3">
              <h3 className="font-black text-lg text-white italic line-clamp-2 text-right">{video.title}</h3>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                 <div className="flex items-center gap-2">
                   <span className="text-red-500 text-[9px] font-black italic bg-red-600/10 px-3 py-1 rounded-lg border border-red-600/20">{video.category}</span>
                 </div>
                 <span className="text-gray-500 text-[10px] font-bold">{formatBigNumber(getDeterministicStats(video.video_url).views)} مشاهدة</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendPage;
