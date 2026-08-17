import { Injectable } from '@nestjs/common';
import { CaptureEntry } from '../interfaces/capture-entry.interface';

const OPERATION_RESOURCE_TYPES = new Set(['xhr', 'fetch', 'document']);
const MAX_EXAMPLES_PER_GROUP = 20;

type JsonSchema = Record<string, unknown>;

interface OperationGroup {
  method: string;
  template: string;
  paramNames: string[];
  entries: CaptureEntry[];
}

interface CaptureGlobals {
  baseUrl: string;
  hasBearerAuth: boolean;
  sessionCookieName: string | null;
}

/**
 * Builds an OpenAPI 3.0 document from a browser agent run's captured network traffic. There is no
 * prior implementation of this anywhere in the repo (scripts/api-generator only goes as far as a
 * Postman collection) — path-parameter templating and JSON Schema inference here are heuristics
 * based on the captured examples, not a guarantee of a fully accurate spec.
 *
 * Deliberately does not embed literal captured values (tokens, cookies, secrets) anywhere in the
 * output — only structural types are inferred, and auth is described declaratively via
 * `components.securitySchemes` rather than by example.
 */
@Injectable()
export class OpenApiSpecBuilderService {
  build(
    entries: CaptureEntry[],
    options: { title: string },
  ): Record<string, unknown> {
    const apiEntries = entries.filter(
      (entry) =>
        OPERATION_RESOURCE_TYPES.has(entry.request.resourceType) &&
        entry.request.method !== 'WEBSOCKET' &&
        !entry.failed &&
        entry.response !== null,
    );

    const globals = this.extractGlobals(apiEntries);
    const groups = this.groupByOperation(apiEntries);

    const paths: Record<string, Record<string, unknown>> = {};
    for (const group of groups.values()) {
      const pathItem = (paths[group.template] ??= {});
      pathItem[group.method.toLowerCase()] = this.buildOperation(
        group,
        globals,
      );
    }

    const securitySchemes: Record<string, unknown> = {};
    if (globals.hasBearerAuth) {
      securitySchemes.bearerAuth = { type: 'http', scheme: 'bearer' };
    }
    if (globals.sessionCookieName) {
      securitySchemes.cookieAuth = {
        type: 'apiKey',
        in: 'cookie',
        name: globals.sessionCookieName,
      };
    }

    return {
      openapi: '3.0.3',
      info: {
        title: options.title,
        version: '1.0.0',
        description: `Auto-generated from ${apiEntries.length} request(s) captured during an autonomous browser agent run.`,
      },
      servers: globals.baseUrl ? [{ url: globals.baseUrl }] : [],
      paths,
      ...(Object.keys(securitySchemes).length
        ? { components: { securitySchemes } }
        : {}),
    };
  }

  private groupByOperation(
    entries: CaptureEntry[],
  ): Map<string, OperationGroup> {
    const groups = new Map<string, OperationGroup>();

    for (const entry of entries) {
      const { template, paramNames } = templatePath(entry.request.path);
      const key = `${entry.request.method} ${template}`;
      const existing = groups.get(key);
      if (existing) {
        if (existing.entries.length < MAX_EXAMPLES_PER_GROUP)
          existing.entries.push(entry);
      } else {
        groups.set(key, {
          method: entry.request.method,
          template,
          paramNames,
          entries: [entry],
        });
      }
    }

    return groups;
  }

  private buildOperation(
    group: OperationGroup,
    globals: CaptureGlobals,
  ): Record<string, unknown> {
    const parameters: Array<Record<string, unknown>> = group.paramNames.map(
      (name) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      }),
    );

    for (const queryParam of this.collectQueryParams(group.entries)) {
      parameters.push({
        name: queryParam.name,
        in: 'query',
        required: queryParam.alwaysPresent,
        schema: { type: 'string' },
      });
    }

    const operation: Record<string, unknown> = {
      operationId: operationId(group.method, group.template),
      summary: `${group.method} ${group.template}`,
      ...(parameters.length ? { parameters } : {}),
      responses: this.buildResponses(group.entries),
    };

    const requestBody = this.buildRequestBody(group.entries);
    if (requestBody) operation.requestBody = requestBody;

    const security = this.buildSecurity(group.entries, globals);
    if (security) operation.security = security;

    return operation;
  }

  private collectQueryParams(
    entries: CaptureEntry[],
  ): Array<{ name: string; alwaysPresent: boolean }> {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const key of Object.keys(entry.request.query)) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([name, count]) => ({
      name,
      alwaysPresent: count === entries.length,
    }));
  }

  private buildRequestBody(
    entries: CaptureEntry[],
  ): Record<string, unknown> | null {
    const jsonBodies = entries
      .map((entry) => entry.request.body)
      .filter((body) => body.encoding === 'json' && body.parsed != null)
      .map((body) => body.parsed);

    if (jsonBodies.length > 0) {
      const schema = jsonBodies.reduce<JsonSchema>(
        (acc, value) => mergeSchemas(acc, inferSchema(value)),
        {},
      );
      return { required: true, content: { 'application/json': { schema } } };
    }

    const formBodies = entries
      .map((entry) => entry.request.body)
      .filter(
        (body) => body.encoding === 'form-urlencoded' && body.parsed != null,
      )
      .map((body) => body.parsed);

    if (formBodies.length > 0) {
      const schema = formBodies.reduce<JsonSchema>(
        (acc, value) => mergeSchemas(acc, inferSchema(value)),
        {},
      );
      return {
        required: true,
        content: { 'application/x-www-form-urlencoded': { schema } },
      };
    }

    return null;
  }

  private buildResponses(entries: CaptureEntry[]): Record<string, unknown> {
    const byStatus = new Map<number, CaptureEntry[]>();
    for (const entry of entries) {
      if (!entry.response) continue;
      const list = byStatus.get(entry.response.status) ?? [];
      list.push(entry);
      byStatus.set(entry.response.status, list);
    }

    const responses: Record<string, unknown> = {};
    for (const [status, statusEntries] of byStatus.entries()) {
      const jsonBodies = statusEntries
        .map((entry) => entry.response)
        .filter(
          (response) =>
            response &&
            response.format === 'json' &&
            !response.truncated &&
            response.body != null,
        )
        .map((response) => response!.body);

      const description = `${status} response`;
      if (jsonBodies.length > 0) {
        const schema = jsonBodies.reduce<JsonSchema>(
          (acc, value) => mergeSchemas(acc, inferSchema(value)),
          {},
        );
        responses[String(status)] = {
          description,
          content: { 'application/json': { schema } },
        };
      } else {
        responses[String(status)] = { description };
      }
    }

    if (Object.keys(responses).length === 0) {
      responses.default = { description: 'Response' };
    }

    return responses;
  }

  private buildSecurity(
    entries: CaptureEntry[],
    globals: CaptureGlobals,
  ): Array<Record<string, unknown[]>> | null {
    const usesBearer = entries.some((entry) => {
      const header = findHeader(entry.request.headers, 'authorization');
      return header != null && /^Bearer\s+/i.test(header);
    });
    const usesSessionCookie =
      globals.sessionCookieName != null &&
      entries.some(
        (entry) => globals.sessionCookieName! in entry.request.cookies,
      );

    const requirements: Array<Record<string, unknown[]>> = [];
    if (usesBearer) requirements.push({ bearerAuth: [] });
    if (usesSessionCookie) requirements.push({ cookieAuth: [] });

    return requirements.length ? requirements : null;
  }

  private extractGlobals(entries: CaptureEntry[]): CaptureGlobals {
    const originCounts = new Map<string, number>();
    let hasBearerAuth = false;
    let sessionCookieName: string | null = null;

    for (const entry of entries) {
      const origin = safeOrigin(entry.request.url);
      if (origin) originCounts.set(origin, (originCounts.get(origin) ?? 0) + 1);

      const authHeader = findHeader(entry.request.headers, 'authorization');
      if (authHeader && /^Bearer\s+/i.test(authHeader)) hasBearerAuth = true;

      if (!sessionCookieName) {
        const cookieEntries = Object.entries(entry.request.cookies);
        const sessionLike =
          cookieEntries.find(([key]) => /session/i.test(key)) ??
          cookieEntries[0];
        if (sessionLike) sessionCookieName = sessionLike[0];
      }
    }

    const baseUrl =
      [...originCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return { baseUrl, hasBearerAuth, sessionCookieName };
  }
}

/** Segments that look like UUIDs, numeric ids, or opaque hashes are templated into path params. */
function templatePath(pathname: string): {
  template: string;
  paramNames: string[];
} {
  const segments = pathname.split('/').filter(Boolean);
  const paramNames: string[] = [];
  const usedNames = new Set<string>();

  const templated = segments.map((segment, index) => {
    if (!isIdLikeSegment(segment)) return encodeSegment(segment);

    let paramName = toParamName(segments[index - 1]);
    if (usedNames.has(paramName)) {
      let suffix = 2;
      while (usedNames.has(`${paramName}${suffix}`)) suffix += 1;
      paramName = `${paramName}${suffix}`;
    }
    usedNames.add(paramName);
    paramNames.push(paramName);
    return `{${paramName}}`;
  });

  return { template: `/${templated.join('/')}`, paramNames };
}

function isIdLikeSegment(segment: string): boolean {
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    )
  )
    return true;
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{24}$/i.test(segment)) return true;
  if (
    /^[A-Za-z0-9_-]{20,}$/.test(segment) &&
    /[0-9]/.test(segment) &&
    /[A-Za-z]/.test(segment)
  )
    return true;
  return false;
}

function toParamName(prevSegment: string | undefined): string {
  if (!prevSegment) return 'id';
  const singular = prevSegment.endsWith('ies')
    ? `${prevSegment.slice(0, -3)}y`
    : prevSegment.endsWith('s') && !prevSegment.endsWith('ss')
      ? prevSegment.slice(0, -1)
      : prevSegment;
  const camel = singular.replace(/[-_](\w)/g, (_match, char: string) =>
    char.toUpperCase(),
  );
  return `${camel}Id`;
}

function encodeSegment(segment: string): string {
  // OpenAPI path templates use literal "{"/"}" only for params — escape any stray braces in real
  // path segments so they can't be mistaken for a parameter.
  return segment.replace(/[{}]/g, '');
}

function operationId(method: string, template: string): string {
  const parts = template
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith('{')
        ? `By${capitalize(segment.slice(1, -1))}`
        : capitalize(segment),
    );
  return `${method.toLowerCase()}${parts.join('')}`;
}

function capitalize(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

function findHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Structural-only inference — never carries a literal captured value into the schema. */
function inferSchema(value: unknown): JsonSchema {
  if (value === null || value === undefined) return {};
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferSchema(value[0]) : {},
    };
  }
  if (typeof value === 'object') {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      properties[key] = inferSchema(val);
      if (val !== null && val !== undefined) required.push(key);
    }
    return {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
    };
  }
  if (typeof value === 'string') return { type: 'string' };
  if (typeof value === 'number')
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  return {};
}

/**
 * Unions properties across examples of the same operation; a key is only marked `required` when
 * every merged example had it. Type conflicts between examples keep the first-seen type — noted
 * as a known limitation of example-driven inference.
 */
function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (!a || Object.keys(a).length === 0) return b;
  if (!b || Object.keys(b).length === 0) return a;
  if (a.type !== b.type) return a;

  if (a.type === 'object') {
    const aProps = (a.properties as Record<string, JsonSchema>) ?? {};
    const bProps = (b.properties as Record<string, JsonSchema>) ?? {};
    const properties: Record<string, JsonSchema> = { ...aProps };
    for (const [key, schema] of Object.entries(bProps)) {
      properties[key] = properties[key]
        ? mergeSchemas(properties[key], schema)
        : schema;
    }
    const aRequired = (a.required as string[]) ?? [];
    const bRequired = (b.required as string[]) ?? [];
    const required = aRequired.filter((key) => bRequired.includes(key));
    return {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
    };
  }

  if (a.type === 'array') {
    return {
      type: 'array',
      items: mergeSchemas(a.items as JsonSchema, b.items as JsonSchema),
    };
  }

  return a;
}
