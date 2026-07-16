export interface RoomAnalysis {
  style: string;
  layout: string;
  furniture: string[];
  colors: string[];
  recommendation: string;
  lightSuggestion: string;
}

export interface LampAnalysis {
  style: string;
  materials: string[];
  color: string;
  lightType: string;
  lightWarmth: string;
  cozyIndex: number;
  placementTip: string;
}

export interface VirtualRoom {
  id: string;
  name: string;
  style: string;
  imageUrl: string;
  imageUrlFar?: string;
  imageUrlMid?: string;
  imageUrlClose?: string;
  analysis: RoomAnalysis;
}

export interface PresetLamp {
  id: string;
  name: string;
  style: string;
  imageUrl: string;
  analysis: LampAnalysis;
}

export interface GenerationParams {
  viewType: 'far' | 'mid' | 'close'; // 远景, 中近景, 近景
  quality: '1K' | '2K' | '4K'; // 清晰度
  ratio: '4:3' | '3:4' | '1:1' | '16:9' | '9:16'; // 比例
  lightState: 'on' | 'off'; // 开灯, 关灯
}
