/**
 * CBS (Curly Braced Syntax) Macro Processor
 * Handles replacement of macros like {{char}}, {{user}}, {{random:A,B,C}}, etc.
 */

export interface CBSContext {
  charName: string;
  userName: string;
  conversationId?: string;
}

export class CBSProcessor {
  /**
   * Process all CBS macros in text
   */
  process(text: string, context: CBSContext): string {
    let result = text;

    // Process in specific order to avoid conflicts
    // 1. Extract and remove hidden keys first (they affect lorebook but not output)
    result = this.removeHiddenKeys(result);

    // 2. Remove comments
    result = this.removeComments(result);

    // 3. Replace macros that generate content
    result = this.replaceChar(result, context.charName);
    result = this.replaceUser(result, context.userName);
    result = this.replaceRandom(result);
    result = this.replacePick(result, context.conversationId || '');
    result = this.replaceRoll(result);
    result = this.replaceReverse(result);

    return result;
  }

  /**
   * Extract hidden keys for lorebook scanning
   */
  extractHiddenKeys(text: string): string[] {
    const hiddenKeyRegex = /\{\{hidden_key:([^}]+)\}\}/g;
    const keys: string[] = [];
    let match;

    while ((match = hiddenKeyRegex.exec(text)) !== null) {
      keys.push(match[1]);
    }

    return keys;
  }

  /**
   * Replace {{char}} with character name
   */
  private replaceChar(text: string, charName: string): string {
    return text.replace(/\{\{char\}\}/g, charName);
  }

  /**
   * Replace {{user}} with user name
   */
  private replaceUser(text: string, userName: string): string {
    return text.replace(/\{\{user\}\}/g, userName);
  }

  /**
   * Replace {{random:A,B,C}} with randomly selected value
   */
  private replaceRandom(text: string): string {
    return text.replace(/\{\{random:([^}]+)\}\}/g, (match, options) => {
      const choices = options.split(',').map((s: string) => s.trim());
      if (choices.length === 0) return match;
      const randomIndex = Math.floor(Math.random() * choices.length);
      return choices[randomIndex];
    });
  }

  /**
   * Replace {{pick:A,B,C}} with consistently selected value based on seed
   */
  private replacePick(text: string, seed: string): string {
    return text.replace(/\{\{pick:([^}]+)\}\}/g, (match, options) => {
      const choices = options.split(',').map((s: string) => s.trim());
      if (choices.length === 0) return match;

      // Simple hash function for consistent selection
      const hash = this.simpleHash(seed + match);
      const index = Math.abs(hash) % choices.length;
      return choices[index];
    });
  }

  /**
   * Replace {{roll:N}} or {{roll:dN}} with random number between 1 and N
   */
  private replaceRoll(text: string): string {
    return text.replace(/\{\{roll:d?(\d+)\}\}/g, (match, max) => {
      const maxNum = parseInt(max, 10);
      if (isNaN(maxNum) || maxNum < 1) return match;
      const roll = Math.floor(Math.random() * maxNum) + 1;
      return roll.toString();
    });
  }

  /**
   * Replace {{reverse:text}} with reversed text
   */
  private replaceReverse(text: string): string {
    return text.replace(/\{\{reverse:([^}]+)\}\}/g, (match, content) => {
      return content.split('').reverse().join('');
    });
  }

  /**
   * Remove {{// comment}} from text
   */
  private removeComments(text: string): string {
    return text.replace(/\{\{\/\/[^}]*\}\}/g, '');
  }

  /**
   * Remove {{hidden_key:text}} from text
   */
  private removeHiddenKeys(text: string): string {
    return text.replace(/\{\{hidden_key:[^}]+\}\}/g, '');
  }

  /**
   * Simple hash function for consistent pick selection
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
