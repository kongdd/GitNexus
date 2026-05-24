// gitnexus/src/core/ingestion/field-extractors/configs/julia.ts
// Verified against tree-sitter-julia grammar

import { SupportedLanguages } from 'gitnexus-shared';
import type { FieldExtractionConfig } from '../generic.js';

/**
 * Julia field extraction config.
 *
 * Julia struct fields appear as typed or untyped identifiers inside struct bodies:
 *   struct Point
 *     x::Float64
 *     y::Float64
 *   end
 *
 * In tree-sitter-julia the struct body contains field declarations.
 * Each field is either an identifier or a typed_parameter node.
 */
export const juliaConfig: FieldExtractionConfig = {
  language: SupportedLanguages.Julia,
  typeDeclarationNodes: ['struct_definition'],
  fieldNodeTypes: ['identifier', 'typed_parameter'],
  bodyNodeTypes: ['field_declaration_list'],
  defaultVisibility: 'public',

  extractName(node) {
    if (node.type === 'identifier') return node.text;
    if (node.type === 'typed_parameter') {
      const nameNode = node.childForFieldName('name') ?? node.firstNamedChild;
      return nameNode?.type === 'identifier' ? nameNode.text : undefined;
    }
    return undefined;
  },

  extractType(node) {
    if (node.type === 'typed_parameter') {
      const typeNode = node.childForFieldName('type') ?? node.namedChild(1);
      return typeNode?.text?.trim();
    }
    return undefined;
  },

  extractVisibility(_node) {
    // Julia struct fields are always public (no access modifiers)
    return 'public';
  },

  isStatic(_node) {
    return false;
  },

  isReadonly(_node) {
    // Immutable structs (struct, not mutable struct) have readonly fields.
    // The mutable keyword is on the parent struct_definition, not on individual fields.
    // We return false here; the struct-level immutability is handled elsewhere.
    return false;
  },
};
