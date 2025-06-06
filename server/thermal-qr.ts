import QRCode from 'qrcode';

export class ThermalQRProcessor {
  /**
   * Generate real QR code for thermal printing following DeepSeek recommendations
   * Returns the QR as printable block characters
   */
  static async generateQRCodeForThermal(data: string): Promise<string> {
    try {
      // Generate QR code as data URL with appropriate size for thermal receipts
      const qrDataURL = await QRCode.toDataURL(data, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'L'
      });
      
      // Import canvas dynamically to avoid startup issues
      const { createCanvas, loadImage } = await import('canvas');
      
      // Create smaller QR for thermal receipts (30x30 characters)
      const qrSize = 30;
      const canvas = createCanvas(qrSize, qrSize);
      const ctx = canvas.getContext('2d');
      const img = await loadImage(qrDataURL);
      ctx.drawImage(img, 0, 0, qrSize, qrSize);
      
      // Convert to thermal printer format
      const imageData = ctx.getImageData(0, 0, qrSize, qrSize);
      const binaryData = [];
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const value = (r + g + b) / 3 < 128 ? 1 : 0; // Dark pixels = 1
        binaryData.push(value);
      }
      
      // Convert to block characters
      const lines = [];
      for (let y = 0; y < qrSize; y += 2) {
        let line = '';
        for (let x = 0; x < qrSize; x++) {
          const topPixel = binaryData[y * qrSize + x] || 0;
          const bottomPixel = ((y + 1) < qrSize) ? (binaryData[(y + 1) * qrSize + x] || 0) : 0;
          
          if (topPixel && bottomPixel) {
            line += '█';
          } else if (topPixel) {
            line += '▀';
          } else if (bottomPixel) {
            line += '▄';
          } else {
            line += ' ';
          }
        }
        lines.push(line);
      }
      
      return lines.join('\n');
      
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