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
      
      // Resize image to fit receipt width (200px for 80mm paper)
      const ratio = Math.min(200 / img.width, 100 / img.height);
      const width = Math.floor(img.width * ratio);
      const height = Math.floor(img.height * ratio);
      
      // Center the image on canvas
      const offsetX = Math.floor((200 - width) / 2);
      const offsetY = Math.floor((100 - height) / 2);
      
      // Clear canvas with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 100);
      
      ctx.drawImage(img, offsetX, offsetY, width, height);
      
      // Convert to 1-bit depth (black and white) for thermal printing
      const imageData = ctx.getImageData(0, 0, 200, 100);
      const binaryData = [];
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        // Convert to grayscale and apply threshold
        const grayscale = (r + g + b) / 3;
        const value = grayscale > 128 ? 0 : 1; // 0 = white, 1 = black
        binaryData.push(value);
      }
      
      // Convert to thermal printer compatible format using block characters
      const lines = [];
      for (let y = 0; y < 100; y += 2) { // Process 2 rows at a time
        let line = '';
        for (let x = 0; x < 200; x++) {
          const topPixel = binaryData[y * 200 + x] || 0;
          const bottomPixel = binaryData[(y + 1) * 200 + x] || 0;
          
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
        if (line.trim()) { // Only add non-empty lines
          lines.push(line);
        }
      }
      
      return lines.join('\n');
      
    } catch (error) {
      console.error('Logo processing error:', error);
      throw error;
    }
  }
}