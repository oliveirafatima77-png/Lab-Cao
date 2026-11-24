import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { AcousticSignature } from '../types/ethology';
import { PlaybackSpeed } from '../utils/audioEngine';

interface SpectrogramPlayerProps {
  title: string;
  acoustic: AcousticSignature;
  durationSec: number;
  isPlaying: boolean;
  progressRatio: number;
  speed: PlaybackSpeed;
  onTogglePlay: () => void;
  onSeek: (ratio: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onRestart: () => void;
}

function formatAcousticTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const hundredths = Math.floor((clamped - Math.floor(clamped)) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export const SpectrogramPlayer: React.FC<SpectrogramPlayerProps> = ({
  title,
  acoustic,
  durationSec,
  isPlaying,
  progressRatio,
  speed,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverProbe, setHoverProbe] = useState<{ timeSec: number; freqHz: number; xPct: number; yPct: number } | null>(null);

  const timeTicks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, idx) => ((durationSec * idx) / count).toFixed(2));
  }, [durationSec]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    // Cream archival secondary background
    ctx.fillStyle = '#FAF8F3';
    ctx.fillRect(0, 0, width, height);

    // Frequency grid lines (1000, 2000, 3000 Hz)
    const maxFreq = 4000;
    ctx.strokeStyle = '#E5E0D5';
    ctx.lineWidth = 1;
    for (const hz of [1000, 2000, 3000]) {
      const y = height - (hz / maxFreq) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw spectral energy cells derived from waveform and harmonic profile
    const cols = acoustic.waveform.length;
    const rows = 28;
    const cellW = width / cols;
    const cellH = height / rows;

    const harmonics =
      acoustic.tonality === 'broadband'
        ? [1, 1.4, 1.9, 2.5, 3.2, 4.1]
        : acoustic.tonality === 'mixed'
        ? [1, 2, 3, 4.2]
        : [1, 2, 3];

    for (let c = 0; c < cols; c++) {
      const energy = acoustic.waveform[c];
      const tNorm = c / cols;
      // Subtle pitch glide across the vocalization
      const glide =
        acoustic.pulseCount === 1 && durationSec > 2.5
          ? 0.85 + 0.25 * Math.sin(tNorm * Math.PI)
          : 0.94 + 0.12 * Math.sin(tNorm * acoustic.pulseCount * Math.PI * 2);

      for (let r = 0; r < rows; r++) {
        const freq = ((rows - 0.5 - r) / rows) * maxFreq;
        let bandEnergy = 0;

        for (let hIdx = 0; hIdx < harmonics.length; hIdx++) {
          const targetHz = acoustic.fundamentalHz * harmonics[hIdx] * glide;
          const sigma =
            acoustic.tonality === 'broadband'
              ? 360
              : acoustic.tonality === 'mixed'
              ? 210
              : 135;
          const dist = Math.abs(freq - targetHz);
          const harmonicWeight = 1 / (1 + hIdx * 0.45);
          bandEnergy += Math.exp(-(dist * dist) / (2 * sigma * sigma)) * harmonicWeight;
        }

        if (acoustic.tonality === 'broadband' && freq < 1600) {
          bandEnergy += 0.28 * Math.abs(Math.sin(c * 1.9 + r * 0.7));
        }

        const intensity = Math.min(1, energy * bandEnergy * 1.15);
        if (intensity < 0.08) continue;

        if (intensity > 0.78) {
          ctx.fillStyle = `rgba(185, 65, 27, ${Math.min(0.92, intensity)})`;
        } else if (intensity > 0.36) {
          ctx.fillStyle = `rgba(31, 122, 122, ${Math.min(0.9, intensity + 0.08)})`;
        } else {
          ctx.fillStyle = `rgba(15, 42, 68, ${intensity * 0.85})`;
        }

        ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }, [acoustic, durationSec]);

  const handlePointerSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  };

  const handleSpectrogramMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setHoverProbe({
      timeSec: xRatio * durationSec,
      freqHz: Math.round((1 - yRatio) * 4000),
      xPct: xRatio * 100,
      yPct: yRatio * 100,
    });
  };

  const currentSeconds = progressRatio * durationSec;

  return (
    <div className="space-y-4">
      {/* Waveform Scrubber */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-[#4B5866]">
          <span className="font-medium text-[#1A242F]">Forma de Onda Temporal</span>
          <span className="font-acoustic tabular-nums">
            {formatAcousticTime(currentSeconds)} / {formatAcousticTime(durationSec)}
          </span>
        </div>

        <div
          role="slider"
          aria-label={`Posição de reprodução para ${title}`}
          aria-valuemin={0}
          aria-valuemax={Math.round(durationSec * 100)}
          aria-valuenow={Math.round(currentSeconds * 100)}
          tabIndex={0}
          onClick={handlePointerSeek}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onSeek(Math.min(1, progressRatio + 0.05));
            if (e.key === 'ArrowLeft') onSeek(Math.max(0, progressRatio - 0.05));
          }}
          className="relative h-20 w-full cursor-pointer select-none overflow-hidden rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] px-2 py-2"
        >
          <div className="flex h-full w-full items-center justify-between gap-[2px]">
            {acoustic.waveform.map((amp, idx) => {
              const barPos = idx / acoustic.waveform.length;
              const isPast = barPos <= progressRatio;
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-[2px] transition-colors duration-100"
                  style={{
                    height: `${Math.max(10, Math.round(amp * 100))}%`,
                    backgroundColor: isPast ? '#0F2A44' : '#1F7A7A',
                    opacity: isPast ? 0.92 : 0.65,
                  }}
                />
              );
            })}
          </div>

          {/* Playhead cursor */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-[#0F2A44]"
            style={{ left: `${progressRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Frequency Spectrogram Heatmap */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-[#4B5866]">
          <span className="font-medium text-[#1A242F]">Espectrograma de Frequência (0 – 4.000 Hz)</span>
          <span className="font-acoustic tabular-nums">
            {hoverProbe ? `${hoverProbe.timeSec.toFixed(2)} s · ${hoverProbe.freqHz} Hz` : `f0 ${acoustic.fundamentalHz} Hz`}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Y-axis Hz scale */}
          <div className="flex flex-col justify-between py-0.5 text-right font-acoustic text-[10px] text-[#4B5866] select-none">
            <span>4.0k</span>
            <span>3.0k</span>
            <span>2.0k</span>
            <span>1.0k</span>
            <span>0 Hz</span>
          </div>

          <div className="flex-1">
            <div
              onClick={handlePointerSeek}
              onMouseMove={handleSpectrogramMove}
              onMouseLeave={() => setHoverProbe(null)}
              className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3]"
            >
              <canvas ref={canvasRef} className="block h-full w-full" />

              {/* Playhead on Spectrogram */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-[#0F2A44]"
                style={{ left: `${progressRatio * 100}%` }}
              />

              {/* Hover Crosshair */}
              {hoverProbe && (
                <>
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-px border-l border-dashed border-[#0F2A44]/50"
                    style={{ left: `${hoverProbe.xPct}%` }}
                  />
                  <div
                    className="pointer-events-none absolute right-0 left-0 h-px border-t border-dashed border-[#0F2A44]/50"
                    style={{ top: `${hoverProbe.yPct}%` }}
                  />
                </>
              )}
            </div>

            {/* X-axis Time Ticks */}
            <div className="mt-1 flex justify-between font-acoustic text-[10px] text-[#4B5866]">
              {timeTicks.map((tick, i) => (
                <span key={i}>{tick}s</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transport Controls & Playback Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? `Pausar ${title}` : `Reproduzir ${title}`}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] bg-[#0F2A44] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A3B5C] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pausar Áudio' : 'Reproduzir Registo'}</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            aria-label="Reiniciar reprodução do início"
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[8px] border-[1.5px] border-[#0F2A44] bg-white px-3 text-[13px] font-semibold text-[#0F2A44] transition-colors hover:bg-[#FAF8F3] cursor-pointer"
            title="Voltar ao início"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#4B5866]">Velocidade:</span>
          <div className="inline-flex rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-1" role="group" aria-label="Velocidade de reprodução">
            {([0.5, 0.75, 1] as PlaybackSpeed[]).map((spd) => {
              const active = speed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onSpeedChange(spd)}
                  className={`min-h-[36px] min-w-[48px] rounded-[6px] px-2.5 font-acoustic text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1F7A7A] text-white'
                      : 'text-[#1A242F] hover:bg-white'
                  }`}
                >
                  {spd === 1 ? '1.0x' : `${spd}x`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
