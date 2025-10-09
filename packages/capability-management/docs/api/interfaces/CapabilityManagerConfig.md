[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilityManagerConfig

# Interface: CapabilityManagerConfig

Defined in: [src/client/AgentCapabilityManager.ts:84](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L84)

Capability manager configuration

## Properties

### autoDeprecation?

> `optional` **autoDeprecation**: `boolean`

Defined in: [src/client/AgentCapabilityManager.ts:87](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L87)

***

### autoRemoval?

> `optional` **autoRemoval**: `boolean`

Defined in: [src/client/AgentCapabilityManager.ts:88](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L88)

***

### autoVersioning?

> `optional` **autoVersioning**: `boolean`

Defined in: [src/client/AgentCapabilityManager.ts:86](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L86)

***

### dependencyResolution?

> `optional` **dependencyResolution**: `object`

Defined in: [src/client/AgentCapabilityManager.ts:106](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L106)

#### autoResolve?

> `optional` **autoResolve**: `boolean`

#### conflictStrategy?

> `optional` **conflictStrategy**: `"manual"` \| `"latest"` \| `"stable"`

#### maxDepth?

> `optional` **maxDepth**: `number`

***

### performanceThresholds?

> `optional` **performanceThresholds**: `object`

Defined in: [src/client/AgentCapabilityManager.ts:92](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L92)

#### maxErrorRate?

> `optional` **maxErrorRate**: `number`

#### maxLatency?

> `optional` **maxLatency**: `number`

#### minSuccessRate?

> `optional` **minSuccessRate**: `number`

***

### performanceTracking?

> `optional` **performanceTracking**: `boolean`

Defined in: [src/client/AgentCapabilityManager.ts:91](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L91)

***

### versioningPolicy?

> `optional` **versioningPolicy**: `object`

Defined in: [src/client/AgentCapabilityManager.ts:99](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L99)

#### majorNotificationPeriod?

> `optional` **majorNotificationPeriod**: `number`

#### minorFrequency?

> `optional` **minorFrequency**: `number`

#### patchFrequency?

> `optional` **patchFrequency**: `number`
