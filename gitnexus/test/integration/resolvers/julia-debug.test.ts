import { describe, it, beforeAll } from 'vitest';
import path from 'path';
import {
  FIXTURES,
  getRelationships,
  getNodesByLabel,
  runPipelineFromRepo,
  type PipelineResult,
} from './helpers.js';

describe('Julia debug', () => {
  let result: PipelineResult;
  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-calls'), () => {});
  }, 60000);

  it('shows all edges', () => {
    const calls = getRelationships(result, 'CALLS');
    console.log(
      'CALLS:',
      calls.map((c) => `${c.source} → ${c.target}`),
    );
    const fns = getNodesByLabel(result, 'Function');
    console.log('Functions:', fns);
  });
});
