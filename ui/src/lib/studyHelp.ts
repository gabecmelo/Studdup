// Contextual "how to use it in the app" help for the two methods and the four techniques, shown from
// a (?) next to the method/technique pickers in Novo Card. This is task-oriented — the concrete steps
// of using the thing *inside Studdup* — deliberately distinct from the conceptual "what it is" copy on
// the Técnicas page (TECHNIQUE_SUMMARY). Keyed by the `Method`/`Technique` enums so every case is
// covered at compile time.

import type { Method, Technique } from "./bindings";

/** A short, task-oriented help topic: a one-line intro plus the concrete in-app steps. */
export interface HelpTopic {
  title: string;
  intro: string;
  steps: string[];
}

export const METHOD_HELP: Record<Method, HelpTopic> = {
  SpacedRepetition: {
    title: "Repetição Espaçada",
    intro: "Pra aprender sem prazo — o Studdup agenda revisões cada vez mais espaçadas.",
    steps: [
      "O card nasce no 'Hoje' (Dia 0). Clique nele e toque em Estudar pra fazer a primeira sessão.",
      "Ao concluir, ele reaparece mais pra frente: Dia 1, 2, 5, 15, 30 — cada revisão mais distante.",
      "Depois do Dia 30 o card é dado como aprendido e vai pra Concluídos.",
      "Não vai estudar hoje? Abra o card e use Adiar (com um desafio rápido de 5 min nas revisões).",
    ],
  },
  ExamPrep: {
    title: "Prova",
    intro: "Pra estudar com uma data de prova — o Studdup espalha as sessões até lá.",
    steps: [
      "Escolha (ou crie) uma prova com a data. As sessões são distribuídas de hoje até a prova, mais densas perto do dia.",
      "Cada card mostra 'Sessão N de M'. Clique e toque em Estudar pra fazer a sessão atual.",
      "Concluir avança pra próxima sessão — pode fazer várias no mesmo dia se quiser (cramming).",
      "Ao concluir a última sessão, o card vai pra Concluídos. Passada a data, a prova é encerrada.",
    ],
  },
};

export const TECHNIQUE_HELP: Record<Technique, HelpTopic> = {
  Pomodoro: {
    title: "Pomodoro",
    intro: "Blocos de foco com pausas, repetidos por alguns ciclos.",
    steps: [
      "Escolha o ritmo (ex.: 25/5) e quantos ciclos (padrão 4) ao criar o card.",
      "Na sessão, o timer roda o bloco de foco; ao zerar, começa a pausa e avança o ciclo.",
      "Pode pausar e retomar — o tempo restante é mantido exatamente onde parou.",
      "Ao terminar os ciclos, toque em Concluir pra registrar a sessão.",
    ],
  },
  ActiveRecall: {
    title: "Active Recall",
    intro: "Escrever de memória antes de conferir a fonte.",
    steps: [
      "Na sessão, escreva tudo que lembra do tópico — sem olhar o material.",
      "Depois revele a fonte e compare com o que você escreveu.",
      "Dê uma autoavaliação de como foi; sua resposta escrita fica salva no card.",
      "Concluir registra a sessão e agenda a próxima revisão.",
    ],
  },
  Feynman: {
    title: "Feynman",
    intro: "Explicar o tópico com palavras simples, como pra outra pessoa.",
    steps: [
      "Na sessão, explique o tópico do jeito mais simples que conseguir, por escrito.",
      "Compare sua explicação com a fonte e veja onde você travou.",
      "Autoavalie; a explicação fica salva no card pra comparar depois.",
      "Concluir registra a sessão.",
    ],
  },
  Leitner: {
    title: "Leitner",
    intro: "Revisão por caixas: acertos sobem de caixa, erros voltam pra caixa 1.",
    steps: [
      "Adicione itens (frente / verso) no detalhe do card.",
      "Na sessão, veja a frente, tente responder e revele o verso.",
      "Marque acertei/errei: acerto promove o item de caixa, erro volta pra caixa 1.",
      "Itens só reaparecem quando a caixa deles vence — Concluir encerra a sessão do dia.",
    ],
  },
};
