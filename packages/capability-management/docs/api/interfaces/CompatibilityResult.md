[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CompatibilityResult

# Interface: CompatibilityResult

Defined in: [src/types/CapabilitySchema.ts:293](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L293)

Capability compatibility result

## Properties

### compatible

> **compatible**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:294](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L294)

***

### constraintCompatible?

> `optional` **constraintCompatible**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:308](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L308)

***

### constraintDetails?

> `optional` **constraintDetails**: `object`

Defined in: [src/types/CapabilitySchema.ts:309](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L309)

#### violations?

> `optional` **violations**: `string`[]

#### warnings?

> `optional` **warnings**: `string`[]

***

### migrationPath?

> `optional` **migrationPath**: `object`

Defined in: [src/types/CapabilitySchema.ts:316](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L316)

#### breakingChanges?

> `optional` **breakingChanges**: `string`[]

#### estimatedEffort?

> `optional` **estimatedEffort**: `string`

#### steps?

> `optional` **steps**: `string`[]

***

### migrationRequired?

> `optional` **migrationRequired**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:315](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L315)

***

### reason?

> `optional` **reason**: `string`

Defined in: [src/types/CapabilitySchema.ts:295](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L295)

***

### score?

> `optional` **score**: `number`

Defined in: [src/types/CapabilitySchema.ts:296](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L296)

***

### versionCompatible?

> `optional` **versionCompatible**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:299](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L299)

***

### versionDetails?

> `optional` **versionDetails**: `object`

Defined in: [src/types/CapabilitySchema.ts:300](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L300)

#### compatible

> **compatible**: `boolean`

#### provided

> **provided**: [`SemVer`](SemVer.md)

#### reason?

> `optional` **reason**: `string`

#### required

> **required**: [`VersionRange`](VersionRange.md)
