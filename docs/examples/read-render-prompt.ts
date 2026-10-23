// Node.js 服务端示例；不在浏览器组件中执行。
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export async function readRenderPrompt(version: 'simple' | 'detailed', language: 'zh-CN' | 'en-US') {
  const file = require.resolve(`vmo-markdown-render/docs/public/prompts/render-${version}.${language}.md`);
  return readFile(file, 'utf8');
}

export async function buildModelMessages(question: string) {
  const protocol = await readRenderPrompt('simple', 'zh-CN');
  return [
    { role: 'system' as const, content: protocol },
    { role: 'user' as const, content: question },
  ];
  // 将消息传给宿主自己的模型请求适配层；这里不调用任何模型接口。
}
