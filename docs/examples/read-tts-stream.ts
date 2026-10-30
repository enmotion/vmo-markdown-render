import { LocalTts, type LocalTtsOptions } from 'vmo-markdown-render';

// Host-side helper, not an additional package export. Create it on the client.
export function createSpeechReader(options: LocalTtsOptions = {}) {
  const tts = new LocalTts(options);
  let generation = 0;

  async function read(chunks: AsyncIterable<string>): Promise<void> {
    const token = ++generation;
    tts.reset();
    try {
      for await (const delta of chunks) {
        if (token !== generation) return; // Discard late chunks from an old request.
        tts.append(delta); // The iterator must yield decoded, plain-text deltas.
      }
      if (token === generation) await tts.finish();
    } catch (error) {
      if (token !== generation) return; // Expected cancellation or replacement.
      tts.stop();
      throw error; // The caller handles network, input and playback failures.
    }
  }

  function stop() { generation++; tts.stop(); }
  function dispose() { generation++; tts.dispose(); }
  return { tts, read, stop, dispose };
}
