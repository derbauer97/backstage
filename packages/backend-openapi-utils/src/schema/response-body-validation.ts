/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JsonObject } from '@backstage/types';
import { Operation, ParserOptions, ResponseParser } from './types';
import { OperationError, OperationResponseError } from './errors';
import Ajv from 'ajv';
import { OperationObject, ResponseObject } from 'openapi3-ts';

class DisabledResponseBodyParser
  implements ResponseParser<JsonObject | undefined>
{
  operation: Operation;
  constructor(operation: Operation) {
    this.operation = operation;
  }
  async parse(response: Response): Promise<JsonObject | undefined> {
    const body = await response.text();
    if (body?.length) {
      throw new OperationError(
        this.operation,
        'Received a body but no schema was found',
      );
    }
    return undefined;
  }
}

export class ResponseBodyParser
  implements ResponseParser<JsonObject | undefined>
{
  operation: Operation;
  ajv: Ajv;

  static fromOperation(operation: Operation, options: ParserOptions) {
    return operation.schema.responses &&
      Object.keys(operation.schema.responses).length
      ? new ResponseBodyParser(operation, options)
      : new DisabledResponseBodyParser(operation);
  }

  constructor(operation: Operation, options: ParserOptions) {
    this.operation = operation;
    this.ajv = options.ajv;
    const responseSchemas = operation.schema.responses;
    for (const [statusCode, schema] of Object.entries(responseSchemas)) {
      if (!schema.content) {
        continue;
      } else if (!schema.content['application/json']) {
        throw new OperationError(
          this.operation,
          `No application/json content type found in response for status code ${statusCode}`,
        );
      } else if ('$ref' in schema.content['application/json'].schema) {
        throw new OperationError(
          this.operation,
          'Reference objects are not supported',
        );
      }
    }
  }

  async parse(response: Response): Promise<JsonObject | undefined> {
    const body = await response.text();
    const responseSchema = this.findResponseSchema(
      this.operation.schema,
      response,
    );
    if (!responseSchema?.content && !body?.length) {
      // If there is no content in the response schema and no body in the response, then the response is valid.
      // eg 204 No Content
      return undefined;
    }
    if (!responseSchema) {
      throw new OperationResponseError(
        this.operation,
        response,
        `No schema found.`,
      );
    }

    if (!responseSchema?.content && body?.length) {
      throw new OperationResponseError(
        this.operation,
        response,
        'Received a body but no schema was found',
      );
    }
    if (!responseSchema?.content!['application/json']) {
      throw new OperationResponseError(
        this.operation,
        response,
        'No application/json content type found in response',
      );
    }
    const schema = responseSchema.content!['application/json'].schema;
    if (!schema) {
      throw new OperationError(this.operation, 'No schema found in response');
    }
    if ('$ref' in schema) {
      throw new OperationResponseError(
        this.operation,
        response,
        'Reference objects are not supported',
      );
    }

    if (!schema.required && !body?.length) {
      throw new OperationResponseError(
        this.operation,
        response,
        'Response body is required but missing',
      );
    } else if (!schema.required && !body?.length) {
      // If there is no content in the response schema and no body in the response, then the response is valid
      return undefined;
    }

    const validate = this.ajv.compile(schema);
    const jsonBody = (await response.json()) as JsonObject;
    const valid = validate(jsonBody);
    if (!valid) {
      throw new OperationResponseError(
        this.operation,
        response,
        'Response body validation failed',
      );
    }
    return jsonBody;
  }

  private findResponseSchema(
    operationSchema: OperationObject,
    response: Response,
  ): ResponseObject | undefined {
    const { status } = response;
    return (
      operationSchema.responses?.[status] ?? operationSchema.responses?.default
    );
  }
}
