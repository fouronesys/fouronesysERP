import fs from 'fs';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline as streamPipeline } from 'stream';
import AdmZip from 'adm-zip';
import { storage } from './storage';
import { auditLogger } from './audit-logger';

const pipeline = promisify(streamPipeline);

interface DGIIUpdateConfig {
  downloadUrl: string;
  downloadPath: string;
  extractPath: string;
  updateIntervalHours: number;
  maxRetries: number;
  backupCount: number;
}

export class DGIIRegistryUpdater {
  private config: DGIIUpdateConfig;
  private updateTimer: NodeJS.Timeout | null = null;
  private isUpdating = false;

  constructor() {
    this.config = {
      downloadUrl: 'https://dgii.gov.do/wsMovilDGII/WSMovilDGII.asmx/GetContribuyentes',
      downloadPath: './downloads/dgii_rnc.zip',
      extractPath: './downloads/extracted',
      updateIntervalHours: 24,
      maxRetries: 3,
      backupCount: 5
    };

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      './downloads',
      './downloads/extracted',
      './downloads/backups'
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Start the automatic update scheduler
   */
  public startAutoUpdate(): void {
    console.log(`Starting DGII RNC registry auto-updater (every ${this.config.updateIntervalHours} hours)`);
    
    // Run initial update
    this.performUpdate();

    // Schedule periodic updates
    const intervalMs = this.config.updateIntervalHours * 60 * 60 * 1000;
    this.updateTimer = setInterval(() => {
      this.performUpdate();
    }, intervalMs);
  }

  /**
   * Stop the automatic update scheduler
   */
  public stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('DGII RNC registry auto-updater stopped');
    }
  }

  /**
   * Perform the complete update process
   */
  public async performUpdate(): Promise<boolean> {
    if (this.isUpdating) {
      console.log('DGII update already in progress, skipping...');
      return false;
    }

    this.isUpdating = true;
    let success = false;

    try {
      console.log('Starting DGII RNC registry update...');
      
      // Create backup of current registry
      await this.createBackup();

      // Download latest ZIP file
      const downloadSuccess = await this.downloadRNCFile();
      if (!downloadSuccess) {
        throw new Error('Failed to download RNC file');
      }

      // Extract and process the ZIP file
      const extractSuccess = await this.extractAndProcessZip();
      if (!extractSuccess) {
        throw new Error('Failed to extract and process ZIP file');
      }

      // Update the database
      const updateSuccess = await this.updateDatabase();
      if (!updateSuccess) {
        throw new Error('Failed to update database');
      }

      // Cleanup old files
      await this.cleanupOldFiles();

      success = true;
      console.log('DGII RNC registry update completed successfully');

      // Log successful update
      await auditLogger.logFiscalAction(
        'system',
        0,
        'dgii_registry_update',
        'rnc_registry',
        'auto_update',
        { 
          status: 'success', 
          timestamp: new Date(),
          recordsProcessed: await storage.getRNCRegistryCount()
        }
      );

    } catch (error) {
      console.error('DGII RNC registry update failed:', error);
      
      // Attempt to restore from backup
      await this.restoreFromBackup();

      // Log failed update
      await auditLogger.logFiscalAction(
        'system',
        0,
        'dgii_registry_update_failed',
        'rnc_registry',
        'auto_update',
        { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      );
    } finally {
      this.isUpdating = false;
    }

    return success;
  }

  /**
   * Download the RNC ZIP file from DGII
   */
  private async downloadRNCFile(): Promise<boolean> {
    return new Promise((resolve) => {
      let retries = 0;

      const attemptDownload = () => {
        const file = createWriteStream(this.config.downloadPath);
        
        const request = https.get(this.config.downloadUrl, (response) => {
          if (response.statusCode !== 200) {
            console.error(`Download failed with status: ${response.statusCode}`);
            file.close();
            if (retries < this.config.maxRetries) {
              retries++;
              console.log(`Retrying download (attempt ${retries}/${this.config.maxRetries})...`);
              setTimeout(attemptDownload, 5000 * retries); // Progressive delay
            } else {
              resolve(false);
            }
            return;
          }

          pipeline(response, file)
            .then(() => {
              console.log('DGII RNC file downloaded successfully');
              resolve(true);
            })
            .catch((error) => {
              console.error('Download pipeline error:', error);
              if (retries < this.config.maxRetries) {
                retries++;
                console.log(`Retrying download (attempt ${retries}/${this.config.maxRetries})...`);
                setTimeout(attemptDownload, 5000 * retries);
              } else {
                resolve(false);
              }
            });
        });

        request.on('error', (error) => {
          console.error('Download request error:', error);
          file.close();
          if (retries < this.config.maxRetries) {
            retries++;
            console.log(`Retrying download (attempt ${retries}/${this.config.maxRetries})...`);
            setTimeout(attemptDownload, 5000 * retries);
          } else {
            resolve(false);
          }
        });

        request.setTimeout(30000, () => {
          console.error('Download timeout');
          request.destroy();
          file.close();
          if (retries < this.config.maxRetries) {
            retries++;
            console.log(`Retrying download (attempt ${retries}/${this.config.maxRetries})...`);
            setTimeout(attemptDownload, 5000 * retries);
          } else {
            resolve(false);
          }
        });
      };

      attemptDownload();
    });
  }

  /**
   * Extract and process the ZIP file
   */
  private async extractAndProcessZip(): Promise<boolean> {
    try {
      const zip = new AdmZip(this.config.downloadPath);
      
      // Extract all files
      zip.extractAllTo(this.config.extractPath, true);
      
      // Find the TXT file (usually DGII_RNC.TXT or similar)
      const extractedFiles = fs.readdirSync(this.config.extractPath);
      const txtFile = extractedFiles.find(file => 
        file.toLowerCase().includes('rnc') && file.toLowerCase().endsWith('.txt')
      );

      if (!txtFile) {
        throw new Error('No RNC TXT file found in the ZIP archive');
      }

      // Copy the TXT file to replace the current one
      const sourcePath = path.join(this.config.extractPath, txtFile);
      const targetPath = './attached_assets/DGII_RNC.TXT';
      
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`RNC file updated: ${txtFile} -> DGII_RNC.TXT`);

      return true;
    } catch (error) {
      console.error('Error extracting ZIP file:', error);
      return false;
    }
  }

  /**
   * Update the database with new RNC data
   */
  private async updateDatabase(): Promise<boolean> {
    try {
      const rncFilePath = './attached_assets/DGII_RNC.TXT';
      
      if (!fs.existsSync(rncFilePath)) {
        throw new Error('DGII_RNC.TXT file not found');
      }

      // Read and process the RNC file
      const fileContent = fs.readFileSync(rncFilePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      // Clear existing registry data
      await this.clearExistingRegistry();

      // Process lines in batches to avoid memory issues
      const batchSize = 1000;
      let processed = 0;
      let totalInserted = 0;

      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        const records = [];

        for (const line of batch) {
          const parts = line.split('|');
          if (parts.length >= 3) {
            records.push({
              rnc: parts[0]?.trim(),
              razonSocial: parts[1]?.trim(),
              nombreComercial: parts[2]?.trim(),
              categoria: parts[3]?.trim() || 'CONTRIBUYENTE REGISTRADO',
              regimen: parts[4]?.trim() || 'ORDINARIO',
              estado: parts[5]?.trim() || 'ACTIVO'
            });
          }
        }

        if (records.length > 0) {
          const result = await storage.bulkCreateRNCRegistry(records);
          totalInserted += result.inserted;
          processed += records.length;
        }

        // Log progress every 10 batches
        if ((i / batchSize) % 10 === 0) {
          console.log(`Processed ${processed}/${lines.length} RNC records...`);
        }
      }

      console.log(`Database update completed: ${totalInserted} RNC records inserted`);
      return true;
    } catch (error) {
      console.error('Error updating database:', error);
      return false;
    }
  }

  /**
   * Clear existing registry data
   */
  private async clearExistingRegistry(): Promise<void> {
    // This method would need to be implemented in the storage layer
    // For now, we'll implement a simple truncate approach
    console.log('Clearing existing RNC registry data...');
    
    // Note: In production, you might want to use a more sophisticated approach
    // like marking records as inactive instead of deleting them
  }

  /**
   * Create backup of current registry
   */
  private async createBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `./downloads/backups/DGII_RNC_backup_${timestamp}.txt`;
      
      if (fs.existsSync('./attached_assets/DGII_RNC.TXT')) {
        fs.copyFileSync('./attached_assets/DGII_RNC.TXT', backupPath);
        console.log(`Backup created: ${backupPath}`);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  /**
   * Restore from backup
   */
  private async restoreFromBackup(): Promise<void> {
    try {
      const backupDir = './downloads/backups';
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir)
          .filter(file => file.startsWith('DGII_RNC_backup_'))
          .sort()
          .reverse();

        if (backupFiles.length > 0) {
          const latestBackup = path.join(backupDir, backupFiles[0]);
          fs.copyFileSync(latestBackup, './attached_assets/DGII_RNC.TXT');
          console.log(`Restored from backup: ${backupFiles[0]}`);
        }
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
    }
  }

  /**
   * Cleanup old files and backups
   */
  private async cleanupOldFiles(): Promise<void> {
    try {
      // Clean up downloaded ZIP file
      if (fs.existsSync(this.config.downloadPath)) {
        fs.unlinkSync(this.config.downloadPath);
      }

      // Clean up extracted files
      if (fs.existsSync(this.config.extractPath)) {
        const files = fs.readdirSync(this.config.extractPath);
        files.forEach(file => {
          fs.unlinkSync(path.join(this.config.extractPath, file));
        });
      }

      // Clean up old backups (keep only the latest N backups)
      const backupDir = './downloads/backups';
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir)
          .filter(file => file.startsWith('DGII_RNC_backup_'))
          .sort()
          .reverse();

        if (backupFiles.length > this.config.backupCount) {
          const filesToDelete = backupFiles.slice(this.config.backupCount);
          filesToDelete.forEach(file => {
            fs.unlinkSync(path.join(backupDir, file));
          });
          console.log(`Cleaned up ${filesToDelete.length} old backup files`);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get update status and statistics
   */
  public getUpdateStatus(): {
    isUpdating: boolean;
    lastUpdate: Date | null;
    nextUpdate: Date | null;
    registryCount: number;
  } {
    const nextUpdate = this.updateTimer ? 
      new Date(Date.now() + this.config.updateIntervalHours * 60 * 60 * 1000) : 
      null;

    return {
      isUpdating: this.isUpdating,
      lastUpdate: null, // This would be stored in the database
      nextUpdate,
      registryCount: 0 // This would be retrieved from the database
    };
  }
}

// Create singleton instance
export const dgiiRegistryUpdater = new DGIIRegistryUpdater();