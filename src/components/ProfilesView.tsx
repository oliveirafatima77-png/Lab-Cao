import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Plus, X } from 'lucide-react';
import { DogProfile, VocalRecording } from '../types/ethology';

interface ProfilesViewProps {
  dogs: DogProfile[];
  recordings: VocalRecording[];
  onAddDog: (dog: DogProfile) => void;
  onSelectDogCatalog: (dogId: string) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  dogs,
  recordings,
  onAddDog,
  onSelectDogCatalog,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [ageLabel, setAgeLabel] = useState('');
  const [weightKg, setWeightKg] = useState('18');
  const [baselineF0Hz, setBaselineF0Hz] = useState('560');
  const [environmentNote, setEnvironmentNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleCreateDog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !breed.trim()) {
      setErrorMsg('Preencha o nome e a raça ou tipologia do cão.');
      return;
    }

    const newDog: DogProfile = {
      id: `dog-${Date.now()}`,
      name: name.trim(),
      breed: breed.trim(),
      ageLabel: ageLabel.trim() || 'Idade não especificada',
      weightKg: Math.max(1, Number(weightKg) || 15),
      baselineF0Hz: Math.max(120, Math.min(1800, Number(baselineF0Hz) || 560)),
      environmentNote:
        environmentNote.trim() || 'Registo de contexto habitacional adicionado pelo tutor.',
      vocalProfileSummary:
        'Perfil recém-criado. Efetue 3 ou mais captações para estabelecer a assinatura espectral habitual.',
    };

    onAddDog(newDog);
    setName('');
    setBreed('');
    setAgeLabel('');
    setEnvironmentNote('');
    setErrorMsg(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[#E5E0D5] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#1F7A7A]">
            Sujeitos de Observação
          </p>
          <h1 className="mt-1 font-editorial text-[30px] font-semibold leading-[38px] text-[#1A242F] text-balance">
            Perfis Caninos e Linha de Base Acústica
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5866]">
            A morfologia laríngea e o porte corporal influenciam a frequência fundamental (f0). Acompanhe o repertório individual de cada cão.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] bg-[#0F2A44] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A3B5C] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{showForm ? 'Fechar Formulário' : 'Registar Novo Cão'}</span>
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreateDog}
          className="space-y-5 rounded-[8px] border border-[#E5E0D5] bg-white p-6"
        >
          <h2 className="font-editorial text-[22px] font-medium text-[#1A242F]">
            Novo Sujeito de Estudo
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="dog-name" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                Nome do Cão
              </label>
              <input
                id="dog-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Ex.: Tejo"
                className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
              />
            </div>

            <div>
              <label htmlFor="dog-breed" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                Raça / Tipologia
              </label>
              <input
                id="dog-breed"
                type="text"
                value={breed}
                onChange={(e) => {
                  setBreed(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Ex.: Serra da Estrela"
                className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
              />
            </div>

            <div>
              <label htmlFor="dog-age" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                Idade
              </label>
              <input
                id="dog-age"
                type="text"
                value={ageLabel}
                onChange={(e) => setAgeLabel(e.target.value)}
                placeholder="Ex.: 3 anos"
                className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
              />
            </div>

            <div>
              <label htmlFor="dog-weight" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                Peso Corporal (kg)
              </label>
              <input
                id="dog-weight"
                type="number"
                min={1}
                max={95}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 font-acoustic text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
              />
            </div>

            <div>
              <label htmlFor="dog-f0" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                Frequência Base Estimada (Hz)
              </label>
              <input
                id="dog-f0"
                type="number"
                min={120}
                max={1600}
                value={baselineF0Hz}
                onChange={(e) => setBaselineF0Hz(e.target.value)}
                className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 font-acoustic text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
              />
            </div>

            <div>
              <label htmlFor="dog-env" className="mb-1.5 block text-[13px] font-semibold text-[#1A242F]">
                Contexto Habitacional
              </label>
              <input
                id="dog-env"
                type="text"
                value={environmentNote}
                onChange={(e) => setEnvironmentNote(e.target.value)}
                placeholder="Ex.: Apartamento com varanda"
                className="h-12 w-full rounded-[8px] border border-[#E5E0D5] bg-white px-3.5 text-sm text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#B9411B]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex min-h-[48px] items-center rounded-[8px] bg-[#0F2A44] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A3B5C] cursor-pointer"
            >
              Guardar Perfil Canino
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dogs.map((dog) => {
          const dogRecs = recordings.filter((r) => r.dogId === dog.id);
          const criticalCount = dogRecs.filter((r) => r.status === 'critical_trigger').length;
          const imgFailed = failedImages[dog.id] || !dog.imageUrl;

          return (
            <article
              key={dog.id}
              className="flex flex-col justify-between rounded-[8px] border border-[#E5E0D5] bg-white p-5"
            >
              <div>
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3]">
                  {!imgFailed ? (
                    <img
                      src={dog.imageUrl}
                      alt={`Retrato documental de ${dog.name}, ${dog.breed}`}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [dog.id]: true }))}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#FAF8F3] to-[#E5E0D5]/60 p-4 text-center">
                      <span className="font-editorial text-2xl font-semibold text-[#0F2A44]">
                        {dog.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="mt-1 text-xs text-[#4B5866]">{dog.breed}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-editorial text-[22px] font-medium leading-[28px] text-[#1A242F]">
                      {dog.name}
                    </h2>
                    <span className="font-acoustic text-xs font-semibold text-[#1F7A7A]">
                      f0 {dog.baselineF0Hz} Hz
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#4B5866]">
                    {dog.breed} · {dog.ageLabel} · {dog.weightKg} kg
                  </p>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#1A242F]">
                  {dog.vocalProfileSummary}
                </p>

                <div className="mt-4 rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-3 text-xs leading-5 text-[#4B5866]">
                  <span className="font-semibold text-[#1A242F]">Envolvente habitual: </span>
                  {dog.environmentNote}
                </div>
              </div>

              <div className="mt-5 border-t border-[#E5E0D5] pt-4">
                <div className="mb-3 flex items-center justify-between text-xs text-[#4B5866]">
                  <span className="tabular-nums">
                    <strong className="font-semibold text-[#1A242F]">{dogRecs.length}</strong> registos sonoros
                  </span>
                  {criticalCount > 0 ? (
                    <span className="font-semibold text-[#B9411B] tabular-nums">
                      {criticalCount} gatilho(s) crítico(s)
                    </span>
                  ) : (
                    <span className="font-semibold text-[#1F7A7A]">Sem alertas críticos</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectDogCatalog(dog.id)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-[#0F2A44] bg-white px-4 text-[13px] font-semibold text-[#0F2A44] transition-colors hover:bg-[#FAF8F3] cursor-pointer"
                >
                  <span>Ver Fichas de {dog.name}</span>
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
