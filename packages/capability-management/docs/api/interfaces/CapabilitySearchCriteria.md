[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilitySearchCriteria

# Interface: CapabilitySearchCriteria

Defined in: [src/types/CapabilitySchema.ts:252](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L252)

Capability search criteria for discovery

## Properties

### capabilityId?

> `optional` **capabilityId**: `string`

Defined in: [src/types/CapabilitySchema.ts:253](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L253)

***

### category?

> `optional` **category**: `string`

Defined in: [src/types/CapabilitySchema.ts:255](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L255)

***

### includeDeprecated?

> `optional` **includeDeprecated**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:258](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L258)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/CapabilitySchema.ts:273](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L273)

***

### maxLatency?

> `optional` **maxLatency**: `number`

Defined in: [src/types/CapabilitySchema.ts:261](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L261)

***

### minThroughput?

> `optional` **minThroughput**: `number`

Defined in: [src/types/CapabilitySchema.ts:262](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L262)

***

### namePattern?

> `optional` **namePattern**: `string`

Defined in: [src/types/CapabilitySchema.ts:254](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L254)

***

### platformRequirements?

> `optional` **platformRequirements**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:265](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L265)

***

### resourceConstraints?

> `optional` **resourceConstraints**: `object`

Defined in: [src/types/CapabilitySchema.ts:266](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L266)

#### maxCpu?

> `optional` **maxCpu**: `number`

#### maxMemory?

> `optional` **maxMemory**: `number`

#### maxStorage?

> `optional` **maxStorage**: `number`

***

### sortBy?

> `optional` **sortBy**: `"name"` \| `"version"` \| `"performance"` \| `"reliability"`

Defined in: [src/types/CapabilitySchema.ts:274](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L274)

***

### sortOrder?

> `optional` **sortOrder**: `"asc"` \| `"desc"`

Defined in: [src/types/CapabilitySchema.ts:275](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L275)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:256](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L256)

***

### versionRange?

> `optional` **versionRange**: [`VersionRange`](VersionRange.md)

Defined in: [src/types/CapabilitySchema.ts:257](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L257)
