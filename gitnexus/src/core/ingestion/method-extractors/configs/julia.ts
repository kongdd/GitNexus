// gitnexus/src/core/ingestion/method-extractors/configs/julia.ts
// Verified against tree-sitter-julia grammar

import { SupportedLanguages } from 'gitnexus-shared';
import type { MethodExtractionConfig, ParameterInfo } from '../../method-types.js';
import type { SyntaxNode } from '../../utils/ast-helpers.js';

/**
 * Extract parameters from a Julia function definition.
 *
 * Julia parameters can be:
 *   - Plain identifier: `x`
 *   - Typed: `x::Int`
 *   - With default: `x=1`
 *   - Typed with default: `x::Int=1`
 *   - Splat: `args...`
 *   - Keyword: `; kw=default`
 */
function extractJuliaParameters(node: SyntaxNode): ParameterInfo[] {
  const paramList = node.childForFieldName('parameters');
  if (!paramList) return [];

  const params: ParameterInfo[] = [];

  for (let i = 0; i < paramList.namedChildCount; i++) {
    const param = paramList.namedChild(i);
    if (!param) continue;

    switch (param.type) {
      case 'identifier': {
        params.push({ name: param.text, type: null, rawType: null, isOptional: false, isVariadic: false });
        break;
      }
      case 'typed_parameter': {
        const nameNode = param.childForFieldName('name') ?? param.firstNamedChild;
        const typeNode = param.childForFieldName('type') ?? param.namedChild(1);
        if (nameNode) {
          params.push({
            name: nameNode.text,
            type: typeNode?.text?.trim() ?? null,
            rawType: typeNode?.text?.trim() ?? null,
            isOptional: false,
            isVariadic: false,
          });
        }
        break;
      }
      case 'optional_parameter': {
        const nameNode = param.childForFieldName('name') ?? param.firstNamedChild;
        const typeNode = param.childForFieldName('type');
        if (nameNode) {
          params.push({
            name: nameNode.text,
            type: typeNode?.text?.trim() ?? null,
            rawType: typeNode?.text?.trim() ?? null,
            isOptional: true,
            isVariadic: false,
          });
        }
        break;
      }
      case 'splat_parameter': {
        const nameNode = param.firstNamedChild;
        if (nameNode) {
          params.push({ name: nameNode.text, type: null, rawType: null, isOptional: false, isVariadic: true });
        }
        break;
      }
      default:
        break;
    }
  }
  return params;
}

function extractJuliaReturnType(node: SyntaxNode): string | undefined {
  const retType = node.childForFieldName('return_type');
  return retType?.text?.trim();
}

export const juliaMethodConfig: MethodExtractionConfig = {
  language: SupportedLanguages.Julia,
  // Julia methods are defined outside structs — no struct body method extraction
  typeDeclarationNodes: ['struct_definition'],
  methodNodeTypes: ['function_definition', 'short_function_definition'],
  bodyNodeTypes: ['field_declaration_list'],

  extractName(node) {
    const nameNode = node.childForFieldName('name');
    return nameNode?.text;
  },

  extractReturnType: extractJuliaReturnType,
  extractParameters: extractJuliaParameters,

  extractVisibility(_node) {
    return 'public';
  },

  isStatic(_node) {
    return false;
  },

  isAbstract(_node) {
    return false;
  },

  isFinal(_node) {
    return false;
  },

  extractAnnotations(_node) {
    return [];
  },

  isAsync(_node) {
    return false;
  },
};
