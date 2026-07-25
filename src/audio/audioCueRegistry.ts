export type AudioCueSynthFn = (ctx: AudioContext, destination: AudioNode) => void;

export type AudioCueEntry = {
  id: string;
  synth: AudioCueSynthFn;
};

const registry = new Map<string, AudioCueEntry>();

export function registerAudioCue(entry: AudioCueEntry): void {
  registry.set(entry.id, entry);
}

export function getAudioCue(id: string): AudioCueEntry {
  const entry = registry.get(id);
  if (!entry) throw new Error(`audioCueRegistry: unknown cue id "${id}"`);
  return entry;
}

export function listAudioCueIds(): string[] {
  return [...registry.keys()];
}
