import { describe, it, expect } from 'vitest';
import { findAllSymbols, findSymbol, getLanguageFromExtension } from '../src/core/symbol-finder.js';

describe('getLanguageFromExtension', () => {
  it('should detect TypeScript files', () => {
    expect(getLanguageFromExtension('file.ts')).toBe('ts');
  });

  it('should detect TSX files', () => {
    expect(getLanguageFromExtension('component.tsx')).toBe('tsx');
  });

  it('should detect JavaScript files', () => {
    expect(getLanguageFromExtension('script.js')).toBe('js');
  });

  it('should detect JSX files', () => {
    expect(getLanguageFromExtension('component.jsx')).toBe('jsx');
  });

  it('should detect Python files', () => {
    expect(getLanguageFromExtension('script.py')).toBe('py');
  });

  it('should return null for unknown extensions', () => {
    expect(getLanguageFromExtension('file.xyz')).toBeNull();
  });
});

describe('findAllSymbols', () => {
  it('should find function declarations', async () => {
    const code = `
      function greet(name: string): string {
        return 'Hello, ' + name;
      }
    `;

    const symbols = await findAllSymbols(code, 'ts');
    const greet = symbols.find((s) => s.name === 'greet');

    expect(greet).toBeDefined();
    expect(greet?.type).toBe('function');
  });

  it('should find class declarations', async () => {
    const code = `
      class UserService {
        getUser(id: string) {
          return { id };
        }
      }
    `;

    const symbols = await findAllSymbols(code, 'ts');
    const service = symbols.find((s) => s.name === 'UserService');

    expect(service).toBeDefined();
    expect(service?.type).toBe('class');
  });

  it('should find exported arrow functions', async () => {
    const code = `
      export const handleRequest = (req: Request) => {
        return new Response();
      };
    `;

    const symbols = await findAllSymbols(code, 'ts');
    const handler = symbols.find((s) => s.name === 'handleRequest');

    expect(handler).toBeDefined();
    expect(handler?.type).toBe('function');
  });

  it('should find const arrow functions', async () => {
    const code = `
      const fetchData = async () => {
        const response = await fetch('/api');
        return response.json();
      };
    `;

    const symbols = await findAllSymbols(code, 'ts');
    const fetchFn = symbols.find((s) => s.name === 'fetchData');

    expect(fetchFn).toBeDefined();
    expect(fetchFn?.type).toBe('function');
  });

  it('should include line numbers', async () => {
    const code = `function test() {
  return true;
}`;

    const symbols = await findAllSymbols(code, 'ts');
    const test = symbols.find((s) => s.name === 'test');

    expect(test?.startLine).toBe(1);
    expect(test?.endLine).toBeGreaterThanOrEqual(1);
  });
});

describe('semantic hash stability', () => {
  it('should produce same hash for code with different whitespace', async () => {
    const code1 = `function greet(name: string): string {
  return 'Hello, ' + name;
}`;

    const code2 = `function greet(name: string): string {
      return 'Hello, ' + name;
    }`;

    const symbols1 = await findAllSymbols(code1, 'ts');
    const symbols2 = await findAllSymbols(code2, 'ts');

    const greet1 = symbols1.find((s) => s.name === 'greet');
    const greet2 = symbols2.find((s) => s.name === 'greet');

    expect(greet1?.hash).toBe(greet2?.hash);
  });

  it('should produce same hash for code with different comments', async () => {
    const code1 = `function greet(name: string): string {
  return 'Hello, ' + name;
}`;

    const code2 = `// This is a greeting function
function greet(name: string): string {
  // Return the greeting
  return 'Hello, ' + name;
}`;

    const symbols1 = await findAllSymbols(code1, 'ts');
    const symbols2 = await findAllSymbols(code2, 'ts');

    const greet1 = symbols1.find((s) => s.name === 'greet');
    const greet2 = symbols2.find((s) => s.name === 'greet');

    expect(greet1?.hash).toBe(greet2?.hash);
  });

  it('should produce different hash for different logic', async () => {
    const code1 = `function greet(name: string): string {
  return 'Hello, ' + name;
}`;

    const code2 = `function greet(name: string): string {
  return 'Hi, ' + name;
}`;

    const symbols1 = await findAllSymbols(code1, 'ts');
    const symbols2 = await findAllSymbols(code2, 'ts');

    const greet1 = symbols1.find((s) => s.name === 'greet');
    const greet2 = symbols2.find((s) => s.name === 'greet');

    expect(greet1?.hash).not.toBe(greet2?.hash);
  });

  it('should produce different hash for different parameter names', async () => {
    const code1 = `function greet(name: string): string {
  return 'Hello, ' + name;
}`;

    const code2 = `function greet(userName: string): string {
  return 'Hello, ' + userName;
}`;

    const symbols1 = await findAllSymbols(code1, 'ts');
    const symbols2 = await findAllSymbols(code2, 'ts');

    const greet1 = symbols1.find((s) => s.name === 'greet');
    const greet2 = symbols2.find((s) => s.name === 'greet');

    expect(greet1?.hash).not.toBe(greet2?.hash);
  });
});

describe('findSymbol', () => {
  it('should find a specific symbol by name', async () => {
    const code = `
      function foo() {}
      function bar() {}
      function baz() {}
    `;

    const bar = await findSymbol(code, 'bar', 'ts');

    expect(bar).toBeDefined();
    expect(bar?.name).toBe('bar');
  });

  it('should return null if symbol not found', async () => {
    const code = `function foo() {}`;

    const notFound = await findSymbol(code, 'nonexistent', 'ts');

    expect(notFound).toBeNull();
  });
});
