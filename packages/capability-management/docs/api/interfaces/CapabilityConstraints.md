[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilityConstraints

# Interface: CapabilityConstraints

Defined in: [src/types/CapabilitySchema.ts:99](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L99)

Capability constraints and requirements

## Properties

### incompatibleCapabilities?

> `optional` **incompatibleCapabilities**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:101](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L101)

***

### minimumAgentVersion?

> `optional` **minimumAgentVersion**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:102](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L102)

***

### networkRequirements?

> `optional` **networkRequirements**: `object`

Defined in: [src/types/CapabilitySchema.ts:109](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L109)

#### inboundPorts?

> `optional` **inboundPorts**: `number`[]

#### outboundConnections?

> `optional` **outboundConnections**: `string`[]

#### protocols?

> `optional` **protocols**: `string`[]

***

### platformRequirements?

> `optional` **platformRequirements**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:103](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L103)

***

### requiredCapabilities?

> `optional` **requiredCapabilities**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:100](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L100)

***

### resourceRequirements?

> `optional` **resourceRequirements**: `object`

Defined in: [src/types/CapabilitySchema.ts:104](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L104)

#### minCpu?

> `optional` **minCpu**: `number`

#### minMemory?

> `optional` **minMemory**: `number`

#### minStorage?

> `optional` **minStorage**: `number`
