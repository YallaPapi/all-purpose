[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / PerformanceMetrics

# Interface: PerformanceMetrics

Defined in: [src/types/CapabilitySchema.ts:81](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L81)

Performance characteristics for capability

## Properties

### averageLatency?

> `optional` **averageLatency**: `number`

Defined in: [src/types/CapabilitySchema.ts:82](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L82)

***

### maxLatency?

> `optional` **maxLatency**: `number`

Defined in: [src/types/CapabilitySchema.ts:83](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L83)

***

### resourceUsage?

> `optional` **resourceUsage**: `object`

Defined in: [src/types/CapabilitySchema.ts:85](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L85)

#### cpu?

> `optional` **cpu**: `number`

#### memory?

> `optional` **memory**: `number`

#### storage?

> `optional` **storage**: `number`

***

### scalingLimits?

> `optional` **scalingLimits**: `object`

Defined in: [src/types/CapabilitySchema.ts:90](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L90)

#### maxConcurrentRequests?

> `optional` **maxConcurrentRequests**: `number`

#### maxQueueSize?

> `optional` **maxQueueSize**: `number`

***

### throughput?

> `optional` **throughput**: `number`

Defined in: [src/types/CapabilitySchema.ts:84](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L84)
