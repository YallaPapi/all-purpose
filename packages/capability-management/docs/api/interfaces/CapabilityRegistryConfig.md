[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilityRegistryConfig

# Interface: CapabilityRegistryConfig

Defined in: [src/types/CapabilitySchema.ts:326](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L326)

Capability registry configuration

## Properties

### monitoring

> **monitoring**: `object`

Defined in: [src/types/CapabilitySchema.ts:358](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L358)

#### auditEnabled?

> `optional` **auditEnabled**: `boolean`

#### healthCheckInterval?

> `optional` **healthCheckInterval**: `number`

#### metricsEnabled?

> `optional` **metricsEnabled**: `boolean`

***

### performance

> **performance**: `object`

Defined in: [src/types/CapabilitySchema.ts:350](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L350)

#### batchSize?

> `optional` **batchSize**: `number`

#### cacheEnabled?

> `optional` **cacheEnabled**: `boolean`

#### cacheTtl?

> `optional` **cacheTtl**: `number`

#### indexingEnabled?

> `optional` **indexingEnabled**: `boolean`

***

### storage

> **storage**: `object`

Defined in: [src/types/CapabilitySchema.ts:328](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L328)

#### connectionString?

> `optional` **connectionString**: `string`

#### keyPrefix?

> `optional` **keyPrefix**: `string`

#### ttl?

> `optional` **ttl**: `number`

#### type

> **type**: `"redis"` \| `"consul"` \| `"memory"` \| `"database"`

***

### validation

> **validation**: `object`

Defined in: [src/types/CapabilitySchema.ts:343](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L343)

#### customValidators?

> `optional` **customValidators**: `string`[]

#### enableSchemaValidation?

> `optional` **enableSchemaValidation**: `boolean`

#### strictCompatibilityChecking?

> `optional` **strictCompatibilityChecking**: `boolean`

***

### versioning

> **versioning**: `object`

Defined in: [src/types/CapabilitySchema.ts:336](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L336)

#### allowPrerelease?

> `optional` **allowPrerelease**: `boolean`

#### deprecationWarningPeriod?

> `optional` **deprecationWarningPeriod**: `number`

#### strictSemVer?

> `optional` **strictSemVer**: `boolean`
