
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Video, UserInteractions } from './types';
import { getDeterministicStats, formatBigNumber, LOGO_URL } from './MainContent';

interface ShortsPlayerOverlayProps {
  initialVideo: Video;
  videoList: Video[];
  interactions: UserInteractions;
  onClose: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onCategoryClick: (cat: string) => void;
  onSave: (id: string) => void;
  onProgress: (id: string, progress: number) => void;
  onDownload: (video: Video) => void;
  isGlobalDownloading: boolean;
}

const ShortsPlayerOverlay: React.FC<ShortsPlayerOverlayProps> = ({ 
  initialVideo, videoList, interactions, onClose, onLike, onDislike, onCategoryClick, onSave, onProgress, onDownload, isGlobalDownloading
}) => {
  const randomizedList = useMemo(() => {
    const others = videoList.filter(v => v.id !== initialVideo.id);
    return [initialVideo, ...others.sort(() => Math.random() - 0.5)];
  }, [initialVideo.id, videoList]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [currentTime, setCurrentTime] = useState(0);

  const handleNext = useCallback(() => {
    if (currentIndex < randomizedList.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      containerRef.current?.scrollTo({ top: nextIdx * containerRef.current.clientHeight, behavior: 'smooth' });
    }
  }, [currentIndex, randomizedList.length]);

  useEffect(() => {
    const activeKey = `main-${currentIndex}`;
    const activeVid = videoRefs.current[activeKey];
    if (activeVid) {
      activeVid.currentTime = 0;
      activeVid.play().catch(() => { activeVid.muted = true; activeVid.play(); });
    }
    Object.keys(videoRefs.current).forEach(k => {
        if (k !== activeKey) videoRefs.current[k]?.pause();
    });
  }, [currentIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    if (height === 0) return;
    const index = Math.round(e.currentTarget.scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < randomizedList.length) {
      setCurrentIndex(index);
    }
  };

  const getActiveText = (video: Video) => {
    if (video.audio_target === 'none') return null;
    if (video.audio_target === 'title') return video.title;
    
    // استخدام نظام التوقيت السينمائي (4 كلمات لكل ظهور)
    if (video.narration_segments && video.narration_segments.length > 0) {
      const activeSegment = [...video.narration_segments]
        .reverse()
        .find(s => currentTime >= s.startTime);
      return activeSegment ? activeSegment.text : null;
    }
    
    return video.narration_text;
  };

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col overflow-hidden">
      <div className="absolute top-12 right-6 z-[600]">
        <button onClick={onClose} className="p-4 rounded-2xl bg-black/50 backdrop-blur-xl text-red-600 border-2 border-red-600 shadow-[0_0_20px_#dc2626] active:scale-75 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full">
        {randomizedList.map((video, idx) => {
          const stats = getDeterministicStats(video.video_url);
          const isActive = idx === currentIndex;
          const activeText = isActive ? getActiveText(video) : null;

          return (
            <div key={`${video.id}-${idx}`} className="h-full w-full snap-start relative bg-black overflow-hidden flex flex-col items-center justify-center">
              <video 
                  key={video.video_url}
                  ref={el => { videoRefs.current[`main-${idx}`] = el; }}
                  crossOrigin="anonymous"
                  className="h-full w-full object-cover transition-opacity duration-700"
                  playsInline preload="auto" loop={false} 
                  onTimeUpdate={(e) => isActive && setCurrentTime(e.currentTarget.currentTime)}
                  onEnded={handleNext} 
                  onClick={(e) => e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause()}
              >
                  <source src={video.video_url} type="video/mp4" />
                  المتصفح لا يدعم التشغيل
              </video>
              
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

              {/* السرد السينمائي - سطر واحد في منتصف الشاشة */}
              {isActive && activeText && (
                <div className="absolute bottom-40 left-0 right-0 z-[100] px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="inline-block px-8 py-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
                    <p className="text-sm md:text-base font-black italic whitespace-nowrap overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-red-600 animate-pulse drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                      {activeText}
                    </p>
                  </div>
                </div>
              )}

              {/* أيقونات التفاعل الجانبية */}
              <div className="absolute bottom-24 left-4 flex flex-col items-center gap-6 z-40">
                <InteractionBtn icon="❤️" label={formatBigNumber(stats.likes)} active={interactions.likedIds.includes(video.id)} onClick={() => onLike(video.id)} color="red" />
                <InteractionBtn icon="⭐" label="حفظ" active={interactions.savedIds.includes(video.id)} onClick={() => onSave(video.id)} color="yellow" />
                <InteractionBtn icon="⬇️" label="خزنة" active={interactions.downloadedIds.includes(video.id)} onClick={() => onDownload(video)} color="cyan" />
              </div>

              {/* بيانات الفيديو السفلية */}
              <div className="absolute bottom-10 right-6 left-20 z-40 text-right">
                <div className="flex items-center gap-4 flex-row-reverse mb-4">
                  <div className="relative">
                    <img src={LOGO_URL} className="w-14 h-14 rounded-full border-2 border-red-600 shadow-[0_0_20px_red]" />
                  </div>
                  <div className="flex flex-col items-end">
                    <h3 className="text-white text-base font-black italic">@الحديقة المرعبة</h3>
                    <button onClick={() => onCategoryClick(video.category)} className="text-[10px] bg-red-600/90 text-white px-4 py-1 rounded-full font-black mt-1 shadow-[0_0_10px_red]">{video.category}</button>
                  </div>
                </div>
                <p className="text-white/90 text-xs font-black line-clamp-1 italic pr-2 border-r-2 border-red-600">{video.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InteractionBtn = ({ icon, label, active, onClick, color }: any) => (
  <div className="flex flex-col items-center gap-1.5">
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-75 ${active ? `bg-${color}-600/30 border-${color}-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]` : 'bg-black/40 border-white/20 text-white'}`}>
       <span className="text-2xl drop-shadow-lg">{icon}</span>
    </button>
    <span className="text-[9px] font-black text-white uppercase tracking-tighter drop-shadow-xl">{label}</span>
  </div>
);

export default ShortsPlayerOverlay;
