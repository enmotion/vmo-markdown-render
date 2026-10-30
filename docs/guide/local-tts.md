# 本地流式 TTS：LocalTts 类

`LocalTts` 是可以直接 `new` 的 TypeScript 类，核心不依赖 Vue 组件。它使用浏览器 `speechSynthesis`，仅选择 `localService === true` 的声音；没有适合的本地声音时报告错误，不会自动选择远端服务。设备需要先安装相应系统语音包，离线效果应在目标浏览器验证。

## 快速使用

```ts
import { LocalTts } from 'vmo-markdown-render';

const tts = new LocalTts({ lang: 'zh-CN', rate: 1 });
tts.on('error', error => console.error(error.code, error.message));

// 由点击按钮等用户操作启动。接入 LLM 时，将新增文本逐段传入。
tts.append('你好，这是第一句。');
tts.append('后面的文字还在生成。');
tts.append('没有标点的尾段');
await tts.finish(); // 补读尾段，并等待所有片段实际播放结束。

tts.reset(); // 开始下一条消息前清空上一轮状态。
tts.append('新消息。');
await tts.finish();
tts.dispose(); // 页面或组件卸载时释放资源。
```

首次 `getVoices()` 可能为空。实例监听 `voiceschanged` 更新列表，也提供 `ready()` 等待指定本地声音，默认最多 3 秒。自动选声要求语言精确匹配（忽略大小写和下划线/连字符差异）；传入 `voiceURI` 可以显式选择列表中的其他本地声音，朗读语言跟随该声音。

## 实际试用

项目开发页顶部选择“本地 TTS”，或访问 `/?view=tts`。完整演示提供声音、语速、缓冲上限、增量/累计输入以及分段日志。下面是精简版：

<script setup>
import LocalTtsDemo from '../examples/LocalTtsDemo.vue';
</script>

<ClientOnly><LocalTtsDemo /></ClientOnly>

<<< ../examples/LocalTtsDemo.vue

## 增量与累计全文

每一轮只能选择一种输入方式：

```ts
// 增量：每次仅传入新到的片段。
tts.append('第一');
tts.append('句。');
```

```ts
// 累计全文：内部只处理新增后缀；重复回写相同全文不会重播。
tts.update('第一');
tts.update('第一句。');
tts.update('第一句。第二句。');
await tts.finish();
```

`append` 和 `update` 不可混用。`update` 的全文必须保持追加关系；改写或缩短已接收文本会同步抛出 `non-append-update`，避免把已经播出的内容重新朗读。新消息使用 `reset()`；停止、结束或失败后收到的迟到片段不会自动重启播放。

## 分段与播放

收到完整中文句末标点、问号、感叹号、分号、换行，或英文句点后接空白时，就可以提交片段。尾部英文句点暂留在缓冲区，防止将 `3.` + `14` 拆错。长片段按 Unicode 码点限制长度，并优先在单词或短语边界切分。

没有标点时，缓冲最长等待 `flushDelay` 后提交；新片段不会无限延长这个等待。`finish()` 立即补交剩余文字，再等待播放完成。一次只向浏览器提交一个片段，后续片段保存在实例队列里。

这实现的是分段连续播报。段间停顿、语调和开播速度取决于系统合成器，不保证无缝音频。输入应为纯文本；需要朗读 Markdown 时由宿主先提取正文。本类不提供音频文件或 PCM 音频流。

## 配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| lang | 'zh-CN' | 自动选声的语言 |
| voiceURI | 未指定 | 显式选择本地声音，覆盖自动选声 |
| rate | 1 | 语速，0.1–10；声音实际支持范围由系统决定 |
| pitch | 1 | 音高，0–2 |
| volume | 1 | 音量，0–1 |
| maxChunkLength | 80 | 每段最多 Unicode 码点数，2–1000 |
| flushDelay | 1000 | 缓冲最长等待毫秒数；0 表示仅按标点、长度和 finish 分段 |
| voiceTimeout | 3000 | 等待异步声音列表的毫秒数 |

配置在创建实例时确定；更换配置应销毁旧实例再创建新实例。`supported` 只表示浏览器提供合成接口，不保证所需本地声音存在。

## 方法与事件

| 方法 | 行为 |
| --- | --- |
| append(delta) | 接收新增文本 |
| update(fullText) | 接收累计全文，仅处理新增后缀 |
| `finish(): Promise<void>` | 关闭本轮输入、补读尾段；全部读完后兑现，停止或失败时拒绝 |
| pause() / resume() | 暂停/恢复播放，暂停时仍可接收和分段 |
| stop() | 停止播放，丢弃缓冲和队列，关闭本轮输入 |
| reset() | 取消上一轮并恢复可接收新消息的初始状态 |
| dispose() | 停止并移除事件监听，销毁后不能再使用；可重复调用 |
| getVoices() | 返回当前已加载的本地声音列表副本 |
| refreshVoices() | 重新读取本地声音列表 |
| `ready(): Promise<SpeechSynthesisVoice>` | 等待指定本地声音，超时或销毁时拒绝 |
| on(event, listener) | 订阅事件，返回取消订阅函数 |

事件包括 `change(snapshot)`、`statechange(state)`、`voiceschange(voices)`、`chunkstart(chunk)`、`chunkend(chunk)`、`end` 和 `error(LocalTtsError)`。`chunkstart` 来自合成器的开始事件；`chunkend` 表示该段正常结束。`snapshot` 提供 `state / bufferedText / currentText / queuedChunks`。

状态为 `idle / buffering / speaking / paused / ended / stopped / error / disposed`。`buffering` 也包括等待声音或合成器开始播放的阶段。常见错误码为 `unsupported`、`voice-unavailable`、`busy`、`canceled`、`stream-closed`、`non-append-update`，以及合成器返回的 `not-allowed` 等错误。处理 `finish()` 的拒绝，避免未处理的 Promise；`stop/reset/dispose` 引起的 `canceled` 通常属于预期取消。

浏览器朗读通道是页面共享的。类实例之间采用独占方式：当前实例占用后，其他实例会收到 `busy`，直到当前流 finish 完成或被停止/销毁；空闲实例停止或销毁不会取消其他实例。宿主的其他 `speechSynthesis` 调用也应协调使用同一通道。
