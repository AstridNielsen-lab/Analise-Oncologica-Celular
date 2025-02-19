import { CellAnalysisResult, CellData, CellAnalysisLevel } from '../types/analysis';

export class CellAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private startTime: Date;

  // Kernel for Gaussian blur
  private readonly GAUSSIAN_KERNEL = [
    [0.075, 0.124, 0.075],
    [0.124, 0.204, 0.124],
    [0.075, 0.124, 0.075]
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      const context = this.canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get 2D context from canvas');
      }
      this.ctx = context;
      this.startTime = new Date();
    } else {
      throw new Error('CellAnalyzer requires a browser environment');
    }
  }

  async analyzeImage(imageFile: File): Promise<CellAnalysisResult> {
    this.startTime = new Date();
    console.log("Starting enhanced cell analysis...");

    try {
      const image = await this.loadImage(imageFile);
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      this.ctx.drawImage(image, 0, 0);

      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const processedData = this.advancedPreprocessImage(imageData);
      
      const cells = this.detectCells(processedData, imageData);
      const cellData = this.analyzeCells(cells, processedData, imageData);
      const statistics = this.calculateStatistics(cellData);
      
      this.drawAnnotations(cells, cellData);
      
      const executionTime = new Date().getTime() - this.startTime.getTime();
      return {
        cells: cellData,
        statistics,
        executionTime,
        abnormalityLevel: this.determineAbnormalityLevel(statistics),
        diagnosis: this.generateDiagnosis(cellData, statistics),
        processedImageUrl: this.canvas.toDataURL()
      };
    } catch (error) {
      console.error('Analysis error:', error);
      throw new Error('Failed to analyze image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private advancedPreprocessImage(imageData: ImageData): Float32Array {
    const { data, width, height } = imageData;
    const processed = new Float32Array(data.length / 4);
    
    // Convert to grayscale with enhanced color weighting
    for (let i = 0; i < data.length; i += 4) {
      let grayscale = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      processed[i / 4] = grayscale / 255;
    }

    // Apply Gaussian blur for noise reduction
    const blurred = this.applyGaussianBlur(processed, width, height);
    
    // Apply edge detection
    const edges = this.applyEdgeDetection(blurred, width, height);
    
    // Apply adaptive thresholding
    return this.applyAdaptiveThreshold(edges, width, height);
  }

  private applyGaussianBlur(data: Float32Array, width: number, height: number): Float32Array {
    const output = new Float32Array(data.length);
    const kernelSize = 3;
    const offset = Math.floor(kernelSize / 2);

    for (let y = offset; y < height - offset; y++) {
      for (let x = offset; x < width - offset; x++) {
        let sum = 0;
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const px = x + (kx - offset);
            const py = y + (ky - offset);
            const kernel = this.GAUSSIAN_KERNEL[ky][kx];
            sum += data[py * width + px] * kernel;
          }
        }

        output[y * width + x] = sum;
      }
    }

    return output;
  }

  private applyEdgeDetection(data: Float32Array, width: number, height: number): Float32Array {
    const edges = new Float32Array(data.length);
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply Sobel operators
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixel = data[(y + ky - 1) * width + (x + kx - 1)];
            gx += pixel * sobelX[ky][kx];
            gy += pixel * sobelY[ky][kx];
          }
        }

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  private applyAdaptiveThreshold(data: Float32Array, width: number, height: number): Float32Array {
    const output = new Float32Array(data.length);
    const windowSize = 15;
    const offset = Math.floor(windowSize / 2);
    const C = 0.02; // Threshold adjustment constant

    for (let y = offset; y < height - offset; y++) {
      for (let x = offset; x < width - offset; x++) {
        let sum = 0;
        let count = 0;

        // Calculate local mean
        for (let wy = -offset; wy <= offset; wy++) {
          for (let wx = -offset; wx <= offset; wx++) {
            const px = x + wx;
            const py = y + wy;
            sum += data[py * width + px];
            count++;
          }
        }

        const mean = sum / count;
        const threshold = mean - C;
        output[y * width + x] = data[y * width + x] > threshold ? 1 : 0;
      }
    }

    return output;
  }

  private detectCells(data: Float32Array, imageData: ImageData): Array<{ x: number; y: number; radius: number }> {
    const cells: Array<{ x: number; y: number; radius: number }> = [];
    const visited = new Set<number>();
    const threshold = 0.2;

    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {
        const i = y * this.canvas.width + x;
        if (!visited.has(i) && data[i] > threshold) {
          const region = this.growRegion(data, this.canvas.width, this.canvas.height, x, y, visited);
          if (region && region.size > 100) { // Minimum cell size
            cells.push({
              x: region.centerX,
              y: region.centerY,
              radius: Math.sqrt(region.size / Math.PI)
            });
          }
        }
      }
    }

    return this.mergeCells(cells);
  }

  private growRegion(
    data: Float32Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>
  ): { size: number; centerX: number; centerY: number } | null {
    const queue: [number, number][] = [[startX, startY]];
    let size = 0;
    let sumX = 0;
    let sumY = 0;
    const threshold = 0.2;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const i = y * width + x;
      
      if (visited.has(i) || data[i] <= threshold) continue;
      
      visited.add(i);
      size++;
      sumX += x;
      sumY += y;

      // Check neighbors
      const neighbors = [
        [x + 1, y], [x - 1, y],
        [x, y + 1], [x, y - 1]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = ny * width + nx;
          if (!visited.has(ni)) {
            queue.push([nx, ny]);
          }
        }
      }
    }

    return size > 0 ? {
      size,
      centerX: Math.round(sumX / size),
      centerY: Math.round(sumY / size)
    } : null;
  }

  private mergeCells(cells: Array<{ x: number; y: number; radius: number }>): Array<{ x: number; y: number; radius: number }> {
    const merged: Array<{ x: number; y: number; radius: number }> = [];
    const used = new Set<number>();

    for (let i = 0; i < cells.length; i++) {
      if (used.has(i)) continue;

      let cell = cells[i];
      used.add(i);

      // Check for overlapping cells
      for (let j = i + 1; j < cells.length; j++) {
        if (used.has(j)) continue;

        const other = cells[j];
        const distance = Math.sqrt(
          Math.pow(cell.x - other.x, 2) + Math.pow(cell.y - other.y, 2)
        );

        if (distance < (cell.radius + other.radius) * 0.5) {
          // Merge cells
          cell = {
            x: Math.round((cell.x + other.x) / 2),
            y: Math.round((cell.y + other.y) / 2),
            radius: Math.max(cell.radius, other.radius)
          };
          used.add(j);
        }
      }

      merged.push(cell);
    }

    return merged;
  }

  private analyzeCells(
    cells: Array<{ x: number; y: number; radius: number }>, 
    processedData: Float32Array,
    imageData: ImageData
  ): CellData[] {
    return cells.map((cell, index) => {
      const size = Math.PI * Math.pow(cell.radius, 2);
      const shape = this.calculateShape(cell, processedData);
      const colorDifference = this.calculateColorDifference(cell, imageData);
      
      return {
        id: index + 1,
        size,
        shape,
        colorDifference,
        location: this.determineLocation(cell),
        characteristics: this.determineCharacteristics(cell, shape, colorDifference)
      };
    });
  }

  private calculateShape(
    cell: { x: number; y: number; radius: number },
    data: Float32Array
  ): number {
    let perimeter = 0;
    let validPoints = 0;
    
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      const x = Math.round(cell.x + cell.radius * Math.cos(angle));
      const y = Math.round(cell.y + cell.radius * Math.sin(angle));
      
      if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
        validPoints++;
        if (data[y * this.canvas.width + x] > 0.5) {
          perimeter++;
        }
      }
    }
    
    return validPoints > 0 ? (4 * Math.PI * cell.radius * cell.radius) / (perimeter * perimeter) : 1;
  }

  private calculateColorDifference(
    cell: { x: number; y: number; radius: number },
    imageData: ImageData
  ): number {
    let sumR = 0, sumG = 0, sumB = 0;
    let count = 0;
    const { data } = imageData;

    for (let y = cell.y - cell.radius; y <= cell.y + cell.radius; y++) {
      for (let x = cell.x - cell.radius; x <= cell.x + cell.radius; x++) {
        if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
          const idx = (y * this.canvas.width + x) * 4;
          if (Math.pow(x - cell.x, 2) + Math.pow(y - cell.y, 2) <= Math.pow(cell.radius, 2)) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
      }
    }

    if (count === 0) return 0;

    const avgR = sumR / count;
    const avgG = sumG / count;
    const avgB = sumB / count;

    // Calculate color difference from normal cell color (assumed to be light pink/gray)
    const normalR = 220;
    const normalG = 210;
    const normalB = 210;

    return Math.sqrt(
      Math.pow(avgR - normalR, 2) +
      Math.pow(avgG - normalG, 2) +
      Math.pow(avgB - normalB, 2)
    ) / 441.67; // Normalize to 0-1 range
  }

  private determineLocation(cell: { y: number }): string {
    const y = cell.y;
    if (y < this.canvas.height / 3) return 'superior';
    if (y > (this.canvas.height * 2) / 3) return 'inferior';
    return 'central';
  }

  private determineCharacteristics(
    cell: { radius: number },
    shape: number,
    colorDifference: number
  ): string[] {
    const characteristics: string[] = [];

    // Size characteristics
    if (cell.radius > 10) characteristics.push('enlarged');
    else if (cell.radius < 4) characteristics.push('atrophied');

    // Shape characteristics
    if (shape < 0.8) characteristics.push('irregular');

    // Color/intensity characteristics
    if (colorDifference > 0.3) characteristics.push('high intensity');
    if (colorDifference > 0.5) characteristics.push('possible malignant');

    return characteristics;
  }

  private calculateStatistics(cells: CellData[]) {
    const totalCells = cells.length;
    const abnormalCells = cells.filter(c => 
      c.characteristics.includes('high intensity') ||
      c.characteristics.includes('irregular') ||
      c.characteristics.includes('enlarged')
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

  private generateDiagnosis(cells: CellData[], statistics: { infestationPercentage: number }): string {
    const malignantCount = cells.filter(c => 
      c.characteristics.includes('possible malignant')
    ).length;

    if (malignantCount > 0) {
      return `Alta suspeita de malignidade (${statistics.infestationPercentage.toFixed(1)}%) - ${malignantCount} células com características suspeitas - Investigação necessária`;
    }
    
    if (statistics.infestationPercentage > 10) {
      const abnormalTypes = new Set(
        cells.flatMap(c => c.characteristics)
          .filter(c => ['enlarged', 'irregular', 'high intensity'].includes(c))
      );
      
      return `Alterações celulares detectadas (${statistics.infestationPercentage.toFixed(1)}%) - Tipos: ${Array.from(abnormalTypes).join(', ')} - Recomenda-se acompanhamento`;
    }
    
    return 'Padrão celular dentro dos parâmetros normais';
  }

  private drawAnnotations(
    cells: Array<{ x: number; y: number; radius: number }>,
    cellData: CellData[]
  ) {
    cells.forEach((cell, index) => {
      const data = cellData[index];
      
      this.ctx.beginPath();
      this.ctx.arc(cell.x, cell.y, cell.radius, 0, 2 * Math.PI);
      this.ctx.strokeStyle = data.characteristics.includes('possible malignant')
        ? '#ff0000'
        : data.characteristics.includes('high intensity')
        ? '#ff9900'
        : data.characteristics.includes('irregular')
        ? '#ff00ff'
        : '#00ff00';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Add label for abnormal cells
      if (data.characteristics.length > 0) {
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.font = '10px Arial';
        this.ctx.fillText(
          `#${data.id}: ${data.characteristics.join(', ')}`,
          cell.x - cell.radius,
          cell.y - cell.radius - 5
        );
      }
    });
  }
}