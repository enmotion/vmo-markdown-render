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
| flushDelay | 1000 | 0–60000 毫秒；0 表示仅按标点、长度和 finish 分段 |
| voiceTimeout | 3000 | 等待异步声音列表的毫秒数，0–60000 |

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

## 生命周期与完成信号

| 状态 | 含义 |
| --- | --- |
| idle | 新建或 reset 后，尚无文本 |
| buffering | 等待完整片段、本地声音、合成器启动，或等待后续输入；不等于正在发声 |
| speaking | 收到当前 utterance 的 start 事件 |
| paused | 暂停消费队列；输入和分段仍继续 |
| ended | 已调用 finish，且所有片段正常播放完毕；包含空文本流 |
| stopped | stop 主动终止，本轮已关闭 |
| error | 选声、占用或播放失败，本轮已关闭 |
| disposed | 实例销毁；重新使用需创建新实例 |

`append()` / `update()` 返回 void，只负责接收文本，不等待播放，也不提供背压。输入速度快于朗读速度时，待播队列会增长；`maxChunkLength` 仅限制**每段长度**，不是队列总量或整条消息的长度限制。暂停同样不限制队列，宿主需决定是否继续接收网络内容。

只有 `finish()` 会明确关闭正常文本流；最后一段读完但没有 finish 时，实例仍可处于 buffering 并继续接收文本。`finish()` 调用后马上拒绝后续输入，不必等到 ended；暂停期间 finish 的 Promise 会等待 resume 后排空队列。正常完成触发 end，stop/reset/dispose 不触发 end。已 ended 的 finish 直接兑现；已 stopped 的 finish 拒绝为 canceled，失败后的 finish 拒绝为原错误。

`snapshot` 每次读取都得到普通对象快照，不是 Vue 响应式状态；在 Vue 中用 ref 接收 change/statechange，并在卸载时 dispose。`queuedChunks` 不包含正在播放的 currentText 和尚未分段的 bufferedText；chunk.index 从 0 开始，每次 reset 归零。`change` 可能在状态不变时多次触发，`statechange` 仅在状态值变化时触发。事件不会重放订阅前的历史值，初始状态从 state/snapshot/getVoices 读取。

## 接入 LLM 文本流与取消

下面是**宿主辅助函数**，不是库的额外导出。它只接受已完成网络解码、SSE/JSON 解析后的纯文本增量；网络请求与协议解析由业务实现。新请求先 reset，用代次标记拦截旧请求的迟到片段，并在流结束后等待实际播完。调用方仍需捕获 read() 的拒绝，显示网络/朗读错误。

<<< ../examples/read-tts-stream.ts

在浏览器挂载后创建 reader，由用户按钮触发 `reader.read(chunks)`；`reader.tts.on(...)` 可绑定播放状态。取消或切换消息时调用 `reader.stop()`，组件卸载时调用 `reader.dispose()`。还应通过宿主的 AbortController 取消原网络请求；stop 只终止声音，不能中断外部网络流等待。示例的代次检查在下一片到达时退出旧迭代，不会把旧结果送入新一轮 TTS。

累计全文来源可改为同一轮只调用 `tts.update(fullText)`；不要同时调用 append。Render 的 content 可以持续接收累计 Markdown，TTS 则应接收宿主提取后的朗读文字。不要在每个网络 token 到来时 reset/重建实例，也不要每片都调用 finish，否则会关闭输入或反复从头朗读。对需要重写前文的模型输出，应明确停止并开启新一轮，而不是继续 update。

## 错误通道与恢复

`LocalTtsError` 是公开的 Error 子类，包含字符串 code。错误分为三种接收方式：

| 来源 | 接收方式 | 常见错误码 |
| --- | --- | --- |
| 构造参数校验、输入方式/前缀校验、关闭后写入、销毁后调用 | 同步 try/catch；不触发 error 事件 | invalid-option / input-mode / non-append-update / stream-closed / disposed |
| ready 等待能力/声音 | Promise 拒绝；单独调用 ready 失败不会自动转为播放 error 事件 | unsupported / voice-unavailable / canceled |
| 队列选声、通道占用、合成器播放 | error 事件；待完成的 finish 也会拒绝 | unsupported / voice-unavailable / busy / synthesis-failed / 浏览器原始错误码 |

reset/stop/dispose 会使尚未完成的 ready/finish 拒绝为 canceled，但主动取消本身不触发 error 事件。订阅 error **不能代替**处理 finish/ready 的 Promise，也不能捕获同步参数错误。同步校验错误不会自动销毁实例；播放错误需 reset 后才能接收新流，不会自动重播失败段落。dispose 后除幂等 dispose 与只读访问外不要再调用实例方法。

数值选项必须是有限值且在表内范围内，否则构造函数同步抛出 invalid-option，不会自动夹取到边界；maxChunkLength 校验后向下取整。lang/voiceURI 不匹配本地列表时，不会改用同语言的其他区域或远端声音。`ready()` 只等待声音，不安装语音包、不预留播放通道，也不等于获得自动播放授权。浏览器可能在 speak 时仍报 not-allowed；应保留用户触发的播放入口。

## 环境与资源边界

TTS 使用系统/浏览器列出的本地声音，ASR 的识别语言包无法代替它。类没有安装声音、导出音频、进度到字或音素时间戳、SSML 解析功能。分段首尾空白会被裁掉，只有空白的片段不朗读；Markdown 标记、代码或 URL 不会自动清洗。

SSR 中构造不会访问缺失的 window，但得到的实例 supported=false；该实例不会在水合后自动绑定浏览器，需要在客户端新建。类本身不依赖 Vue 组件，但从当前包入口导入仍需满足包的 Vue peer dependency 和构建约定，不应据此推断存在独立无 Vue 子包。

独占从实际提交语音片段开始；已经占用的实例即使暂停或等待后续输入，也要 finish、stop、reset 或 dispose 才释放。没有排队等待 busy 或抢占其他实例的机制。真正的中文发音、离线能力、系统声音安装和设备播放限制需人工验证，见 [测试与兼容性](./testing#语音与图片预览的人工验收)。类型见 [公共类型](../api/types#本地-tts-类型)。
