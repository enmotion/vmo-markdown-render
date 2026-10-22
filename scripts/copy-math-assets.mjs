import { copyFile, cp } from 'node:fs/promises';
// 字体保持独立资源，避免 Vite 库模式把全部字体内联进基础主题。
await copyFile('node_modules/katex/dist/katex.min.css', 'dist/math.css');
await cp('node_modules/katex/dist/fonts', 'dist/fonts', { recursive: true });

await copyFile('node_modules/katex/LICENSE', 'dist/KATEX-LICENSE');
await copyFile('node_modules/@markmend/core/LICENSE.md', 'dist/MARKMEND-LICENSE.md');
