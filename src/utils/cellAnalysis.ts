import { CellAnalysisResult, CellData, CellAnalysisLevel } from '../types/analysis';

export class CellAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private startTime: Date;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.startTime = new Date();
  }

  async analyzeImage(imageFile: File): Promise<CellAnalysisResult> {
    this.startTime = new Date();
    console.log("Starting enhanced cell analysis...");

    const image = await this.loadImage(imageFile);
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const processedData = this.advancedPreprocessImage(imageData);
    
    const cells = this.detectCells(processedData);
    const cellData = this.analyzeCells(cells, processedData);
    const statistics = this.calculateStatistics(cellData);
    
    this.drawAnnotations(cells, cellData);
    
    const executionTime = new Date().getTime() - this.startTime.getTime();
    return {
      cells: cellData,
      statistics,
      executionTime,
      abnormalityLevel: this.determineAbnormalityLevel(statistics),
      diagnosis: this.generateDiagnosis(statistics),
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

  private advancedPreprocessImage(imageData: ImageData): Float32Array {
    const { data, width, height } = imageData;
    const processed = new Float32Array(data.length / 4);
    
    // Enhanced color weighting for better cell detection
    for (let i = 0; i < data.length; i += 4) {
      let intensity = (data[i] * 0.3 + data[i + 1] * 0.6 + data[i + 2] * 0.1);
      processed[i / 4] = intensity / 255;
    }
    return this.applyAdaptiveThreshold(processed, width, height);
  }

  private applyAdaptiveThreshold(data: Float32Array, width: number, height: number): Float32Array {
    const thresholded = new Float32Array(data.length);
    const windowSize = 15;
    const threshold = 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let sum = 0;
        let count = 0;

        // Calculate local average
        for (let wy = -windowSize; wy <= windowSize; wy++) {
          for (let wx = -windowSize; wx <= windowSize; wx++) {
            const ny = y + wy;
            const nx = x + wx;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += data[ny * width + nx];
              count++;
            }
          }
        }

        const localThreshold = (sum / count) * threshold;
        thresholded[idx] = data[idx] > localThreshold ? 1 : 0;
      }
    }
    return thresholded;
  }

  private detectCells(data: Float32Array): Array<{ x: number; y: number; radius: number }> {
    const cells: Array<{ x: number; y: number; radius: number }> = [];
    const visited = new Set<number>();

    for (let i = 0; i < data.length; i++) {
      if (!visited.has(i) && data[i] > 0.5) {
        const x = i % this.canvas.width;
        const y = Math.floor(i / this.canvas.width);
        
        // Find cell radius through region growing
        const radius = this.findCellRadius(data, x, y, visited);
        if (radius > 2) { // Filter out noise
          cells.push({ x, y, radius });
        }
      }
    }
    return cells;
  }

  private findCellRadius(data: Float32Array, startX: number, startY: number, visited: Set<number>): number {
    let maxDistance = 0;
    const queue: [number, number, number][] = [[startX, startY, 0]];
    
    while (queue.length > 0) {
      const [x, y, distance] = queue.shift()!;
      const idx = y * this.canvas.width + x;
      
      if (visited.has(idx) || data[idx] <= 0.5) continue;
      visited.add(idx);
      
      maxDistance = Math.max(maxDistance, distance);
      
      // Check neighbors
      [[-1,0], [1,0], [0,-1], [0,1]].forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.canvas.width && ny >= 0 && ny < this.canvas.height) {
          queue.push([nx, ny, distance + 1]);
        }
      });
    }
    
    return maxDistance;
  }

  private analyzeCells(cells: Array<{ x: number; y: number; radius: number }>, data: Float32Array): CellData[] {
    return cells.map((cell, index) => {
      const size = Math.PI * Math.pow(cell.radius, 2);
      const intensity = this.calculateLocalIntensity(cell, data);
      
      return {
        id: index + 1,
        size,
        shape: 1.0, // Circular cells
        colorDifference: intensity,
        location: this.determineLocation(cell),
        characteristics: this.determineCharacteristics(cell.radius, intensity)
      };
    });
  }

  private calculateLocalIntensity(
    cell: { x: number; y: number; radius: number },
    data: Float32Array
  ): number {
    let sum = 0;
    let count = 0;
    
    for (let y = cell.y - cell.radius; y <= cell.y + cell.radius; y++) {
      for (let x = cell.x - cell.radius; x <= cell.x + cell.radius; x++) {
        if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
          const idx = y * this.canvas.width + x;
          if (Math.pow(x - cell.x, 2) + Math.pow(y - cell.y, 2) <= Math.pow(cell.radius, 2)) {
            sum += data[idx];
            count++;
          }
        }
      }
    }
    
    return count > 0 ? sum / count : 0;
  }

  private determineLocation(cell: { x: number; y: number }): string {
    const y = cell.y;
    if (y < this.canvas.height / 3) return 'superior';
    if (y > (this.canvas.height * 2) / 3) return 'inferior';
    return 'central';
  }

  private determineCharacteristics(radius: number, intensity: number): string[] {
    const characteristics: string[] = [];
    if (radius > 7) characteristics.push('enlarged');
    if (intensity > 0.7) characteristics.push('high intensity');
    if (intensity > 0.8) characteristics.push('possible malignant');
    return characteristics;
  }

  private calculateStatistics(cells: CellData[]) {
    const totalCells = cells.length;
    const abnormalCells = cells.filter(c => 
      c.characteristics.includes('high intensity')
    ).length;
    
    return {
      totalCells,
      abnormalCells,
      averageSize: cells.reduce((sum, c) => sum + c.size, 0) / totalCells,
      averageColorDifference: cells.reduce((sum, c) => sum + c.colorDifference, 0) / totalCells,
      infestationPercentage: (abnormalCells / totalCells) * 100,
      criticalAreas: cells.filter(c => 
        c.characteristics.includes('possible malignant')
      ).length
    };
  }

  private determineAbnormalityLevel(statistics: { infestationPercentage: number }): CellAnalysisLevel {
    if (statistics.infestationPercentage > 30) return 'high';
    if (statistics.infestationPercentage > 10) return 'medium';
    return 'low';
  }

  private generateDiagnosis(statistics: { infestationPercentage: number }): string {
    if (statistics.infestationPercentage > 30) {
      return `Alta suspeita de malignidade (${statistics.infestationPercentage.toFixed(1)}%) - Investigação necessária`;
    }
    if (statistics.infestationPercentage > 10) {
      return `Alterações celulares detectadas (${statistics.infestationPercentage.toFixed(1)}%) - Recomenda-se acompanhamento`;
    }
    return 'Padrão celular dentro dos parâmetros normais';
  }

  private drawAnnotations(cells: Array<{ x: number; y: number; radius: number }>, cellData: CellData[]) {
    cells.forEach((cell, index) => {
      const data = cellData[index];
      
      this.ctx.beginPath();
      this.ctx.arc(cell.x, cell.y, cell.radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = data.characteristics.includes('possible malignant') 
        ? '#ff0000' 
        : data.characteristics.includes('high intensity')
        ? '#ff9900'
        : '#00ff00';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Add label for abnormal cells
      if (data.characteristics.length > 0) {
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.font = '10px Arial';
        this.ctx.fillText(
          data.characteristics.join(', '),
          cell.x - cell.radius,
          cell.y - cell.radius - 5
        );
      }
    });
  }
}