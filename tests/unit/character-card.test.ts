import { describe, it, expect } from 'vitest';
import {
  createCharacterCard,
  validateCharacterCard,
  extractRequiredFields,
  createLorebookEntry,
  createLorebook,
  type CharacterCardV3,
  type LorebookEntry,
  type Lorebook,
} from '../../src/models/character-card.js';

describe('Character Card Types', () => {
  describe('createCharacterCard', () => {
    it('should create a valid minimal character card', () => {
      const card = createCharacterCard('Alice', 'A friendly AI', 'Hello!');
      
      expect(card.spec).toBe('chara_card_v3');
      expect(card.spec_version).toBe('3.0');
      expect(card.data.name).toBe('Alice');
      expect(card.data.description).toBe('A friendly AI');
      expect(card.data.first_mes).toBe('Hello!');
    });
  });

  describe('validateCharacterCard', () => {
    it('should validate a valid character card', () => {
      const card = createCharacterCard('Bob', 'A helpful assistant', 'Hi there!');
      expect(validateCharacterCard(card)).toBe(true);
    });

    it('should reject invalid spec', () => {
      const invalid = { spec: 'wrong', spec_version: '3.0', data: {} };
      expect(validateCharacterCard(invalid)).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalid = {
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: { name: 'Test' }, // missing description and first_mes
      };
      expect(validateCharacterCard(invalid)).toBe(false);
    });
  });

  describe('extractRequiredFields', () => {
    it('should extract required fields correctly', () => {
      const card = createCharacterCard('Charlie', 'A smart bot', 'Greetings!');
      const fields = extractRequiredFields(card);
      
      expect(fields.name).toBe('Charlie');
      expect(fields.description).toBe('A smart bot');
      expect(fields.first_mes).toBe('Greetings!');
    });
  });

  describe('createLorebookEntry', () => {
    it('should create a valid lorebook entry', () => {
      const entry = createLorebookEntry(['key1', 'key2'], 'Some content', 5);
      
      expect(entry.keys).toEqual(['key1', 'key2']);
      expect(entry.content).toBe('Some content');
      expect(entry.insertion_order).toBe(5);
      expect(entry.enabled).toBe(true);
      expect(entry.use_regex).toBe(false);
    });
  });

  describe('createLorebook', () => {
    it('should create an empty lorebook', () => {
      const lorebook = createLorebook();
      
      expect(lorebook.entries).toEqual([]);
      expect(lorebook.extensions).toEqual({});
    });

    it('should create a lorebook with entries', () => {
      const entry1 = createLorebookEntry(['test'], 'content1', 0);
      const entry2 = createLorebookEntry(['test2'], 'content2', 1);
      const lorebook = createLorebook([entry1, entry2]);
      
      expect(lorebook.entries).toHaveLength(2);
      expect(lorebook.entries[0].content).toBe('content1');
      expect(lorebook.entries[1].content).toBe('content2');
    });
  });
});

describe('Dependencies', () => {
  it('should have @huggingface/jinja available', async () => {
    const jinja = await import('@huggingface/jinja');
    expect(jinja).toBeDefined();
    expect(jinja.Template).toBeDefined();
  });

  it('should have fast-check available', async () => {
    const fc = await import('fast-check');
    expect(fc).toBeDefined();
    expect(fc.assert).toBeDefined();
  });
});
