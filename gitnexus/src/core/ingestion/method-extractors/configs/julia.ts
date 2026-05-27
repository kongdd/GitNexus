// gitnexus/src/core/ingestion/method-extractors/configs/julia.ts
// Verified against tree-sitter-julia grammar

import { SupportedLanguages } from 'gitnexus-shared';
import type { NodeLabel } from 'gitnexus-shared';
import type { MethodExtractionConfig, ParameterInfo } from '../../method-types.js';
import type { SyntaxNode } from '../../utils/ast-helpers.js';

function getJuliaParameterList(node: SyntaxNode): SyntaxNode | undefined {
  const direct = node.childForFieldName('parameters');
  if (direct) return direct;

  const signature =
    node.childForFieldName('signature') ?? node.namedChildren.find((n) => n.type === 'signature');
  if (!signature) return undefined;
  const headerCall = signature.namedChildren.find((n) => n.type === 'call_expression');
  if (!headerCall) return undefined;
  const args = headerCall.childForFieldName('arguments');
  if (args) return args;
  return headerCall.namedChildren.find((n) => n.type === 'argument_list');
}

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
  const paramList = getJuliaParameterList(node);
  if (!paramList) return [];

  const params: ParameterInfo[] = [];

  for (let i = 0; i < paramList.namedChildCount; i++) {
    const param = paramList.namedChild(i);
    if (!param) continue;

    switch (param.type) {
      case 'identifier': {
        params.push({
          name: param.text,
          type: null,
          rawType: null,
          isOptional: false,
          isVariadic: false,
        });
        break;
      }
      case 'typed_parameter':
      case 'typed_expression': {
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
      case 'named_argument': {
        // Default positional (x::Int=1) or keyword (; kw::String="hello") parameter.
        // First named child is typed_expression (typed) or identifier (untyped).
        const first = param.firstNamedChild;
        if (first?.type === 'typed_expression') {
          const nameNode = first.firstNamedChild;
          const typeNode = first.namedChild(1);
          if (nameNode) {
            params.push({
              name: nameNode.text,
              type: typeNode?.text?.trim() ?? null,
              rawType: typeNode?.text?.trim() ?? null,
              isOptional: true,
              isVariadic: false,
            });
          }
        } else if (first?.type === 'identifier') {
          params.push({
            name: first.text,
            type: null,
            rawType: null,
            isOptional: true,
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
          params.push({
            name: nameNode.text,
            type: null,
            rawType: null,
            isOptional: false,
            isVariadic: true,
          });
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

/**
 * Extract function name from a Julia function node during parent-walk.
 *
 * Julia function_definition stores the name inside signature → call_expression:
 *   function run(x) ... end
 *   → (function_definition (signature (call_expression (identifier "run") ...)) ...)
 *
 * Short-form assignment functions are handled separately (assignment is not in
 * FUNCTION_NODE_TYPES, so they don't appear in the parent-walk).
 */
function juliaExtractFunctionName(
  node: SyntaxNode,
): { funcName: string | null; label: NodeLabel } | null {
  if (node.type !== 'function_definition' && node.type !== 'macro_definition') return null;

  // Navigate: function_definition → signature (first named child) → call_expression → identifier
  const sig = node.namedChild(0);
  if (sig?.type !== 'signature') return { funcName: null, label: 'Function' };

  const callExpr = sig.namedChild(0);
  if (callExpr?.type !== 'call_expression') return { funcName: null, label: 'Function' };

  // The function name is the first child of the call_expression (an identifier)
  const nameNode = callExpr.child(0);
  const funcName = nameNode?.type === 'identifier' ? nameNode.text : null;
  return { funcName, label: 'Function' };
}

export const juliaMethodConfig: MethodExtractionConfig = {
  language: SupportedLanguages.Julia,
  // Julia methods are defined outside structs — no struct body method extraction
  typeDeclarationNodes: ['struct_definition'],
  methodNodeTypes: ['function_definition'],
  bodyNodeTypes: ['field_declaration_list'],

  extractName(node) {
    // Navigate: function_definition → signature → call_expression → identifier
    const sig = node.namedChild(0);
    if (sig?.type === 'signature') {
      const callExpr = sig.namedChild(0);
      if (callExpr?.type === 'call_expression') {
        const nameNode = callExpr.child(0);
        if (nameNode?.type === 'identifier') return nameNode.text;
      }
    }
    return undefined;
  },

  extractFunctionName: juliaExtractFunctionName,

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
