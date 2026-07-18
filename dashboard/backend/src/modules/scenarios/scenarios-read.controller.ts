import { Controller, Get, Param } from '@nestjs/common';

import type { ApiResponse, ListApiMeta } from '../../common/http/api-response.js';
import { parseScenarioId } from '../../common/validation/identifier-validation.js';
import {
  GetScenarioService,
  ListScenariosService,
} from '../read-model/application/read-services.js';
import type { ScenarioReadModel } from '../read-model/domain/read-model-models.js';

@Controller('api/v1/scenarios')
export class ScenariosReadController {
  constructor(
    private readonly listScenarios: ListScenariosService,
    private readonly getScenario: GetScenarioService,
  ) {}

  @Get()
  list(): ApiResponse<readonly ScenarioReadModel[], ListApiMeta> {
    return this.listScenarios.execute();
  }

  @Get(':scenarioId')
  get(@Param('scenarioId') scenarioId: string): ApiResponse<ScenarioReadModel> {
    return this.getScenario.execute(parseScenarioId(scenarioId));
  }
}
