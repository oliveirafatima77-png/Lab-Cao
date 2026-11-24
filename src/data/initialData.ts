import { DogProfile, LexiconEntry, VocalCategory, VocalRecording } from '../types/ethology';

export const CATEGORY_LABELS: Record<VocalCategory, string> = {
  alerta_territorial: 'Alerta Territorial',
  solicitacao: 'Solicitação de Atenção',
  frustracao_separacao: 'Ansiedade / Separação',
  ludico: 'Convite Lúdico',
  advertencia: 'Advertência Defensiva',
  coesao_social: 'Coesão Social (Uivo)',
};

export const POSTURE_LABELS = {
  erect_forward: 'Orelhas eretas · Corpo projetado',
  relaxed_loose: 'Postura relaxada · Cauda solta',
  retracted_tense: 'Recuo corporal · Orelhas retraídas',
} as const;

export const TRIGGER_OPTIONS = [
  'Estímulo na porta ou janela',
  'Ausência do tutor',
  'Interação lúdica',
  'Sinalização de recurso ou desconforto',
  'Aproximação de desconhecido',
  'Ruído urbano súbito',
];

function buildWaveform(
  pulses: number,
  length = 72,
  tonality: 'harmonic' | 'mixed' | 'broadband' = 'mixed',
  seed = 1
): number[] {
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    if (pulses <= 1) {
      const env = Math.sin(Math.PI * t);
      const mod =
        tonality === 'harmonic'
          ? 0.85 + 0.15 * Math.sin(i * 0.9 + seed)
          : 0.65 + 0.35 * Math.abs(Math.sin(i * 1.7 + seed));
      result.push(Math.max(0.08, Math.min(0.98, env * mod)));
    } else {
      const cycle = (t * pulses) % 1;
      const burst = cycle < 0.52 ? Math.sin((cycle / 0.52) * Math.PI) : 0.08;
      const jitter = 0.78 + 0.22 * Math.abs(Math.sin(i * 2.3 + seed * 3.1));
      result.push(Math.max(0.06, Math.min(0.98, burst * jitter)));
    }
  }
  return result;
}

export const INITIAL_DOGS: DogProfile[] = [
  {
    id: 'dog-cabo',
    name: 'Cabo',
    breed: 'Cão de Água Português',
    ageLabel: '4 anos',
    weightKg: 21,
    baselineF0Hz: 540,
    imageUrl: '/src/assets/images/dog_cabo_portrait_1795526604394.jpg',
    environmentNote: 'Habitação térrea com jardim frontal e passagem pedonal frequente.',
    vocalProfileSummary:
      'Vocalização estruturada e ressonante. Tende a usar sequências curtas de alerta na presença de transeuntes e murmúrios harmónicos ao solicitar saída.',
  },
  {
    id: 'dog-mel',
    name: 'Mel',
    breed: 'Podengo Português Médio',
    ageLabel: '2 anos e 6 meses',
    weightKg: 15,
    baselineF0Hz: 710,
    imageUrl: '/src/assets/images/dog_mel_portrait_1795526604523.jpg',
    environmentNote: 'Apartamento urbano no 2.º andar, exposto a ruídos de escada e elevador.',
    vocalProfileSummary:
      'Repertório agudo e altamente modulável. Apresenta ganidos de transição rápida quando antecipa passeios ou durante períodos iniciais de isolamento.',
  },
  {
    id: 'dog-bruma',
    name: 'Bruma',
    breed: 'Pastor Belga Malinois',
    ageLabel: '5 anos',
    weightKg: 27,
    baselineF0Hz: 420,
    imageUrl: '/src/assets/images/dog_bruma_portrait_1795526604218.jpg',
    environmentNote: 'Quinta periurbana com treino diário de obediência e deteção olfativa.',
    vocalProfileSummary:
      'Frequência fundamental grave com banda larga bem marcada em alertas defensivos. Responde rapidamente a redirecionamento por sinal visual.',
  },
];

export const INITIAL_RECORDINGS: VocalRecording[] = [
  {
    id: 'rec-001',
    dogId: 'dog-cabo',
    title: 'Latido de Alerta Territorial',
    category: 'alerta_territorial',
    timestampIso: '2026-11-24T08:14:00',
    displayDate: '24 Nov 2026, 08:14',
    durationSec: 3.42,
    status: 'validated',
    triggers: ['Estímulo na porta ou janela', 'Aproximação de desconhecido'],
    posture: 'erect_forward',
    guardianNotes:
      'Ocorreu aquando da entrega de correio junto ao portão. O Cabo manteve o foco visual na entrada, cessando após reconhecimento verbal do tutor.',
    acoustic: {
      fundamentalHz: 580,
      peakHz: 1160,
      bandwidthHz: 1950,
      pulseCount: 5,
      pulseDurationSec: 0.24,
      cadencePerSec: 1.8,
      tonality: 'mixed',
      intensityLevel: 'Elevada',
      waveform: buildWaveform(5, 72, 'mixed', 2),
    },
    hypothesis: {
      primaryCause: 'Vigilância territorial perante aproximação ao perímetro doméstico',
      ethologicalMechanism:
        'Sequência rítmica de impulsos médios (580 Hz) com componente ruidoso sobreposto. Na etologia canina, esta cadência regular assinala deteção de estímulo externo sem intenção imediata de contacto agonístico.',
      managementAdvice: [
        'Reconhecer o aviso com voz calma e redirecionar o olhar do cão para uma zona interior neutra.',
        'Evitar repreensões em tom elevado, pois o cão interpreta o volume vocal do tutor como reforço do estado de alerta.',
        'Introduzir barreiras visuais parciais no portão caso a passagem pedonal gere vigilância contínua.',
      ],
      confidenceLabel: 'Correspondência bioacústica elevada',
    },
  },
  {
    id: 'rec-002',
    dogId: 'dog-mel',
    title: 'Murmúrio de Solicitação',
    category: 'solicitacao',
    timestampIso: '2026-11-24T07:45:00',
    displayDate: '24 Nov 2026, 07:45',
    durationSec: 2.85,
    status: 'validated',
    triggers: ['Interação lúdica'],
    posture: 'relaxed_loose',
    guardianNotes:
      'Emitido junto à porta da varanda antes do passeio matinal. Frequência ascendente suave no final de cada emissão.',
    acoustic: {
      fundamentalHz: 840,
      peakHz: 1680,
      bandwidthHz: 620,
      pulseCount: 2,
      pulseDurationSec: 0.85,
      cadencePerSec: 0.9,
      tonality: 'harmonic',
      intensityLevel: 'Baixa',
      waveform: buildWaveform(2, 72, 'harmonic', 5),
    },
    hypothesis: {
      primaryCause: 'Comunicação afiliativa de pedido dirigido ao tutor',
      ethologicalMechanism:
        'Estrutura tonal limpa com harmónicos bem definidos em 840 Hz e 1680 Hz e modulação ascendente. Vocalizações tonais agudas mimetizam sinais juvenis de proximidade para induzir cooperação sem tensão.',
      managementAdvice: [
        'Aguardar 3 a 5 segundos de silêncio e postura tranquila antes de abrir a porta ou iniciar a ação pedida.',
        'Reforçar o comportamento alternativo de espera sentada para consolidar comunicação serena.',
      ],
      confidenceLabel: 'Padrão harmónico consistente',
    },
  },
  {
    id: 'rec-003',
    dogId: 'dog-mel',
    title: 'Ganido Contínuo de Separação',
    category: 'frustracao_separacao',
    timestampIso: '2026-11-23T18:22:00',
    displayDate: '23 Nov 2026, 18:22',
    durationSec: 4.65,
    status: 'critical_trigger',
    triggers: ['Ausência do tutor'],
    posture: 'retracted_tense',
    guardianNotes:
      'Registado 12 minutos após saída de casa através da câmara acústica da sala. Nota-se aceleração respiratória entre os ganidos.',
    acoustic: {
      fundamentalHz: 960,
      peakHz: 2140,
      bandwidthHz: 1120,
      pulseCount: 3,
      pulseDurationSec: 1.15,
      cadencePerSec: 0.7,
      tonality: 'harmonic',
      intensityLevel: 'Elevada',
      waveform: buildWaveform(3, 72, 'harmonic', 9),
    },
    hypothesis: {
      primaryCause: 'Stresse agudo por isolamento e perda de contacto social',
      ethologicalMechanism:
        'Frequência fundamental elevada (~960 Hz) com longa sustentação e ligeira instabilidade tímbrica. Indica ativação do sistema de pânico/separação e procura ativa de restabelecimento de vínculo.',
      managementAdvice: [
        'Implementar protocolo gradual de dessensibilização a partidas com ausências curtas abaixo do limiar de ansiedade.',
        'Oferecer enriquecimento olfativo de longa duração (tapete de lamber ou brinquedo recheável) nos primeiros 15 minutos após a saída.',
        'Monitorizar evolução semanal; se persistir após 3 semanas, consultar médico veterinário especialista em etologia clínica.',
      ],
      confidenceLabel: 'Gatilho comportamental prioritário',
    },
  },
  {
    id: 'rec-004',
    dogId: 'dog-bruma',
    title: 'Rosnado Grave de Advertência',
    category: 'advertencia',
    timestampIso: '2026-11-23T15:10:00',
    displayDate: '23 Nov 2026, 15:10',
    durationSec: 2.18,
    status: 'critical_trigger',
    triggers: ['Sinalização de recurso ou desconforto', 'Aproximação de desconhecido'],
    posture: 'retracted_tense',
    guardianNotes:
      'Bruma descansava no tapete com objeto roedor quando uma visita se aproximou rapidamente por trás.',
    acoustic: {
      fundamentalHz: 195,
      peakHz: 410,
      bandwidthHz: 1480,
      pulseCount: 1,
      pulseDurationSec: 1.85,
      cadencePerSec: 0.5,
      tonality: 'broadband',
      intensityLevel: 'Moderada',
      waveform: buildWaveform(1, 72, 'broadband', 4),
    },
    hypothesis: {
      primaryCause: 'Pedido de aumento de distância espacial perante invasão de zona de conforto',
      ethologicalMechanism:
        'Energia concentrada em baixas frequências (195 Hz) com espectro contínuo ruidoso. Segundo a regra estrutural-motivacional de Morton, sons graves e ásperos comunicam defesa de espaço para evitar escalada física.',
      managementAdvice: [
        'Nunca punir o rosnado: trata-se de um sinal comunicativo precioso que previne reações mais intensas.',
        'Instruir visitas a recuar suavemente, permitindo que o cão controle o ritmo e a distância da interação.',
        'Respeitar zonas de repouso e objetos de elevado valor através de gestão ambiental preventiva.',
      ],
      confidenceLabel: 'Sinal de distância confirmado',
    },
  },
  {
    id: 'rec-005',
    dogId: 'dog-cabo',
    title: 'Série Breve de Convite Lúdico',
    category: 'ludico',
    timestampIso: '2026-11-22T17:04:00',
    displayDate: '22 Nov 2026, 17:04',
    durationSec: 2.4,
    status: 'validated',
    triggers: ['Interação lúdica'],
    posture: 'relaxed_loose',
    guardianNotes:
      'Emitido em posição de vénia lúdica (membros anteriores fletidos) durante brincadeira no jardim.',
    acoustic: {
      fundamentalHz: 730,
      peakHz: 1460,
      bandwidthHz: 940,
      pulseCount: 4,
      pulseDurationSec: 0.16,
      cadencePerSec: 2.6,
      tonality: 'harmonic',
      intensityLevel: 'Moderada',
      waveform: buildWaveform(4, 72, 'harmonic', 7),
    },
    hypothesis: {
      primaryCause: 'Excitação positiva e convite à interação motora',
      ethologicalMechanism:
        'Impulsos breves (< 0.18 s) com elevada periodicidade harmónica e ataque suave. A presença de tom limpo acima de 700 Hz distingue nitidamente o latido lúdico do latido de alarme.',
      managementAdvice: [
        'Corresponder com sessões estruturadas de jogo de busca ou tração controlada com sinais claros de início e fim.',
        'Intercalar pausas breves de 10 segundos para ensinar autorregulação emocional durante picos de excitação.',
      ],
      confidenceLabel: 'Correspondência lúdica validada',
    },
  },
  {
    id: 'rec-006',
    dogId: 'dog-bruma',
    title: 'Uivo Prolongado de Coesão',
    category: 'coesao_social',
    timestampIso: '2026-11-21T20:30:00',
    displayDate: '21 Nov 2026, 20:30',
    durationSec: 4.1,
    status: 'pending_review',
    triggers: ['Ruído urbano súbito'],
    posture: 'erect_forward',
    guardianNotes:
      'Desencadeado pela passagem distante de sirene na estrada nacional. Cabeça elevada, sem sinais de agitação motora.',
    acoustic: {
      fundamentalHz: 460,
      peakHz: 920,
      bandwidthHz: 510,
      pulseCount: 1,
      pulseDurationSec: 3.6,
      cadencePerSec: 0.3,
      tonality: 'harmonic',
      intensityLevel: 'Elevada',
      waveform: buildWaveform(1, 72, 'harmonic', 11),
    },
    hypothesis: {
      primaryCause: 'Resposta acústica ancestral a estímulo tonal prolongado',
      ethologicalMechanism:
        'Contorno espectral contínuo e estável com modulação lenta (460 Hz). O uivo alelopático responde reflexivamente a frequências sustentadas no ambiente, sem implicar necessariamente sofrimento emocional.',
      managementAdvice: [
        'Observar a linguagem corporal pós-estímulo: se o cão regressar prontamente ao repouso, não requer intervenção.',
        'Caso ocorra desconforto auditivo evidente, fechar temporariamente portadas ou introduzir som ambiente suave.',
      ],
      confidenceLabel: 'Em revisão observacional',
    },
  },
];

export const LEXICON_ENTRIES: LexiconEntry[] = [
  {
    category: 'alerta_territorial',
    title: 'Latido de Alerta Territorial',
    scientificClassification: 'Impulso rítmico de banda mista · 450–850 Hz',
    frequencyRange: '450 – 850 Hz (f0)',
    morphology: 'Séries de 3 a 7 impulsos curtos (0.20–0.32 s) separados por pausas regulares.',
    evolutionaryFunction:
      'Sinalizar ao grupo social a presença de estímulos no perímetro e dissuadir aproximações desconhecidas.',
    differentialCues:
      'Ao contrário do latido lúdico, apresenta maior rugosidade espectral e postura corporal projetada para a frente.',
    sampleDurationSec: 2.6,
    sampleAcoustic: {
      fundamentalHz: 560,
      peakHz: 1120,
      bandwidthHz: 1800,
      pulseCount: 4,
      pulseDurationSec: 0.24,
      cadencePerSec: 1.9,
      tonality: 'mixed',
      intensityLevel: 'Elevada',
      waveform: buildWaveform(4, 56, 'mixed', 3),
    },
  },
  {
    category: 'solicitacao',
    title: 'Murmúrio e Vocalização de Solicitação',
    scientificClassification: 'Emissão tonal harmónica · 650–1050 Hz',
    frequencyRange: '650 – 1050 Hz (f0)',
    morphology: 'Contorno suave com 2 a 4 harmónicos claros e inflexão ascendente terminal.',
    evolutionaryFunction:
      'Obter atenção, acesso espacial ou proximidade afiliativa do tutor sem induzir resposta defensiva.',
    differentialCues:
      'Menor intensidade acústica (dB) e ausência de ruído broadband áspero em comparação com o ganido de pânico.',
    sampleDurationSec: 2.2,
    sampleAcoustic: {
      fundamentalHz: 820,
      peakHz: 1640,
      bandwidthHz: 580,
      pulseCount: 2,
      pulseDurationSec: 0.78,
      cadencePerSec: 0.9,
      tonality: 'harmonic',
      intensityLevel: 'Baixa',
      waveform: buildWaveform(2, 56, 'harmonic', 6),
    },
  },
  {
    category: 'frustracao_separacao',
    title: 'Ganido de Frustração ou Separação',
    scientificClassification: 'Tonal sustentado de alta frequência · 850–1400 Hz',
    frequencyRange: '850 – 1400 Hz (f0)',
    morphology: 'Emissões longas (> 0.9 s) com ligeira instabilidade de frequência e pausas ofegantes.',
    evolutionaryFunction:
      'Restabelecer contacto com o grupo em situações de isolamento involuntário ou bloqueio de objetivo.',
    differentialCues:
      'Surge associado a sinais somáticos de ansiedade (bocejos, deambulação junto à porta, salivação).',
    sampleDurationSec: 3.1,
    sampleAcoustic: {
      fundamentalHz: 980,
      peakHz: 1960,
      bandwidthHz: 1050,
      pulseCount: 2,
      pulseDurationSec: 1.1,
      cadencePerSec: 0.7,
      tonality: 'harmonic',
      intensityLevel: 'Elevada',
      waveform: buildWaveform(2, 56, 'harmonic', 8),
    },
  },
  {
    category: 'ludico',
    title: 'Latido Lúdico de Convite',
    scientificClassification: 'Staccato tonal agudo · 680–1100 Hz',
    frequencyRange: '680 – 1100 Hz (f0)',
    morphology: 'Impulsos muito breves (0.12–0.18 s) com ataque arredondado e cadência rápida.',
    evolutionaryFunction:
      'Manter o enquadramento metacomunicativo de jogo e recrutar parceiros para perseguição cooperativa.',
    differentialCues:
      'Acompanhado de relaxamento facial, boca entreaberta e vénia lúdica com movimentação lateral solta da cauda.',
    sampleDurationSec: 2.1,
    sampleAcoustic: {
      fundamentalHz: 750,
      peakHz: 1500,
      bandwidthHz: 850,
      pulseCount: 4,
      pulseDurationSec: 0.15,
      cadencePerSec: 2.6,
      tonality: 'harmonic',
      intensityLevel: 'Moderada',
      waveform: buildWaveform(4, 56, 'harmonic', 10),
    },
  },
  {
    category: 'advertencia',
    title: 'Rosnado de Advertência Defensiva',
    scientificClassification: 'Sinal contínuo de banda larga grave · 140–320 Hz',
    frequencyRange: '140 – 320 Hz (f0)',
    morphology: 'Duração contínua (1.0–3.5 s) com energia concentrada abaixo dos 500 Hz e textura granulada.',
    evolutionaryFunction:
      'Comunicar desconforto imediato e solicitar aumento de distância sem recorrer a contacto físico.',
    differentialCues:
      'Distinto do rosnado de jogo por apresentar corpo rígido, olhar fixo periférico e ausência de pausas lúdicas.',
    sampleDurationSec: 2.2,
    sampleAcoustic: {
      fundamentalHz: 185,
      peakHz: 370,
      bandwidthHz: 1400,
      pulseCount: 1,
      pulseDurationSec: 1.9,
      cadencePerSec: 0.5,
      tonality: 'broadband',
      intensityLevel: 'Moderada',
      waveform: buildWaveform(1, 56, 'broadband', 12),
    },
  },
  {
    category: 'coesao_social',
    title: 'Uivo de Coesão Social',
    scientificClassification: 'Tonal modulado de longa distância · 350–650 Hz',
    frequencyRange: '350 – 650 Hz (f0)',
    morphology: 'Arco contínuo ascendente-descendente (2.5–5.0 s) com baixa dispersão harmónica.',
    evolutionaryFunction:
      'Sincronizar localização à distância e responder a sinais acústicos tonais prolongados do ambiente.',
    differentialCues:
      'Cadência lenta e sustentada com cabeça elevada em extensão cervical, distinta da angústia aguda.',
    sampleDurationSec: 3.0,
    sampleAcoustic: {
      fundamentalHz: 460,
      peakHz: 920,
      bandwidthHz: 480,
      pulseCount: 1,
      pulseDurationSec: 2.7,
      cadencePerSec: 0.35,
      tonality: 'harmonic',
      intensityLevel: 'Elevada',
      waveform: buildWaveform(1, 56, 'harmonic', 14),
    },
  },
];
