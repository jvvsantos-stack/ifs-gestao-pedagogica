import { AppDatabase } from '../db/database';
import type { Disciplina, Aluno } from '../db/database';

export const injetarDadosDeTeste = async (turmaId: number, disciplinas: Disciplina[], isSubsequente: boolean, db: AppDatabase) => {
    // 1. Apagar notas, avaliações e alunos atuais dessa turma.
    const alunosAtuais = await db.alunos.where({ turmaId }).toArray();
    const alunosIds = alunosAtuais.map(a => a.id!);
    
    if (alunosIds.length > 0) {
        await db.notas.where('alunoId').anyOf(alunosIds).delete();
        await db.avaliacoes_finais.where('alunoId').anyOf(alunosIds).delete();
        await db.alunos.where('id').anyOf(alunosIds).delete();
    }

    // 2. Criar 10 alunos fictícios cobrindo os cenários
    const novosAlunos: Aluno[] = [
        { turmaId, nome: "01 - Ana Aprovada" },
        { turmaId, nome: "02 - Beto Faltoso" },
        { turmaId, nome: "03 - Carlos Elegivel (1 DP)" },
        { turmaId, nome: "04 - Daniel Retido (Nota < 4)" },
        { turmaId, nome: "05 - Elena Retida (> 2 DPs)" },
        { turmaId, nome: "06 - Fabio Cursando" },
        { turmaId, nome: "07 - Gabriela Salva na Final" },
        { turmaId, nome: "08 - Hugo Reprovado na Final" },
        { turmaId, nome: "09 - Igor Evasão Total" },
        { turmaId, nome: "10 - Julia Elegivel Limite" }
    ];

    const insertedAlunosIds = await db.alunos.bulkAdd(novosAlunos, { allKeys: true }) as number[];
    const numEtapas = isSubsequente ? 2 : 4;
    
    // 3. Para cada aluno e disciplina, gerar notas e faltas com base no perfil
    for (let i = 0; i < insertedAlunosIds.length; i++) {
        const alunoId = insertedAlunosIds[i];
        const alunoNome = novosAlunos[i].nome;

        for (let dIndex = 0; dIndex < disciplinas.length; dIndex++) {
            const disc = disciplinas[dIndex];
            const notasParaInserir: any[] = [];
            
            if (alunoNome.includes("Ana")) {
                // Ana: Aprovada direto
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: 8.5, faltas: 0 });
                }
            } else if (alunoNome.includes("Beto")) {
                // Beto: Reprovado por Faltas (30% da CH)
                for (let e = 1; e <= numEtapas; e++) {
                    const faltasNaEtapa = e === 1 ? Math.ceil(disc.chRelogio * 0.30) : 0;
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: 7.0, faltas: faltasNaEtapa });
                }
            } else if (alunoNome.includes("Carlos")) {
                // Carlos: Elegível com 1 DP
                const mediaDesejada = dIndex === 0 ? 4.5 : 7.0;
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: mediaDesejada, faltas: 0 });
                }
                if (dIndex === 0) {
                    await db.avaliacoes_finais.put({ alunoId, disciplinaId: disc.id!, provaFinal: 4.0 }); // NF = (4.5 + 4.0)/2 = 4.25 -> Elegível
                }
            } else if (alunoNome.includes("Daniel")) {
                // Daniel: Retido por Nota na primeira disciplina (Média < 4.0)
                const mediaDesejada = dIndex === 0 ? 3.0 : 7.0;
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: mediaDesejada, faltas: 0 });
                }
                if (dIndex === 0) {
                    await db.avaliacoes_finais.put({ alunoId, disciplinaId: disc.id!, provaFinal: 2.0 }); // NF = (3.0 + 2.0)/2 = 2.5 -> Retido
                }
            } else if (alunoNome.includes("Elena")) {
                // Elena: Retida por Quantidade (> 2 DPs)
                const mediaDesejada = dIndex < 3 ? 5.0 : 7.0;
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: mediaDesejada, faltas: 0 });
                }
                if (dIndex < 3) {
                    await db.avaliacoes_finais.put({ alunoId, disciplinaId: disc.id!, provaFinal: 3.5 }); // NF = (5.0 + 3.5)/2 = 4.25 -> Elegível, mas tem > 2
                }
            } else if (alunoNome.includes("Fabio")) {
                // Fabio: Diário incompleto
                notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: 1, nota: 8.0, faltas: 2 });
            } else if (alunoNome.includes("Gabriela")) {
                // Gabriela: Salva na Prova Final (Média final >= 5)
                const mediaDesejada = dIndex === 0 ? 5.0 : 7.0;
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: mediaDesejada, faltas: 0 });
                }
                if (dIndex === 0) {
                    await db.avaliacoes_finais.put({ alunoId, disciplinaId: disc.id!, provaFinal: 7.0 }); // NF = (5.0 + 7.0)/2 = 6.0 -> Aprovada
                }
            } else if (alunoNome.includes("Hugo")) {
                // Hugo: Reprovado na Prova Final (Média final < 5.0)
                const mediaDesejada = dIndex === 0 ? 4.0 : 7.0;
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: mediaDesejada, faltas: 0 });
                }
                if (dIndex === 0) {
                    await db.avaliacoes_finais.put({ alunoId, disciplinaId: disc.id!, provaFinal: 4.0 }); // NF = (4.0 + 4.0)/2 = 4.0 -> Reprovado
                }
            } else if (alunoNome.includes("Igor")) {
                // Igor: Evasão Total (100% de Faltas e Zero)
                for (let e = 1; e <= numEtapas; e++) {
                    const faltasNaEtapa = e === 1 ? disc.chRelogio : 0;
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: 0.0, faltas: faltasNaEtapa });
                }
            } else if (alunoNome.includes("Julia")) {
                // Julia: Elegível no limite (exatamente 2 disciplinas com cravados 4.0)
                const mediaDesejada = dIndex < 2 ? 4.0 : 6.0;
                for (let e = 1; e <= numEtapas; e++) {
                    notasParaInserir.push({ alunoId, disciplinaId: disc.id!, etapa: e, nota: mediaDesejada, faltas: 0 });
                }
                if (dIndex < 2) {
                    await db.avaliacoes_finais.put({ alunoId, disciplinaId: disc.id!, provaFinal: 4.0 }); // NF = 4.0 (Limite para Elegível)
                }
            }

            if (notasParaInserir.length > 0) {
                await db.notas.bulkAdd(notasParaInserir);
            }
        }
    }
};
