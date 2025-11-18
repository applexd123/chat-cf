/**
 * Unit tests for PromptBuilder service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilder } from '../../src/services/prompt-builder.js';
import { createCharacterCard, createLorebook, createLorebookEntry } from '../../src/models/character-card.js';
import type { Message } from '../../src/models/message.js';

describe('PromptBuilder', () => {
  let promptBuilder: PromptBuilder;

  beforeEach(() => {
    promptBuilder = new PromptBuilder();
  });

  describe('compileStaticContext', () => {
    it('should compile static context with required fields', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello! How can I help you today?'
      );

      const context = await promptBuilder.compileStaticContext(card, 'Bob');

      expect(context.characterName).toBe('Alice');
      expect(context.description).toBe('A helpful assistant');
      expect(context.greeting).toBe('Hello! How can I help you today?');
    });

    it('should use nickname for character name when present', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );
      card.data.nickname = 'Ally';

      const context = await promptBuilder.compileStaticContext(card, 'Bob');

      expect(context.characterName).toBe('Ally');
      expect(context.characterNickname).toBe('Ally');
    });

    it('should process CBS macros in static fields', async () => {
      const card = createCharacterCard(
        'Alice',
        'My name is {{char}} and I will help {{user}}',
        'Hello {{user}}! I am {{char}}.'
      );

      const context = await promptBuilder.compileStaticContext(card, 'Bob');

      expect(context.description).toBe('My name is Alice and I will help Bob');
      expect(context.greeting).toBe('Hello Bob! I am Alice.');
    });

    it('should include optional fields when present', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );
      card.data.personality = 'Friendly and helpful';
      card.data.scenario = 'A chat conversation';
      card.data.system_prompt = 'You are a helpful assistant';

      const context = await promptBuilder.compileStaticContext(card, 'Bob');

      expect(context.personality).toBe('Friendly and helpful');
      expect(context.scenario).toBe('A chat conversation');
      expect(context.systemPrompt).toBe('You are a helpful assistant');
    });

    it('should select alternate greeting by index', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );
      card.data.alternate_greetings = ['Hi there!', 'Greetings!'];

      const context1 = await promptBuilder.compileStaticContext(card, 'Bob', 0);
      expect(context1.greeting).toBe('Hello!');

      const context2 = await promptBuilder.compileStaticContext(card, 'Bob', 1);
      expect(context2.greeting).toBe('Hi there!');

      const context3 = await promptBuilder.compileStaticContext(card, 'Bob', 2);
      expect(context3.greeting).toBe('Greetings!');
    });

    it('should process constant lorebook entries', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );
      
      const entry = createLorebookEntry(['test'], 'Constant information', 0);
      entry.constant = true;
      
      card.data.character_book = createLorebook([entry]);

      const context = await promptBuilder.compileStaticContext(card, 'Bob');

      expect(context.constantLorebookEntries).toHaveLength(1);
      expect(context.constantLorebookEntries[0].processedContent).toBe('Constant information');
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt with compiled context', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );

      const compiledContext = await promptBuilder.compileStaticContext(card, 'Bob');
      
      const messages: Message[] = [];
      
      const prompt = await promptBuilder.buildPrompt({
        compiledContext,
        messages,
        userPrompt: 'What is the weather?',
        userName: 'Bob',
      });

      // Check that the prompt contains expected content
      expect(prompt).toContain('A helpful assistant');
      expect(prompt).toContain('What is the weather?');
      expect(prompt).toContain('<|im_start|>'); // ChatML format
    });

    it('should build prompt without compiled context (fallback)', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );

      const messages: Message[] = [];
      
      const prompt = await promptBuilder.buildPrompt({
        characterCard: card,
        messages,
        userPrompt: 'What is the weather?',
        userName: 'Bob',
      });

      // Check that the prompt contains expected content
      expect(prompt).toContain('A helpful assistant');
      expect(prompt).toContain('What is the weather?');
      expect(prompt).toContain('<|im_start|>'); // ChatML format
    });

    it('should process CBS macros in user prompt', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );

      const compiledContext = await promptBuilder.compileStaticContext(card, 'Bob');
      
      const prompt = await promptBuilder.buildPrompt({
        compiledContext,
        messages: [],
        userPrompt: 'Hello {{char}}, I am {{user}}',
        userName: 'Bob',
      });

      expect(prompt).toContain('Hello Alice, I am Bob');
    });

    it('should process CBS macros in message history', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );

      const compiledContext = await promptBuilder.compileStaticContext(card, 'Bob');
      
      const messages: Message[] = [
        {
          id: '1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Hi {{char}}!',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          conversation_id: 'conv1',
          role: 'assistant',
          content: 'Hello {{user}}!',
          created_at: new Date().toISOString(),
        },
      ];
      
      const prompt = await promptBuilder.buildPrompt({
        compiledContext,
        messages,
        userPrompt: 'How are you?',
        userName: 'Bob',
      });

      expect(prompt).toContain('Hi Alice!');
      expect(prompt).toContain('Hello Bob!');
    });

    it('should include matching lorebook entries', async () => {
      const card = createCharacterCard(
        'Alice',
        'A helpful assistant',
        'Hello!'
      );
      
      const entry = createLorebookEntry(['weather'], 'Weather information: It is sunny.', 0);
      card.data.character_book = createLorebook([entry]);

      const compiledContext = await promptBuilder.compileStaticContext(card, 'Bob');
      
      const prompt = await promptBuilder.buildPrompt({
        compiledContext,
        characterCard: card,
        messages: [],
        userPrompt: 'What is the weather like?',
        userName: 'Bob',
      });

      expect(prompt).toContain('Weather information: It is sunny.');
    });

    it('should throw error if neither compiledContext nor characterCard provided', async () => {
      await expect(
        promptBuilder.buildPrompt({
          messages: [],
          userPrompt: 'Hello',
          userName: 'Bob',
        })
      ).rejects.toThrow('Either compiledContext or characterCard must be provided');
    });
  });
});
