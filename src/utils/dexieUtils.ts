import { AppDatabase } from '../db/database';

export const exportarBancoParaJSON = async (db: AppDatabase): Promise<any> => {
  return await db.transaction('r', [db.cursos, db.turmas, db.disciplinas, db.alunos, db.notas, db.avaliacoes_finais, db.ocorrencias, db.estagios], async () => {
    const cursos = await db.cursos.toArray();
    const turmas = await db.turmas.toArray();
    const disciplinas = await db.disciplinas.toArray();
    const alunos = await db.alunos.toArray();
    const notas = await db.notas.toArray();
    const avaliacoes_finais = await db.avaliacoes_finais.toArray();
    const ocorrencias = await db.ocorrencias.toArray();

    const ocorrencias = await db.ocorrencias.toArray();
    const estagios = await db.estagios.toArray();

    return {
      cursos,
      turmas,
      disciplinas,
      alunos,
      notas,
      avaliacoes_finais,
      ocorrencias,
      estagios,
      timestamp: new Date().toISOString()
    };
  });
};

export const importarJSONParaBanco = async (db: AppDatabase, jsonData: any): Promise<void> => {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Dados de backup inválidos.');
  }

  await db.transaction('rw', [db.cursos, db.turmas, db.disciplinas, db.alunos, db.notas, db.avaliacoes_finais, db.ocorrencias, db.estagios], async () => {
    await db.cursos.clear();
    await db.turmas.clear();
    await db.disciplinas.clear();
    await db.alunos.clear();
    await db.notas.clear();
    await db.avaliacoes_finais.clear();
    await db.ocorrencias.clear();
    await db.estagios.clear();

    if (jsonData.cursos?.length) await db.cursos.bulkAdd(jsonData.cursos);
    if (jsonData.turmas?.length) await db.turmas.bulkAdd(jsonData.turmas);
    if (jsonData.disciplinas?.length) await db.disciplinas.bulkAdd(jsonData.disciplinas);
    if (jsonData.alunos?.length) await db.alunos.bulkAdd(jsonData.alunos);
    if (jsonData.notas?.length) await db.notas.bulkAdd(jsonData.notas);
    if (jsonData.avaliacoes_finais?.length) await db.avaliacoes_finais.bulkAdd(jsonData.avaliacoes_finais);
    if (jsonData.ocorrencias?.length) await db.ocorrencias.bulkAdd(jsonData.ocorrencias);
    if (jsonData.estagios?.length) await db.estagios.bulkAdd(jsonData.estagios);
  });
};
