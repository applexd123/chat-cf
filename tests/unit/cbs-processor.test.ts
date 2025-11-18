import { describe, it, expect } from 'vitest';
import { CBSProcessor } from '../../src/services/cbs-processor.js';

describe('CBSProcessor', () => {
  const processor = new CBSProcessor();
  const context = {
    charName: 'Alice',
    userName: 'Bob',
    conversationId: 'test-conv-123',
  };

  describe('{{char}} replacement', () => {
    it('should replace {{char}} with character name', () => {
      const input = 'Hello, I am {{char}}!';
      const result = processor.process(input, context);
      expect(result).toBe('Hello, I am Alice!');
    });

    it('should replace multiple {{char}} occurrences', () => {
      const input = '{{char}} says: {{char}} is here!';
      const result = processor.process(input, context);
      expect(result).toBe('Alice says: Alice is here!');
    });
  });

  describe('{{user}} replacement', () => {
    it('should replace {{user}} with user name', () => {
      const input = 'Hello {{user}}, how are you?';
      const result = processor.process(input, context);
      expect(result).toBe('Hello Bob, how are you?');
    });
  });

  describe('{{random:A,B,C}} replacement', () => {
    it('should replace {{random}} with one of the options', () => {
      const input = 'I feel {{random:happy,sad,excited}}!';
      const result = processor.process(input, context);
      expect(['I feel happy!', 'I feel sad!', 'I feel excited!']).toContain(result);
    });

    it('should handle single option', () => {
      const input = '{{random:only}}';
      const result = processor.process(input, context);
      expect(result).toBe('only');
    });
  });

  describe('{{pick:A,B,C}} replacement', () => {
    it('should replace {{pick}} consistently with same seed', () => {
      const input = 'Color: {{pick:red,green,blue}}';
      const result1 = processor.process(input, context);
      const result2 = processor.process(input, context);
      expect(result1).toBe(result2);
    });

    it('should select from available options', () => {
      const input = '{{pick:apple,banana,cherry}}';
      const result = processor.process(input, context);
      expect(['apple', 'banana', 'cherry']).toContain(result);
    });
  });

  describe('{{roll:N}} replacement', () => {
    it('should replace {{roll:6}} with number between 1 and 6', () => {
      const input = 'You rolled {{roll:6}}';
      const result = processor.process(input, context);
      const match = result.match(/You rolled (\d+)/);
      expect(match).toBeTruthy();
      const num = parseInt(match![1], 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(6);
    });

    it('should replace {{roll:d20}} with number between 1 and 20', () => {
      const input = 'Roll: {{roll:d20}}';
      const result = processor.process(input, context);
      const match = result.match(/Roll: (\d+)/);
      expect(match).toBeTruthy();
      const num = parseInt(match![1], 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(20);
    });
  });

  describe('{{// comment}} removal', () => {
    it('should remove comments from text', () => {
      const input = 'Hello {{// this is a comment}} world!';
      const result = processor.process(input, context);
      expect(result).toBe('Hello  world!');
    });

    it('should remove multiple comments', () => {
      const input = '{{// start}}Text{{// middle}}More{{// end}}';
      const result = processor.process(input, context);
      expect(result).toBe('TextMore');
    });
  });

  describe('{{hidden_key:text}} removal', () => {
    it('should remove hidden keys from output', () => {
      const input = 'Hello {{hidden_key:secret}} world!';
      const result = processor.process(input, context);
      expect(result).toBe('Hello  world!');
    });

    it('should extract hidden keys', () => {
      const input = 'Text {{hidden_key:key1}} more {{hidden_key:key2}}';
      const keys = processor.extractHiddenKeys(input);
      expect(keys).toEqual(['key1', 'key2']);
    });
  });

  describe('{{reverse:text}} replacement', () => {
    it('should reverse text', () => {
      const input = '{{reverse:hello}}';
      const result = processor.process(input, context);
      expect(result).toBe('olleh');
    });

    it('should reverse multiple occurrences', () => {
      const input = '{{reverse:abc}} and {{reverse:xyz}}';
      const result = processor.process(input, context);
      expect(result).toBe('cba and zyx');
    });
  });

  describe('combined macros', () => {
    it('should handle multiple macro types in one text', () => {
      const input = '{{char}} says to {{user}}: {{// comment}} {{reverse:hi}}!';
      const result = processor.process(input, context);
      expect(result).toBe('Alice says to Bob:  ih!');
    });
  });
});
