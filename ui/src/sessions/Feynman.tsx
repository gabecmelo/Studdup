// Feynman session (TECH-05, handoff "SessaoFeynman"). Explain-to-learn in three steps:
//   1. write — the user writes a plain-language explanation "as if teaching a beginner";
//   2. compare — their explanation is shown side by side with the source material (TECH-05.2), so
//      gaps and oversimplifications surface;
//   3. rate — the three-point self-rating (TECH-06), recorded by the parent alongside the written
//      explanation (record_session + record_attempt).
// Closing with an unsubmitted explanation warns first (TECH-04.5). Shares the session chrome and the
// unsaved-warning dialog with the Active Recall screen; presentational, parent owns the mutations.

import { useRef, useState } from "react";
import { LinkRow } from "../components/LinkRow";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";
import { SelfRating } from "./SelfRatingControl";
import type { SelfRatingValue } from "./selfRating";
import { TechniqueReminder } from "./TechniqueReminder";
import {
  ComparePane,
  ExitLink,
  SubmitButton,
  UnsavedWarning,
  chip,
  iconBadge,
  shell,
} from "./ActiveRecall";

export interface FeynmanResult {
  focusedSecs: number;
  selfRating: SelfRatingValue;
  text: string;
}

export interface FeynmanSessionProps {
  cardTitle: string;
  contentLink?: string;
  reviewLink?: string;
  onFinish: (result: FeynmanResult) => void;
  onExit: () => void;
}

type Phase = "write" | "compare" | "rate";

export function FeynmanSession({
  cardTitle,
  contentLink,
  reviewLink,
  onFinish,
  onExit,
}: FeynmanSessionProps) {
  const [phase, setPhase] = useState<Phase>("write");
  const [text, setText] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const startedAt = useRef(Date.now());

  const hasText = text.trim().length > 0;
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

  function requestExit() {
    if (phase === "write" && hasText) setConfirmExit(true);
    else onExit();
  }

  useEscapeToClose(requestExit);

  function elapsedSecs() {
    return Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
  }

  function finish(selfRating: SelfRatingValue) {
    onFinish({ focusedSecs: elapsedSecs(), selfRating, text: text.trim() });
  }

  return (
    <div style={shell}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "22px 30px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={iconBadge}>
            <TechniqueIcon technique="Feynman" size={14} />
          </span>
          <span style={{ font: "600 14px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cardTitle}
          </span>
        </div>
        <span style={chip}>{TECHNIQUE_LABEL.Feynman}</span>
        <span style={{ flex: 1 }} />
        <ExitLink onClick={requestExit} />
      </div>

      <TechniqueReminder technique="Feynman" />

      <div style={{ flex: 1, minHeight: 0, display: "flex", padding: "26px 30px 30px" }}>
        {phase === "write" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, maxWidth: 840, margin: "0 auto", width: "100%", minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center" }}>
              <span style={{ font: "600 23px/1.25 var(--font-sans)", letterSpacing: "-.02em" }}>
                Explique como se ensinasse a um iniciante
              </span>
              <span style={{ font: "400 13.5px/1.5 var(--font-sans)", color: "var(--text-2)", maxWidth: 540 }}>
                Nada de jargão. Se um colega que nunca viu o assunto entenderia, você domina. Onde
                travar, é o que falta estudar.
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 16, border: "1.5px solid var(--accent)", background: "var(--surface)", overflow: "hidden" }}>
              <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-soft-ink)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 11px/1 var(--font-sans)" }}>
                  ?
                </span>
                <span style={{ font: "500 12px/1 var(--font-sans)", color: "var(--text-2)" }}>
                  "Imagine que eu não sei nada do assunto…"
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                aria-label="Escreva sua explicação"
                placeholder="Explique com suas palavras, do zero…"
                style={{
                  flex: 1,
                  minHeight: 0,
                  resize: "none",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--text)",
                  padding: 20,
                  font: "400 15px/1.7 var(--font-sans)",
                }}
              />
              <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <span style={{ font: "400 11px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
                  {wordCount} {wordCount === 1 ? "palavra" : "palavras"}
                </span>
                <span style={{ flex: 1 }} />
                <SubmitButton disabled={!hasText} onClick={() => setPhase("compare")}>
                  Comparar com o material
                </SubmitButton>
              </div>
            </div>
          </div>
        )}

        {phase === "compare" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "600 20px/1.2 var(--font-sans)", letterSpacing: "-.02em" }}>
                Sua explicação vs. o material
              </span>
              <span style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
                Onde você simplificou demais ou pulou algo, o material mostra.
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>
              <ComparePane dot="var(--accent)" title="Sua explicação simples">
                <div style={{ font: "400 14px/1.65 var(--font-sans)", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {text.trim()}
                </div>
              </ComparePane>
              <ComparePane dot="var(--revisar)" title="Material original">
                {contentLink || reviewLink ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)" }}>
                      Abra a fonte e veja o que a sua explicação deixou de fora.
                    </span>
                    {contentLink && <LinkRow label="Material de conteúdo" url={contentLink} />}
                    {reviewLink && <LinkRow label="Notas de revisão" url={reviewLink} />}
                  </div>
                ) : (
                  <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-3)" }}>
                    Este card não tem link de material. Confira pela sua própria fonte de estudo.
                  </span>
                )}
              </ComparePane>
            </div>
            <div style={{ flex: "none", display: "flex", justifyContent: "center" }}>
              <SubmitButton onClick={() => setPhase("rate")}>Avaliar minha explicação</SubmitButton>
            </div>
          </div>
        )}

        {phase === "rate" && (
          <SelfRating
            title="Sua explicação segurou de pé?"
            subtitle="Pensando em quem nunca viu o assunto — deu pra entender só com o que você escreveu?"
            onSelect={finish}
          />
        )}
      </div>

      {confirmExit && (
        <UnsavedWarning
          title="Explicação não comparada"
          body="Você escreveu uma explicação mas ainda não comparou com o material. Sair agora descarta o texto e não conta a sessão."
          backLabel="Voltar e comparar"
          onBack={() => setConfirmExit(false)}
          onDiscard={() => {
            setConfirmExit(false);
            onExit();
          }}
        />
      )}
    </div>
  );
}
