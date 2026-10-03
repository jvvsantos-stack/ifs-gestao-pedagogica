import { db } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { cursosPPC } from '../data/ppcData';

export async function seedDatabase() {
  console.log("Iniciando seed do banco de dados...");
  
  // Limpar os dados atuais (exceto db.cursos se houver, mas ppcData não está no db de forma isolada, as turmas que possuem os dados).
  await db.turmas.clear();
  await db.disciplinas.clear();
  await db.alunos.clear();
  await db.notas.clear();
  await db.avaliacoes_finais.clear();

  // Dados a gerar:
  // Técnico em Eletrônica Integrado (Anual): 2025, 2026
  // Técnico em Eletrônica Subsequente (Semestral): 2025/2, 2026/1
  
  const integradoPPC = cursosPPC.find(c => c.modalidade === 'Integrado');
  const subsequentePPC = cursosPPC.find(c => c.modalidade === 'Subsequente');
  
  if (!integradoPPC || !subsequentePPC) {
    console.error("PPC não encontrado");
    return;
  }

  const turmasCriar = [
    { ppc: integradoPPC, periodos: ['2025', '2026'] },
    { ppc: subsequentePPC, periodos: ['2025/2', '2026/1'] }
  ];

  for (const config of turmasCriar) {
    const modalidade = config.ppc.modalidade as 'Integrado' | 'Subsequente';
    
    for (const periodo of config.periodos) {
      for (const turmaPPC of config.ppc.turmas) {
        // Criar a turma
        const turmaId = uuidv4();
        const nomeTurma = (turmaPPC as any).nome || (turmaPPC as any).nomeExibicao || '';
        
        await db.turmas.add({
          id: turmaId,
          nome: nomeTurma,
          codigo: turmaPPC.codigo,
          curso: config.ppc.nome,
          modalidade: modalidade,
          periodoLetivo: periodo,
        });

        // Criar disciplinas
        const disciplinasIds: string[] = [];
        for (const disc of turmaPPC.disciplinas) {
          const discId = uuidv4();
          await db.disciplinas.add({
            id: discId,
            turmaId: turmaId,
            nome: disc.nome,
            horasAula: disc.horasAula,
          });
          disciplinasIds.push(discId);
        }

        // Determinar as etapas para preencher
        const numEtapas = modalidade === 'Integrado' ? 4 : 2;
        let etapasParaPreencher = numEtapas;
        if (periodo === '2026') etapasParaPreencher = 2; // Integrado 2026: Meio de ano
        if (periodo === '2026/1') etapasParaPreencher = 1; // Subsequente 2026/1: Meio de semestre

        // Cadastrar 10 alunos
        for (let i = 1; i <= 10; i++) {
          const alunoId = uuidv4();
          
          let perfil = 'A';
          if (i === 7) perfil = 'B';
          else if (i === 8) perfil = 'C';
          else if (i === 9) perfil = 'D';
          else if (i === 10) perfil = 'E';

          let status = 'Ativo';

          await db.alunos.add({
            id: alunoId,
            turmaId: turmaId,
            nome: `Aluno Fictício ${i} (Perfil ${perfil})`,
            matricula: `${periodo.replace('/', '')}${turmaPPC.codigo.replace('.', '')}${i.toString().padStart(3, '0')}`,
            status: status
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
                id: uuidv4(),
                alunoId,
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
