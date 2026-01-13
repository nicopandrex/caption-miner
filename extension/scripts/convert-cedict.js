import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertCedict() {
const inputFile = path.join(__dirname, '..', 'cedict_ts.txt');
  const outputFile = path.join(__dirname, '..', 'public', 'cedict.json');
  
  if (!fs.existsSync(inputFile)) {
    console.error('❌ Error: cedict_ts.u8 not found in extension folder');
    console.log('Please download the file and place it in: extension/cedict_ts.u8');
    process.exit(1);
  }

  const dictionary = {};
  let count = 0;
  let lineCount = 0;

  const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('🔄 Converting CC-CEDICT to JSON...');

  for await (const line of rl) {
    lineCount++;
    
    // Show progress every 10000 lines
    if (lineCount % 10000 === 0) {
      process.stdout.write(`\r📖 Processing line ${lineCount}...`);
    }

    // Skip comments and empty lines
    if (line.startsWith('#') || line.trim() === '') continue;

    // CC-CEDICT format: 繁體 简体 [pin1 yin1] /definition1/definition2/
    const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/);
    
    if (match) {
      const [, traditional, simplified, pinyin, definitionsRaw] = match;
      const definitions = definitionsRaw.split('/').filter(d => d.trim());

      // Use simplified as key (most common in modern Chinese)
      if (!dictionary[simplified]) {
        dictionary[simplified] = {
          pinyin: pinyin,
          definitions: definitions.slice(0, 5) // Keep top 5 definitions
        };
        count++;
      }
      
      // Also add traditional if different
      if (traditional !== simplified && !dictionary[traditional]) {
        dictionary[traditional] = {
          pinyin: pinyin,
          definitions: definitions.slice(0, 5)
        };
        count++;
      }
    }
  }

  console.log(`\n\n✅ Parsed ${lineCount} lines, extracted ${count} unique entries`);

  // Write to JSON file
  console.log('💾 Writing to JSON...');
  fs.writeFileSync(outputFile, JSON.stringify(dictionary, null, 0)); // No formatting to save space
  
  const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Conversion complete!`);
  console.log(`📦 Output: ${outputFile}`);
  console.log(`📊 Size: ${fileSizeMB} MB`);
  console.log(`📚 Entries: ${count.toLocaleString()}`);
}

convertCedict().catch(console.error);
