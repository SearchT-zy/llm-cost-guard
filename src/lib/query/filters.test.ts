import { describe, expect, it } from 'vitest';
import { logWhere, parseLogFilters } from './filters';

describe('parseLogFilters 白名单解析', () => {
  it('默认值：page=1 / pageSize=50', () => {
    const f = parseLogFilters({});
    expect(f.page).toBe(1);
    expect(f.pageSize).toBe(50);
  });

  it('合法字段通过', () => {
    const f = parseLogFilters({
      projectId: 'p1',
      model: 'deepseek-chat',
      status: 'SUCCESS',
      from: '2026-08-01',
      to: '2026-08-18',
    });
    expect(f.projectId).toBe('p1');
    expect(f.status).toBe('SUCCESS');
    expect(f.fromDay).toBe('2026-08-01');
  });

  it('status 白名单外丢弃；日期格式非法丢弃', () => {
    const f = parseLogFilters({ status: "SUCCESS' OR 1=1", from: '2026/08/01', to: 'abc' });
    expect(f.status).toBeUndefined();
    expect(f.fromDay).toBeUndefined();
    expect(f.toDay).toBeUndefined();
  });

  it('分页钳制：page≥1、pageSize∈[1,200]', () => {
    expect(parseLogFilters({ page: '-5', pageSize: '99999' })).toMatchObject({
      page: 1,
      pageSize: 200,
    });
    expect(parseLogFilters({ page: 'abc' }).page).toBe(1);
  });
});

describe('logWhere', () => {
  it('组合条件', () => {
    const w = logWhere({
      page: 1,
      pageSize: 50,
      projectId: 'p',
      status: 'SUCCESS',
      fromDay: '2026-08-01',
      toDay: '2026-08-18',
    });
    expect(w).toEqual({
      projectId: 'p',
      status: 'SUCCESS',
      day: { gte: '2026-08-01', lte: '2026-08-18' },
    });
  });

  it('空条件为空对象（不加任何过滤）', () => {
    expect(logWhere({ page: 1, pageSize: 50 })).toEqual({});
  });
});
