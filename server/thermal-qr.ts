import QRCode from 'qrcode';

export class ThermalQRProcessor {
  /**
   * Generate real QR code for thermal printing following DeepSeek recommendations
   * Returns the QR as printable block characters
   */
  static async generateQRCodeForThermal(data: string): Promise<string> {
    try {
      // Generate QR code as data URL using DeepSeek recommended settings
      const qrDataURL = await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      // Import canvas dynamically to avoid startup issues
      const { createCanvas, loadImage } = await import('canvas');
      
      // Load the QR code image following DeepSeek process
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext('2d');
      const img = await loadImage(qrDataURL);
      ctx.drawImage(img, 0, 0, 200, 200);
      
      // Convert to thermal printer format (similar to logo processing)
      const imageData = ctx.getImageData(0, 0, 200, 200);
      const binaryData = [];
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const value = (r + g + b) / 3 > 128 ? 0 : 1;
        binaryData.push(value);
      }
      
      let thermalQR = '';
      for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 200; x++) {
          thermalQR += binaryData[y * 200 + x] ? '█' : ' ';
        }
        thermalQR += '\n';
      }
      
      return thermalQR;
      
    } catch (error) {
      console.error('QR generation error:', error);
      throw error;
    }
  }

  /**
   * Generate simple ASCII QR code as fallback
   */
  static async generateASCIIQR(data: string): Promise<string[]> {
    try {
      const qrString = await QRCode.toString(data, {
        type: 'terminal',
        small: true
      });
      
      // Clean and return lines
      return qrString.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/\u001b\[[0-9;]*m/g, ''));
        
    } catch (error) {
      console.error('ASCII QR generation error:', error);
      return ['QR generation failed'];
    }
  }
}