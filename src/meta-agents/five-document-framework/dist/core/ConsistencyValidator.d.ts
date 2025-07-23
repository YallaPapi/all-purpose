/**
 * Consistency Validator for Five Document Framework
 *
 * Validates cross-document consistency and parameter mappings
 * Following All-Purpose Pattern: UNLIMITED validation rules
 */
import { ConsistencyCheck, TemplateContext } from '../types/index.js';
export declare class ConsistencyValidator {
    /**
     * Validate document consistency
     */
    validate(documentPaths: string[], context: TemplateContext): Promise<ConsistencyCheck>;
    /**
     * Load documents for validation
     */
    private loadDocuments;
    /**
     * Validate cross-references between documents
     */
    private validateCrossReferences;
    /**
     * Find document references in content
     */
    private findDocumentReferences;
    /**
     * Check external references (like API endpoints)
     */
    private checkExternalReference;
    /**
     * Validate parameter mappings consistency
     */
    private validateParameterMappings;
    /**
     * Extract parameters from document content
     */
    private extractParameters;
    /**
     * Check if parameter should be in specific document
     */
    private shouldParameterBeInDocument;
    /**
     * Find parameter inconsistencies
     */
    private findParameterInconsistencies;
    /**
     * Find parameter usages in content
     */
    private findParameterUsages;
    /**
     * Validate version consistency
     */
    private validateVersionConsistency;
    /**
     * Validate format consistency
     */
    private validateFormatConsistency;
    /**
     * Log consistency results
     */
    private logConsistencyResults;
}
