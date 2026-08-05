// App shell (AD-009): a left sidebar that collapses to an icon rail, with the method switcher
// promoted OUT of the sidebar to the top of the board content area (so it stays fully legible even
// when the sidebar is collapsed). Collapse state persists across sessions, the sidebar
// auto-collapses below ~1024px, and Ctrl/⌘+B toggles it.
//
// Styled 1:1 with the handoff (design/handoff/project/Quadro.dc.html): sidebar on var(--surface-2),
// the "A Pilha" mark + "Studd·up" wordmark, "Novo Card" with --shadow-accent, real line nav icons,
// a Claro/Escuro theme pill and the "Offline" line; the collapsed rail is 66px with tooltips. Every
// interactive control carries a hover state (nav rows, buttons, theme pills, search/filter chips).

import { useCallback, useEffect, useState } from "react";
import type { Technique } from "../lib/bindings";
import { MethodSwitcher } from "./MethodSwitcher";
import { TECHNIQUE_LABEL } from "./TechniqueChip";
import {
  NavGlyph,
  PlusIcon,
  SearchIcon,
  SidebarToggleIcon,
  StuddupMark,
  Wordmark,
} from "./brand";
import {
  getStoredPreference,
  resolveTheme,
  setThemePreference,
  type Theme,
} from "../styles/theme";
import { DEFAULT_ROUTE, ROUTES, RouteView, type RouteKey } from "../routes";
import { useStore } from "../store";
import { useCreateCard, useExams } from "../lib/queries";
import { NovoCardModal } from "./modals/NovoCard";

const COLLAPSE_KEY = "studdup.sidebar.collapsed";
const AUTO_COLLAPSE_WIDTH = 1024;

const EXPANDED_WIDTH = 250;
const RAIL_WIDTH = 66;

/** The brand mark keeps one size in both the expanded sidebar and the collapsed rail. */
const MARK_SIZE = 26;

function readCollapsedPref(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(COLLAPSE_KEY) === "1";
}

function writeCollapsedPref(collapsed: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }
}

/** Routes that show the promoted method switcher above their content. */
const METHOD_SCOPED: ReadonlySet<RouteKey> = new Set<RouteKey>(["quadro", "historico"]);

/** Tiny hover helper — the same pattern the board card uses (useState + mouse handlers). */
function useHover() {
  const [hover, setHover] = useState(false);
  return {
    hover,
    bind: { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) },
  };
}

export function AppShell() {
  const [collapsedPref, setCollapsedPref] = useState<boolean>(readCollapsedPref);
  const [narrow, setNarrow] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < AUTO_COLLAPSE_WIDTH,
  );
  const [route, setRoute] = useState<RouteKey>(DEFAULT_ROUTE);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getStoredPreference()));
  const [showNewCard, setShowNewCard] = useState(false);
  const method = useStore((s) => s.activeMethod);
  const setMethod = useStore((s) => s.setActiveMethod);
  const createCard = useCreateCard();
  const examsQuery = useExams();

  const collapsed = narrow || collapsedPref;
  const isBoard = route === "quadro";
  const isMethodScoped = METHOD_SCOPED.has(route);

  const toggleCollapse = useCallback(() => {
    setCollapsedPref((prev) => {
      const next = !prev;
      writeCollapsedPref(next);
      return next;
    });
  }, []);

  const chooseTheme = useCallback((t: Theme) => {
    setThemePreference(t);
    setTheme(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setNarrow(window.innerWidth < AUTO_COLLAPSE_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack keys while the user is typing in a field.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      } else if (mod && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setRoute("historico");
      } else if (e.key === "F1" || (e.key === "?" && !mod)) {
        e.preventDefault();
        setRoute("ajuda");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapse]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <Sidebar
        collapsed={collapsed}
        canToggle={!narrow}
        route={route}
        theme={theme}
        onNavigate={setRoute}
        onToggle={toggleCollapse}
        onChooseTheme={chooseTheme}
        onNewCard={() => setShowNewCard(true)}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
        }}
      >
        {isMethodScoped && (
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "18px 22px 12px",
            }}
          >
            <MethodSwitcher value={method} onChange={setMethod} />
            {/* Search + technique filter act on the board's cards, so they show only there. */}
            {isBoard && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                <SearchField />
                <FilterMenu />
              </div>
            )}
          </div>
        )}

        <section
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            // The board owns its own padding and scrolls its columns internally; method-scoped
            // screens (history) fill the width; standalone screens (config, técnicas, ajuda,
            // início) center a max-width column (handoff `margin:0 auto`).
            alignItems: isBoard || isMethodScoped ? "stretch" : "center",
            overflow: isBoard ? "hidden" : "auto",
            padding: isBoard ? 0 : isMethodScoped ? "0 22px 22px" : "22px 24px",
          }}
        >
          <RouteView route={route} onNavigate={setRoute} theme={theme} onChooseTheme={chooseTheme} />
        </section>
      </main>

      {showNewCard && (
        <NovoCardModal
          activeMethod={method}
          exams={(examsQuery.data ?? [])
            .filter((e) => !e.concluded)
            .map((e) => ({ id: e.id, name: e.name }))}
          onClose={() => setShowNewCard(false)}
          onCreate={(card) => {
            createCard.mutate(card);
            setShowNewCard(false);
          }}
          onCreateExam={() => {
            // No exams yet and the user wants a Prova card → take them to the Prova board where the
            // exam-management flow (Gerenciar provas / Nova Prova) lives (AD-009, contextual nav).
            setShowNewCard(false);
            setMethod("ExamPrep");
            setRoute("quadro");
          }}
        />
      )}
    </div>
  );
}

/** Board search field — filters the board's cards by title (KAN). Focus/hover strengthen the border. */
function SearchField() {
  const [focus, setFocus] = useState(false);
  const query = useStore((s) => s.boardSearch);
  const setQuery = useStore((s) => s.setBoardSearch);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 13px",
        background: "var(--surface)",
        border: `1px solid ${focus ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 11,
        width: 172,
        color: "var(--text-3)",
        transition: "border-color var(--transition-fast)",
      }}
    >
      <SearchIcon size={14} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder="Buscar card…"
        aria-label="Buscar card"
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--text)",
          font: "400 12.5px/1 var(--font-sans)",
        }}
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Limpar busca"
          style={{ border: "none", background: "transparent", color: "var(--text-3)", cursor: "pointer", padding: 0, font: "400 13px/1 var(--font-sans)", flex: "none" }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** The techniques offered in the board filter (+ the "all" reset). */
const FILTER_TECHNIQUES: readonly Technique[] = ["Pomodoro", "ActiveRecall", "Feynman", "Leitner"];

/** Technique filter dropdown — narrows the board to one technique (KAN). */
function FilterMenu() {
  const { hover, bind } = useHover();
  const [open, setOpen] = useState(false);
  const value = useStore((s) => s.boardTechnique);
  const setValue = useStore((s) => s.setBoardTechnique);
  const active = value !== null;
  const label = value ? TECHNIQUE_LABEL[value] : "Todas as técnicas";

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-filter-menu]")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div data-filter-menu style={{ position: "relative", flex: "none" }}>
      <button
        type="button"
        {...bind}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          padding: "9px 13px",
          background: active ? "var(--accent-soft)" : "var(--surface)",
          border: `1px solid ${active ? "var(--accent)" : hover ? "var(--border-strong)" : "var(--border)"}`,
          borderRadius: 11,
          font: "500 12.5px/1 var(--font-sans)",
          color: active ? "var(--accent-soft-ink)" : hover ? "var(--text)" : "var(--text-2)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "border-color var(--transition-fast), color var(--transition-fast)",
        }}
      >
        {label} ▾
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            minWidth: 170,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 5,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-2)",
          }}
        >
          <FilterOption label="Todas as técnicas" selected={value === null} onClick={() => { setValue(null); setOpen(false); }} />
          {FILTER_TECHNIQUES.map((t) => (
            <FilterOption
              key={t}
              label={TECHNIQUE_LABEL[t]}
              selected={value === t}
              onClick={() => { setValue(t); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const { hover, bind } = useHover();
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      {...bind}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: selected ? "var(--accent-soft)" : hover ? "var(--surface-2)" : "transparent",
        color: selected ? "var(--accent-soft-ink)" : "var(--text)",
        font: `${selected ? 600 : 500} 12.5px/1 var(--font-sans)`,
        transition: "background var(--transition-fast)",
      }}
    >
      {label}
      {selected && <span aria-hidden>✓</span>}
    </button>
  );
}

interface SidebarProps {
  collapsed: boolean;
  canToggle: boolean;
  route: RouteKey;
  theme: Theme;
  onNavigate: (route: RouteKey) => void;
  onToggle: () => void;
  onChooseTheme: (t: Theme) => void;
  onNewCard: () => void;
}

/** The brand lockup: the "A Pilha" mark (accent) plus, when expanded, the "Studd·up" wordmark. */
function BrandLockup({ withWordmark }: { withWordmark: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)", flex: "none" }}>
      <StuddupMark size={MARK_SIZE} />
      {withWordmark && (
        <Wordmark style={{ font: "700 17px/1 var(--font-sans)", color: "var(--text)" }} />
      )}
    </div>
  );
}

/** The collapse/expand toggle — hovers to a filled chip. */
function ToggleButton({
  collapsed,
  onToggle,
  size,
}: {
  collapsed: boolean;
  onToggle: () => void;
  size: number;
}) {
  const { hover, bind } = useHover();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expandir a barra lateral" : "Recolher a barra lateral"}
      title={`${collapsed ? "Expandir" : "Recolher"} a barra lateral (Ctrl+B)`}
      {...bind}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        border: "none",
        background: hover ? "var(--surface-3)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: hover ? "var(--text)" : "var(--text-3)",
        cursor: "pointer",
        flex: "none",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      <SidebarToggleIcon size={16} />
    </button>
  );
}

/** The "Novo Card" primary action — icon-only in the rail, labelled when expanded. */
function NovoCardButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const { hover, bind } = useHover();
  const shared: React.CSSProperties = {
    border: "none",
    background: hover ? "var(--accent-hover)" : "var(--accent)",
    color: "var(--accent-ink)",
    cursor: "pointer",
    boxShadow: "var(--shadow-accent)",
    transition: "background var(--transition-fast)",
  };
  if (collapsed) {
    return (
      <button
        type="button"
        title="Novo Card"
        aria-label="Novo Card"
        onClick={onClick}
        {...bind}
        style={{
          ...shared,
          width: 38,
          height: 38,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PlusIcon size={17} />
      </button>
    );
  }
  return (
    <button
      type="button"
      title="Novo Card"
      onClick={onClick}
      {...bind}
      style={{
        ...shared,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: 11,
        borderRadius: 13,
        font: "600 13.5px/1 var(--font-sans)",
      }}
    >
      <PlusIcon size={15} />
      Novo Card
    </button>
  );
}

/** A nav row/button — icon-only in the rail, icon+label when expanded, with a hover fill. */
function NavButton({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: (typeof ROUTES)[number];
  active: boolean;
  collapsed: boolean;
  onNavigate: (route: RouteKey) => void;
}) {
  const { hover, bind } = useHover();
  const bg = active ? "var(--accent-soft)" : hover ? "var(--surface-3)" : "transparent";
  const fg = active ? "var(--accent-soft-ink)" : hover ? "var(--text)" : "var(--text-2)";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.key)}
        aria-current={active ? "page" : undefined}
        title={item.label}
        {...bind}
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: bg,
          color: fg,
          transition: "background var(--transition-fast), color var(--transition-fast)",
        }}
      >
        <NavGlyph route={item.key} size={18} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.key)}
      aria-current={active ? "page" : undefined}
      {...bind}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "9px 11px",
        borderRadius: 11,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        font: `${active ? 600 : 500} 13px/1 var(--font-sans)`,
        background: bg,
        color: fg,
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      <NavGlyph route={item.key} size={17} />
      {item.label}
    </button>
  );
}

/** A Claro/Escuro theme pill — hovers to darker text when inactive. */
function ThemePill({
  value,
  active,
  onChoose,
}: {
  value: Theme;
  active: boolean;
  onChoose: (t: Theme) => void;
}) {
  const { hover, bind } = useHover();
  return (
    <button
      type="button"
      onClick={() => onChoose(value)}
      {...bind}
      style={{
        flex: 1,
        textAlign: "center",
        padding: 6,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        font: `${active ? 600 : 500} 11.5px/1 var(--font-sans)`,
        background: active ? (value === "light" ? "var(--surface)" : "var(--bg)") : "transparent",
        color: active ? "var(--text)" : hover ? "var(--text)" : "var(--text-2)",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      {value === "light" ? "Claro" : "Escuro"}
    </button>
  );
}

function Sidebar({ collapsed, canToggle, route, theme, onNavigate, onToggle, onChooseTheme, onNewCard }: SidebarProps) {
  if (collapsed) {
    return (
      <nav
        aria-label="Navegação principal"
        style={{
          width: RAIL_WIDTH,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "18px 0",
          background: "var(--surface-2)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <BrandLockup withWordmark={false} />
        {canToggle && <ToggleButton collapsed onToggle={onToggle} size={38} />}
        <NovoCardButton collapsed onClick={onNewCard} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          {ROUTES.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={item.key === route}
              collapsed
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        width: EXPANDED_WIDTH,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: "18px 14px",
        background: "var(--surface-2)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
        <BrandLockup withWordmark />
        {canToggle && (
          <div style={{ marginLeft: "auto" }}>
            <ToggleButton collapsed={false} onToggle={onToggle} size={26} />
          </div>
        )}
      </div>

      <NovoCardButton collapsed={false} onClick={onNewCard} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ROUTES.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={item.key === route}
            collapsed={false}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface-3)", borderRadius: 11 }}>
          {(["light", "dark"] as const).map((t) => (
            <ThemePill key={t} value={t} active={theme === t} onChoose={onChooseTheme} />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "0 2px",
            font: "400 10.5px/1.35 var(--font-sans)",
            color: "var(--text-3)",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--revisar)", flex: "none" }} />
          Offline · salvo neste computador
        </div>
      </div>
    </nav>
  );
}
