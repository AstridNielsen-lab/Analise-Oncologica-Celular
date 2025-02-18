import { CellAnalysisResult, CellData, CellAnalysisLevel, CellDescription } from '../types/analysis';

export class CellAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private startTime: Date;

  private readonly CELL_DESCRIPTIONS: Record<string, string> = {
    hyperplasia: "Increase in cell number",
    hypoplasia: "Decrease in cell number",
    hypertrophy: "Increase in cell size",
    hypotrophy: "Decrease in cell size",
    atrophy: "Decrease in cell size and number",
    metaplasia: "Change in cell type",
    intracellular: "Intracellular accumulations"
  };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.startTime = new Date();
  }

  async analyzeImage(imageFile: File): Promise<CellAnalysisResult> {
    this.startTime = new Date();
    console.log("Starting cell analysis...");

    const image = await this.loadImage(imageFile);
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data, width, height } = imageData;

    // Process image data
    const processedData = this.preprocessImage(data);
    
    // Detect cells
    const cells = this.detectCells(processedData, width, height);
    
    // Analyze cells
    const cellData = this.analyzeCells(cells, processedData, width);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(cellData);

    // Draw annotations
    this.drawAnnotations(cells, cellData);

    const endTime = new Date();
    const executionTime = endTime.getTime() - this.startTime.getTime();

    return {
      cells: cellData,
      statistics,
      executionTime,
      abnormalityLevel: this.determineAbnormalityLevel(statistics),
      diagnosis: this.generateDiagnosis(cellData, statistics),
      processedImageUrl: this.canvas.toDataURL()
    };
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  private preprocessImage(data: Uint8ClampedArray): Float32Array {
    const processed = new Float32Array(data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const pixel = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      processed[i / 4] = this.normalizePixelValue(pixel);
    }

    return processed;
  }

  private normalizePixelValue(value: number): number {
    return (value - 128) / 128; // Normalize to [-1, 1] range
  }

  private detectCells(
    data: Float32Array,
    width: number,
    height: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const cells: Array<{ x: number; y: number; width: number; height: number }> = [];
    const visited = new Set<number>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited.has(idx)) continue;

        const value = data[idx];
        if (this.isAbnormalCell(value)) {
          const cell = this.growRegion(data, width, height, x, y, visited);
          if (cell) cells.push(cell);
        }
      }
    }

    return cells;
  }

  private isAbnormalCell(value: number): boolean {
    return Math.abs(value) > 0.2; // Threshold for cell detection
  }

  private growRegion(
    data: Float32Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>
  ) {
    const queue: [number, number][] = [[startX, startY]];
    const region = {
      x: startX,
      y: startY,
      width: 1,
      height: 1
    };

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const idx = y * width + x;
      
      if (visited.has(idx)) continue;
      visited.add(idx);

      region.x = Math.min(region.x, x);
      region.y = Math.min(region.y, y);
      region.width = Math.max(region.width, x - region.x + 1);
      region.height = Math.max(region.height, y - region.y + 1);

      [[1,0], [-1,0], [0,1], [0,-1]].forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!visited.has(nIdx) && this.isAbnormalCell(data[nIdx])) {
            queue.push([nx, ny]);
          }
        }
      });
    }

    return region;
  }

  private analyzeCells(
    cells: Array<{ x: number; y: number; width: number; height: number }>,
    data: Float32Array,
    width: number
  ): CellData[] {
    return cells.map((cell, index) => {
      const size = cell.width * cell.height;
      const shape = this.calculateShape(cell);
      const colorDifference = this.calculateColorDifference(cell, data, width);

      return {
        id: index + 1,
        size,
        shape,
        colorDifference,
        location: this.determineLocation(cell),
        characteristics: this.determineCharacteristics(size, shape, colorDifference)
      };
    });
  }

  private calculateShape(cell: { width: number; height: number }): number {
    return Math.abs(1 - cell.width / cell.height);
  }

  private calculateColorDifference(
    cell: { x: number; y: number; width: number; height: number },
    data: Float32Array,
    width: number
  ): number {
    let sum = 0;
    let count = 0;

    for (let y = cell.y; y < cell.y + cell.height; y++) {
      for (let x = cell.x; x < cell.x + cell.width; x++) {
        sum += Math.abs(data[y * width + x]);
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private determineLocation(cell: { x: number; y: number }): string {
    const x = cell.x;
    const y = cell.y;
    
    if (y < this.canvas.height / 3) return 'superior';
    if (y > (this.canvas.height * 2) / 3) return 'inferior';
    return 'central';
  }

  private determineCharacteristics(size: number, shape: number, colorDifference: number): string[] {
    const characteristics: string[] = [];

    if (shape > 0.3) characteristics.push('irregular');
    if (size > 1000) characteristics.push('enlarged');
    if (colorDifference > 0.5) characteristics.push('abnormal density');
    if (colorDifference > 0.7) characteristics.push('possible malignant');

    return characteristics;
  }

  private calculateStatistics(cells: CellData[]) {
    const totalCells = cells.length;
    const abnormalCells = cells.filter(c => 
      c.characteristics.includes('possible malignant')
    ).length;

    return {
      totalCells,
      abnormalCells,
      averageSize: cells.reduce((sum, c) => sum + c.size, 0) / totalCells,
      averageColorDifference: cells.reduce((sum, c) => sum + c.colorDifference, 0) / totalCells,
      infestationPercentage: (abnormalCells / totalCells) * 100,
      criticalAreas: cells.filter(c => 
        c.characteristics.includes('possible malignant') && 
        c.location === 'central'
      ).length
    };
  }

  private determineAbnormalityLevel(statistics: {
    infestationPercentage: number;
    criticalAreas: number;
  }): CellAnalysisLevel {
    if (statistics.criticalAreas > 0 || statistics.infestationPercentage > 30) return 'high';
    if (statistics.infestationPercentage > 10) return 'medium';
    return 'low';
  }

  private generateDiagnosis(cells: CellData[], statistics: { infestationPercentage: number }): string {
    const malignantCells = cells.filter(c => c.characteristics.includes('possible malignant'));
    
    if (malignantCells.length > 0) {
      const locations = [...new Set(malignantCells.map(c => c.location))];
      return `Possível Malignidade Detectada - ${malignantCells.length} células suspeitas encontradas em ${locations.join(', ')} - Infestação: ${statistics.infestationPercentage.toFixed(1)}% - Recomenda-se avaliação médica urgente`;
    }

    if (statistics.infestationPercentage > 10) {
      return `Alterações Celulares Detectadas - ${cells.length} células analisadas - Infestação: ${statistics.infestationPercentage.toFixed(1)}% - Recomenda-se acompanhamento médico`;
    }

    return 'Padrão celular dentro da normalidade';
  }

  private drawAnnotations(
    cells: Array<{ x: number; y: number; width: number; height: number }>,
    cellData: CellData[]
  ) {
    cells.forEach((cell, index) => {
      const data = cellData[index];
      
      // Draw cell outline
      this.ctx.strokeStyle = this.getColorForCell(data);
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
      
      // Add label
      this.ctx.fillStyle = this.getColorForCell(data);
      this.ctx.font = '12px Arial';
      this.ctx.fillText(
        `${data.characteristics.join(', ')}`,
        cell.x,
        cell.y - 5
      );
    });
  }

  private getColorForCell(cell: CellData): string {
    if (cell.characteristics.includes('possible malignant')) return '#ff0000';
    if (cell.characteristics.includes('abnormal density')) return '#ff9900';
    if (cell.characteristics.includes('enlarged')) return '#00ff00';
    return '#0000ff';
  }
}