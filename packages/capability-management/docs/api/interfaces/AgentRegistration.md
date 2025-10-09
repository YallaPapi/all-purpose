[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / AgentRegistration

# Interface: AgentRegistration

Defined in: [src/types/CapabilitySchema.ts:215](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L215)

Agent registration payload with capabilities

## Extended by

- [`StoredAgentRegistration`](StoredAgentRegistration.md)

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/types/CapabilitySchema.ts:217](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L217)

***

### agentName?

> `optional` **agentName**: `string`

Defined in: [src/types/CapabilitySchema.ts:218](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L218)

***

### agentVersion

> **agentVersion**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:219](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L219)

***

### capabilities

> **capabilities**: [`AgentCapability`](AgentCapability.md)[]

Defined in: [src/types/CapabilitySchema.ts:222](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L222)

***

### contact?

> `optional` **contact**: `string`

Defined in: [src/types/CapabilitySchema.ts:227](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L227)

***

### description?

> `optional` **description**: `string`

Defined in: [src/types/CapabilitySchema.ts:225](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L225)

***

### endpoints?

> `optional` **endpoints**: `object`

Defined in: [src/types/CapabilitySchema.ts:230](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L230)

#### api?

> `optional` **api**: `string`

#### health?

> `optional` **health**: `string`

#### metrics?

> `optional` **metrics**: `string`

***

### environment?

> `optional` **environment**: `object`

Defined in: [src/types/CapabilitySchema.ts:241](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L241)

#### datacenter?

> `optional` **datacenter**: `string`

#### location?

> `optional` **location**: `string`

#### platform?

> `optional` **platform**: `string`

#### runtime?

> `optional` **runtime**: `string`

***

### maintainer?

> `optional` **maintainer**: `string`

Defined in: [src/types/CapabilitySchema.ts:226](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L226)

***

### registrationTime

> **registrationTime**: `Date`

Defined in: [src/types/CapabilitySchema.ts:237](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L237)

***

### ttl?

> `optional` **ttl**: `number`

Defined in: [src/types/CapabilitySchema.ts:238](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L238)
