import { Module } from '@nestjs/common';
import { DemoSimulatorService } from './demo-simulator.service';

@Module({ providers: [DemoSimulatorService] })
export class DemoModule {}
