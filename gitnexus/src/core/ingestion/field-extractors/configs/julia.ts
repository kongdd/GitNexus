// gitnexus/src/core/ingestion/field-extractors/configs/julia.ts

import { SupportedLanguages } from 'gitnexus-shared';
import type { FieldExtractionConfig } from '../generic.js';
import type { SyntaxNode } from '../../utils/ast-helpers.js';

/**
 * Extract the struct name from a struct_definition node.
 *
 * Julia grammar has no named fields on struct_definition, so
 * childForFieldName('name') always returns null. The name lives at:
 *   struct_definition > type_head > identifier          (simple)
 *   struct_definition > type_head > binary_expression > identifier  (with <: supertype)
 */
function extractStructOwnerName(node: SyntaxNode): string | undefined {
  const typeHead = node.namedChild(0);
  if (typeHead?.type !== 'type_head') return undefined;
  const first = typeHead.firstNamedChild;
  if (first?.type === 'identifier') return first.text;
  // struct Foo <: Bar  →  binary_expression first child is the name identifier
  if (first?.type === 'binary_expression') return first.firstNamedChild?.text;
  return undefined;
}

/**
 * Extract field name + type from a struct field node.
 *
 * Handles three shapes that appear as direct children of struct_definition:
 *   identifier          →  plain untyped field:        `label`
 *   typed_expression    →  typed field:                `x::Float64`
 *   assignment          →  field with default (@with_kw): `x::Int = 1` or `flag = false`
 *
 * The `type_head` child (struct name / supertype) is excluded via fieldNodeTypes.
 */
function extractFieldName(node: SyntaxNode): string | undefined {
  if (node.type === 'identifier') return node.text;
  if (node.type === 'typed_expression') return node.firstNamedChild?.text;
  if (node.type === 'assignment') {
    const lhs = node.firstNamedChild;
    if (lhs?.type === 'typed_expression') return lhs.firstNamedChild?.text;
    if (lhs?.type === 'identifier') return lhs.text;
  }
  return undefined;
}

function extractFieldType(node: SyntaxNode): string | undefined {
  if (node.type === 'typed_expression') return node.namedChild(1)?.text?.trim();
  if (node.type === 'assignment') {
    const lhs = node.firstNamedChild;
    if (lhs?.type === 'typed_expression') return lhs.namedChild(1)?.text?.trim();
  }
  return undefined;
}

export const juliaConfig: FieldExtractionConfig = {
  language: SupportedLanguages.Julia,
  typeDeclarationNodes: ['struct_definition'],
  // Fields are direct children of struct_definition (no wrapper body node).
  // type_head holds the struct name and is excluded by listing only field shapes.
  fieldNodeTypes: ['identifier', 'typed_expression', 'assignment'],
  bodyNodeTypes: [],
  useOwnerAsBody: true,
  extractOwnerName: extractStructOwnerName,
  defaultVisibility: 'public',
  extractName: extractFieldName,
  extractType: extractFieldType,

  extractVisibility(_node) {
    return 'public';
  },

  isStatic(_node) {
    return false;
  },

  isReadonly(_node) {
    return false;
  },
};
