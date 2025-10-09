[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CSPSolution

# Interface: CSPSolution

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:75](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L75)

CSP solution

## Properties

### assignment

> **assignment**: `Map`\<`string`, `any`\>

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:76](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L76)

***

### hardViolations

> **hardViolations**: `string`[]

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:78](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L78)

***

### objectiveValue?

> `optional` **objectiveValue**: `number`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:81](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L81)

***

### satisfactionScore

> **satisfactionScore**: `number`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:80](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L80)

***

### satisfied

> **satisfied**: `boolean`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:77](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L77)

***

### searchStats

> **searchStats**: `object`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:82](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L82)

#### backtrackCount

> **backtrackCount**: `number`

#### constraintChecks

> **constraintChecks**: `number`

#### nodesExplored

> **nodesExplored**: `number`

#### solutionTime

> **solutionTime**: `number`

***

### softViolations

> **softViolations**: `string`[]

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:79](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L79)
