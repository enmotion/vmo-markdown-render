import { createApp, h } from 'vue';
import Local from '../../docs/examples/InputLocal.vue';
import Sync from '../../docs/examples/InputSync.vue';
import AsyncLocal from '../../docs/examples/InputAsyncLocal.vue';
import Remote from '../../docs/examples/InputRemote.vue';
import Events from '../../docs/examples/InputEvents.vue';
import Http from '../../docs/examples/InputHttpRemote.vue';
createApp({ render: () => h('main', [
  ...Object.entries({ local: Local, sync: Sync, async: AsyncLocal, remote: Remote, events: Events, http: Http })
    .map(([id, component]) => h('section', { 'data-case': id, style: 'width:600px;margin-bottom:50px' }, [h(component)])),
]) }).mount('#app');
