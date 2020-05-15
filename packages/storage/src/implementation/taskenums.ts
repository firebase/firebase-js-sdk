/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Enumerations used for upload tasks.
 */

/**
 * Enum for task events.
 * @enum {string}
 */
export type TaskEvent = string;
export const TaskEvent = {
  /** Triggered whenever the task changes or progress is updated. */
  STATE_CHANGED: 'state_changed'
};

/**
 * Internal enum for task state.
 * @enum {string}
 */
export type InternalTaskState = string;
export const InternalTaskState = {
  RUNNING: 'running',
  PAUSING: 'pausing',
  PAUSED: 'paused',
  SUCCESS: 'success',
  CANCELING: 'canceling',
  CANCELED: 'canceled',
  ERROR: 'error'
};

/**
 * External (API-surfaced) enum for task state.
 * @enum {string}
 */
export type TaskState = string;
export const TaskState = {
  /** The task is currently transferring data. */
  RUNNING: 'running',
  /** The task was paused by the user. */
  PAUSED: 'paused',
  /** The task completed successfully. */
  SUCCESS: 'success',
  /** The task was canceled. */
  CANCELED: 'canceled',
  /** The task failed with an error. */
  ERROR: 'error'
};

export function taskStateFromInternalTaskState(
  state: InternalTaskState
): TaskState {
  switch (state) {
    case InternalTaskState.RUNNING:
    case InternalTaskState.PAUSING:
    case InternalTaskState.CANCELING:
      return TaskState.RUNNING;
    case InternalTaskState.PAUSED:
      return TaskState.PAUSED;
    case InternalTaskState.SUCCESS:
      return TaskState.SUCCESS;
    case InternalTaskState.CANCELED:
      return TaskState.CANCELED;
    case InternalTaskState.ERROR:
      return TaskState.ERROR;
    default:
      // TODO(andysoto): assert(false);
      return TaskState.ERROR;
  }
}
