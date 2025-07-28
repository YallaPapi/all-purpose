/**
 * etcd Service
 * 
 * High-level service for etcd operations including key management,
 * watching, transactions, and lease management for UEP Registry.
 */

import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Etcd3, IKeyValue, IDeleteRangeResponse, IWatchResponse } from 'etcd3';

export interface EtcdWatchOptions {
  prefix?: boolean;
  startRevision?: string;
  prevKv?: boolean;
}

export interface EtcdTransactionCondition {
  key: string;
  target: 'CREATE' | 'MOD' | 'VERSION' | 'VALUE';
  operator: 'EQUAL' | 'NOT_EQUAL' | 'GREATER' | 'LESS';
  value?: string | number;
}

export interface EtcdTransactionOperation {
  type: 'PUT' | 'DELETE' | 'GET';
  key: string;
  value?: string;
  options?: any;
}

@Injectable()
export class EtcdService implements OnModuleDestroy {
  private readonly logger = new Logger(EtcdService.name);
  private readonly activeWatchers = new Map<string, any>();
  private readonly activeLeases = new Map<number, any>();

  constructor(
    @Inject('ETCD_CLIENT') private readonly etcd: Etcd3,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get a single key value
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await this.etcd.get(key).string();
      return value || null;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get key with metadata
   */
  async getWithMetadata(key: string): Promise<IKeyValue | null> {
    try {
      const result = await this.etcd.get(key);
      return result || null;
    } catch (error) {
      this.logger.error(`Failed to get key with metadata ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys with a prefix
   */
  async getPrefix(prefix: string): Promise<{ [key: string]: string }> {
    try {
      const result = await this.etcd.getAll().prefix(prefix).strings();
      return result;
    } catch (error) {
      this.logger.error(`Failed to get prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys with a prefix including metadata
   */
  async getPrefixWithMetadata(prefix: string): Promise<IKeyValue[]> {
    try {
      const result = await this.etcd.getAll().prefix(prefix);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get prefix with metadata ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Put a key-value pair
   */
  async put(key: string, value: string): Promise<void> {
    try {
      await this.etcd.put(key).value(value);
      this.logger.debug(`Put key ${key}`);
    } catch (error) {
      this.logger.error(`Failed to put key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Put a key-value pair with a lease
   */
  async putWithLease(key: string, value: string, ttlSeconds: number): Promise<number> {
    try {
      const lease = this.etcd.lease(ttlSeconds);
      const leaseId = await lease.grant();
      
      await this.etcd.put(key).value(value).lease(leaseId);
      
      // Store lease for management
      this.activeLeases.set(leaseId, lease);
      
      // Keep lease alive
      lease.on('lost', () => {
        this.logger.warn(`Lease ${leaseId} for key ${key} was lost`);
        this.activeLeases.delete(leaseId);
        this.eventEmitter.emit('etcd.lease.lost', { key, leaseId });
      });

      lease.on('kept-alive', () => {
        this.logger.debug(`Lease ${leaseId} for key ${key} kept alive`);
      });

      this.logger.debug(`Put key ${key} with lease ${leaseId} (TTL: ${ttlSeconds}s)`);
      return leaseId;
    } catch (error) {
      this.logger.error(`Failed to put key ${key} with lease:`, error);
      throw error;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<IDeleteRangeResponse> {
    try {
      const result = await this.etcd.delete().key(key);
      this.logger.debug(`Deleted key ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete all keys with a prefix
   */
  async deletePrefix(prefix: string): Promise<IDeleteRangeResponse> {
    try {
      const result = await this.etcd.delete().prefix(prefix);
      this.logger.debug(`Deleted prefix ${prefix}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Watch a key for changes
   */
  async watch(
    key: string,
    callback: (response: IWatchResponse) => void,
    options: EtcdWatchOptions = {},
  ): Promise<string> {
    try {
      const watchId = `watch-${Date.now()}-${Math.random()}`;
      
      let watcher = this.etcd.watch().key(key);
      
      if (options.prefix) {
        watcher = watcher.prefix(key);
      }
      
      if (options.startRevision) {
        watcher = watcher.startRevision(options.startRevision);
      }
      
      if (options.prevKv) {
        watcher = watcher.prevKv();
      }

      const watchHandle = await watcher.create();
      
      watchHandle
        .on('data', (response: IWatchResponse) => {
          this.logger.debug(`Watch ${watchId} received data for key ${key}`);
          callback(response);
        })
        .on('error', (error) => {
          this.logger.error(`Watch ${watchId} error for key ${key}:`, error);
          this.eventEmitter.emit('etcd.watch.error', { key, watchId, error });
        })
        .on('end', () => {
          this.logger.debug(`Watch ${watchId} ended for key ${key}`);
          this.activeWatchers.delete(watchId);
          this.eventEmitter.emit('etcd.watch.end', { key, watchId });
        });

      this.activeWatchers.set(watchId, watchHandle);
      this.logger.debug(`Started watch ${watchId} for key ${key}`);
      
      return watchId;
    } catch (error) {
      this.logger.error(`Failed to watch key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a watch
   */
  async cancelWatch(watchId: string): Promise<void> {
    const watchHandle = this.activeWatchers.get(watchId);
    if (watchHandle) {
      await watchHandle.cancel();
      this.activeWatchers.delete(watchId);
      this.logger.debug(`Cancelled watch ${watchId}`);
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(
    conditions: EtcdTransactionCondition[],
    successOps: EtcdTransactionOperation[],
    failureOps: EtcdTransactionOperation[] = [],
  ): Promise<{ succeeded: boolean; responses: any[] }> {
    try {
      let txn = this.etcd.if();

      // Add conditions
      for (const condition of conditions) {
        switch (condition.target) {
          case 'CREATE':
            txn = txn.createRevision(condition.key, condition.operator as any, condition.value as number);
            break;
          case 'MOD':
            txn = txn.modRevision(condition.key, condition.operator as any, condition.value as number);
            break;
          case 'VERSION':
            txn = txn.version(condition.key, condition.operator as any, condition.value as number);
            break;
          case 'VALUE':
            txn = txn.value(condition.key, condition.operator as any, condition.value as string);
            break;
        }
      }

      // Add success operations
      let thenTxn = txn.then;
      for (const op of successOps) {
        switch (op.type) {
          case 'PUT':
            thenTxn = thenTxn.put(op.key).value(op.value);
            break;
          case 'DELETE':
            thenTxn = thenTxn.delete().key(op.key);
            break;
          case 'GET':
            thenTxn = thenTxn.get(op.key);
            break;
        }
      }

      // Add failure operations
      let elseTxn = thenTxn.else;
      for (const op of failureOps) {
        switch (op.type) {
          case 'PUT':
            elseTxn = elseTxn.put(op.key).value(op.value);
            break;
          case 'DELETE':
            elseTxn = elseTxn.delete().key(op.key);
            break;
          case 'GET':
            elseTxn = elseTxn.get(op.key);
            break;
        }
      }

      const result = await elseTxn.commit();
      
      this.logger.debug(`Transaction completed: succeeded=${result.succeeded}`);
      
      return {
        succeeded: result.succeeded,
        responses: result.responses,
      };
    } catch (error) {
      this.logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Keep a lease alive
   */
  async keepLeaseAlive(leaseId: number): Promise<void> {
    const lease = this.activeLeases.get(leaseId);
    if (lease) {
      await lease.keepAliveOnce();
    }
  }

  /**
   * Revoke a lease
   */
  async revokeLease(leaseId: number): Promise<void> {
    try {
      await this.etcd.lease.revoke(leaseId);
      const lease = this.activeLeases.get(leaseId);
      if (lease) {
        lease.close();
        this.activeLeases.delete(leaseId);
      }
      this.logger.debug(`Revoked lease ${leaseId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke lease ${leaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get cluster member information
   */
  async getClusterMembers(): Promise<any> {
    try {
      const members = await this.etcd.cluster.memberList();
      return members;
    } catch (error) {
      this.logger.error('Failed to get cluster members:', error);
      throw error;
    }
  }

  /**
   * Get cluster health
   */
  async getClusterHealth(): Promise<boolean> {
    try {
      await this.etcd.get('health-check').string();
      return true;
    } catch (error) {
      this.logger.error('Cluster health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up etcd service...');

    // Cancel all active watchers
    for (const [watchId, watchHandle] of this.activeWatchers) {
      try {
        await watchHandle.cancel();
        this.logger.debug(`Cancelled watch ${watchId}`);
      } catch (error) {
        this.logger.error(`Failed to cancel watch ${watchId}:`, error);
      }
    }
    this.activeWatchers.clear();

    // Close all active leases
    for (const [leaseId, lease] of this.activeLeases) {
      try {
        lease.close();
        this.logger.debug(`Closed lease ${leaseId}`);
      } catch (error) {
        this.logger.error(`Failed to close lease ${leaseId}:`, error);
      }
    }
    this.activeLeases.clear();

    // Close etcd client
    try {
      this.etcd.close();
      this.logger.log('etcd client closed');
    } catch (error) {
      this.logger.error('Failed to close etcd client:', error);
    }
  }
}