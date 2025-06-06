import fs from 'fs';
import sharp from 'sharp';

export class ThermalLogoProcessor {
  /**
   * Convert PNG logo to thermal printer format using Sharp
   * Returns the logo as printable block characters for thermal receipts
   */
  static async convertPNGToThermal(logoPath: string): Promise<string> {
    try {
      if (!fs.existsSync(logoPath)) {
        throw new Error('Logo file not found');
      }

      // Process image with Sharp
      const { data, info } = await sharp(logoPath)
        .resize(200, 100, { 
          fit: 'inside', 
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .greyscale()
        .threshold(128) // Convert to black and white
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { width, height } = info;
      
      // Convert to thermal printer compatible format using block characters
      const lines = [];
      for (let y = 0; y < height; y += 2) { // Process 2 rows at a time
        let line = '';
        for (let x = 0; x < width; x++) {
          const topPixel = y < height ? (data[y * width + x] < 128 ? 1 : 0) : 0;
          const bottomPixel = (y + 1) < height ? (data[(y + 1) * width + x] < 128 ? 1 : 0) : 0;
          
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