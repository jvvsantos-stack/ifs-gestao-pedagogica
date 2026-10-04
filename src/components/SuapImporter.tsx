import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../db/database';
export type Situacao = 'APR' | 'CUR' | 'PF' | 'REP' | '-';

interface RowData {
  nome: string;
  matricula: string;
  turma: string;
  disciplina: string;
  nota1?: number;
  nota2?: number;
  nota3?: number;
  nota4?: number;
  notaFinal?: number;
  faltas: number;
  situacao: Situacao;
}

type ImportStatus = 'idle' | 'loading' | 'preview' | 'saving' | 'success' | 'error';

const SITUACAO_LABELS: Record<Situacao, { label: string; color: string }> = {
  APR: { label: 'Aprovado', color: 'text-green-700 bg-green-100 dark:bg-green-900/40' },
  CUR: { label: 'Em Curso', color: 'text-blue-700 bg-blue-100' },
  PF:  { label: 'Prova Final', color: 'text-yellow-700 bg-yellow-100' },
  REP: { label: 'Reprovado', color: 'text-red-700 bg-red-100' },
  '-': { label: '-', color: 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800' },
};

function parseSituacao(raw: string): Situacao {
  const val = (raw || '').trim().toUpperCase();
  if (val === 'APR' || val === 'APROVADO') return 'APR';
  if (val === 'CUR' || val === 'EM CURSO' || val === 'CURSANDO') return 'CUR';
  if (val === 'PF' || val === 'PROVA FINAL') return 'PF';
  if (val === 'REP' || val === 'REPROVADO') return 'REP';
  return '-';
}

function parseNumber(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? undefined : n;
}

function parseRows(sheet: XLSX.WorkSheet): RowData[] {
  // Convert to array of objects using header row
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  return raw
    .map((row) => {
      // Normalise keys: lower-case, trim
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        r[k.toLowerCase().trim()] = String(v ?? '').trim();
      }

      // Flexible column mapping – common SUAP export headers
      const nome =
        r['aluno'] || r['nome'] || r['nome do aluno'] || r['name'] || '';
      const matricula =
        r['matrícula'] || r['matricula'] || r['mat.'] || r['mat'] || '';
      const turma =
        r['turma'] || r['classe'] || r['curso'] || '';
      const disciplina =
        r['disciplina'] || r['componente curricular'] || r['componente'] || r['matéria'] || '';
      const faltas =
        parseNumber(r['faltas'] ?? r['falta'] ?? r['total de faltas']) ?? 0;
      const situacao = parseSituacao(
        r['situação'] || r['situacao'] || r['status'] || ''
      );

      return {
        nome,
        matricula,
        turma,
        disciplina,
        nota1: parseNumber(r['nota 1'] ?? r['n1'] ?? r['1º bimestre'] ?? r['1 bimestre']),
        nota2: parseNumber(r['nota 2'] ?? r['n2'] ?? r['2º bimestre'] ?? r['2 bimestre']),
        nota3: parseNumber(r['nota 3'] ?? r['n3'] ?? r['3º bimestre'] ?? r['3 bimestre']),
        nota4: parseNumber(r['nota 4'] ?? r['n4'] ?? r['4º bimestre'] ?? r['4 bimestre']),
        notaFinal: parseNumber(r['nota final'] ?? r['nf'] ?? r['média'] ?? r['media']),
        faltas,
        situacao,
      } as RowData;
    })
    .filter((r) => r.nome !== '');
}

async function saveToDb(rows: RowData[], turmaId: number): Promise<void> {
  for (const row of rows) {
    // Upsert aluno
    let alunoId: number;
    const existing = await db.alunos
      .where('turmaId')
      .equals(turmaId)
      .filter((a) => a.nome === row.nome)
      .first();

    if (existing?.id !== undefined) {
      alunoId = existing.id;
      await db.alunos.update(alunoId, {
        nome: row.nome,
        turmaId: turmaId,
      });
    } else {
      alunoId = await db.alunos.add({
        nome: row.nome,
        turmaId: turmaId,
      });
    }

    // Resolve disciplinaId
    let disciplinaId: number;
    const existingDisc = await db.disciplinas
      .where('turmaId')
      .equals(turmaId)
      .filter((d) => d.nome === row.disciplina)
      .first();

    if (existingDisc?.id !== undefined) {
      disciplinaId = existingDisc.id;
    } else {
      disciplinaId = await db.disciplinas.add({
        turmaId: turmaId,
        nome: row.disciplina,
        chAula: 0,
        chRelogio: 0
      });
    }

    // Delete existing notas
    const existing_notas = await db.notas
      .where('alunoId')
      .equals(alunoId)
      .filter((n) => n.disciplinaId === disciplinaId)
      .toArray();
    if (existing_notas.length > 0) {
      await db.notas.bulkDelete(existing_notas.map((n) => n.id!));
    }

    // Add notas for each etapa using any cast to allow extra legacy fields for now
    if (row.nota1 !== undefined) await db.notas.add({ alunoId, disciplinaId, etapa: 1, nota: row.nota1, faltas: 0 } as any);
    if (row.nota2 !== undefined) await db.notas.add({ alunoId, disciplinaId, etapa: 2, nota: row.nota2, faltas: 0 } as any);
    if (row.nota3 !== undefined) await db.notas.add({ alunoId, disciplinaId, etapa: 3, nota: row.nota3, faltas: 0 } as any);
    if (row.nota4 !== undefined) await db.notas.add({ alunoId, disciplinaId, etapa: 4, nota: row.nota4, faltas: 0 } as any);
    
    // Add missing final or fallback
    if (row.faltas) await db.notas.add({ alunoId, disciplinaId, etapa: 1, nota: row.nota1, faltas: row.faltas } as any);
  }
}

interface Props {
  turmaId: number;
}

export const SuapImporter: React.FC<Props> = ({ turmaId }) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [rows, setRows] = useState<RowData[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [savedCount, setSavedCount] = useState(0);

  const processFile = useCallback((file: File) => {
    if (!file) return;
    setStatus('loading');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsed = parseRows(sheet);

        if (parsed.length === 0) {
          setErrorMsg(
            'Nenhum dado encontrado. Verifique se o arquivo está no formato correto (CSV ou XLSX exportado do SUAP).'
          );
          setStatus('error');
          return;
        }

        setRows(parsed);
        setStatus('preview');
      } catch (err) {
        setErrorMsg(`Erro ao ler o arquivo: ${(err as Error).message}`);
        setStatus('error');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      await saveToDb(rows, turmaId);
      setSavedCount(rows.length);
      setStatus('success');
    } catch (err) {
      setErrorMsg(`Erro ao salvar no banco de dados: ${(err as Error).message}`);
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setRows([]);
    setErrorMsg('');
    setSavedCount(0);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
          <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Importador SUAP</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Importe planilhas CSV/XLSX exportadas do SUAP
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {(status === 'idle' || status === 'error') && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/30'
            }`}
          >
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <Upload
                className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-indigo-500' : 'text-gray-400 dark:text-slate-500'}`}
              />
              <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
                {isDragOver ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
              </p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">CSV, XLSX ou XLS exportado do SUAP</p>
            </label>
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 border border-red-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-gray-600 dark:text-slate-300">Lendo o arquivo...</p>
        </div>
      )}

      {/* Preview */}
      {status === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-indigo-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{rows.length} registros detectados</span>
            </div>
            <button onClick={handleReset} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Table */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden dark:text-slate-100">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Pré-visualização dos dados
              {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPreview && (
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      {['Aluno', 'Matrícula', 'Turma', 'Disciplina', 'N1', 'N2', 'N3', 'N4', 'NF', 'Faltas', 'Situação'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r, i) => {
                      const sit = SITUACAO_LABELS[r.situacao];
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                          <td className="px-4 py-2 font-medium text-gray-800 dark:text-slate-100 whitespace-nowrap">{r.nome}</td>
                          <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{r.matricula}</td>
                          <td className="px-4 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{r.turma}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap">{r.disciplina}</td>
                          <td className="px-4 py-2 text-center">{r.nota1 ?? '-'}</td>
                          <td className="px-4 py-2 text-center">{r.nota2 ?? '-'}</td>
                          <td className="px-4 py-2 text-center">{r.nota3 ?? '-'}</td>
                          <td className="px-4 py-2 text-center">{r.nota4 ?? '-'}</td>
                          <td className="px-4 py-2 text-center font-semibold">{r.notaFinal ?? '-'}</td>
                          <td className="px-4 py-2 text-center">{r.faltas}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sit.color}`}>
                              {sit.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              Salvar {rows.length} registros no banco
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-3 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-900 rounded-lg text-gray-600 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Saving */}
      {status === 'saving' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-gray-600 dark:text-slate-300">Salvando dados no banco local...</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="flex flex-col items-center py-12 gap-5">
          <div className="bg-green-100 dark:bg-green-900/40 rounded-full p-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">Importação concluída!</p>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              {savedCount} registros foram salvos com sucesso no banco local.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-8 rounded-lg transition-colors"
          >
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
};
