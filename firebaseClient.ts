
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import { Video } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAhv2WSQWatKvtyu6JlLpgMkGHhXH-_UIw",
  authDomain: "roohcontrol.firebaseapp.com",
  projectId: "roohcontrol",
  storageBucket: "roohcontrol.firebasestorage.app",
  messagingSenderId: "657635312060",
  appId: "1:657635312060:web:e1b82d6de18b9f420cabb9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const fetchFirebaseVideos = async (): Promise<Video[]> => {
  try {
    const q = query(collection(db, "video_data"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        public_id: doc.id,
        video_url: data.url, 
        poster_url: data.url ? data.url.replace('.mp4', '.jpg') : '',
        type: data.type || 'short',
        title: data.title || 'بدون عنوان',
        category: data.category || 'هجمات مرعبة',
        narration_text: data.narration || '', 
        narration_segments: data.narration_segments || [], // جلب مصفوفة التوقيتات
        narration_audio_url: data.audio_url || null,
        audio_target: data.audio_target || 'narration',
        likes: 0,
        views: 0,
        repository: data.repository || 'repo_r2',
        created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Video;
    });
  } catch (error) {
    console.error("Firebase Sync Error:", error);
    return [];
  }
};
