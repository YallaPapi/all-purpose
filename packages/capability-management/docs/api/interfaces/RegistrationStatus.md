[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / RegistrationStatus

# Interface: RegistrationStatus

Defined in: [src/client/AgentRegistrationClient.ts:94](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L94)

Registration status

## Properties

### capabilities

> **capabilities**: [`AgentCapability`](AgentCapability.md)[]

Defined in: [src/client/AgentRegistrationClient.ts:100](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L100)

***

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [src/client/AgentRegistrationClient.ts:99](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L99)

***

### health

> **health**: `object`

Defined in: [src/client/AgentRegistrationClient.ts:101](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L101)

#### checks

> **checks**: `Record`\<`string`, `boolean`\>

#### lastCheck

> **lastCheck**: `Date`

#### metrics?

> `optional` **metrics**: `Record`\<`string`, `number`\>

#### status

> **status**: `HealthStatus`

***

### lastHeartbeat?

> `optional` **lastHeartbeat**: `Date`

Defined in: [src/client/AgentRegistrationClient.ts:98](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L98)

***

### lastRegistration?

> `optional` **lastRegistration**: `Date`

Defined in: [src/client/AgentRegistrationClient.ts:97](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L97)

***

### registered

> **registered**: `boolean`

Defined in: [src/client/AgentRegistrationClient.ts:95](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L95)

***

### registrationId?

> `optional` **registrationId**: `string`

Defined in: [src/client/AgentRegistrationClient.ts:96](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L96)
