export type VocalCategory =
  | 'alerta_territorial'
  | 'solicitacao'
  | 'frustracao_separacao'
  | 'ludico'
  | 'advertencia'
  | 'coesao_social';

export type ValidationStatus = 'validated' | 'critical_trigger' | 'pending_review';

export type BodyPosture =
  | 'erect_forward'
  | 'relaxed_loose'
  | 'retracted_tense';

export interface DogProfile {
  id: string;
  name: string;
  breed: string;
  ageLabel: string;
  weightKg: number;
  baselineF0Hz: number;
  imageUrl?: string;
  environmentNote: string;
  vocalProfileSummary: string;
}

export interface AcousticSignature {
  fundamentalHz: number;
  peakHz: number;
  bandwidthHz: number;
  pulseCount: number;
  pulseDurationSec: number;
  cadencePerSec: number;
  tonality: 'harmonic' | 'mixed' | 'broadband';
  intensityLevel: 'Baixa' | 'Moderada' | 'Elevada';
  waveform: number[];
}

export interface BehavioralHypothesis {
  primaryCause: string;
  ethologicalMechanism: string;
  managementAdvice: string[];
  confidenceLabel: string;
}

export interface VocalRecording {
  id: string;
  dogId: string;
  title: string;
  category: VocalCategory;
  timestampIso: string;
  displayDate: string;
  durationSec: number;
  status: ValidationStatus;
  triggers: string[];
  posture: BodyPosture;
  guardianNotes: string;
  acoustic: AcousticSignature;
  hypothesis: BehavioralHypothesis;
  audioUrl?: string;
  isUserRecorded?: boolean;
}

export interface LexiconEntry {
  category: VocalCategory;
  title: string;
  scientificClassification: string;
  frequencyRange: string;
  morphology: string;
  evolutionaryFunction: string;
  differentialCues: string;
  sampleAcoustic: AcousticSignature;
  sampleDurationSec: number;
}
