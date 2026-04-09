/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { qwenApiLogger } from '../providers/qwen/qwenLogger.js';

export enum QwenOperationType {
  GENERATE = 'generate',
  STREAM = 'stream',
  COUNT_TOKENS = 'countTokens',
  EMBED = 'embed',
}

export interface QwenErrorInfo {
  error: string;
  operationType: QwenOperationType;
  endpoint: string | null;
  requestId?: string;
}

export function handleQwenApiError(
  error: unknown,
  operationType: QwenOperationType,
  endpoint: string | null,
  requestId?: string,
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: QwenErrorInfo = {
    error: errorMessage,
    operationType,
    endpoint,
    requestId,
  };

  // Log the error using the existing Qwen API logger
  qwenApiLogger.logError(endpoint || 'unknown', 'POST', {
    message: errorMessage,
    operationType,
    requestId,
  });

  console.error('Qwen API Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
