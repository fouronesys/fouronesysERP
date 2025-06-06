import QRCode from 'qrcode';
import { createCanvas } from 'canvas';

export class ThermalQRProcessor {
  /**
   * Generate real QR code for thermal printing
   * Returns the QR as ESC/POS bitmap commands
   */
  static async generateQRCodeForThermal(data: string): Promise<string> {
    try {
      // Generate QR code as PNG buffer
      const qrBuffer = await QRCode.toBuffer(data, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Convert to base64 for thermal printer
      const base64QR = qrBuffer.toString('base64');
      
      // Return ESC/POS bitmap command with the actual QR code
      return `\x1D\x76\x30\x00${base64QR}`;
      
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