/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// AUTO-GENERATED CODE - DO NOT MODIFY BY HAND
// Generated from Firebase AI Interactions API OpenAPI specification.

import type { FindRequest, FixRequest, SessionConfig, TransformOption } from './interaction';
import type { ThinkingSummaries } from './enums';


/**
 * Polymorphic union AgentConfig.
 */
export type AgentConfig =
  | AntigravityAgentConfig
  | CodeMenderAgentConfig
  | DeepResearchAgentConfig
  | DynamicAgentConfig
;


/**
 * The configuration for allowed tools.
 */
export interface AllowedTools {
  /**
   * The mode of the tool choice.
   */
  mode?: string;
  /**
   * The names of the allowed tools.
   */
  tools?: string[];
}

/**
 * A single domain allowlist rule with optional header injection.
 */
export interface AllowlistEntry {
  /**
   * Domain to allow outbound requests to. Supports wildcards (e.g. '*.googleapis.com'). Use '*' to allow all domains.
   */
  domain: string;
  /**
   * Headers to inject on all outbound requests matching this domain. Accepts a single dict or a list of dicts. The egress proxy injects these automatically.
   */
  transform?: TransformOption;
}

/**
 * Configuration for the Antigravity agent runtime.
Provides server-side control over the agent's execution environment
and tool configuration.
 */
export interface AntigravityAgentConfig {
  type: 'antigravity';
  /**
   * Max total tokens for the agent run.
   */
  max_total_tokens?: string;
  /**
   * The model to use for agent reasoning.
   */
  model?: string;
}

/**
 * Configuration for the CodeMender agent.
 */
export interface CodeMenderAgentConfig {
  type: 'code_mender';
  /**
   * Parameters for finding vulnerabilities.
   */
  find_request?: FindRequest;
  /**
   * Parameters for fixing vulnerabilities.
   */
  fix_request?: FixRequest;
  /**
   * The name of the model to use for the CodeMender agent. One
CodeMender session will only use one model.
   */
  model?: string;
  /**
   * Optional session-specific configurations to override default agent
behavior.
   */
  session_config?: SessionConfig;
  /**
   * Parameter for grouping multiple interactions that belong to
the same CodeMender session.
   */
  session_id?: string;
}

/**
 * Configuration for the Deep Research agent.
 */
export interface DeepResearchAgentConfig {
  type: 'deep_research';
  /**
   * Enables human-in-the-loop planning for the Deep Research agent. If set to
true, the Deep Research agent will provide a research plan in its response.
The agent will then proceed only if the user confirms the plan in the next
turn.
   */
  collaborative_planning?: boolean;
  /**
   * Enables bigquery tool for the Deep Research agent.
   */
  enable_bigquery_tool?: boolean;
  /**
   * Whether to include thought summaries in the response.
   */
  thinking_summaries?: ThinkingSummaries;
  /**
   * Whether to include visualizations in the response.
   */
  visualization?: string;
}

/**
 * Configuration for dynamic agents.
 */
export interface DynamicAgentConfig {
  type: 'dynamic';
}

