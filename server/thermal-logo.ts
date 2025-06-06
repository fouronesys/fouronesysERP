import fs from 'fs';

export class ThermalLogoProcessor {
  /**
   * Convert PNG logo to thermal printer format following DeepSeek recommendations
   * Returns the logo as printable block characters for thermal receipts
   */
  static async convertPNGToThermal(logoPath: string): Promise<string> {
    try {
      if (!fs.existsSync(logoPath)) {
        throw new Error('Logo file not found');
      }

      // Import canvas dynamically to avoid startup issues
      const { createCanvas, loadImage } = await import('canvas');
      
      // Create canvas for image processing (DeepSeek recommended size)
      const canvas = createCanvas(200, 100);
      const ctx = canvas.getContext('2d');
      const img = await loadImage(logoPath);
      
      // Resize image to fit receipt width (48 chars for thermal receipt)
      const targetWidth = 48;
      const targetHeight = 24;
      const ratio = Math.min(targetWidth / img.width, targetHeight / img.height);
      const width = Math.floor(img.width * ratio);
      const height = Math.floor(img.height * ratio);
      
      // Create smaller canvas for better results
      const smallCanvas = createCanvas(width, height);
      const smallCtx = smallCanvas.getContext('2d');
      
      // Clear canvas with white background
      smallCtx.fillStyle = 'white';
      smallCtx.fillRect(0, 0, width, height);
      
      smallCtx.drawImage(img, 0, 0, width, height);
      
      // Convert to 1-bit depth (black and white) for thermal printing
      const imageData = smallCtx.getImageData(0, 0, width, height);
      const binaryData = [];
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const alpha = imageData.data[i + 3];
        
        // Handle transparency as white
        if (alpha < 128) {
          binaryData.push(0); // Transparent = white
        } else {
          // Convert to grayscale and apply threshold
          const grayscale = (r + g + b) / 3;
          const value = grayscale < 128 ? 1 : 0; // Invert: dark = 1, light = 0
          binaryData.push(value);
        }
      }
      
      // Convert to thermal printer compatible format using block characters
      const lines = [];
      for (let y = 0; y < height; y += 2) { // Process 2 rows at a time
        let line = '';
        for (let x = 0; x < width; x++) {
          const topPixel = binaryData[y * width + x] || 0;
          const bottomPixel = ((y + 1) < height) ? (binaryData[(y + 1) * width + x] || 0) : 0;
          
          // Use Unicode block characters for better thermal printing
          if (topPixel && bottomPixel) {
            line += '█'; // Full block
          } else if (topPixel) {
            line += '▀'; // Upper half block
          } else if (bottomPixel) {
            line += '▄'; // Lower half block
          } else {
            line += ' '; // Space
          }
        }
        lines.push(line); // Include all lines, even empty ones for proper spacing
      }
      
      return lines.join('\n');
      
    } catch (error) {
      console.error('Logo processing error:', error);
      throw error;
    }
  }
}