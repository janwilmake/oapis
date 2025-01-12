# OpenAPI Transformer

> NB: Use this at your own risk, works for MOST OpenAPIs, not all. Not thoroughly tested yet. PRs are welcome! One major limitation right now is that it looks at `openapi.json` at the domain provided ONLY. It won't look elsewhere.

Transform any OpenAPI/Swagger endpoint into ready-to-use code and documentation instantly.

## Overview

OpenAPI Transformer is an API that takes any OpenAPI or Swagger endpoint and generates the exact artifacts you need - whether that's TypeScript code, documentation, or schema validation. Simply point it at an API, specify what you want, and get production-ready output.

## Usage

```
GET https://oapis.org/{type}/{hostname}/{route}
```

Where:

- `type`: What you want to generate (ts, openapi, docs, etc.)
- `hostname`: API hostname (e.g., chatcompletions.com)
- `route`: Specific endpoint or operationId

## Features

- **TypeScript Generation**: Get fully-typed API client code
- **Schema Extraction**: Pull request/response schemas for validation
- **Documentation**: Generate man-page style summaries
- **Format Conversion**: Convert between OpenAPI 3.0 and Swagger
- **ESM/CJS Support**: Get JavaScript in your preferred module format

## Examples

Get a man-page style summary:

```
GET /summary/chatcompletions.com/getChatCompletions
```

Extract response schema:

```
GET /response/chatcompletions/chat/completions
```

Typescript Example (Works with Deno):

```ts
// Save this as test.ts and run it using `deno run --allow-net --allow-import test.ts`

// Import the chat completion function directly
import createChatCompletion from "https://oapis.org/ts/chatcompletions/createChatCompletion";

// Use it without any SDK installation
const completion = await createChatCompletion({
  headers: {
    "X-LLM-API-Key": "YOUR_SECRET",
    "X-LLM-Base-Path": "https://api.deepseek.com/v1",
  },
  body: {
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
    ],
    model: "deepseek-chat",
  },
});

if (completion.body) {
  console.log(completion.body.choices[0].message.content);
  //Hello! How can I assist you today? 😊
} else {
  console.log("ERROR", completion.status);
}
// This works like a charm!
```

## Value Proposition

Instead of manually parsing OpenAPI specs, writing type definitions, or maintaining documentation, this API handles all the heavy lifting. Point it at any API endpoint and instantly get what you need for production use.
