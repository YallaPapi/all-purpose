[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / AgentPerformanceData

# Interface: AgentPerformanceData

Defined in: [src/algorithms/CapabilityMatchingEngine.ts:72](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/CapabilityMatchingEngine.ts#L72)

Agent performance data for ranking

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/algorithms/CapabilityMatchingEngine.ts:73](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/CapabilityMatchingEngine.ts#L73)

***

### capability

> **capability**: [`AgentCapability`](AgentCapability.md)

Defined in: [src/algorithms/CapabilityMatchingEngine.ts:74](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/CapabilityMatchingEngine.ts#L74)

***

### constraints

> **constraints**: `object`

Defined in: [src/algorithms/CapabilityMatchingEngine.ts:83](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/CapabilityMatchingEngine.ts#L83)

#### satisfied

> **satisfied**: `boolean`

#### score

> **score**: `number`

#### violations

> **violations**: `string`[]

***

### metrics

> **metrics**: `object`

Defined in: [src/algorithms/CapabilityMatchingEngine.ts:75](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/CapabilityMatchingEngine.ts#L75)

#### availability

> **availability**: `number`

#### averageLatency

> **averageLatency**: `number`

#### currentLoad

> **currentLoad**: `number`

#### lastUpdated

> **lastUpdated**: `Date`

#### successRate

> **successRate**: `number`

#### throughput

> **throughput**: `number`
