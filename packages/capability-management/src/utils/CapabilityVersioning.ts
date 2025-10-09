#!/usr/bin/env node

/**
 * UEP Capability Versioning Utilities
 * 
 * Comprehensive semantic versioning utilities for capability management including
 * version parsing, comparison, compatibility checking, and range resolution.
 * Based on TaskMaster research for enterprise-grade capability versioning.
 * 
 * Research-based implementation features:
 * - SemVer specification compliance (https://semver.org/)
 * - Advanced version comparison and compatibility algorithms
 * - Version range parsing and resolution (npm-style)
 * - Backward compatibility checking with detailed analysis
 * - Pre-release and build metadata handling
 * - Version constraint satisfaction solving
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.1
 */

import {
  SemVer,
  VersionRange,
  CompatibilityResult,
  AgentCapability,
  CapabilityRequirement
} from '../types/CapabilitySchema.js';

/**
 * Parse semantic version string into SemVer object
 */
export function parseSemVer(version: string): SemVer {
  // Remove leading 'v' if present
  const cleanVersion = version.replace(/^v/, '');
  
  // SemVer regex pattern
  const semVerRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  
  const match = cleanVersion.match(semVerRegex);
  if (!match) {
    throw new Error(`Invalid semantic version format: ${version}`);
  }
  
  const [, major, minor, patch, prerelease, build] = match;
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease: prerelease || undefined,
    build: build || undefined
  };
}

/**
 * Convert SemVer object to string representation
 */
export function semVerToString(version: SemVer): string {
  let versionString = `${version.major}.${version.minor}.${version.patch}`;
  
  if (version.prerelease) {
    versionString += `-${version.prerelease}`;
  }
  
  if (version.build) {
    versionString += `+${version.build}`;
  }
  
  return versionString;
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareSemVer(v1: SemVer, v2: SemVer): number {
  // Compare major version
  if (v1.major !== v2.major) {
    return v1.major - v2.major;
  }
  
  // Compare minor version
  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor;
  }
  
  // Compare patch version
  if (v1.patch !== v2.patch) {
    return v1.patch - v2.patch;
  }
  
  // Handle pre-release versions
  // If one has pre-release and other doesn't, the one without pre-release is greater
  if (v1.prerelease && !v2.prerelease) {
    return -1;
  }
  if (!v1.prerelease && v2.prerelease) {
    return 1;
  }
  
  // Both have pre-release, compare them
  if (v1.prerelease && v2.prerelease) {
    return comparePrerelease(v1.prerelease, v2.prerelease);
  }
  
  // Versions are equal (build metadata is ignored in precedence)
  return 0;
}

/**
 * Compare pre-release version identifiers
 */
function comparePrerelease(pre1: string, pre2: string): number {
  const parts1 = pre1.split('.');
  const parts2 = pre2.split('.');
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i];
    const part2 = parts2[i];
    
    // If one side is missing, it's considered smaller
    if (!part1) return -1;
    if (!part2) return 1;
    
    // Try to parse as numbers
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);
    
    const isNum1 = !isNaN(num1);
    const isNum2 = !isNaN(num2);
    
    // Numeric comparison takes precedence
    if (isNum1 && isNum2) {
      if (num1 !== num2) {
        return num1 - num2;
      }
    } else if (isNum1 && !isNum2) {
      return -1; // Numeric identifiers are smaller than alphanumeric
    } else if (!isNum1 && isNum2) {
      return 1;  // Alphanumeric identifiers are larger than numeric
    } else {
      // Both are alphanumeric, compare lexically
      if (part1 !== part2) {
        return part1.localeCompare(part2);
      }
    }
  }
  
  return 0;
}

/**
 * Check if two semantic versions are equal
 */
export function isVersionEqual(v1: SemVer, v2: SemVer): boolean {
  return compareSemVer(v1, v2) === 0;
}

/**
 * Check if version v1 is greater than v2
 */
export function isVersionGreater(v1: SemVer, v2: SemVer): boolean {
  return compareSemVer(v1, v2) > 0;
}

/**
 * Check if version v1 is less than v2
 */
export function isVersionLess(v1: SemVer, v2: SemVer): boolean {
  return compareSemVer(v1, v2) < 0;
}

/**
 * Check if capability version satisfies requirement range
 */
export function satisfiesVersionRange(provided: SemVer, range: VersionRange): boolean {
  const comparison = compareSemVer(provided, range.version);
  
  switch (range.operator) {
    case '=':
      return comparison === 0;
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    case '~':
      // Tilde range: ~1.2.3 allows >=1.2.3 <1.(2+1).0
      return comparison >= 0 && 
             provided.major === range.version.major &&
             provided.minor === range.version.minor;
    case '^':
      // Caret range: ^1.2.3 allows >=1.2.3 <(1+1).0.0
      return comparison >= 0 && 
             provided.major === range.version.major;
    default:
      throw new Error(`Unsupported version range operator: ${range.operator}`);
  }
}

/**
 * Parse version range string (npm-style)
 */
export function parseVersionRange(rangeString: string): VersionRange {
  const trimmed = rangeString.trim();
  
  // Match operator and version
  const match = trimmed.match(/^(>=|>|<=|<|=|~|\^)?\s*(.+)$/);
  if (!match) {
    throw new Error(`Invalid version range format: ${rangeString}`);
  }
  
  const [, operator = '=', versionString] = match;
  const version = parseSemVer(versionString);
  
  return {
    operator: operator as VersionRange['operator'],
    version
  };
}

/**
 * Check capability compatibility with detailed analysis
 */
export function checkCapabilityCompatibility(
  provided: AgentCapability,
  required: CapabilityRequirement
): CompatibilityResult {
  const result: CompatibilityResult = {
    compatible: true,
    score: 1.0,
    versionCompatible: true,
    constraintCompatible: true
  };
  
  // Check version compatibility
  if (required.versionRange) {
    const versionCompatible = satisfiesVersionRange(provided.version, required.versionRange);
    
    result.versionCompatible = versionCompatible;
    result.versionDetails = {
      required: required.versionRange,
      provided: provided.version,
      compatible: versionCompatible,
      reason: versionCompatible 
        ? 'Version satisfies requirement range'
        : `Version ${semVerToString(provided.version)} does not satisfy ${required.versionRange.operator}${semVerToString(required.versionRange.version)}`
    };
    
    if (!versionCompatible) {
      result.compatible = false;
      result.reason = result.versionDetails.reason;
      result.score = 0;
      return result;
    }
  }
  
  // Check constraint compatibility
  if (required.constraints || provided.constraints) {
    const constraintResult = checkConstraintCompatibility(provided, required);
    result.constraintCompatible = constraintResult.compatible;
    result.constraintDetails = constraintResult.details;
    
    if (!constraintResult.compatible) {
      result.compatible = false;
      result.reason = constraintResult.reason;
      result.score = Math.max(0.1, result.score * 0.5); // Reduce score but don't make it zero
    }
  }
  
  // Check for deprecation
  if (provided.deprecated) {
    result.score *= 0.7; // Reduce score for deprecated capabilities
    
    if (provided.replacedBy) {
      result.migrationRequired = true;
      result.migrationPath = {
        steps: [`Migrate from ${provided.id} to ${provided.replacedBy}`],
        estimatedEffort: 'Low to Medium',
        breakingChanges: provided.documentation?.changelog
          ?.filter(entry => entry.breakingChange)
          ?.map(entry => entry.description) || []
      };
    }
  }
  
  // Calculate final compatibility score
  result.score = Math.max(0, Math.min(1, result.score));
  
  if (result.compatible) {
    result.reason = 'Capability is fully compatible';
  }
  
  return result;
}

/**
 * Check constraint compatibility between provided capability and requirements
 */
function checkConstraintCompatibility(
  provided: AgentCapability,
  required: CapabilityRequirement
): { compatible: boolean; reason?: string; details?: any } {
  const violations: string[] = [];
  const warnings: string[] = [];
  
  const providedConstraints = provided.constraints;
  const requiredConstraints = required.constraints;
  
  if (!requiredConstraints) {
    return { compatible: true };
  }
  
  // Check platform requirements
  if (requiredConstraints.platformRequirements && providedConstraints?.platformRequirements) {
    const missingPlatforms = requiredConstraints.platformRequirements.filter(
      platform => !providedConstraints.platformRequirements?.includes(platform)
    );
    
    if (missingPlatforms.length > 0) {
      violations.push(`Missing platform support: ${missingPlatforms.join(', ')}`);
    }
  }
  
  // Check resource requirements
  if (requiredConstraints.resourceRequirements && providedConstraints?.resourceRequirements) {
    const required = requiredConstraints.resourceRequirements;
    const provided = providedConstraints.resourceRequirements;
    
    if (required.minCpu && provided?.minCpu && provided.minCpu < required.minCpu) {
      violations.push(`Insufficient CPU: required ${required.minCpu}, provided ${provided.minCpu}`);
    }
    
    if (required.minMemory && provided?.minMemory && provided.minMemory < required.minMemory) {
      violations.push(`Insufficient memory: required ${required.minMemory}MB, provided ${provided.minMemory}MB`);
    }
    
    if (required.minStorage && provided?.minStorage && provided.minStorage < required.minStorage) {
      violations.push(`Insufficient storage: required ${required.minStorage}MB, provided ${provided.minStorage}MB`);
    }
  }
  
  // Check incompatible capabilities
  if (providedConstraints?.incompatibleCapabilities && requiredConstraints.requiredCapabilities) {
    const conflicts = requiredConstraints.requiredCapabilities.filter(
      capability => providedConstraints.incompatibleCapabilities?.includes(capability)
    );
    
    if (conflicts.length > 0) {
      violations.push(`Capability conflicts: ${conflicts.join(', ')}`);
    }
  }
  
  const compatible = violations.length === 0;
  
  return {
    compatible,
    reason: compatible ? undefined : violations.join('; '),
    details: {
      violations: violations.length > 0 ? violations : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  };
}

/**
 * Find the highest compatible version from a list of capabilities
 */
export function findHighestCompatibleVersion(
  capabilities: AgentCapability[],
  requirement: CapabilityRequirement
): AgentCapability | null {
  const compatibleCapabilities = capabilities
    .filter(capability => {
      const compatibility = checkCapabilityCompatibility(capability, requirement);
      return compatibility.compatible;
    })
    .sort((a, b) => compareSemVer(b.version, a.version)); // Sort by version descending
  
  return compatibleCapabilities.length > 0 ? compatibleCapabilities[0] : null;
}

/**
 * Check if a version is a pre-release
 */
export function isPrerelease(version: SemVer): boolean {
  return !!version.prerelease;
}

/**
 * Get the next major version
 */
export function getNextMajorVersion(version: SemVer): SemVer {
  return {
    major: version.major + 1,
    minor: 0,
    patch: 0
  };
}

/**
 * Get the next minor version
 */
export function getNextMinorVersion(version: SemVer): SemVer {
  return {
    major: version.major,
    minor: version.minor + 1,
    patch: 0
  };
}

/**
 * Get the next patch version
 */
export function getNextPatchVersion(version: SemVer): SemVer {
  return {
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1
  };
}

/**
 * Validate semantic version structure
 */
export function validateSemVer(version: SemVer): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for non-negative integers
  if (!Number.isInteger(version.major) || version.major < 0) {
    errors.push('Major version must be a non-negative integer');
  }
  
  if (!Number.isInteger(version.minor) || version.minor < 0) {
    errors.push('Minor version must be a non-negative integer');
  }
  
  if (!Number.isInteger(version.patch) || version.patch < 0) {
    errors.push('Patch version must be a non-negative integer');
  }
  
  // Check pre-release format
  if (version.prerelease) {
    const prereleaseRegex = /^[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/;
    if (!prereleaseRegex.test(version.prerelease)) {
      errors.push('Pre-release version must contain only alphanumeric characters, hyphens, and dots');
    }
  }
  
  // Check build metadata format
  if (version.build) {
    const buildRegex = /^[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/;
    if (!buildRegex.test(version.build)) {
      errors.push('Build metadata must contain only alphanumeric characters, hyphens, and dots');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate version compatibility score (0-1)
 */
export function calculateVersionCompatibilityScore(
  provided: SemVer,
  required: VersionRange
): number {
  if (!satisfiesVersionRange(provided, required)) {
    return 0;
  }
  
  // Base score for satisfaction
  let score = 0.5;
  
  const comparison = compareSemVer(provided, required.version);
  
  // Perfect match gets highest score
  if (comparison === 0) {
    score = 1.0;
  } else {
    // Calculate proximity score
    const majorDiff = Math.abs(provided.major - required.version.major);
    const minorDiff = Math.abs(provided.minor - required.version.minor);
    const patchDiff = Math.abs(provided.patch - required.version.patch);
    
    // Reduce score based on version distance
    score += 0.5 * Math.exp(-(majorDiff * 0.5 + minorDiff * 0.3 + patchDiff * 0.1));
  }
  
  // Penalize pre-release versions slightly
  if (provided.prerelease) {
    score *= 0.9;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Export utility functions
 */
export const CapabilityVersionUtils = {
  parseSemVer,
  semVerToString,
  compareSemVer,
  isVersionEqual,
  isVersionGreater,
  isVersionLess,
  satisfiesVersionRange,
  parseVersionRange,
  checkCapabilityCompatibility,
  findHighestCompatibleVersion,
  isPrerelease,
  getNextMajorVersion,
  getNextMinorVersion,
  getNextPatchVersion,
  validateSemVer,
  calculateVersionCompatibilityScore
};