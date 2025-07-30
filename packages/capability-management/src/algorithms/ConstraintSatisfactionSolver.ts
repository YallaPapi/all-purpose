#!/usr/bin/env node

/**
 * UEP Constraint Satisfaction Solver
 * 
 * Constraint Satisfaction Problem (CSP) solver for capability matching with
 * support for hard and soft constraints, backtracking search, arc consistency,
 * and constraint optimization.
 * 
 * Research-based implementation features:
 * - Backtracking search with constraint propagation
 * - Arc consistency (AC-3) algorithm implementation
 * - Forward checking and constraint propagation
 * - Variable ordering heuristics (MRV, degree heuristic)
 * - Value ordering heuristics (least constraining value)
 * - Soft constraint handling with penalty scoring
 * - Multi-objective constraint optimization
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.4
 */

import chalk from 'chalk';
import {
  AgentCapability,
  CapabilityRequirement,
  CapabilityConstraints
} from '../types/CapabilitySchema.js';

/**
 * Constraint variable representing an aspect to be satisfied
 */
export interface ConstraintVariable {
  name: string;                             // Variable name
  domain: any[];                            // Possible values
  value?: any;                              // Assigned value
  constraints: Constraint[];                // Constraints involving this variable
  priority: number;                         // Variable priority (1-10)
}

/**
 * Constraint definition
 */
export interface Constraint {
  id: string;                               // Unique constraint ID
  type: 'hard' | 'soft';                   // Constraint type
  variables: string[];                      // Variables involved
  predicate: (values: Map<string, any>) => boolean; // Constraint predicate
  penalty?: number;                         // Penalty for soft constraint violation (0-1)
  description: string;                      // Human-readable description
  priority: number;                         // Constraint priority (1-10)
}

/**
 * CSP problem definition
 */
export interface CSPProblem {
  variables: Map<string, ConstraintVariable>; // Problem variables
  constraints: Constraint[];                // Problem constraints
  objective?: ObjectiveFunction;            // Optional objective function
}

/**
 * Objective function for optimization
 */
export interface ObjectiveFunction {
  type: 'minimize' | 'maximize';            // Optimization direction
  function: (assignment: Map<string, any>) => number; // Objective function
  weights?: Map<string, number>;            // Variable weights
}

/**
 * CSP solution
 */
export interface CSPSolution {
  assignment: Map<string, any>;             // Variable assignments
  satisfied: boolean;                       // Are all hard constraints satisfied?
  hardViolations: string[];                 // Violated hard constraints
  softViolations: string[];                 // Violated soft constraints
  satisfactionScore: number;                // Overall satisfaction score (0-1)
  objectiveValue?: number;                  // Objective function value
  searchStats: {                            // Search statistics
    nodesExplored: number;                  // Nodes explored during search
    backtrackCount: number;                 // Number of backtracks
    constraintChecks: number;               // Constraint checks performed
    solutionTime: number;                   // Solution time in ms
  };
}

/**
 * Agent constraint mapping for capability matching
 */
export interface AgentConstraintMapping {
  agentId: string;                          // Agent identifier
  capability: AgentCapability;              // Agent capability
  variables: Map<string, any>;              // Constraint variables for this agent
  feasible: boolean;                        // Is agent feasible for the requirement
  violationCount: number;                   // Number of constraint violations
  satisfactionScore: number;                // Constraint satisfaction score (0-1)
}

/**
 * Constraint Satisfaction Solver class
 */
export class ConstraintSatisfactionSolver {
  private searchStats: {
    nodesExplored: number;
    backtrackCount: number;
    constraintChecks: number;
    startTime: number;
  } = {
    nodesExplored: 0,
    backtrackCount: 0,
    constraintChecks: 0,
    startTime: 0
  };

  /**
   * Solve constraint satisfaction problem
   */
  public solve(problem: CSPProblem): CSPSolution {
    console.log(chalk.blue('🧩 Starting constraint satisfaction solving...'));
    
    this.resetStats();
    this.searchStats.startTime = Date.now();
    
    // Apply arc consistency preprocessing
    const preprocessedProblem = this.applyArcConsistency(problem);
    
    // Check if problem is already inconsistent
    if (this.isInconsistent(preprocessedProblem)) {
      return this.createFailureSolution('Problem is inconsistent after preprocessing');
    }
    
    // Perform backtracking search
    const assignment = new Map<string, any>();
    const solution = this.backtrackingSearch(preprocessedProblem, assignment);
    
    const solutionTime = Date.now() - this.searchStats.startTime;
    
    if (solution) {
      console.log(chalk.green(`✅ CSP solved successfully in ${solutionTime}ms`));
      return this.evaluateSolution(preprocessedProblem, solution);
    } else {
      console.log(chalk.red(`❌ No solution found for CSP in ${solutionTime}ms`));
      return this.createFailureSolution('No solution found');
    }
  }

  /**
   * Solve capability constraint satisfaction for agent selection
   */
  public solveCapabilityConstraints(
    requirement: CapabilityRequirement,
    candidates: AgentCapability[]
  ): AgentConstraintMapping[] {
    console.log(chalk.blue(`🎯 Solving capability constraints for ${candidates.length} candidates`));
    
    const results: AgentConstraintMapping[] = [];
    
    for (let i = 0; i < candidates.length; i++) {
      const capability = candidates[i];
      const agentId = `agent-${i}`; // In real implementation, use actual agent ID
      
      // Create CSP problem for this agent-capability pair
      const problem = this.createCapabilityCSP(requirement, capability);
      
      // Solve the constraint problem
      const solution = this.solve(problem);
      
      results.push({
        agentId,
        capability,
        variables: solution.assignment,
        feasible: solution.satisfied,
        violationCount: solution.hardViolations.length + solution.softViolations.length,
        satisfactionScore: solution.satisfactionScore
      });
    }
    
    // Sort by satisfaction score (descending)
    results.sort((a, b) => b.satisfactionScore - a.satisfactionScore);
    
    console.log(chalk.green(`✅ Capability constraint solving completed`));
    
    return results;
  }

  /**
   * Create CSP problem for capability matching
   */
  private createCapabilityCSP(
    requirement: CapabilityRequirement,
    capability: AgentCapability
  ): CSPProblem {
    const variables = new Map<string, ConstraintVariable>();
    const constraints: Constraint[] = [];
    
    // Version compatibility variable
    variables.set('version_compatible', {
      name: 'version_compatible',
      domain: [true, false],
      constraints: [],
      priority: 9
    });
    
    // Platform requirements variable
    if (requirement.constraints?.platformRequirements) {
      variables.set('platform_support', {
        name: 'platform_support',
        domain: requirement.constraints.platformRequirements,
        constraints: [],
        priority: 8
      });
    }
    
    // Resource requirements variables
    if (requirement.constraints?.resourceRequirements) {
      if (requirement.constraints.resourceRequirements.minCpu) {
        variables.set('cpu_available', {
          name: 'cpu_available',
          domain: [1, 2, 4, 8, 16], // CPU core options
          constraints: [],
          priority: 7
        });
      }
      
      if (requirement.constraints.resourceRequirements.minMemory) {
        variables.set('memory_available', {
          name: 'memory_available',
          domain: [512, 1024, 2048, 4096, 8192], // Memory in MB
          constraints: [],
          priority: 7
        });
      }
    }
    
    // Performance requirement variables
    variables.set('latency_acceptable', {
      name: 'latency_acceptable',
      domain: [true, false],
      constraints: [],
      priority: 6
    });
    
    variables.set('throughput_sufficient', {
      name: 'throughput_sufficient',
      domain: [true, false],
      constraints: [],
      priority: 6
    });
    
    // Create constraints
    
    // Version compatibility constraint (hard)
    if (requirement.versionRange) {
      constraints.push({
        id: 'version_compatibility',
        type: 'hard',
        variables: ['version_compatible'],
        predicate: (values) => {
          // This would check actual version compatibility
          return true; // Simplified for example
        },
        description: 'Agent capability version must be compatible with requirement',
        priority: 10
      });
    }
    
    // Platform support constraint (hard)
    if (requirement.constraints?.platformRequirements && capability.constraints?.platformRequirements) {
      constraints.push({
        id: 'platform_support',
        type: 'hard',
        variables: ['platform_support'],
        predicate: (values) => {
          const requiredPlatform = values.get('platform_support');
          return capability.constraints?.platformRequirements?.includes(requiredPlatform) || false;
        },
        description: 'Agent must support required platform',
        priority: 9
      });
    }
    
    // Resource constraints (hard)
    if (requirement.constraints?.resourceRequirements?.minCpu && 
        capability.constraints?.resourceRequirements?.minCpu) {
      constraints.push({
        id: 'cpu_requirement',
        type: 'hard',
        variables: ['cpu_available'],
        predicate: (values) => {
          const availableCpu = values.get('cpu_available');
          const requiredCpu = requirement.constraints?.resourceRequirements?.minCpu || 0;
          return availableCpu >= requiredCpu;
        },
        description: 'Sufficient CPU resources must be available',
        priority: 8
      });
    }
    
    // Performance constraints (soft)
    if (capability.performance) {
      constraints.push({
        id: 'latency_constraint',
        type: 'soft',
        variables: ['latency_acceptable'],
        predicate: (values) => {
          const acceptable = values.get('latency_acceptable');
          const actualLatency = capability.performance?.averageLatency || 1000;
          const maxAcceptableLatency = 2000; // 2 seconds
          return acceptable === (actualLatency <= maxAcceptableLatency);
        },
        penalty: 0.3,
        description: 'Response latency should be acceptable',
        priority: 6
      });
      
      constraints.push({
        id: 'throughput_constraint',
        type: 'soft',
        variables: ['throughput_sufficient'],
        predicate: (values) => {
          const sufficient = values.get('throughput_sufficient');
          const actualThroughput = capability.performance?.throughput || 10;
          const minRequiredThroughput = 50; // 50 req/s
          return sufficient === (actualThroughput >= minRequiredThroughput);
        },
        penalty: 0.2,
        description: 'Throughput should meet minimum requirements',
        priority: 5
      });
    }
    
    // Update variable constraints references
    for (const constraint of constraints) {
      for (const varName of constraint.variables) {
        const variable = variables.get(varName);
        if (variable) {
          variable.constraints.push(constraint);
        }
      }
    }
    
    return { variables, constraints };
  }

  /**
   * Apply arc consistency (AC-3 algorithm)
   */
  private applyArcConsistency(problem: CSPProblem): CSPProblem {
    console.log(chalk.cyan('🔄 Applying arc consistency...'));
    
    const queue: [string, string][] = [];
    
    // Initialize queue with all arcs
    for (const constraint of problem.constraints) {
      if (constraint.variables.length === 2) {
        const [var1, var2] = constraint.variables;
        queue.push([var1, var2]);
        queue.push([var2, var1]);
      }
    }
    
    while (queue.length > 0) {
      const [xi, xj] = queue.shift()!;
      
      if (this.revise(problem, xi, xj)) {
        const xiVar = problem.variables.get(xi);
        if (!xiVar || xiVar.domain.length === 0) {
          // Domain became empty, problem is inconsistent
          console.log(chalk.red(`❌ Arc consistency failed: empty domain for ${xi}`));
          break;
        }
        
        // Add all arcs (xk, xi) where xk is a neighbor of xi
        for (const constraint of problem.constraints) {
          if (constraint.variables.includes(xi)) {
            for (const xk of constraint.variables) {
              if (xk !== xi && xk !== xj) {
                queue.push([xk, xi]);
              }
            }
          }
        }
      }
    }
    
    console.log(chalk.green('✅ Arc consistency completed'));
    return problem;
  }

  /**
   * Revise domains for arc consistency
   */
  private revise(problem: CSPProblem, xi: string, xj: string): boolean {
    const xiVar = problem.variables.get(xi);
    const xjVar = problem.variables.get(xj);
    
    if (!xiVar || !xjVar) return false;
    
    let revised = false;
    const newDomain = [];
    
    for (const value of xiVar.domain) {
      let satisfiable = false;
      
      for (const otherValue of xjVar.domain) {
        // Check if this combination satisfies constraints
        const testAssignment = new Map();
        testAssignment.set(xi, value);
        testAssignment.set(xj, otherValue);
        
        if (this.isConsistentAssignment(problem, testAssignment)) {
          satisfiable = true;
          break;
        }
      }
      
      if (satisfiable) {
        newDomain.push(value);
      } else {
        revised = true;
      }
    }
    
    xiVar.domain = newDomain;
    return revised;
  }

  /**
   * Backtracking search with constraint propagation
   */
  private backtrackingSearch(
    problem: CSPProblem,
    assignment: Map<string, any>
  ): Map<string, any> | null {
    this.searchStats.nodesExplored++;
    
    // Check if assignment is complete
    if (assignment.size === problem.variables.size) {
      return assignment;
    }
    
    // Select unassigned variable using MRV heuristic
    const variable = this.selectUnassignedVariable(problem, assignment);
    if (!variable) return null;
    
    // Order domain values using least constraining value heuristic
    const orderedValues = this.orderDomainValues(problem, variable, assignment);
    
    for (const value of orderedValues) {
      // Create new assignment
      const newAssignment = new Map(assignment);
      newAssignment.set(variable.name, value);
      
      // Check consistency
      if (this.isConsistentAssignment(problem, newAssignment)) {
        // Apply forward checking
        const savedDomains = this.saveVariableDomains(problem);
        
        if (this.forwardCheck(problem, variable.name, value, assignment)) {
          // Recursively search
          const result = this.backtrackingSearch(problem, newAssignment);
          if (result !== null) {
            return result;
          }
        }
        
        // Restore domains after failed branch
        this.restoreVariableDomains(problem, savedDomains);
        this.searchStats.backtrackCount++;
      }
    }
    
    return null; // No solution found in this branch
  }

  /**
   * Select unassigned variable using Minimum Remaining Values (MRV) heuristic
   */
  private selectUnassignedVariable(
    problem: CSPProblem,
    assignment: Map<string, any>
  ): ConstraintVariable | null {
    let bestVariable: ConstraintVariable | null = null;
    let minRemainingValues = Infinity;
    let maxDegree = -1;
    
    for (const [name, variable] of problem.variables) {
      if (!assignment.has(name)) {
        const remainingValues = variable.domain.length;
        const degree = variable.constraints.length;
        
        // MRV heuristic with degree heuristic as tiebreaker
        if (remainingValues < minRemainingValues || 
            (remainingValues === minRemainingValues && degree > maxDegree)) {
          bestVariable = variable;
          minRemainingValues = remainingValues;
          maxDegree = degree;
        }
      }
    }
    
    return bestVariable;
  }

  /**
   * Order domain values using least constraining value heuristic
   */
  private orderDomainValues(
    problem: CSPProblem,
    variable: ConstraintVariable,
    assignment: Map<string, any>
  ): any[] {
    const valueConstrainedness = variable.domain.map(value => {
      let constrainedness = 0;
      
      // Count how many values this choice eliminates from other variables
      for (const [otherName, otherVar] of problem.variables) {
        if (otherName !== variable.name && !assignment.has(otherName)) {
          for (const otherValue of otherVar.domain) {
            const testAssignment = new Map(assignment);
            testAssignment.set(variable.name, value);
            testAssignment.set(otherName, otherValue);
            
            if (!this.isConsistentAssignment(problem, testAssignment)) {
              constrainedness++;
            }
          }
        }
      }
      
      return { value, constrainedness };
    });
    
    // Sort by constrainedness (ascending - least constraining first)
    valueConstrainedness.sort((a, b) => a.constrainedness - b.constrainedness);
    
    return valueConstrainedness.map(item => item.value);
  }

  /**
   * Forward checking to maintain arc consistency
   */
  private forwardCheck(
    problem: CSPProblem,
    assignedVar: string,
    assignedValue: any,
    assignment: Map<string, any>
  ): boolean {
    // For each unassigned variable that shares a constraint with assignedVar
    for (const [varName, variable] of problem.variables) {
      if (varName !== assignedVar && !assignment.has(varName)) {
        // Check if this variable shares constraints with assignedVar
        const sharedConstraints = variable.constraints.some(constraint =>
          constraint.variables.includes(assignedVar)
        );
        
        if (sharedConstraints) {
          // Remove inconsistent values from domain
          const newDomain = variable.domain.filter(value => {
            const testAssignment = new Map(assignment);
            testAssignment.set(assignedVar, assignedValue);
            testAssignment.set(varName, value);
            
            return this.isConsistentAssignment(problem, testAssignment);
          });
          
          // If domain becomes empty, forward checking failed
          if (newDomain.length === 0) {
            return false;
          }
          
          variable.domain = newDomain;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if current assignment is consistent with all constraints
   */
  private isConsistentAssignment(
    problem: CSPProblem,
    assignment: Map<string, any>
  ): boolean {
    this.searchStats.constraintChecks++;
    
    for (const constraint of problem.constraints) {
      // Check if all variables in constraint are assigned
      const allAssigned = constraint.variables.every(varName => assignment.has(varName));
      
      if (allAssigned) {
        // Hard constraints must be satisfied
        if (constraint.type === 'hard' && !constraint.predicate(assignment)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if problem is inconsistent (any variable has empty domain)
   */
  private isInconsistent(problem: CSPProblem): boolean {
    for (const [name, variable] of problem.variables) {
      if (variable.domain.length === 0) {
        console.log(chalk.red(`❌ Inconsistent: variable ${name} has empty domain`));
        return true;
      }
    }
    return false;
  }

  /**
   * Save variable domains for backtracking
   */
  private saveVariableDomains(problem: CSPProblem): Map<string, any[]> {
    const savedDomains = new Map<string, any[]>();
    
    for (const [name, variable] of problem.variables) {
      savedDomains.set(name, [...variable.domain]);
    }
    
    return savedDomains;
  }

  /**
   * Restore variable domains after backtracking
   */
  private restoreVariableDomains(
    problem: CSPProblem,
    savedDomains: Map<string, any[]>
  ): void {
    for (const [name, domain] of savedDomains) {
      const variable = problem.variables.get(name);
      if (variable) {
        variable.domain = domain;
      }
    }
  }

  /**
   * Evaluate solution quality
   */
  private evaluateSolution(problem: CSPProblem, assignment: Map<string, any>): CSPSolution {
    const hardViolations: string[] = [];
    const softViolations: string[] = [];
    let softPenaltySum = 0;
    
    // Check all constraints
    for (const constraint of problem.constraints) {
      const allAssigned = constraint.variables.every(varName => assignment.has(varName));
      
      if (allAssigned && !constraint.predicate(assignment)) {
        if (constraint.type === 'hard') {
          hardViolations.push(constraint.id);
        } else {
          softViolations.push(constraint.id);
          softPenaltySum += constraint.penalty || 0;
        }
      }
    }
    
    const satisfied = hardViolations.length === 0;
    const satisfactionScore = satisfied 
      ? Math.max(0, 1 - (softPenaltySum / problem.constraints.filter(c => c.type === 'soft').length))
      : 0;
    
    let objectiveValue: number | undefined;
    if (problem.objective && satisfied) {
      objectiveValue = problem.objective.function(assignment);
    }
    
    return {
      assignment,
      satisfied,
      hardViolations,
      softViolations,
      satisfactionScore,
      objectiveValue,
      searchStats: {
        nodesExplored: this.searchStats.nodesExplored,
        backtrackCount: this.searchStats.backtrackCount,
        constraintChecks: this.searchStats.constraintChecks,
        solutionTime: Date.now() - this.searchStats.startTime
      }
    };
  }

  /**
   * Create failure solution
   */
  private createFailureSolution(reason: string): CSPSolution {
    return {
      assignment: new Map(),
      satisfied: false,
      hardViolations: [reason],
      softViolations: [],
      satisfactionScore: 0,
      searchStats: {
        nodesExplored: this.searchStats.nodesExplored,
        backtrackCount: this.searchStats.backtrackCount,
        constraintChecks: this.searchStats.constraintChecks,
        solutionTime: Date.now() - this.searchStats.startTime
      }
    };
  }

  /**
   * Reset search statistics
   */
  private resetStats(): void {
    this.searchStats = {
      nodesExplored: 0,
      backtrackCount: 0,
      constraintChecks: 0,
      startTime: 0
    };
  }

  /**
   * Create custom constraint
   */
  public createConstraint(
    id: string,
    type: 'hard' | 'soft',
    variables: string[],
    predicate: (values: Map<string, any>) => boolean,
    description: string,
    priority: number = 5,
    penalty?: number
  ): Constraint {
    return {
      id,
      type,
      variables,
      predicate,
      description,
      priority,
      penalty
    };
  }

  /**
   * Create constraint variable
   */
  public createVariable(
    name: string,
    domain: any[],
    priority: number = 5
  ): ConstraintVariable {
    return {
      name,
      domain: [...domain], // Copy domain
      constraints: [],
      priority
    };
  }
}

export default ConstraintSatisfactionSolver;