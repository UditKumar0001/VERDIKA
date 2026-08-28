/**
 * BaseAgent Abstract Class
 * Foundation class for all specialized underwriting and risk assessment agents in Verdika.
 */
export class BaseAgent {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  /**
   * Execution entry point for the agent.
   * @param {Object} input - Payload containing application data, contextual telemetry, or previous agent outputs.
   * @returns {Promise<Object>} The agent's structured evaluation result.
   */
  async run(input) {
    throw new Error(`Agent [${this.name}] must implement async run(input)`);
  }
}
