
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Video } from './types.ts';
import { incrementViewsInDB } from './supabaseClient.ts';
import { getDeterministicStats, formatBigNumber, LOGO_URL, InteractiveMarquee } from './MainContent.tsx';

interface LongPlayerOverlayProps {
  video: Video;
  allLongVideos: Video[];
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onSwitchVideo: (v: Video) => void;
  onCategoryClick: (cat: string) => void;
  onDownload: () => void;
  isLiked: boolean;
  isDisliked: boolean;
  isSaved: boolean;
  isDownloaded: boolean;
  isGlobalDownloading: boolean;
  onProgress: (p: number) => void;
}

const LongPlayerOverlay: React.FC<LongPlayerOverlayProps> = ({ 
  video, allLongVideos, onClose, onLike, onDislike, onSave, onSwitchVideo, onCategoryClick, onDownload, isLiked, isDisliked, isSaved, isDownloaded, isGlobalDownloading, onProgress 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const stats = useMemo(() => video ? getDeterministicStats(video.video_url) : { views: 0, likes: 0 }, [video?.video_url]);
  const suggestions = useMemo(() => allLongVideos.filter(v => v && v.id !== video?.id), [allLongVideos, video]);

  useEffect(() => {
    if (!video || !video.video_url) return;
    const v = videoRef.current;
    if (!v) return;
    incrementViewsInDB(video.id);
    v.load();
    v.play().then(() => setIsPlaying(true)).catch(() => { v.muted = true; v.play(); });
  }, [video?.id]);

  const activeText = useMemo(() => {
    if (!video || video.audio_target === 'none') return null;
    if (video.audio_target === 'title') return video.title;
    if (video.narration_segments && video.narration_segments.length > 0) {
      const active = [...video.narration_segments].reverse().find(s => currentTime >= s.startTime);
      return active ? active.text : null;
    }
    return video.narration_text;
  }, [video, currentTime]);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-[500] flex flex-col overflow-hidden" dir="rtl">
      <div className={`relative bg-black transition-all duration-700 flex flex-col items-center justify-center overflow-hidden ${isFullScreen ? 'h-full flex-grow' : 'h-[35dvh] border-b-2 border-white/10 shadow-2xl'}`}>
        <video 
          key={video.video_url}
          ref={videoRef} crossOrigin="anonymous"
          className={`h-full w-full object-contain ${isFullScreen ? 'rotate-90 scale-[1.65]' : ''}`} 
          playsInline preload="auto"
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
            if (e.currentTarget.duration) onProgress(e.currentTarget.currentTime / e.currentTarget.duration);
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}
        >
          <source src={video.video_url} type="video/mp4" />
          المتصفح لا يدعم التشغيل
        </video>

        {/* السرد السينمائي - يظهر في سطر واحد بمنتصف الفيديو */}
        {activeText && (
          <div className="absolute bottom-16 left-0 right-0 z-[100] px-10 text-center animate-in fade-in duration-500">
            <div className="inline-block px-8 py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
              <p className="text-xs md:text-sm font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-red-600 drop-shadow-[0_2px_10px_black]">
                {activeText}
              </p>
            </div>
          </div>
        )}

        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center z-[60] bg-black/20"><div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>
        )}

        <div className="absolute bottom-0 left-0 w-full px-2 pb-1 z-50">
           <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(e) => {
             const time = parseFloat(e.target.value);
             setCurrentTime(time);
             if (videoRef.current) videoRef.current.currentTime = time;
           }} className="w-full accent-red-600 h-1 bg-white/20 rounded-lg cursor-pointer" />
        </div>

        <div className="absolute top-5 left-5 right-5 flex justify-between z-50">
          <button onClick={onClose} className="p-3 bg-black/60 rounded-2xl border-2 border-red-600 text-red-600 shadow-[0_0_15px_red] active:scale-75 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-3 bg-black/60 rounded-2xl border-2 border-white/20 text-white shadow-[0_0_10px_white]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5"/></svg>
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto bg-[#020202] p-4 space-y-6 ${isFullScreen ? 'hidden' : 'block'}`}>
          <div className="flex items-center gap-5 bg-white/5 p-4 rounded-[2.5rem] border-2 border-white/10 shadow-2xl">
             <img src={LOGO_URL} className="w-14 h-14 rounded-full border-2 border-red-600 shadow-[0_0_20px_red]" />
             <div className="flex flex-col text-right flex-1">
                <h1 className="text-xl font-black text-white italic drop-shadow-md">{video.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                   <button onClick={() => onCategoryClick(video.category)} className="bg-red-600 border-2 border-red-400 px-4 py-0.5 rounded-full shadow-[0_0_12px_red]">
                     <span className="text-[10px] font-black text-white italic uppercase">{video.category}</span>
                   </button>
                   <span className="text-[10px] font-bold text-gray-500">{formatBigNumber(stats.views)} مشاهدة</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-5 bg-neutral-900/70 p-2.5 rounded-[2.5rem] border-2 border-white/15 gap-2 shadow-2xl">
             <ActionBtn icon="❤️" label="أعجبني" active={isLiked} onClick={onLike} color="red" />
             <ActionBtn icon="👎" label="كرهت" active={isDisliked} onClick={onDislike} color="orange" />
             <ActionBtn icon="⬇️" label="خزنة" active={isDownloaded} onClick={onDownload} color="cyan" />
             <ActionBtn icon={isPlaying ? "⏸️" : "▶️"} label={isPlaying ? "إيقاف" : "تشغيل"} active={false} onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()} color="white" />
             <ActionBtn icon="⭐" label="حفظ" active={isSaved} onClick={onSave} color="yellow" />
          </div>

          <div className="space-y-4 pt-2">
             <h3 className="text-[10px] font-black text-red-600 uppercase italic px-3">عالم الرعب المقترح</h3>
             <InteractiveMarquee videos={suggestions} onPlay={(v) => onSwitchVideo(v)} interactions={{likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: []}} />
          </div>
      </div>
    </div>
  );
};

const ActionBtn = ({ icon, label, active, onClick, color }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center py-3.5 rounded-2xl border-2 transition-all ${active ? `bg-${color}-600 border-${color}-400 shadow-[0_0_15px_${color}]` : 'border-white/10 bg-white/5 text-gray-400'}`}>
    <span className="text-xl">{icon}</span>
    <span className="text-[7px] mt-1.5 font-black">{label}</span>
  </button>
);

export default LongPlayerOverlay;
