/**
 * Standalone Health Module
 * 
 * Self-contained health module that can work independently.
 * Use this if the main health module has dependency issues.
 */

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthSimpleController } from './health-simple.controller';

@Module({
  imports: [
    TerminusModule,
  ],
  controllers: [
    HealthSimpleController,
  ],
})
export class HealthStandaloneModule {}