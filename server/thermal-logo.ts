import fs from 'fs';
import sharp from 'sharp';

export class ThermalLogoProcessor {
  /**
   * Convert PNG logo to thermal printer format
   * Returns the logo as ESC/POS bitmap commands
   */
  static async convertPNGToThermal(logoPath: string): Promise<string> {
    try {
      if (!fs.existsSync(logoPath)) {
        throw new Error('Logo file not found');
      }

      // Read and process the PNG
      const imageBuffer = await sharp(logoPath)
        .resize(384, 120, { // Standard thermal printer logo size
          fit: 'inside',
          withoutEnlargement: true
        })
        .greyscale()
        .threshold(128) // Convert to black and white
        .png()
        .toBuffer();

      // Convert to base64 for thermal printer
      const base64Image = imageBuffer.toString('base64');
      
      // Return ESC/POS bitmap command with the actual image data
      return `\x1D\x76\x30\x00${base64Image}`;
      
    } catch (error) {
      console.error('Logo processing error:', error);
      throw error;
    }
  }
}