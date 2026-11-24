import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Mic, Play, Radio, Square, Volume2 } from 'lucide-react';
import { CATEGORY_LABELS, POSTURE_LABELS, TRIGGER_OPTIONS } from '../data/initialData';
import { BodyPosture, DogProfile, VocalRecording } from '../types/ethology';
import { audioEngine, classifyCapturedAudio } from '../utils/audioEngine';

interface LiveCaptureViewProps {
  dogs: DogProfile[];
  onSaveRecording: (recording: VocalRecording) => void;
  onCancel: () => void;
}

function formatTimer(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const LiveCaptureView: React.FC<LiveCaptureViewProps> = ({
  dogs,
  onSaveRecording,
  onCancel,
}) => {
  const [dogId, setDogId] = useState(dogs[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(['Estímulo na porta ou janela']);
  const [posture, setPosture] = useState<BodyPosture>('erect_forward');
  const [notes, setNotes] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveBars, setLiveBars] = useState<number[]>(() => Array.from({ length: 48 }, () => 0.1));
  const [liveHz, setLiveHz] = useState<number>(0);

  const [capturedData, setCapturedData] = useState<{
    durationSec: number;
    waveform: number[];
    fundamentalHz: number;
    pulseCount: number;
    audioUrl?: string;
  } | null>(null);

  const [micError, setMicError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ title?: string; audio?: string }>({});
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const collectedSamplesRef = useRef<number[]>([]);
  const collectedFreqsRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      cleanupStream();
      audioEngine.stop();
    };
  }, []);

  const cleanupStream = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const startMicrophoneCapture = async () => {
    setMicError(null);
    setFormErrors((prev) => ({ ...prev, audio: undefined }));
    setCapturedData(null);
    audioEngine.stop();
    setIsPreviewPlaying(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Microfone indisponível neste navegador. Utilize "Simular Captação Acústica" abaixo.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      collectedSamplesRef.current = [];
      collectedFreqsRef.current = [];
      startTimeRef.current = performance.now();

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const durSec = Math.max(0.8, (performance.now() - startTimeRef.current) / 1000);
        finalizeCapture(durSec, audioUrl);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsSimulating(false);
      setElapsedSec(0);

      timerRef.current = window.setInterval(() => {
        setElapsedSec((performance.now() - startTimeRef.current) / 1000);
      }, 100);

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const sampleFrame = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.min(1, Math.sqrt(sumSq / timeData.length) * 3.2);
        const barVal = Math.max(0.08, rms);

        // Estimate dominant Hz
        let maxBin = 2;
        let maxMag = 0;
        for (let b = 2; b < freqData.length / 3; b++) {
          if (freqData[b] > maxMag) {
            maxMag = freqData[b];
            maxBin = b;
          }
        }
        const nyquist = ctx.sampleRate / 2;
        const estHz = Math.max(180, Math.min(2400, Math.round((maxBin / freqData.length) * nyquist)));

        if (rms > 0.14) {
          collectedFreqsRef.current.push(estHz);
        }
        collectedSamplesRef.current.push(barVal);
        setLiveHz(estHz);
        setLiveBars((prev) => [...prev.slice(1), barVal]);
        rafRef.current = requestAnimationFrame(sampleFrame);
      };
      rafRef.current = requestAnimationFrame(sampleFrame);
    } catch {
      setMicError('Permissão de microfone recusada ou dispositivo ausente. Pode usar "Simular Captação Acústica".');
    }
  };

  const startSimulatedCapture = () => {
    setMicError(null);
    setFormErrors((prev) => ({ ...prev, audio: undefined }));
    setCapturedData(null);
    audioEngine.stop();
    setIsPreviewPlaying(false);

    collectedSamplesRef.current = [];
    collectedFreqsRef.current = [];
    startTimeRef.current = performance.now();
    setIsRecording(true);
    setIsSimulating(true);
    setElapsedSec(0);

    const selectedDog = dogs.find((d) => d.id === dogId);
    const targetHz = selectedDog?.baselineF0Hz ?? 580;

    timerRef.current = window.setInterval(() => {
      const sec = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSec(sec);

      const cycle = (sec * 1.6) % 1;
      const amp = cycle < 0.45 ? 0.65 + 0.3 * Math.sin((cycle / 0.45) * Math.PI) : 0.12 + 0.05 * Math.random();
      const hz = Math.round(targetHz * (0.94 + 0.14 * Math.sin(sec * 4)));

      collectedSamplesRef.current.push(amp);
      if (amp > 0.3) collectedFreqsRef.current.push(hz);
      setLiveHz(hz);
      setLiveBars((prev) => [...prev.slice(1), amp]);
    }, 80);
  };

  const stopCapture = () => {
    if (!isRecording) return;
    setIsRecording(false);
    const durSec = Math.max(1.1, (performance.now() - startTimeRef.current) / 1000);

    if (isSimulating) {
      cleanupStream();
      setIsSimulating(false);
      finalizeCapture(durSec, undefined);
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
  };

  const finalizeCapture = (durationSec: number, audioUrl?: string) => {
    const raw = collectedSamplesRef.current;
    const targetLen = 72;
    const waveform: number[] = [];
    if (raw.length === 0) {
      for (let i = 0; i < targetLen; i++) {
        waveform.push(0.2 + 0.55 * Math.abs(Math.sin(i * 0.42)));
      }
    } else {
      for (let i = 0; i < targetLen; i++) {
        const idx = Math.min(raw.length - 1, Math.floor((i / targetLen) * raw.length));
        waveform.push(Number(raw[idx].toFixed(2)));
      }
    }

    const freqs = collectedFreqsRef.current;
    const avgHz =
      freqs.length > 0
        ? Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length)
        : dogs.find((d) => d.id === dogId)?.baselineF0Hz ?? 580;

    // Count acoustic bursts
    let bursts = 0;
    let inBurst = false;
    for (const v of waveform) {
      if (v > 0.36 && !inBurst) {
        bursts++;
        inBurst = true;
      } else if (v < 0.22) {
        inBurst = false;
      }
    }

    setCapturedData({
      durationSec: Number(durationSec.toFixed(2)),
      waveform,
      fundamentalHz: avgHz,
      pulseCount: Math.max(1, Math.min(8, bursts || 3)),
      audioUrl,
    });
    setLiveBars(Array.from({ length: 48 }, () => 0.1));
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((item) => item !== trigger) : [...prev, trigger]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { title?: string; audio?: string } = {};

    if (!title.trim()) {
      errors.title = 'Indique um título descritivo para o registo etológico.';
    }
    if (!capturedData) {
      errors.audio = 'Efetue uma captação sonora (ou simulação acústica) antes de guardar a ficha.';
    }

    if (errors.title || errors.audio) {
      setFormErrors(errors);
      return;
    }

    const classification = classifyCapturedAudio({
      fundamentalHz: capturedData!.fundamentalHz,
      pulseCount: capturedData!.pulseCount,
      durationSec: capturedData!.durationSec,
      triggers: selectedTriggers,
      posture,
      waveform: capturedData!.waveform,
    });

    const now = new Date();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const displayDate = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(
      now.getHours()
    ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRec: VocalRecording = {
      id: `rec-${Date.now()}`,
      dogId,
      title: title.trim(),
      category: classification.category,
      timestampIso: now.toISOString(),
      displayDate,
      durationSec: capturedData!.durationSec,
      status: classification.status,
      triggers: selectedTriggers,
      posture,
      guardianNotes:
        notes.trim() ||
        `Registo captado em direto (${CATEGORY_LABELS[classification.category]}). Frequência fundamental medida em ${classification.acoustic.fundamentalHz} Hz.`,
      acoustic: classification.acoustic,
      hypothesis: classification.hypothesis,
      audioUrl: capturedData!.audioUrl,
      isUserRecorded: true,
    };

    audioEngine.stop();
    onSaveRecording(newRec);
  };

  const handlePreviewCaptured = () => {
    if (!capturedData) return;
    if (isPreviewPlaying) {
      audioEngine.stop();
      setIsPreviewPlaying(false);
      return;
    }
    const preview = classifyCapturedAudio({
      fundamentalHz: capturedData.fundamentalHz,
      pulseCount: capturedData.pulseCount,
      durationSec: capturedData.durationSec,
      triggers: selectedTriggers,
      posture,
      waveform: capturedData.waveform,
    });
    setIsPreviewPlaying(true);
    audioEngine.playVocalization({
      acoustic: preview.acoustic,
      durationSec: capturedData.durationSec,
      speed: 1,
      audioUrl: capturedData.audioUrl,
      onProgress: () => {},
      onEnded: () => setIsPreviewPlaying(false),
    });
  };

  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      <header className="border-b border-[#E5E0D5] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#B9411B]">
          Estação de Registo Bioacústico
        </p>
        <h1 className="mt-1 font-editorial text-[30px] font-semibold leading-[38px] text-[#1A242F] text-balance">
          Captação e Classificação em Direto
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5866]">
          Recolha uma emissão vocal através do microfone do dispositivo e associe o contexto ambiental observado para gerar automaticamente o espectrograma e a hipótese comportamental.
        </p>
      </header>

      {/* Capture Console Card */}
      <section className="rounded-[8px] border border-[#E5E0D5] bg-white p-6">
        <div className="flex flex-col items-center text-center">
          {/* Live Oscilloscope Canvas Bars */}
          <div className="mb-6 w-full rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-[#4B5866]">
              <span className="font-medium text-[#1A242F]">
                {isRecording
                  ? isSimulating
                    ? 'A captar amostra acústica de referência…'
                    : 'Microfone ativo · Monitorização em tempo real'
                  : capturedData
                  ? 'Amostra pronta para catalogação'
                  : 'Pronto para iniciar captação'}
              </span>
              <span className="font-acoustic tabular-nums">
                {isRecording
                  ? `${formatTimer(elapsedSec)} · ${liveHz || '---'} Hz`
                  : capturedData
                  ? `00:${capturedData.durationSec.toFixed(2).padStart(5, '0')} · ${capturedData.fundamentalHz} Hz`
                  : '00:00'}
              </span>
            </div>

            <div className="flex h-24 w-full items-center justify-between gap-1">
              {(capturedData && !isRecording ? capturedData.waveform.slice(0, 48) : liveBars).map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-[2px] transition-all duration-75"
                  style={{
                    height: `${Math.max(8, Math.round(val * 100))}%`,
                    backgroundColor: isRecording ? '#B9411B' : '#1F7A7A',
                    opacity: isRecording ? 0.9 : 0.78,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Primary Terracotta Record / Stop Control (Latidos Spec: circle when idle, rectangle with timer when recording) */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {!isRecording ? (
              <>
                <button
                  type="button"
                  onClick={startMicrophoneCapture}
                  className="inline-flex min-h-[56px] items-center gap-3 rounded-full bg-[#B9411B] px-6 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(185,65,27,0.22)] transition-colors hover:bg-[#9E3514] cursor-pointer"
                >
                  <Mic className="h-5 w-5" />
                  <span>Iniciar Captação</span>
                </button>

                <button
                  type="button"
                  onClick={startSimulatedCapture}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border-[1.5px] border-[#0F2A44] bg-white px-4 text-[13px] font-semibold text-[#0F2A44] transition-colors hover:bg-[#FAF8F3] cursor-pointer"
                >
                  <Radio className="h-4 w-4 text-[#1F7A7A]" />
                  <span>Simular Captação Acústica</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={stopCapture}
                className="inline-flex min-h-[56px] items-center gap-3 rounded-[8px] bg-[#B9411B] px-6 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(185,65,27,0.28)] transition-colors hover:bg-[#9E3514] cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                <Square className="h-4 w-4 fill-white" />
                <span className="font-acoustic tabular-nums">A gravar: {formatTimer(elapsedSec)} · Parar</span>
              </button>
            )}
          </div>

          {capturedData && !isRecording && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handlePreviewCaptured}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border border-[#1F7A7A] bg-[#1F7A7A]/10 px-4 text-[13px] font-semibold text-[#1F7A7A] transition-colors hover:bg-[#1F7A7A]/15 cursor-pointer"
              >
                {isPreviewPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isPreviewPlaying ? 'Parar Pré-Audição' : 'Ouvir Captação'}</span>
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5866]">
                <Volume2 className="h-4 w-4 text-[#1F7A7A]" />
                {capturedData.pulseCount} impulso(s) detetado(s) · f0 {capturedData.fundamentalHz} Hz
              </span>
            </div>
          )}

          {micError && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-[8px] border border-[#B9411B] bg-[#B9411B]/10 px-4 py-2.5 text-xs font-medium text-[#B9411B]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {formErrors.audio && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 text-xs font-medium text-[#B9411B]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formErrors.audio}</span>
            </div>
          )}
        </div>
      </section>

      {/* Contextual Metadata & Ethological Observation Form */}
      <form onSubmit={handleSave} className="space-y-6 rounded-[8px] border border-[#E5E0D5] bg-white p-6">
        <h2 className="font-editorial text-[22px] font-medium leading-[28px] text-[#1A242F]">
          Ficha de Observação Contextuada
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Dog Selector */}
          <div>
            <label htmlFor="capture-dog" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
              Sujeito Canino
            </label>
            <select
              id="capture-dog"
              value={dogId}
              onChange={(e) => setDogId(e.target.value)}
              className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
            >
              {dogs.map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name} ({dog.breed})
                </option>
              ))}
            </select>
          </div>

          {/* Recording Title */}
          <div>
            <label htmlFor="capture-title" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
              Título do Registo Etológico
            </label>
            <input
              id="capture-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="Ex.: Latido breve à chegada de encomenda"
              className={`h-12 w-full rounded-[8px] border bg-white px-3.5 text-sm text-[#1A242F] placeholder:text-[#4B5866]/70 focus:outline-none focus:ring-2 ${
                formErrors.title
                  ? 'border-[#B9411B] focus:border-[#B9411B] focus:ring-[#B9411B]/20'
                  : 'border-[#E5E0D5] focus:border-[#0F2A44] focus:ring-[#0F2A44]/20'
              }`}
            />
            {formErrors.title ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#B9411B]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{formErrors.title}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-[#4B5866]">
                Descreva o momento ou estímulo principal para facilitar consultas futuras.
              </p>
            )}
          </div>
        </div>

        {/* Accessible 48x48 Touch Checkboxes for Environmental Triggers */}
        <div>
          <span className="mb-2 block text-[13px] font-semibold text-[#1A242F]">
            Gatilhos Ambientais Observados
          </span>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {TRIGGER_OPTIONS.map((trigger) => {
              const checked = selectedTriggers.includes(trigger);
              return (
                <label
                  key={trigger}
                  className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[8px] px-1 hover:bg-[#FAF8F3]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTrigger(trigger)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${
                        checked
                          ? 'border-[#0F2A44] bg-[#0F2A44] text-white'
                          : 'border-[#4B5866] bg-white'
                      }`}
                    >
                      {checked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </span>
                  </span>
                  <span className="text-sm text-[#1A242F]">{trigger}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Accessible 48x48 Touch Radio Buttons for Body Posture */}
        <div>
          <span className="mb-2 block text-[13px] font-semibold text-[#1A242F]">
            Postura Corporal Durante a Emissão
          </span>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {(Object.keys(POSTURE_LABELS) as BodyPosture[]).map((key) => {
              const selected = posture === key;
              return (
                <label
                  key={key}
                  className={`flex min-h-[48px] cursor-pointer items-center gap-1 rounded-[8px] border px-2 transition-colors ${
                    selected ? 'border-[#0F2A44] bg-[#FAF8F3]' : 'border-[#E5E0D5] bg-white hover:bg-[#FAF8F3]'
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                    <input
                      type="radio"
                      name="posture"
                      value={key}
                      checked={selected}
                      onChange={() => setPosture(key)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                        selected ? 'border-[#0F2A44] bg-[#0F2A44]' : 'border-[#4B5866] bg-white'
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                  </span>
                  <span className="pr-2 text-xs font-medium text-[#1A242F]">{POSTURE_LABELS[key]}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="capture-notes" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
            Notas de Observação Adicionais
          </label>
          <textarea
            id="capture-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Registe distância ao estímulo, direção do olhar, movimentos da cauda ou duração até ao retorno à calma."
            className="w-full rounded-[8px] border border-[#E5E0D5] bg-white p-3.5 text-sm text-[#1A242F] placeholder:text-[#4B5866]/70 focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#E5E0D5] pt-5">
          <button
            type="button"
            onClick={() => {
              audioEngine.stop();
              onCancel();
            }}
            className="inline-flex min-h-[48px] items-center rounded-[8px] border-[1.5px] border-[#0F2A44] bg-white px-5 text-[13px] font-semibold text-[#0F2A44] transition-colors hover:bg-[#FAF8F3] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center rounded-[8px] bg-[#0F2A44] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A3B5C] cursor-pointer"
          >
            Analisar e Guardar no Catálogo
          </button>
        </div>
      </form>
    </div>
  );
};
