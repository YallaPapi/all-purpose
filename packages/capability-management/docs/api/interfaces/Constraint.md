[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / Constraint

# Interface: Constraint

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:44](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L44)

Constraint definition

## Properties

### description

> **description**: `string`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:50](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L50)

***

### id

> **id**: `string`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:45](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L45)

***

### penalty?

> `optional` **penalty**: `number`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:49](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L49)

***

### predicate()

> **predicate**: (`values`) => `boolean`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:48](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L48)

#### Parameters

##### values

`Map`\<`string`, `any`\>

#### Returns

`boolean`

***

### priority

> **priority**: `number`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:51](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L51)

***

### type

> **type**: `"hard"` \| `"soft"`

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:46](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L46)

***

### variables

> **variables**: `string`[]

Defined in: [src/algorithms/ConstraintSatisfactionSolver.ts:47](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ConstraintSatisfactionSolver.ts#L47)
