# Implementation Plan

- [x] 1. Install OpenAI SDK dependency
  - Add `openai` package as a production dependency using pnpm
  - Verify package installation and check bundle size impact
  - _Requirements: 2.1_

- [x] 2. Refactor OpenRouterClient to use OpenAI SDK
  - [x] 2.1 Update OpenRouterClient constructor to initialize OpenAI SDK client
    - Import OpenAI SDK and create client instance with OpenRouter base URL
    - Configure SDK with API key from constructor config
    - Remove old fetch-based initialization code
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Implement streamChatCompletion using SDK's streaming API
    - Replace custom fetch call with SDK's `chat.completions.create()` with `stream: true`
    - Implement async generator that yields StreamChunk objects from SDK stream
    - Convert SDK's ChatCompletionChunk format to our StreamChunk format
    - Preserve AbortSignal support by passing signal to SDK options
    - _Requirements: 1.3, 1.5, 2.3_
  
  - [x] 2.3 Implement chatCompletion using SDK's non-streaming API
    - Replace custom fetch call with SDK's `chat.completions.create()` with `stream: false`
    - Extract content from SDK response and return as string
    - Preserve AbortSignal support
    - _Requirements: 1.3, 2.3_
  
  - [x] 2.4 Update error handling to use SDK error types
    - Import APIError and other error types from OpenAI SDK
    - Wrap SDK calls in try-catch blocks
    - Convert SDK errors to our error format maintaining same error messages
    - Ensure error structure matches previous implementation
    - _Requirements: 1.4, 3.3_

- [x] 3. Verify backward compatibility and test
  - [x] 3.1 Run existing contract tests to verify API compatibility
    - Execute `pnpm run test` and ensure all contract tests pass
    - Verify response format matches expected StreamChunk structure
    - _Requirements: 4.1, 3.1, 3.2_
  
  - [x] 3.2 Run existing integration tests for streaming functionality
    - Execute streaming integration tests
    - Verify end-to-end streaming works with OpenRouter
    - Check that error handling works correctly
    - _Requirements: 4.2, 4.4_
  
  - [x] 3.3 Test in development environment
    - Start dev server with `pnpm run dev`
    - Send test requests to verify streaming responses work
    - Test error scenarios (invalid API key, network errors)
    - Verify first chunk latency is acceptable
    - _Requirements: 4.3_

- [x] 4. Clean up unused code
  - Review `src/utils/stream.ts` to identify if parseSSEStream is still needed elsewhere
  - Remove parseSSEStream and related SSE parsing utilities if only used by OpenRouter
  - Update imports in any files that referenced removed utilities
  - _Requirements: 1.5_

- [x] 5. Verify bundle size constraints
  - Run production build with `pnpm run build`
  - Check bundle size to ensure it remains under 50KB target
  - Verify tree-shaking is working correctly for OpenAI SDK
  - _Requirements: 2.3_
