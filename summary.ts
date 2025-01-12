import { SchemaObject, OpenapiDocument } from "./types";

function formatSchema(schema: SchemaObject, indent: number = 0): string {
  const indentStr = "  ".repeat(indent);
  let output = "";

  if (schema.type === "object" && schema.properties) {
    output += "{\n";
    for (const [propName, prop] of Object.entries(schema.properties)) {
      const required = schema.required?.includes(propName) ? " (Required)" : "";
      output += `${indentStr}  ${propName}${required}: `;

      if (prop.description) {
        output += `// ${prop.description}\n${indentStr}  `;
      }

      if (prop.type === "object" && prop.properties) {
        output += formatSchema(prop, indent + 1);
      } else if (prop.type === "array" && prop.items) {
        output += `${prop.type}<${prop.items.type}>`;
        if (prop.items.type === "object" && prop.items.properties) {
          output += " of " + formatSchema(prop.items, indent + 1);
        }
      } else {
        output += prop.type;
        if (prop.enum) {
          output += ` (one of: ${prop.enum.join(", ")})`;
        }
        if (prop.format) {
          output += ` (${prop.format})`;
        }
        if (prop.default !== undefined) {
          output += ` = ${prop.default}`;
        }
      }
      output += ",\n";
    }
    output += `${indentStr}}`;
  } else if (schema.type === "array" && schema.items) {
    output += `array<${schema.items.type}>`;
    if (schema.items.type === "object" && schema.items.properties) {
      output += " of " + formatSchema(schema.items, indent);
    }
  } else {
    output += schema.type;
    if (schema.enum) {
      output += ` (one of: ${schema.enum.join(", ")})`;
    }
    if (schema.format) {
      output += ` (${schema.format})`;
    }
  }

  return output;
}

export function generateManPage(doc: OpenapiDocument): string {
  let manPage = "";

  // NAME section
  manPage += `# NAME\n\n`;
  manPage += `${doc.info.title} - API Command Line Interface\n\n`;

  // DESCRIPTION section
  if (doc.info.description) {
    manPage += `# DESCRIPTION\n\n`;
    manPage += `${doc.info.description}\n\n`;
  }

  // SYNOPSIS section
  manPage += `# SYNOPSIS\n\n`;
  manPage += `npx oapis <domain> <operation> [options...]\n\n`;

  // OPERATIONS section
  manPage += `# OPERATIONS\n\n`;

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!operation || !operation.operationId) continue;

      manPage += `## ${operation.operationId}\n\n`;

      if (operation.summary) {
        manPage += `${operation.summary}\n\n`;
      }

      if (operation.description) {
        manPage += `${operation.description}\n\n`;
      }

      // Command syntax
      manPage += `\`\`\`\n${operation.operationId}`;

      // Required parameters
      const requiredParams = (operation.parameters || [])
        .filter((p) => p.required)
        .map((p) => `<${p.name}>`)
        .join(" ");

      if (requiredParams) {
        manPage += ` ${requiredParams}`;
      }

      // Optional parameters
      const optionalParams = (operation.parameters || [])
        .filter((p) => !p.required)
        .map((p) => `[--${p.name}]`)
        .join(" ");

      if (optionalParams) {
        manPage += ` ${optionalParams}`;
      }

      manPage += `\n\`\`\`\n\n`;

      // Parameters section if any exist
      if (operation.parameters && operation.parameters.length > 0) {
        manPage += `### Parameters\n\n`;

        for (const param of operation.parameters) {
          manPage += `* \`${param.name}\` (${param.in})`;
          manPage += param.required ? " (Required)" : " (Optional)";
          if (param.description) {
            manPage += `\n  ${param.description}`;
          }
          if (param.schema?.enum) {
            manPage += `\n  Allowed values: ${param.schema.enum.join(", ")}`;
          }
          if (param.schema?.default !== undefined) {
            manPage += `\n  Default: ${param.schema.default}`;
          }
          manPage += "\n\n";
        }
      }

      // Request body section if it exists
      if (operation.requestBody) {
        manPage += `### Request Body\n\n`;
        const contentType = Object.keys(operation.requestBody.content)[0];
        const schema = operation.requestBody.content[contentType].schema;

        manPage += `Content-Type: ${contentType}\n\n`;
        manPage += `Schema:\n\`\`\`typescript\n${formatSchema(
          schema,
        )}\n\`\`\`\n\n`;
      }

      // Response section
      manPage += `### Responses\n\n`;
      for (const [code, response] of Object.entries(operation.responses)) {
        manPage += `* ${code}: ${
          response.description || "No description provided"
        }\n`;

        // Add response schema if available
        if (response.content) {
          const contentType = Object.keys(response.content)[0];
          const schema = response.content[contentType].schema;

          manPage += `\n  Content-Type: ${contentType}\n\n`;
          manPage += `  Schema:\n  \`\`\`typescript\n  ${formatSchema(
            schema,
          ).replace(/\n/g, "\n  ")}\n  \`\`\`\n\n`;
        } else {
          manPage += "\n";
        }
      }
    }
  }

  // Examples section
  manPage += `# EXAMPLES\n\n`;
  manPage += `Get help for a specific operation:\n`;
  manPage += `\`\`\`\nnpx oapis example.com help <operationId>\n\`\`\`\n\n`;

  // Environment section
  manPage += `# ENVIRONMENT\n\n`;
  manPage += `* \`OAPIS_API_KEY\`: API key for authentication\n`;
  manPage += `* \`OAPIS_BASE_URL\`: Override the default API base URL\n\n`;

  return manPage;
}

// Example usage
// Add a more complex sample with nested objects and arrays
const sampleDoc: OpenapiDocument = {
  info: {
    title: "Sample API",
    version: "1.0.0",
    description: "A sample API to demonstrate the man page conversion",
  },
  paths: {
    "/users": {
      post: {
        operationId: "createUser",
        summary: "Create a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email"],
                properties: {
                  username: {
                    type: "string",
                    description: "The user's unique username",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    description: "The user's email address",
                  },
                  profile: {
                    type: "object",
                    properties: {
                      firstName: {
                        type: "string",
                      },
                      lastName: {
                        type: "string",
                      },
                      age: {
                        type: "integer",
                        minimum: 0,
                      },
                      addresses: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            street: {
                              type: "string",
                            },
                            city: {
                              type: "string",
                            },
                            country: {
                              type: "string",
                              enum: ["US", "UK", "CA"],
                            },
                          },
                        },
                      },
                    },
                  },
                  settings: {
                    type: "object",
                    properties: {
                      theme: {
                        type: "string",
                        enum: ["light", "dark"],
                        default: "light",
                      },
                      notifications: {
                        type: "boolean",
                        default: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                    },
                    username: {
                      type: "string",
                    },
                    createdAt: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    errors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          field: {
                            type: "string",
                          },
                          message: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Generate man page
//console.log(generateManPage(sampleDoc));
