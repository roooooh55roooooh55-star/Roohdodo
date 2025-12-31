
import { Video } from './types';

const CLOUD_NAME = "dlrvn33p0";
const COMMON_TAG = 'hadiqa_v4';

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    const targetUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/list/${COMMON_TAG}.json?t=${timestamp}`;
    
    const response = await fetch(targetUrl, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error("Cloudinary Access Denied");

    const data = await response.json();
    return mapCloudinaryData(data.resources || []);
  } catch (error) {
    console.error('Fetch Error:', error);
    const cached = localStorage.getItem('app_videos_cache');
    return cached ? JSON.parse(cached) : [];
  }
};

const mapCloudinaryData = (resources: any[]): Video[] => {
  return resources.map((res: any, index: number) => {
    const baseUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload`;
    const context = res.context?.custom || {};
    const rawTitle = context.title || context.caption || `فيديو مرعب #${index + 1}`;
    const rawCategory = context.category || context.section || 'هجمات مرعبة';
    
    // تحسين الرابط: f_auto (تنسيق تلقائي)، q_auto (جودة تلقائية)، vc_auto (ترميز تلقائي)، br_auto (معدل بت تلقائي)
    const optimizedVideoUrl = `${baseUrl}/f_auto,q_auto,vc_auto,br_auto/v${res.version}/${res.public_id}.${res.format}`;
    const optimizedPosterUrl = `${baseUrl}/f_auto,q_auto,so_0/v${res.version}/${res.public_id}.jpg`;

    return {
      id: res.public_id,
      public_id: res.public_id,
      video_url: optimizedVideoUrl,
      poster_url: optimizedPosterUrl,
      type: context.type || (res.height > res.width ? 'short' : 'long'),
      title: rawTitle,
      category: rawCategory,
      narration_text: context.narration || '',
      narration_audio_url: context.audio_url || null,
      audio_target: context.audio_target || 'narration',
      likes: 0,
      views: 0,
      isFeatured: context.featured === 'true' || res.tags?.includes('featured'),
      repository: context.repo || (res.tags?.includes('repo_2') ? 'repo_2' : 'repo_1'),
      external_link: context.external_link,
      cropSettings: context.crop ? JSON.parse(context.crop) : { scale: 1.1, offsetX: 0, offsetY: 0 }
    } as Video;
  });
};
