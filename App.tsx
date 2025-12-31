
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppView, Video, UserInteractions } from './types.ts';
import { fetchFirebaseVideos } from './firebaseClient.ts';
import AppBar from './AppBar.tsx';
import MainContent from './MainContent.tsx';
import ShortsPlayerOverlay from './ShortsPlayerOverlay.tsx';
import LongPlayerOverlay from './LongPlayerOverlay.tsx';
import AIOracle from './AIOracle.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import SavedPage from './SavedPage.tsx';
import TrendPage from './TrendPage.tsx';
import PrivacyPage from './PrivacyPage.tsx';
import CategoryPage from './CategoryPage.tsx';
import OfflinePage from './OfflinePage.tsx';
import HiddenVideosPage from './HiddenVideosPage.tsx';

export const OFFICIAL_CATEGORIES = [
  "هجمات مرعبة", "رعب حقيقي", "رعب الحيوانات", "أخطر المشاهد",
  "أهوال مرعبة", "رعب كوميدي", "لحظات مرعبة", "صدمة"
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<Video | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    try {
      const saved = localStorage.getItem('hadiqa_interactions_v4');
      return saved ? JSON.parse(saved) : {
        likedIds: [],
        dislikedIds: [],
        savedIds: [],
        savedCategoryNames: [],
        watchHistory: [],
        downloadedIds: []
      };
    } catch (e) {
      return { likedIds: [], dislikedIds: [], savedIds: [], savedCategoryNames: [], watchHistory: [], downloadedIds: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem('hadiqa_interactions_v4', JSON.stringify(interactions));
  }, [interactions]);

  const loadVideos = useCallback(async () => {
    try {
      const data = await fetchFirebaseVideos();
      // التحديث الذكي للقائمة لضمان عدم إعادة رندر الصفحة إذا لم تتغير البيانات
      setVideos(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    } catch (error) {
      console.error("Firebase Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
    // تقليل زمن المزامنة إلى 5 ثوانٍ بناءً على طلب المستخدم
    const interval = setInterval(loadVideos, 5000); 
    return () => clearInterval(interval);
  }, [loadVideos]);

  const handleLike = (id: string) => {
    setInteractions(prev => {
      const isLiked = prev.likedIds.includes(id);
      return {
        ...prev,
        likedIds: isLiked ? prev.likedIds.filter(i => i !== id) : [...prev.likedIds, id]
      };
    });
  };

  const handleDislike = (id: string) => {
    setInteractions(prev => {
      const isDisliked = prev.dislikedIds.includes(id);
      return {
        ...prev,
        dislikedIds: isDisliked ? prev.dislikedIds.filter(i => i !== id) : [...prev.dislikedIds, id]
      };
    });
  };

  const handleSave = (id: string) => {
    setInteractions(prev => {
      const isSaved = prev.savedIds.includes(id);
      return {
        ...prev,
        savedIds: isSaved ? prev.savedIds.filter(i => i !== id) : [...prev.savedIds, id]
      };
    });
  };

  const handleSaveCategory = (cat: string) => {
    setInteractions(prev => {
      const isSaved = prev.savedCategoryNames.includes(cat);
      return {
        ...prev,
        savedCategoryNames: isSaved ? prev.savedCategoryNames.filter(c => c !== cat) : [...prev.savedCategoryNames, cat]
      };
    });
  };

  const handleProgress = (id: string, progress: number) => {
    setInteractions(prev => {
      const history = prev.watchHistory.filter(h => h.id !== id);
      return {
        ...prev,
        watchHistory: [...history, { id, progress }]
      };
    });
  };

  const handleDownload = (video: Video) => {
    setInteractions(prev => ({
      ...prev,
      downloadedIds: [...new Set([...prev.downloadedIds, video.id])]
    }));
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.HOME:
        return (
          <MainContent 
            videos={videos.filter(v => !interactions.dislikedIds.includes(v.id))}
            categoriesList={OFFICIAL_CATEGORIES}
            interactions={interactions}
            onPlayShort={(v: Video, list: Video[]) => setSelectedShort({ video: v, list })}
            onPlayLong={(v: Video) => setSelectedLong(v)}
            onCategoryClick={(cat: string) => { setActiveCategory(cat); setCurrentView(AppView.CATEGORY); }}
            onHardRefresh={loadVideos}
            onOfflineClick={() => setCurrentView(AppView.OFFLINE)}
            loading={loading}
            isOverlayActive={!!selectedShort || !!selectedLong}
            downloadProgress={null}
            onLike={handleLike}
          />
        );
      case AppView.TREND:
        return <TrendPage allVideos={videos} excludedIds={interactions.dislikedIds} onPlayShort={(v, l) => setSelectedShort({video: v, list: l})} onPlayLong={setSelectedLong} />;
      case AppView.LIKES:
        return <SavedPage title="الإعجابات" savedIds={interactions.likedIds} savedCategories={[]} allVideos={videos} onPlayShort={(v, l) => setSelectedShort({video: v, list: l})} onPlayLong={setSelectedLong} onCategoryClick={(cat) => { setActiveCategory(cat); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.SAVED:
        return <SavedPage title="المحفوظات" savedIds={interactions.savedIds} savedCategories={interactions.savedCategoryNames} allVideos={videos} onPlayShort={(v, l) => setSelectedShort({video: v, list: l})} onPlayLong={setSelectedLong} onCategoryClick={(cat) => { setActiveCategory(cat); setCurrentView(AppView.CATEGORY); }} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={videos} onRestore={(id) => setInteractions(prev => ({ ...prev, dislikedIds: prev.dislikedIds.filter(i => i !== id) }))} onPlayShort={(v, l) => setSelectedShort({video: v, list: l})} onPlayLong={setSelectedLong} />;
      case AppView.PRIVACY:
        return <PrivacyPage onOpenAdmin={() => setIsAdminOpen(true)} />;
      case AppView.CATEGORY:
        return activeCategory ? <CategoryPage category={activeCategory} allVideos={videos} isSaved={interactions.savedCategoryNames.includes(activeCategory)} onToggleSave={() => handleSaveCategory(activeCategory)} onPlayShort={(v, l) => setSelectedShort({video: v, list: l})} onPlayLong={setSelectedLong} onBack={() => setCurrentView(AppView.HOME)} /> : null;
      case AppView.OFFLINE:
        return <OfflinePage allVideos={videos} interactions={interactions} onPlayShort={(v, l) => setSelectedShort({video: v, list: l})} onPlayLong={setSelectedLong} onBack={() => setCurrentView(AppView.HOME)} onUpdateInteractions={setInteractions} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-black text-white min-h-screen font-['Cairo'] overflow-x-hidden">
      <AppBar currentView={currentView} onViewChange={setCurrentView} onRefresh={loadVideos} />
      
      <main className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        {renderView()}
      </main>

      <AIOracle />

      {selectedShort && (
        <ShortsPlayerOverlay 
          initialVideo={selectedShort.video} 
          videoList={selectedShort.list} 
          interactions={interactions} 
          onClose={() => setSelectedShort(null)} 
          onLike={handleLike} 
          onDislike={handleDislike} 
          onSave={handleSave} 
          onCategoryClick={(cat) => { setSelectedShort(null); setActiveCategory(cat); setCurrentView(AppView.CATEGORY); }}
          onProgress={handleProgress}
          onDownload={handleDownload}
          isGlobalDownloading={false}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong} 
          allLongVideos={videos.filter(v => v.type === 'long')} 
          onClose={() => setSelectedLong(null)} 
          onLike={() => handleLike(selectedLong.id)} 
          onDislike={() => handleDislike(selectedLong.id)} 
          onSave={() => handleSave(selectedLong.id)} 
          onSwitchVideo={setSelectedLong} 
          onCategoryClick={(cat) => { setSelectedLong(null); setActiveCategory(cat); setCurrentView(AppView.CATEGORY); }}
          onDownload={() => handleDownload(selectedLong)}
          isLiked={interactions.likedIds.includes(selectedLong.id)}
          isDisliked={interactions.dislikedIds.includes(selectedLong.id)}
          isSaved={interactions.savedIds.includes(selectedLong.id)}
          isDownloaded={interactions.downloadedIds.includes(selectedLong.id)}
          isGlobalDownloading={false}
          onProgress={(p) => handleProgress(selectedLong.id, p)}
        />
      )}

      {isAdminOpen && (
        <AdminDashboard 
          onClose={() => setIsAdminOpen(false)} 
          initialVideos={videos} 
          onRefreshVideos={loadVideos} 
        />
      )}
    </div>
  );
};

export default App;
