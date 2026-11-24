import React, { useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { LEXICON_ENTRIES } from '../data/initialData';
import { VocalCategory } from '../types/ethology';
import { audioEngine, PlaybackSpeed } from '../utils/audioEngine';

interface LexiconViewProps {
  onFilterCatalogByCategory: (category: VocalCategory) => void;
}

export const LexiconView: React.FC<LexiconViewProps> = ({ onFilterCatalogByCategory }) => {
  const [playingCategory, setPlayingCategory] = useState<VocalCategory | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const handleToggleSample = (category: VocalCategory) => {
    if (playingCategory === category) {
      audioEngine.stop();
      setPlayingCategory(null);
      return;
    }

    const entry = LEXICON_ENTRIES.find((item) => item.category === category);
    if (!entry) return;

    setPlayingCategory(category);
    audioEngine.playVocalization({
      acoustic: entry.sampleAcoustic,
      durationSec: entry.sampleDurationSec,
      speed,
      onProgress: () => {},
      onEnded: () => setPlayingCategory(null),
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[#E5E0D5] pb-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#1F7A7A]">
            Guia de Referência Científica
          </p>
          <h1 className="mt-1 font-editorial text-[30px] font-semibold leading-[38px] text-[#1A242F] text-balance">
            Léxico Etológico Canino
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5866]">
            Taxonomia acústica baseada nas regras estruturais-motivacionais de Morton para distinguir sinais afiliativos, territoriais, lúdicos e defensivos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-[#4B5866]">Audição de referência:</span>
          <div className="inline-flex rounded-[8px] border border-[#E5E0D5] bg-white p-1">
            {([0.5, 1] as PlaybackSpeed[]).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeed(spd)}
                className={`min-h-[36px] min-w-[52px] rounded-[6px] px-2.5 font-acoustic text-xs font-semibold transition-colors cursor-pointer ${
                  speed === spd ? 'bg-[#0F2A44] text-white' : 'text-[#1A242F] hover:bg-[#FAF8F3]'
                }`}
              >
                {spd === 1 ? '1.0x' : '0.5x'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {LEXICON_ENTRIES.map((entry) => {
          const isPlaying = playingCategory === entry.category;
          return (
            <article
              key={entry.category}
              className={`flex flex-col justify-between rounded-[8px] bg-white p-6 transition-colors ${
                isPlaying ? 'border-[1.5px] border-[#1F7A7A]' : 'border border-[#E5E0D5]'
              }`}
            >
              <div>
                <p className="font-acoustic text-xs text-[#1F7A7A]">
                  {entry.scientificClassification}
                </p>
                <h2 className="mt-1.5 font-editorial text-[22px] font-medium leading-[28px] text-[#1A242F]">
                  {entry.title}
                </h2>

                {/* Sample Waveform Strip */}
                <div className="mt-4 flex items-center gap-3 rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-3">
                  <button
                    type="button"
                    onClick={() => handleToggleSample(entry.category)}
                    aria-label={isPlaying ? `Pausar exemplo de ${entry.title}` : `Reproduzir exemplo de ${entry.title}`}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-[#0F2A44] text-white'
                        : 'border border-[#0F2A44] bg-white text-[#0F2A44] hover:bg-[#0F2A44] hover:text-white'
                    }`}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>

                  <div className="flex h-9 flex-1 items-center gap-[2px]" aria-hidden="true">
                    {entry.sampleAcoustic.waveform.map((v, idx) => (
                      <span
                        key={idx}
                        className="flex-1 rounded-[1px]"
                        style={{
                          height: `${Math.max(12, Math.round(v * 100))}%`,
                          backgroundColor: isPlaying ? '#0F2A44' : '#1F7A7A',
                          opacity: 0.78,
                        }}
                      />
                    ))}
                  </div>

                  <span className="font-acoustic text-xs text-[#4B5866] shrink-0">
                    {entry.frequencyRange}
                  </span>
                </div>

                <dl className="mt-4 space-y-3 text-sm leading-6">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.03em] text-[#4B5866]">
                      Morfologia Espectral
                    </dt>
                    <dd className="mt-0.5 text-[#1A242F]">{entry.morphology}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.03em] text-[#4B5866]">
                      Função Comunicativa
                    </dt>
                    <dd className="mt-0.5 text-[#1A242F]">{entry.evolutionaryFunction}</dd>
                  </div>
                  <div className="rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-3">
                    <dt className="text-xs font-semibold text-[#0F2A44]">
                      Critério Diferencial
                    </dt>
                    <dd className="mt-1 text-xs leading-5 text-[#4B5866]">
                      {entry.differentialCues}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 border-t border-[#E5E0D5] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.stop();
                    setPlayingCategory(null);
                    onFilterCatalogByCategory(entry.category);
                  }}
                  className="inline-flex min-h-[48px] items-center gap-2 text-[13px] font-semibold text-[#0F2A44] underline-offset-4 hover:underline cursor-pointer"
                >
                  <span>Consultar registos desta categoria no catálogo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
