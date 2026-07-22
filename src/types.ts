export type AppState = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'success';

export interface GeneratedResult {
  originalImage: string;
  resultImage: string;
  promptUsed: string;
  detectedObject: 'Sofa' | 'Bed' | 'Unknown';
}
