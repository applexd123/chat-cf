/**
 * Seed script to populate database with example character cards
 * 
 * Usage:
 *   pnpm run seed:characters
 * 
 * This script loads example character cards from the examples/character-cards directory
 * and inserts them into the local D1 database.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createId } from '@paralleldrive/cuid2';

interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: any;
}

async function loadCharacterCards(): Promise<Array<{ filename: string; card: CharacterCardV3 }>> {
  const examplesDir = join(process.cwd(), 'examples', 'character-cards');
  
  try {
    const files = await readdir(examplesDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const cards = await Promise.all(
      jsonFiles.map(async (filename) => {
        const content = await readFile(join(examplesDir, filename), 'utf-8');
        const card = JSON.parse(content) as CharacterCardV3;
        return { filename, card };
      })
    );
    
    return cards;
  } catch (error) {
    console.error('Error loading character cards:', error);
    throw error;
  }
}

async function seedDatabase() {
  console.log('🌱 Starting character card seeding...\n');
  
  // Load all example cards
  const cards = await loadCharacterCards();
  console.log(`Found ${cards.length} character card(s) to seed\n`);
  
  // Generate SQL INSERT statements
  const insertStatements: string[] = [];
  const now = new Date().toISOString();
  
  for (const { filename, card } of cards) {
    const id = createId();
    const name = card.data.name;
    const dataJson = JSON.stringify(card).replace(/'/g, "''"); // Escape single quotes for SQL
    
    const sql = `INSERT INTO character_cards (id, name, data, created_at, modified_at) VALUES ('${id}', '${name}', '${dataJson}', '${now}', '${now}');`;
    insertStatements.push(sql);
    
    console.log(`✓ Prepared: ${filename} (${name})`);
  }
  
  console.log('\n📝 Generated SQL statements:\n');
  console.log('-- Character Card Seed Data');
  console.log('-- Run this SQL against your D1 database\n');
  console.log(insertStatements.join('\n\n'));
  
  console.log('\n\n📋 To apply these seeds:');
  console.log('1. Copy the SQL statements above');
  console.log('2. Run: wrangler d1 execute DB --local --command="<paste SQL here>"');
  console.log('   OR');
  console.log('3. Save to a file and run: wrangler d1 execute DB --local --file=seed.sql');
  console.log('\n✅ Seed preparation complete!');
}

// Run the seed script
seedDatabase().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
