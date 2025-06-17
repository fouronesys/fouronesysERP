import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

export async function generateSocialPreview() {
  try {
    // Canvas dimensions for optimal social media preview (1.91:1 ratio)
    const width = 1200;
    const height = 630;
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Create dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e293b'); // Dark slate
    gradient.addColorStop(0.5, '#334155'); // Medium slate
    gradient.addColorStop(1, '#1e293b'); // Dark slate
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    for (let i = 0; i < width; i += 60) {
      for (let j = 0; j < height; j += 60) {
        ctx.fillRect(i, j, 30, 30);
      }
    }
    
    try {
      // Load and draw logo
      const logoPath = path.join(process.cwd(), 'client/public/logo-social.png');
      const logo = await loadImage(logoPath);
      
      // Calculate logo size and position (centered, taking up about 1/3 of width)
      const logoWidth = Math.min(400, width * 0.4);
      const logoHeight = (logo.height / logo.width) * logoWidth;
      const logoX = (width - logoWidth) / 2;
      const logoY = height * 0.25; // Position logo in upper third
      
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    } catch (logoError) {
      console.log('Logo not found, creating text-based preview');
      
      // Fallback: Create text-based logo
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Four One', width / 2, height * 0.35);
      
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 60px Arial';
      ctx.fillText('Solutions', width / 2, height * 0.45);
    }
    
    // Add main title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sistema ERP Empresarial', width / 2, height * 0.65);
    
    // Add subtitle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '32px Arial';
    ctx.fillText('Para República Dominicana', width / 2, height * 0.75);
    
    // Add feature highlights
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Facturación NCF • Inventario • POS • Contabilidad', width / 2, height * 0.85);
    
    // Add subtle border
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    
    // Save the image
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '../client/public/social-preview.png');
    
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    
    console.log('Social media preview image generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating social preview:', error);
    return false;
  }
}

// Generate the image when this module is loaded
generateSocialPreview().then(() => {
  console.log('Social preview generation completed');
}).catch(error => {
  console.error('Failed to generate social preview:', error);
});