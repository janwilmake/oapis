# OpenAPI Transformer

Transform any OpenAPI/Swagger endpoint into ready-to-use code and documentation instantly.

## Overview

OpenAPI Transformer is an API that takes any OpenAPI or Swagger endpoint and generates the exact artifacts you need - whether that's TypeScript code, documentation, or schema validation. Simply point it at an API, specify what you want, and get production-ready output.

## Usage

```
GET https://oapis.org/{type}/{hostname}/{route}
```

Where:

- `type`: What you want to generate (ts, openapi, docs, etc.)
- `hostname`: API hostname (e.g., api.stripe.com)
- `route`: Specific endpoint or operationId

## Features

- **TypeScript Generation**: Get fully-typed API client code
- **Schema Extraction**: Pull request/response schemas for validation
- **Documentation**: Generate man-page style summaries
- **Format Conversion**: Convert between OpenAPI 3.0 and Swagger
- **ESM/CJS Support**: Get JavaScript in your preferred module format

## Examples

Get TypeScript for Stripe's create customer endpoint:

```
GET /ts/stripe.com/v1/customers
```

Get a man-page style summary of GitHub's repo API:

```
GET /summary/api.github.com/repos/{owner}/{repo}
```

Extract response schema from Twitter's tweet lookup:

```
GET /response/api.twitter.com/2/tweets/{id}
```

## Response Types

- `application/json` (default)
- `text/yaml`
- `text/typescript`
- `text/javascript`

## Value Proposition

Instead of manually parsing OpenAPI specs, writing type definitions, or maintaining documentation, this API handles all the heavy lifting. Point it at any API endpoint and instantly get what you need for production use.
