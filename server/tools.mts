import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

export function getCurrentTime(timeZone: string) {
  const now = new Date();
  return {
    iso: now.toISOString(),
    localTime: new Intl.DateTimeFormat('zh-CN', {
      timeZone, dateStyle: 'full', timeStyle: 'long',
    }).format(now),
    timeZone,
  };
}

export const currentTimeTool = toolDefinition({
  name: 'get_current_time',
  description: '获取指定 IANA 时区的真实当前时间。回答当前日期或时间前必须调用此工具。',
  inputSchema: z.object({ timeZone: z.string().describe('IANA 时区，例如 Asia/Shanghai 或 UTC') }),
  outputSchema: z.object({ iso: z.string(), localTime: z.string(), timeZone: z.string() }),
}).server(async ({ timeZone }) => getCurrentTime(timeZone));
