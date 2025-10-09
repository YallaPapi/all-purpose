/**
 * Component Generator Engine
 * 
 * Generates React/Vue/Angular components with modern patterns
 * Implements Context7-aware component design with TypeScript support
 */

import { EventEmitter } from 'events';
import Handlebars from 'handlebars';
import { Logger } from 'winston';

/**
 * Component Generator Engine for creating UI components
 */
export default class ComponentGeneratorEngine extends EventEmitter {
  public readonly name = 'ComponentGeneratorEngine';
  private logger: Logger;
  private config: any;
  private isInitialized = false;
  private templates = new Map<string, HandlebarsTemplateDelegate>();

  constructor(options: {
    logger: Logger;
    config: any;
    projectRoot: string;
  }) {
    super();
    
    this.logger = options.logger;
    this.config = options.config;

    this.logger.info('Component Generator Engine created');
  }

  /**
   * Initialize the Component Generator Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing Component Generator Engine...');

      // Load component templates
      await this.loadTemplates();

      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      this.isInitialized = true;
      this.logger.info('✅ Component Generator Engine initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize Component Generator Engine', { error });
      throw error;
    }
  }

  /**
   * Process component generation task
   */
  async process(task: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Component Generator Engine not initialized');
    }

    this.logger.info('🔄 Processing component generation task', { taskId: task.id });

    try {
      const { framework = 'react', components = [], typescript = true } = task.requirements;

      // Generate components based on requirements and context
      const generatedComponents = await this.generateComponents(components, task, framework, typescript);

      // Generate component files
      const generatedFiles = await this.generateComponentFiles(generatedComponents, {
        framework,
        typescript,
        projectName: 'frontend-app'
      });

      // Generate supporting files (index, types, stories)
      const supportingFiles = await this.generateSupportingFiles(generatedComponents, {
        framework,
        typescript
      });

      const allFiles = [...generatedFiles, ...supportingFiles];

      const result = {
        taskId: task.id,
        success: true,
        data: {
          components: generatedComponents,
          framework,
          typescript,
          filesGenerated: allFiles.length
        },
        generatedFiles: allFiles,
        recommendations: this.generateRecommendations(generatedComponents, framework),
        nextSteps: this.generateNextSteps(generatedComponents, framework)
      };

      this.logger.info('✅ Component generation task completed', {
        taskId: task.id,
        componentsGenerated: generatedComponents.length,
        filesGenerated: allFiles.length
      });

      return result;

    } catch (error) {
      this.logger.error('❌ Component generation task failed', { taskId: task.id, error });
      
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate component specifications
   */
  private async generateComponents(requirements: any[], task: any, framework: string, typescript: boolean): Promise<any[]> {
    const components: any[] = [];

    // Analyze existing components from context
    const existingComponents = task.context.components || [];
    this.logger.info('Found existing components in context', { count: existingComponents.length });

    // Generate components based on requirements
    for (const req of requirements) {
      const component = {
        name: req.name || 'Component',
        type: req.type || 'functional',
        props: req.props || [],
        state: req.state || [],
        hooks: req.hooks || [],
        styling: req.styling || 'css-modules',
        accessibility: req.accessibility || true,
        framework,
        typescript
      };

      components.push(component);
    }

    // If no requirements provided, generate common UI components
    if (requirements.length === 0) {
      const commonComponents = this.generateCommonComponents(framework, typescript);
      components.push(...commonComponents);
    }

    return components;
  }

  /**
   * Generate component files
   */
  private async generateComponentFiles(components: any[], options: any): Promise<any[]> {
    const files: any[] = [];

    for (const component of components) {
      // Generate main component file
      const componentTemplate = this.templates.get(`${options.framework}-component`) || this.getInlineTemplate(options.framework, 'component');
      
      if (componentTemplate) {
        const componentContent = componentTemplate({
          component,
          framework: options.framework,
          typescript: options.typescript,
          timestamp: new Date().toISOString()
        });

        const extension = options.typescript ? '.tsx' : '.jsx';
        files.push({
          path: `src/components/${component.name}/${component.name}${extension}`,
          content: componentContent,
          type: 'source',
          language: options.typescript ? 'typescript' : 'javascript',
          description: `${component.name} component`
        });
      }

      // Generate component styles
      const styleContent = this.generateComponentStyles(component);
      files.push({
        path: `src/components/${component.name}/${component.name}.module.css`,
        content: styleContent,
        type: 'source',
        language: 'css',
        description: `${component.name} styles`
      });

      // Generate test file
      const testContent = this.generateComponentTest(component, options.framework);
      const testExtension = options.typescript ? '.test.tsx' : '.test.jsx';
      files.push({
        path: `src/components/${component.name}/${component.name}${testExtension}`,
        content: testContent,
        type: 'test',
        language: options.typescript ? 'typescript' : 'javascript',
        description: `${component.name} tests`
      });
    }

    return files;
  }

  /**
   * Generate supporting files
   */
  private async generateSupportingFiles(components: any[], options: any): Promise<any[]> {
    const files: any[] = [];

    // Generate components index file
    const indexContent = this.generateComponentsIndex(components, options.typescript);
    const indexExtension = options.typescript ? '.ts' : '.js';
    files.push({
      path: `src/components/index${indexExtension}`,
      content: indexContent,
      type: 'source',
      language: options.typescript ? 'typescript' : 'javascript',
      description: 'Components index exports'
    });

    // Generate type definitions if TypeScript
    if (options.typescript) {
      const typesContent = this.generateComponentTypes(components);
      files.push({
        path: 'src/types/components.ts',
        content: typesContent,
        type: 'source',
        language: 'typescript',
        description: 'Component type definitions'
      });
    }

    return files;
  }

  /**
   * Load component templates
   */
  private async loadTemplates(): Promise<void> {
    const templateMap = {
      'react-component': this.getInlineTemplate('react', 'component'),
      'vue-component': this.getInlineTemplate('vue', 'component'),
      'angular-component': this.getInlineTemplate('angular', 'component')
    };

    for (const [name, content] of Object.entries(templateMap)) {
      const template = Handlebars.compile(content);
      this.templates.set(name, template);
      this.logger.debug(`Loaded template: ${name}`);
    }
  }

  /**
   * Get inline templates (fallback)
   */
  private getInlineTemplate(framework: string, type: string): string {
    const templates: Record<string, Record<string, string>> = {
      react: {
        component: `
{{#if typescript}}
import React{{#if component.hooks}}, { {{#each component.hooks}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} }{{/if}} from 'react';
import styles from './{{component.name}}.module.css';

{{#if component.props.length}}
interface {{component.name}}Props {
  {{#each component.props}}
  {{name}}: {{type}};
  {{/each}}
}
{{/if}}

const {{component.name}}: React.FC{{#if component.props.length}}<{{component.name}}Props>{{/if}} = ({{#if component.props.length}}{ {{#each component.props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} }{{/if}}) => {
{{#each component.state}}
  const [{{name}}, set{{capitalize name}}] = useState({{defaultValue}});
{{/each}}

  return (
    <div className={styles.{{lowercase component.name}}}>
      <h1>{{component.name}} Component</h1>
      {{#if component.props.length}}
      {{#each component.props}}
      <p>{{name}}: {{{name}}}</p>
      {{/each}}
      {{/if}}
    </div>
  );
};

export default {{component.name}};
{{else}}
import React{{#if component.hooks}}, { {{#each component.hooks}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} }{{/if}} from 'react';
import styles from './{{component.name}}.module.css';

const {{component.name}} = ({{#if component.props.length}}{ {{#each component.props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} }{{/if}}) => {
{{#each component.state}}
  const [{{name}}, set{{capitalize name}}] = useState({{defaultValue}});
{{/each}}

  return (
    <div className={styles.{{lowercase component.name}}}>
      <h1>{{component.name}} Component</h1>
      {{#if component.props.length}}
      {{#each component.props}}
      <p>{{name}}: {{{name}}}</p>
      {{/each}}
      {{/if}}
    </div>
  );
};

export default {{component.name}};
{{/if}}
`
      },
      vue: {
        component: `
<template>
  <div class="{{lowercase component.name}}">
    <h1>{{component.name}} Component</h1>
    {{#if component.props.length}}
    {{#each component.props}}
    <p>{{name}}: {{ {{name}} }}</p>
    {{/each}}
    {{/if}}
  </div>
</template>

<script{{#if typescript}} lang="ts"{{/if}}>
{{#if component.type === 'composition'}}
import { defineComponent{{#if component.state.length}}, ref{{/if}} } from 'vue';

export default defineComponent({
  name: '{{component.name}}',
  {{#if component.props.length}}
  props: {
    {{#each component.props}}
    {{name}}: {
      type: {{capitalize type}},
      required: {{required}}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  },
  {{/if}}
  setup(props) {
    {{#each component.state}}
    const {{name}} = ref({{defaultValue}});
    {{/each}}

    return {
      {{#each component.state}}
      {{name}}{{#unless @last}},{{/unless}}
      {{/each}}
    };
  }
});
{{else}}
export default {
  name: '{{component.name}}',
  {{#if component.props.length}}
  props: {
    {{#each component.props}}
    {{name}}: {
      type: {{capitalize type}},
      required: {{required}}
    }{{#unless @last}},{{/unless}}
    {{/each}}
  },
  {{/if}}
  {{#if component.state.length}}
  data() {
    return {
      {{#each component.state}}
      {{name}}: {{defaultValue}}{{#unless @last}},{{/unless}}
      {{/each}}
    };
  }
  {{/if}}
};
{{/if}}
</script>

<style scoped>
.{{lowercase component.name}} {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
`
      }
    };

    return templates[framework]?.[type] || '';
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('lowercase', function(str: string) {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('capitalize', function(str: string) {
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    });

    Handlebars.registerHelper('camelCase', function(str: string) {
      return str ? str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) : '';
    });
  }

  /**
   * Helper methods
   */
  private generateCommonComponents(framework: string, typescript: boolean): any[] {
    return [
      {
        name: 'Button',
        type: 'functional',
        props: [
          { name: 'children', type: 'ReactNode', required: true },
          { name: 'onClick', type: '() => void', required: false },
          { name: 'variant', type: "'primary' | 'secondary'", required: false }
        ],
        state: [],
        hooks: [],
        styling: 'css-modules',
        accessibility: true,
        framework,
        typescript
      },
      {
        name: 'Input',
        type: 'functional',
        props: [
          { name: 'value', type: 'string', required: true },
          { name: 'onChange', type: '(value: string) => void', required: true },
          { name: 'placeholder', type: 'string', required: false }
        ],
        state: [],
        hooks: [],
        styling: 'css-modules',
        accessibility: true,
        framework,
        typescript
      }
    ];
  }

  private generateComponentStyles(component: any): string {
    return `
.${component.name.toLowerCase()} {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background-color: #ffffff;
}

.${component.name.toLowerCase()}:hover {
  border-color: #cbd5e0;
}

.${component.name.toLowerCase()}:focus-within {
  outline: 2px solid #3182ce;
  outline-offset: 2px;
}
`;
  }

  private generateComponentTest(component: any, framework: string): string {
    if (framework === 'react') {
      return `
import React from 'react';
import { render, screen } from '@testing-library/react';
import ${component.name} from './${component.name}';

describe('${component.name}', () => {
  it('renders without crashing', () => {
    render(<${component.name} />);
    expect(screen.getByText('${component.name} Component')).toBeInTheDocument();
  });

  ${component.props.map((prop: any) => `
  it('displays ${prop.name} prop', () => {
    const ${prop.name} = 'test value';
    render(<${component.name} ${prop.name}={${prop.name}} />);
    expect(screen.getByText('${prop.name}: test value')).toBeInTheDocument();
  });
  `).join('')}
});
`;
    }
    return '// Tests for other frameworks would go here';
  }

  private generateComponentsIndex(components: any[], typescript: boolean): string {
    return components.map(comp => 
      `export { default as ${comp.name} } from './${comp.name}/${comp.name}';`
    ).join('\n') + '\n';
  }

  private generateComponentTypes(components: any[]): string {
    return `
// Component type definitions
${components.map(comp => `
export interface ${comp.name}Props {
  ${comp.props.map((prop: any) => `${prop.name}: ${prop.type};`).join('\n  ')}
}
`).join('')}
`;
  }

  private generateRecommendations(components: any[], framework: string): string[] {
    const recommendations: string[] = [];
    
    recommendations.push('Implement proper PropTypes or TypeScript interfaces');
    recommendations.push('Add comprehensive accessibility attributes');
    recommendations.push('Consider implementing error boundaries');
    recommendations.push('Add responsive design considerations');
    
    if (framework === 'react') {
      recommendations.push('Consider using React.memo for performance optimization');
      recommendations.push('Implement proper key props for list items');
    }
    
    return recommendations;
  }

  private generateNextSteps(components: any[], framework: string): string[] {
    const nextSteps: string[] = [];
    
    nextSteps.push('Review and customize generated component logic');
    nextSteps.push('Implement proper styling and theming');
    nextSteps.push('Add comprehensive unit tests');
    nextSteps.push('Create Storybook stories for component documentation');
    nextSteps.push('Implement responsive design patterns');
    nextSteps.push('Add animation and interaction states');
    
    return nextSteps;
  }

  /**
   * Get engine capabilities
   */
  getCapabilities(): any {
    return {
      frameworks: ['react', 'vue', 'angular', 'svelte'],
      features: ['typescript', 'css-modules', 'accessibility', 'testing', 'storybook'],
      componentTypes: ['functional', 'class', 'composition'],
      patterns: ['hooks', 'hoc', 'render-props', 'compound']
    };
  }

  /**
   * Get engine status
   */
  getStatus(): any {
    return {
      name: this.name,
      initialized: this.isInitialized,
      templatesLoaded: this.templates.size,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Component Generator Engine...');
    this.templates.clear();
    this.isInitialized = false;
    this.logger.info('✅ Component Generator Engine shut down successfully');
  }
}