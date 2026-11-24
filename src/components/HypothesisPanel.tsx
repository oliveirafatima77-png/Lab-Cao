import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileDown, Save, Trash2 } from 'lucide-react';
import { POSTURE_LABELS } from '../data/initialData';
import { ValidationStatus, VocalRecording } from '../types/ethology';

interface HypothesisPanelProps {
  recording: VocalRecording;
  onUpdateNotes: (recordingId: string, notes: string) => void;
  onUpdateStatus: (recordingId: string, status: ValidationStatus) => void;
  onDeleteRecording: (recordingId: string) => void;
  onExportRecord: (recording: VocalRecording) => void;
}

export const HypothesisPanel: React.FC<HypothesisPanelProps> = ({
  recording,
  onUpdateNotes,
  onUpdateStatus,
  onDeleteRecording,
  onExportRecord,
}) => {
  const [draftNotes, setDraftNotes] = useState(recording.guardianNotes);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setDraftNotes(recording.guardianNotes);
    setSavedFeedback(false);
  }, [recording.id, recording.guardianNotes]);

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNotes(recording.id, draftNotes);
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2400);
  };

  return (
    <div className="space-y-6">
      {/* Behavioral Hypothesis Card (Latidos Spec Component #6: #FAF8F3 + #E5E0D5 + 4px left #1F7A7A) */}
      <section
        aria-labelledby="hypothesis-heading"
        className="rounded-[8px] border border-[#E5E0D5] border-l-4 border-l-[#1F7A7A] bg-[#FAF8F3] p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#1F7A7A]">
              Hipótese Comportamental
            </p>
            <h3
              id="hypothesis-heading"
              className="mt-1 font-editorial text-[20px] font-medium leading-[26px] text-[#1A242F]"
            >
              {recording.hypothesis.primaryCause}
            </h3>
          </div>
          <span className="rounded-[8px] border border-[#E5E0D5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4B5866]">
            {recording.hypothesis.confidenceLabel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#1A242F]">
          {recording.hypothesis.ethologicalMechanism}
        </p>

        <div className="mt-4 border-t border-[#E5E0D5] pt-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-[0.03em] text-[#4B5866]">
            Orientações de Maneio e Bem-Estar
          </h4>
          <ul className="mt-2 space-y-2 text-sm leading-5 text-[#1A242F]">
            {recording.hypothesis.managementAdvice.map((tip, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <span className="mt-0.5 font-acoustic text-xs font-semibold text-[#1F7A7A]">
                  0{index + 1}.
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Observed Context & Posture */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-4">
          <p className="text-xs font-semibold text-[#4B5866]">Gatilhos Ambientais Registados</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recording.triggers.length > 0 ? (
              recording.triggers.map((trigger) => (
                <span
                  key={trigger}
                  className="rounded-[8px] border border-[#E5E0D5] bg-white px-2.5 py-1 text-xs font-medium text-[#1A242F]"
                >
                  {trigger}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#4B5866]">Sem gatilho externo identificado</span>
            )}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#E5E0D5] bg-[#FAF8F3] p-4">
          <p className="text-xs font-semibold text-[#4B5866]">Postura Corporal Observada</p>
          <p className="mt-2 text-sm font-medium text-[#1A242F]">
            {POSTURE_LABELS[recording.posture]}
          </p>
        </div>
      </section>

      {/* Guardian Field Notes Form */}
      <form onSubmit={handleSaveNotes} className="space-y-3 border-t border-[#E5E0D5] pt-5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="guardian-notes" className="text-[13px] font-semibold text-[#1A242F]">
            Notas de Campo do Tutor
          </label>
          {savedFeedback && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F7A7A]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Notas guardadas
            </span>
          )}
        </div>
        <textarea
          id="guardian-notes"
          rows={3}
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          className="w-full rounded-[8px] border border-[#E5E0D5] bg-white p-3 text-sm leading-5 text-[#1A242F] focus:border-[#0F2A44] focus:outline-none focus:ring-2 focus:ring-[#0F2A44]/20"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] bg-[#0F2A44] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A3B5C] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Guardar Notas</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateStatus(
                  recording.id,
                  recording.status === 'validated' ? 'pending_review' : 'validated'
                )
              }
              className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border-[1.5px] border-[#0F2A44] bg-white px-4 text-[13px] font-semibold text-[#0F2A44] transition-colors hover:bg-[#FAF8F3] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-[#1F7A7A]" />
              <span>
                {recording.status === 'validated' ? 'Marcar para Revisão' : 'Validar Correspondência'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExportRecord(recording)}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold text-[#0F2A44] underline-offset-4 hover:underline cursor-pointer"
            >
              <FileDown className="h-4 w-4" />
              <span>Exportar Ficha</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteRecording(recording.id)}
              aria-label={`Eliminar registo ${recording.title}`}
              className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[8px] border border-[#E5E0D5] bg-white px-3 text-[#B9411B] transition-colors hover:bg-[#B9411B]/10 cursor-pointer"
              title="Eliminar registo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
