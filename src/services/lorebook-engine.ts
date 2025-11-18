/**
 * Lorebook Engine
 * Matches and processes lorebook entries based on context and decorators
 */

import type {
  Lorebook,
  LorebookEntry,
  ParsedDecorators,
  CharacterCardData,
} from '../models/character-card.js';
import type { Message } from '../models/message.js';

/**
 * Context needed for lorebook matching
 */
export interface LorebookContext {
  messages: Message[];
  characterCard: CharacterCardData;
  scanText: string;
  assistantMessageCount: number;
}

/**
 * A matched lorebook entry with parsed decorators and processed content
 */
export interface MatchedEntry {
  entry: LorebookEntry;
  decorators: ParsedDecorators;
  processedContent: string;
}

/**
 * Lorebook Engine for matching and processing lorebook entries
 */
export class LorebookEngine {
  /**
   * Find all matching lorebook entries based on context
   */
  findMatches(
    lorebook: Lorebook,
    context: LorebookContext
  ): MatchedEntry[] {
    const matched: MatchedEntry[] = [];

    for (const entry of lorebook.entries) {
      // Check if entry is enabled
      if (!entry.enabled) {
        continue;
      }

      // Parse decorators from content
      const { decorators, cleanContent } = this.parseDecorators(entry.content);

      // Check if entry is constant (always included, but still check decorator conditions)
      if (entry.constant) {
        // Check decorator conditions even for constant entries
        if (this.meetsDecoratorConditions(decorators, context)) {
          matched.push({
            entry,
            decorators,
            processedContent: cleanContent,
          });
        }
        continue;
      }

      // Determine scan depth for this entry
      const scanDepth = decorators.scan_depth ?? lorebook.scan_depth;

      // Check if keys match (including additional_keys and exclude_keys from decorators)
      if (this.matchesKeys(entry, context.scanText, scanDepth, context.messages, decorators)) {
        // Check decorator conditions
        if (this.meetsDecoratorConditions(decorators, context)) {
          matched.push({
            entry,
            decorators,
            processedContent: cleanContent,
          });
        }
      }
    }

    // Sort entries by priority and insertion_order
    return this.sortEntries(matched);
  }

  /**
   * Parse decorators from entry content
   * Returns cleaned content and parsed decorators
   */
  private parseDecorators(content: string): {
    decorators: ParsedDecorators;
    cleanContent: string;
  } {
    const decorators: ParsedDecorators = {};
    let cleanContent = content;

    // Parse @@depth N
    const depthMatch = content.match(/@@depth\s+(\d+)/);
    if (depthMatch) {
      decorators.depth = parseInt(depthMatch[1], 10);
      cleanContent = cleanContent.replace(/@@depth\s+\d+\s*/g, '');
    }

    // Parse @@role (assistant|system|user)
    const roleMatch = content.match(/@@role\s+(assistant|system|user)/);
    if (roleMatch) {
      decorators.role = roleMatch[1] as 'assistant' | 'system' | 'user';
      cleanContent = cleanContent.replace(/@@role\s+(assistant|system|user)\s*/g, '');
    }

    // Parse @@activate_only_after N
    const activateAfterMatch = content.match(/@@activate_only_after\s+(\d+)/);
    if (activateAfterMatch) {
      decorators.activate_only_after = parseInt(activateAfterMatch[1], 10);
      cleanContent = cleanContent.replace(/@@activate_only_after\s+\d+\s*/g, '');
    }

    // Parse @@activate_only_every N
    const activateEveryMatch = content.match(/@@activate_only_every\s+(\d+)/);
    if (activateEveryMatch) {
      decorators.activate_only_every = parseInt(activateEveryMatch[1], 10);
      cleanContent = cleanContent.replace(/@@activate_only_every\s+\d+\s*/g, '');
    }

    // Parse @@position
    const positionMatch = content.match(/@@position\s+(\S+)/);
    if (positionMatch) {
      decorators.position = positionMatch[1];
      cleanContent = cleanContent.replace(/@@position\s+\S+\s*/g, '');
    }

    // Parse @@scan_depth N
    const scanDepthMatch = content.match(/@@scan_depth\s+(\d+)/);
    if (scanDepthMatch) {
      decorators.scan_depth = parseInt(scanDepthMatch[1], 10);
      cleanContent = cleanContent.replace(/@@scan_depth\s+\d+\s*/g, '');
    }

    // Parse @@additional_keys
    const additionalKeysMatches = content.matchAll(/@@additional_keys\s+\[([^\]]+)\]/g);
    const additionalKeys: string[][] = [];
    for (const match of additionalKeysMatches) {
      const keysStr = match[1];
      const keys = keysStr.split(',').map(k => k.trim());
      additionalKeys.push(keys);
      cleanContent = cleanContent.replace(match[0], '');
    }
    if (additionalKeys.length > 0) {
      decorators.additional_keys = additionalKeys;
    }

    // Parse @@exclude_keys
    const excludeKeysMatches = content.matchAll(/@@exclude_keys\s+\[([^\]]+)\]/g);
    const excludeKeys: string[][] = [];
    for (const match of excludeKeysMatches) {
      const keysStr = match[1];
      const keys = keysStr.split(',').map(k => k.trim());
      excludeKeys.push(keys);
      cleanContent = cleanContent.replace(match[0], '');
    }
    if (excludeKeys.length > 0) {
      decorators.exclude_keys = excludeKeys;
    }

    // Parse @@activate
    if (content.includes('@@activate')) {
      decorators.activate = true;
      cleanContent = cleanContent.replace(/@@activate\s*/g, '');
    }

    // Parse @@dont_activate
    if (content.includes('@@dont_activate')) {
      decorators.dont_activate = true;
      cleanContent = cleanContent.replace(/@@dont_activate\s*/g, '');
    }

    return { decorators, cleanContent: cleanContent.trim() };
  }

  /**
   * Check if entry keys match the scan text
   */
  private matchesKeys(
    entry: LorebookEntry,
    scanText: string,
    scanDepth?: number,
    messages?: Message[],
    decorators?: ParsedDecorators
  ): boolean {
    // If scan_depth is specified, limit scanning to recent messages
    let textToScan = scanText;
    if (scanDepth !== undefined && messages && messages.length > 0) {
      const recentMessages = messages.slice(-scanDepth);
      textToScan = recentMessages.map(m => m.content).join(' ');
    }

    // Check exclude_keys first - if any exclude key matches, don't activate this entry
    if (decorators?.exclude_keys) {
      for (const keyGroup of decorators.exclude_keys) {
        for (const key of keyGroup) {
          if (this.keyMatches(key, textToScan, entry.use_regex, entry.case_sensitive)) {
            return false;
          }
        }
      }
    }

    // Check primary keys
    for (const key of entry.keys) {
      if (this.keyMatches(key, textToScan, entry.use_regex, entry.case_sensitive)) {
        return true;
      }
    }

    // Check additional_keys - if any additional key matches, activate this entry
    if (decorators?.additional_keys) {
      for (const keyGroup of decorators.additional_keys) {
        for (const key of keyGroup) {
          if (this.keyMatches(key, textToScan, entry.use_regex, entry.case_sensitive)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a single key matches the text
   */
  private keyMatches(
    key: string,
    textToScan: string,
    useRegex: boolean,
    caseSensitive?: boolean
  ): boolean {
    if (useRegex) {
      // Regex matching
      try {
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(key, flags);
        return regex.test(textToScan);
      } catch (error) {
        // Invalid regex, skip this key
        console.warn(`Invalid regex pattern in lorebook entry: ${key}`, error);
        return false;
      }
    } else {
      // Literal string matching
      const searchText = caseSensitive ? textToScan : textToScan.toLowerCase();
      const searchKey = caseSensitive ? key : key.toLowerCase();
      return searchText.includes(searchKey);
    }
  }

  /**
   * Check if entry meets decorator conditions
   */
  private meetsDecoratorConditions(
    decorators: ParsedDecorators,
    context: LorebookContext
  ): boolean {
    // Check @@activate_only_after
    if (decorators.activate_only_after !== undefined) {
      if (context.assistantMessageCount < decorators.activate_only_after) {
        return false;
      }
    }

    // Check @@activate_only_every
    if (decorators.activate_only_every !== undefined) {
      if (context.assistantMessageCount % decorators.activate_only_every !== 0) {
        return false;
      }
    }

    // Check @@dont_activate
    if (decorators.dont_activate) {
      return false;
    }

    return true;
  }

  /**
   * Sort entries by priority (descending) and insertion_order (ascending)
   */
  private sortEntries(entries: MatchedEntry[]): MatchedEntry[] {
    return entries.sort((a, b) => {
      // First sort by priority (higher priority first)
      const priorityA = a.entry.priority ?? 0;
      const priorityB = b.entry.priority ?? 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Then sort by insertion_order (lower order first)
      return a.entry.insertion_order - b.entry.insertion_order;
    });
  }
}
