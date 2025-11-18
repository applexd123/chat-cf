/**
 * Template Renderer
 * Renders prompts using Jinja templates with character and message data
 */

import { Template } from '@huggingface/jinja';
import type { CharacterCardData } from '../models/character-card.js';
import type { Message } from '../models/message.js';
import type { MatchedEntry } from './lorebook-engine.js';

/**
 * Context data provided to templates for rendering
 */
export interface TemplateContext {
  character: CharacterCardData;
  messages: Message[];
  userName: string;
  lorebookEntries: MatchedEntry[];
  systemPrompt?: string;
}

/**
 * Template Renderer using @huggingface/jinja
 */
export class TemplateRenderer {
  private templates: Map<string, Template>;

  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Render a template with the provided context
   * @param templateName Name of the template to use
   * @param context Template context data
   * @returns Rendered prompt string
   * @throws Error if template not found or rendering fails
   */
  render(templateName: string, context: TemplateContext): string {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    try {
      // Prepare template variables
      const templateVars = {
        character: context.character,
        messages: context.messages,
        user_name: context.userName,
        lorebook_entries: context.lorebookEntries,
        system_prompt: context.systemPrompt || context.character.system_prompt || '',
      };

      // Render the template
      const result = template.render(templateVars);
      return result;
    } catch (error) {
      // Return descriptive error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Template rendering failed for '${templateName}': ${errorMessage}`);
    }
  }

  /**
   * Register a custom template
   * @param name Template name
   * @param templateString Jinja template string
   */
  registerTemplate(name: string, templateString: string): void {
    try {
      const template = new Template(templateString);
      this.templates.set(name, template);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to register template '${name}': ${errorMessage}`);
    }
  }

  /**
   * Initialize default templates (ChatML, Alpaca, Llama)
   */
  private initializeDefaultTemplates(): void {
    // ChatML template (default)
    const chatMLTemplate = `{%- if system_prompt -%}
<|im_start|>system
{{ system_prompt }}<|im_end|>
{% endif -%}
{%- if character.description -%}
<|im_start|>system
{{ character.description }}<|im_end|>
{% endif -%}
{%- if character.personality -%}
<|im_start|>system
Personality: {{ character.personality }}<|im_end|>
{% endif -%}
{%- if character.scenario -%}
<|im_start|>system
Scenario: {{ character.scenario }}<|im_end|>
{% endif -%}
{%- for entry in lorebook_entries -%}
{%- if entry.decorators.role == 'system' -%}
<|im_start|>system
{{ entry.processedContent }}<|im_end|>
{% elif entry.decorators.role == 'assistant' -%}
<|im_start|>assistant
{{ entry.processedContent }}<|im_end|>
{% elif entry.decorators.role == 'user' -%}
<|im_start|>user
{{ entry.processedContent }}<|im_end|>
{% else -%}
<|im_start|>system
{{ entry.processedContent }}<|im_end|>
{% endif -%}
{%- endfor -%}
{%- for message in messages -%}
<|im_start|>{{ message.role }}
{{ message.content }}<|im_end|>
{% endfor -%}
<|im_start|>assistant
`;

    // Alpaca template
    const alpacaTemplate = `{%- if system_prompt -%}
{{ system_prompt }}

{% endif -%}
{%- if character.description -%}
{{ character.description }}

{% endif -%}
{%- if character.personality -%}
Personality: {{ character.personality }}

{% endif -%}
{%- if character.scenario -%}
Scenario: {{ character.scenario }}

{% endif -%}
{%- for entry in lorebook_entries -%}
{{ entry.processedContent }}

{% endfor -%}
{%- for message in messages -%}
{%- if message.role == 'user' -%}
### Instruction:
{{ message.content }}

{% else -%}
### Response:
{{ message.content }}

{% endif -%}
{%- endfor -%}
### Response:
`;

    // Llama template
    const llamaTemplate = `{%- if system_prompt -%}
<s>[INST] <<SYS>>
{{ system_prompt }}
<</SYS>>

{% endif -%}
{%- if character.description -%}
[INST] <<SYS>>
{{ character.description }}
<</SYS>>

{% endif -%}
{%- if character.personality -%}
[INST] <<SYS>>
Personality: {{ character.personality }}
<</SYS>>

{% endif -%}
{%- if character.scenario -%}
[INST] <<SYS>>
Scenario: {{ character.scenario }}
<</SYS>>

{% endif -%}
{%- for entry in lorebook_entries -%}
[INST] <<SYS>>
{{ entry.processedContent }}
<</SYS>>

{% endfor -%}
{%- for message in messages -%}
{%- if message.role == 'user' -%}
[INST] {{ message.content }} [/INST]
{% else -%}
{{ message.content }} </s>
{% endif -%}
{%- endfor -%}
`;

    // Register default templates
    this.registerTemplate('chatml', chatMLTemplate);
    this.registerTemplate('default', chatMLTemplate); // Default is ChatML
    this.registerTemplate('alpaca', alpacaTemplate);
    this.registerTemplate('llama', llamaTemplate);
  }
}
