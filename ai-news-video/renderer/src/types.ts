export type KeypointElement = {
  icon: string;
  subtitle: string;
  brief: string;
};

export type EvidenceOverlay = {
  asset: string;
  sourceLabel: string;
  sourceUrl: string;
  caption: string;
  showFromSentence: number;
  showThroughSentence: number;
};

export type Keypoint = {
  sourceTitle: string;
  elements: KeypointElement[];
  evidenceOverlays?: EvidenceOverlay[];
};

export type ExtractResult = {
  title: string;        // B 站发布的标题党标题（封面不显示）
  coverTitle: string;   // 视频封面 H1，固定为 "今日 AI 资讯概览"
  date: string;
  overview: string[];
  keypoints: Keypoint[];
};

export type SlideTiming = {
  id: string;
  durSec: number;
};

export type Cue = {
  slideId: string;
  sentenceIndex: number;
  startSec: number;
  durSec: number;
};

export type Chapter = {
  slideId: string;
  title: string;
  startSec: number;
  durSec: number;
};

export type Timeline = {
  theme: string;
  totalSec: number;
  slides: SlideTiming[];
  cues: Cue[];
  chapters?: Chapter[];
};

export type PlayerData = {
  extract: ExtractResult;
  timeline: Timeline;
};

// Global window extensions set by Player.tsx
declare global {
  interface Window {
    __playerReady?: boolean;
    __startPlayback?: () => void;
  }
}
