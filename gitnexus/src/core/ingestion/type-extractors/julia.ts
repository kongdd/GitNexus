import type {
  LanguageTypeConfig,
  ParameterExtractor,
  TypeBindingExtractor,
  InitializerExtractor,
  ConstructorBindingScanner,
  PendingAssignmentExtractor,
} from './types.js';
import { extractSimpleTypeName, extractVarName } from './shared.js';
import type { SyntaxNode } from '../utils/ast-helpers.js';

/**
 * Julia type extractor.
 *
 * Julia uses `::` for type annotations:
 *   x::Int
 *   function foo(x::Int, y::String)::Bool
 *
 * Constructor inference: `obj = MyType(args...)` binds `obj` → `MyType`.
 */

const DECLARATION_NODE_TYPES: ReadonlySet<string> = new Set([
  'function_definition',
  'short_function_definition',
  'assignment',
]);

/**
 * Extract type annotations from function parameter lists into env.
 * Julia: `function foo(x::Int, y::String)` → env.set("x", "Int")
 */
const extractDeclaration: TypeBindingExtractor = (node: SyntaxNode, env: Map<string, string>): void => {
  if (node.type !== 'function_definition' && node.type !== 'short_function_definition') return;

  const paramList = node.childForFieldName('parameters');
  if (!paramList) return;

  for (let i = 0; i < paramList.namedChildCount; i++) {
    const param = paramList.namedChild(i);
    if (!param) continue;

    if (param.type === 'typed_parameter') {
      const nameNode = param.childForFieldName('name') ?? param.firstNamedChild;
      const typeNode = param.childForFieldName('type') ?? param.namedChild(1);
      if (nameNode && typeNode) {
        const varName = extractVarName(nameNode);
        const typeName = extractSimpleTypeName(typeNode) ?? typeNode.text?.trim();
        if (varName && typeName) env.set(varName, typeName);
      }
    }
  }
};

const extractParameter: ParameterExtractor = (_node: SyntaxNode, _env: Map<string, string>): void => {
  // Parameter types are handled by extractDeclaration above
};

/**
 * Julia constructor inference: obj = MyType(args...)
 * MyType() is a constructor call when MyType matches a known type name.
 */
const extractInitializer: InitializerExtractor = (node, env, classNames): void => {
  if (node.type !== 'assignment') return;
  const left = node.childForFieldName('left');
  const right = node.childForFieldName('right');
  if (!left || !right) return;

  const varName = extractVarName(left);
  if (!varName || env.has(varName)) return;

  // call_expression where the callee is an identifier matching a known type
  if (right.type === 'call_expression') {
    const callee = right.firstNamedChild ?? right.child(0);
    if (callee?.type === 'identifier' && classNames.has(callee.text)) {
      env.set(varName, callee.text);
    }
  }
};

const scanConstructorBinding: ConstructorBindingScanner = (node) => {
  if (node.type !== 'assignment') return undefined;
  const left = node.childForFieldName('left');
  const right = node.childForFieldName('right');
  if (!left || !right) return undefined;

  const varName = extractVarName(left);
  if (!varName) return undefined;

  if (right.type === 'call_expression') {
    const callee = right.firstNamedChild ?? right.child(0);
    if (callee?.type === 'identifier') {
      return { varName, calleeName: callee.text };
    }
  }
  return undefined;
};

const extractPendingAssignment: PendingAssignmentExtractor = (node, scopeEnv) => {
  if (node.type !== 'assignment') return undefined;
  const lhsNode = node.childForFieldName('left');
  if (!lhsNode || lhsNode.type !== 'identifier') return undefined;
  const varName = lhsNode.text;
  if (scopeEnv.has(varName)) return undefined;
  const rhsNode = node.childForFieldName('right');
  if (!rhsNode) return undefined;
  if (rhsNode.type === 'identifier') return { kind: 'copy', lhs: varName, rhs: rhsNode.text };
  if (rhsNode.type === 'call_expression') {
    const callee = rhsNode.firstNamedChild ?? rhsNode.child(0);
    if (callee?.type === 'identifier') {
      return { kind: 'callResult', lhs: varName, callee: callee.text };
    }
  }
  return undefined;
};

export const typeConfig: LanguageTypeConfig = {
  declarationNodeTypes: DECLARATION_NODE_TYPES,
  extractDeclaration,
  extractParameter,
  extractInitializer,
  scanConstructorBinding,
  extractPendingAssignment,
};
