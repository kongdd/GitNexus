// gitnexus/src/core/ingestion/variable-extractors/configs/julia.ts

import { SupportedLanguages } from 'gitnexus-shared';
import type { VariableExtractionConfig, VariableVisibility } from '../../variable-types.js';
import type { SyntaxNode } from '../../utils/ast-helpers.js';

function extractNameFromJulia(node: SyntaxNode): string | undefined {
  // assignment: x = value
  if (node.type === 'assignment') {
    const left = node.childForFieldName('left');
    if (left?.type === 'identifier') return left.text;
  }
  return undefined;
}

function extractTypeFromJulia(node: SyntaxNode): string | undefined {
  // Julia module-level assignments rarely carry inline type annotations.
  // Typed declarations would be `x::Int = 5` via typed_parameter, but that's uncommon at module scope.
  if (node.type === 'assignment') {
    const left = node.childForFieldName('left');
    if (left?.type === 'typed_parameter') {
      const typeNode = left.childForFieldName('type') ?? left.namedChild(1);
      return typeNode?.text?.trim();
    }
  }
  return undefined;
}

function extractVisFromJulia(node: SyntaxNode): VariableVisibility {
  const name = extractNameFromJulia(node);
  if (!name) return 'public';
  if (name.startsWith('_')) return 'private';
  return 'public';
}

export const juliaVariableConfig: VariableExtractionConfig = {
  language: SupportedLanguages.Julia,
  constNodeTypes: [],
  staticNodeTypes: [],
  variableNodeTypes: ['assignment'],

  extractName: extractNameFromJulia,
  extractType: extractTypeFromJulia,
  extractVisibility: extractVisFromJulia,

  isConst(node) {
    // Julia convention: SCREAMING_SNAKE_CASE names are constants
    const name = extractNameFromJulia(node);
    if (!name) return false;
    return name === name.toUpperCase() && /^[A-Z][A-Z0-9_]*$/.test(name);
  },

  isStatic(_node) {
    return false;
  },

  isMutable(node) {
    const name = extractNameFromJulia(node);
    if (!name) return true;
    return !(name === name.toUpperCase() && /^[A-Z][A-Z0-9_]*$/.test(name));
  },
};
