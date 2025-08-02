/**
 * Anti-Pattern Detection Types
 * 
 * Use context7: Base types for All-Purpose Pattern compliance checking
 * Following All-Purpose Pattern: Configurable for ANY codebase structure
 */

export interface DetectionResult {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  codeSnippet: string;
  suggestion?: string;
  metadata?: Record<string, any>;
}

export interface PatternDetector {
  id: string;
  name: string;
  description: string;
  detect(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
}

export interface PatternMatch {
  type: 'hardcoded_array' | 'limitation_constant' | 'conditional_logic' | 'hardcoded_endpoint' | 'hardcoded_ui_text';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  suggestion?: string;
  context?: {
    variableName?: string;
    parentType?: string;
    codeSnippet?: string;
  };
}

export interface AnalysisReport {
  filePath: string;
  totalPatterns: number;
  errors: number;
  warnings: number;
  infos: number;
  results: DetectionResult[];
  analysisTime: number;
}

export interface DetectorConfig {
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  patterns?: string[];
  exclusions?: string[];
  customRules?: Record<string, any>;
}

export interface PatternDetectionConfig {
  hardcodedArrays: DetectorConfig;
  limitationConstants: DetectorConfig;
  conditionalLogic: DetectorConfig;
  hardcodedEndpoints: DetectorConfig;
  hardcodedUIText: DetectorConfig;
  globalExclusions?: string[];
  filePatterns?: string[];
}