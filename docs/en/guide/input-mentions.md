# Mention candidates and filtering

The component emits search when candidates are needed and receives results through options. Data loading and text filtering are separate: supply data synchronously, or fetch it asynchronously and choose local or remote filtering.

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
