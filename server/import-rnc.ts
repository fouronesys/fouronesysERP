import { parseAndImportRNCFile } from './rnc-parser';

async function main() {
  try {
    console.log('Starting complete RNC registry import from DGII file...');
    console.log('File contains 736,890 authentic DGII records');
    
    const result = await parseAndImportRNCFile('../attached_assets/DGII_RNC.TXT');
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Total records processed: ${result.total}`);
    console.log(`Successfully imported: ${result.imported}`);
    console.log(`Completion rate: ${((result.imported / result.total) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('RNC import failed:', error);
    process.exit(1);
  }
}

main();