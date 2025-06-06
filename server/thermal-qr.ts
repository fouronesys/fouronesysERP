import QRCode from 'qrcode';

export class ThermalQRProcessor {
  /**
   * Generate real QR code for thermal printing using terminal output
   * Returns the QR as printable block characters
   */
  static async generateQRCodeForThermal(data: string): Promise<string> {
    try {
      // Generate QR code using terminal format which creates block characters
      const qrString = await QRCode.toString(data, {
        type: 'terminal',
        width: 60,
        small: false,
        errorCorrectionLevel: 'M'
      });
      
      // Clean ANSI escape codes and convert to proper block characters
      const cleanedLines = qrString.split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Remove ANSI escape codes
          let cleaned = line.replace(/\u001b\[[0-9;]*m/g, '');
          // Convert spaces and filled characters to proper Unicode blocks
          cleaned = cleaned.replace(/  /g, '  '); // Keep double spaces as is
          cleaned = cleaned.replace(/██/g, '██'); // Keep filled blocks
          return cleaned;
        });
      
      return cleanedLines.join('\n');
      
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