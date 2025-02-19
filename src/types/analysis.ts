export type CellAnalysisLevel = 'low' | 'medium' | 'high';
export type DiagnosisLevel = 'low' | 'medium' | 'high';

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

export interface AnomalyData {
  id: number;
  type: 'aneurysm' | 'mass' | 'calcification' | 'fluid';
  location: string;
  size: number;
  density: number;
  hounsfield: number;
  irregularity: number;
  characteristics: string[];
}

export interface MedicalAnalysisResult {
  anomalies: AnomalyData[];
  statistics: {
    totalAnomalies: number;
    averageDensity: number;
    averageSize: number;
    maxHounsfield: number;
    minHounsfield: number;
    criticalLocations: number;
  };
  executionTime: number;
  abnormalityLevel: DiagnosisLevel;
  diagnosis: string;
  processedImageUrl: string;
}