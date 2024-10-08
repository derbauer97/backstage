## API Report File for "@backstage/plugin-catalog-backend-module-incremental-ingestion"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
/// <reference types="express" />

import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import type { Config } from '@backstage/config';
import type { DeferredEntity } from '@backstage/plugin-catalog-node';
import type { DurationObjectUnits } from 'luxon';
import { EventParams } from '@backstage/plugin-events-node';
import { EventSubscriber } from '@backstage/plugin-events-node';
import type { Logger } from 'winston';
import type { PermissionEvaluator } from '@backstage/plugin-permission-common';
import type { PluginDatabaseManager } from '@backstage/backend-common';
import { Router } from 'express';
import { SchedulerService } from '@backstage/backend-plugin-api';
import { UrlReaderService } from '@backstage/backend-plugin-api';

// @public
export type EntityIteratorResult<T> =
  | {
      done: false;
      entities: DeferredEntity[];
      cursor: T;
    }
  | {
      done: true;
      entities?: DeferredEntity[];
      cursor?: T;
    };

// @public (undocumented)
export class IncrementalCatalogBuilder {
  // (undocumented)
  addIncrementalEntityProvider<TCursor, TContext>(
    provider: IncrementalEntityProvider<TCursor, TContext>,
    options: IncrementalEntityProviderOptions,
  ): EventSubscriber;
  // (undocumented)
  build(): Promise<{
    incrementalAdminRouter: Router;
  }>;
  static create(
    env: PluginEnvironment,
    builder: CatalogBuilder,
  ): Promise<IncrementalCatalogBuilder>;
}

// @public
export type IncrementalEntityEventResult =
  | {
      type: 'ignored';
    }
  | {
      type: 'delta';
      added: DeferredEntity[];
      removed: {
        entityRef: string;
      }[];
    };

// @public
export interface IncrementalEntityProvider<TCursor, TContext> {
  around(burst: (context: TContext) => Promise<void>): Promise<void>;
  eventHandler?: {
    onEvent: (params: EventParams) => Promise<IncrementalEntityEventResult>;
    supportsEventTopics: () => string[];
  };
  getProviderName(): string;
  next(
    context: TContext,
    cursor?: TCursor,
  ): Promise<EntityIteratorResult<TCursor>>;
}

// @public (undocumented)
export interface IncrementalEntityProviderOptions {
  backoff?: DurationObjectUnits[];
  burstInterval: DurationObjectUnits;
  burstLength: DurationObjectUnits;
  rejectEmptySourceCollections?: boolean;
  rejectRemovalsAbovePercentage?: number;
  restLength: DurationObjectUnits;
}

// @public (undocumented)
export type PluginEnvironment = {
  logger: Logger;
  database: PluginDatabaseManager;
  scheduler: SchedulerService;
  config: Config;
  reader: UrlReaderService;
  permissions: PermissionEvaluator;
};
```
