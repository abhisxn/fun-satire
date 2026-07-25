import { getAudioCue } from "./audioCueRegistry";

export type AudioBus = "music" | "sfx";

export class AudioEngine {
  private readonly ctx: AudioContext;
  private readonly musicBus: GainNode;
  private readonly sfxBus: GainNode;
  private readonly masterBus: GainNode;
  private muted = false;
  private masterVolume = 0.8;
  private unlocked = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterBus = ctx.createGain();
    this.masterBus.gain.value = this.masterVolume;
    this.masterBus.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.masterBus);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.masterBus);
  }

  getContext(): AudioContext {
    return this.ctx;
  }

  getBus(bus: AudioBus): GainNode {
    return bus === "music" ? this.musicBus : this.sfxBus;
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.masterBus.gain.value = this.muted ? 0 : this.masterVolume;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.masterBus.gain.value = this.muted ? 0 : this.masterVolume;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(cueId: string): void {
    const entry = getAudioCue(cueId);
    entry.synth(this.ctx, this.sfxBus);
  }
}
