import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  ListMusic,
  Mic,
  Search,
  Users,
  X,
} from 'lucide-react';
import { HypothesisPanel } from './components/HypothesisPanel';
import { LexiconView } from './components/LexiconView';
import { LiveCaptureView } from './components/LiveCaptureView';
import { ProfilesView } from './components/ProfilesView';
import { RecordingCard } from './components/RecordingCard';
import { SpectrogramPlayer } from './components/SpectrogramPlayer';
import { CATEGORY_LABELS, INITIAL_DOGS, INITIAL_RECORDINGS } from './data/initialData';
import { DogProfile, ValidationStatus, VocalCategory, VocalRecording } from './types/ethology';
import { audioEngine, PlaybackSpeed } from './utils/audioEngine';

type AppTab = 'catalog' | 'capture' | 'lexicon' | 'profiles';

const STORAGE_KEYS = {
  dogs: 'latidos_dogs_v1',
  recordings: 'latidos_recordings_v1',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('catalog');
  const [dogs, setDogs] = useState<DogProfile[]>(() => loadStored(STORAGE_KEYS.dogs, INITIAL_DOGS));
  const [recordings, setRecordings] = useState<VocalRecording[]>(() =>
    loadStored(STORAGE_KEYS.recordings, INITIAL_RECORDINGS)
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dogFilter, setDogFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<VocalCategory | 'all'>('all');

  // Active Inspector & Playback state
  const [selectedId, setSelectedId] = useState<string>(() => recordings[0]?.id ?? '');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progressRatio, setProgressRatio] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.dogs, JSON.stringify(dogs));
    } catch {
      // Ignore storage quota issues
    }
  }, [dogs]);

  useEffect(() => {
    try {
      // Omit transient object URLs when persisting across reloads
      const serializable = recordings.map(({ audioUrl: _omit, ...rest }) => rest);
      window.localStorage.setItem(STORAGE_KEYS.recordings, JSON.stringify(serializable));
    } catch {
      // Ignore storage quota issues
    }
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recordings.filter((rec) => {
      if (dogFilter !== 'all' && rec.dogId !== dogFilter) return false;
      if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
      if (!q) return true;
      const dogName = dogs.find((d) => d.id === rec.dogId)?.name.toLowerCase() ?? '';
      return (
        rec.title.toLowerCase().includes(q) ||
        dogName.includes(q) ||
        rec.guardianNotes.toLowerCase().includes(q) ||
        rec.triggers.some((t) => t.toLowerCase().includes(q)) ||
        CATEGORY_LABELS[rec.category].toLowerCase().includes(q)
      );
    });
  }, [recordings, dogs, dogFilter, categoryFilter, searchQuery]);

  const activeRecording = useMemo(() => {
    return (
      filteredRecordings.find((r) => r.id === selectedId) ??
      filteredRecordings[0] ??
      recordings[0] ??
      null
    );
  }, [filteredRecordings, recordings, selectedId]);

  const activeDog = useMemo(() => {
    if (!activeRecording) return undefined;
    return dogs.find((d) => d.id === activeRecording.dogId);
  }, [activeRecording, dogs]);

  const switchTab = (next: AppTab) => {
    audioEngine.stop();
    setPlayingId(null);
    setProgressRatio(0);
    setActiveTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const playRecording = (rec: VocalRecording, startRatio = 0, speedOverride?: PlaybackSpeed) => {
    const spd = speedOverride ?? playbackSpeed;
    setSelectedId(rec.id);
    setPlayingId(rec.id);
    setProgressRatio(startRatio);

    audioEngine.playVocalization({
      acoustic: rec.acoustic,
      durationSec: rec.durationSec,
      speed: spd,
      startOffsetRatio: startRatio,
      audioUrl: rec.audioUrl,
      onProgress: (ratio) => setProgressRatio(ratio),
      onEnded: () => {
        setPlayingId(null);
        setProgressRatio(0);
      },
    });
  };

  const handleTogglePlay = (rec: VocalRecording) => {
    if (playingId === rec.id) {
      audioEngine.stop();
      setPlayingId(null);
      return;
    }
    const startAt = selectedId === rec.id && progressRatio > 0 && progressRatio < 0.96 ? progressRatio : 0;
    playRecording(rec, startAt);
  };

  const handleSeek = (ratio: number) => {
    if (!activeRecording) return;
    setProgressRatio(ratio);
    if (playingId === activeRecording.id) {
      playRecording(activeRecording, ratio);
    }
  };

  const handleSpeedChange = (newSpeed: PlaybackSpeed) => {
    setPlaybackSpeed(newSpeed);
    if (activeRecording && playingId === activeRecording.id) {
      playRecording(activeRecording, progressRatio, newSpeed);
    }
  };

  const handleRestart = () => {
    if (!activeRecording) return;
    playRecording(activeRecording, 0);
  };

  const handleUpdateNotes = (recordingId: string, notes: string) => {
    setRecordings((prev) =>
      prev.map((rec) => (rec.id === recordingId ? { ...rec, guardianNotes: notes } : rec))
    );
  };

  const handleUpdateStatus = (recordingId: string, status: ValidationStatus) => {
    setRecordings((prev) =>
      prev.map((rec) => (rec.id === recordingId ? { ...rec, status } : rec))
    );
  };

  const handleDeleteRecording = (recordingId: string) => {
    if (playingId === recordingId) {
      audioEngine.stop();
      setPlayingId(null);
      setProgressRatio(0);
    }
    setRecordings((prev) => {
      const next = prev.filter((r) => r.id !== recordingId);
      if (selectedId === recordingId) {
        setSelectedId(next[0]?.id ?? '');
      }
      return next;
    });
  };

  const handleExportRecord = (rec: VocalRecording) => {
    const dog = dogs.find((d) => d.id === rec.dogId);
    const lines = [
      'LATIDOS — FICHA DE REGISTO BIOACÚSTICO',
      '=======================================',
      `Título: ${rec.title}`,
      `Sujeito Canino: ${dog ? `${dog.name} (${dog.breed})` : rec.dogId}`,
      `Data / Hora: ${rec.displayDate}`,
      `Categoria Etológica: ${CATEGORY_LABELS[rec.category]}`,
      `Duração: 00:${rec.durationSec.toFixed(2).padStart(5, '0')} s`,
      `Frequência Fundamental (f0): ${rec.acoustic.fundamentalHz} Hz`,
      `Pico Espectral: ${rec.acoustic.peakHz} Hz`,
      `Cadência: ${rec.acoustic.cadencePerSec} impulsos/s`,
      '',
      'HIPÓTESE COMPORTAMENTAL',
      `Causa Provável: ${rec.hypothesis.primaryCause}`,
      `Mecanismo: ${rec.hypothesis.ethologicalMechanism}`,
      '',
      'ORIENTAÇÕES DE MANEIO',
      ...rec.hypothesis.managementAdvice.map((tip, i) => `${i + 1}. ${tip}`),
      '',
      'NOTAS DO TUTOR',
      rec.guardianNotes,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `latidos-ficha-${rec.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveNewRecording = (newRec: VocalRecording) => {
    setRecordings((prev) => [newRec, ...prev]);
    setDogFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
    setSelectedId(newRec.id);
    setActiveTab('catalog');
  };

  const handleAddDog = (newDog: DogProfile) => {
    setDogs((prev) => [...prev, newDog]);
  };

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'catalog', label: 'Catálogo Vocal' },
    { id: 'capture', label: 'Captação em Direto' },
    { id: 'lexicon', label: 'Léxico Etológico' },
    { id: 'profiles', label: 'Perfis Caninos' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F4EE] text-[#1A242F] pb-20 md:pb-12">
      {/* Top Navigation Bar — Primary Navy (#0F2A44), 3-Zone Contract */}
      <header className="sticky top-0 z-30 border-b border-[#0A1E31] bg-[#0F2A44] text-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-8 px-4 sm:px-8 lg:px-12">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => switchTab('catalog')}
            className="font-editorial text-[24px] font-semibold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Latidos
          </button>

          {/* Zone 2: Clean single-line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id)}
                  className={`relative py-2 text-[14px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:bg-[#1F7A7A]'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => switchTab('capture')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] bg-[#B9411B] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#9E3514] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mic className="h-4 w-4 shrink-0" />
              <span>Iniciar Captação</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-8 sm:pt-8 lg:px-12">
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Editorial Section Header */}
            <header className="flex flex-col justify-between gap-4 border-b border-[#E5E0D5] pb-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#1F7A7A]">
                  Caderno de Campo Bioacústico
                </p>
                <h1 className="mt-1 font-editorial text-[30px] font-semibold leading-[38px] text-[#1A242F] text-balance">
                  Catálogo de Vocalizações Caninas
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#4B5866]">
                  Selecione uma ficha sonora para inspecionar o espectrograma, abrandar a modulação acústica e rever a hipótese comportamental associada.
                </p>
              </div>

              <div className="flex items-center gap-6 text-xs text-[#4B5866] shrink-0">
                <span className="tabular-nums">
                  <strong className="text-base font-semibold text-[#1A242F]">{recordings.length}</strong> registos no arquivo
                </span>
                <span className="tabular-nums">
                  <strong className="text-base font-semibold text-[#B9411B]">
                    {recordings.filter((r) => r.status === 'critical_trigger').length}
                  </strong>{' '}
                  gatilhos críticos
                </span>
              </div>
            </header>

            {/* Filter & Search Bar (Permanent Top Labels, 48px Height, 8px Radius) */}
            <section
              aria-label="Filtros do catálogo"
              className="grid grid-cols-1 gap-4 rounded-[8px] border border-[#E5E0D5] bg-white p-4 md:grid-cols-12"
            >
              <div className="md:col-span-5">
                <label htmlFor="catalog-search" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                  Pesquisar no catálogo
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#4B5866]" />
                  <input
                    id="catalog-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Título, gatilho ou nota de campo…"
                    className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white pr-9 pl-10 text-sm text-[#1A242F] placeholder:text-[#4B5866]/70 focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpar pesquisa"
                      className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-[#4B5866] hover:bg-[#FAF8F3] cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <label htmlFor="dog-filter" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                  Sujeito Canino
                </label>
                <select
                  id="dog-filter"
                  value={dogFilter}
                  onChange={(e) => setDogFilter(e.target.value)}
                  className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
                >
                  <option value="all">Todos os Cães ({dogs.length})</option>
                  {dogs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label htmlFor="category-filter" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                  Categoria Vocal
                </label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as VocalCategory | 'all')}
                  className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
                >
                  <option value="all">Todas as Categorias</option>
                  {(Object.keys(CATEGORY_LABELS) as VocalCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Split View: Left Recording List + Right Bioacoustic Inspector */}
            {filteredRecordings.length === 0 ? (
              <div className="rounded-[8px] border border-[#E5E0D5] bg-white p-10 text-center">
                <h2 className="font-editorial text-[22px] font-medium text-[#1A242F]">
                  Nenhum registo corresponde aos filtros atuais
                </h2>
                <p className="mt-2 text-sm text-[#4B5866]">
                  Ajuste os critérios de pesquisa ou inicie uma nova captação acústica para este sujeito.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDogFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="inline-flex min-h-[48px] items-center rounded-[8px] border-[1.5px] border-[#0F2A44] bg-white px-5 text-[13px] font-semibold text-[#0F2A44] hover:bg-[#FAF8F3] cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('capture')}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] bg-[#B9411B] px-5 text-[13px] font-semibold text-white hover:bg-[#9E3514] cursor-pointer"
                  >
                    <Mic className="h-4 w-4" />
                    <span>Nova Captação</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-8 lg:grid-cols-12">
                {/* Left Column: Fichas de Latido */}
                <section
                  aria-label="Lista de registos sonoros"
                  className="space-y-4 md:col-span-3 lg:col-span-5"
                >
                  {filteredRecordings.map((rec) => (
                    <RecordingCard
                      key={rec.id}
                      recording={rec}
                      dog={dogs.find((d) => d.id === rec.dogId)}
                      isSelected={activeRecording?.id === rec.id}
                      isPlaying={playingId === rec.id}
                      progressRatio={playingId === rec.id ? progressRatio : 0}
                      onSelect={() => {
                        if (playingId && playingId !== rec.id) {
                          audioEngine.stop();
                          setPlayingId(null);
                          setProgressRatio(0);
                        }
                        setSelectedId(rec.id);
                      }}
                      onTogglePlay={(e) => {
                        e.stopPropagation();
                        handleTogglePlay(rec);
                      }}
                    />
                  ))}
                </section>

                {/* Right Column: Detailed Bioacoustic Spectrogram & Behavioral Hypothesis */}
                {activeRecording && (
                  <section
                    aria-label="Painel de análise bioacústica"
                    className="rounded-[8px] border border-[#E5E0D5] bg-white p-5 sm:p-6 md:col-span-5 lg:col-span-7 lg:sticky lg:top-24"
                  >
                    {/* Header with Dog Portrait + Title + Status Tag */}
                    <div className="flex flex-col justify-between gap-4 border-b border-[#E5E0D5] pb-5 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-3.5">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3]">
                          {activeDog?.imageUrl && !failedThumbIds[activeDog.id] ? (
                            <img
                              src={activeDog.imageUrl}
                              alt={`Retrato de ${activeDog.name}`}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedThumbIds((prev) => ({ ...prev, [activeDog.id]: true }))
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-editorial text-sm font-semibold text-[#0F2A44]">
                              {activeDog?.name.slice(0, 2).toUpperCase() ?? 'CN'}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#4B5866]">
                            <span className="font-semibold text-[#1A242F]">
                              {activeDog?.name ?? 'Cão'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{activeDog?.breed}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{activeRecording.displayDate}</span>
                          </div>
                          <h2 className="mt-1 font-editorial text-[24px] font-semibold leading-[30px] text-[#1A242F] sm:text-[28px] sm:leading-[34px]">
                            {activeRecording.title}
                          </h2>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {activeRecording.status === 'validated' && (
                          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#1F7A7A] bg-[#1F7A7A]/12 px-3 py-1.5 text-xs font-semibold text-[#1F7A7A]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Correspondência Validada</span>
                          </span>
                        )}
                        {activeRecording.status === 'critical_trigger' && (
                          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#B9411B] bg-[#B9411B]/10 px-3 py-1.5 text-xs font-semibold text-[#B9411B]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Gatilho Crítico</span>
                          </span>
                        )}
                        {activeRecording.status === 'pending_review' && (
                          <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] px-3 py-1.5 text-xs font-semibold text-[#4B5866]">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Em Revisão</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Interactive Spectrogram + Waveform Player */}
                    <div className="mt-5">
                      <SpectrogramPlayer
                        title={activeRecording.title}
                        acoustic={activeRecording.acoustic}
                        durationSec={activeRecording.durationSec}
                        isPlaying={playingId === activeRecording.id}
                        progressRatio={
                          playingId === activeRecording.id || selectedId === activeRecording.id
                            ? progressRatio
                            : 0
                        }
                        speed={playbackSpeed}
                        onTogglePlay={() => handleTogglePlay(activeRecording)}
                        onSeek={handleSeek}
                        onSpeedChange={handleSpeedChange}
                        onRestart={handleRestart}
                      />
                    </div>

                    {/* Acoustic Telemetry Readout Strip */}
                    <div className="mt-6 grid grid-cols-3 divide-x divide-[#E5E0D5] rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3]">
                      <div className="p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#4B5866]">
                          Freq. Fundamental
                        </p>
                        <p className="mt-1 font-acoustic text-lg font-semibold text-[#1A242F]">
                          {activeRecording.acoustic.fundamentalHz}{' '}
                          <span className="text-xs font-normal text-[#4B5866]">Hz</span>
                        </p>
                      </div>
                      <div className="p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#4B5866]">
                          Impulso Médio
                        </p>
                        <p className="mt-1 font-acoustic text-lg font-semibold text-[#1A242F]">
                          {activeRecording.acoustic.pulseDurationSec.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-[#4B5866]">s</span>
                        </p>
                      </div>
                      <div className="p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#4B5866]">
                          Cadência · Energia
                        </p>
                        <p className="mt-1 font-acoustic text-lg font-semibold text-[#1A242F]">
                          {activeRecording.acoustic.cadencePerSec}{' '}
                          <span className="text-xs font-normal text-[#4B5866]">
                            /s · {activeRecording.acoustic.intensityLevel}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Behavioral Hypothesis & Guardian Notes */}
                    <div className="mt-6">
                      <HypothesisPanel
                        recording={activeRecording}
                        onUpdateNotes={handleUpdateNotes}
                        onUpdateStatus={handleUpdateStatus}
                        onDeleteRecording={handleDeleteRecording}
                        onExportRecord={handleExportRecord}
                      />
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'capture' && (
          <LiveCaptureView
            dogs={dogs}
            onSaveRecording={handleSaveNewRecording}
            onCancel={() => switchTab('catalog')}
          />
        )}

        {activeTab === 'lexicon' && (
          <LexiconView
            onFilterCatalogByCategory={(category) => {
              setCategoryFilter(category);
              setDogFilter('all');
              setSearchQuery('');
              switchTab('catalog');
            }}
          />
        )}

        {activeTab === 'profiles' && (
          <ProfilesView
            dogs={dogs}
            recordings={recordings}
            onAddDog={handleAddDog}
            onSelectDogCatalog={(dogId) => {
              setDogFilter(dogId);
              setCategoryFilter('all');
              setSearchQuery('');
              switchTab('catalog');
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation (< 768px, height 64px <= 15% mobile viewport cap) */}
      <nav
        aria-label="Navegação móvel"
        className="fixed right-0 bottom-0 left-0 z-30 grid h-16 grid-cols-4 border-t border-[#E5E0D5] bg-white/95 backdrop-blur-sm md:hidden"
      >
        <button
          type="button"
          onClick={() => switchTab('catalog')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
            activeTab === 'catalog' ? 'text-[#0F2A44]' : 'text-[#4B5866]'
          }`}
        >
          <ListMusic className="h-5 w-5" />
          <span>Catálogo</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('capture')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
            activeTab === 'capture' ? 'text-[#B9411B]' : 'text-[#4B5866]'
          }`}
        >
          <Mic className="h-5 w-5" />
          <span>Captar</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('lexicon')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
            activeTab === 'lexicon' ? 'text-[#0F2A44]' : 'text-[#4B5866]'
          }`}
        >
          <BookOpen className="h-5 w-5" />
          <span>Léxico</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('profiles')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer ${
            activeTab === 'profiles' ? 'text-[#0F2A44]' : 'text-[#4B5866]'
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Perfis</span>
        </button>
      </nav>
    </div>
  );
}
