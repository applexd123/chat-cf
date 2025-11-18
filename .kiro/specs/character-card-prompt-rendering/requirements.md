# Requirements Document

## Introduction

This feature adds dynamic prompt rendering capabilities to the chat application based on the Character Card V3 specification. The system will support character cards, lorebooks, curly-braced syntaxes (CBS/macros), and template rendering using the @huggingface/jinja template engine.

## Glossary

- **Character Card**: A JSON object containing character information, personality, greetings, and assets following the CCv3 specification
- **Lorebook**: A collection of entries that conditionally inject content into prompts based on keywords and rules
- **CBS (Curly Braced Syntax)**: Macro syntax like `{{char}}` or `{{random:A,B,C}}` used for dynamic text replacement
- **Decorator**: Special syntax starting with `@@` in lorebook entries that modifies behavior (e.g., `@@depth`, `@@role`)
- **Template Engine**: The @huggingface/jinja library used to render dynamic prompts
- **Prompt System**: The component that assembles the final prompt sent to the AI model

## Requirements

### Requirement 1

**User Story:** As a user, I want to load character cards in CCv3 format, so that I can chat with characters that have rich personalities and configurations.

#### Acceptance Criteria

1. WHEN a user provides a CCv3 character card THEN the Prompt System SHALL parse and validate the card structure
2. WHEN the character card contains required fields (name, description, first_mes) THEN the Prompt System SHALL extract these fields for prompt construction
3. WHEN the character card contains optional fields (personality, scenario, system_prompt) THEN the Prompt System SHALL include these fields in the prompt when present
4. WHEN the character card has a nickname field THEN the Prompt System SHALL use the nickname value for `{{char}}` macro replacement
5. WHEN the character card has no nickname field THEN the Prompt System SHALL use the name value for `{{char}}` macro replacement

### Requirement 2

**User Story:** As a user, I want CBS macros to be replaced with dynamic values, so that prompts can include randomization and context-specific information.

#### Acceptance Criteria

1. WHEN a prompt contains `{{char}}` THEN the Prompt System SHALL replace it with the character's nickname or name
2. WHEN a prompt contains `{{user}}` THEN the Prompt System SHALL replace it with the user's display name
3. WHEN a prompt contains `{{random:A,B,C}}` THEN the Prompt System SHALL replace it with a randomly selected value from the comma-separated list
4. WHEN a prompt contains `{{pick:A,B,C}}` THEN the Prompt System SHALL replace it with a consistently selected value for the same prompt
5. WHEN a prompt contains `{{roll:N}}` or `{{roll:dN}}` THEN the Prompt System SHALL replace it with a random number between 1 and N
6. WHEN a prompt contains `{{// comment}}` THEN the Prompt System SHALL remove it from the final prompt
7. WHEN a prompt contains `{{hidden_key:text}}` THEN the Prompt System SHALL remove it from the prompt but use it for lorebook scanning
8. WHEN a prompt contains `{{reverse:text}}` THEN the Prompt System SHALL replace it with the reversed text

### Requirement 3

**User Story:** As a user, I want lorebook entries to conditionally inject content into prompts, so that context-relevant information appears automatically.

#### Acceptance Criteria

1. WHEN a lorebook entry's keys match the chat context THEN the Prompt System SHALL include the entry's content in the prompt
2. WHEN a lorebook entry has `enabled` set to false THEN the Prompt System SHALL exclude the entry regardless of key matches
3. WHEN a lorebook entry has `constant` set to true THEN the Prompt System SHALL always include the entry regardless of key matches
4. WHEN a lorebook entry has `use_regex` set to true THEN the Prompt System SHALL match keys using regex patterns instead of literal strings
5. WHEN a lorebook entry has `case_sensitive` set to true THEN the Prompt System SHALL perform case-sensitive key matching
6. WHEN multiple lorebook entries match THEN the Prompt System SHALL order them by insertion_order field

### Requirement 4

**User Story:** As a user, I want lorebook decorators to control entry behavior, so that I can fine-tune when and how content appears in prompts.

#### Acceptance Criteria

1. WHEN a lorebook entry contains `@@depth N` THEN the Prompt System SHALL insert content at the Nth message from the most recent
2. WHEN a lorebook entry contains `@@role assistant` THEN the Prompt System SHALL format the content as an assistant message
3. WHEN a lorebook entry contains `@@role system` THEN the Prompt System SHALL format the content as a system message
4. WHEN a lorebook entry contains `@@role user` THEN the Prompt System SHALL format the content as a user message
5. WHEN a lorebook entry contains `@@activate_only_after N` THEN the Prompt System SHALL exclude the entry until N assistant messages have occurred
6. WHEN a lorebook entry contains `@@position after_desc` THEN the Prompt System SHALL insert content after the character description
7. WHEN a lorebook entry contains `@@scan_depth N` THEN the Prompt System SHALL only scan the most recent N messages for key matches

### Requirement 5

**User Story:** As a developer, I want to use Jinja templates for prompt rendering, so that I can create flexible and maintainable prompt structures.

#### Acceptance Criteria

1. WHEN the Prompt System renders a prompt THEN the system SHALL use the @huggingface/jinja template engine
2. WHEN a template references character data THEN the Prompt System SHALL provide character card fields as template variables
3. WHEN a template references conversation history THEN the Prompt System SHALL provide message arrays as template variables
4. WHEN a template contains Jinja control structures (if/for/etc) THEN the Prompt System SHALL evaluate them correctly
5. WHEN template rendering fails THEN the Prompt System SHALL return a descriptive error message

### Requirement 6

**User Story:** As a user, I want common prompt templates to be available, so that I can quickly start chatting without manual configuration.

#### Acceptance Criteria

1. WHEN no custom template is specified THEN the Prompt System SHALL use a default chat template
2. WHEN the system initializes THEN the Prompt System SHALL provide templates for common formats (ChatML, Alpaca, Llama)
3. WHEN a template is selected THEN the Prompt System SHALL apply character data and conversation history to the template
4. WHEN multiple greetings exist THEN the Prompt System SHALL support selecting alternate greetings by index

### Requirement 7

**User Story:** As a developer, I want the prompt system to integrate with the existing chat stream handler, so that character cards enhance the current chat experience.

#### Acceptance Criteria

1. WHEN a chat request includes a character card THEN the chat-stream handler SHALL pass the card to the Prompt System
2. WHEN the Prompt System generates a prompt THEN the handler SHALL send it to the OpenRouter service
3. WHEN conversation history exists THEN the Prompt System SHALL include previous messages in the rendered prompt
4. WHEN the system constructs a prompt THEN the Prompt System SHALL apply CBS macro replacement before template rendering
5. WHEN lorebook entries match THEN the Prompt System SHALL inject their content at the appropriate positions in the prompt

### Requirement 8

**User Story:** As a user, I want character card data to persist with conversations, so that character context is maintained across sessions.

#### Acceptance Criteria

1. WHEN a conversation is created with a character card THEN the database SHALL store the character card data
2. WHEN a conversation is retrieved THEN the database SHALL return the associated character card
3. WHEN a character card is updated THEN the database SHALL store the new version with a modification timestamp
4. WHEN multiple conversations use the same character THEN the database SHALL allow sharing or duplicating character data
