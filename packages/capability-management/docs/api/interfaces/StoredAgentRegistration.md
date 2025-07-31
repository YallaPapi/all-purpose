[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / StoredAgentRegistration

# Interface: StoredAgentRegistration

Defined in: [src/services/CapabilityRegistryService.ts:66](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L66)

Agent registration data stored in Redis

## Extends

- [`AgentRegistration`](AgentRegistration.md)

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/types/CapabilitySchema.ts:217](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L217)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`agentId`](AgentRegistration.md#agentid)

***

### agentName?

> `optional` **agentName**: `string`

Defined in: [src/types/CapabilitySchema.ts:218](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L218)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`agentName`](AgentRegistration.md#agentname)

***

### agentVersion

> **agentVersion**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:219](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L219)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`agentVersion`](AgentRegistration.md#agentversion)

***

### capabilities

> **capabilities**: [`AgentCapability`](AgentCapability.md)[]

Defined in: [src/types/CapabilitySchema.ts:222](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L222)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`capabilities`](AgentRegistration.md#capabilities)

***

### contact?

> `optional` **contact**: `string`

Defined in: [src/types/CapabilitySchema.ts:227](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L227)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`contact`](AgentRegistration.md#contact)

***

### description?

> `optional` **description**: `string`

Defined in: [src/types/CapabilitySchema.ts:225](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L225)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`description`](AgentRegistration.md#description)

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

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`endpoints`](AgentRegistration.md#endpoints)

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

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`environment`](AgentRegistration.md#environment)

***

### health

> **health**: `object`

Defined in: [src/services/CapabilityRegistryService.ts:69](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L69)

#### checks

> **checks**: `Record`\<`string`, `boolean`\>

#### lastCheck

> **lastCheck**: `Date`

#### metrics?

> `optional` **metrics**: `Record`\<`string`, `number`\>

#### status

> **status**: [`HealthStatus`](../type-aliases/HealthStatus.md)

***

### lastHeartbeat

> **lastHeartbeat**: `Date`

Defined in: [src/services/CapabilityRegistryService.ts:68](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L68)

***

### maintainer?

> `optional` **maintainer**: `string`

Defined in: [src/types/CapabilitySchema.ts:226](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L226)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`maintainer`](AgentRegistration.md#maintainer)

***

### registrationId

> **registrationId**: `string`

Defined in: [src/services/CapabilityRegistryService.ts:67](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L67)

***

### registrationTime

> **registrationTime**: `Date`

Defined in: [src/types/CapabilitySchema.ts:237](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L237)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`registrationTime`](AgentRegistration.md#registrationtime)

***

### ttl?

> `optional` **ttl**: `number`

Defined in: [src/types/CapabilitySchema.ts:238](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L238)

#### Inherited from

[`AgentRegistration`](AgentRegistration.md).[`ttl`](AgentRegistration.md#ttl)
