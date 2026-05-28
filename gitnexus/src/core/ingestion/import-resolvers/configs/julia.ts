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

/**
 * Julia package import strategy.
 *
 * Handles `using Foo` / `import Foo` when packages are laid out as:
 * - Foo.jl/src/Foo.jl (standard package layout)
 * - Foo/src/Foo.jl    (no .jl suffix on directory)
 * - Foo.jl            (single-file module)
 *
 * When a package entry file is found under `/src/`, we also wire every `.jl`
 * file under that src tree to make exported functions defined in included
 * files visible to import-scoped resolution.
 */
export const juliaPackageStrategy: ImportResolverStrategy = (rawImportPath, _filePath, ctx) => {
  const moduleName = rawImportPath.trim();
  if (!moduleName || moduleName.length > 256 || /[\x00-\x1f]/.test(moduleName)) return null;
  if (moduleName.includes('/') || moduleName.startsWith('.')) return null;
  if (!/^[A-Za-z_]\w*$/.test(moduleName)) return null;

  const candidatePaths = [
    `${moduleName}.jl/src/${moduleName}.jl`,
    `${moduleName}/src/${moduleName}.jl`,
    `${moduleName}.jl`,
  ];

  let entryFile: string | null = null;
  for (const candidate of candidatePaths) {
    const pathParts = candidate.split('/').filter(Boolean);
    const resolved = suffixResolve(pathParts, ctx.normalizedFileList, ctx.allFileList, ctx.index);
    if (resolved) {
      entryFile = resolved;
      break;
    }
  }
  if (!entryFile) return null;

  const normalizedEntry = entryFile.replace(/\\/g, '/');
  const entryDir = normalizedEntry.slice(0, normalizedEntry.lastIndexOf('/'));
  const entryName = normalizedEntry.slice(normalizedEntry.lastIndexOf('/') + 1);
  if (
    entryDir.toLowerCase().endsWith('/src') &&
    entryName.toLowerCase() === `${moduleName.toLowerCase()}.jl`
  ) {
    const srcPrefix = `${entryDir}/`.toLowerCase();
    const packageFiles = ctx.allFileList.filter((filePath) => {
      const normalized = filePath.replace(/\\/g, '/').toLowerCase();
      return normalized.startsWith(srcPrefix) && normalized.endsWith('.jl');
    });
    if (packageFiles.length > 0) {
      return { kind: 'files', files: packageFiles };
    }
  }

  return { kind: 'files', files: [entryFile] };
};

export const juliaImportConfig: ImportResolutionConfig = {
  language: SupportedLanguages.Julia,
  strategies: [
    juliaIncludeStrategy,
    juliaPackageStrategy,
    createStandardStrategy(SupportedLanguages.Julia),
  ],
};
