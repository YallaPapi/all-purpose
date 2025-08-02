/**
 * AST Parser Tests
 * 
 * Universal tests that work with ANY JavaScript/TypeScript code
 * Following All-Purpose Pattern: NO hardcoded test limitations
 */

import { ASTParser, astParser } from '../../src/core/astParser';

describe('ASTParser', () => {
  let parser: ASTParser;

  beforeEach(() => {
    parser = new ASTParser();
  });

  describe('parseCode', () => {
    it('should parse JavaScript code successfully', () => {
      const code = 'const x = 1; console.log(x);';
      const result = parser.parseCode(code);

      expect(result.ast).toBeDefined();
      expect(result.source).toBe(code);
      expect(result.isTypeScript).toBe(false);
      expect(result.metadata.parseTime).toBeGreaterThan(0);
      expect(result.metadata.size).toBeGreaterThan(0);
    });

    it('should parse TypeScript code successfully', () => {
      const code = 'const x: number = 1; console.log(x);';
      const result = parser.parseCode(code, 'test.ts');

      expect(result.ast).toBeDefined();
      expect(result.source).toBe(code);
      expect(result.isTypeScript).toBe(true);
      expect(result.filePath).toBe('test.ts');
    });

    it('should detect TypeScript from file extension', () => {
      const code = 'const x = 1;';
      const result = parser.parseCode(code, 'test.ts');

      expect(result.isTypeScript).toBe(true);
    });

    it('should detect TypeScript from content', () => {
      const code = 'interface User { name: string; }';
      const result = parser.parseCode(code);

      expect(result.isTypeScript).toBe(true);
    });

    it('should handle JSX code', () => {
      const code = 'const Component = () => <div>Hello</div>;';
      const result = parser.parseCode(code, 'Component.jsx');

      expect(result.ast).toBeDefined();
      expect(result.isTypeScript).toBe(false);
    });

    it('should handle TSX code', () => {
      const code = 'const Component: React.FC = () => <div>Hello</div>;';
      const result = parser.parseCode(code, 'Component.tsx');

      expect(result.ast).toBeDefined();
      expect(result.isTypeScript).toBe(true);
    });

    it('should handle complex modern JavaScript features', () => {
      const code = `
        import { useState } from 'react';
        const AsyncComponent = async () => {
          const [data, setData] = useState(null);
          const result = await fetch('/api/data')?.json();
          return <div>{data?.name ?? 'Loading...'}</div>;
        };
        export default AsyncComponent;
      `;
      const result = parser.parseCode(code);

      expect(result.ast).toBeDefined();
      expect(result.metadata.size).toBeGreaterThan(100);
    });

    it('should throw error for invalid syntax', () => {
      const invalidCode = 'const x = ; // Invalid syntax';
      
      expect(() => {
        parser.parseCode(invalidCode);
      }).toThrow();
    });
  });

  describe('parseFiles', () => {
    it('should handle empty file array', async () => {
      const results = await parser.parseFiles([]);
      
      expect(results).toHaveLength(0);
    });

    it('should handle non-existent files gracefully', async () => {
      const results = await parser.parseFiles(['non-existent-file.js']);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('error');
      expect(results[0]).toHaveProperty('filePath', 'non-existent-file.js');
    });
  });

  describe('getParserInfo', () => {
    it('should return parser information', () => {
      const info = parser.getParserInfo();

      expect(info).toHaveProperty('supportedPlugins');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('features');
      expect(info.features).toContain('Universal JS/TS parsing');
      expect(info.features).toContain('Unlimited syntax support');
    });

    it('should include all necessary plugins for unlimited support', () => {
      const info = parser.getParserInfo();

      expect(info.supportedPlugins).toContain('typescript');
      expect(info.supportedPlugins).toContain('jsx');
      expect(info.supportedPlugins).toContain('decorators-legacy');
      expect(info.supportedPlugins).toContain('optionalChaining');
      expect(info.supportedPlugins).toContain('nullishCoalescingOperator');
    });
  });

  describe('Anti-pattern detection readiness', () => {
    it('should parse hardcoded array patterns', () => {
      const hardcodedCode = testUtils.createSampleCode('hardcoded');
      const result = parser.parseCode(hardcodedCode);

      expect(result.ast).toBeDefined();
      // The AST should be ready for anti-pattern detection
      expect(result.ast.type).toBe('File');
    });

    it('should parse universal patterns', () => {
      const universalCode = testUtils.createSampleCode('universal');
      const result = parser.parseCode(universalCode);

      expect(result.ast).toBeDefined();
      expect(result.ast.type).toBe('File');
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large code files efficiently', () => {
      // Generate a large code sample (simulating real-world file)
      const largeCode = Array(1000).fill(0).map((_, i) => 
        `const variable${i} = 'value${i}'; console.log(variable${i});`
      ).join('\n');

      const startTime = Date.now();
      const result = parser.parseCode(largeCode);
      const parseTime = Date.now() - startTime;

      expect(result.ast).toBeDefined();
      expect(parseTime).toBeLessThan(1000); // Should parse within 1 second
      expect(result.metadata.parseTime).toBeGreaterThan(0);
    });

    it('should support unlimited file types', () => {
      const files = testUtils.createSampleFiles();

      Object.entries(files).forEach(([type, code]) => {
        const result = parser.parseCode(code, `test.${type}`);
        expect(result.ast).toBeDefined();
      });
    });
  });
});

describe('Default parser instance', () => {
  it('should provide convenient access to parser', () => {
    expect(astParser).toBeInstanceOf(ASTParser);
    
    const code = 'const test = true;';
    const result = astParser.parseCode(code);
    
    expect(result.ast).toBeDefined();
  });
});