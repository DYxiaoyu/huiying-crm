import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export * as auth from './auth';
export * as customers from './customers';
export * as dashboard from './dashboard';
export * as followUps from './follow-ups';

export { logger, axiosForBackend };
