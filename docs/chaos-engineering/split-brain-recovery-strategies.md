# 🔄 **Comprehensive Split-Brain Recovery and Conflict Resolution Strategies**

## **Production-Ready Patterns for Distributed Node.js Meta-Agent Systems**

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Focus**: Split-Brain Recovery, Conflict Resolution, and State Reconciliation  
**Tech Stack**: Node.js, TypeScript, Redis, WebSockets, CRDTs

---

## 📋 **Table of Contents**

1. [Executive Summary](#executive-summary)
2. [Conflict Resolution Algorithms](#conflict-resolution-algorithms)
3. [Automated Reconciliation Workflows](#automated-reconciliation-workflows)
4. [Safe Agent Rejoining Protocols](#safe-agent-rejoining-protocols)
5. [State Reconciliation Patterns](#state-reconciliation-patterns)
6. [Conflict Logging and Audit Trails](#conflict-logging-and-audit-trails)
7. [Production Implementation Guide](#production-implementation-guide)
8. [Testing and Validation](#testing-and-validation)
9. [Emergency Recovery Procedures](#emergency-recovery-procedures)
10. [Best Practices 2024-2025](#best-practices-2024-2025)

---

## 🎯 **Executive Summary**

Split-brain recovery in distributed systems requires a multi-layered approach combining prevention, detection, and recovery strategies. This guide provides production-ready patterns for handling split-brain scenarios in a 16-agent Node.js meta-agent factory, with emphasis on automated recovery and minimal data loss.

**Key Principles**:
- **Prevention First**: Multiple layers of split-brain prevention
- **Automatic Recovery**: Minimal manual intervention required
- **Data Integrity**: Zero data loss for critical operations
- **Observable Process**: Full audit trails and monitoring
- **Graceful Degradation**: System remains partially operational during recovery

---

## ⚔️ **Conflict Resolution Algorithms**

### **1. Last-Write-Wins with Vector Clocks**

**Enhanced LWW implementation using vector clocks for causality tracking:**

```typescript
import { Redis } from 'ioredis';
import { createHash } from 'crypto';

interface VectorClock {
  [nodeId: string]: number;
}

interface VersionedData<T> {
  data: T;
  clock: VectorClock;
  timestamp: number;
  nodeId: string;
  hash: string;
}

export class VectorClockLWW<T> {
  private redis: Redis;
  private nodeId: string;
  private clock: VectorClock = {};

  constructor(redis: Redis, nodeId: string) {
    this.redis = redis;
    this.nodeId = nodeId;
    this.initializeClock();
  }

  private initializeClock(): void {
    this.clock[this.nodeId] = 0;
  }

  private incrementClock(): void {
    this.clock[this.nodeId] = (this.clock[this.nodeId] || 0) + 1;
  }

  private mergeClocks(other: VectorClock): void {
    for (const [nodeId, timestamp] of Object.entries(other)) {
      this.clock[nodeId] = Math.max(
        this.clock[nodeId] || 0,
        timestamp
      );
    }
  }

  private compareClocks(a: VectorClock, b: VectorClock): number {
    let aGreater = false;
    let bGreater = false;

    const allNodes = new Set([
      ...Object.keys(a),
      ...Object.keys(b)
    ]);

    for (const nodeId of allNodes) {
      const aTime = a[nodeId] || 0;
      const bTime = b[nodeId] || 0;

      if (aTime > bTime) aGreater = true;
      if (bTime > aTime) bGreater = true;
    }

    if (aGreater && !bGreater) return 1;  // a happened after b
    if (bGreater && !aGreater) return -1; // b happened after a
    return 0; // concurrent
  }

  async write(key: string, data: T): Promise<void> {
    this.incrementClock();
    
    const versioned: VersionedData<T> = {
      data,
      clock: { ...this.clock },
      timestamp: Date.now(),
      nodeId: this.nodeId,
      hash: this.computeHash(data)
    };

    await this.redis.set(
      key,
      JSON.stringify(versioned),
      'EX',
      86400 // 24 hour TTL
    );

    // Publish update for other nodes
    await this.redis.publish('data:updated', JSON.stringify({
      key,
      nodeId: this.nodeId,
      clock: this.clock
    }));
  }

  async read(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;

    const versioned: VersionedData<T> = JSON.parse(raw);
    this.mergeClocks(versioned.clock);
    
    return versioned.data;
  }

  async resolve(key: string, versions: VersionedData<T>[]): Promise<T> {
    if (versions.length === 0) {
      throw new Error('No versions to resolve');
    }

    if (versions.length === 1) {
      return versions[0].data;
    }

    // Sort by vector clock ordering
    versions.sort((a, b) => {
      const clockComparison = this.compareClocks(a.clock, b.clock);
      
      if (clockComparison !== 0) {
        return clockComparison;
      }

      // Concurrent writes - use deterministic tie-breaking
      // 1. Prefer higher timestamp
      if (a.timestamp !== b.timestamp) {
        return b.timestamp - a.timestamp;
      }

      // 2. Use node ID for final tie-breaking (deterministic)
      return b.nodeId.localeCompare(a.nodeId);
    });

    const winner = versions[0];
    
    // Log conflict resolution
    await this.logConflictResolution(key, versions, winner);
    
    return winner.data;
  }

  private computeHash(data: T): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private async logConflictResolution(
    key: string,
    versions: VersionedData<T>[],
    winner: VersionedData<T>
  ): Promise<void> {
    const conflictLog = {
      timestamp: new Date().toISOString(),
      key,
      conflictType: 'concurrent_write',
      algorithm: 'vector_clock_lww',
      versions: versions.map(v => ({
        nodeId: v.nodeId,
        clock: v.clock,
        timestamp: v.timestamp,
        hash: v.hash
      })),
      winner: {
        nodeId: winner.nodeId,
        clock: winner.clock,
        reason: 'vector_clock_ordering'
      }
    };

    await this.redis.xadd(
      'conflict:log',
      '*',
      'data',
      JSON.stringify(conflictLog)
    );
  }
}
```

### **2. Operational Transformation (OT)**

**ShareDB integration for collaborative editing with automatic conflict resolution:**

```typescript
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import { Redis } from 'ioredis';

interface OTDocument {
  id: string;
  type: string;
  data: any;
  version: number;
}

export class OperationalTransformEngine {
  private backend: ShareDB;
  private redis: Redis;
  private wsServer: WebSocket.Server;
  
  constructor(redis: Redis, port: number = 8080) {
    this.redis = redis;
    this.backend = new ShareDB({
      presence: true,
      doNotForwardSendPresenceErrorsToClient: true
    });
    
    this.setupWebSocketServer(port);
    this.setupRedisAdapter();
  }

  private setupWebSocketServer(port: number): void {
    this.wsServer = new WebSocket.Server({ port });
    
    this.wsServer.on('connection', (ws) => {
      const stream = new ShareDB.Stream();
      
      stream.on('data', (data) => {
        ws.send(JSON.stringify(data));
      });
      
      ws.on('message', (msg) => {
        try {
          stream.write(JSON.parse(msg.toString()));
        } catch (err) {
          console.error('Invalid message:', err);
        }
      });
      
      ws.on('close', () => {
        stream.end();
      });
      
      this.backend.listen(stream);
    });
  }

  private setupRedisAdapter(): void {
    // Custom Redis adapter for ShareDB persistence
    const redisAdapter = {
      commit: async (
        collection: string,
        id: string,
        op: any,
        snapshot: any,
        options: any,
        callback: Function
      ) => {
        try {
          const key = `ot:${collection}:${id}`;
          
          // Store operation in Redis stream for history
          await this.redis.xadd(
            `ot:ops:${collection}:${id}`,
            '*',
            'op',
            JSON.stringify(op),
            'version',
            snapshot.v.toString()
          );
          
          // Store current snapshot
          await this.redis.set(
            key,
            JSON.stringify(snapshot),
            'EX',
            86400 * 7 // 7 days
          );
          
          callback(null, true);
        } catch (err) {
          callback(err);
        }
      },
      
      getSnapshot: async (
        collection: string,
        id: string,
        fields: any,
        options: any,
        callback: Function
      ) => {
        try {
          const key = `ot:${collection}:${id}`;
          const data = await this.redis.get(key);
          
          if (!data) {
            callback(null, null);
            return;
          }
          
          callback(null, JSON.parse(data));
        } catch (err) {
          callback(err);
        }
      }
    };
    
    this.backend.db = redisAdapter as any;
  }

  async createDocument(
    collection: string,
    id: string,
    initialData: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const connection = this.backend.connect();
      const doc = connection.get(collection, id);
      
      doc.fetch((err) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (doc.type === null) {
          doc.create(initialData, 'json0', (err) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  async applyOperation(
    collection: string,
    id: string,
    operation: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const connection = this.backend.connect();
      const doc = connection.get(collection, id);
      
      doc.fetch((err) => {
        if (err) {
          reject(err);
          return;
        }
        
        doc.submitOp(operation, (err) => {
          if (err) {
            if (err.code === 'ERR_OP_VERSION_MISMATCH') {
              // Automatic transformation and retry
              this.handleVersionMismatch(doc, operation)
                .then(resolve)
                .catch(reject);
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        });
      });
    });
  }

  private async handleVersionMismatch(
    doc: any,
    operation: any
  ): Promise<void> {
    // ShareDB automatically transforms the operation
    // against concurrent operations
    return new Promise((resolve, reject) => {
      doc.submitOp(operation, { retry: true }, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getDocument(
    collection: string,
    id: string
  ): Promise<OTDocument | null> {
    const key = `ot:${collection}:${id}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    const snapshot = JSON.parse(data);
    return {
      id,
      type: snapshot.type,
      data: snapshot.data,
      version: snapshot.v
    };
  }

  // Conflict resolution for complex operations
  async resolveConflict(
    collection: string,
    id: string,
    localOps: any[],
    remoteOps: any[]
  ): Promise<any[]> {
    const transformedOps: any[] = [];
    
    // Transform local operations against remote operations
    for (const localOp of localOps) {
      let transformed = localOp;
      
      for (const remoteOp of remoteOps) {
        transformed = this.transformOperation(
          transformed,
          remoteOp,
          'left' // local takes precedence
        );
      }
      
      transformedOps.push(transformed);
    }
    
    return transformedOps;
  }

  private transformOperation(
    op1: any,
    op2: any,
    priority: 'left' | 'right'
  ): any {
    // JSON0 OT transformation logic
    // This is a simplified version - real implementation
    // would use the full JSON0 transformation rules
    
    if (!op1 || !op2) return op1;
    
    // Path-based conflict detection
    const path1 = op1.p || [];
    const path2 = op2.p || [];
    
    // No conflict if paths don't overlap
    if (!this.pathsOverlap(path1, path2)) {
      return op1;
    }
    
    // Apply transformation based on operation types
    if (op1.si !== undefined && op2.si !== undefined) {
      // String insert conflict
      if (path1.join('.') === path2.join('.')) {
        const index1 = path1[path1.length - 1];
        const index2 = path2[path2.length - 1];
        
        if (index1 === index2) {
          // Same position - use priority
          if (priority === 'left') {
            return op1;
          } else {
            // Adjust index
            op1.p[op1.p.length - 1] += op2.si.length;
            return op1;
          }
        }
      }
    }
    
    return op1;
  }

  private pathsOverlap(path1: any[], path2: any[]): boolean {
    const minLength = Math.min(path1.length, path2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (path1[i] !== path2[i]) {
        return false;
      }
    }
    
    return true;
  }
}
```

### **3. Conflict-free Replicated Data Types (CRDTs)**

**Automerge implementation for automatic conflict resolution:**

```typescript
import Automerge from 'automerge';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface CRDTNode {
  nodeId: string;
  doc: Automerge.Doc<any>;
  clock: Map<string, number>;
}

export class CRDTManager extends EventEmitter {
  private redis: Redis;
  private nodeId: string;
  private documents: Map<string, Automerge.Doc<any>> = new Map();
  private syncProtocol: Map<string, Automerge.SyncState> = new Map();

  constructor(redis: Redis, nodeId: string) {
    super();
    this.redis = redis;
    this.nodeId = nodeId;
    this.setupRedisSubscriptions();
  }

  private setupRedisSubscriptions(): void {
    const subscriber = this.redis.duplicate();
    
    subscriber.subscribe('crdt:sync:request', 'crdt:sync:response');
    
    subscriber.on('message', async (channel, message) => {
      const data = JSON.parse(message);
      
      if (data.nodeId === this.nodeId) return; // Ignore own messages
      
      switch (channel) {
        case 'crdt:sync:request':
          await this.handleSyncRequest(data);
          break;
        case 'crdt:sync:response':
          await this.handleSyncResponse(data);
          break;
      }
    });
  }

  createDocument<T>(docId: string, initialData: T): Automerge.Doc<T> {
    let doc = Automerge.from<T>(initialData);
    
    // Add metadata
    doc = Automerge.change(doc, d => {
      (d as any)._meta = {
        createdBy: this.nodeId,
        createdAt: Date.now(),
        lastModified: Date.now()
      };
    });
    
    this.documents.set(docId, doc);
    this.syncProtocol.set(docId, Automerge.initSyncState());
    
    return doc;
  }

  updateDocument<T>(
    docId: string,
    updater: (doc: T) => void
  ): Automerge.Doc<T> | null {
    const doc = this.documents.get(docId);
    if (!doc) return null;
    
    const newDoc = Automerge.change(doc, d => {
      updater(d);
      (d as any)._meta.lastModified = Date.now();
      (d as any)._meta.lastModifiedBy = this.nodeId;
    });
    
    this.documents.set(docId, newDoc);
    
    // Broadcast changes
    this.broadcastSync(docId);
    
    return newDoc;
  }

  async mergeDocuments<T>(
    docId: string,
    remoteDocs: Uint8Array[]
  ): Promise<Automerge.Doc<T>> {
    let doc = this.documents.get(docId) || Automerge.init<T>();
    
    for (const remoteDoc of remoteDocs) {
      try {
        const [merged] = Automerge.applyChanges(
          doc,
          [new Uint8Array(remoteDoc)]
        );
        doc = merged;
        
        // Log successful merge
        await this.logMerge(docId, 'success', {
          localVersion: Automerge.getHistory(doc).length,
          changesApplied: 1
        });
      } catch (err) {
        // Log merge failure
        await this.logMerge(docId, 'failure', {
          error: err.message,
          docSize: remoteDoc.length
        });
      }
    }
    
    this.documents.set(docId, doc);
    return doc;
  }

  // Advanced conflict resolution with custom merge strategies
  async resolveConflictWithStrategy<T>(
    docId: string,
    strategy: 'union' | 'intersection' | 'custom',
    customResolver?: (a: T, b: T) => T
  ): Promise<Automerge.Doc<T>> {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error('Document not found');
    
    const conflicts = Automerge.getConflicts(doc, '_root');
    
    if (!conflicts || Object.keys(conflicts).length === 0) {
      return doc;
    }
    
    let resolved = doc;
    
    for (const [field, values] of Object.entries(conflicts)) {
      switch (strategy) {
        case 'union':
          // Merge arrays, combine objects
          resolved = Automerge.change(resolved, d => {
            if (Array.isArray(values)) {
              (d as any)[field] = [...new Set(values.flat())];
            } else if (typeof values[0] === 'object') {
              (d as any)[field] = Object.assign({}, ...values);
            }
          });
          break;
          
        case 'intersection':
          // Keep only common elements
          resolved = Automerge.change(resolved, d => {
            if (Array.isArray(values)) {
              const sets = values.map(v => new Set(v));
              const intersection = sets.reduce((a, b) => 
                new Set([...a].filter(x => b.has(x)))
              );
              (d as any)[field] = [...intersection];
            }
          });
          break;
          
        case 'custom':
          if (customResolver) {
            resolved = Automerge.change(resolved, d => {
              (d as any)[field] = customResolver(
                values[0],
                values[1]
              );
            });
          }
          break;
      }
    }
    
    this.documents.set(docId, resolved);
    return resolved;
  }

  private async broadcastSync(docId: string): Promise<void> {
    const doc = this.documents.get(docId);
    if (!doc) return;
    
    const syncState = this.syncProtocol.get(docId);
    if (!syncState) return;
    
    const [newSyncState, syncMessage] = Automerge.generateSyncMessage(
      doc,
      syncState
    );
    
    if (syncMessage) {
      await this.redis.publish('crdt:sync:request', JSON.stringify({
        nodeId: this.nodeId,
        docId,
        syncMessage: Array.from(syncMessage),
        timestamp: Date.now()
      }));
      
      this.syncProtocol.set(docId, newSyncState);
    }
  }

  private async handleSyncRequest(data: any): Promise<void> {
    const { docId, syncMessage } = data;
    const doc = this.documents.get(docId);
    
    if (!doc) {
      // Create new document from sync
      const newDoc = Automerge.init();
      const [merged] = Automerge.applyChanges(
        newDoc,
        [new Uint8Array(syncMessage)]
      );
      this.documents.set(docId, merged);
      return;
    }
    
    const syncState = this.syncProtocol.get(docId) || 
                     Automerge.initSyncState();
    
    const [newDoc, newSyncState] = Automerge.receiveSyncMessage(
      doc,
      syncState,
      new Uint8Array(syncMessage)
    );
    
    this.documents.set(docId, newDoc);
    this.syncProtocol.set(docId, newSyncState);
    
    // Send response
    const [, responseMessage] = Automerge.generateSyncMessage(
      newDoc,
      newSyncState
    );
    
    if (responseMessage) {
      await this.redis.publish('crdt:sync:response', JSON.stringify({
        nodeId: this.nodeId,
        docId,
        syncMessage: Array.from(responseMessage),
        timestamp: Date.now()
      }));
    }
  }

  private async handleSyncResponse(data: any): Promise<void> {
    await this.handleSyncRequest(data); // Same logic
  }

  private async logMerge(
    docId: string,
    status: 'success' | 'failure',
    details: any
  ): Promise<void> {
    await this.redis.xadd(
      'crdt:merge:log',
      '*',
      'docId',
      docId,
      'nodeId',
      this.nodeId,
      'status',
      status,
      'details',
      JSON.stringify(details),
      'timestamp',
      Date.now().toString()
    );
  }

  // Get conflict-free value
  getValue<T>(docId: string): T | null {
    const doc = this.documents.get(docId);
    return doc ? doc : null;
  }

  // Get merge history
  async getMergeHistory(docId: string): Promise<any[]> {
    const doc = this.documents.get(docId);
    if (!doc) return [];
    
    return Automerge.getHistory(doc).map(change => ({
      actor: change.actor,
      seq: change.seq,
      timestamp: change.time,
      message: change.message,
      dependencies: change.deps
    }));
  }
}
```

---

## 🔄 **Automated Reconciliation Workflows**

### **Redis Streams-Based Event Sourcing**

```typescript
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface ReconciliationEvent {
  id: string;
  type: 'state_change' | 'conflict_detected' | 'reconciliation_complete';
  agentId: string;
  timestamp: number;
  data: any;
  metadata: {
    partition?: string;
    conflictType?: string;
    resolution?: string;
  };
}

export class AutomatedReconciliationEngine extends EventEmitter {
  private redis: Redis;
  private reconciliationStream = 'reconciliation:events';
  private consumerGroup = 'reconciliation-engine';
  private consumerId: string;
  private processing = false;

  constructor(redis: Redis, consumerId: string) {
    super();
    this.redis = redis;
    this.consumerId = consumerId;
    this.initializeStream();
  }

  private async initializeStream(): Promise<void> {
    try {
      await this.redis.xgroup(
        'CREATE',
        this.reconciliationStream,
        this.consumerGroup,
        '$',
        'MKSTREAM'
      );
    } catch (err) {
      // Group already exists
    }
  }

  async start(): Promise<void> {
    this.processing = true;
    this.processEvents();
  }

  async stop(): Promise<void> {
    this.processing = false;
  }

  private async processEvents(): Promise<void> {
    while (this.processing) {
      try {
        const events = await this.redis.xreadgroup(
          'GROUP',
          this.consumerGroup,
          this.consumerId,
          'BLOCK',
          1000,
          'COUNT',
          10,
          'STREAMS',
          this.reconciliationStream,
          '>'
        );

        if (events && events.length > 0) {
          const [, messages] = events[0];
          
          for (const [id, fields] of messages) {
            await this.handleEvent(id, fields);
          }
        }
      } catch (err) {
        console.error('Event processing error:', err);
        await this.sleep(1000);
      }
    }
  }

  private async handleEvent(
    eventId: string,
    fields: string[]
  ): Promise<void> {
    try {
      const event = this.parseEvent(fields);
      
      switch (event.type) {
        case 'conflict_detected':
          await this.reconcileConflict(event);
          break;
        case 'state_change':
          await this.validateStateChange(event);
          break;
        case 'reconciliation_complete':
          await this.finalizeReconciliation(event);
          break;
      }
      
      // Acknowledge event
      await this.redis.xack(
        this.reconciliationStream,
        this.consumerGroup,
        eventId
      );
    } catch (err) {
      console.error(`Failed to process event ${eventId}:`, err);
      
      // Re-queue for retry
      await this.requeueEvent(eventId);
    }
  }

  private async reconcileConflict(
    event: ReconciliationEvent
  ): Promise<void> {
    const { agentId, data, metadata } = event;
    
    // Determine reconciliation strategy
    const strategy = this.selectStrategy(metadata.conflictType);
    
    // Fetch conflicting states
    const states = await this.fetchConflictingStates(agentId);
    
    // Apply reconciliation
    const reconciledState = await this.applyStrategy(
      strategy,
      states,
      data
    );
    
    // Update state
    await this.updateAgentState(agentId, reconciledState);
    
    // Emit reconciliation complete event
    await this.emitReconciliationComplete(
      agentId,
      strategy,
      reconciledState
    );
  }

  private selectStrategy(conflictType?: string): string {
    const strategies = {
      'concurrent_update': 'vector_clock_lww',
      'partition_merge': 'crdt_merge',
      'leadership_conflict': 'quorum_based',
      'data_divergence': 'operational_transform'
    };
    
    return strategies[conflictType || 'concurrent_update'] || 
           'vector_clock_lww';
  }

  private async fetchConflictingStates(
    agentId: string
  ): Promise<any[]> {
    const pattern = `agent:${agentId}:state:*`;
    const keys = await this.redis.keys(pattern);
    
    const states = await Promise.all(
      keys.map(async key => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    
    return states.filter(Boolean);
  }

  private async applyStrategy(
    strategy: string,
    states: any[],
    eventData: any
  ): Promise<any> {
    switch (strategy) {
      case 'vector_clock_lww':
        const vcManager = new VectorClockLWW(
          this.redis,
          this.consumerId
        );
        return vcManager.resolve('temp', states);
        
      case 'crdt_merge':
        const crdtManager = new CRDTManager(
          this.redis,
          this.consumerId
        );
        return crdtManager.mergeDocuments(
          'temp',
          states.map(s => s.crdtData)
        );
        
      case 'quorum_based':
        return this.quorumBasedResolution(states);
        
      case 'operational_transform':
        const otEngine = new OperationalTransformEngine(
          this.redis
        );
        return otEngine.resolveConflict(
          'agents',
          eventData.agentId,
          states[0].operations,
          states[1].operations
        );
        
      default:
        // Fallback to simple LWW
        return states.reduce((latest, state) => 
          state.timestamp > latest.timestamp ? state : latest
        );
    }
  }

  private async quorumBasedResolution(states: any[]): Promise<any> {
    // Group states by value
    const stateGroups = new Map<string, any[]>();
    
    for (const state of states) {
      const key = JSON.stringify(state.data);
      const group = stateGroups.get(key) || [];
      group.push(state);
      stateGroups.set(key, group);
    }
    
    // Find majority
    let majorityState = null;
    let maxCount = 0;
    
    for (const [, group] of stateGroups) {
      if (group.length > maxCount) {
        maxCount = group.length;
        majorityState = group[0];
      }
    }
    
    // Require strict majority
    const quorumSize = Math.floor(states.length / 2) + 1;
    
    if (maxCount >= quorumSize) {
      return majorityState;
    }
    
    // No majority - use latest timestamp
    return states.reduce((latest, state) => 
      state.timestamp > latest.timestamp ? state : latest
    );
  }

  private async updateAgentState(
    agentId: string,
    state: any
  ): Promise<void> {
    const key = `agent:${agentId}:state:reconciled`;
    
    await this.redis.set(
      key,
      JSON.stringify({
        ...state,
        reconciledAt: Date.now(),
        reconciledBy: this.consumerId
      }),
      'EX',
      3600 // 1 hour TTL
    );
    
    // Clear conflicting states
    const pattern = `agent:${agentId}:state:*`;
    const keys = await this.redis.keys(pattern);
    
    for (const k of keys) {
      if (k !== key) {
        await this.redis.del(k);
      }
    }
  }

  private async emitReconciliationComplete(
    agentId: string,
    strategy: string,
    state: any
  ): Promise<void> {
    const event: ReconciliationEvent = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'reconciliation_complete',
      agentId,
      timestamp: Date.now(),
      data: state,
      metadata: {
        resolution: strategy
      }
    };
    
    await this.redis.xadd(
      this.reconciliationStream,
      '*',
      ...this.flattenEvent(event)
    );
    
    this.emit('reconciliationComplete', event);
  }

  private parseEvent(fields: string[]): ReconciliationEvent {
    const obj: any = {};
    
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      
      if (key === 'data' || key === 'metadata') {
        obj[key] = JSON.parse(value);
      } else {
        obj[key] = value;
      }
    }
    
    return obj as ReconciliationEvent;
  }

  private flattenEvent(event: ReconciliationEvent): string[] {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(event)) {
      if (typeof value === 'object') {
        fields.push(key, JSON.stringify(value));
      } else {
        fields.push(key, String(value));
      }
    }
    
    return fields;
  }

  private async validateStateChange(
    event: ReconciliationEvent
  ): Promise<void> {
    // Implement state validation logic
    const isValid = await this.validateState(event.data);
    
    if (!isValid) {
      await this.emitValidationFailure(event);
    }
  }

  private async validateState(state: any): Promise<boolean> {
    // Custom validation rules
    if (!state || typeof state !== 'object') {
      return false;
    }
    
    // Check required fields
    const requiredFields = ['agentId', 'version', 'data'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        return false;
      }
    }
    
    // Version must be positive
    if (state.version < 0) {
      return false;
    }
    
    return true;
  }

  private async finalizeReconciliation(
    event: ReconciliationEvent
  ): Promise<void> {
    // Clean up temporary data
    const pattern = `reconciliation:temp:${event.agentId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    
    // Update metrics
    await this.updateReconciliationMetrics(event);
  }

  private async updateReconciliationMetrics(
    event: ReconciliationEvent
  ): Promise<void> {
    const metrics = {
      timestamp: Date.now(),
      agentId: event.agentId,
      strategy: event.metadata.resolution,
      duration: Date.now() - event.timestamp,
      success: true
    };
    
    await this.redis.xadd(
      'metrics:reconciliation',
      '*',
      ...Object.entries(metrics).flat()
    );
  }

  private async emitValidationFailure(
    event: ReconciliationEvent
  ): Promise<void> {
    this.emit('validationFailure', {
      event,
      reason: 'State validation failed',
      timestamp: Date.now()
    });
  }

  private async requeueEvent(eventId: string): Promise<void> {
    // Move to pending list for retry
    await this.redis.xadd(
      'reconciliation:retry',
      '*',
      'originalId',
      eventId,
      'retryCount',
      '1',
      'timestamp',
      Date.now().toString()
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🛡️ **Safe Agent Rejoining Protocols**

### **Quarantine and Progressive Reintroduction**

```typescript
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

enum AgentQuarantineState {
  DISCONNECTED = 'disconnected',
  QUARANTINED = 'quarantined',
  VALIDATING = 'validating',
  RESTRICTED = 'restricted',
  OPERATIONAL = 'operational'
}

interface QuarantineConfig {
  quarantineDuration: number;
  validationStages: number;
  progressiveCapabilities: string[][];
  healthCheckInterval: number;
  syncTimeout: number;
}

export class SafeAgentRejoiningProtocol extends EventEmitter {
  private redis: Redis;
  private config: QuarantineConfig;
  private agentStates: Map<string, AgentQuarantineState> = new Map();
  private fencingTokens: Map<string, string> = new Map();

  constructor(redis: Redis, config?: Partial<QuarantineConfig>) {
    super();
    this.redis = redis;
    
    this.config = {
      quarantineDuration: 30000, // 30 seconds
      validationStages: 3,
      progressiveCapabilities: [
        ['read'],                           // Stage 1: Read-only
        ['read', 'write_non_critical'],     // Stage 2: Non-critical writes
        ['read', 'write', 'coordinate']     // Stage 3: Full capabilities
      ],
      healthCheckInterval: 5000,
      syncTimeout: 10000,
      ...config
    };
  }

  async handleAgentReconnection(
    agentId: string,
    lastSeen: number,
    currentState: any
  ): Promise<void> {
    // Check if agent was part of a partition
    const partitionDuration = Date.now() - lastSeen;
    const wasPartitioned = partitionDuration > 10000; // 10 seconds
    
    if (wasPartitioned) {
      await this.quarantineAgent(agentId, partitionDuration);
    } else {
      await this.fastTrackRejoining(agentId);
    }
  }

  private async quarantineAgent(
    agentId: string,
    partitionDuration: number
  ): Promise<void> {
    console.log(`Quarantining agent ${agentId} after ${partitionDuration}ms partition`);
    
    // Set quarantine state
    this.agentStates.set(agentId, AgentQuarantineState.QUARANTINED);
    
    // Generate new fencing token
    const fencingToken = this.generateFencingToken(agentId);
    this.fencingTokens.set(agentId, fencingToken);
    
    // Store quarantine info in Redis
    await this.redis.hset(`agent:${agentId}:quarantine`, {
      state: AgentQuarantineState.QUARANTINED,
      startTime: Date.now(),
      partitionDuration,
      fencingToken,
      stage: 0
    });
    
    // Start quarantine process
    this.startQuarantineProcess(agentId);
  }

  private async startQuarantineProcess(agentId: string): Promise<void> {
    // Stage 1: Initial quarantine
    await this.sleep(this.config.quarantineDuration);
    
    // Stage 2: State validation
    const isValid = await this.validateAgentState(agentId);
    if (!isValid) {
      await this.handleInvalidState(agentId);
      return;
    }
    
    // Stage 3: Progressive capability restoration
    await this.progressiveReintroduction(agentId);
  }

  private async validateAgentState(agentId: string): Promise<boolean> {
    this.agentStates.set(agentId, AgentQuarantineState.VALIDATING);
    
    try {
      // 1. Fetch agent's current state
      const agentState = await this.redis.hgetall(`agent:${agentId}:state`);
      
      // 2. Fetch cluster consensus state
      const consensusState = await this.getConsensusState();
      
      // 3. Check for conflicts
      const conflicts = await this.detectStateConflicts(
        agentState,
        consensusState
      );
      
      if (conflicts.length > 0) {
        // 4. Attempt automatic reconciliation
        const reconciled = await this.reconcileState(
          agentId,
          agentState,
          consensusState,
          conflicts
        );
        
        if (!reconciled) {
          return false;
        }
      }
      
      // 5. Verify data integrity
      const integrityCheck = await this.verifyDataIntegrity(agentId);
      
      return integrityCheck;
    } catch (err) {
      console.error(`Validation failed for agent ${agentId}:`, err);
      return false;
    }
  }

  private async progressiveReintroduction(agentId: string): Promise<void> {
    const stages = this.config.progressiveCapabilities;
    
    for (let stage = 0; stage < stages.length; stage++) {
      this.agentStates.set(agentId, AgentQuarantineState.RESTRICTED);
      
      // Grant capabilities for this stage
      const capabilities = stages[stage];
      await this.grantCapabilities(agentId, capabilities);
      
      // Monitor for issues
      const monitoring = this.monitorAgent(agentId, 10000); // 10s per stage
      
      const issues = await monitoring;
      if (issues.length > 0) {
        console.error(`Issues detected in stage ${stage}:`, issues);
        await this.rollbackToQuarantine(agentId);
        return;
      }
      
      // Update progress
      await this.redis.hset(`agent:${agentId}:quarantine`, {
        stage: stage + 1,
        lastStageCompletion: Date.now()
      });
      
      this.emit('stageCompleted', { agentId, stage });
    }
    
    // Full reintegration
    await this.fullyReintegrateAgent(agentId);
  }

  private async grantCapabilities(
    agentId: string,
    capabilities: string[]
  ): Promise<void> {
    const token = this.fencingTokens.get(agentId);
    
    await this.redis.hset(`agent:${agentId}:capabilities`, {
      allowed: JSON.stringify(capabilities),
      fencingToken: token,
      grantedAt: Date.now()
    });
    
    // Publish capability update
    await this.redis.publish('agent:capabilities:updated', JSON.stringify({
      agentId,
      capabilities,
      token
    }));
  }

  private async monitorAgent(
    agentId: string,
    duration: number
  ): Promise<string[]> {
    const issues: string[] = [];
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          // Check for unauthorized operations
          const unauthorized = await this.checkUnauthorizedOps(agentId);
          if (unauthorized.length > 0) {
            issues.push(...unauthorized.map(op => `Unauthorized: ${op}`));
          }
          
          // Check for state divergence
          const divergence = await this.checkStateDivergence(agentId);
          if (divergence > 0.1) { // 10% divergence threshold
            issues.push(`State divergence: ${(divergence * 100).toFixed(2)}%`);
          }
          
          // Check health metrics
          const health = await this.checkAgentHealth(agentId);
          if (health.errorRate > 0.05) { // 5% error threshold
            issues.push(`High error rate: ${(health.errorRate * 100).toFixed(2)}%`);
          }
          
          if (Date.now() - startTime >= duration || issues.length > 0) {
            clearInterval(interval);
            resolve(issues);
          }
        } catch (err) {
          issues.push(`Monitoring error: ${err.message}`);
          clearInterval(interval);
          resolve(issues);
        }
      }, this.config.healthCheckInterval);
    });
  }

  private async checkUnauthorizedOps(agentId: string): Promise<string[]> {
    const key = `agent:${agentId}:operations`;
    const ops = await this.redis.lrange(key, 0, -1);
    
    const capabilities = await this.redis.hget(
      `agent:${agentId}:capabilities`,
      'allowed'
    );
    
    const allowed = capabilities ? JSON.parse(capabilities) : [];
    const unauthorized: string[] = [];
    
    for (const op of ops) {
      const operation = JSON.parse(op);
      if (!this.isOperationAllowed(operation, allowed)) {
        unauthorized.push(operation.type);
      }
    }
    
    return unauthorized;
  }

  private isOperationAllowed(
    operation: any,
    capabilities: string[]
  ): boolean {
    const opTypeMap: Record<string, string> = {
      'get': 'read',
      'set': 'write',
      'del': 'write',
      'publish': 'coordinate',
      'subscribe': 'read'
    };
    
    const requiredCapability = opTypeMap[operation.type] || 'write';
    return capabilities.includes(requiredCapability);
  }

  private async checkStateDivergence(agentId: string): Promise<number> {
    const agentState = await this.redis.hgetall(`agent:${agentId}:state`);
    const consensusState = await this.getConsensusState();
    
    let differences = 0;
    let total = 0;
    
    for (const [key, value] of Object.entries(consensusState)) {
      total++;
      if (agentState[key] !== value) {
        differences++;
      }
    }
    
    return total > 0 ? differences / total : 0;
  }

  private async checkAgentHealth(agentId: string): Promise<any> {
    const metrics = await this.redis.hgetall(`agent:${agentId}:metrics`);
    
    return {
      errorRate: parseFloat(metrics.errorRate || '0'),
      responseTime: parseFloat(metrics.responseTime || '0'),
      successRate: parseFloat(metrics.successRate || '1')
    };
  }

  private async fullyReintegrateAgent(agentId: string): Promise<void> {
    console.log(`Fully reintegrating agent ${agentId}`);
    
    // Update state
    this.agentStates.set(agentId, AgentQuarantineState.OPERATIONAL);
    
    // Grant full capabilities
    await this.redis.hset(`agent:${agentId}:capabilities`, {
      allowed: JSON.stringify(['read', 'write', 'coordinate', 'admin']),
      fencingToken: this.fencingTokens.get(agentId),
      grantedAt: Date.now()
    });
    
    // Remove quarantine data
    await this.redis.del(`agent:${agentId}:quarantine`);
    
    // Publish reintegration event
    await this.redis.publish('agent:reintegrated', JSON.stringify({
      agentId,
      timestamp: Date.now(),
      capabilities: 'full'
    }));
    
    this.emit('agentReintegrated', { agentId });
  }

  private async rollbackToQuarantine(agentId: string): Promise<void> {
    console.log(`Rolling back agent ${agentId} to quarantine`);
    
    // Revoke all capabilities
    await this.redis.hset(`agent:${agentId}:capabilities`, {
      allowed: JSON.stringify([]),
      revoked: Date.now()
    });
    
    // Reset to quarantine state
    this.agentStates.set(agentId, AgentQuarantineState.QUARANTINED);
    
    // Schedule retry
    setTimeout(() => {
      this.startQuarantineProcess(agentId);
    }, this.config.quarantineDuration * 2); // Double quarantine time
  }

  private async fastTrackRejoining(agentId: string): Promise<void> {
    // Quick validation for brief disconnections
    const isValid = await this.validateAgentState(agentId);
    
    if (isValid) {
      await this.fullyReintegrateAgent(agentId);
    } else {
      await this.quarantineAgent(agentId, 0);
    }
  }

  private generateFencingToken(agentId: string): string {
    const epoch = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${agentId}-${epoch}-${random}`;
  }

  private async getConsensusState(): Promise<any> {
    // Implement consensus state retrieval
    // This would typically involve querying multiple agents
    // and determining the majority state
    
    const states = await this.redis.keys('agent:*:state');
    const stateData: any[] = [];
    
    for (const key of states) {
      const data = await this.redis.hgetall(key);
      stateData.push(data);
    }
    
    // Simple majority consensus
    return this.calculateMajorityState(stateData);
  }

  private calculateMajorityState(states: any[]): any {
    const stateMap = new Map<string, number>();
    
    for (const state of states) {
      const key = JSON.stringify(state);
      stateMap.set(key, (stateMap.get(key) || 0) + 1);
    }
    
    let majorityState = null;
    let maxCount = 0;
    
    for (const [stateStr, count] of stateMap) {
      if (count > maxCount) {
        maxCount = count;
        majorityState = JSON.parse(stateStr);
      }
    }
    
    return majorityState || {};
  }

  private async detectStateConflicts(
    agentState: any,
    consensusState: any
  ): Promise<string[]> {
    const conflicts: string[] = [];
    
    for (const [key, value] of Object.entries(consensusState)) {
      if (agentState[key] && agentState[key] !== value) {
        conflicts.push(key);
      }
    }
    
    return conflicts;
  }

  private async reconcileState(
    agentId: string,
    agentState: any,
    consensusState: any,
    conflicts: string[]
  ): Promise<boolean> {
    try {
      const reconciled: any = { ...agentState };
      
      for (const conflict of conflicts) {
        // Use consensus value for conflicts
        reconciled[conflict] = consensusState[conflict];
      }
      
      // Update agent state
      await this.redis.hmset(`agent:${agentId}:state`, reconciled);
      
      return true;
    } catch (err) {
      console.error('Reconciliation failed:', err);
      return false;
    }
  }

  private async verifyDataIntegrity(agentId: string): Promise<boolean> {
    try {
      // Check for data corruption
      const state = await this.redis.hgetall(`agent:${agentId}:state`);
      
      // Verify required fields
      const requiredFields = ['version', 'lastUpdate', 'checksum'];
      for (const field of requiredFields) {
        if (!state[field]) {
          return false;
        }
      }
      
      // Verify checksum
      const computedChecksum = this.computeStateChecksum(state);
      return computedChecksum === state.checksum;
    } catch (err) {
      return false;
    }
  }

  private computeStateChecksum(state: any): string {
    const { checksum, ...data } = state;
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private async handleInvalidState(agentId: string): Promise<void> {
    console.error(`Agent ${agentId} has invalid state, requiring manual intervention`);
    
    // Mark for manual review
    await this.redis.hset(`agent:${agentId}:quarantine`, {
      state: 'manual_review_required',
      reason: 'State validation failed',
      timestamp: Date.now()
    });
    
    this.emit('manualInterventionRequired', { agentId });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🔧 **State Reconciliation Patterns**

### **Multi-Strategy Reconciliation Engine**

```typescript
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

interface ReconciliationStrategy {
  name: string;
  priority: number;
  applicableTo: string[];
  reconcile: (conflicts: any[]) => Promise<any>;
}

export class StateReconciliationEngine extends EventEmitter {
  private redis: Redis;
  private strategies: Map<string, ReconciliationStrategy> = new Map();

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    // Last-Write-Wins Strategy
    this.registerStrategy({
      name: 'last-write-wins',
      priority: 1,
      applicableTo: ['simple_value', 'counter', 'flag'],
      reconcile: async (conflicts) => {
        return conflicts.reduce((latest, current) => 
          current.timestamp > latest.timestamp ? current : latest
        );
      }
    });

    // Merge Strategy
    this.registerStrategy({
      name: 'merge',
      priority: 2,
      applicableTo: ['array', 'set'],
      reconcile: async (conflicts) => {
        const merged = new Set();
        for (const conflict of conflicts) {
          if (Array.isArray(conflict.value)) {
            conflict.value.forEach(item => merged.add(item));
          }
        }
        return {
          value: Array.from(merged),
          timestamp: Date.now()
        };
      }
    });

    // Business Logic Strategy
    this.registerStrategy({
      name: 'business-logic',
      priority: 3,
      applicableTo: ['task_assignment', 'resource_allocation'],
      reconcile: async (conflicts) => {
        // Custom business logic for specific entities
        return this.applyBusinessRules(conflicts);
      }
    });

    // CRDT Strategy
    this.registerStrategy({
      name: 'crdt',
      priority: 4,
      applicableTo: ['distributed_counter', 'collaborative_doc'],
      reconcile: async (conflicts) => {
        const crdtManager = new CRDTManager(this.redis, 'reconciler');
        return crdtManager.mergeDocuments(
          'temp',
          conflicts.map(c => c.crdtData)
        );
      }
    });
  }

  registerStrategy(strategy: ReconciliationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  async reconcile(
    entityType: string,
    entityId: string,
    conflicts: any[]
  ): Promise<any> {
    // Select appropriate strategy
    const strategy = this.selectStrategy(entityType, conflicts);
    
    if (!strategy) {
      throw new Error(`No strategy found for entity type: ${entityType}`);
    }

    console.log(`Using ${strategy.name} strategy for ${entityType}:${entityId}`);

    // Pre-reconciliation validation
    await this.validateConflicts(conflicts);

    // Apply reconciliation
    const result = await strategy.reconcile(conflicts);

    // Post-reconciliation validation
    await this.validateResult(result);

    // Log reconciliation
    await this.logReconciliation(entityType, entityId, strategy.name, conflicts, result);

    // Update state
    await this.updateReconciledState(entityType, entityId, result);

    return result;
  }

  private selectStrategy(
    entityType: string,
    conflicts: any[]
  ): ReconciliationStrategy | null {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(s => s.applicableTo.includes(entityType))
      .sort((a, b) => b.priority - a.priority);

    return applicableStrategies[0] || null;
  }

  private async validateConflicts(conflicts: any[]): Promise<void> {
    if (!conflicts || conflicts.length === 0) {
      throw new Error('No conflicts to reconcile');
    }

    for (const conflict of conflicts) {
      if (!conflict.timestamp || !conflict.nodeId) {
        throw new Error('Invalid conflict data: missing required fields');
      }
    }
  }

  private async validateResult(result: any): Promise<void> {
    if (!result) {
      throw new Error('Reconciliation produced null result');
    }
  }

  private async logReconciliation(
    entityType: string,
    entityId: string,
    strategy: string,
    conflicts: any[],
    result: any
  ): Promise<void> {
    const log = {
      timestamp: new Date().toISOString(),
      entityType,
      entityId,
      strategy,
      conflictCount: conflicts.length,
      conflicts: conflicts.map(c => ({
        nodeId: c.nodeId,
        timestamp: c.timestamp,
        hash: this.hashValue(c.value)
      })),
      result: {
        hash: this.hashValue(result.value || result),
        timestamp: result.timestamp || Date.now()
      }
    };

    await this.redis.xadd(
      'reconciliation:log',
      '*',
      'data',
      JSON.stringify(log)
    );
  }

  private async updateReconciledState(
    entityType: string,
    entityId: string,
    result: any
  ): Promise<void> {
    const key = `${entityType}:${entityId}:state`;
    
    await this.redis.set(
      key,
      JSON.stringify({
        ...result,
        reconciled: true,
        reconciledAt: Date.now()
      }),
      'EX',
      86400 // 24 hours
    );
  }

  private hashValue(value: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex')
      .substring(0, 8);
  }

  private async applyBusinessRules(conflicts: any[]): Promise<any> {
    // Example: Task assignment conflict resolution
    if (conflicts[0].entityType === 'task_assignment') {
      // Prefer assignments from higher priority agents
      const priorityMap = await this.getAgentPriorities();
      
      return conflicts.reduce((best, current) => {
        const currentPriority = priorityMap[current.nodeId] || 0;
        const bestPriority = priorityMap[best.nodeId] || 0;
        
        return currentPriority > bestPriority ? current : best;
      });
    }

    // Default to latest
    return conflicts.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  private async getAgentPriorities(): Promise<Record<string, number>> {
    const priorities = await this.redis.hgetall('agent:priorities');
    const result: Record<string, number> = {};
    
    for (const [agentId, priority] of Object.entries(priorities)) {
      result[agentId] = parseInt(priority, 10);
    }
    
    return result;
  }

  // Batch reconciliation for performance
  async reconcileBatch(
    reconciliations: Array<{
      entityType: string;
      entityId: string;
      conflicts: any[];
    }>
  ): Promise<any[]> {
    const results = await Promise.all(
      reconciliations.map(r => 
        this.reconcile(r.entityType, r.entityId, r.conflicts)
          .catch(err => ({
            error: err.message,
            entityType: r.entityType,
            entityId: r.entityId
          }))
      )
    );

    return results;
  }
}
```

---

## 📝 **Conflict Logging and Audit Trails**

### **Comprehensive Audit System**

```typescript
import { Redis } from 'ioredis';
import winston from 'winston';
import { createHash } from 'crypto';

interface ConflictAuditEntry {
  id: string;
  timestamp: string;
  conflictType: string;
  entities: Array<{
    id: string;
    nodeId: string;
    version: number;
    hash: string;
  }>;
  resolution: {
    strategy: string;
    winner: string;
    duration: number;
  };
  metadata: Record<string, any>;
}

export class ConflictAuditLogger {
  private redis: Redis;
  private logger: winston.Logger;
  private streamKey = 'audit:conflicts';

  constructor(redis: Redis) {
    this.redis = redis;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/conflict-audit.log',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  async logConflict(entry: ConflictAuditEntry): Promise<void> {
    // Add to Redis stream for real-time processing
    await this.redis.xadd(
      this.streamKey,
      '*',
      'id', entry.id,
      'timestamp', entry.timestamp,
      'type', entry.conflictType,
      'data', JSON.stringify(entry)
    );

    // Log to file with Winston
    this.logger.info('Conflict detected and resolved', {
      ...entry,
      logType: 'conflict_resolution'
    });

    // Store in time-series for analytics
    await this.storeTimeSeries(entry);

    // Check compliance requirements
    await this.checkCompliance(entry);
  }

  private async storeTimeSeries(entry: ConflictAuditEntry): Promise<void> {
    const tsKey = `timeseries:conflicts:${entry.conflictType}`;
    const score = new Date(entry.timestamp).getTime();
    
    await this.redis.zadd(
      tsKey,
      score,
      JSON.stringify({
        id: entry.id,
        duration: entry.resolution.duration,
        strategy: entry.resolution.strategy
      })
    );

    // Maintain 90 days of data
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    await this.redis.zremrangebyscore(tsKey, '-inf', ninetyDaysAgo);
  }

  private async checkCompliance(entry: ConflictAuditEntry): Promise<void> {
    // GDPR compliance - check for PII
    if (this.containsPII(entry)) {
      await this.sanitizeAndStore(entry);
    }

    // SOX compliance - financial data integrity
    if (entry.conflictType === 'financial_transaction') {
      await this.generateComplianceReport(entry);
    }
  }

  private containsPII(entry: ConflictAuditEntry): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{16}\b/ // Credit card
    ];

    const dataStr = JSON.stringify(entry);
    return piiPatterns.some(pattern => pattern.test(dataStr));
  }

  private async sanitizeAndStore(entry: ConflictAuditEntry): Promise<void> {
    // Create sanitized copy
    const sanitized = JSON.parse(JSON.stringify(entry));
    
    // Hash sensitive data
    this.hashSensitiveData(sanitized);

    // Store in separate compliance-safe location
    await this.redis.xadd(
      'audit:conflicts:sanitized',
      '*',
      'data',
      JSON.stringify(sanitized)
    );
  }

  private hashSensitiveData(obj: any): void {
    const sensitiveFields = ['email', 'ssn', 'creditCard', 'phoneNumber'];
    
    for (const key of Object.keys(obj)) {
      if (sensitiveFields.includes(key)) {
        obj[key] = this.hashValue(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.hashSensitiveData(obj[key]);
      }
    }
  }

  private hashValue(value: string): string {
    return createHash('sha256')
      .update(value + process.env.HASH_SALT)
      .digest('hex');
  }

  private async generateComplianceReport(
    entry: ConflictAuditEntry
  ): Promise<void> {
    const report = {
      reportId: `SOX-${Date.now()}`,
      conflictId: entry.id,
      timestamp: entry.timestamp,
      financialImpact: 'requires_review',
      resolutionJustification: entry.resolution.strategy,
      approvalRequired: true
    };

    await this.redis.lpush(
      'compliance:sox:pending',
      JSON.stringify(report)
    );
  }

  // Query methods for audit trails
  async getConflictHistory(
    entityId: string,
    options: {
      limit?: number;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<ConflictAuditEntry[]> {
    const { limit = 100, startTime, endTime } = options;
    
    // Build query
    let query = `SELECT * FROM conflicts WHERE entityId = '${entityId}'`;
    
    if (startTime) {
      query += ` AND timestamp >= '${startTime.toISOString()}'`;
    }
    
    if (endTime) {
      query += ` AND timestamp <= '${endTime.toISOString()}'`;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ${limit}`;

    // For Redis, we'll use XRANGE
    const start = startTime ? startTime.getTime() : '-';
    const end = endTime ? endTime.getTime() : '+';
    
    const entries = await this.redis.xrange(
      this.streamKey,
      start,
      end,
      'COUNT',
      limit
    );

    return entries
      .map(([, fields]) => {
        const data = fields[fields.indexOf('data') + 1];
        return JSON.parse(data);
      })
      .filter(entry => 
        entry.entities.some(e => e.id === entityId)
      );
  }

  async generateAuditReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const conflicts = await this.redis.xrange(
      this.streamKey,
      startDate.getTime(),
      endDate.getTime()
    );

    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalConflicts: conflicts.length,
      byType: {} as Record<string, number>,
      byStrategy: {} as Record<string, number>,
      averageResolutionTime: 0,
      complianceIssues: 0
    };

    let totalDuration = 0;

    for (const [, fields] of conflicts) {
      const data = JSON.parse(fields[fields.indexOf('data') + 1]);
      
      // Count by type
      report.byType[data.conflictType] = 
        (report.byType[data.conflictType] || 0) + 1;
      
      // Count by strategy
      report.byStrategy[data.resolution.strategy] = 
        (report.byStrategy[data.resolution.strategy] || 0) + 1;
      
      // Sum duration
      totalDuration += data.resolution.duration;
      
      // Check compliance
      if (data.metadata.complianceIssue) {
        report.complianceIssues++;
      }
    }

    report.averageResolutionTime = 
      conflicts.length > 0 ? totalDuration / conflicts.length : 0;

    return report;
  }

  // Real-time monitoring
  async streamConflicts(
    callback: (entry: ConflictAuditEntry) => void
  ): Promise<void> {
    const streamKey = this.streamKey;
    let lastId = '$';

    while (true) {
      try {
        const entries = await this.redis.xread(
          'BLOCK',
          1000,
          'STREAMS',
          streamKey,
          lastId
        );

        if (entries && entries.length > 0) {
          const [, messages] = entries[0];
          
          for (const [id, fields] of messages) {
            const data = JSON.parse(fields[fields.indexOf('data') + 1]);
            callback(data);
            lastId = id;
          }
        }
      } catch (err) {
        this.logger.error('Stream reading error:', err);
        await this.sleep(1000);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🏭 **Production Implementation Guide**

### **Complete Integration Example**

```typescript
import { Redis } from 'ioredis';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export class ProductionSplitBrainRecovery extends EventEmitter {
  private redis: Redis;
  private vectorClockLWW: VectorClockLWW<any>;
  private otEngine: OperationalTransformEngine;
  private crdtManager: CRDTManager;
  private reconciliationEngine: AutomatedReconciliationEngine;
  private rejoiningProtocol: SafeAgentRejoiningProtocol;
  private stateReconciliation: StateReconciliationEngine;
  private auditLogger: ConflictAuditLogger;

  constructor(config: {
    redis: Redis;
    nodeId: string;
    wsPort?: number;
  }) {
    super();
    
    this.redis = config.redis;
    
    // Initialize all components
    this.vectorClockLWW = new VectorClockLWW(this.redis, config.nodeId);
    this.otEngine = new OperationalTransformEngine(this.redis, config.wsPort);
    this.crdtManager = new CRDTManager(this.redis, config.nodeId);
    this.reconciliationEngine = new AutomatedReconciliationEngine(
      this.redis,
      config.nodeId
    );
    this.rejoiningProtocol = new SafeAgentRejoiningProtocol(this.redis);
    this.stateReconciliation = new StateReconciliationEngine(this.redis);
    this.auditLogger = new ConflictAuditLogger(this.redis);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Reconciliation events
    this.reconciliationEngine.on('reconciliationComplete', async (event) => {
      await this.auditLogger.logConflict({
        id: event.id,
        timestamp: new Date().toISOString(),
        conflictType: 'auto_reconciled',
        entities: [{
          id: event.agentId,
          nodeId: this.nodeId,
          version: 1,
          hash: this.hashData(event.data)
        }],
        resolution: {
          strategy: event.metadata.resolution,
          winner: event.agentId,
          duration: Date.now() - event.timestamp
        },
        metadata: event.metadata
      });
    });

    // Rejoining events
    this.rejoiningProtocol.on('agentReintegrated', (data) => {
      console.log(`Agent ${data.agentId} successfully reintegrated`);
      this.emit('agentRecovered', data);
    });

    // Manual intervention required
    this.rejoiningProtocol.on('manualInterventionRequired', (data) => {
      console.error(`Manual intervention required for agent ${data.agentId}`);
      this.emit('manualInterventionRequired', data);
    });
  }

  async handleSplitBrainDetection(
    partition: {
      detectedAt: number;
      affectedAgents: string[];
      partitionGroups: string[][];
    }
  ): Promise<void> {
    console.log('Split-brain detected:', partition);

    // 1. Immediate response - pause non-critical operations
    await this.pauseNonCriticalOperations(partition.affectedAgents);

    // 2. Start reconciliation engine
    await this.reconciliationEngine.start();

    // 3. Begin monitoring for partition healing
    this.monitorPartitionHealing(partition);
  }

  private async pauseNonCriticalOperations(
    agentIds: string[]
  ): Promise<void> {
    for (const agentId of agentIds) {
      await this.redis.hset(`agent:${agentId}:status`, {
        operational: 'restricted',
        reason: 'split_brain_detected',
        restrictedAt: Date.now()
      });
    }
  }

  private async monitorPartitionHealing(partition: any): Promise<void> {
    const checkInterval = setInterval(async () => {
      const healed = await this.checkPartitionHealed(partition);
      
      if (healed) {
        clearInterval(checkInterval);
        await this.handlePartitionHealed(partition);
      }
    }, 5000); // Check every 5 seconds
  }

  private async checkPartitionHealed(partition: any): Promise<boolean> {
    // Check if agents can communicate across partition groups
    for (const group1 of partition.partitionGroups) {
      for (const group2 of partition.partitionGroups) {
        if (group1 === group2) continue;
        
        const canCommunicate = await this.testCommunication(
          group1[0],
          group2[0]
        );
        
        if (!canCommunicate) {
          return false;
        }
      }
    }
    
    return true;
  }

  private async testCommunication(
    agent1: string,
    agent2: string
  ): Promise<boolean> {
    try {
      const testKey = `comm:test:${agent1}:${agent2}`;
      const testValue = Date.now().toString();
      
      // Agent 1 writes
      await this.redis.set(testKey, testValue, 'EX', 10);
      
      // Agent 2 reads
      const readValue = await this.redis.get(testKey);
      
      return readValue === testValue;
    } catch {
      return false;
    }
  }

  private async handlePartitionHealed(partition: any): Promise<void> {
    console.log('Partition healed, beginning recovery process');

    // 1. Identify conflicts
    const conflicts = await this.identifyConflicts(partition);

    // 2. Reconcile each conflict
    for (const conflict of conflicts) {
      await this.resolveConflict(conflict);
    }

    // 3. Reintegrate agents
    for (const agentId of partition.affectedAgents) {
      await this.rejoiningProtocol.handleAgentReconnection(
        agentId,
        partition.detectedAt,
        await this.getAgentState(agentId)
      );
    }

    // 4. Resume normal operations
    await this.resumeNormalOperations(partition.affectedAgents);
  }

  private async identifyConflicts(partition: any): Promise<any[]> {
    const conflicts: any[] = [];
    
    // Check for state divergence
    for (const agentId of partition.affectedAgents) {
      const states = await this.getPartitionedStates(agentId);
      
      if (states.length > 1) {
        conflicts.push({
          type: 'state_divergence',
          agentId,
          states
        });
      }
    }
    
    return conflicts;
  }

  private async resolveConflict(conflict: any): Promise<void> {
    switch (conflict.type) {
      case 'state_divergence':
        await this.stateReconciliation.reconcile(
          'agent_state',
          conflict.agentId,
          conflict.states
        );
        break;
        
      case 'leadership_conflict':
        await this.resolveLeadershipConflict(conflict);
        break;
        
      default:
        console.warn('Unknown conflict type:', conflict.type);
    }
  }

  private async resolveLeadershipConflict(conflict: any): Promise<void> {
    // Implement leader election with fencing
    const leaders = conflict.leaders;
    
    // Sort by election time and fencing token
    leaders.sort((a: any, b: any) => {
      if (a.electionTime !== b.electionTime) {
        return a.electionTime - b.electionTime;
      }
      return a.fencingToken.localeCompare(b.fencingToken);
    });
    
    const winner = leaders[0];
    
    // Revoke leadership from others
    for (const leader of leaders.slice(1)) {
      await this.revokeLeadership(leader.agentId);
    }
    
    // Confirm winner
    await this.confirmLeadership(winner.agentId);
  }

  private async revokeLeadership(agentId: string): Promise<void> {
    await this.redis.hdel(`agent:${agentId}:status`, 'isLeader');
    await this.redis.publish('leadership:revoked', agentId);
  }

  private async confirmLeadership(agentId: string): Promise<void> {
    await this.redis.hset(`agent:${agentId}:status`, {
      isLeader: 'true',
      confirmedAt: Date.now()
    });
    await this.redis.publish('leadership:confirmed', agentId);
  }

  private async getPartitionedStates(agentId: string): Promise<any[]> {
    const pattern = `agent:${agentId}:state:partition:*`;
    const keys = await this.redis.keys(pattern);
    
    const states = await Promise.all(
      keys.map(async key => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    
    return states.filter(Boolean);
  }

  private async getAgentState(agentId: string): Promise<any> {
    const state = await this.redis.hgetall(`agent:${agentId}:state`);
    return state;
  }

  private async resumeNormalOperations(agentIds: string[]): Promise<void> {
    for (const agentId of agentIds) {
      await this.redis.hset(`agent:${agentId}:status`, {
        operational: 'normal',
        resumedAt: Date.now()
      });
    }
    
    await this.redis.publish('operations:resumed', JSON.stringify({
      agentIds,
      timestamp: Date.now()
    }));
  }

  private hashData(data: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }

  private nodeId: string = 'production-recovery';
}

// Example usage
async function setupProductionRecovery() {
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });

  const recovery = new ProductionSplitBrainRecovery({
    redis,
    nodeId: process.env.NODE_ID || 'node-1',
    wsPort: 8080
  });

  // Handle split-brain detection from monitoring system
  recovery.on('splitBrainDetected', async (partition) => {
    await recovery.handleSplitBrainDetection(partition);
  });

  // Handle manual intervention alerts
  recovery.on('manualInterventionRequired', async (data) => {
    // Send alert to ops team
    console.error('ALERT: Manual intervention required', data);
    // Could integrate with PagerDuty, Slack, etc.
  });

  return recovery;
}
```

---

## 🧪 **Testing and Validation**

### **Chaos Engineering Test Suite**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SplitBrainTestSuite {
  async runComprehensiveTests(): Promise<void> {
    console.log('Starting split-brain test suite...');
    
    // Test 1: Network partition
    await this.testNetworkPartition();
    
    // Test 2: Redis failover during operation
    await this.testRedisFailover();
    
    // Test 3: Concurrent leadership election
    await this.testConcurrentLeaderElection();
    
    // Test 4: Data divergence and reconciliation
    await this.testDataDivergenceReconciliation();
    
    // Test 5: Agent rejoining after extended partition
    await this.testAgentRejoining();
  }

  private async testNetworkPartition(): Promise<void> {
    console.log('Test 1: Simulating network partition...');
    
    // Use Toxiproxy to create partition
    await execAsync(`
      toxiproxy-cli toxic add redis-partition \\
        --type partition \\
        --toxicName partition-test \\
        --attribute rate=1.0 \\
        --downstream
    `);
    
    // Wait for detection
    await this.sleep(10000);
    
    // Remove partition
    await execAsync('toxiproxy-cli toxic remove redis-partition -n partition-test');
    
    // Verify recovery
    await this.verifySystemRecovered();
  }

  private async testRedisFailover(): Promise<void> {
    console.log('Test 2: Testing Redis failover...');
    
    // Trigger Redis Sentinel failover
    await execAsync('redis-cli -p 26379 SENTINEL failover mymaster');
    
    // Monitor recovery
    await this.monitorFailoverRecovery();
  }

  private async testConcurrentLeaderElection(): Promise<void> {
    console.log('Test 3: Testing concurrent leader election...');
    
    // Force multiple agents to elect simultaneously
    const agents = ['agent-1', 'agent-2', 'agent-3'];
    
    await Promise.all(
      agents.map(agent => this.forceLeaderElection(agent))
    );
    
    // Verify single leader
    await this.verifySingleLeader();
  }

  private async testDataDivergenceReconciliation(): Promise<void> {
    console.log('Test 4: Testing data divergence reconciliation...');
    
    // Create conflicting updates
    await this.createConflictingUpdates();
    
    // Trigger reconciliation
    await this.triggerReconciliation();
    
    // Verify data consistency
    await this.verifyDataConsistency();
  }

  private async testAgentRejoining(): Promise<void> {
    console.log('Test 5: Testing agent rejoining...');
    
    // Disconnect agent
    await this.disconnectAgent('agent-1');
    
    // Wait for extended period
    await this.sleep(60000); // 1 minute
    
    // Reconnect and monitor reintegration
    await this.reconnectAgent('agent-1');
    
    // Verify successful reintegration
    await this.verifyAgentReintegrated('agent-1');
  }

  // Helper methods
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async verifySystemRecovered(): Promise<boolean> {
    // Implementation specific to your system
    return true;
  }

  private async monitorFailoverRecovery(): Promise<void> {
    // Monitor Redis Sentinel for successful failover
  }

  private async forceLeaderElection(agentId: string): Promise<void> {
    // Trigger leader election for specific agent
  }

  private async verifySingleLeader(): Promise<void> {
    // Verify only one leader exists
  }

  private async createConflictingUpdates(): Promise<void> {
    // Create concurrent conflicting updates
  }

  private async triggerReconciliation(): Promise<void> {
    // Force reconciliation process
  }

  private async verifyDataConsistency(): Promise<void> {
    // Check all nodes have consistent data
  }

  private async disconnectAgent(agentId: string): Promise<void> {
    // Simulate agent disconnection
  }

  private async reconnectAgent(agentId: string): Promise<void> {
    // Simulate agent reconnection
  }

  private async verifyAgentReintegrated(agentId: string): Promise<void> {
    // Verify agent successfully reintegrated
  }
}
```

---

## 🚨 **Emergency Recovery Procedures**

### **Manual Intervention Playbook**

```typescript
export class EmergencyRecoveryProcedures {
  async executeEmergencyRecovery(scenario: string): Promise<void> {
    switch (scenario) {
      case 'total_partition':
        await this.handleTotalPartition();
        break;
        
      case 'data_corruption':
        await this.handleDataCorruption();
        break;
        
      case 'cascade_failure':
        await this.handleCascadeFailure();
        break;
        
      case 'byzantine_fault':
        await this.handleByzantineFault();
        break;
        
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  private async handleTotalPartition(): Promise<void> {
    console.log('EMERGENCY: Handling total partition...');
    
    // 1. Freeze all write operations
    await this.freezeWrites();
    
    // 2. Identify partition groups
    const groups = await this.identifyPartitionGroups();
    
    // 3. Designate temporary master group
    const masterGroup = this.selectMasterGroup(groups);
    
    // 4. Sync other groups to master
    await this.syncToMaster(masterGroup, groups);
    
    // 5. Resume operations
    await this.resumeOperations();
  }

  private async handleDataCorruption(): Promise<void> {
    console.log('EMERGENCY: Handling data corruption...');
    
    // 1. Identify corrupted data
    const corrupted = await this.scanForCorruption();
    
    // 2. Isolate corrupted nodes
    await this.isolateNodes(corrupted.nodes);
    
    // 3. Restore from backups
    await this.restoreFromBackup(corrupted.data);
    
    // 4. Validate restoration
    await this.validateRestoration();
    
    // 5. Reintegrate nodes
    await this.reintegrateNodes(corrupted.nodes);
  }

  private async handleCascadeFailure(): Promise<void> {
    console.log('EMERGENCY: Handling cascade failure...');
    
    // 1. Circuit breaker activation
    await this.activateCircuitBreakers();
    
    // 2. Shed non-critical load
    await this.shedLoad(['analytics', 'reporting', 'batch']);
    
    // 3. Scale critical services
    await this.scaleServices(['core', 'auth', 'data']);
    
    // 4. Monitor stabilization
    await this.monitorStabilization();
    
    // 5. Gradual recovery
    await this.gradualRecovery();
  }

  private async handleByzantineFault(): Promise<void> {
    console.log('EMERGENCY: Handling byzantine fault...');
    
    // 1. Identify faulty nodes
    const faulty = await this.detectByzantineNodes();
    
    // 2. Immediate isolation
    await this.immediateIsolation(faulty);
    
    // 3. Consensus validation
    await this.validateConsensus();
    
    // 4. State reconstruction
    await this.reconstructState();
    
    // 5. Security audit
    await this.securityAudit();
  }

  // Helper methods for emergency procedures
  private async freezeWrites(): Promise<void> {
    // Implement write freeze
  }

  private async identifyPartitionGroups(): Promise<any[]> {
    // Identify network partition groups
    return [];
  }

  private selectMasterGroup(groups: any[]): any {
    // Select group with most recent consistent state
    return groups[0];
  }

  private async syncToMaster(master: any, groups: any[]): Promise<void> {
    // Sync all groups to master state
  }

  private async resumeOperations(): Promise<void> {
    // Resume normal operations
  }

  private async scanForCorruption(): Promise<any> {
    // Scan for data corruption
    return { nodes: [], data: [] };
  }

  private async isolateNodes(nodes: string[]): Promise<void> {
    // Isolate corrupted nodes
  }

  private async restoreFromBackup(data: any[]): Promise<void> {
    // Restore from backup
  }

  private async validateRestoration(): Promise<void> {
    // Validate restored data
  }

  private async reintegrateNodes(nodes: string[]): Promise<void> {
    // Reintegrate nodes after recovery
  }

  private async activateCircuitBreakers(): Promise<void> {
    // Activate all circuit breakers
  }

  private async shedLoad(services: string[]): Promise<void> {
    // Shed non-critical load
  }

  private async scaleServices(services: string[]): Promise<void> {
    // Scale critical services
  }

  private async monitorStabilization(): Promise<void> {
    // Monitor system stabilization
  }

  private async gradualRecovery(): Promise<void> {
    // Gradual system recovery
  }

  private async detectByzantineNodes(): Promise<string[]> {
    // Detect byzantine faulty nodes
    return [];
  }

  private async immediateIsolation(nodes: string[]): Promise<void> {
    // Immediate node isolation
  }

  private async validateConsensus(): Promise<void> {
    // Validate consensus integrity
  }

  private async reconstructState(): Promise<void> {
    // Reconstruct system state
  }

  private async securityAudit(): Promise<void> {
    // Perform security audit
  }
}
```

---

## 🏆 **Best Practices 2024-2025**

### **Industry Standards and Recommendations**

1. **Prevention Over Recovery**
   - Use Redis Sentinel/Cluster for automatic failover
   - Implement proper fencing mechanisms
   - Design for partition tolerance from the start

2. **Observable Recovery Process**
   - Instrument every recovery operation
   - Use distributed tracing for conflict resolution
   - Maintain comprehensive audit trails

3. **Automated Testing**
   - Regular chaos engineering exercises
   - Automated split-brain simulation
   - Continuous validation of recovery procedures

4. **Data Integrity First**
   - Never sacrifice consistency for availability
   - Use CRDTs for naturally convergent data
   - Implement multi-version concurrency control

5. **Production Readiness**
   - Document all recovery procedures
   - Train team on manual intervention
   - Maintain runbooks for emergency scenarios

---

## 📚 **References and Further Reading**

1. **"Conflict-free Replicated Data Types"** - Shapiro et al., 2011
2. **"Operational Transformation in Real-time Collaborative Editing"** - Sun & Ellis
3. **"Time, Clocks, and the Ordering of Events"** - Leslie Lamport
4. **"Automerge: A JSON-like data structure"** - Martin Kleppmann
5. **"Redis Sentinel Documentation"** - Redis.io
6. **"Building Reliable Large-Scale Distributed Systems"** - Google SRE Book

---

**This comprehensive guide provides production-ready patterns for handling split-brain scenarios in distributed Node.js meta-agent systems, with emphasis on automated recovery and data integrity.**