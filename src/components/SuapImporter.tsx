import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { db } from '../db/database';

interface RowData {
  nome: string;
  disciplina?: string;
  nota1?: number | null;
  faltas1?: number | null;
  nota2?: number | null;
  faltas2?: number | null;
  nota3?: number | null;
  faltas3?: number | null;
  nota4?: number | null;
  faltas4?: number | null;
  provaFinal?: number | null;
}

type ImportStatus = 'idle' | 'loading' | 'preview' | 'saving' | 'success' | 'error';

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).replace(',', '.').trim();
  if (str === '') return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

async function saveToDb(rows: RowData[], turmaId: number, isIntegrado: boolean, fixedDisciplinaId?: number): Promise<void> {
  for (const row of rows) {
    if (!row.nome) continue;
    if (!fixedDisciplinaId && !row.disciplina) continue;

    // 1. Resolve Aluno
    let alunoId: number;
    const existingAluno = await db.alunos
      .where('turmaId')
      .equals(turmaId)
      .filter((a) => a.nome.toLowerCase() === row.nome.toLowerCase())
      .first();

    if (existingAluno?.id !== undefined) {
      alunoId = existingAluno.id;
    } else {
      if (fixedDisciplinaId) {
        throw new Error(`Aluno(a) '${row.nome}' não encontrado(a) na turma. A importação foi interrompida para garantir a integridade. Cadastre o(a) aluno(a) primeiro ou corrija o nome na planilha.`);
      }
      alunoId = await db.alunos.add({
        nome: row.nome,
        turmaId: turmaId,
      });
    }

    // 2. Resolve Disciplina
    let disciplinaId: number;
    if (fixedDisciplinaId) {
      disciplinaId = fixedDisciplinaId;
    } else {
      const existingDisc = await db.disciplinas
        .where('turmaId')
        .equals(turmaId)
        .filter((d) => d.nome.toLowerCase() === (row.disciplina || '').toLowerCase())
        .first();

      if (existingDisc?.id !== undefined) {
        disciplinaId = existingDisc.id;
      } else {
        disciplinaId = await db.disciplinas.add({
          turmaId: turmaId,
          nome: row.disciplina || 'Sem Nome',
          chAula: 0,
          chRelogio: 0
        });
      }
    }

    // 3. Add or Update Notas (Only if there is a value or 0, null is ignored)
    const updateOrAddNota = async (etapa: number, nota: number | null | undefined, faltas: number | null | undefined) => {
      if (nota !== null || faltas !== null) {
        const existingNota = await db.notas
          .where('alunoId')
          .equals(alunoId)
          .filter((n) => n.disciplinaId === disciplinaId && n.etapa === etapa)
          .first();

        if (existingNota && existingNota.id) {
          const updates: any = {};
          if (nota !== null && nota !== undefined) updates.nota = nota;
          if (faltas !== null && faltas !== undefined) updates.faltas = faltas;
          await db.notas.update(existingNota.id, updates);
        } else {
          const record: any = { alunoId, disciplinaId, etapa };
          if (nota !== null && nota !== undefined) record.nota = nota;
          if (faltas !== null && faltas !== undefined) record.faltas = faltas;
          await db.notas.add(record);
        }
      }
    };

    await updateOrAddNota(1, row.nota1, row.faltas1);
    await updateOrAddNota(2, row.nota2, row.faltas2);
    
    if (isIntegrado) {
      await updateOrAddNota(3, row.nota3, row.faltas3);
      await updateOrAddNota(4, row.nota4, row.faltas4);
    }

    // 4. Add or Update Prova Final if present
    if (row.provaFinal !== null && row.provaFinal !== undefined) {
      const existingAv = await db.avaliacoes_finais
        .where('alunoId')
        .equals(alunoId)
        .filter((a) => a.disciplinaId === disciplinaId)
        .first();

      if (existingAv && existingAv.id) {
        await db.avaliacoes_finais.update(existingAv.id, { provaFinal: row.provaFinal });
      } else {
        await db.avaliacoes_finais.add({
          alunoId,
          disciplinaId,
          provaFinal: row.provaFinal
        });
      }
    }
  }
}

interface Props {
  turmaId: number;
  disciplinaId?: number;
  mode?: 'discipline' | 'class';
}

export const SuapImporter: React.FC<Props> = ({ turmaId, disciplinaId, mode = 'discipline' }) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [rows, setRows] = useState<RowData[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [isIntegrado, setIsIntegrado] = useState(true);
  const [selectedEtapa, setSelectedEtapa] = useState<number | 'PF' | ''>('');

  useEffect(() => {
    const loadInfo = async () => {
      const t = await db.turmas.get(turmaId);
      if (t) {
        const c = await db.cursos.get(t.cursoId);
        if (c) {
          setIsIntegrado(c.modalidade.toLowerCase().includes('integrado'));
        }
      }
    };
    loadInfo();
  }, [turmaId]);

  const handleDownloadTemplate = async () => {
    let headers: string[];
    let data: any[][] = [];
    
    if (mode === 'class') {
      const disciplinas = await db.disciplinas.where('turmaId').equals(turmaId).toArray();
      disciplinas.sort((a, b) => a.nome.localeCompare(b.nome));
      
      const line1: string[] = ['']; // Célula A1 vazia
      const line2: string[] = ['ALUNOS'];
      
      disciplinas.forEach(d => {
        line1.push(d.nome, '');
        line2.push('N', 'F');
      });
      
      const alunos = await db.alunos.where('turmaId').equals(turmaId).toArray();
      alunos.sort((a, b) => a.nome.localeCompare(b.nome));
      
      data = alunos.map(a => [a.nome]); // Outras colunas ficam vazias automaticamente
      
      const ws = XLSX.utils.aoa_to_sheet([line1, line2, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, `Template_Lote_${isIntegrado ? 'Integrado' : 'Subsequente'}.xlsx`);
      return;
    }

    if (disciplinaId) {
       headers = isIntegrado 
        ? ['Nome do Aluno', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Nota Etapa 3', 'Faltas Etapa 3', 'Nota Etapa 4', 'Faltas Etapa 4', 'Prova Final']
        : ['Nome do Aluno', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Prova Final'];
        
       const alunos = await db.alunos.where('turmaId').equals(turmaId).toArray();
       alunos.sort((a, b) => a.nome.localeCompare(b.nome));
       
       data = alunos.map(a => [a.nome]); // Outras colunas ficam vazias automaticamente
    } else {
       headers = isIntegrado 
        ? ['Nome do Aluno', 'Disciplina', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Nota Etapa 3', 'Faltas Etapa 3', 'Nota Etapa 4', 'Faltas Etapa 4', 'Prova Final']
        : ['Nome do Aluno', 'Disciplina', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Prova Final'];
    }
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Template_Importacao_${isIntegrado ? 'Integrado' : 'Subsequente'}.xlsx`);
  };

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

        const sheetData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
        if (sheetData.length === 0) {
          setErrorMsg('Nenhum dado encontrado no arquivo.');
          setStatus('error');
          return;
        }

        if (mode === 'class') {
          if (sheetData.length < 2) {
            setErrorMsg('Formato de arquivo inválido. A planilha em lote deve ter pelo menos 2 linhas de cabeçalho.');
            setStatus('error');
            return;
          }

          const line1 = (sheetData[0] || []).map(String).map(s => s.trim());
          const line2 = (sheetData[1] || []).map(String).map(s => s.trim());

          if (line2[0] !== 'ALUNOS') {
            setErrorMsg('Formato de arquivo inválido. A linha 2 deve iniciar com "ALUNOS" na primeira coluna.');
            setStatus('error');
            return;
          }

          // Mapeamento dinâmico de colunas N e F por disciplina
          const disciplinasCols: { nome: string, colN: number, colF: number }[] = [];
          let currentDisc = '';
          
          for (let c = 1; c < Math.max(line1.length, line2.length); c++) {
            if (line1[c] && line1[c] !== '') {
              currentDisc = line1[c];
            }
            if (currentDisc && line2[c] === 'N') {
              const colF = line2[c + 1] === 'F' ? c + 1 : -1;
              if (colF !== -1) {
                disciplinasCols.push({ nome: currentDisc, colN: c, colF });
                c++; // pula a coluna F para não ler novamente
              }
            }
          }
          
          if (disciplinasCols.length === 0) {
            setErrorMsg('Nenhuma coluna de Notas (N) e Faltas (F) encontrada para as disciplinas.');
            setStatus('error');
            return;
          }

          const parsed: RowData[] = [];
          const currentEtapaStr = String(selectedEtapa);
          
          // Process rows from line 3 onwards
          for (let i = 2; i < sheetData.length; i++) {
            const rowArr = (sheetData[i] || []).map(String).map(s => s.trim());
            const alunoNome = rowArr[0];
            if (!alunoNome) continue;

            for (const discMap of disciplinasCols) {
              const valN = rowArr[discMap.colN] === '-' ? null : parseNumber(rowArr[discMap.colN]);
              const valF = currentEtapaStr === 'PF' ? null : (rowArr[discMap.colF] === '-' ? null : parseNumber(rowArr[discMap.colF]));

              if (valN !== null || valF !== null) {
                const rowData: RowData = {
                  nome: alunoNome,
                  disciplina: discMap.nome,
                };
                
                if (currentEtapaStr === '1') { rowData.nota1 = valN; rowData.faltas1 = valF; }
                else if (currentEtapaStr === '2') { rowData.nota2 = valN; rowData.faltas2 = valF; }
                else if (currentEtapaStr === '3') { rowData.nota3 = valN; rowData.faltas3 = valF; }
                else if (currentEtapaStr === '4') { rowData.nota4 = valN; rowData.faltas4 = valF; }
                else if (currentEtapaStr === 'PF') { rowData.provaFinal = valN; }
                
                parsed.push(rowData);
              }
            }
          }

          if (parsed.length === 0) {
            setErrorMsg('Nenhum registro válido encontrado. Verifique se as notas/faltas estão preenchidas.');
            setStatus('error');
            return;
          }

          setRows(parsed);
          setStatus('preview');
          return;
        }

        // Mode discipline logic below
        const headers = (sheetData[0] || []).map(String).map(s => s.trim());
        while (headers.length > 0 && headers[headers.length - 1] === '') {
          headers.pop();
        }
        
        let expectedHeaders: string[] = [];
        if (disciplinaId) {
          expectedHeaders = isIntegrado 
            ? ['Nome do Aluno', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Nota Etapa 3', 'Faltas Etapa 3', 'Nota Etapa 4', 'Faltas Etapa 4', 'Prova Final']
            : ['Nome do Aluno', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Prova Final'];
        } else {
          expectedHeaders = isIntegrado 
            ? ['Nome do Aluno', 'Disciplina', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Nota Etapa 3', 'Faltas Etapa 3', 'Nota Etapa 4', 'Faltas Etapa 4', 'Prova Final']
            : ['Nome do Aluno', 'Disciplina', 'Nota Etapa 1', 'Faltas Etapa 1', 'Nota Etapa 2', 'Faltas Etapa 2', 'Prova Final'];
        }

        const isValid = headers.length === expectedHeaders.length && headers.every((h, i) => h === expectedHeaders[i]);

        if (!isValid) {
          setErrorMsg('Formato de arquivo inválido. Por favor, utilize estritamente a Planilha Modelo baixada pelo sistema e não altere os títulos das colunas.');
          setStatus('error');
          return;
        }
        
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: false,
        });

        if (raw.length === 0) {
          setErrorMsg('Nenhum dado encontrado no arquivo.');
          setStatus('error');
          return;
        }

        const parsed: RowData[] = raw.map(r => {
          // Normalise keys for robust matching
          const norm: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) {
            norm[k.trim().toLowerCase()] = v;
          }

          return {
            nome: String(norm['nome do aluno'] || norm['nome'] || norm['aluno'] || '').trim(),
            disciplina: String(norm['disciplina'] || norm['componente'] || '').trim(),
            nota1: norm['nota etapa 1'] === '-' ? null : parseNumber(norm['nota etapa 1'] ?? norm['nota 1'] ?? norm['n1']),
            faltas1: norm['faltas etapa 1'] === '-' ? null : parseNumber(norm['faltas etapa 1'] ?? norm['faltas 1'] ?? norm['f1']),
            nota2: norm['nota etapa 2'] === '-' ? null : parseNumber(norm['nota etapa 2'] ?? norm['nota 2'] ?? norm['n2']),
            faltas2: norm['faltas etapa 2'] === '-' ? null : parseNumber(norm['faltas etapa 2'] ?? norm['faltas 2'] ?? norm['f2']),
            nota3: norm['nota etapa 3'] === '-' ? null : parseNumber(norm['nota etapa 3'] ?? norm['nota 3'] ?? norm['n3']),
            faltas3: norm['faltas etapa 3'] === '-' ? null : parseNumber(norm['faltas etapa 3'] ?? norm['faltas 3'] ?? norm['f3']),
            nota4: norm['nota etapa 4'] === '-' ? null : parseNumber(norm['nota etapa 4'] ?? norm['nota 4'] ?? norm['n4']),
            faltas4: norm['faltas etapa 4'] === '-' ? null : parseNumber(norm['faltas etapa 4'] ?? norm['faltas 4'] ?? norm['f4']),
            provaFinal: norm['prova final'] === '-' ? null : parseNumber(norm['prova final'] ?? norm['pf'] ?? norm['exame']),
          };
        }).filter(r => r.nome !== '');

        if (parsed.length === 0) {
          setErrorMsg('Nenhum registro válido encontrado. Verifique se as colunas estão corretas.');
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
  }, [disciplinaId, isIntegrado, mode, selectedEtapa]);

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
      await saveToDb(rows, turmaId, isIntegrado, disciplinaId);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Importação por Planilha Padrão</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Utilize o modelo padrão para importar notas e faltas.
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          {mode === 'class' ? 'Baixar Modelo da Turma (Lote)' : 'Baixar Modelo para esta Turma'}
        </button>
      </div>

      {mode === 'class' && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            Selecione a Etapa para Importação *
          </label>
          <select
            value={selectedEtapa}
            onChange={(e) => setSelectedEtapa(e.target.value as any)}
            className="w-full md:w-1/2 p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="" disabled>Selecione uma etapa...</option>
            <option value={1}>Etapa 1</option>
            <option value={2}>Etapa 2</option>
            {isIntegrado && <option value={3}>Etapa 3</option>}
            {isIntegrado && <option value={4}>Etapa 4</option>}
            <option value="PF">Prova Final</option>
          </select>
        </div>
      )}

      {/* Instruction */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
        <strong>Instrução:</strong> Copie os dados do SUAP e cole diretamente nesta planilha modelo antes de realizar a importação para garantir 100% de compatibilidade. As células vazias serão ignoradas (não convertidas para zero).
      </div>

      {/* Upload Zone */}
      {(status === 'idle' || status === 'error') && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              if (mode === 'class' && !selectedEtapa) {
                e.preventDefault();
                setIsDragOver(false);
                setErrorMsg('Selecione a Etapa antes de selecionar o arquivo.');
                setStatus('error');
                return;
              }
              handleDrop(e);
            }}
            onClick={(e) => {
              if (mode === 'class' && !selectedEtapa) {
                e.preventDefault();
                setErrorMsg('Selecione a Etapa antes de selecionar o arquivo.');
                setStatus('error');
              }
            }}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-indigo-900/30'
            } ${mode === 'class' && !selectedEtapa ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden dark:focus:ring-slate-600 dark:border-slate-700 dark:text-slate-100 dark:bg-slate-800"
              onChange={(e) => {
                if (mode === 'class' && !selectedEtapa) return;
                handleFileInput(e);
              }}
              disabled={mode === 'class' && !selectedEtapa}
            />
            <label htmlFor="file-upload" className={`cursor-pointer block ${mode === 'class' && !selectedEtapa ? 'pointer-events-none' : ''}`}>
              <Upload
                className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-indigo-500' : 'text-gray-400 dark:text-slate-500'}`}
              />
              <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
                {isDragOver ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar o arquivo preenchido'}
              </p>
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
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
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
                      {['Aluno', 'Disciplina', 'N1', 'F1', 'N2', 'F2'].concat(isIntegrado ? ['N3', 'F3', 'N4', 'F4'] : []).concat(['PF']).map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                        <td className="px-4 py-2 font-medium text-gray-800 dark:text-slate-200 whitespace-nowrap">{r.nome}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-slate-300 whitespace-nowrap">{r.disciplina}</td>
                        <td className="px-4 py-2 text-center">{r.nota1 ?? '-'}</td>
                        <td className="px-4 py-2 text-center text-red-500">{r.faltas1 ?? '-'}</td>
                        <td className="px-4 py-2 text-center">{r.nota2 ?? '-'}</td>
                        <td className="px-4 py-2 text-center text-red-500">{r.faltas2 ?? '-'}</td>
                        {isIntegrado && (
                          <>
                            <td className="px-4 py-2 text-center">{r.nota3 ?? '-'}</td>
                            <td className="px-4 py-2 text-center text-red-500">{r.faltas3 ?? '-'}</td>
                            <td className="px-4 py-2 text-center">{r.nota4 ?? '-'}</td>
                            <td className="px-4 py-2 text-center text-red-500">{r.faltas4 ?? '-'}</td>
                          </>
                        )}
                        <td className="px-4 py-2 text-center font-semibold text-amber-600 dark:text-amber-400">{r.provaFinal ?? '-'}</td>
                      </tr>
                    ))}
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
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800 dark:text-slate-200">Importação concluída!</p>
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
