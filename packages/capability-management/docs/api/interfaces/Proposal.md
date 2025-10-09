[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / Proposal

# Interface: Proposal

Defined in: [src/algorithms/ContractNetProtocol.ts:80](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L80)

Proposal (bid) data

## Properties

### agentExperience

> **agentExperience**: `object`

Defined in: [src/algorithms/ContractNetProtocol.ts:88](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L88)

#### averageRating

> **averageRating**: `number`

#### lastActivity

> **lastActivity**: `Date`

#### successRate

> **successRate**: `number`

#### totalTasks

> **totalTasks**: `number`

***

### bidId

> **bidId**: `string`

Defined in: [src/algorithms/ContractNetProtocol.ts:81](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L81)

***

### capability

> **capability**: [`AgentCapability`](AgentCapability.md)

Defined in: [src/algorithms/ContractNetProtocol.ts:87](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L87)

***

### constraints

> **constraints**: `object`

Defined in: [src/algorithms/ContractNetProtocol.ts:94](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L94)

#### dependencies?

> `optional` **dependencies**: `string`[]

#### exclusiveAccess?

> `optional` **exclusiveAccess**: `boolean`

#### maxConcurrency?

> `optional` **maxConcurrency**: `number`

#### minDuration?

> `optional` **minDuration**: `number`

***

### estimatedCompletionTime

> **estimatedCompletionTime**: `Date`

Defined in: [src/algorithms/ContractNetProtocol.ts:83](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L83)

***

### price

> **price**: `number`

Defined in: [src/algorithms/ContractNetProtocol.ts:82](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L82)

***

### qualityGuarantee

> **qualityGuarantee**: `number`

Defined in: [src/algorithms/ContractNetProtocol.ts:84](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L84)

***

### reliabilityScore

> **reliabilityScore**: `number`

Defined in: [src/algorithms/ContractNetProtocol.ts:85](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L85)

***

### terms

> **terms**: `Record`\<`string`, `any`\>

Defined in: [src/algorithms/ContractNetProtocol.ts:86](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L86)
