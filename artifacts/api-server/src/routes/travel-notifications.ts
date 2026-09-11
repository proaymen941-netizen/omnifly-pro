import { db } from "../lib/sqlite";
import { logger } from "../lib/logger";

export async function triggerTravelNotificationEvent(eventOrOptions: any, payload?: any): Promise<void> {
  try {
    const event = typeof eventOrOptions === 'string' ? eventOrOptions : eventOrOptions?.event_trigger || 'notification';
    const data = typeof eventOrOptions === 'object' ? eventOrOptions : payload;
    logger.info({ event, data }, "Travel notification event triggered");
  } catch (err) {
    logger.error({ err }, "Error triggering travel notification event");
  }
}
