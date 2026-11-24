import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Pause, Play } from 'lucide-react';
import { CATEGORY_LABELS } from '../data/initialData';
import { DogProfile, VocalRecording } from '../types/ethology';

interface RecordingCardProps {
  recording: VocalRecording;
  dog?: DogProfile;
  isSelected: boolean;
  isPlaying: boolean;
  progressRatio: number;
  onSelect: () => void;
  onTogglePlay: (e: React.MouseEvent) => void;
}

export const RecordingCard: React.FC<RecordingCardProps> = ({
  recording,
  dog,
  isSelected,
  isPlaying,
  progressRatio,
  onSelect,
  onTogglePlay,
}) => {
  const formattedDuration = `00:${recording.durationSec.toFixed(2).padStart(5, '0')}`;

  return (
    <article
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group cursor-pointer rounded-[8px] bg-white p-4 transition-colors duration-150 ${
        isSelected
          ? 'border-[1.5px] border-[#1F7A7A]'
          : 'border border-[#E5E0D5] hover:border-[#0F2A44]/40'
      }`}
    >
      {/* Quiet unboxed metadata line */}
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#4B5866]">
        <span className="font-semibold text-[#1A242F]">{dog?.name ?? 'Cão'}</span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">{recording.displayDate}</span>
        <span aria-hidden="true">·</span>
        <span className="font-acoustic tabular-nums">{formattedDuration}</span>
        <span aria-hidden="true">·</span>
        <span className="font-acoustic tabular-nums">{recording.acoustic.fundamentalHz} Hz</span>
      </div>

      {/* Entry Title + Play Control */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-editorial text-[18px] font-medium leading-[24px] text-[#1A242F]">
            {recording.title}
          </h3>
          <p className="mt-0.5 text-xs text-[#4B5866]">
            {CATEGORY_LABELS[recording.category]}
          </p>
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? `Pausar ${recording.title}` : `Reproduzir ${recording.title.toLowerCase()}`}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border transition-colors cursor-pointer ${
            isPlaying
              ? 'border-[#0F2A44] bg-[#0F2A44] text-white'
              : 'border-[#E5E0D5] bg-[#FAF8F3] text-[#0F2A44] hover:border-[#0F2A44]'
          }`}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
      </div>

      {/* Mini Waveform Preview */}
      <div
        className="mt-3 flex h-10 w-full items-center justify-between gap-[2px] rounded-[8px] border border-[#E5E0D5]/70 bg-[#FAF8F3] px-2.5 py-1.5"
        aria-hidden="true"
      >
        {recording.acoustic.waveform.slice(0, 48).map((val, idx) => {
          const past = isPlaying && idx / 48 <= progressRatio;
          return (
            <span
              key={idx}
              className="flex-1 rounded-[1px]"
              style={{
                height: `${Math.max(12, Math.round(val * 100))}%`,
                backgroundColor: past ? '#0F2A44' : '#1F7A7A',
                opacity: past ? 1 : 0.72,
              }}
            />
          );
        })}
      </div>

      {/* Explicit Status + Trigger Footer (8px square-cut tags, never circular pills) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {recording.status === 'validated' && (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#1F7A7A] bg-[#1F7A7A]/12 px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-[#1F7A7A]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Correspondência Validada</span>
          </span>
        )}

        {recording.status === 'critical_trigger' && (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#B9411B] bg-[#B9411B]/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-[#B9411B]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Gatilho Crítico</span>
          </span>
        )}

        {recording.status === 'pending_review' && (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-[#4B5866]">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Em Revisão</span>
          </span>
        )}

        {recording.triggers.length > 0 && (
          <span className="truncate text-xs text-[#4B5866] max-w-[210px]">
            {recording.triggers[0]}
          </span>
        )}
      </div>
    </article>
  );
};
