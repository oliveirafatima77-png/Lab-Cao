import { AcousticSignature, BehavioralHypothesis, BodyPosture, VocalCategory } from '../types/ethology';

export type PlaybackSpeed = 0.5 | 0.75 | 1;

class CanineAudioEngine {
  private ctx: AudioContext | null = null;
  private rafId: number | null = null;
  private stopTimer: number | null = null;
  private activeOscillators: AudioNode[] = [];
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    for (const node of this.activeOscillators) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.activeOscillators = [];
    if (this.activeHtmlAudio) {
      this.activeHtmlAudio.pause();
      this.activeHtmlAudio.currentTime = 0;
      this.activeHtmlAudio = null;
    }
  }

  public playVocalization(options: {
    acoustic: AcousticSignature;
    durationSec: number;
    speed: PlaybackSpeed;
    startOffsetRatio?: number;
    audioUrl?: string;
    onProgress: (ratio: number) => void;
    onEnded: () => void;
  }): void {
    this.stop();

    const { acoustic, durationSec, speed, startOffsetRatio = 0, audioUrl, onProgress, onEnded } = options;
    const effectiveTotalMs = Math.max(300, (durationSec / speed) * 1000);
    const clampedStart = Math.max(0, Math.min(0.95, startOffsetRatio));

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.playbackRate = speed;
      audio.currentTime = durationSec * clampedStart;
      this.activeHtmlAudio = audio;
      this.isPlaying = true;

      const updateAudioProgress = () => {
        if (!this.isPlaying || !this.activeHtmlAudio) return;
        const ratio = Math.min(1, this.activeHtmlAudio.currentTime / Math.max(0.1, durationSec));
        onProgress(ratio);
        if (ratio < 1 && !this.activeHtmlAudio.paused) {
          this.rafId = requestAnimationFrame(updateAudioProgress);
        }
      };

      audio.onended = () => {
        this.stop();
        onProgress(0);
        onEnded();
      };

      void audio.play().then(() => {
        this.rafId = requestAnimationFrame(updateAudioProgress);
      }).catch(() => {
        this.synthesizeCanineSound(acoustic, durationSec, speed, clampedStart, effectiveTotalMs, onProgress, onEnded);
      });
      return;
    }

    this.synthesizeCanineSound(acoustic, durationSec, speed, clampedStart, effectiveTotalMs, onProgress, onEnded);
  }

  private synthesizeCanineSound(
    acoustic: AcousticSignature,
    durationSec: number,
    speed: PlaybackSpeed,
    startRatio: number,
    effectiveTotalMs: number,
    onProgress: (ratio: number) => void,
    onEnded: () => void
  ): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const scaledDuration = durationSec / speed;
    const remainingSec = Math.max(0.25, scaledDuration * (1 - startRatio));

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.connect(ctx.destination);
    this.activeOscillators.push(masterGain);

    const formantFilter = ctx.createBiquadFilter();
    formantFilter.type = 'bandpass';
    formantFilter.frequency.setValueAtTime(
      Math.min(3500, Math.max(220, acoustic.peakHz * (speed === 0.5 ? 0.85 : 1))),
      now
    );
    formantFilter.Q.setValueAtTime(acoustic.tonality === 'broadband' ? 1.4 : 3.2, now);
    formantFilter.connect(masterGain);
    this.activeOscillators.push(formantFilter);

    const pulses = Math.max(1, acoustic.pulseCount);
    const pulseStep = scaledDuration / pulses;

    for (let p = 0; p < pulses; p++) {
      const pulseStartGlobal = p * pulseStep;
      const pulseLen = Math.min(pulseStep * 0.72, Math.max(0.14, (acoustic.pulseDurationSec / speed)));
      const offsetShift = scaledDuration * startRatio;
      const relStart = pulseStartGlobal - offsetShift;
      const relEnd = relStart + pulseLen;

      if (relEnd <= 0 || relStart >= remainingSec) continue;

      const t0 = now + Math.max(0, relStart);
      const t1 = now + Math.min(remainingSec, relEnd);
      const dur = Math.max(0.08, t1 - t0);

      const osc = ctx.createOscillator();
      osc.type = acoustic.tonality === 'harmonic' ? 'triangle' : 'sawtooth';
      const baseFreq = acoustic.fundamentalHz * (speed === 0.5 ? 0.88 : speed === 0.75 ? 0.94 : 1);

      if (acoustic.tonality === 'broadband') {
        osc.frequency.setValueAtTime(baseFreq, t0);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.86, t0 + dur);
      } else if (pulses === 1 && durationSec > 2.5) {
        // Howl contour
        osc.frequency.setValueAtTime(baseFreq * 0.82, t0);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.12, t0 + dur * 0.45);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.88, t0 + dur);
      } else {
        // Bark / whine pitch sweep
        osc.frequency.setValueAtTime(baseFreq * 0.9, t0);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, t0 + dur * 0.35);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, t0 + dur);
      }

      const env = ctx.createGain();
      const peakGain = acoustic.intensityLevel === 'Elevada' ? 0.24 : acoustic.intensityLevel === 'Moderada' ? 0.18 : 0.14;
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.04, dur * 0.25));
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(env);
      env.connect(formantFilter);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
      this.activeOscillators.push(osc, env);
    }

    masterGain.gain.linearRampToValueAtTime(1, now + 0.02);

    this.isPlaying = true;
    const startPerf = performance.now();
    const startOffsetMs = effectiveTotalMs * startRatio;

    const tick = () => {
      if (!this.isPlaying) return;
      const elapsed = performance.now() - startPerf + startOffsetMs;
      const ratio = Math.min(1, elapsed / effectiveTotalMs);
      onProgress(ratio);
      if (ratio < 1) {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    this.rafId = requestAnimationFrame(tick);

    this.stopTimer = window.setTimeout(() => {
      this.stop();
      onProgress(0);
      onEnded();
    }, remainingSec * 1000 + 60);
  }
}

export const audioEngine = new CanineAudioEngine();

export function classifyCapturedAudio(params: {
  fundamentalHz: number;
  pulseCount: number;
  durationSec: number;
  triggers: string[];
  posture: BodyPosture;
  waveform: number[];
}): {
  category: VocalCategory;
  status: 'validated' | 'critical_trigger' | 'pending_review';
  acoustic: AcousticSignature;
  hypothesis: BehavioralHypothesis;
} {
  const { fundamentalHz, pulseCount, durationSec, triggers, posture, waveform } = params;

  let category: VocalCategory = 'alerta_territorial';
  let status: 'validated' | 'critical_trigger' | 'pending_review' = 'validated';

  if (triggers.includes('Ausência do tutor') || (fundamentalHz > 850 && durationSec > 3.2)) {
    category = 'frustracao_separacao';
    status = 'critical_trigger';
  } else if (
    fundamentalHz < 320 ||
    (triggers.includes('Sinalização de recurso ou desconforto') && posture === 'retracted_tense')
  ) {
    category = 'advertencia';
    status = 'critical_trigger';
  } else if (triggers.includes('Interação lúdica') && posture === 'relaxed_loose') {
    category = pulseCount >= 3 ? 'ludico' : 'solicitacao';
    status = 'validated';
  } else if (pulseCount <= 1 && durationSec > 2.6 && fundamentalHz < 650) {
    category = 'coesao_social';
    status = 'pending_review';
  } else if (fundamentalHz > 760 && pulseCount <= 2) {
    category = 'solicitacao';
    status = 'validated';
  }

  const tonality: AcousticSignature['tonality'] =
    category === 'advertencia'
      ? 'broadband'
      : category === 'alerta_territorial'
      ? 'mixed'
      : 'harmonic';

  const intensityLevel: AcousticSignature['intensityLevel'] =
    status === 'critical_trigger' || category === 'alerta_territorial'
      ? 'Elevada'
      : category === 'solicitacao'
      ? 'Baixa'
      : 'Moderada';

  const acoustic: AcousticSignature = {
    fundamentalHz: Math.round(fundamentalHz),
    peakHz: Math.round(fundamentalHz * 2),
    bandwidthHz: tonality === 'broadband' ? 1450 : tonality === 'mixed' ? 1820 : 690,
    pulseCount: Math.max(1, pulseCount),
    pulseDurationSec: Number((durationSec / Math.max(1, pulseCount) * 0.65).toFixed(2)),
    cadencePerSec: Number((Math.max(1, pulseCount) / Math.max(0.6, durationSec)).toFixed(1)),
    tonality,
    intensityLevel,
    waveform: waveform.length >= 24 ? waveform : Array.from({ length: 72 }, (_, i) => 0.25 + 0.55 * Math.abs(Math.sin(i * 0.45))),
  };

  const hypothesisByCategory: Record<VocalCategory, BehavioralHypothesis> = {
    alerta_territorial: {
      primaryCause: 'Sinalização de deteção periférica junto a acessos da habitação',
      ethologicalMechanism: `Frequência fundamental em ${acoustic.fundamentalHz} Hz com ${acoustic.pulseCount} impulsos rítmicos. Padrão consistente com resposta de vigilância a estímulo externo.`,
      managementAdvice: [
        'Validar visualmente o ambiente com postura serena e convidar o cão a afastar-se do ponto de vigia.',
        'Reduzir exposição direta a estímulos recorrentes durante períodos de descanso.',
      ],
      confidenceLabel: 'Classificação automática · Alerta Territorial',
    },
    solicitacao: {
      primaryCause: 'Pedido dirigido de interação, acesso ou proximidade ao tutor',
      ethologicalMechanism: `Contorno tonal limpo centrado em ${acoustic.fundamentalHz} Hz, típico de comunicação afiliativa sem tensão defensiva.`,
      managementAdvice: [
        'Atender ao pedido após breve pausa silenciosa (3 segundos) para reforçar autocontrolo.',
        'Garantir rotina previsível de passeios e momentos de contacto tranquilo.',
      ],
      confidenceLabel: 'Classificação automática · Solicitação',
    },
    frustracao_separacao: {
      primaryCause: 'Ativação emocional associada a isolamento ou frustração de contacto',
      ethologicalMechanism: `Emissão aguda sustentada (${acoustic.fundamentalHz} Hz) durante ${durationSec.toFixed(2)} s, indicando procura vocal de restabelecimento social.`,
      managementAdvice: [
        'Registar a latência até à primeira vocalização após a saída para aferir o limiar de tolerância.',
        'Combinar rotinas de saída neutras com atividades de mastigação ou olfato calmantes.',
      ],
      confidenceLabel: 'Gatilho comportamental prioritário',
    },
    ludico: {
      primaryCause: 'Excitação positiva e convite motor durante interação social',
      ethologicalMechanism: `Impulsos breves em ${acoustic.fundamentalHz} Hz com elevada clareza harmónica e cadência rápida (${acoustic.cadencePerSec} imp/s).`,
      managementAdvice: [
        'Direcionar a energia para jogos cooperativos com pausas curtas de descompressão.',
      ],
      confidenceLabel: 'Classificação automática · Convite Lúdico',
    },
    advertencia: {
      primaryCause: 'Sinalização defensiva para manutenção de espaço individual ou proteção de recurso',
      ethologicalMechanism: `Componente grave dominante (${acoustic.fundamentalHz} Hz) de banda larga, funcionando como aviso não violento de desconforto.`,
      managementAdvice: [
        'Aumentar de imediato a distância entre o estímulo desencadeador e o cão.',
        'Nunca suprimir ou punir o aviso acústico; atuar preventivamente sobre o gatilho ambiental.',
      ],
      confidenceLabel: 'Gatilho comportamental prioritário',
    },
    coesao_social: {
      primaryCause: 'Resposta vocal sustentada de localização ou eco ambiental',
      ethologicalMechanism: `Arco tonal contínuo em ${acoustic.fundamentalHz} Hz sem fragmentação rítmica abrupta.`,
      managementAdvice: [
        'Verificar se coincidiu com sirenes, sinos ou vocalizações externas e registar o nível de relaxamento posterior.',
      ],
      confidenceLabel: 'Em revisão observacional',
    },
  };

  return {
    category,
    status,
    acoustic,
    hypothesis: hypothesisByCategory[category],
  };
}
