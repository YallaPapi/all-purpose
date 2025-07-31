[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / ConstraintSatisfactionSolver

# Class: ConstraintSatisfactionSolver

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:105](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L105)

Constraint Satisfaction Solver class

## Constructors

### Constructor

> **new ConstraintSatisfactionSolver**(): `ConstraintSatisfactionSolver`

#### Returns

`ConstraintSatisfactionSolver`

## Methods

### createConstraint()

> **createConstraint**(`id`, `type`, `variables`, `predicate`, `description`, `priority`, `penalty?`): [`Constraint`](../interfaces/Constraint.md)

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:730](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L730)

Create custom constraint

#### Parameters

##### id

`string`

##### type

`"hard"` | `"soft"`

##### variables

`string`[]

##### predicate

(`values`) => `boolean`

##### description

`string`

##### priority

`number` = `5`

##### penalty?

`number`

#### Returns

[`Constraint`](../interfaces/Constraint.md)

***

### createVariable()

> **createVariable**(`name`, `domain`, `priority`): [`ConstraintVariable`](../interfaces/ConstraintVariable.md)

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:753](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L753)

Create constraint variable

#### Parameters

##### name

`string`

##### domain

`any`[]

##### priority

`number` = `5`

#### Returns

[`ConstraintVariable`](../interfaces/ConstraintVariable.md)

***

### solve()

> **solve**(`problem`): [`CSPSolution`](../interfaces/CSPSolution.md)

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:121](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L121)

Solve constraint satisfaction problem

#### Parameters

##### problem

[`CSPProblem`](../interfaces/CSPProblem.md)

#### Returns

[`CSPSolution`](../interfaces/CSPSolution.md)

***

### solveCapabilityConstraints()

> **solveCapabilityConstraints**(`requirement`, `candidates`): [`AgentConstraintMapping`](../interfaces/AgentConstraintMapping.md)[]

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:153](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L153)

Solve capability constraint satisfaction for agent selection

#### Parameters

##### requirement

[`CapabilityRequirement`](../interfaces/CapabilityRequirement.md)

##### candidates

[`AgentCapability`](../interfaces/AgentCapability.md)[]

#### Returns

[`AgentConstraintMapping`](../interfaces/AgentConstraintMapping.md)[]
