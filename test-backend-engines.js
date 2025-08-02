// Test backend engine imports directly
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEngineImports() {
  const engines = [
    'APIDesignEngine',
    'DatabaseSchemaEngine', 
    'SecurityAnalysisEngine',
    'TestingFrameworkEngine',
    'DocumentationEngine'
  ];

  console.log('Testing engine imports from compiled dist...\n');

  for (const engineName of engines) {
    try {
      const enginePath = `./src/meta-agents/backend-agent/dist/engines/${engineName}.js`;
      console.log(`Importing ${engineName} from ${enginePath}...`);
      
      const module = await import(enginePath);
      console.log(`✅ ${engineName} imported successfully`);
      console.log(`   Module keys:`, Object.keys(module));
      console.log(`   Has default:`, 'default' in module);
      
      if (module.default) {
        console.log(`   Default type:`, typeof module.default);
        console.log(`   Default value:`, module.default);
        
        // Check if it's nested
        if (module.default.default) {
          console.log(`   Has nested default:`, typeof module.default.default);
          const engine = new module.default.default({
            logger: console,
            config: { outputDir: './test' },
            projectRoot: process.cwd()
          });
          console.log(`   ✅ Instance created successfully\n`);
        }
      }
    } catch (error) {
      console.log(`❌ ${engineName} failed:`, error.message);
      console.log(`   Stack:`, error.stack?.split('\n')[1], '\n');
    }
  }
}

testEngineImports();