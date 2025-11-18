import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateRenderer } from '../../src/services/template-renderer.js';
import type { CharacterCardData } from '../../src/models/character-card.js';
import type { Message } from '../../src/models/message.js';
import type { MatchedEntry } from '../../src/services/lorebook-engine.js';

describe('TemplateRenderer', () => {
  let renderer: TemplateRenderer;
  let mockCharacter: CharacterCardData;
  let mockMessages: Message[];

  beforeEach(() => {
    renderer = new TemplateRenderer();
    
    mockCharacter = {
      name: 'Alice',
      description: 'A friendly AI assistant',
      tags: [],
      creator: 'test',
      character_version: '1.0',
      mes_example: '',
      extensions: {},
      system_prompt: 'You are a helpful assistant.',
      post_history_instructions: '',
      first_mes: 'Hello!',
      alternate_greetings: [],
      personality: 'Friendly and helpful',
      scenario: 'A casual conversation',
      creator_notes: '',
      group_only_greetings: [],
    };

    mockMessages = [
      {
        id: '1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hi there!',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Hello! How can I help you?',
        created_at: '2024-01-01T00:00:01Z',
      },
    ];
  });

  describe('Template Registration', () => {
    it('should register a custom template', () => {
      const customTemplate = 'Hello {{ character.name }}!';
      renderer.registerTemplate('custom', customTemplate);
      
      const result = renderer.render('custom', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('Hello Alice!');
    });

    it('should throw error for invalid template syntax', () => {
      const invalidTemplate = 'Hello {{ character.name';
      
      expect(() => {
        renderer.registerTemplate('invalid', invalidTemplate);
      }).toThrow(/Failed to register template/);
    });
  });

  describe('Default Templates', () => {
    it('should have default template available', () => {
      const result = renderer.render('default', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      // Should contain character description (not name in default template)
      expect(result).toContain('A friendly AI assistant');
      expect(result).toContain('Hi there!');
    });

    it('should have ChatML template available', () => {
      const result = renderer.render('chatml', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toContain('<|im_start|>');
      expect(result).toContain('<|im_end|>');
    });

    it('should have Alpaca template available', () => {
      const result = renderer.render('alpaca', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toContain('### Instruction:');
      expect(result).toContain('### Response:');
    });

    it('should have Llama template available', () => {
      const result = renderer.render('llama', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toContain('[INST]');
      expect(result).toContain('[/INST]');
    });
  });

  describe('Template Context - Character Data', () => {
    it('should include character name in template', () => {
      const template = 'Character: {{ character.name }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('Character: Alice');
    });

    it('should include character description in template', () => {
      const template = '{{ character.description }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('A friendly AI assistant');
    });

    it('should include character personality in template', () => {
      const template = 'Personality: {{ character.personality }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('Personality: Friendly and helpful');
    });

    it('should include character scenario in template', () => {
      const template = 'Scenario: {{ character.scenario }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('Scenario: A casual conversation');
    });
  });

  describe('Template Context - Message History', () => {
    it('should include messages in template', () => {
      const template = '{% for message in messages %}{{ message.content }}\n{% endfor %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toContain('Hi there!');
      expect(result).toContain('Hello! How can I help you?');
    });

    it('should access message roles in template', () => {
      const template = '{% for message in messages %}{{ message.role }}: {{ message.content }}\n{% endfor %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toContain('user: Hi there!');
      expect(result).toContain('assistant: Hello! How can I help you?');
    });

    it('should handle empty message history', () => {
      const template = '{% for message in messages %}{{ message.content }}{% endfor %}Empty: {{ messages|length == 0 }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      // Jinja outputs lowercase 'true'
      expect(result).toBe('Empty: true');
    });
  });

  describe('Template Context - User Name', () => {
    it('should include user name in template', () => {
      const template = 'User: {{ user_name }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('User: Bob');
    });
  });

  describe('Template Context - Lorebook Entries', () => {
    it('should include lorebook entries in template', () => {
      const lorebookEntries: MatchedEntry[] = [
        {
          entry: {
            keys: ['test'],
            content: 'Test content',
            extensions: {},
            enabled: true,
            insertion_order: 0,
            use_regex: false,
          },
          decorators: {},
          processedContent: 'Test content',
        },
      ];

      const template = '{% for entry in lorebook_entries %}{{ entry.processedContent }}\n{% endfor %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries,
      });
      
      expect(result).toContain('Test content');
    });

    it('should access lorebook entry decorators in template', () => {
      const lorebookEntries: MatchedEntry[] = [
        {
          entry: {
            keys: ['test'],
            content: 'Test content',
            extensions: {},
            enabled: true,
            insertion_order: 0,
            use_regex: false,
          },
          decorators: { role: 'system' },
          processedContent: 'System message',
        },
      ];

      const template = '{% for entry in lorebook_entries %}{% if entry.decorators.role == "system" %}SYSTEM: {% endif %}{{ entry.processedContent }}{% endfor %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries,
      });
      
      expect(result).toBe('SYSTEM: System message');
    });
  });

  describe('Template Context - System Prompt', () => {
    it('should use provided system prompt over character system prompt', () => {
      const template = '{{ system_prompt }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
        systemPrompt: 'Custom system prompt',
      });
      
      expect(result).toBe('Custom system prompt');
    });

    it('should fall back to character system prompt if not provided', () => {
      const template = '{{ system_prompt }}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('You are a helpful assistant.');
    });

    it('should use empty string if no system prompt available', () => {
      const characterWithoutPrompt = { ...mockCharacter, system_prompt: '' };
      const template = 'Prompt: [{{ system_prompt }}]';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: characterWithoutPrompt,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('Prompt: []');
    });
  });

  describe('Jinja Control Structures', () => {
    it('should evaluate if statements correctly', () => {
      const template = '{% if character.personality %}Has personality{% else %}No personality{% endif %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('Has personality');
    });

    it('should evaluate for loops correctly', () => {
      const template = '{% for i in range(3) %}{{ i }} {% endfor %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: [],
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toBe('0 1 2 ');
    });

    it('should handle nested control structures', () => {
      const template = '{% for message in messages %}{% if message.role == "user" %}USER: {{ message.content }}\n{% endif %}{% endfor %}';
      renderer.registerTemplate('test', template);
      
      const result = renderer.render('test', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries: [],
      });
      
      expect(result).toContain('USER: Hi there!');
      expect(result).not.toContain('Hello! How can I help you?');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent template', () => {
      expect(() => {
        renderer.render('nonexistent', {
          character: mockCharacter,
          messages: [],
          userName: 'Bob',
          lorebookEntries: [],
        });
      }).toThrow(/Template not found: nonexistent/);
    });

    it('should return descriptive error for template rendering failure', () => {
      // Register a template with invalid Jinja syntax that will cause a rendering error
      const template = '{% for item in items %}{{ item.name }}';  // Missing endfor
      
      expect(() => {
        renderer.registerTemplate('error-test', template);
      }).toThrow(/Failed to register template 'error-test'/);
    });
  });

  describe('Integration - Full Template Rendering', () => {
    it('should render complete ChatML template with all context', () => {
      const lorebookEntries: MatchedEntry[] = [
        {
          entry: {
            keys: ['test'],
            content: 'Important context',
            extensions: {},
            enabled: true,
            insertion_order: 0,
            use_regex: false,
          },
          decorators: { role: 'system' },
          processedContent: 'Important context',
        },
      ];

      const result = renderer.render('chatml', {
        character: mockCharacter,
        messages: mockMessages,
        userName: 'Bob',
        lorebookEntries,
        systemPrompt: 'Custom system prompt',
      });
      
      // Should contain system prompt
      expect(result).toContain('Custom system prompt');
      
      // Should contain character description
      expect(result).toContain('A friendly AI assistant');
      
      // Should contain lorebook entry
      expect(result).toContain('Important context');
      
      // Should contain messages
      expect(result).toContain('Hi there!');
      expect(result).toContain('Hello! How can I help you?');
      
      // Should have proper ChatML formatting
      expect(result).toContain('<|im_start|>');
      expect(result).toContain('<|im_end|>');
    });
  });
});
