
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Video, UserInteractions, AppView } from './types.ts';

export const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

export const getDeterministicStats = (url: string) => {
  let hash = 0;
  if (!url) return { views: 0, likes: 0 };
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);
  return {
    views: (absHash % 900000) + 100000,
    likes: (absHash % 45000) + 5000
  };
};

export const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const NEON_COLORS = [
  'shadow-[0_0_15px_rgba(220,38,38,0.5)] border-red-500',
  'shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400',
  'shadow-[0_0_15_rgba(234,179,8,0.5)] border-yellow-500',
  'shadow-[0_0_15px_rgba(168,85,247,0.5)] border-purple-500',
  'shadow-[0_0_15px_rgba(34,197,94,0.5)] border-green-500',
  'shadow-[0_0_15px_rgba(37,99,235,0.5)] border-blue-500',
];

const getNeonColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); }
  return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
};

const VideoCardThumbnail: React.FC<{ 
  video: Video, 
  isOverlayActive: boolean, 
  interactions: UserInteractions,
  onLike?: (id: string) => void,
  isShort?: boolean
}> = ({ video, isOverlayActive, interactions, onLike, isShort }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stats = getDeterministicStats(video.video_url);
  const isTrending = video.isFeatured || stats.views > 500000;
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const safePause = async () => {
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {
          // Play failed, safe to ignore
        }
      }
      v.pause();
    };

    const safePlay = () => {
      playPromiseRef.current = v.play();
      playPromiseRef.current.catch(() => {
        // Auto-play was prevented or interrupted
      });
    };

    if (isOverlayActive) { 
      safePause(); 
      return; 
    }
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        safePlay();
      } else {
        safePause();
      }
    }, { threshold: 0.1 });
    
    observer.observe(v);
    return () => { 
      observer.disconnect(); 
      safePause();
    };
  }, [video.video_url, isOverlayActive]);

  return (
    <div className={`w-full h-full relative bg-neutral-950 overflow-hidden group rounded-[2rem] border-2 transition-all duration-500 ${getNeonColor(video.id)} hover:scale-[1.02] shadow-2xl`}>
      <video 
        ref={videoRef} 
        src={video.video_url} 
        muted loop playsInline autoPlay preload="auto" crossOrigin="anonymous"
        className="w-full h-full object-cover transition-all duration-700 pointer-events-none" 
      />
      
      {isTrending && (
        <div className="absolute top-3 left-3 z-30 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_red] animate-pulse italic">
          رائج 🔥
        </div>
      )}

      <div className="absolute top-3 right-3 z-30 flex flex-col gap-2">
        <div className={`p-1.5 rounded-lg backdrop-blur-md border ${interactions.likedIds.includes(video.id) ? 'bg-red-600/40 border-red-500 text-red-500' : 'bg-black/40 border-white/20 text-gray-400'}`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 z-20 text-right">
        <p className="text-white text-[11px] font-black line-clamp-1 italic mb-1">{video.title}</p>
        <div className="flex items-center justify-between flex-row-reverse">
          <span className="text-[7px] font-black text-red-500 uppercase tracking-widest">{video.category}</span>
          <span className="text-[7px] font-bold text-gray-400">{formatBigNumber(stats.views)} 👀</span>
        </div>
      </div>
    </div>
  );
};

export const InteractiveMarquee: React.FC<{ 
  videos: Video[], 
  onPlay: (v: Video) => void, 
  interactions: UserInteractions 
}> = ({ videos, onPlay, interactions }) => {
  return (
    <div className="flex overflow-x-auto gap-4 px-2 pb-4 scrollbar-hide" dir="ltr">
      {videos.map((v) => (
        <div key={v.id} onClick={() => onPlay(v)} className="w-48 aspect-video shrink-0 cursor-pointer">
          <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={false} />
        </div>
      ))}
    </div>
  );
};

const MainContent: React.FC<any> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onCategoryClick, onHardRefresh, loading, isOverlayActive, onLike
}) => {
  const safeVideos = useMemo(() => (videos || []).filter((v: any) => v && v.video_url), [videos]);
  const shortsOnly = useMemo(() => safeVideos.filter((v: any) => v.type === 'short'), [safeVideos]);
  const longsOnly = useMemo(() => safeVideos.filter((v: any) => v.type === 'long'), [safeVideos]);

  return (
    <div className="flex flex-col pb-8 w-full bg-black min-h-screen relative" dir="rtl">
      <header className="flex flex-col items-center py-6 bg-black border-b border-white/5 shadow-2xl sticky top-0 z-[110] backdrop-blur-3xl">
        <button 
          onClick={onHardRefresh} 
          className="group relative mb-2 active:scale-90 transition-transform"
          title="تحديث الحديقة"
        >
          <div className={`absolute inset-0 bg-red-600/30 rounded-full blur-xl group-hover:bg-red-600/60 transition-all ${loading ? 'animate-ping' : ''}`}></div>
          <img src={LOGO_URL} className={`w-16 h-16 rounded-full border-2 relative z-10 transition-all ${loading ? 'border-yellow-500 rotate-180 scale-110' : 'border-red-600 shadow-[0_0_20px_red]'}`} />
        </button>
        <h1 className="text-2xl font-black italic text-red-600 tracking-widest drop-shadow-[0_0_10px_red]">الحديقة المرعبة</h1>
        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.4em] mt-1 opacity-60">Horror Matrix System v4.5</p>
      </header>

      <nav className="h-16 bg-black/95 backdrop-blur-2xl z-[100] border-b border-white/5 sticky top-[148px] overflow-x-auto scrollbar-hide flex items-center px-6 gap-3">
        {categoriesList?.map((cat: string) => (
          <button key={cat} onClick={() => onCategoryClick(cat)} className="neon-white-led shrink-0 px-5 py-2 rounded-full text-[10px] font-black text-white italic whitespace-nowrap">{cat}</button>
        ))}
      </nav>

      <div className="py-6 space-y-12">
        <section>
          <SectionHeader title="ومضات مرعبة (Shorts)" color="bg-red-600" />
          <div className="flex overflow-x-auto gap-4 px-6 scrollbar-hide" dir="ltr">
            {shortsOnly.map((v: any) => (
              <div key={v.id} onClick={() => onPlayShort(v, shortsOnly)} className="w-40 h-72 shrink-0">
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} isShort={true} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="أفلام القبو الطويلة" color="bg-cyan-600" />
          <div className="flex overflow-x-auto gap-4 px-6 scrollbar-hide" dir="ltr">
            {longsOnly.map((v: any) => (
              <div key={v.id} onClick={() => onPlayLong(v)} className="w-64 h-40 shrink-0">
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} />
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 space-y-5">
          <SectionHeader title="مختار من الأرشيف" color="bg-yellow-500" />
          <div className="grid grid-cols-2 gap-4">
            {safeVideos.slice(0, 10).map((v) => (
              <div key={v.id} onClick={() => v.type === 'short' ? onPlayShort(v, safeVideos) : onPlayLong(v)} className={`${v.type === 'short' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                <VideoCardThumbnail video={v} interactions={interactions} isOverlayActive={isOverlayActive} onLike={onLike} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string, color: string }> = ({ title, color }) => (
  <div className="px-6 py-4 flex items-center gap-3">
    <div className={`w-1.5 h-6 ${color} rounded-full shadow-[0_0_10px_currentColor]`}></div>
    <h2 className="text-sm font-black text-white italic tracking-widest">{title}</h2>
  </div>
);

export default MainContent;
