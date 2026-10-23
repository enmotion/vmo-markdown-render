import type { MentionOption } from 'vmo-markdown-render';

export async function requestCandidates(source: string | undefined, query?: string): Promise<MentionOption[]> {
  const params = new URLSearchParams();
  if (source !== undefined) params.set('source', source);
  if (query !== undefined) params.set('query', query); // 空字符串表示首次打开的默认结果。
  const response = await fetch(`/api/mention-options?${params}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const rows: { id: string; label: string; initials?: string }[] = await response.json();
  return rows.map(row => ({
    value: row.id,
    label: row.label,
    source, // 必须与触发入口的分类一致。
    data: { initials: row.initials ?? '' },
  }));
}
