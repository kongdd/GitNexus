/**
 * Julia: function definitions, struct/abstract type detection, heritage (<:),
 *        and function call resolution.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import {
  FIXTURES,
  getRelationships,
  getNodesByLabel,
  getNodesByLabelFull,
  edgeSet,
  runPipelineFromRepo,
  type PipelineResult,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Function definitions and call resolution (single file)
// ---------------------------------------------------------------------------

describe('Julia function detection and call resolution', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-calls'), () => {});
  }, 60000);

  it('detects both functions', () => {
    const fns = getNodesByLabel(result, 'Function');
    expect(fns).toContain('write_audit');
    expect(fns).toContain('run');
  });

  it('emits CALLS edge: run → write_audit', () => {
    const calls = getRelationships(result, 'CALLS');
    const edge = calls.find((c) => c.source === 'run' && c.target === 'write_audit');
    expect(edge).toBeDefined();
  });

  it('does not emit signature self-call edges', () => {
    const calls = getRelationships(result, 'CALLS');
    expect(calls.find((c) => c.source === 'run' && c.target === 'run')).toBeUndefined();
    expect(
      calls.find((c) => c.source === 'write_audit' && c.target === 'write_audit'),
    ).toBeUndefined();
  });

  it('does not emit spurious CALLS edges from built-in calls', () => {
    const calls = getRelationships(result, 'CALLS');
    const builtinCalls = calls.filter((c) => c.target === 'println');
    expect(builtinCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Struct and abstract type detection + heritage (<:)
// ---------------------------------------------------------------------------

describe('Julia struct and abstract type detection with heritage', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-heritage'), () => {});
  }, 60000);

  it('detects all class-like types (structs and abstract types)', () => {
    const classes = getNodesByLabel(result, 'Class');
    expect(classes).toContain('AbstractAnimal');
    expect(classes).toContain('Animal');
    expect(classes).toContain('Dog');
    expect(classes).toContain('Cat');
  });

  it('detects the speak function', () => {
    const fns = getNodesByLabel(result, 'Function');
    expect(fns).toContain('speak');
  });

  it('emits EXTENDS edge: Animal <: AbstractAnimal', () => {
    const extends_ = getRelationships(result, 'EXTENDS');
    const edge = extends_.find((e) => e.source === 'Animal' && e.target === 'AbstractAnimal');
    expect(edge).toBeDefined();
  });

  it('emits EXTENDS edge: Dog <: Animal', () => {
    const extends_ = getRelationships(result, 'EXTENDS');
    const edge = extends_.find((e) => e.source === 'Dog' && e.target === 'Animal');
    expect(edge).toBeDefined();
  });

  it('emits EXTENDS edge: Cat <: Animal', () => {
    const extends_ = getRelationships(result, 'EXTENDS');
    const edge = extends_.find((e) => e.source === 'Cat' && e.target === 'Animal');
    expect(edge).toBeDefined();
  });

  it('emits exactly 3 EXTENDS edges', () => {
    const extends_ = getRelationships(result, 'EXTENDS');
    expect(edgeSet(extends_).sort()).toEqual([
      'Animal → AbstractAnimal',
      'Cat → Animal',
      'Dog → Animal',
    ]);
  });

  it('all heritage edges point to real graph nodes', () => {
    for (const edge of getRelationships(result, 'EXTENDS')) {
      const target = result.graph.getNode(edge.rel.targetId);
      expect(target).toBeDefined();
    }
  });
});

describe('Julia include() import routing', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-include-import'), () => {});
  }, 60000);

  it('emits IMPORTS edge: app.jl → utils.jl from include()', () => {
    const imports = getRelationships(result, 'IMPORTS');
    const includeEdge = imports.find(
      (e) => e.sourceFilePath === 'app.jl' && e.targetFilePath === 'utils.jl',
    );
    expect(includeEdge).toBeDefined();
  });

  it('resolves run → write_audit across include target', () => {
    const calls = getRelationships(result, 'CALLS');
    const edge = calls.find(
      (c) => c.source === 'run' && c.target === 'write_audit' && c.targetFilePath === 'utils.jl',
    );
    expect(edge).toBeDefined();
  });
});

describe('Julia typed parameter extraction', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-typed-params'), () => {});
  }, 60000);

  it('extracts parameter metadata for process(user::User, limit::Int)', () => {
    const fns = getNodesByLabelFull(result, 'Function');
    const process = fns.find((n) => n.name === 'process');
    expect(process).toBeDefined();
    expect(process?.properties.parameterCount).toBe(2);
    expect(process?.properties.requiredParameterCount).toBe(2);
    expect(process?.properties.parameterTypes).toEqual(['User', 'Int']);
  });
});

describe('Julia export visibility in top-level scripts', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-export-visibility'), () => {});
  }, 60000);

  it('marks underscore-prefixed function as internal', () => {
    const fns = getNodesByLabelFull(result, 'Function');
    const internal = fns.find((n) => n.name === '_internal');
    expect(internal).toBeDefined();
    expect(internal?.properties.isExported).toBe(false);
  });

  it('marks non-underscore function as exported', () => {
    const fns = getNodesByLabelFull(result, 'Function');
    const api = fns.find((n) => n.name === 'public_api');
    expect(api).toBeDefined();
    expect(api?.properties.isExported).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parameters.jl @with_kw — struct field extraction + keyword/default params
// ---------------------------------------------------------------------------

describe('Julia @with_kw struct and keyword parameter extraction', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-with-kw'), () => {});
  }, 60000);

  it('detects @with_kw struct as a Class node', () => {
    const classes = getNodesByLabel(result, 'Class');
    expect(classes).toContain('ModelConfig');
  });

  it('detects plain struct as a Class node', () => {
    const classes = getNodesByLabel(result, 'Class');
    expect(classes).toContain('Point');
  });

  it('extracts keyword/default parameters for train(cfg; epochs, lr)', () => {
    const fns = getNodesByLabelFull(result, 'Function');
    const train = fns.find((n) => n.name === 'train');
    expect(train).toBeDefined();
    expect(train?.properties.parameterCount).toBe(3);
    expect(train?.properties.requiredParameterCount).toBe(1);
    expect(train?.properties.parameterTypes).toEqual(['ModelConfig', 'Int', 'Float64']);
  });

  it('extracts required-only parameters for distance(a, b)', () => {
    const fns = getNodesByLabelFull(result, 'Function');
    const dist = fns.find((n) => n.name === 'distance');
    expect(dist).toBeDefined();
    expect(dist?.properties.parameterCount).toBe(2);
    expect(dist?.properties.requiredParameterCount).toBe(2);
    expect(dist?.properties.parameterTypes).toEqual(['Point', 'Point']);
  });
});

describe('Julia sibling package imports (BEPS/SoilDiffEqs -> ModelParams)', () => {
  let result: PipelineResult;

  beforeAll(async () => {
    result = await runPipelineFromRepo(path.join(FIXTURES, 'julia-package-import'), () => {});
  }, 60000);

  it('emits CALLS edge: run_beps -> model_factor via using ModelParams', () => {
    const calls = getRelationships(result, 'CALLS');
    const edge = calls.find(
      (c) =>
        c.source === 'run_beps' &&
        c.target === 'model_factor' &&
        c.targetFilePath.endsWith('ModelParams.jl/src/params.jl'),
    );
    expect(edge).toBeDefined();
  });

  it('emits CALLS edge: run_soil -> soil_param via using ModelParams', () => {
    const calls = getRelationships(result, 'CALLS');
    const edge = calls.find(
      (c) =>
        c.source === 'run_soil' &&
        c.target === 'soil_param' &&
        c.targetFilePath.endsWith('ModelParams.jl/src/params.jl'),
    );
    expect(edge).toBeDefined();
  });
});
