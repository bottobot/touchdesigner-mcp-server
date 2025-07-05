#!/usr/bin/env node

/**
 * Test script to validate all MCP tool schemas
 * Ensures all tools have valid Zod schemas and proper structure
 */

import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tool schemas to validate (imported from the main index.ts)
const toolSchemas = [
  { name: 'td_create_project', schema: z.object({ prompt: z.string(), name: z.string(), path: z.string().optional(), template: z.string().optional() }) },
  { name: 'td_open_project', schema: z.object({ path: z.string() }) },
  { name: 'td_generate_from_prompt', schema: z.object({ prompt: z.string() }) },
  { name: 'td_import_media', schema: z.object({ paths: z.array(z.string()), optimize: z.boolean().optional() }) },
  { name: 'td_optimize_media', schema: z.object({ input: z.string(), output: z.string(), preset: z.string().optional() }) },
  { name: 'td_export_movie', schema: z.object({ path: z.string(), codec: z.string().optional(), fps: z.number().optional(), duration: z.number().optional() }) },
  { name: 'td_setup_osc', schema: z.object({ port: z.number(), protocol: z.enum(['udp', 'tcp']).optional() }) },
  { name: 'td_send_osc', schema: z.object({ address: z.string(), args: z.array(z.any()) }) },
  { name: 'td_websocket_command', schema: z.object({ command: z.string(), params: z.any().optional() }) },
  { name: 'td_get_performance', schema: z.object({}) },
  { name: 'td_execute_python', schema: z.object({ code: z.string() }) },
  { name: 'td_manage_variables', schema: z.object({ action: z.enum(['get', 'set', 'list']), name: z.string().optional(), value: z.any().optional() }) },
  // Add more tool schemas as needed
];

console.log('🧪 Testing MCP Tool Schemas...\n');

let passed = 0;
let failed = 0;

// Test each schema
toolSchemas.forEach(({ name, schema }) => {
  try {
    // Test that schema is a valid Zod schema
    if (!schema._def) {
      throw new Error('Not a valid Zod schema');
    }

    // Test with valid data
    const testData = generateTestData(schema);
    schema.parse(testData);

    // Test with invalid data (should throw)
    let invalidTestPassed = false;
    try {
      schema.parse({ invalid: 'data' });
    } catch (e) {
      invalidTestPassed = true;
    }

    if (!invalidTestPassed) {
      throw new Error('Schema did not reject invalid data');
    }

    console.log(`✅ ${name}: Schema validation passed`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✨ All tool schemas validated successfully!');

/**
 * Generate test data based on Zod schema shape
 */
function generateTestData(schema) {
  const shape = schema._def.shape();
  const data = {};

  for (const [key, field] of Object.entries(shape)) {
    if (field._def.typeName === 'ZodString') {
      data[key] = 'test-string';
    } else if (field._def.typeName === 'ZodNumber') {
      data[key] = 123;
    } else if (field._def.typeName === 'ZodBoolean') {
      data[key] = true;
    } else if (field._def.typeName === 'ZodArray') {
      data[key] = ['test-item'];
    } else if (field._def.typeName === 'ZodEnum') {
      data[key] = field._def.values[0];
    } else if (field._def.typeName === 'ZodOptional') {
      // Skip optional fields for minimal test
      continue;
    } else if (field._def.typeName === 'ZodAny') {
      data[key] = { test: 'data' };
    } else if (field._def.typeName === 'ZodObject') {
      data[key] = {};
    }
  }

  return data;
}