import type { MentionOption, MentionShortcut, MentionTrigger } from 'vmo-markdown-render';

export const triggers: MentionTrigger[] = [
  { character: '@', source: 'member' },
  { character: '#', source: 'knowledge' },
  { character: '/', source: 'agent' },
];
export const shortcuts: MentionShortcut[] = [
  { source: 'member', keys: { ctrl: true, key: 'u' } },
  { source: 'knowledge', keys: { ctrl: true, key: 'k' } },
  { source: 'agent', keys: { ctrl: true, key: 'j' } },
];
const candidates: MentionOption[] = [
  { source: 'member', value: 'user-lin', label: '林见微', kind: '成员', data: { initials: 'ljw' } },
  { source: 'member', value: 'user-su', label: '苏晚棠', kind: '成员', data: { initials: 'swt' } },
  { source: 'knowledge', value: 'kb-product', label: '产品知识库', kind: '知识库', data: { initials: 'cpzsk' } },
  { source: 'knowledge', value: 'kb-archive', label: '归档知识库', kind: '知识库', disabled: true },
  { source: 'agent', value: 'agent-writing', label: '写作助手', kind: '智能体', data: { initials: 'xzzs' } },
];
export function optionsFor(source: string | undefined): MentionOption[] {
  return candidates.filter(option => option.source === source);
}
/** 示例首字母由业务数据提供；组件本身不含拼音转换。 */
export function matchInitials(query: string, option: MentionOption): boolean {
  const keyword = query.toLocaleLowerCase();
  return [option.label, option.value, String(option.data?.initials ?? '')]
    .some(value => value.toLocaleLowerCase().includes(keyword));
}
/** 演示用异步服务，不访问真实接口。未传 query 返回分类全集，传 query 模拟服务端过滤。 */
export async function requestCandidates(source: string | undefined, query?: string): Promise<MentionOption[]> {
  await new Promise(resolve => setTimeout(resolve, 250));
  const result = optionsFor(source);
  return query === undefined ? result : result.filter(option => matchInitials(query, option));
}
