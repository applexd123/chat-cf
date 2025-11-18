/**
 * Unit tests for Lorebook Engine
 */

import { describe, it, expect } from 'vitest';
import { LorebookEngine } from '../../src/services/lorebook-engine.js';
import type {
  Lorebook,
  LorebookEntry,
  CharacterCardData,
} from '../../src/models/character-card.js';
import type { Message } from '../../src/models/message.js';
import type { LorebookContext } from '../../src/services/lorebook-engine.js';

describe('LorebookEngine', () => {
  const engine = new LorebookEngine();

  const createMockCharacterCard = (): CharacterCardData => ({
    name: 'Test Character',
    description: 'A test character',
    tags: [],
    creator: 'Test',
    character_version: '1.0',
    mes_example: '',
    extensions: {},
    system_prompt: '',
    post_history_instructions: '',
    first_mes: 'Hello!',
    alternate_greetings: [],
    personality: '',
    scenario: '',
    creator_notes: '',
    group_only_greetings: [],
  });

  const createMockMessage = (content: string, role: 'user' | 'assistant' = 'user'): Message => ({
    id: crypto.randomUUID(),
    conversation_id: crypto.randomUUID(),
    role,
    content,
    created_at: new Date().toISOString(),
  });

  describe('Enabled flag checking', () => {
    it('should exclude disabled entries', () => {
      const entry: LorebookEntry = {
        keys: ['test'],
        content: 'Test content',
        extensions: {},
        enabled: false,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This contains test keyword',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);
    });

    it('should include enabled entries that match', () => {
      const entry: LorebookEntry = {
        keys: ['test'],
        content: 'Test content',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This contains test keyword',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].processedContent).toBe('Test content');
    });
  });

  describe('Constant entry handling', () => {
    it('should always include constant entries regardless of key matches', () => {
      const entry: LorebookEntry = {
        keys: ['nonexistent'],
        content: 'Constant content',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This does not contain the key',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].processedContent).toBe('Constant content');
    });
  });

  describe('Literal string matching', () => {
    it('should match keys using literal string matching (case-insensitive by default)', () => {
      const entry: LorebookEntry = {
        keys: ['dragon'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The DRAGON flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
    });

    it('should not match when key is not present', () => {
      const entry: LorebookEntry = {
        keys: ['dragon'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The bird flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Case-sensitive matching', () => {
    it('should respect case sensitivity when case_sensitive is true', () => {
      const entry: LorebookEntry = {
        keys: ['Dragon'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        case_sensitive: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);
    });

    it('should match when case matches exactly with case_sensitive true', () => {
      const entry: LorebookEntry = {
        keys: ['Dragon'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        case_sensitive: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The Dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Regex matching', () => {
    it('should match using regex patterns when use_regex is true', () => {
      const entry: LorebookEntry = {
        keys: ['drag.*n'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
    });

    it('should handle case-insensitive regex by default', () => {
      const entry: LorebookEntry = {
        keys: ['DRAGON'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
    });

    it('should respect case sensitivity in regex when case_sensitive is true', () => {
      const entry: LorebookEntry = {
        keys: ['Dragon'],
        content: 'Dragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: true,
        case_sensitive: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);
    });
  });

  describe('Entry sorting', () => {
    it('should sort entries by insertion_order', () => {
      const entry1: LorebookEntry = {
        keys: ['key'],
        content: 'Content 1',
        extensions: {},
        enabled: true,
        insertion_order: 2,
        use_regex: false,
      };

      const entry2: LorebookEntry = {
        keys: ['key'],
        content: 'Content 2',
        extensions: {},
        enabled: true,
        insertion_order: 1,
        use_regex: false,
      };

      const entry3: LorebookEntry = {
        keys: ['key'],
        content: 'Content 3',
        extensions: {},
        enabled: true,
        insertion_order: 3,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry1, entry2, entry3],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This contains key',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(3);
      expect(matches[0].processedContent).toBe('Content 2');
      expect(matches[1].processedContent).toBe('Content 1');
      expect(matches[2].processedContent).toBe('Content 3');
    });

    it('should sort by priority first, then insertion_order', () => {
      const entry1: LorebookEntry = {
        keys: ['key'],
        content: 'Low priority, low order',
        extensions: {},
        enabled: true,
        insertion_order: 1,
        use_regex: false,
        priority: 1,
      };

      const entry2: LorebookEntry = {
        keys: ['key'],
        content: 'High priority, high order',
        extensions: {},
        enabled: true,
        insertion_order: 2,
        use_regex: false,
        priority: 10,
      };

      const entry3: LorebookEntry = {
        keys: ['key'],
        content: 'High priority, low order',
        extensions: {},
        enabled: true,
        insertion_order: 1,
        use_regex: false,
        priority: 10,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry1, entry2, entry3],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This contains key',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(3);
      // Priority 10 entries come first
      expect(matches[0].processedContent).toBe('High priority, low order');
      expect(matches[1].processedContent).toBe('High priority, high order');
      // Priority 1 entry comes last
      expect(matches[2].processedContent).toBe('Low priority, low order');
    });
  });

  describe('Decorator parsing', () => {
    it('should parse @@depth decorator', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@depth 5\nContent with depth',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.depth).toBe(5);
      expect(matches[0].processedContent).toBe('Content with depth');
    });

    it('should parse @@role decorator', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@role assistant\nContent with role',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.role).toBe('assistant');
      expect(matches[0].processedContent).toBe('Content with role');
    });

    it('should parse @@activate_only_after decorator', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@activate_only_after 3\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 2,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0); // Should not match because assistantMessageCount < 3
    });

    it('should include entry when @@activate_only_after condition is met', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@activate_only_after 3\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 3,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.activate_only_after).toBe(3);
    });

    it('should parse @@position decorator', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@position after_desc\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.position).toBe('after_desc');
    });

    it('should parse @@scan_depth decorator', () => {
      const entry: LorebookEntry = {
        keys: ['dragon'],
        content: '@@scan_depth 2\nDragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const messages = [
        createMockMessage('Old message with dragon'),
        createMockMessage('Recent message 1'),
        createMockMessage('Recent message 2 with dragon'),
      ];

      const context: LorebookContext = {
        messages,
        characterCard: createMockCharacterCard(),
        scanText: messages.map(m => m.content).join(' '),
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.scan_depth).toBe(2);
    });

    it('should parse @@additional_keys decorator', () => {
      const entry: LorebookEntry = {
        keys: ['primary'],
        content: '@@additional_keys [extra, bonus]\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This contains extra keyword',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.additional_keys).toEqual([['extra', 'bonus']]);
      expect(matches[0].processedContent).toBe('Content');
    });

    it('should match on additional_keys when primary keys do not match', () => {
      const entry: LorebookEntry = {
        keys: ['primary'],
        content: '@@additional_keys [extra, bonus]\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'This contains bonus keyword',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
    });

    it('should parse @@exclude_keys decorator', () => {
      const entry: LorebookEntry = {
        keys: ['dragon'],
        content: '@@exclude_keys [baby, young]\nDragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.exclude_keys).toEqual([['baby', 'young']]);
    });

    it('should not match when exclude_keys are present', () => {
      const entry: LorebookEntry = {
        keys: ['dragon'],
        content: '@@exclude_keys [baby, young]\nDragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The baby dragon flies overhead',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);
    });

    it('should parse @@activate decorator', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@activate\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.activate).toBe(true);
    });

    it('should parse @@dont_activate decorator and exclude entry', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@dont_activate\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);
    });

    it('should parse @@activate_only_every decorator', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: '@@activate_only_every 3\nContent',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        constant: true,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      // Test with assistantMessageCount = 3 (should match)
      let context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 3,
      };

      let matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.activate_only_every).toBe(3);

      // Test with assistantMessageCount = 4 (should not match)
      context = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 4,
      };

      matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(0);

      // Test with assistantMessageCount = 6 (should match)
      context = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: '',
        assistantMessageCount: 6,
      };

      matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
    });

    it('should parse multiple decorators together', () => {
      const entry: LorebookEntry = {
        keys: ['dragon'],
        content: '@@depth 3\n@@role system\n@@position after_desc\n@@additional_keys [wyrm, drake]\nDragon lore',
        extensions: {},
        enabled: true,
        insertion_order: 0,
        use_regex: false,
      };

      const lorebook: Lorebook = {
        extensions: {},
        entries: [entry],
      };

      const context: LorebookContext = {
        messages: [],
        characterCard: createMockCharacterCard(),
        scanText: 'The wyrm appears',
        assistantMessageCount: 0,
      };

      const matches = engine.findMatches(lorebook, context);
      expect(matches).toHaveLength(1);
      expect(matches[0].decorators.depth).toBe(3);
      expect(matches[0].decorators.role).toBe('system');
      expect(matches[0].decorators.position).toBe('after_desc');
      expect(matches[0].decorators.additional_keys).toEqual([['wyrm', 'drake']]);
      expect(matches[0].processedContent).toBe('Dragon lore');
    });
  });
});
