export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioValidationError';
  }
}

export class ScenarioStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioStateError';
  }
}
