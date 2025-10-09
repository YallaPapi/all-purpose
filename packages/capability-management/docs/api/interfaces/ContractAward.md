[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / ContractAward

# Interface: ContractAward

Defined in: [src/algorithms/ContractNetProtocol.ts:105](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L105)

Contract award data

## Properties

### agreedTerms

> **agreedTerms**: `Record`\<`string`, `any`\>

Defined in: [src/algorithms/ContractNetProtocol.ts:108](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L108)

***

### contractId

> **contractId**: `string`

Defined in: [src/algorithms/ContractNetProtocol.ts:106](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L106)

***

### deliverables

> **deliverables**: `string`[]

Defined in: [src/algorithms/ContractNetProtocol.ts:109](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L109)

***

### milestones?

> `optional` **milestones**: `object`[]

Defined in: [src/algorithms/ContractNetProtocol.ts:110](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L110)

#### deadline

> **deadline**: `Date`

#### description

> **description**: `string`

#### id

> **id**: `string`

#### payment

> **payment**: `number`

***

### penalties

> **penalties**: `object`

Defined in: [src/algorithms/ContractNetProtocol.ts:116](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L116)

#### cancellation

> **cancellation**: `number`

#### lateDelivery

> **lateDelivery**: `number`

#### qualityBreach

> **qualityBreach**: `number`

***

### winningBid

> **winningBid**: [`Proposal`](Proposal.md)

Defined in: [src/algorithms/ContractNetProtocol.ts:107](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/algorithms/ContractNetProtocol.ts#L107)
