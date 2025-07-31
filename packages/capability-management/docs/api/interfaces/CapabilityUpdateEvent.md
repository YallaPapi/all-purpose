[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilityUpdateEvent

# Interface: CapabilityUpdateEvent

Defined in: [src/client/AgentCapabilityManager.ts:47](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L47)

Capability update event

## Properties

### capability

> **capability**: [`AgentCapability`](AgentCapability.md)

Defined in: [src/client/AgentCapabilityManager.ts:49](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L49)

***

### previousVersion?

> `optional` **previousVersion**: [`SemVer`](SemVer.md)

Defined in: [src/client/AgentCapabilityManager.ts:50](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L50)

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/client/AgentCapabilityManager.ts:51](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L51)

***

### type

> **type**: `"added"` \| `"deprecated"` \| `"removed"` \| `"updated"`

Defined in: [src/client/AgentCapabilityManager.ts:48](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentCapabilityManager.ts#L48)
