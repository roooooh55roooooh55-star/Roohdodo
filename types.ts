
export type VideoType = 'short' | 'long';

export interface NarrationSegment {
  text: string;
  startTime: number;
}

export interface Video {
  id: string;
  video_url: string;
  poster_url?: string;
  type: VideoType;
  likes: number;
  views: number;
  title: string;
  category: string;
  tags?: string[];
  created_at?: any;
  public_id: string;
  repository: 'repo_r2' | 'repo_telegram'; 
  narration_text?: string;
  narration_segments?: NarrationSegment[];
  narration_audio_url?: string;
  audio_target?: 'none' | 'title' | 'narration';
  isFeatured?: boolean;
  external_link?: string;
  cropSettings?: { scale: number; offsetX: number; offsetY: number };
}

export interface UserInteractions {
  likedIds: string[];
  dislikedIds: string[];
  savedIds: string[];
  savedCategoryNames: string[]; 
  watchHistory: { id: string; progress: number }[];
  downloadedIds: string[]; 
}

export enum AppView {
  HOME = 'home',
  TREND = 'trend',
  LIKES = 'likes',
  SAVED = 'saved',
  HIDDEN = 'hidden',
  PRIVACY = 'privacy',
  ADMIN = 'admin',
  CATEGORY = 'category',
  OFFLINE = 'offline'
}
