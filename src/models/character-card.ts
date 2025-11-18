/**
 * Character Card V3 Specification Types
 * Based on the CCv3 specification for character cards, lorebooks, and related entities
 */

/**
 * Asset attached to a character card (images, audio, etc.)
 */
export interface Asset {
  type: string;
  uri: string;
  name: string;
  ext: string;
}

/**
 * Lorebook entry with conditional content injection rules
 */
export interface LorebookEntry {
  keys: string[];
  content: string;
  extensions: Record<string, any>;
  enabled: boolean;
  insertion_order: number;
  case_sensitive?: boolean;
  use_regex: boolean;
  constant?: boolean;
  
  // Optional fields
  name?: string;
  priority?: number;
  id?: number | string;
  comment?: string;
  selective?: boolean;
  secondary_keys?: string[];
  position?: 'before_char' | 'after_char';
}

/**
 * Lorebook containing multiple entries for conditional content injection
 */
export interface Lorebook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, any>;
  entries: LorebookEntry[];
}

/**
 * Parsed decorators from lorebook entry content
 * Decorators control entry behavior (e.g., @@depth, @@role)
 */
export interface ParsedDecorators {
  depth?: number;
  role?: 'assistant' | 'system' | 'user';
  activate_only_after?: number;
  activate_only_every?: number;
  position?: string;
  scan_depth?: number;
  additional_keys?: string[][];
  exclude_keys?: string[][];
  activate?: boolean;
  dont_activate?: boolean;
}

/**
 * Character Card V3 data containing all character information
 */
export interface CharacterCardData {
  // Core required fields
  name: string;
  description: string;
  tags: string[];
  creator: string;
  character_version: string;
  mes_example: string;
  extensions: Record<string, any>;
  system_prompt: string;
  post_history_instructions: string;
  first_mes: string;
  alternate_greetings: string[];
  personality: string;
  scenario: string;
  creator_notes: string;
  character_book?: Lorebook;
  
  // V3 additions
  assets?: Asset[];
  nickname?: string;
  creator_notes_multilingual?: Record<string, string>;
  source?: string[];
  group_only_greetings: string[];
  creation_date?: number;
  modification_date?: number;
}

/**
 * Complete Character Card V3 structure
 */
export interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: CharacterCardData;
}

/**
 * Factory function to create a minimal valid character card
 */
export function createCharacterCard(
  name: string,
  description: string,
  first_mes: string
): CharacterCardV3 {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name,
      description,
      first_mes,
      tags: [],
      creator: '',
      character_version: '1.0',
      mes_example: '',
      extensions: {},
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      personality: '',
      scenario: '',
      creator_notes: '',
      group_only_greetings: [],
    },
  };
}

/**
 * Validate that a character card has all required fields
 */
export function validateCharacterCard(card: any): card is CharacterCardV3 {
  if (!card || typeof card !== 'object') {
    return false;
  }
  
  if (card.spec !== 'chara_card_v3' || card.spec_version !== '3.0') {
    return false;
  }
  
  const data = card.data;
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check required fields
  if (typeof data.name !== 'string' || data.name.length === 0) {
    return false;
  }
  
  if (typeof data.description !== 'string' || data.description.length === 0) {
    return false;
  }
  
  if (typeof data.first_mes !== 'string' || data.first_mes.length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Extract required fields from a character card
 */
export function extractRequiredFields(card: CharacterCardV3): {
  name: string;
  description: string;
  first_mes: string;
} {
  return {
    name: card.data.name,
    description: card.data.description,
    first_mes: card.data.first_mes,
  };
}

/**
 * Factory function to create a lorebook entry
 */
export function createLorebookEntry(
  keys: string[],
  content: string,
  insertion_order: number = 0
): LorebookEntry {
  return {
    keys,
    content,
    extensions: {},
    enabled: true,
    insertion_order,
    use_regex: false,
  };
}

/**
 * Factory function to create a lorebook
 */
export function createLorebook(entries: LorebookEntry[] = []): Lorebook {
  return {
    extensions: {},
    entries,
  };
}
