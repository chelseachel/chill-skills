export type KeypointElement = {
  /** Lucide icon name from ICON_WHITELIST */
  icon: string;
  /** 2-6 汉字 */
  subtitle: string;
  /** 20-50 字 */
  brief: string;
};

export type EvidenceOverlay = {
  /** Screenshot path relative to keypoints.json, for example evidence/kp-0-openai-x.png */
  asset: string;
  /** Short visible attribution, for example OpenAI @OpenAI · X */
  sourceLabel: string;
  /** Original post, announcement, paper, or release URL retained for auditability. */
  sourceUrl: string;
  /** What the screenshot corroborates; shown below the source label. */
  caption: string;
  /** 1-based sentence number within this keypoint at which the overlay appears. */
  showFromSentence: number;
  /** 1-based sentence number within this keypoint through which the overlay remains visible. */
  showThroughSentence: number;
};

export type Keypoint = {
  /** Source article title (### heading from MD), kept verbatim */
  sourceTitle: string;
  /** 3-6 elements, derived from the article's bullet list */
  elements: KeypointElement[];
  /** Optional first-hand evidence screenshots, shown over the card without changing its layout. */
  evidenceOverlays?: EvidenceOverlay[];
};

export type ExtractResult = {
  title: string;
  date: string;
  /** Short label per keypoint, used as cover-overview chips */
  overview: string[];
  keypoints: Keypoint[];
};

export type ScriptSentence = {
  slideId: string;
  text: string;
};

export type Script = {
  sentences: ScriptSentence[];
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

export const ICON_WHITELIST = [
  'Rocket', 'Sparkles', 'Brain', 'FlaskConical', 'Cpu', 'Database',
  'Code', 'Terminal', 'Bot', 'CircuitBoard', 'Network', 'Globe',
  'Building2', 'TrendingUp', 'DollarSign', 'Coins', 'BarChart3',
  'Zap', 'Lightbulb', 'Scale', 'Shield', 'ShieldAlert', 'Lock',
  'KeyRound', 'Mic', 'Volume2', 'Eye', 'ScanText', 'BookOpen',
  'GraduationCap', 'Microscope', 'Wrench', 'Hammer', 'Box',
  'Package', 'Layers', 'GitBranch', 'Workflow', 'Megaphone',
  'Newspaper', 'AlertTriangle', 'Gavel', 'Users', 'Briefcase',
  'Factory', 'Car', 'Plane', 'Stethoscope', 'HeartPulse', 'Trophy',
  'Target', 'Calendar', 'Clock', 'Flag', 'Star', 'Crown', 'Gem',
] as const;
