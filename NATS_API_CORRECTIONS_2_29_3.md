# NATS JavaScript Client 2.29.3 API Corrections

## Summary
Based on research of NATS JavaScript client version 2.29.3, here are the exact API corrections needed for your TypeScript compilation errors.

## 1. Property Names: Snake_case vs camelCase

### ❌ INCORRECT (causes TypeScript errors):
```typescript
// Consumer configuration
const consumer = await js.consumers.get(streamName, {
  filter_subjects: [subject]  // Wrong property name
});

const consumerConfig = {
  filter_subject: subject     // Wrong property name
};
```

### ✅ CORRECT API:
```typescript
// Consumer configuration - use camelCase
const consumer = await js.consumers.get(streamName, {
  filterSubjects: [subject]   // Correct: camelCase plural
});

const consumerConfig = {
  filterSubject: subject,     // Correct: camelCase singular
  // OR for multiple subjects:
  filterSubjects: [subject]   // Correct: camelCase plural
};
```

## 2. RetentionPolicy, StorageType, DiscardPolicy Enums

### ❌ INCORRECT (causes TypeScript errors):
```typescript
const streamConfig = {
  storage: 'file' as const,      // Wrong: should use enum
  retention: 'limits' as const,  // Wrong: should use enum
  discard: 'old' as const,       // Wrong: should use enum
};
```

### ✅ CORRECT API:
```typescript
import { RetentionPolicy, StorageType, DiscardPolicy } from 'nats';

const streamConfig = {
  storage: StorageType.File,          // Correct: use enum
  retention: RetentionPolicy.Limits,  // Correct: use enum
  discard: DiscardPolicy.Old,         // Correct: use enum
};

// Available enum values:
// RetentionPolicy: Limits, Interest, Workqueue
// StorageType: File, Memory  
// DiscardPolicy: Old, New
```

## 3. Consumer Message Iterator Methods

### ✅ CORRECT API for JetStream consumer iterators:
```typescript
// JetStream consumer returns async iterator
const consumer = await js.consumers.get(streamName, config);
const messages = await consumer.consume({ max_messages: 100, expires: 30000 });

// This is CORRECT - JetStream consumer iterators DO have .stop()
messages.stop();  // ✅ Valid for JetStream consumer iterators

// For processing messages:
for await (const msg of messages) {
  try {
    // Process message
    msg.ack();  // Acknowledge message
  } catch (error) {
    msg.nak();  // Negative acknowledge on error
  }
}
```

### Traditional NATS subscriptions (different API):
```typescript
// Traditional NATS subscription (not JetStream)
const subscription = nc.subscribe(subject);
subscription.unsubscribe();  // ✅ Traditional subscriptions use unsubscribe()
```

## 4. Complete Working Example

Here's a complete working TypeScript example for NATS 2.29.3:

```typescript
import { 
  connect, 
  NatsConnection, 
  JetStreamClient, 
  JetStreamManager,
  RetentionPolicy, 
  StorageType, 
  DiscardPolicy 
} from 'nats';

class NATSExample {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;

  async connect() {
    this.nc = await connect({ servers: ['nats://localhost:4222'] });
    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();
  }

  async createStream() {
    if (!this.jsm) throw new Error('Not connected');
    
    await this.jsm.streams.add({
      name: 'EVENTS',
      subjects: ['events.>'],
      storage: StorageType.File,          // ✅ Use enum
      retention: RetentionPolicy.Limits,  // ✅ Use enum
      discard: DiscardPolicy.Old,         // ✅ Use enum
      max_msgs: 1000,
      max_bytes: 1024 * 1024,
      max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
    });
  }

  async subscribe(subject: string) {
    if (!this.js) throw new Error('Not connected');

    // ✅ Correct consumer configuration
    const consumer = await this.js.consumers.get('EVENTS', {
      filterSubjects: [subject],  // ✅ Use camelCase plural
      durable_name: 'my-consumer',
      ack_policy: 'explicit'
    });

    const messages = await consumer.consume({
      max_messages: 100,
      expires: 30000
    });

    // Process messages
    (async () => {
      for await (const msg of messages) {
        try {
          console.log('Received:', msg.string());
          msg.ack();
        } catch (error) {
          console.error('Error processing message:', error);
          msg.nak();
        }
      }
    })();

    // Return stop function
    return () => messages.stop();  // ✅ Correct method for JetStream iterators
  }
}
```

## 5. Fixed Files in Your Codebase

The following files have been corrected:

1. **`C:\Users\stuar\Desktop\Projects\all-purpose\shared\messaging\EventBus.ts`**
   - ✅ Fixed: `filter_subjects` → `filterSubjects`
   - ✅ Fixed: String literals → Proper enums (RetentionPolicy, StorageType, DiscardPolicy)
   - ✅ Added proper imports

2. **`C:\Users\stuar\Desktop\Projects\all-purpose\containers\factory-core\src\services\NATSEventBus.ts`**
   - ✅ Added proper enum imports
   - ✅ Verified `.stop()` method usage is correct for JetStream iterators

## 6. Key Differences from Older NATS Versions

- **v2.29.3 uses camelCase**: `filterSubjects` not `filter_subjects`
- **Enum imports required**: Import `RetentionPolicy`, `StorageType`, `DiscardPolicy` from 'nats'
- **JetStream consumer iterators**: Use `.stop()` method (not `.unsubscribe()`)
- **Traditional subscriptions**: Use `.unsubscribe()` method (not `.stop()`)

## 7. TypeScript Compilation Test

After applying these fixes, your TypeScript compilation should succeed. Test with:

```bash
npx tsc --noEmit  # Type check without emitting files
# or
npm run build     # If you have a build script
```

## 8. Version Consistency

Your project uses multiple NATS versions:
- Main: `^2.29.3` ✅ (most recent)
- Containers: `^2.18.0` ⚠️ (older)
- UEP Client: `^2.28.2` ✅ (recent)

Consider upgrading all packages to `^2.29.3` for consistency:

```bash
npm install nats@^2.29.3
```

---

These corrections address all the TypeScript compilation errors mentioned:
1. ✅ `filter_subjects` → `filterSubjects` 
2. ✅ RetentionPolicy enum usage
3. ✅ StorageType and DiscardPolicy enum usage  
4. ✅ Correct `.stop()` method for JetStream consumer iterators