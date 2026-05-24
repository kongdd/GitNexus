/**
 * Julia import resolution config.
 *
 * Julia supports two import forms:
 *   import Foo         → namespace import (Foo.bar access)
 *   using Foo          → wildcard import (all exported names in scope)
 *   using Foo: bar     → named import
 *   import Foo: bar    → named import
 *
 * Within a package, `include("file.jl")` is used for relative file inclusion.
 * We handle include() as a special import form resolved via suffix matching.
 */

import { SupportedLanguages } from 'gitnexus-shared';
import type { ImportResolutionConfig, ImportResolverStrategy } from '../types.js';
import { suffixResolve } from '../utils.js';
import { createStandardStrategy } from '../standard.js';

/** Julia include("file.jl") resolution strategy. */
export const juliaIncludeStrategy: ImportResolverStrategy = (rawImportPath, _filePath, ctx) => {
  // Strip quotes and resolve as relative .jl path
  const cleaned = rawImportPath.replace(/^["']|["']$/g, '');
  if (!cleaned.endsWith('.jl')) return null;

  const pathParts = cleaned.replace(/^\.\//, '').split('/').filter(Boolean);
  const resolved = suffixResolve(pathParts, ctx.normalizedFileList, ctx.allFileList, ctx.index);
  return resolved ? { kind: 'files', files: [resolved] } : null;
};

export const juliaImportConfig: ImportResolutionConfig = {
  language: SupportedLanguages.Julia,
  strategies: [juliaIncludeStrategy, createStandardStrategy(SupportedLanguages.Julia)],
};
