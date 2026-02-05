# 1min-relay Cloudflare Worker

![GitHub package.json version](https://img.shields.io/github/package-json/v/7a6163/1min-relay-worker)

A TypeScript implementation of the 1min.ai API relay service, designed to run on Cloudflare Workers with distributed rate limiting and accurate token counting.

## Features

- **Complete API Relay**: Full compatibility with 1min.ai chat completions, responses, and image generation endpoints
- **OpenAI Responses API**: Structured outputs with JSON objects, JSON schema, and reasoning effort control
- **Distributed Rate Limiting**: Uses Cloudflare KV for consistent rate limiting across multiple worker instances
- **Accurate Token Counting**: Integrated with `gpt-tokenizer` for precise token calculation across all models
- **65+ AI Models**: Supports all latest models including GPT-4o, Claude 3.5, Mistral, Flux, Leonardo.ai, Qwen, and more
- **Streaming Support**: Real-time streaming responses for chat completions
- **TypeScript**: Full type safety and modern development experience
- **Vision Support**: Supports image input for vision models

## Supported Models

### Text Generation Models

- **OpenAI**: gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat-latest, gpt-5.1, gpt-5.1-codex, gpt-5.1-codex-mini, gpt-5.2, gpt-5.2-pro, o1, o1-mini, o3-mini, o4-mini, gpt-4.5-preview, gpt-4.1, gpt-4.1-nano, gpt-4.1-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo, openai/gpt-oss-20b, openai/gpt-oss-120b, and more
- **Claude**: claude-3-5-sonnet, claude-3-5-haiku, claude-3-7-sonnet, claude-sonnet-4, claude-opus-4, claude-haiku-4-5, claude-sonnet-4-5, claude-opus-4-5, claude-3-opus, claude-3-haiku
- **MistralAI**: mistral-large-latest, mistral-small-latest, pixtral-12b
- **GoogleAI**: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.5-flash, gemini-2.5-pro, gemini-2.5-flash-preview-05-20, gemini-2.5-flash-preview-04-17, gemini-2.5-pro-preview-05-06, gemini-3-pro-preview
- **DeepSeek**: deepseek-chat, deepseek-reasoner
- **Meta**: llama-2-70b-chat, meta-llama-3.1-405b-instruct, llama-4-maverick-instruct, llama-4-scout-instruct
- **xAI**: grok-2, grok-3, grok-3-mini, grok-4-0709, grok-4-fast-reasoning, grok-4-fast-non-reasoning
- **Perplexity Sonar**: sonar-reasoning-pro, sonar-reasoning, sonar-pro, sonar

### Vision Models (Image Input Support)

- **OpenAI**: gpt-5, gpt-5-mini, gpt-5-chat-latest, gpt-4o, gpt-4o-mini, gpt-4-turbo
- **xAI**: grok-4-fast-reasoning, grok-4-fast-non-reasoning

### Image Generation Models

- **DALL-E**: dall-e-2, dall-e-3
- **Midjourney**: midjourney, midjourney_6_1
- **Leonardo.ai**: phoenix, lightning-xl, anime-xl, diffusion-xl, kino-xl, vision-xl, albedo-base-xl
- **Flux**: flux-schnell, flux-dev, flux-pro, flux-1.1-pro
- **Qwen**: qwen-image-plus, qwen-image-max, qwen-image-edit-plus
- **Stable Diffusion**: stable-diffusion-xl-1024-v1-0, stable-diffusion-v1-6

### Speech Models

- **Speech-to-Text**: whisper-1, qwen3-asr-flash
- **Text-to-Speech**: tts-1, tts-1-hd, qwen3-tts-flash
- **Translation**: qwen3-livetranslate-flash

## API Endpoints

### Chat Completions

```
POST /v1/chat/completions
```

### Responses (Structured Outputs)

```
POST /v1/responses
```

#### Vision Support Example

```bash
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What do you see in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
            }
          }
        ]
      }
    ]
  }'
```

#### Responses API Examples

The Responses API supports structured outputs and reasoning control. It accepts two input formats:

**Simple Input Format:**

```bash
curl -X POST http://localhost:8787/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Tell me a three sentence bedtime story about a unicorn.",
    "reasoning_effort": "medium"
  }'
```

**Messages Format (for conversations):**

```bash
curl -X POST http://localhost:8787/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {
        "role": "user",
        "content": "Analyze the pros and cons of remote work"
      }
    ],
    "reasoning_effort": "high"
  }'
```

**JSON Object Response:**

```bash
curl -X POST http://localhost:8787/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Analyze the benefits of exercise",
    "response_format": {
      "type": "json_object"
    },
    "reasoning_effort": "high"
  }'
```

**JSON Schema Response:**

```bash
curl -X POST http://localhost:8787/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Create a user profile for John Doe, age 30, software engineer",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "user_profile",
        "description": "A user profile object",
        "schema": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "age": {"type": "number"},
            "profession": {"type": "string"},
            "skills": {"type": "array", "items": {"type": "string"}},
            "experience_years": {"type": "number"}
          },
          "required": ["name", "age", "profession"]
        }
      }
    }
  }'
```

**Responses API Features:**

- **Structured Outputs**: JSON objects and JSON schema validation
- **Reasoning Effort**: Control reasoning depth (low, medium, high)
- **Vision Support**: Same image input capabilities as Chat Completions
- **No Streaming**: Responses API returns complete responses only
- **Enhanced Prompting**: Automatically optimizes prompts for structured responses

### Image Generation

```
POST /v1/images/generations
```

### List Models

```
GET /v1/models
```

### Health Check

```
GET /
```

Returns information about all available endpoints:

- Chat Completions: `/v1/chat/completions`
- Responses: `/v1/responses`
- Image Generation: `/v1/images/generations`
- Models: `/v1/models`

## Rate Limiting

The worker implements distributed rate limiting with the following limits:

- **Requests per minute**: 60 per IP address
- **Tokens per minute**: 10,000 per IP address

Rate limits are enforced using Cloudflare KV storage, ensuring consistency across all worker instances.

## Setup

### Prerequisites

- Node.js 18+
- Wrangler CLI
- Cloudflare account with Workers and KV enabled

### Installation

1. Clone the repository:

```bash
git clone https://github.com/7a6163/1min-relay-worker.git
cd 1min-relay-worker
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in `wrangler.toml`:

```toml
[env.production.vars]
ONE_MIN_API_URL = "https://api.1min.ai/api/features"
ONE_MIN_CONVERSATION_API_URL = "https://api.1min.ai/api/conversations"
ONE_MIN_CONVERSATION_API_STREAMING_URL = "https://api.1min.ai/api/features?isStreaming=true"
ONE_MIN_ASSET_URL = "https://api.1min.ai/api/assets"
```

4. Create KV namespace for rate limiting:

```bash
wrangler kv:namespace create "RATE_LIMIT_STORE"
```

5. After running the command above, you'll receive a KV namespace ID. Copy this ID and replace `[your-kv-namespace-id]` in your `wrangler.jsonc` or `wrangler.toml` file:

```jsonc
"kv_namespaces": [
  {
    "binding": "RATE_LIMIT_STORE",
    "id": "your-kv-namespace-id-here" // Replace this with the ID from step 4
  }
]
```

### Development

Start the development server:

```bash
npm run dev
```

### Deployment

#### Quick Deployment

The fastest way to deploy is using the Cloudflare Deploy button at the top of this README:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/7a6163/1min-relay-worker)

#### Manual Deployment

1. Make sure you've completed all the setup steps above, including creating and configuring the KV namespace.

2. Build the project:

```bash
npm run build
```

3. Deploy to Cloudflare Workers:

```bash
npm run deploy
```

4. After successful deployment, you'll receive a URL for your worker (typically `https://1min-relay.your-subdomain.workers.dev`).

#### Custom Domain Configuration

To use a custom domain with your worker:

1. Log in to the Cloudflare dashboard.

2. Navigate to the Workers & Pages section.

3. Select your deployed worker.

4. Click on "Triggers" tab.

5. Under "Custom Domains", click "Add Custom Domain" and follow the instructions.

#### Deployment Troubleshooting

If you encounter issues during deployment:

1. **Authentication errors**: Run `wrangler login` to authenticate with your Cloudflare account.

2. **KV binding errors**: Ensure your KV namespace is correctly configured in `wrangler.jsonc`.

3. **Build errors**: Make sure all dependencies are installed with `npm install`.

4. **Rate limit errors**: If you're hitting Cloudflare's deployment rate limits, wait a few minutes before trying again.

5. **Environment variable issues**: Verify all required environment variables are set in `wrangler.jsonc`.

## Configuration

### Environment Variables

The following environment variables are configured in `wrangler.jsonc`:

- `ONE_MIN_API_URL`: 1min.ai API endpoint for features
- `ONE_MIN_CONVERSATION_API_URL`: 1min.ai conversation API endpoint
- `ONE_MIN_CONVERSATION_API_STREAMING_URL`: 1min.ai streaming API endpoint
- `ONE_MIN_ASSET_URL`: 1min.ai asset API endpoint

### KV Namespace

- `RATE_LIMIT_STORE`: Used for distributed rate limiting storage

## Usage Examples

### Chat Completion

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Responses (Structured Output)

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Analyze the benefits of renewable energy",
    "response_format": {
      "type": "json_object"
    },
    "reasoning_effort": "high"
  }'
```

### Image Generation

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A beautiful sunset over mountains",
    "n": 1,
    "size": "1024x1024"
  }'
```

### Streaming Chat

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": true
  }'
```

## Architecture

The worker is built with:

- **TypeScript**: For type safety and better development experience
- **Cloudflare Workers**: Serverless edge computing platform
- **Cloudflare KV**: Distributed key-value storage for rate limiting
- **gpt-tokenizer**: Accurate token counting for all supported models

## Rate Limiting Implementation

The distributed rate limiting system:

1. Uses IP address + endpoint as the key
2. Tracks both request count and token count per minute
3. Stores data in Cloudflare KV with TTL
4. Returns proper HTTP 429 responses with rate limit headers
5. Ensures consistency across all worker instances globally

## Token Counting

Accurate token counting is implemented using the `gpt-tokenizer` library, which provides good approximations for all supported models including GPT, Claude, Mistral, and others. A character-based fallback is used if tokenization fails.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- Create an issue in the repository
- Check the Cloudflare Workers documentation
- Review the 1min.ai API documentation
