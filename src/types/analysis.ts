export type CellAnalysisLevel = 'low' | 'medium' | 'high';

export interface CellData {
  id: number;
  size: number;
  shape: number;
  colorDifference: number;
  location: string;
  characteristics: string[];
}

export interface CellStatistics {
  totalCells: number;
  abnormalCells: number;
  averageSize: number;
  averageColorDifference: number;
  infestationPercentage: number;
  criticalAreas: number;
}

export interface CellAnalysisResult {
  cells: CellData[];
  statistics: CellStatistics;
  executionTime: number;
  abnormalityLevel: CellAnalysisLevel;
  diagnosis: string;
  processedImageUrl: string;
}

export interface CellDescription {
  type: 'hyperplasia' | 'hypoplasia' | 'hypertrophy' | 'hypotrophy' | 'atrophy' | 'metaplasia' | 'intracellular';
  description: string;
}