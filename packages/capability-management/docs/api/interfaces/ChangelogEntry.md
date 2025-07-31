[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / ChangelogEntry

# Interface: ChangelogEntry

Defined in: [src/types/CapabilitySchema.ts:183](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L183)

Changelog entry for capability version history

## Properties

### breakingChange?

> `optional` **breakingChange**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:188](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L188)

***

### date

> **date**: `Date`

Defined in: [src/types/CapabilitySchema.ts:185](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L185)

***

### description

> **description**: `string`

Defined in: [src/types/CapabilitySchema.ts:187](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L187)

***

### migrationGuide?

> `optional` **migrationGuide**: `string`

Defined in: [src/types/CapabilitySchema.ts:189](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L189)

***

### type

> **type**: `"fixed"` \| `"added"` \| `"changed"` \| `"deprecated"` \| `"removed"` \| `"security"`

Defined in: [src/types/CapabilitySchema.ts:186](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L186)

***

### version

> **version**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:184](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L184)
