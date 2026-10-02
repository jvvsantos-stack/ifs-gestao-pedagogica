import Dexie from 'dexie';

export interface Curso {
  id?: number;
  nome: string;
  modalidade: string;
  arquivado?: boolean;
}

export interface Turma {
  id?: number;
  cursoId: number;
  nome: string;
  codigo: string;
  anoLetivo?: string;
  arquivado?: boolean;
  lastAccessed?: number;
}

export interface Disciplina {
  id?: number;
  turmaId: number;
  nome: string;
  chAula: number;
  chRelogio: number;
  arquivado?: boolean;
  periodoLetivo?: string;
}

export interface Aluno {
  id?: number;
  turmaId: number;
  nome: string;
}

export interface Nota {
  id?: number;
  alunoId: number;
  disciplinaId: number;
  etapa?: number;
  nota?: number;
  faltas?: number;
}

export interface AvaliacaoFinal {
  id?: number;
  alunoId: number;
  disciplinaId: number;
  recuperacao?: number;
  provaFinal?: number;
  aprovadoConselho?: boolean;
  statusConselho?: 'aprovado' | 'reprovado' | null;
}

export interface Ocorrencia {
  id?: number;
  alunoId: number;
  data: string;
  tipo: string;
  descricao: string;
  anexoNome?: string;
  anexoDados?: string | ArrayBuffer;
}

export interface Estagio {
  id?: number;
  alunoId: number;
  turmaId: number;
  dadosEmpresa: {
    nome: string;
    ramo: string;
    endereco: string;
    telefone: string;
    bairroCidade: string;
    cep: string;
  };
  supervisor: {
    nome: string;
  };
  dadosEstagiario: {
    curso?: string;
    anoConclusao: string;
    endereco: string;
    telefone: string;
    bairroCidade: string;
    cep: string;
  };
  dadosEstagio: {
    inicio: string;
    funcaoPrincipal: string;
    areasAtuacao: string;
    chDiaria: string;
  };
  dadosFinalizacao?: {
    termino: string;
    nota: string;
    chTotal: string;
    avaliacao: 'Fraco' | 'Regular' | 'Bom' | 'Ótimo' | '';
    comentarios: string;
    motivoNaoFinalizado?: 'Desistiu' | 'Não entregou relatório' | string;
  };
  status: 'Ativo' | 'Finalizado' | 'Arquivado' | 'Não Finalizado';
}

export class AppDatabase extends Dexie {
  cursos!: Dexie.Table<Curso, number>;
  turmas!: Dexie.Table<Turma, number>;
  disciplinas!: Dexie.Table<Disciplina, number>;
  alunos!: Dexie.Table<Aluno, number>;
  notas!: Dexie.Table<Nota, number>;
  avaliacoes_finais!: Dexie.Table<AvaliacaoFinal, number>;
  ocorrencias!: Dexie.Table<Ocorrencia, number>;
  estagios!: Dexie.Table<Estagio, number>;

  constructor() {
    super('GestaoPedagogicaDB');
    this.version(3).stores({
      turmas: '++id, nome, modalidade, serie',
      alunos: '++id, nome, matricula, turma',
      notas: '++id, alunoId, disciplina, situacao, data'
    });
    this.version(4).stores({
      turmas: '++id, nome, modalidade, serie',
      alunos: '++id, nome, matricula, turmaId',
      notas: '++id, alunoId, disciplina, situacao, data'
    }).upgrade(tx => {
      return tx.table('alunos').toCollection().modify(aluno => {
        aluno.turmaId = 0;
        delete aluno.turma;
      });
    });
    this.version(5).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo',
      disciplinas: '++id, turmaId, nome',
      alunos: '++id, nome, matricula, turmaId',
      notas: '++id, alunoId, disciplina, situacao, data'
    });
    this.version(6).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo',
      disciplinas: '++id, turmaId, nome',
      alunos: '++id, turmaId, nome, matricula',
      notas: '++id, alunoId, disciplinaId, nota, recuperacao, faltas, mediaEtapa'
    }).upgrade(tx => {
      // Clean up the old notas since the schema and relationship completely changed
      return tx.table('notas').clear();
    });
    this.version(7).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo',
      disciplinas: '++id, turmaId, nome',
      alunos: '++id, turmaId, nome',
      notas: '++id, alunoId, disciplinaId, nota, recuperacao, faltas, mediaEtapa'
    }).upgrade(tx => {
      return tx.table('alunos').toCollection().modify(aluno => {
        delete aluno.matricula;
      });
    });
    this.version(8).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo',
      disciplinas: '++id, turmaId, nome',
      alunos: '++id, turmaId, nome',
      notas: '++id, alunoId, disciplinaId, nota, faltas'
    }).upgrade(tx => {
      return tx.table('notas').toCollection().modify(nota => {
        delete nota.recuperacao;
        delete nota.mediaEtapa;
      });
    });
    this.version(9).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo',
      disciplinas: '++id, turmaId, nome',
      alunos: '++id, turmaId, nome',
      notas: '++id, alunoId, disciplinaId, etapa, nota, faltas',
      avaliacoes_finais: '++id, alunoId, disciplinaId, recuperacao, provaFinal'
    }).upgrade(tx => {
      return tx.table('notas').toCollection().modify(nota => {
        nota.etapa = 1; // Default para notas antigas se houver
      });
    });
    this.version(10).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo, anoLetivo, arquivado, lastAccessed',
      disciplinas: '++id, turmaId, nome, chAula, chRelogio, arquivado',
      alunos: '++id, turmaId, nome',
      notas: '++id, alunoId, disciplinaId, etapa, nota, faltas',
      avaliacoes_finais: '++id, alunoId, disciplinaId, recuperacao, provaFinal, aprovadoConselho, statusConselho'
    });
    this.version(11).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo, anoLetivo, arquivado, lastAccessed',
      disciplinas: '++id, turmaId, nome, chAula, chRelogio, arquivado',
      alunos: '++id, turmaId, nome',
      notas: '++id, alunoId, disciplinaId, etapa, nota, faltas',
      avaliacoes_finais: '++id, alunoId, disciplinaId, recuperacao, provaFinal, aprovadoConselho, statusConselho',
      ocorrencias: '++id, alunoId, data, tipo'
    });
    this.version(12).stores({
      cursos: '++id, nome, modalidade',
      turmas: '++id, cursoId, nome, codigo, anoLetivo, arquivado, lastAccessed',
      disciplinas: '++id, turmaId, nome, chAula, chRelogio, arquivado',
      alunos: '++id, turmaId, nome',
      notas: '++id, alunoId, disciplinaId, etapa, nota, faltas',
      avaliacoes_finais: '++id, alunoId, disciplinaId, recuperacao, provaFinal, aprovadoConselho, statusConselho',
      ocorrencias: '++id, alunoId, data, tipo',
      estagios: '++id, alunoId, turmaId, status'
    });
  }
}

export const db = new AppDatabase();
