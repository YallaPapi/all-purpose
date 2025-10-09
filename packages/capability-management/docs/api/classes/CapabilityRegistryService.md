[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilityRegistryService

# Class: CapabilityRegistryService

Defined in: [src/services/CapabilityRegistryService.ts:94](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L94)

Capability Registry Service class

## Constructors

### Constructor

> **new CapabilityRegistryService**(`config`): `CapabilityRegistryService`

Defined in: [src/services/CapabilityRegistryService.ts:105](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L105)

#### Parameters

##### config

[`CapabilityRegistryConfig`](../interfaces/CapabilityRegistryConfig.md)

#### Returns

`CapabilityRegistryService`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [src/services/CapabilityRegistryService.ts:132](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L132)

Initialize the registry service

#### Returns

`Promise`\<`void`\>

***

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [src/services/CapabilityRegistryService.ts:186](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L186)

Graceful shutdown

#### Returns

`Promise`\<`void`\>

***

### start()

> **start**(`port`, `host`): `Promise`\<`void`\>

Defined in: [src/services/CapabilityRegistryService.ts:164](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/services/CapabilityRegistryService.ts#L164)

Start the HTTP server

#### Parameters

##### port

`number` = `3001`

##### host

`string` = `'localhost'`

#### Returns

`Promise`\<`void`\>
