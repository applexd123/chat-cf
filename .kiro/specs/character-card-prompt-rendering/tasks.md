# Implementation Plan

- [x] 1. Set up project dependencies and type definitions
  - Install @huggingface/jinja template engine
  - Install fast-check for property-based testing
  - Create TypeScript interfaces for Character Card V3 specification
  - Create TypeScript interfaces for Lorebook and entries
  - _Requirements: 1.1, 5.1_

- [x] 2. Implement database schema extensions
  - Add character_cards table to schema
  - Add character_card_id and compiled_context fields to conversations table
  - Generate and apply database migrations
  - _Requirements: 8.1, 8.2_

- [x] 3. Create Character Card model and validation
  - Implement CharacterCardV3 interface and related types
  - Create character card factory functions
  - Add validation for required fields (name, description, first_mes)
  - _Requirements: 1.1, 1.2_

- [ ]* 3.1 Write property test for character card validation
  - **Property 1: Character card validation accepts valid cards**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for required field extraction
  - **Property 2: Required field extraction preserves values**
  - **Validates: Requirements 1.2**

- [x] 4. Implement CBS Macro Processor
  - Create CBSProcessor class with process() method
  - Implement {{char}} replacement (nickname or name)
  - Implement {{user}} replacement
  - Implement {{random:A,B,C}} replacement
  - Implement {{pick:A,B,C}} replacement with consistent hashing
  - Implement {{roll:N}} and {{roll:dN}} replacement
  - Implement {{// comment}} removal
  - Implement {{hidden_key:text}} removal and extraction
  - Implement {{reverse:text}} replacement
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ]* 4.1 Write property test for {{char}} with nickname
  - **Property 4: Nickname used for {{char}} when present**
  - **Validates: Requirements 1.4**

- [ ]* 4.2 Write property test for {{char}} without nickname
  - **Property 5: Name used for {{char}} when nickname absent**
  - **Validates: Requirements 1.5**

- [ ]* 4.3 Write property test for {{user}} replacement
  - **Property 6: {{user}} macro replacement**
  - **Validates: Requirements 2.2**

- [ ]* 4.4 Write property test for {{random}} selection
  - **Property 7: {{random}} selects from list**
  - **Validates: Requirements 2.3**

- [ ]* 4.5 Write property test for {{pick}} idempotence
  - **Property 8: {{pick}} is idempotent**
  - **Validates: Requirements 2.4**

- [ ]* 4.6 Write property test for {{roll:N}} range
  - **Property 9: {{roll:N}} produces valid range**
  - **Validates: Requirements 2.5**

- [ ]* 4.7 Write property test for comment removal
  - **Property 10: Comments are removed**
  - **Validates: Requirements 2.6**

- [ ]* 4.8 Write property test for hidden key removal
  - **Property 11: Hidden keys removed from output**
  - **Validates: Requirements 2.7**

- [ ]* 4.9 Write property test for {{reverse}}
  - **Property 12: {{reverse}} reverses text**
  - **Validates: Requirements 2.8**

- [x] 5. Implement Lorebook Engine
  - Create LorebookEngine class
  - Implement decorator parsing from entry content
  - Implement key matching (literal string matching)
  - Implement regex key matching (use_regex=true)
  - Implement case-sensitive matching
  - Implement constant entry handling
  - Implement enabled flag checking
  - Implement entry sorting by insertion_order and priority
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]* 5.1 Write property test for matching entries included
  - **Property 13: Matching lorebook entries included**
  - **Validates: Requirements 3.1**

- [ ]* 5.2 Write property test for disabled entries excluded
  - **Property 14: Disabled entries excluded**
  - **Validates: Requirements 3.2**

- [ ]* 5.3 Write property test for constant entries
  - **Property 15: Constant entries always included**
  - **Validates: Requirements 3.3**

- [ ]* 5.4 Write property test for regex matching
  - **Property 16: Regex matching works correctly**
  - **Validates: Requirements 3.4**

- [ ]* 5.5 Write property test for case sensitivity
  - **Property 17: Case sensitivity respected**
  - **Validates: Requirements 3.5**

- [ ]* 5.6 Write property test for entry ordering
  - **Property 18: Entries ordered by insertion_order**
  - **Validates: Requirements 3.6**

- [x] 6. Implement Lorebook Decorators
  - Implement @@depth N decorator parsing and positioning
  - Implement @@role decorator (assistant, system, user)
  - Implement @@activate_only_after N decorator
  - Implement @@activate_only_every N decorator
  - Implement @@position decorator (after_desc, before_desc, etc.)
  - Implement @@scan_depth N decorator
  - Implement @@additional_keys decorator
  - Implement @@exclude_keys decorator
  - Implement @@activate and @@dont_activate decorators
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 6.1 Write property test for @@depth positioning
  - **Property 19: @@depth positions content correctly**
  - **Validates: Requirements 4.1**

- [ ]* 6.2 Write property test for @@role formatting
  - **Property 20: @@role formats messages correctly**
  - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ]* 6.3 Write property test for @@activate_only_after
  - **Property 21: @@activate_only_after respects message count**
  - **Validates: Requirements 4.5**

- [ ]* 6.4 Write property test for @@position after_desc
  - **Property 22: @@position after_desc places content correctly**
  - **Validates: Requirements 4.6**

- [ ]* 6.5 Write property test for @@scan_depth
  - **Property 23: @@scan_depth limits scanning**
  - **Validates: Requirements 4.7**

- [x] 7. Implement Template Renderer
  - Create TemplateRenderer class
  - Initialize @huggingface/jinja template engine
  - Create default ChatML template
  - Create Alpaca template
  - Create Llama template
  - Implement template registration method
  - Implement template rendering with error handling
  - Prepare template context with character and message data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

- [ ]* 7.1 Write property test for template character data access
  - **Property 24: Template variables include character data**
  - **Validates: Requirements 5.2**

- [ ]* 7.2 Write property test for template message history access
  - **Property 25: Template variables include message history**
  - **Validates: Requirements 5.3**

- [ ]* 7.3 Write property test for template error handling
  - **Property 26: Template errors return descriptive messages**
  - **Validates: Requirements 5.5**

- [ ]* 7.4 Write property test for template data application
  - **Property 27: Template applies data correctly**
  - **Validates: Requirements 6.3**

- [x] 8. Implement Prompt Builder Service
  - Create PromptBuilder class
  - Implement compileStaticContext() for one-time character processing
  - Implement buildPrompt() for dynamic message processing
  - Integrate CBSProcessor for macro replacement
  - Integrate LorebookEngine for entry matching
  - Integrate TemplateRenderer for final prompt generation
  - Implement greeting selection (first_mes and alternate_greetings)
  - Process constant lorebook entries during static compilation
  - Process dynamic lorebook entries per message
  - _Requirements: 1.3, 6.4, 7.4, 7.5_

- [ ]* 8.1 Write property test for optional fields inclusion
  - **Property 3: Optional fields appear when present**
  - **Validates: Requirements 1.3**

- [ ]* 8.2 Write property test for greeting selection
  - **Property 28: Greeting selection by index**
  - **Validates: Requirements 6.4**

- [ ]* 8.3 Write property test for conversation history inclusion
  - **Property 29: Conversation history included in prompt**
  - **Validates: Requirements 7.3**

- [ ]* 8.4 Write property test for CBS before templates
  - **Property 30: CBS processed before templates**
  - **Validates: Requirements 7.4**

- [ ]* 8.5 Write property test for lorebook positioning
  - **Property 31: Lorebook content positioned correctly**
  - **Validates: Requirements 7.5**

- [x] 9. Extend Database Client for character cards
  - Add createCharacterCard() method
  - Add getCharacterCard() method
  - Add updateCharacterCard() method
  - Add deleteCharacterCard() method
  - Add getConversationWithCharacterCard() method
  - Handle JSON serialization/deserialization
  - Store and retrieve compiled_context field
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 9.1 Write property test for character card storage round-trip
  - **Property 32: Character card storage round-trip**
  - **Validates: Requirements 8.1, 8.2**

- [ ]* 9.2 Write property test for modification timestamp
  - **Property 33: Modification timestamp updates**
  - **Validates: Requirements 8.3**

- [x] 10. Integrate with chat-stream handler
  - Modify handleChatStream to accept optional characterCardId
  - Load character card from database when provided
  - Check if conversation has compiled_context
  - If no compiled_context, call compileStaticContext() and store
  - Call buildPrompt() with compiled context for each message
  - Pass generated prompt to OpenRouter
  - Update request body type to include characterCardId
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 10.1 Write integration test for character card in chat request
  - Test that chat handler loads character card from database
  - Test that compiled context is created on first message
  - Test that compiled context is reused on subsequent messages
  - _Requirements: 7.1, 7.2_

- [x] 11. Add API endpoint for character card management
  - Create POST /api/character-cards endpoint for creating cards
  - Create GET /api/character-cards/:id endpoint for retrieving cards
  - Create PUT /api/character-cards/:id endpoint for updating cards
  - Create DELETE /api/character-cards/:id endpoint for deleting cards
  - Create GET /api/character-cards endpoint for listing cards
  - Add validation middleware for character card data
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 11.1 Write integration tests for character card API
  - Test CRUD operations for character cards
  - Test validation of required fields
  - Test error handling for invalid data
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Add example character cards
  - Create example character card JSON files
  - Add seed script to populate database with examples
  - Document character card format in README
  - _Requirements: 6.2_

- [ ]* 13.1 Write unit tests for example character cards
  - Test that example cards are valid CCv3 format
  - Test that example cards can be loaded and used
  - _Requirements: 6.2_

- [ ] 14. Update frontend to support character cards
  - Add character card selection UI component
  - Update chat request to include characterCardId
  - Display character name and greeting in UI
  - Add character card upload/import functionality
  - _Requirements: 1.1, 6.1_

- [ ]* 14.1 Write frontend integration tests
  - Test character card selection flow
  - Test chat with character card
  - Test character card display
  - _Requirements: 1.1, 6.1_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
