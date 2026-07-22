export type AppState = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'success';

export interface GeneratedResult {
  originalImage: string;
  resultImage: string;
  promptUsed: string;
  detectedObject: 'Sofa' | 'Bed' | 'Unknown';
}

export interface RoomAnalysis {
  style: string;
  layout: string;
  furniture: string[];
  colors: string[];
  recommendation?: string;
  lightSuggestion?: string;
}

export interface LampAnalysis {
  style: string;
  structure: string;
  materials: string[];
  color: string;
  lightType: string;
  lightWarmth: string;
  cozyIndex?: number | string;
  placementTip?: string;
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
  viewType: 'far' | 'mid' | 'close';
  quality: '1K' | '2K' | '4K';
  ratio: '4:3' | '3:4' | '1:1' | '16:9' | '9:16';
  lightState: 'on' | 'off';
  needModel: boolean;
}
