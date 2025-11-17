# Implementation Plan

- [x] 1. Install and configure Drizzle ORM packages
  - Install drizzle-orm and drizzle-kit packages via pnpm
  - Create drizzle.config.ts configuration file with D1 settings
  - Add migration scripts to package.json (generate, apply, drop)
  - _Requirements: 1.5_

- [x] 2. Define database schema using Drizzle
  - Create src/db/schema.ts file
  - Define clientSessions table with all columns and indexes
  - Define conversations table with foreign key to clientSessions
  - Define messages table with foreign key to conversations and role enum
  - Define relations between tables for join operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Generate initial migration from existing schema
  - Run drizzle-kit generate to create migration files
  - Review generated SQL in src/db/migrations/ directory
  - Verify migration matches existing database.sql schema
  - Test migration application on local D1 database
  - _Requirements: 4.1, 4.2, 4.3, 4.6_

- [x] 4. Implement data mapping utilities
  - Create mapper functions to convert Drizzle types to existing model interfaces
  - Implement mapDbToClientSession function (camelCase to snake_case)
  - Implement mapDbToConversation function
  - Implement mapDbToMessage function
  - Handle JSON metadata parsing/stringifying in mappers
  - _Requirements: 3.7, 7.2_

- [x] 5. Migrate DatabaseClient.getOrCreateSession method
  - Initialize Drizzle ORM instance in DatabaseClient constructor
  - Replace raw SQL SELECT with Drizzle select query
  - Replace raw SQL UPDATE with Drizzle update query
  - Replace raw SQL INSERT with Drizzle insert query
  - Wrap ORM operations in try-catch with DatabaseError
  - Use mapper functions to return existing ClientSession interface
  - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.5_

- [x] 6. Migrate DatabaseClient.createConversation method
  - Replace raw SQL INSERT with Drizzle insert query
  - Maintain same method signature and return type
  - Use mapper function to return Conversation interface
  - Wrap errors in DatabaseError with INSERT_ERROR code
  - _Requirements: 3.2, 3.6, 3.7, 5.1, 5.2, 7.1, 7.3, 7.5_

- [x] 7. Migrate DatabaseClient.createMessage method
  - Replace raw SQL INSERT for messages with Drizzle insert
  - Replace raw SQL UPDATE for conversation updated_at with Drizzle update
  - Maintain same method signature and return type
  - Use mapper function to return Message interface
  - Wrap errors in DatabaseError with appropriate codes
  - _Requirements: 3.2, 3.3, 3.6, 3.7, 5.1, 5.2, 7.1, 7.3, 7.5_

- [x] 8. Migrate DatabaseClient.listConversations method
  - Replace raw SQL SELECT with Drizzle select query
  - Implement ORDER BY using desc() operator
  - Implement LIMIT using limit() method
  - Use mapper function to return Conversation[] array
  - Wrap errors in DatabaseError with QUERY_ERROR code
  - _Requirements: 3.1, 3.4, 3.6, 3.7, 5.1, 5.3, 7.1, 7.2, 7.5_

- [x] 9. Migrate DatabaseClient.getConversationWithMessages method
  - Replace raw SQL SELECT for conversation with Drizzle select
  - Replace raw SQL SELECT for messages with Drizzle select
  - Implement JOIN operation using Drizzle relations API
  - Use mapper functions for both conversation and messages
  - Return same data structure as current implementation
  - _Requirements: 3.1, 3.5, 3.6, 3.7, 5.1, 5.3, 7.1, 7.2, 7.5_

- [x] 10. Remove deprecated raw SQL query methods
  - Remove query() method from DatabaseClient
  - Remove queryFirst() method from DatabaseClient
  - Remove execute() method from DatabaseClient
  - Verify no other code references these methods
  - _Requirements: 3.1, 7.1_

- [x] 11. Update type imports and exports
  - Update worker-configuration.d.ts imports if needed
  - Export Drizzle schema types from src/db/schema.ts
  - Ensure CloudflareBindings type still works with Drizzle
  - Run pnpm run cf-typegen to regenerate types
  - Run pnpm run type-check to verify no type errors
  - _Requirements: 1.4, 6.4_

- [ ]* 12. Write unit tests for DatabaseClient methods
  - Create test file tests/unit/db.test.ts
  - Write tests for getOrCreateSession (create and update paths)
  - Write tests for createConversation
  - Write tests for createMessage
  - Write tests for listConversations with ordering
  - Write tests for getConversationWithMessages with joins
  - Test error handling and DatabaseError wrapping
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.4_

- [ ]* 13. Write integration tests for ORM operations
  - Create test file tests/integration/orm.test.ts
  - Set up local D1 database for testing
  - Apply migrations before tests
  - Test full CRUD operations on all tables
  - Test foreign key cascade deletes
  - Test constraint violations (invalid role, etc.)
  - Clean up test data after each test
  - _Requirements: 5.4, 5.5, 7.4_

- [ ]* 14. Verify backward compatibility with existing tests
  - Run all existing tests without modifications
  - Verify tests/contract/chat-stream.test.ts passes
  - Verify tests/integration/streaming.test.ts passes
  - Check that handler behavior is unchanged
  - Validate API response formats match expectations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Update documentation and scripts
  - Add migration workflow to README.md
  - Document how to generate new migrations
  - Document how to apply migrations to D1
  - Add drizzle-kit commands to package.json scripts
  - Update tech.md steering file with ORM information
  - _Requirements: 4.4, 4.5_
