# 语音输入 SpeechInput

`SpeechInput` 是无内置界面的语音输入控制组件，使用浏览器 Web Speech API，不需要项目后端或 API Key。它只渲染一个事件容器和默认作用域插槽，按钮、提示、安装入口与布局均由宿主提供。可以包裹 `MarkdownInput`，也可以为自定义按钮绑定按住说话事件。

```vue
<SpeechInput meter v-slot="{ recording, level, busy, canStart, state, hold }" @result="onText">
  <button v-bind="hold" type="button" aria-label="按住说话"
    :aria-pressed="recording" :disabled="!canStart && !busy || state === 'stopping'"
    style="touch-action:none;user-select:none">
    {{ recording ? '松开结束' : '按住说话' }}
  </button>
  <SpeechWave v-if="recording" :active="recording" :level="level" :colors="['#6366f1', '#06b6d4']" />
</SpeechInput>
```

`recording` 只在识别引擎已经进入 `listening` 时为 `true`，启动和收尾时均为 `false`；需要覆盖整个过程时使用 `busy`，需要区分具体阶段时使用 `state`。旧版内置控件已移到演示的插槽中，不再由组件自动渲染。

<script setup>
import InputSpeech from '../examples/InputSpeech.vue';
import SpeechWavePreview from '../examples/SpeechWavePreview.vue';
</script>

<ClientOnly><InputSpeech /></ClientOnly>

<<< ../examples/InputSpeech.vue

## 操作与识别方式

- 自定义按钮绑定 `v-bind="hold"` 后，按住按钮说话，松开停止采集；聚焦该按钮后，也支持按住空格或 Enter。按钮的文字、禁用态和辅助名称由宿主设置。触摸操作应配置 `touch-action: none`。
- 设置 `enabled` 后，在默认插槽内的可编辑区域按住空格说话。不开启时保留正常空格输入。
- 录音期间可显示插槽中的 `transcript`，最终结果在服务结束后通过 `result` 输出一次。预览不应直接写入正文，避免重复文字与撤销记录。
- Esc、取消按钮、窗口失焦、页面隐藏、指针取消、禁用或卸载会放弃当前识别结果。最长采集一分钟；启动和结束阶段有超时保护。
- 空格不会接管普通表单控件、输入法组词、带修饰键的快捷键或展开的 mention 查询。多个组件只响应各自插槽内的键盘操作。

默认 `mode="local"` 强制本地识别。组件检查本地 API 和指定语言包；宿主可在 `availability === 'downloadable'` 时显示按钮，点击时调用插槽中的 `install()`。安装完成后可离线转写，不会自动降级为联网识别。浏览器、操作系统及语言包的支持情况不同，`zh-CN` 不保证可用。

识别语言包由浏览器的本地识别组件管理，网页不能指定安装目录，也不会写入项目或 `node_modules`。以 macOS 的 Chrome 为例，其用户数据目录通常为 `~/Library/Application Support/Google/Chrome`，SODA 引擎及语言模型由组件系统管理在 `SODA`、`SODALanguagePacks` 等目录中；浏览器、版本或自定义用户数据目录会影响具体位置。这与 macOS 的 TTS 朗读声音是两套资源。

安装请求显式传入 `processLocally: true`。Chrome 在缺少该参数时会返回 `false`，即使目标语言包可下载。调用直接发生在安装按钮的点击处理内，保留用户操作授权：

```ts
await SpeechRecognition.install({ langs: ['zh-CN'], processLocally: true });
```

当 `availability` 是 `downloading` 时，宿主可显示下载状态，完成后调用 `refresh()` 重新检测。安装失败时，`error.cause` 保留浏览器提供的异常名称和消息，宿主按需显示错误详情。如果浏览器只返回 `false`，错误消息会明确说明未获得具体原因；不会直接把它归因于网络。页面的 `Permissions-Policy` 阻止本地识别时会提供单独的错误码与消息。

参考：[Chrome 用户数据目录](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md)、[SODA 组件路径](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/soda/constants.cc)、[浏览器安装示例](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API#checking_availability_and_installing_language_packs)。

`mode="browser"` 使用浏览器默认服务，语音可能由浏览器厂商的远端服务处理，网络不可达时可能失败。宿主应按所选模式说明处理方式。浏览器实现、麦克风授权和 HTTPS / localhost 环境都会影响可用性；组件不会加载额外的 ASR 模型。

## 关键词与热词

`keywords` 接受字符串或 `{ phrase, id?, boost? }` 数组。它默认只用于**转写后的文字匹配**：对文本和关键词做 NFKC 归一化、忽略空白与大小写的子串匹配，每个配置项至多触发一次 `keyword` 事件。命中只通知宿主，不自动执行清空、发送等操作。匹配在设备上执行，与识别服务是否支持热词无关；本地和浏览器服务模式都可使用。匹配不会纠正听错的字，也不会把未识别出的专有名词自动补进正文。

**热词增强**通过 `:boost-keywords="true"` 单独开启，默认关闭。开启后，仅当浏览器同时提供 `phrases` 和 `SpeechRecognitionPhrase` 时，才把同一列表作为识别提示提交给引擎；`boost` 默认 5，限制在 0–10。接口存在只说明可以尝试请求，不能证明当前语言、模型或服务支持增强，更不保证词语一定识别正确。

插槽的 `keywordBoost` 会区分“接口不可用”“已提交提示”和“服务拒绝增强”。没有接口或设置提示失败时，仍可进行普通转写。如果服务在启动后返回 `phrases-not-supported`，这一轮会结束并通过 `error` 提供重试说明；后续录音停用增强，继续使用当前识别模式并在转写后匹配关键词，不会自动切换联网服务。切换语言、模式、重新检测或重新切换增强开关时，可以再次尝试。

例如关键词 `Markdown` 可以匹配转写结果 `mark down`，但不能推断同音误识别的汉字。这两种能力都不等于离线唤醒词检测。

## 自动标点与基础断句

`punctuation` 默认开启。浏览器支持实验性的 [`unspokenPunctuation`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/unspokenPunctuation) 时，会将它设为 `true`，请求引擎根据停顿、语法和语调推断逗号、句号和问号。

同时提供基础断句：对引擎返回的每个最终识别分段，中文和日文在缺少末尾标点时补 `。`，其他语言补 `.`，并保留引擎已有的标点。未完成的临时预览不会提前补句号；英文分段之间保留空格。设置 `:punctuation="false"` 可以关闭补标点，并在浏览器支持该开关时关闭原生自动标点；引擎本来返回的标点仍会保留。

例如最终分段为 `['今天天气不错', '我们出发吧！']`，输出为 `今天天气不错。我们出发吧！`。这些分段不一定等于自然句子；如果引擎把整段话返回为一个分段，基础处理只会在末尾补句号。原生自动标点的效果取决于浏览器、服务和语言；不支持时，准确的语义标点恢复需要另接模型。

## Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| enabled / v-model:enabled | boolean | false | 开启插槽内可编辑区域的空格按住说话；hold 绑定独立可用 |
| disabled | boolean | false | 禁用录音操作并取消当前识别 |
| mode | 'local' \| 'browser' | 'local' | 强制本地或使用浏览器服务 |
| lang | string | 'zh-CN' | 识别语言；修改时取消当前识别并重新检测 |
| punctuation | boolean | true | 请求原生自动标点，并按最终识别分段补缺失句号 |
| keywords | (string \| SpeechKeyword)[] | [] | 转写后的文字关键词匹配 |
| boostKeywords | boolean | false | 单独请求实验性的热词增强；不影响关键词匹配 |
| meter | boolean | false | 采样真实麦克风音量，通过插槽 level 输出；需要麦克风权限 |

## 事件、方法与插槽

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| update:enabled | boolean | 模式开关变化 |
| start | 无 | 已请求启动，适合保存编辑器选区；仍可能等待麦克风授权 |
| interim | string | 当前完整识别预览，包含已确定与临时片段 |
| result | string | 服务结束后的完整最终文字，取消和失败时不输出 |
| keyword | { keyword: SpeechKeyword, transcript: string } | 命中的关键词与完整文字 |
| state-change | SpeechInputState | idle / checking / installing / starting / listening / stopping / error |
| error | { code: string, message: string, cause?: { name: string, message: string } } | 能力、语言包、权限、网络或识别错误；cause 保留浏览器异常 |
| level-error | SpeechInputError | 独立的音量采样错误，不终止原生识别；level 保持 0 |

实例方法：`start()` 请求启动并返回是否接受启动请求，`stop()` 结束采集并等待结果、`cancel()` 放弃当前结果、`install()` 请求安装、`refresh()` 重新检测。实例也暴露 `state`、`recording`、`level`、`levelState`、`levelError`。不要同时从实例方法与键盘/指针操作控制同一轮录音。

默认插槽类型为 `SpeechInputSlotProps`：

| 插槽字段 | 说明 |
| --- | --- |
| recording | 当前是否正在录音，仅 listening 为 true |
| level | 真实麦克风音量，归一化为 0–1；需开启 meter，未采样时为 0 |
| levelState / levelError | 采样状态 idle / requesting / active / error，以及独立的采样错误 |
| state / busy / canStart | 完整状态、是否处于启动/录音/收尾、是否可以开始 |
| transcript / error | 当前预览文字和错误信息 |
| availability / keywordBoost | 语言包与热词增强状态 |
| enabled / disabled | 当前开关和禁用配置 |
| start / stop / cancel | 启动、结束采集、放弃结果 |
| install / refresh | 安装语言包、重新检测 |
| setEnabled(value) | 发出 update:enabled，配合 v-model:enabled 使用 |
| hold | 自定义按钮的指针、键盘与取消事件绑定 |

`keywordBoost` 为 `off / unavailable / ready / requested / rejected`，其中 `ready` 仅表示检测到接口，`requested` 仅表示已提交提示。空格监听范围仅在组件内部；组件不提供内置按钮样式或文案，宿主自行控制插槽内容。

与 `MarkdownInput` 组合时，在 `start` 保存选区，在 `result` 调用 `insertText(text, true)`，第二个参数表示使用已保存的选区。示例在识别期间临时只读，防止正文在转写时发生变化；插入走现有编辑历史，可撤销并保留 mention 节点。

## 独立 Canvas 波纹 SpeechWave

`SpeechWave` 可以独立使用，通过 `active` 开关动效，通过 `colors` 配置渐变。`level`（0–1）控制幅度，默认 0，即静音基线。组件自身不采集麦克风，也不会额外申请权限。

与 `SpeechInput` 组合时开启 `meter`，将插槽 `level` 传给 `SpeechWave`，即可随实际声音强弱变化。原生语音识别不暴露其音频轨道，因此音量采样会额外请求一个仅音频的 `getUserMedia` 流，再通过 Web Audio 的 `AnalyserNode` 计算 RMS。采样本身在设备上执行，不保存或上传音频，不连接扬声器；识别音频的处理位置仍由 `mode` 决定。

`level` 使用约 -60–0 dBFS 映射并平滑到 0–1，反映当前麦克风输入强弱，并非校准后的声压级。采样采用快速起音、短回落，绘制端直接使用音量，避免二次平滑拖慢响应。波形形状是 Canvas 绘制的动效，幅度由实测音量驱动，不是逐采样的原始音频波形。松手、取消、识别结束或失败、禁用与卸载会停止采样并释放流；即使授权窗口在停止后才返回，也会立即释放新获准的流。采样不可用时，单独通过 `levelError` 和 `level-error` 报错，不用模拟音量替代，也不阻断原生转写。

下面的独立预览用滑杆手动模拟输入强度，不申请麦克风；上方语音输入示例已接入真实音量。

<ClientOnly><SpeechWavePreview /></ClientOnly>

<<< ../examples/SpeechWavePreview.vue

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| active | false | 是否播放波纹动效；关闭时绘制静态基线 |
| colors | ['#6366f1', '#a855f7', '#38bdf8'] | Canvas 支持的颜色字符串数组；单色或多色渐变 |
| level | 0 | 音量输入，0–1；越大幅度越大，缺省或静音时不产生模拟起伏 |
| height | 56 | CSS 高度，限制在 12–320 px；宽度跟随容器 |
| speed | 1 | 动效速度倍率，限制在 0–5；0 表示静态形状，仍随音量改变幅度 |
| intensity | 1.5 | 视觉强度，限制在 0–3；提高时放大小音量起伏，不改变实测 level，0 显示基线 |

默认波纹采用更密集的多频起伏，并以软增益增强普通说话音量。希望更强、更快时可设置 `:intensity="2" :speed="1.5"`。强度限制在画布内，不会因放大而裁掉波峰。

波纹在关闭、静音平稳后、卸载、页面隐藏时停止帧循环，并尊重系统“减少动态效果”偏好（仍按音量更新幅度，停止自动流动）。Canvas 按设备像素比适配（最高 2 倍）。

音量采样参考：[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)、[读取音频采样值](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData)、[释放音频轨道](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop)。

原生能力参考：[SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)、[本地识别](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API#on-device_speech_recognition)、[热词提示](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/phrases)。自动化测试使用模拟识别服务；真实麦克风、中文准确率与离线可用性需要在目标浏览器试用。
