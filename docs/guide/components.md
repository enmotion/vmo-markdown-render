# 组件注入

有两条入口：Markdown 中有明确标签时使用 `components`；需要识别正文业务编号时使用 `textRules`。两者都渲染真实 Vue 组件，能够响应更新并使用 Vue 的依赖注入。

## 注册并渲染标签

```vue
<script setup lang="ts">
import { MarkdownRender } from 'vmo-markdown-render';
import UserCard from './UserCard.vue';

const components = { 'user-card': UserCard };
const content = '<user-card user-id="42">查看用户</user-card>';
</script>

<template>
  <MarkdownRender :content="content" :components="components" />
</template>
```

业务组件 `UserCard.vue`：

```vue
<script setup lang="ts">
defineProps<{ userId: string }>();
</script>

<template>
  <span class="user-card">
    用户 {{ userId }} · <slot />
  </span>
</template>
```

也支持 `<user-card user-id="42" />`。仅注册过的标签会变成组件，未知标签保留为可读文本。使用精确的小写 kebab-case 名称。

## 属性与插槽边界

- 属性值必须用单引号或双引号包裹，传入值都是字符串；`user-id` 可对应 Vue prop `userId`。
- 数字、布尔、对象不会自动转换；需要由业务组件解析，或使用正则组件规则传入实际 JS 值。
- 不支持 Vue 模板指令、表达式或事件绑定，不要写 `:user-id="id"`、`@click="handler"` 或 `v-bind`。这不是可执行 Vue 模板，指令不会按 Vue 语义执行。
- 属性过滤会拒绝以 `on`、`v-` 开头的名称，以及 `style`、`is`、`ref`、`key`、`innerhtml`。业务组件仍需自行校验收到的数据。
- 标签正文仅作为纯文本默认插槽，不解析其中的 Markdown、嵌套业务标签或具名插槽。

独占段落的单个业务标签直接渲染；正文行内组件建议以 `span`、`button` 等行内元素为根节点。

## provide / inject 与业务交互

宿主可以提供服务或回调，注入组件按普通 Vue 后代组件使用 `inject`。渲染器不会创建应用级服务或固定的注入 key。

宿主组件：

```vue
<script setup lang="ts">
import { provide } from 'vue';
import { MarkdownRender } from 'vmo-markdown-render';
import UserCard from './UserCard.vue';

provide('open-user', (id: string) => console.log('打开用户', id));
const components = { 'user-card': UserCard };
</script>

<template>
  <MarkdownRender content='<user-card user-id="42" />' :components="components" />
</template>
```

对应的 `UserCard.vue`：

```vue
<script setup lang="ts">
import { inject } from 'vue';
defineProps<{ userId: string }>();
const openUser = inject<(id: string) => void>('open-user');
</script>

<template>
  <button type="button" @click="openUser?.(userId)">打开用户 {{ userId }}</button>
</template>
```

大型项目建议使用共享的 `InjectionKey` Symbol。标签内不能声明事件监听；需要监听组件 emit 时，可通过 [正则规则的 props 或 h()](./text-rules) 传入 `onXxx` 回调，也可通过上述注入回调通信。

## 生命周期与流式内容

完整的自闭合标签或成对标签到达后才挂载，残缺标签先显示为文本。正常尾部追加会保持已有组件实例；修改前文、改变节点位置或注册表可能使组件重新挂载，不能依赖跨任意编辑的实例持久性。

请求放在业务组件的生命周期或 watch 中，自行管理加载、失败、重试和卸载取消；不要在规则回调或渲染函数中直接发请求。注册表建议保持稳定；若把组件定义放入深层响应式对象，应按 Vue 规范使用 `markRaw` 或 `shallowRef`。

模型侧的可直接复制约束、成对/自闭合格式和宿主白名单声明模板见 [提示词中的组件格式约束](./model-prompts#自定义组件格式约束-提示词必读)。简版与详细版均包含该约束。
