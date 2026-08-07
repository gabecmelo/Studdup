// Técnicas (handoff "CatalogoTecnicas") — a catalog of the four study techniques (the *how* axis).
// Each is an expandable card: icon + name + summary, opening to "Quando funciona melhor" and "Como
// aplicar" panels. Static reference content (no data reads); the copy is ported from the handoff.

import { useState } from "react";
import type { Technique } from "../lib/bindings";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";
import { useViewport } from "../lib/useViewport";

interface TecnicaDoc {
  tipo: Technique;
  resumo: string;
  quando: string;
  como: string;
}

const TECNICAS: readonly TecnicaDoc[] = [
  {
    tipo: "Pomodoro",
    resumo: "Blocos de 25 min de foco com pausas curtas de 5 min.",
    quando:
      "Conteúdo longo ou denso que você adia por parecer grande demais. O relógio quebra o “monte” em pedaços que cabem numa sentada.",
    como:
      "Estude 25 min sem trocar de aba. Pause 5 min de verdade — levante, respire. A cada 4 ciclos, uma pausa maior. O Studdup conta os ciclos por você.",
  },
  {
    tipo: "ActiveRecall",
    resumo: "Responder de memória, sem olhar o material.",
    quando:
      "Fatos, definições, listas e qualquer coisa que você precise puxar da cabeça na prova. É a técnica com mais evidência de retenção.",
    como:
      "O material fica escondido. Escreva tudo que lembra, envie, e só então compare com o original. O esforço de puxar da memória é o que fixa.",
  },
  {
    tipo: "Feynman",
    resumo: "Explicar em linguagem simples, como se ensinasse um iniciante.",
    quando:
      "Conceitos que você “acha que entende” mas não sabe explicar. Onde você trava ao ensinar é exatamente a lacuna a estudar.",
    como:
      "Escreva uma explicação sem jargão, como para um colega que nunca viu o assunto. Compare com o material, ache os buracos, reescreva mais simples.",
  },
  {
    tipo: "Leitner",
    resumo: "Flashcards frente/verso em 5 caixas que espaçam sozinhas.",
    quando:
      "Vocabulário, fórmulas, pares pergunta-resposta — muito item pequeno pra memorizar em massa ao longo do tempo.",
    como:
      "Acertou, o card sobe uma caixa e demora mais pra voltar; errou, cai pra Caixa 1. As caixas mais altas aparecem cada vez menos — foco no que ainda escapa.",
  },
];

export function Tecnicas() {
  const [open, setOpen] = useState<Technique | null>(null);
  const isPhone = useViewport() === "phone";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, width: "100%", maxWidth: 940, margin: "0 auto", padding: "26px 24px 0" }}>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 6, paddingBottom: 20 }}>
        <span style={{ font: "600 26px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
          Catálogo de técnicas
        </span>
        <span style={{ font: "400 13.5px/1.4 var(--font-sans)", color: "var(--text-2)", maxWidth: 640 }}>
          Quatro formas de estudar um card. Escolha por card — a técnica muda como a sessão funciona,
          não quando ela aparece no quadro.
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TECNICAS.map((t) => (
            <TecnicaCard
              key={t.tipo}
              doc={t}
              open={open === t.tipo}
              isPhone={isPhone}
              onToggle={() => setOpen((cur) => (cur === t.tipo ? null : t.tipo))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TecnicaCard({ doc, open, isPhone, onToggle }: { doc: TecnicaDoc; open: boolean; isPhone: boolean; onToggle: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 18,
        background: "var(--surface)",
        border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
        boxShadow: "var(--shadow-1)",
        overflow: "hidden",
        transition: "border-color var(--transition-fast)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "20px 22px",
          border: "none",
          background: hover && !open ? "var(--surface-2)" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          transition: "background var(--transition-fast)",
        }}
      >
        <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--accent-soft)", color: "var(--accent-soft-ink)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <TechniqueIcon technique={doc.tipo} size={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "600 17px/1.2 var(--font-sans)", letterSpacing: "-.01em", color: "var(--text)" }}>
            {TECHNIQUE_LABEL[doc.tipo]}
          </span>
          <span style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--text-2)" }}>{doc.resumo}</span>
        </span>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", font: "500 13px/1 var(--font-sans)", flex: "none" }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div style={{ display: "flex", gap: 16, padding: isPhone ? "0 18px 20px" : "0 22px 22px 84px", flexWrap: "wrap" }}>
          <DocPanel dot="var(--revisar)" title="Quando funciona melhor" body={doc.quando} isPhone={isPhone} />
          <DocPanel dot="var(--accent)" title="Como aplicar" body={doc.como} isPhone={isPhone} />
        </div>
      )}
    </div>
  );
}

function DocPanel({ dot, title, body, isPhone }: { dot: string; title: string; body: string; isPhone: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: isPhone ? 0 : 240, display: "flex", flexDirection: "column", gap: 8, padding: 16, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />
        <span style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)" }}>
          {title}
        </span>
      </div>
      <span style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--text)" }}>{body}</span>
    </div>
  );
}
