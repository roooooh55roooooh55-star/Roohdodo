
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

// الرابط العام لمستودع R2 الخاص بك - نضمن عدم وجود سلاش في النهاية للتحكم الدقيق
const PUBLIC_R2_BASE = "https://pub-82d22c4b0b8b4b1e8a32d6366b7546c8.r2.dev";

/**
 * جلب كافة بيانات الفيديوهات من Firestore وتلقائياً تحديد الروابط لـ R2 وتليجرام
 */
export const fetchFirebaseVideos = async (): Promise<Video[]> => {
  try {
    const q = query(collection(db, "video_data"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      let finalUrl = data.url || "";
      
      // التعرف على فيديوهات R2 وتركيب الرابط العام
      if (data.repository === 'repo_r2') {
        let file = data.fileName || data.url || "";
        if (file && !file.startsWith('http')) {
          // إزالة السلاش من بداية اسم الملف لتجنب السلاش المزدوج //
          const cleanFile = file.startsWith('/') ? file.substring(1) : file;
          finalUrl = `${PUBLIC_R2_BASE}/${cleanFile}`;
        }
      } 
      // فيديوهات تليجرام (روابط مباشرة أو محقونة)
      else if (data.repository === 'repo_telegram') {
        finalUrl = data.url || "";
      }

      // نضمن عدم إرجاع رابط فارغ لتجنب خطأ "No supported sources"
      if (!finalUrl) return null as any;

      return {
        id: doc.id,
        public_id: doc.id,
        video_url: finalUrl, 
        poster_url: finalUrl ? finalUrl.replace('.mp4', '.jpg') : '',
        type: data.type || 'short',
        title: data.title || 'بدون عنوان سيادي',
        category: data.category || 'هجمات مرعبة',
        narration_text: data.narration || '', 
        narration_segments: data.narration_segments || [],
        audio_target: data.audio_target || 'narration',
        likes: 0,
        views: 0,
        repository: data.repository || 'repo_r2',
        created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Video;
    }).filter(v => v !== null); // تصفية أي فيديوهات بروابط مكسورة
  } catch (error) {
    console.error("Critical Sync Error:", error);
    return [];
  }
};
