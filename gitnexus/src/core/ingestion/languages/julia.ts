/**
 * Julia language provider.
 *
 * Julia uses wildcard-leaf import semantics: `using Foo` brings all exported
 * names into scope in one hop. `import Foo` uses namespace access (Foo.bar).
 * Within packages, `include("file.jl")` handles relative file inclusion.
 *
 * Key Julia traits:
 *   - importSemantics: 'wildcard-leaf' (using Foo / import Foo)
 *   - No mandatory visibility modifiers — export list controls public API
 *   - Multiple dispatch: functions specialize on argument types
 *   - Structs are class-like (no methods in body; methods defined externally)
 */

import { SupportedLanguages } from 'gitnexus-shared';
import { createClassExtractor } from '../class-extractors/generic.js';
import { juliaClassConfig } from '../class-extractors/configs/julia.js';
import { defineLanguage } from '../language-provider.js';
import { typeConfig as juliaTypeConfig } from '../type-extractors/julia.js';
import { juliaExportChecker } from '../export-detection.js';
import { createImportResolver } from '../import-resolvers/resolver-factory.js';
import { juliaImportConfig } from '../import-resolvers/configs/julia.js';
import { JULIA_QUERIES } from '../tree-sitter-queries.js';
import { createFieldExtractor } from '../field-extractors/generic.js';
import { juliaConfig as juliaFieldConfig } from '../field-extractors/configs/julia.js';
import { createMethodExtractor } from '../method-extractors/generic.js';
import { juliaMethodConfig } from '../method-extractors/configs/julia.js';
import { createVariableExtractor } from '../variable-extractors/generic.js';
import { juliaVariableConfig } from '../variable-extractors/configs/julia.js';
import { createCallExtractor } from '../call-extractors/generic.js';
import { juliaCallConfig } from '../call-extractors/configs/julia.js';
import { createHeritageExtractor } from '../heritage-extractors/generic.js';

const BUILT_INS: ReadonlySet<string> = new Set([
  'print',
  'println',
  'typeof',
  'length',
  'size',
  'push!',
  'pop!',
  'append!',
  'map',
  'filter',
  'reduce',
  'sum',
  'prod',
  'minimum',
  'maximum',
  'sort',
  'sort!',
  'collect',
  'enumerate',
  'zip',
  'keys',
  'values',
  'haskey',
  'get',
  'getindex',
  'setindex!',
  'error',
  'throw',
  'isa',
  'isdefined',
  'isnothing',
  'ismissing',
  'eltype',
  'zeros',
  'ones',
  'rand',
  'randn',
  'copy',
  'deepcopy',
  'string',
  'Symbol',
  'parse',
  'convert',
  'promote',
  'similar',
  'fill',
  'repeat',
  'reshape',
  'hcat',
  'vcat',
  'cat',
  'tuple',
  'nameof',
  'supertype',
  'subtypes',
]);

export const juliaProvider = defineLanguage({
  id: SupportedLanguages.Julia,
  extensions: ['.jl'],
  entryPointPatterns: [/^main$/, /^run$/, /^execute$/],
  treeSitterQueries: JULIA_QUERIES,
  typeConfig: juliaTypeConfig,
  exportChecker: juliaExportChecker,
  importResolver: createImportResolver(juliaImportConfig),
  importSemantics: 'wildcard-leaf',
  callExtractor: createCallExtractor(juliaCallConfig),
  fieldExtractor: createFieldExtractor(juliaFieldConfig),
  methodExtractor: createMethodExtractor(juliaMethodConfig),
  variableExtractor: createVariableExtractor(juliaVariableConfig),
  classExtractor: createClassExtractor(juliaClassConfig),
  heritageExtractor: createHeritageExtractor(SupportedLanguages.Julia),
  builtInNames: BUILT_INS,
});
