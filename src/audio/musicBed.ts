import type { AudioEngine } from "./AudioEngine";

export type MusicBedHandle = { stop(): void };

export async function startMusicBed(engine: AudioEngine, url: string): Promise<MusicBedHandle> {
  const ctx = engine.getContext();
  let buffer: AudioBuffer;
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    buffer = (await ctx.decodeAudioData(arrayBuffer)) as AudioBuffer;
  } catch {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate) as AudioBuffer;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(engine.getBus("music"));
  source.start(ctx.currentTime);
  return {
    stop: () => {
      source.stop();
      source.disconnect();
    },
  };
}
