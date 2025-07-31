[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / NegotiationSession

# Interface: NegotiationSession

Defined in: [src/algorithms/ContractNetProtocol.ts:158](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L158)

Negotiation session state

## Properties

### blacklist

> **blacklist**: `Set`\<`string`\>

Defined in: [src/algorithms/ContractNetProtocol.ts:166](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L166)

***

### endTime?

> `optional` **endTime**: `Date`

Defined in: [src/algorithms/ContractNetProtocol.ts:168](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L168)

***

### finalContract?

> `optional` **finalContract**: [`ContractAward`](ContractAward.md)

Defined in: [src/algorithms/ContractNetProtocol.ts:169](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L169)

***

### managerId

> **managerId**: `string`

Defined in: [src/algorithms/ContractNetProtocol.ts:160](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L160)

***

### metrics

> **metrics**: `object`

Defined in: [src/algorithms/ContractNetProtocol.ts:170](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L170)

#### averageResponseTime

> **averageResponseTime**: `number`

#### negotiationEfficiency

> **negotiationEfficiency**: `number`

#### participationRate

> **participationRate**: `number`

#### totalProposals

> **totalProposals**: `number`

***

### participants

> **participants**: `Set`\<`string`\>

Defined in: [src/algorithms/ContractNetProtocol.ts:165](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L165)

***

### requirement

> **requirement**: [`CapabilityRequirement`](CapabilityRequirement.md)

Defined in: [src/algorithms/ContractNetProtocol.ts:162](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L162)

***

### rounds

> **rounds**: `NegotiationRound`[]

Defined in: [src/algorithms/ContractNetProtocol.ts:164](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L164)

***

### sessionId

> **sessionId**: `string`

Defined in: [src/algorithms/ContractNetProtocol.ts:159](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L159)

***

### startTime

> **startTime**: `Date`

Defined in: [src/algorithms/ContractNetProtocol.ts:167](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L167)

***

### status

> **status**: `"active"` \| `"completed"` \| `"cancelled"` \| `"failed"`

Defined in: [src/algorithms/ContractNetProtocol.ts:163](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L163)

***

### taskId

> **taskId**: `string`

Defined in: [src/algorithms/ContractNetProtocol.ts:161](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L161)
