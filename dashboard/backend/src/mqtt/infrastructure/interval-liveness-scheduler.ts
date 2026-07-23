import { Inject, Injectable } from '@nestjs/common';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import { MQTT_CONFIG, type LivenessSchedulerPort } from '../domain/mqtt-ports.js';

@Injectable()
export class IntervalLivenessScheduler implements LivenessSchedulerPort {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig) {}

  start(task: () => void): void {
    if (this.interval !== null) return;
    this.interval = setInterval(task, this.config.mqttLivenessSweepMs);
    this.interval.unref();
  }

  stop(): void {
    if (this.interval === null) return;
    clearInterval(this.interval);
    this.interval = null;
  }
}
