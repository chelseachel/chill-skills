// The cover renderer consumes the ai-news-video `keypoints.json` directly.
// Only the fields the thumbnail needs are typed here; extra fields are ignored.

export type CoverExtract = {
  coverTitle: string;   // 固定品牌标题，如 "今日 AI 资讯简报"
  date: string;         // 日期
  overview: string[];   // 当期要点（10–18 字/条），用作次要扫读行
  coverHook?: string;   // 封面专用爆点大标题（10–16 字）。缺省时回退到 overview[0]
  coverHookHighlight?: string; // coverHook 内要高亮的关键词子串（靛墨跳色）。须是 coverHook 的精确子串
};

declare global {
  interface Window {
    __coverReady?: boolean;
  }
}
