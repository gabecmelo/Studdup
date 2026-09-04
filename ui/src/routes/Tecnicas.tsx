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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // Phone: the shell's section is the page scroller, so this screen sizes to its content
        // instead of nesting a second scroll area (RWD-02).
        height: isPhone ? "auto" : "100%",
        minHeight: 0,
        width: "100%",
        maxWidth: 940,
        margin: "0 auto",
        padding: isPhone ? "0 16px" : "26px 24px 0",
      }}
    >
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 6, paddingBottom: isPhone ? 14 : 20 }}>
        {/* The phone top bar already titles this screen — repeating "Catálogo de técnicas" as a
            26px heading cost two wrapped lines of a short screen, so only the lede stays. */}
        {!isPhone && (
          <span style={{ font: "600 26px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
            Catálogo de técnicas
          </span>
        )}
        <span style={{ font: "400 13.5px/1.45 var(--font-sans)", color: "var(--text-2)", maxWidth: 640 }}>
          Quatro formas de estudar um card. Escolha por card — a técnica muda como a sessão funciona,
          não quando ela aparece no quadro.
        </span>
      </div>

      <div style={{ flex: isPhone ? "none" : 1, minHeight: 0, overflowY: isPhone ? "visible" : "auto", paddingBottom: isPhone ? 24 : 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: isPhone ? 10 : 14 }}>
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
          // Phone: a 46px tile + 30px chevron + 16px gaps ate 108px of a 328px card and squeezed
          // the summary into a four-line sliver. Everything steps down one notch here.
          gap: isPhone ? 12 : 16,
          padding: isPhone ? "16px 14px" : "20px 22px",
          border: "none",
          background: hover && !open ? "var(--surface-2)" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          transition: "background var(--transition-fast)",
        }}
      >
        <span style={{ width: isPhone ? 38 : 46, height: isPhone ? 38 : 46, borderRadius: isPhone ? 11 : 13, background: "var(--accent-soft)", color: "var(--accent-soft-ink)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <TechniqueIcon technique={doc.tipo} size={isPhone ? 17 : 20} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: `600 ${isPhone ? 15.5 : 17}px/1.2 var(--font-sans)`, letterSpacing: "-.01em", color: "var(--text)" }}>
            {TECHNIQUE_LABEL[doc.tipo]}
          </span>
          <span style={{ font: `400 ${isPhone ? 12.5 : 13}px/1.45 var(--font-sans)`, color: "var(--text-2)" }}>{doc.resumo}</span>
        </span>
        <span style={{ width: isPhone ? 26 : 30, height: isPhone ? 26 : 30, borderRadius: 9, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", font: "500 13px/1 var(--font-sans)", flex: "none" }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div style={{ display: "flex", gap: isPhone ? 10 : 16, padding: isPhone ? "0 14px 16px" : "0 22px 22px 84px", flexWrap: "wrap" }}>
          <DocPanel dot="var(--revisar)" title="Quando funciona melhor" body={doc.quando} isPhone={isPhone} />
          <DocPanel dot="var(--accent)" title="Como aplicar" body={doc.como} isPhone={isPhone} />
        </div>
      )}
    </div>
  );
}

function DocPanel({ dot, title, body, isPhone }: { dot: string; title: string; body: string; isPhone: boolean }) {
  return (
    // Phone: `minWidth: 100%` forces each panel onto its own row. With `minWidth: 0` the two
    // panels shared one wrapped row at ~150px each, which is where the shredded text came from.
    <div style={{ flex: 1, minWidth: isPhone ? "100%" : 240, display: "flex", flexDirection: "column", gap: 8, padding: isPhone ? 14 : 16, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
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
