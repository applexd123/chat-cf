/**
 * Prompt Builder Service
 * Orchestrates CBS processing, lorebook matching, and template rendering
 * to build complete prompts for AI models
 */

import type { CharacterCardV3, CharacterCardData } from '../models/character-card.js';
import type { Message } from '../models/message.js';
import { CBSProcessor, type CBSContext } from './cbs-processor.js';
import { LorebookEngine, type LorebookContext, type MatchedEntry } from './lorebook-engine.js';
import { TemplateRenderer, type TemplateContext } from './template-renderer.js';

/**
 * Pre-compiled static context from character card
 * Computed once per conversation and cached
 */
export interface CompiledContext {
  characterName: string;
  characterNickname?: string;
  systemPrompt?: string;
  description: string;
  personality?: string;
  scenario?: string;
  greeting: string;
  constantLorebookEntries: MatchedEntry[]; // Entries with constant=true
}

/**
 * Options for building a prompt
 */
export interface PromptBuildOptions {
  compiledContext?: CompiledContext; // Pre-compiled static context
  characterCard?: CharacterCardV3; // Only needed if compiledContext not available
  messages: Message[];
  userPrompt: string;
  userName?: string;
  templateName?: string;
  conversationId?: string;
}

/**
 * Prompt Builder orchestrates the entire prompt construction process
 */
export class PromptBuilder {
  private cbsProcessor: CBSProcessor;
  private lorebookEngine: LorebookEngine;
  private templateRenderer: TemplateRenderer;

  constructor() {
    this.cbsProcessor = new CBSProcessor();
    this.lorebookEngine = new LorebookEngine();
    this.templateRenderer = new TemplateRenderer();
  }

  /**
   * Compile static character context (called once per conversation)
   * Processes character card fields and constant lorebook entries
   */
  async compileStaticContext(
    characterCard: CharacterCardV3,
    userName: string,
    greetingIndex?: number
  ): Promise<CompiledContext> {
    const data = characterCard.data;
    
    // Get character name (nickname takes precedence for {{char}} replacement)
    const characterName = data.nickname || data.name;
    
    // Get greeting (first_mes or alternate)
    const greeting = this.getGreeting(data, greetingIndex);
    
    // Create CBS context for processing static content
    const cbsContext: CBSContext = {
      charName: characterName,
      userName,
    };
    
    // Process CBS macros in static fields
    const processedDescription = this.cbsProcessor.process(data.description, cbsContext);
    const processedPersonality = data.personality 
      ? this.cbsProcessor.process(data.personality, cbsContext)
      : undefined;
    const processedScenario = data.scenario
      ? this.cbsProcessor.process(data.scenario, cbsContext)
      : undefined;
    const processedSystemPrompt = data.system_prompt
      ? this.cbsProcessor.process(data.system_prompt, cbsContext)
      : undefined;
    const processedGreeting = this.cbsProcessor.process(greeting, cbsContext);
    
    // Process constant lorebook entries
    const constantLorebookEntries: MatchedEntry[] = [];
    if (data.character_book) {
      // Find constant entries
      for (const entry of data.character_book.entries) {
        if (entry.enabled && entry.constant) {
          // Parse decorators and process content
          const lorebookContext: LorebookContext = {
            messages: [],
            characterCard: data,
            scanText: '',
            assistantMessageCount: 0,
          };
          
          // Use lorebook engine to get properly parsed entry
          const matches = this.lorebookEngine.findMatches(
            { ...data.character_book, entries: [entry] },
            lorebookContext
          );
          
          // Process CBS macros in constant entry content
          for (const match of matches) {
            const processedContent = this.cbsProcessor.process(
              match.processedContent,
              cbsContext
            );
            constantLorebookEntries.push({
              ...match,
              processedContent,
            });
          }
        }
      }
    }
    
    return {
      characterName,
      characterNickname: data.nickname,
      systemPrompt: processedSystemPrompt,
      description: processedDescription,
      personality: processedPersonality,
      scenario: processedScenario,
      greeting: processedGreeting,
      constantLorebookEntries,
    };
  }

  /**
   * Build complete prompt for AI model using compiled context
   * Processes dynamic content (lorebook matching, current messages)
   */
  async buildPrompt(options: PromptBuildOptions): Promise<string> {
    const {
      compiledContext,
      characterCard,
      messages,
      userPrompt,
      userName = 'User',
      templateName = 'default',
      conversationId,
    } = options;
    
    // Ensure we have either compiled context or character card
    if (!compiledContext && !characterCard) {
      throw new Error('Either compiledContext or characterCard must be provided');
    }
    
    // If no compiled context, compile it now (fallback)
    const context = compiledContext || await this.compileStaticContext(
      characterCard!,
      userName
    );
    
    // Create CBS context for dynamic processing
    const cbsContext: CBSContext = {
      charName: context.characterName,
      userName,
      conversationId,
    };
    
    // Process CBS macros in user prompt
    const processedUserPrompt = this.cbsProcessor.process(userPrompt, cbsContext);
    
    // Process CBS macros in message history
    const processedMessages = messages.map(msg => ({
      ...msg,
      content: this.cbsProcessor.process(msg.content, cbsContext),
    }));
    
    // Add current user prompt as a message
    const allMessages = [
      ...processedMessages,
      {
        id: 'current',
        conversation_id: conversationId || '',
        role: 'user' as const,
        content: processedUserPrompt,
        created_at: new Date().toISOString(),
      },
    ];
    
    // Process dynamic lorebook entries
    const dynamicLorebookEntries = this.processDynamicContent(
      allMessages,
      processedUserPrompt,
      characterCard?.data.character_book,
      context,
      cbsContext
    );
    
    // Combine constant and dynamic lorebook entries
    const allLorebookEntries = [
      ...context.constantLorebookEntries,
      ...dynamicLorebookEntries,
    ];
    
    // Build character data for template
    const characterData: CharacterCardData = characterCard?.data || {
      name: context.characterName,
      description: context.description,
      personality: context.personality || '',
      scenario: context.scenario || '',
      system_prompt: context.systemPrompt || '',
      first_mes: context.greeting,
      tags: [],
      creator: '',
      character_version: '1.0',
      mes_example: '',
      extensions: {},
      post_history_instructions: '',
      alternate_greetings: [],
      creator_notes: '',
      group_only_greetings: [],
    };
    
    // Prepare template context
    const templateContext: TemplateContext = {
      character: characterData,
      messages: allMessages,
      userName,
      lorebookEntries: allLorebookEntries,
      systemPrompt: context.systemPrompt,
    };
    
    // Render template
    const prompt = this.templateRenderer.render(templateName, templateContext);
    
    return prompt;
  }

  /**
   * Process dynamic content (lorebook matching for current messages)
   */
  private processDynamicContent(
    messages: Message[],
    userPrompt: string,
    lorebook?: any,
    compiledContext?: CompiledContext,
    cbsContext?: CBSContext
  ): MatchedEntry[] {
    if (!lorebook || !lorebook.entries) {
      return [];
    }
    
    // Build scan text from messages and user prompt
    const scanText = messages.map(m => m.content).join(' ') + ' ' + userPrompt;
    
    // Extract hidden keys from scan text
    const hiddenKeys = cbsContext 
      ? this.cbsProcessor.extractHiddenKeys(scanText)
      : [];
    const scanTextWithHiddenKeys = scanText + ' ' + hiddenKeys.join(' ');
    
    // Count assistant messages
    const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;
    
    // Build lorebook context
    const lorebookContext: LorebookContext = {
      messages,
      characterCard: {
        name: compiledContext?.characterName || '',
        description: compiledContext?.description || '',
        first_mes: compiledContext?.greeting || '',
        tags: [],
        creator: '',
        character_version: '1.0',
        mes_example: '',
        extensions: {},
        system_prompt: compiledContext?.systemPrompt || '',
        post_history_instructions: '',
        alternate_greetings: [],
        personality: compiledContext?.personality || '',
        scenario: compiledContext?.scenario || '',
        creator_notes: '',
        group_only_greetings: [],
      },
      scanText: scanTextWithHiddenKeys,
      assistantMessageCount,
    };
    
    // Find matching entries (excluding constant entries, which are already in compiled context)
    const nonConstantLorebook = {
      ...lorebook,
      entries: lorebook.entries.filter((e: any) => !e.constant),
    };
    
    const matches = this.lorebookEngine.findMatches(
      nonConstantLorebook,
      lorebookContext
    );
    
    // Process CBS macros in matched entry content
    if (cbsContext) {
      return matches.map(match => ({
        ...match,
        processedContent: this.cbsProcessor.process(match.processedContent, cbsContext),
      }));
    }
    
    return matches;
  }

  /**
   * Get greeting message (first_mes or alternate by index)
   */
  private getGreeting(card: CharacterCardData, index?: number): string {
    // If no index specified, use first_mes
    if (index === undefined || index === 0) {
      return card.first_mes;
    }
    
    // Check if alternate greeting exists at index-1 (since first_mes is index 0)
    const alternateIndex = index - 1;
    if (alternateIndex >= 0 && alternateIndex < card.alternate_greetings.length) {
      return card.alternate_greetings[alternateIndex];
    }
    
    // Fallback to first_mes if index out of range
    return card.first_mes;
  }
}
