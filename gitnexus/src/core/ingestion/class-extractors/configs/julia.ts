import { SupportedLanguages } from 'gitnexus-shared';
import type { ClassExtractionConfig } from '../../class-types.js';

export const juliaClassConfig: ClassExtractionConfig = {
  language: SupportedLanguages.Julia,
  typeDeclarationNodes: ['struct_definition', 'abstract_definition'],
  ancestorScopeNodeTypes: ['struct_definition', 'abstract_definition', 'module_definition'],
};
