# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2025-07-25
### 🎉 Major Release - Hono Framework Migration

This release represents a complete architectural overhaul, migrating from native Cloudflare Workers to the Hono framework while maintaining 100% API compatibility.

### Added
- **Hono Framework Integration** - Modern web framework with superior type safety and middleware support
- **Enhanced Type System** - Comprehensive TypeScript types with `HonoEnv` environment definitions
- **Unified Middleware Architecture**:
  - Global error handling middleware with structured error responses
  - CORS middleware using Hono's built-in support
  - Authentication middleware for consistent API key validation
  - Rate limiting middleware adapted from existing implementation
- **Modular Route Structure** - Clean separation of routes in dedicated files (`src/routes/`)
- **Custom Error Classes** - `ValidationError`, `AuthenticationError`, `RateLimitError`, `ApiError`
- **Enhanced Error Logging** - Detailed error tracking with stack traces and request context
- **Image Generation Authentication** - Added missing auth middleware to image generation endpoint

### Changed
- **Complete Architecture Rewrite** - Migrated from manual routing to Hono's declarative routing
- **Middleware Execution Order** - Proper middleware chain with error handler at the outermost layer
- **Error Response Format** - Standardized error responses matching OpenAI API format:
  ```json
  {
    "error": {
      "message": "Error description",
      "type": "error_type",
      "param": null,
      "code": "error_code"
    }
  }
  ```
- **File Organization** - New structure with `src/routes/`, dedicated middleware files, and enhanced types
- **Request Processing Flow** - Cleaner, more maintainable request handling pipeline
- **Dependencies** - Added `hono@^4.8.5` and `prettier@^3.6.2` as dev dependency

### Fixed
- **Authentication Error Handling** - Properly returns 401 with structured error when API key is missing
- **Image Generation Errors** - Better error messages with upstream API error details
- **JSON Parsing Errors** - Graceful handling of invalid JSON in request bodies
- **Unhandled Exceptions** - Global error catcher ensures all errors return structured responses

### Technical Details
- **Breaking Changes**: None - maintains full API compatibility
- **Performance**: Maintained edge performance characteristics
- **Type Safety**: Full TypeScript support with enhanced type definitions
- **Middleware Pattern**: Composable middleware with proper error boundaries

### Migration Notes
While this is a major version bump due to the architectural changes, the API remains 100% compatible. No changes are required for existing API consumers.

## [2.11.0] - 2025-07-24
### Added
- **Web Search Integration with `:online` Model Suffix**
  - Add `:online` suffix to any supported model name to enable web search functionality
  - Example usage: `gpt-4o:online`, `claude-3-5-sonnet-20240620:online`
  - Real-time information retrieval with search results integrated into AI responses
  - Supported on both `/v1/chat/completions` and `/v1/responses` endpoints
  - Full streaming support for web search enabled requests
- **Web Search Configuration Options**
  - `WEB_SEARCH_NUM_OF_SITE` environment variable (default: 1)
  - `WEB_SEARCH_MAX_WORD` environment variable (default: 500)
- **Graceful Degradation System**
  - Automatic fallback to standard mode when API doesn't support webSearch parameters
  - `X-WebSearch-Degraded` response header to indicate when degradation occurred
  - Enhanced error logging for monitoring and debugging

### Changed
- Enhanced `OneMinApiService` to support webSearch parameters in both chat and streaming requests
- Updated `ChatHandler` and `ResponseHandler` to integrate model name parsing
- Improved error handling with detailed validation messages for invalid model formats

### Technical
- Added `src/utils/model-parser.ts` - ModelParser class for parsing `:online` suffix and validation
- Updated `src/services/onemin-api.ts` - Added webSearch parameter support and graceful degradation
- Updated `src/handlers/chat.ts` - Integrated model parsing for chat completions
- Updated `src/handlers/responses.ts` - Integrated model parsing for structured responses
- Updated `src/types/env.ts` - Added optional web search configuration environment variables
- Enhanced error handling with automatic retry logic for unsupported webSearch parameters

## [2.10.0] - 2025-07-24
### Added
- New OpenAI models support:
  - `o3-mini`
  - `o4-mini`
  - `gpt-4.5-preview`
  - `gpt-4.1`
  - `gpt-4.1-nano`
  - `gpt-4.1-mini`
- New Claude models support:
  - `claude-3-5-haiku-20241022`
  - `claude-3-7-sonnet-20250219`
- New Gemini models support:
  - `gemini-2.0-flash`
  - `gemini-2.0-flash-lite`
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-2.5-flash-preview-05-20`
  - `gemini-2.5-pro-preview-05-06`
- New Meta models support:
  - `meta/meta-llama-3.1-405b-instruct`
  - `meta/llama-4-maverick-instruct`
  - `meta/llama-4-scout-instruct`
- New DeepSeek models support:
  - `deepseek-chat`
  - `deepseek-reasoner`
- New Perplexity Sonar models support:
  - `sonar-reasoning-pro`
  - `sonar-reasoning`
  - `sonar-pro`
  - `sonar`
- New Flux model support:
  - `flux-1.1-pro`
- New Midjourney model support:
  - `midjourney_6_1`

## [2.9.0] - 2025-01-27
### Added
- **OpenAI Responses API** support (`/v1/responses`)
  - Structured output support with JSON objects and JSON schema validation
  - Reasoning effort control (low, medium, high)
  - Enhanced prompting for structured responses
  - Vision support with image inputs (same as Chat Completions)
  - Rate limiting and API key validation
- New `ResponseRequest` interface for Responses API
- `ResponseHandler` class for handling structured outputs and reasoning requests
- Enhanced system prompting based on response format and reasoning effort
- JSON parsing and validation for structured responses

### Changed
- Updated root endpoint to display all available API endpoints
- Enhanced API documentation with Responses API examples
- Improved error handling for structured response parsing

### Technical
- Added `src/handlers/responses.ts` - Main Responses API handler
- Updated `src/constants/config.ts` - Added RESPONSES endpoint constant
- Updated `src/types/requests.ts` - Added ResponseRequest interface
- Updated `src/index.ts` - Added routing and rate limiting for responses endpoint
- Updated `src/handlers/index.ts` - Exported ResponseHandler
- Created comprehensive testing documentation for both APIs

## [2.8.0] - 2025-01-27
### Changed
- Replaced custom UUID generation with native Cloudflare Workers Web Crypto API
- Removed `generateUUID()` wrapper function in favor of direct `crypto.randomUUID()` usage
- Simplified codebase by eliminating unnecessary UUID utility file

### Technical
- Deleted `src/utils/uuid.ts` file
- Updated all UUID generation calls to use `crypto.randomUUID()` directly
- Improved performance and security with native cryptographic UUID generation

## [2.7.0] - 2025-07-15
### Added
- New Claude models support:
  - `claude-sonnet-4-20250514`
  - `claude-opus-4-20250514`

## [2.6.0] - 2025-07-05
### Added
- New Gemini models support:
  - `gemini-2.0-flash`
  - `gemini-2.0-flash-lite`
  - `gemini-2.5-flash-preview-05-20`
  - `gemini-2.5-flash-preview-04-17`
  - `gemini-2.5-pro-preview-05-06`
- New Perplexity Sonar models support:
  - `sonar-reasoning-pro`
  - `sonar-reasoning`
  - `sonar-pro`
  - `sonar`

## [2.5.0] - 2025-07-04
### Added
- Image search capability
- Enhanced image processing and search functionality

## [2.0.0] - 2025-07-03
### Added
- Initial release
- 1min.ai API integration support
- Image generation functionality
- Cloudflare Workers deployment support
- Basic middleware and handler architecture
- Token validation and management features

### Changed
- Updated API response handling logic to use `temporaryUrl` field instead of `images` array

### Technical
- Established TypeScript project structure
- Configured Wrangler deployment environment
- Implemented modular architecture (handlers, services, middleware, utils)
