import { db } from '../db/database';
import { cursosPPC } from '../data/ppcData';

export async function seedDatabase() {
  console.log("Iniciando seed do banco de dados...");
  
  // Limpar os dados atuais (exceto db.cursos)
  await db.turmas.clear();
  await db.disciplinas.clear();
  await db.alunos.clear();
  await db.notas.clear();
  await db.avaliacoes_finais.clear();

  // Procurar os cursos no banco de dados para obter o cursoId real
  const cursosAtuais = await db.cursos.toArray();
  let integradoCurso = cursosAtuais.find(c => c.modalidade === 'Integrado');
  let subsequenteCurso = cursosAtuais.find(c => c.modalidade === 'Subsequente');
  
  // Se não existir no banco, cria para poder ter o cursoId
  if (!integradoCurso) {
    const ppc = cursosPPC.find(c => c.modalidade === 'Integrado');
    if (ppc) {
      const id = await db.cursos.add({ nome: ppc.nome, modalidade: ppc.modalidade });
      integradoCurso = { id, nome: ppc.nome, modalidade: ppc.modalidade };
    }
  }

  if (!subsequenteCurso) {
    const ppc = cursosPPC.find(c => c.modalidade === 'Subsequente');
    if (ppc) {
      const id = await db.cursos.add({ nome: ppc.nome, modalidade: ppc.modalidade });
      subsequenteCurso = { id, nome: ppc.nome, modalidade: ppc.modalidade };
    }
  }

  if (!integradoCurso || !subsequenteCurso || !integradoCurso.id || !subsequenteCurso.id) {
    console.error("Cursos não encontrados e não foi possível criá-los.");
    return;
  }

  const integradoPPC = cursosPPC.find(c => c.modalidade === 'Integrado')!;
  const subsequentePPC = cursosPPC.find(c => c.modalidade === 'Subsequente')!;

  const turmasCriar = [
    { ppc: integradoPPC, cursoId: integradoCurso.id, periodos: ['2025', '2026'] },
    { ppc: subsequentePPC, cursoId: subsequenteCurso.id, periodos: ['2025/2', '2026/1'] }
  ];

  for (const config of turmasCriar) {
    const modalidade = config.ppc.modalidade as 'Integrado' | 'Subsequente';
    
    for (const periodo of config.periodos) {
      for (const turmaPPC of config.ppc.turmas) {
        
        const nomeTurma = (turmaPPC as any).nome || (turmaPPC as any).nomeExibicao || '';
        
        // Criar a turma (o Dexie gera o ID numérico)
        const turmaId = await db.turmas.add({
          cursoId: config.cursoId,
          nome: nomeTurma,
          codigo: turmaPPC.codigo,
          anoLetivo: periodo,
          arquivado: false,
          lastAccessed: Date.now()
        });

        // Criar disciplinas e guardar IDs gerados
        const disciplinasIds: number[] = [];
        for (const disc of turmaPPC.disciplinas) {
          const chAula = disc.horasAula;
          const chRelogio = Math.round(chAula * (50 / 60)); // conversão padrão
          
          const discId = await db.disciplinas.add({
            turmaId: turmaId as number,
            nome: disc.nome,
            chAula,
            chRelogio,
            arquivado: false
          });
          disciplinasIds.push(discId as number);
        }

        // Determinar as etapas para preencher
        const numEtapas = modalidade === 'Integrado' ? 4 : 2;
        let etapasParaPreencher = numEtapas;
        if (periodo === '2026') etapasParaPreencher = 2; // Integrado 2026: Meio de ano
        if (periodo === '2026/1') etapasParaPreencher = 1; // Subsequente 2026/1: Meio de semestre

        // Cadastrar 10 alunos
        for (let i = 1; i <= 10; i++) {
          let perfil = 'A';
          if (i === 7) perfil = 'B';
          else if (i === 8) perfil = 'C';
          else if (i === 9) perfil = 'D';
          else if (i === 10) perfil = 'E';

          const alunoId = await db.alunos.add({
            turmaId: turmaId as number,
            nome: `Aluno Fictício ${i} (Perfil ${perfil})`
          });

          // Preencher notas para cada disciplina
          for (let d = 0; d < turmaPPC.disciplinas.length; d++) {
            const disc = turmaPPC.disciplinas[d];
            const discId = disciplinasIds[d];
            const maxFaltasReprov = Math.ceil(disc.horasAula * 0.25);
            const limitePeDeMeia = Math.ceil(disc.horasAula * 0.20); 

            for (let etapa = 1; etapa <= numEtapas; etapa++) {
              if (etapa > etapasParaPreencher) continue;
              
              let nota = 0;
              let faltas = 0;

              // Distribuir notas/faltas de acordo com o perfil
              if (perfil === 'A') {
                nota = 7.0 + Math.random() * 2.0; 
                faltas = Math.floor(Math.random() * 2); 
              } else if (perfil === 'B') {
                nota = 8.0 + Math.random() * 2.0; 
                faltas = Math.ceil((maxFaltasReprov + 2) / etapasParaPreencher); 
              } else if (perfil === 'C') {
                nota = 1.0 + Math.random() * 3.0; 
                faltas = Math.ceil((maxFaltasReprov + 2) / etapasParaPreencher); 
              } else if (perfil === 'D') {
                nota = 5.0 + Math.random() * 0.9; 
                faltas = 0;
              } else if (perfil === 'E') {
                if (disc.nome === 'Circuitos Elétricos' || disc.nome === 'Física Aplicada' || disc.nome === 'Física I') {
                  nota = 2.0 + Math.random() * 2.0; 
                } else {
                  nota = 8.0 + Math.random() * 1.5; 
                }
                faltas = Math.floor((limitePeDeMeia - 1) / etapasParaPreencher);
              }

              nota = Math.round(nota * 10) / 10;
              if (nota > 10) nota = 10;

              await db.notas.add({
                alunoId: alunoId as number,
                disciplinaId: discId,
                etapa,
                nota,
                faltas
              });
            }
          }
        }
      }
    }
  }

  console.log("Seed concluído!");
}
