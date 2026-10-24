export interface Project {
  id: string;
  index: string; // e.g. "01", "09", "14"
  title: string;
  subtitle: string;
  client: string;
  agency: string;
  role: string;
  launchDate: string;
  recognitions: string[];
  description: string;
  themeColor: string; // Hex for subtle accent
  accentColor: string; // For badges/swatches
  category: string;
  visualType: 'cyber' | 'silhouette' | 'architecture' | 'abstract' | 'portrait' | 'typography' | 'minimal' | 'monograph' | 'editorial' | 'packaging';
  imageUrl?: string;
  caseStudy: {
    overview: string;
    challenge: string;
    solution: string;
    deliverables: string[];
    metrics: { label: string; value: string }[];
  };
  creativeApproach?: string;
  metaAdsStats?: import('../utils/metaAdsAnalytics').MinimalMetaAdsData;
}

export interface PlaygroundItem {
  id: string;
  index: string;
  title: string;
  category: 'Typography' | 'Experiments' | '3D & Motion' | 'Editorial' | 'Awards';
  year: string;
  aspect: 'portrait' | 'landscape' | 'square' | 'wide';
  theme: string;
  description: string;
  tags: string[];
}

export type ViewMode = 'work' | 'about' | 'playground';
export type ThemeMode = 'light' | 'dark';
