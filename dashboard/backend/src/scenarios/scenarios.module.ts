import { Module } from '@nestjs/common';

import { ScenarioEngine } from './domain/scenario-engine.js';

export const SCENARIO_ENGINE_FACTORY = Symbol('SCENARIO_ENGINE_FACTORY');
export type ScenarioEngineFactory = (epochUtc: string) => ScenarioEngine;

const scenarioEngineFactory: ScenarioEngineFactory = (epochUtc) => new ScenarioEngine(epochUtc);

@Module({
  providers: [{ provide: SCENARIO_ENGINE_FACTORY, useValue: scenarioEngineFactory }],
  exports: [SCENARIO_ENGINE_FACTORY],
})
export class ScenariosModule {}
