[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / AgentRegistrationConfig

# Interface: AgentRegistrationConfig

Defined in: [src/client/AgentRegistrationClient.ts:41](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L41)

Agent registration configuration

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/client/AgentRegistrationClient.ts:47](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L47)

***

### agentName?

> `optional` **agentName**: `string`

Defined in: [src/client/AgentRegistrationClient.ts:48](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L48)

***

### agentVersion

> **agentVersion**: `string` \| [`SemVer`](SemVer.md)

Defined in: [src/client/AgentRegistrationClient.ts:49](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L49)

***

### autoReregister?

> `optional` **autoReregister**: `boolean`

Defined in: [src/client/AgentRegistrationClient.ts:54](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L54)

***

### consul?

> `optional` **consul**: `object`

Defined in: [src/client/AgentRegistrationClient.ts:58](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L58)

#### enabled

> **enabled**: `boolean`

#### host?

> `optional` **host**: `string`

#### port?

> `optional` **port**: `number`

#### serviceName?

> `optional` **serviceName**: `string`

#### tags?

> `optional` **tags**: `string`[]

***

### discovery?

> `optional` **discovery**: `object`

Defined in: [src/client/AgentRegistrationClient.ts:75](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L75)

#### autoDiscovery?

> `optional` **autoDiscovery**: `boolean`

#### configFiles?

> `optional` **configFiles**: `string`[]

#### pluginPatterns?

> `optional` **pluginPatterns**: `string`[]

#### scanPaths?

> `optional` **scanPaths**: `string`[]

***

### health?

> `optional` **health**: `object`

Defined in: [src/client/AgentRegistrationClient.ts:67](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L67)

#### endpoint?

> `optional` **endpoint**: `string`

#### interval?

> `optional` **interval**: `number`

#### retries?

> `optional` **retries**: `number`

#### timeout?

> `optional` **timeout**: `number`

***

### heartbeatInterval?

> `optional` **heartbeatInterval**: `number`

Defined in: [src/client/AgentRegistrationClient.ts:53](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L53)

***

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [src/client/AgentRegistrationClient.ts:55](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L55)

***

### registryApiVersion?

> `optional` **registryApiVersion**: `string`

Defined in: [src/client/AgentRegistrationClient.ts:44](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L44)

***

### registryUrl

> **registryUrl**: `string`

Defined in: [src/client/AgentRegistrationClient.ts:43](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L43)

***

### ttl?

> `optional` **ttl**: `number`

Defined in: [src/client/AgentRegistrationClient.ts:52](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L52)
