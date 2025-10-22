import axios, { type AxiosInstance, type AxiosError } from "axios";
import { z } from "zod";

// ------------------------------------------------------------------------------------------------
// Validation Schemas
// ------------------------------------------------------------------------------------------------

/**
 * Schema for validating OpenRouterService constructor options
 */
export const openRouterOptionsSchema = z.object({
  apiKey: z.string().min(1, "API key is required and cannot be empty"),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().min(1).optional(),
  defaultParameters: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().positive().optional(),
      top_p: z.number().min(0).max(1).optional(),
      frequency_penalty: z.number().min(-2).max(2).optional(),
      presence_penalty: z.number().min(-2).max(2).optional(),
    })
    .optional(),
});

/**
 * Schema for validating request payload before sending to API
 */
export const requestPayloadSchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1, "At least one message is required"),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  response_format: z
    .object({
      type: z.literal("json_schema"),
      json_schema: z.object({
        name: z.string(),
        strict: z.boolean(),
        schema: z.record(z.unknown()),
      }),
    })
    .optional(),
});

/**
 * Schema for validating API response structure
 */
export const apiResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  created: z.number(),
  choices: z
    .array(
      z.object({
        index: z.number(),
        message: z.object({
          role: z.string(),
          content: z.string(),
        }),
        finish_reason: z.string(),
      })
    )
    .min(1, "Response must contain at least one choice"),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

// ------------------------------------------------------------------------------------------------
// Type Definitions
// ------------------------------------------------------------------------------------------------

/**
 * Message role in chat conversation
 */
export type ChatRole = "system" | "user" | "assistant";

/**
 * Single chat message
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * Model parameters for LLM configuration
 */
export interface ModelParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * JSON Schema definition for structured responses
 */
export interface JsonSchema {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
}

/**
 * Response format configuration
 */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: JsonSchema;
}

/**
 * Options for chat completion requests
 */
export interface ChatOptions {
  model?: string;
  parameters?: ModelParameters;
  response_format?: ResponseFormat;
}

/**
 * Constructor options for OpenRouterService
 */
export interface OpenRouterOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultParameters?: ModelParameters;
}

/**
 * OpenRouter API payload structure
 */
interface OpenRouterPayload {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: ResponseFormat;
}

/**
 * OpenRouter API response structure
 */
interface OpenRouterApiResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Parsed chat response
 */
export interface ChatResponse<T = unknown> {
  id: string;
  model: string;
  content: T;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ------------------------------------------------------------------------------------------------
// Error Classes
// ------------------------------------------------------------------------------------------------

/**
 * Base error class for OpenRouter service errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

/**
 * Error thrown when API key is missing or invalid
 */
export class AuthenticationError extends OpenRouterError {
  constructor(message = "Invalid or missing API key") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when network request fails
 */
export class NetworkError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, "NETWORK_ERROR", undefined, details);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends OpenRouterError {
  constructor(
    message = "API rate limit exceeded",
    public retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends OpenRouterError {
  constructor(message: string, details?: unknown) {
    super(message, "SCHEMA_VALIDATION_ERROR", undefined, details);
    this.name = "SchemaValidationError";
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

/**
 * Error thrown when model is not found or unsupported
 */
export class ModelNotFoundError extends OpenRouterError {
  constructor(model: string) {
    super(`Model not found or unsupported: ${model}`, "MODEL_NOT_FOUND", 404);
    this.name = "ModelNotFoundError";
    Object.setPrototypeOf(this, ModelNotFoundError.prototype);
  }
}

// ------------------------------------------------------------------------------------------------
// OpenRouter Service Implementation
// ------------------------------------------------------------------------------------------------

/**
 * Service for interacting with OpenRouter API to perform LLM-based chat completions
 *
 * Features:
 * - Structured message building with system and user messages
 * - Configurable model parameters and response formats
 * - JSON Schema validation for structured responses
 * - Comprehensive error handling with automatic retries
 * - Secure API key management
 *
 * @example
 * ```ts
 * const service = new OpenRouterService({
 *   apiKey: process.env.OPENROUTER_API_KEY!,
 *   defaultModel: 'gpt-3.5-turbo',
 *   defaultParameters: { temperature: 0.7 }
 * });
 *
 * const response = await service.sendChatCompletion([
 *   { role: 'system', content: 'You are a helpful assistant' },
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class OpenRouterService {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultParameters: ModelParameters;
  private systemMessage?: ChatMessage;
  private userMessage?: ChatMessage;
  private responseFormat?: ResponseFormat;
  private currentModel: string;
  private currentParameters: ModelParameters;

  /**
   * Creates a new OpenRouterService instance
   *
   * @param options - Configuration options
   * @throws {OpenRouterError} When API key is missing
   * @throws {SchemaValidationError} When configuration is invalid
   */
  constructor(options: OpenRouterOptions) {
    // Validate configuration using Zod schema
    try {
      openRouterOptionsSchema.parse(options);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new SchemaValidationError(`Invalid configuration: ${error.errors[0].message}`, error.errors);
      }
      throw error;
    }

    // Set default values
    this.baseUrl = options.baseUrl || "https://openrouter.ai/api";
    this.defaultModel = options.defaultModel || "gpt-3.5-turbo";
    this.defaultParameters = options.defaultParameters || {};
    this.currentModel = this.defaultModel;
    this.currentParameters = { ...this.defaultParameters };

    // Initialize HTTP client with secure configuration
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:4321",
        "X-Title": "AI Flashcard Generator",
      },
      timeout: 60000, // 60 second timeout
      validateStatus: () => true, // Handle all status codes manually
    });
  }

  // ------------------------------------------------------------------------------------------------
  // Public Methods
  // ------------------------------------------------------------------------------------------------

  /**
   * Send a chat completion request to OpenRouter API
   *
   * @param messages - Array of chat messages (system, user, assistant)
   * @param options - Optional request-specific options
   * @returns Parsed and validated chat response
   * @throws {OpenRouterError} When request fails or validation errors occur
   */
  async sendChatCompletion<T = unknown>(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse<T>> {
    // Build request payload
    const payload = this.buildPayload(messages, options);

    // Execute request with retry logic
    const response = await this.executeRequest(payload);

    // Parse and validate response
    return this.parseResponse<T>(response, options?.response_format);
  }

  /**
   * Set the system message for chat completions
   *
   * @param message - System message content
   * @throws {OpenRouterError} When message is empty
   */
  setSystemMessage(message: string): void {
    if (!message.trim()) {
      throw new OpenRouterError("System message cannot be empty", "INVALID_SYSTEM_MESSAGE");
    }
    this.systemMessage = { role: "system", content: message };
  }

  /**
   * Set the user message for chat completions
   *
   * @param message - User message content
   * @throws {OpenRouterError} When message is empty
   */
  setUserMessage(message: string): void {
    if (!message.trim()) {
      throw new OpenRouterError("User message cannot be empty", "INVALID_USER_MESSAGE");
    }
    this.userMessage = { role: "user", content: message };
  }

  /**
   * Configure the expected response format with JSON Schema
   *
   * @param format - Response format configuration
   */
  setResponseFormat(format: ResponseFormat): void {
    this.responseFormat = format;
  }

  /**
   * Set the model and its parameters
   *
   * @param name - Model name (e.g., 'gpt-3.5-turbo')
   * @param parameters - Model parameters
   * @throws {OpenRouterError} When model name is empty
   */
  setModel(name: string, parameters?: ModelParameters): void {
    if (!name.trim()) {
      throw new OpenRouterError("Model name cannot be empty", "INVALID_MODEL_NAME");
    }
    this.currentModel = name;
    this.currentParameters = {
      ...this.defaultParameters,
      ...parameters,
    };
  }

  // ------------------------------------------------------------------------------------------------
  // Private Methods
  // ------------------------------------------------------------------------------------------------

  /**
   * Build the request payload for OpenRouter API
   *
   * @param messages - Chat messages
   * @param options - Request options
   * @returns Formatted payload
   */
  private buildPayload(messages: ChatMessage[], options?: ChatOptions): OpenRouterPayload {
    // Determine model and parameters
    const model = options?.model || this.currentModel;
    const parameters = {
      ...this.currentParameters,
      ...options?.parameters,
    };
    const responseFormat = options?.response_format || this.responseFormat;

    // Build payload
    const payload: OpenRouterPayload = {
      model,
      messages,
    };

    // Add optional parameters
    if (parameters.temperature !== undefined) {
      payload.temperature = parameters.temperature;
    }
    if (parameters.max_tokens !== undefined) {
      payload.max_tokens = parameters.max_tokens;
    }
    if (parameters.top_p !== undefined) {
      payload.top_p = parameters.top_p;
    }
    if (parameters.frequency_penalty !== undefined) {
      payload.frequency_penalty = parameters.frequency_penalty;
    }
    if (parameters.presence_penalty !== undefined) {
      payload.presence_penalty = parameters.presence_penalty;
    }
    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    return payload;
  }

  /**
   * Execute HTTP request with retry logic for transient errors
   *
   * @param payload - Request payload
   * @param attempt - Current attempt number (for internal use)
   * @returns API response
   * @throws {SchemaValidationError} When payload validation fails
   */
  private async executeRequest(payload: OpenRouterPayload, attempt = 1): Promise<OpenRouterApiResponse> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    // Validate payload before sending
    try {
      requestPayloadSchema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new SchemaValidationError(`Invalid request payload: ${error.errors[0].message}`, error.errors);
      }
      throw error;
    }

    try {
      const response = await this.client.post<OpenRouterApiResponse>("/v1/chat/completions", payload);

      // Handle different status codes
      if (response.status === 200 || response.status === 201) {
        return response.data;
      }

      // Handle specific error cases
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError();
      }

      if (response.status === 404) {
        throw new ModelNotFoundError(payload.model);
      }

      if (response.status === 429) {
        const retryAfter = response.headers["retry-after"] ? parseInt(response.headers["retry-after"], 10) : undefined;
        throw new RateLimitError(undefined, retryAfter);
      }

      // Generic error for other status codes
      throw new OpenRouterError(
        `Request failed with status ${response.status}`,
        "API_ERROR",
        response.status,
        response.data
      );
    } catch (error) {
      // Handle custom errors (don't retry)
      if (error instanceof OpenRouterError) {
        // Retry only for rate limit errors if we have retries left
        if (error instanceof RateLimitError && attempt < maxRetries) {
          const delay = error.retryAfter !== undefined ? error.retryAfter * 1000 : baseDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          return this.executeRequest(payload, attempt + 1);
        }
        throw error;
      }

      // Handle network errors with retry
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Network errors are retriable
        if (
          !axiosError.response &&
          (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT" || axiosError.code === "ENOTFOUND")
        ) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await this.sleep(delay);
            return this.executeRequest(payload, attempt + 1);
          }
          throw new NetworkError(
            `Network request failed after ${maxRetries} attempts: ${axiosError.message}`,
            axiosError
          );
        }

        // Other axios errors
        throw new OpenRouterError(
          `HTTP request failed: ${axiosError.message}`,
          "HTTP_ERROR",
          axiosError.response?.status,
          axiosError
        );
      }

      // Unknown error
      throw new OpenRouterError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        "UNKNOWN_ERROR",
        undefined,
        error
      );
    }
  }

  /**
   * Parse and validate API response
   *
   * @param response - Raw API response
   * @param responseFormat - Expected response format for validation
   * @returns Parsed chat response
   * @throws {SchemaValidationError} When response validation fails
   */
  private parseResponse<T>(response: OpenRouterApiResponse, responseFormat?: ResponseFormat): ChatResponse<T> {
    // Validate response structure using Zod schema
    try {
      apiResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new SchemaValidationError(`Invalid API response structure: ${error.errors[0].message}`, error.errors);
      }
      throw error;
    }

    // Additional validation for choices (schema already validates this, but be explicit)
    if (!response.choices || response.choices.length === 0) {
      throw new SchemaValidationError("Invalid response: no choices returned", response);
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new SchemaValidationError("Invalid response: missing message content", response);
    }

    // Parse content
    let content: T;
    try {
      // If response format is JSON schema, parse and validate
      if (responseFormat?.type === "json_schema") {
        content = JSON.parse(choice.message.content) as T;
      } else {
        content = choice.message.content as T;
      }
    } catch (error) {
      throw new SchemaValidationError("Failed to parse response content as JSON", error);
    }

    // Build response object
    return {
      id: response.id,
      model: response.model,
      content,
      finishReason: choice.finish_reason,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Validate data against a Zod schema
   *
   * @param data - Data to validate
   * @param schema - Zod schema
   * @returns Validated data
   * @throws {SchemaValidationError} When validation fails
   */
  private validateSchema<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new SchemaValidationError("Schema validation failed", error.errors);
      }
      throw new SchemaValidationError("Unknown validation error", error);
    }
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
