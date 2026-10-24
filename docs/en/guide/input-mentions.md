# Mention candidates and filtering

The component emits search when candidates are needed and receives results through options. Data loading and text filtering are separate: supply data synchronously, or fetch it asynchronously and choose local or remote filtering.

## Separate loading from filtering

Input has no built-in getMention/getRemoteMention request method. It never fetches candidates itself. **Supply data through options and observe the current query through search**.

```text
Trigger / mention shortcut / openMention
 → search({ prefix, query, source, requestId })
 → host reads memory or requests an endpoint
 → host assigns MentionOption[] to options
 → component isolates source, then applies filterOption
 → selection updates v-model and emits select(option, context)
```

| Requirement | Loading | Where query is matched | Example |
| --- | --- | --- | --- |
| Local complete list | Constant/store/parent data | Component default label/value filter | [Minimal complete file](#local-complete-list-no-search-handler) |
| Local custom matching | Same list | Synchronous filterOption predicate | [Custom filter](#custom-local-filtering) |
| Fetch a complete category | Request/cache by source | Query stays local | [Async local](#asynchronous-loading-with-local-filtering) |
| Server-side search | Request by source + query | Server; filterOption=false | [Remote filter](#asynchronous-remote-filtering) |

Synchronous/asynchronous describes loading; local/remote filtering describes matching. filterOption=false neither fetches nor caches anything: it only disables the component's text matching.

## Local complete list: no search handler

This standalone Vue file passes all candidates directly. After an ASCII space, type @ for member or # for knowledge. The default filter matches label/value case-insensitively, not pinyin initials.

<ClientOnly><InputLocal /></ClientOnly>

<<< ../../examples/InputLocal.vue

A list fetched during page initialization works the same way. A search handler is optional when the complete list is already available; later examples use it to load a category or observe queries.

## Actual search payload and field mapping

```ts
function search(context: MentionSearch) {
  // Opening: { prefix: '@', source: 'member', query: '', requestId: 1 }
  // A later query: { prefix: '@', source: 'member', query: 'ljw', requestId: 4 }
  // Numbers are illustrative; each Input increments its own counter.
}
```

| Field | Meaning | Host use |
| --- | --- | --- |
| prefix | Trigger character; configurable for shortcuts, default @ | Search context only, not automatically part of the mention or sent text |
| source | Category, possibly absent for legacy prefix | Loading/category isolation; selection stores it as mention.type |
| query | Temporary search text, initially empty | Send it to remote search; it is not written into v-model/body |
| requestId | Per-instance search counter | Stale-result guard, not a server ID or an automatic HTTP parameter |

```text
Backend { id: 'user-lin', label: '林见微', initials: 'ljw' }
 → option { value: 'user-lin', label: '林见微', source: 'member', data: { initials: 'ljw' } }
 → v-model mention { id: 'user-lin', label: '林见微', type: 'member' }
```

Populate source or category-bound results will be hidden. kind is display metadata, not the category; default filtering does not inspect kind/data. See [events and keyboard examples](./input-events) for callback arguments and sent output.

## Choose a mode

| Mode | Data source | Filtering | filterOption |
| --- | --- | --- | --- |
| Synchronous default | Complete in-memory category | Case-insensitive label/value inclusion | Omit |
| Synchronous custom | Complete in-memory category | Host-supplied synchronous predicate | Function |
| Async loading, local filter | Fetch/cache a category's complete list | Component applies the latest query | Omit or function |
| Async remote filter | Server accepts source/query | Server | false |

filterOption=false disables only text filtering. Every mode still isolates categories: a member entry point shows only options with source='member'. Add source in your adapter if the server omits it.

## Shared data and trigger configuration

All examples below share input-data.ts:

<<< ../../examples/input-data.ts

requestCandidates is an asynchronous demonstration service, not a real network request. Without query it returns the category's full list; with query it simulates server-side filtering. A real HTTP replacement appears below.

- option.value becomes the mention's content.id.
- option.label is its display name.
- option.source becomes content.type and identifies the category.
- option.kind is a candidate display hint, not the persisted business category.
- data carries host metadata, such as initials. The component does not convert pinyin; default filtering does not read data.

## Synchronous candidates and default local filtering

Set the category's full options synchronously in search. Omit filterOption to use case-insensitive inclusion on label/value.

<script setup>
import InputLocal from "../../examples/InputLocal.vue";
import InputSync from '../../examples/InputSync.vue';
import InputAsyncLocal from '../../examples/InputAsyncLocal.vue';
import InputRemote from '../../examples/InputRemote.vue';
import InputLegacyPrefix from '../../examples/InputLegacyPrefix.vue';
</script>

<ClientOnly><InputSync /></ClientOnly>

<<< ../../examples/InputSync.vue

Type an ASCII space followed by @, use Ctrl+U, or click the member button. Search words stay in the panel and are not added to document content, v-model, or history.

## Custom local filtering

Enable the example's initials checkbox to pass matchInitials. The predicate signature is:

```ts
(query: string, option: MentionOption, prefix: string) => boolean
```

The third parameter identifies the entry character; category information is in option.source. Return a boolean synchronously. Put network requests in search, not in the predicate.

```vue
<MarkdownInput :options="options" :filter-option="matchInitials" @search="search" />
```

Set the prop back to undefined to restore the default local filter. false disables text filtering instead; they are different settings.

## Asynchronous loading with local filtering

Fetch a complete category list, without sending the query to the API. The example caches a Promise by source and reuses it when query changes. The component applies the latest query locally.

<ClientOnly><InputAsyncLocal /></ClientOnly>

<<< ../../examples/InputAsyncLocal.vue

Failed cache entries are removed so reopening can retry. latest prevents a slower response for an old category from replacing current data. The finally block also checks the sequence, so an old request cannot clear a newer loading state. In production, invalidate caches when permissions/data change. A page of results is not a complete dataset for full local search.

## Asynchronous remote filtering

Set filterOption=false. Send source and query to your API and display its results directly. The simulated server matches ljw/swt even though these strings do not occur in the labels or IDs; the component will not filter those results out again.

<ClientOnly><InputRemote /></ClientOnly>

<<< ../../examples/InputRemote.vue

The component does not perform requests, debounce, or cancellation. This example rejects stale responses through a sequence counter. Add debounce or AbortController in the host if needed. Closing the panel has no separate close event; new searches receive new requestId values.

### Replace the demonstration service with HTTP

The following requestCandidates implementation expects `{ id, label, initials? }[]`. The /api/mention-options endpoint is an example contract you must implement in your host:

<<< ../../examples/mention-http.ts

For local filtering, return the full category list. For remote filtering, apply query on the server. The server owns permissions and input validation. Catch network errors in search; the component's error event reports getter/setter conversion errors, not host request failures.

### Real HTTP: debounce, cancellation, stale results and retry

InputRemote.vue above uses a local delayed mock, so it works without a backend. This actual HTTP integration uses mention-http.ts; it is shown as source rather than running an absent endpoint on the docs site:

<<< ../../examples/InputHttpRemote.vue

Example endpoint contract:

```http
GET /api/mention-options?source=member&query=ljw
```

```json
[
  { "id": "user-lin", "label": "林见微", "initials": "ljw" }
]
```

- The host implements 200ms debounce; an empty query also loads initial candidates.
- A new query clears old options and aborts the previous request. generation guards results, errors and finally even if cancellation is late.
- Input requestId identifies a search event; host retries use a separate generation. The endpoint need not return requestId.
- Host UI handles errors/retry. Input's error event is for getter/setter failures only.
- Unmount clears timers and aborts requests. There is no close event; editor blur is not panel close. A completed request may update closed-panel options; the next search clears them again.
- Adapt wrapped `{ items: [...] }` responses or numeric IDs explicitly. The adapter validates the shown string id/label array and supplies source.

### Troubleshooting

| Symptom | Typical cause | Fix |
| --- | --- | --- |
| Server returns rows but panel is empty | Missing/wrong source or default filtering removes server matches | Supply source; use filterOption=false for remote matching |
| ljw does not match a Chinese label | Default matching reads label/value only | Add a synchronous local predicate or server matching |
| Each letter downloads the complete list | Full-list loading confused with search | Cache complete lists by source |
| Old results replace a newer query | Requests resolve out of order | Guard with a generation/request counter and optionally abort |
| Query text appears in sent content | Host copied temporary query into v-model | Keep query in the search flow; let Input insert the selected mention |
| Server pagination is needed | Treating one page as the complete searchable set | Match query remotely; host owns pagination, with no automatic pagination event |

## Character and shortcut rules

```ts
import type { MentionTrigger, MentionShortcut } from 'vmo-markdown-render';
const triggers: MentionTrigger[] = [
  { character: '@', source: 'member' },
  { character: '#', source: 'knowledge' },
  { character: '/', source: 'agent' },
];
const shortcuts: MentionShortcut[] = [
  { source: 'member', keys: { ctrl: true, key: 'u' } },
  { source: 'knowledge', keys: { meta: true, shift: true, key: 'k' }, prefix: '#' },
];
```

A trigger is one non-whitespace printable character. The immediately preceding character must be an ASCII space U+0020. Document start, newlines, tabs, and full-width spaces do not qualify. Existing content is not rescanned to reopen a menu. Input does not support Markdown headings, so # can be a mention trigger.

Shortcuts require at least one modifier and one character key, with all modifiers matched exactly. The first valid conflicting binding wins. Ctrl+Shift+U does not match Ctrl+U. Some shortcuts may be intercepted by the OS; mobile hosts should offer a button calling openMention(source).

MentionShortcut.prefix affects only search context, defaults to @, and does not change the label or sent JSON. source determines the category.

## Candidate interaction

- Opening emits an empty-query search; each query change emits another search with increasing requestId.
- IME composition is not searched until composition ends.
- Enter selects the active enabled item; up/down cycle through enabled items.
- Space or Esc cancels. Space is consumed. A character-triggered prompt already in the document remains; temporary query text is discarded.
- Backspace edits only the query. An empty query does not delete document content.
- Selection replaces a character trigger or inserts at the original shortcut/button selection, then appends one space.
- Disabled candidates and loading candidates cannot be selected.

## Legacy unclassified prefix

prefix accepts a string or string array and does not bind a source. It still requires a preceding ASCII space. Prefer mentionTriggers for new integrations.

<ClientOnly><InputLegacyPrefix /></ClientOnly>

<<< ../../examples/InputLegacyPrefix.vue
