import type { PortalUser } from '@/lib/auth';

export const isGuid = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

export const getGroupTagColor = (group: string, user?: PortalUser | null): string => {
  const detail = user?.group_details?.find((d) => d.name === group || d.id === group);
  if (detail?.color) return detail.color;

  const g = group.toLowerCase();
  if (g.includes('admin') || g.includes('管理')) return 'magenta';
  if (g.includes('mod') || g.includes('协管') || g.includes('staff')) return 'volcano';
  if (g.includes('vip') || g.includes('赞助')) return 'gold';
  if (g.includes('dev') || g.includes('开发')) return 'purple';
  return 'geekblue';
};

export const formatTime = (isoString?: string | null): string => {
  if (!isoString) return '暂无记录';
  try {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
};
