"use client";
import { useState } from "react";

const panels = {
  skills: {
    filename: "skills.json",
    lines: [
      ["{"],
      [
        "  ",
        { t: "key", v: '"frontend"' },
        { t: "colon", v: ":" },
        " ",
        { t: "bracket", v: "[" },
      ],
      [
        "    ",
        { t: "str", v: '"Next.js"' },
        { t: "comma", v: "," },
        "     ",
        { t: "comment", v: "// App Router · RSC" },
      ],
      [
        "    ",
        { t: "str", v: '"React"' },
        { t: "comma", v: "," },
        "       ",
        { t: "comment", v: "// hooks · context" },
      ],
      ["    ", { t: "str", v: '"TypeScript"' }, { t: "comma", v: "," }],
      ["    ", { t: "str", v: '"Tailwind CSS"' }, { t: "comma", v: "," }],
      ["    ", { t: "str", v: '"Framer Motion"' }],
      ["  ", { t: "bracket", v: "]" }, { t: "comma", v: "," }],
      [
        "  ",
        { t: "key", v: '"backend"' },
        { t: "colon", v: ":" },
        " ",
        { t: "bracket", v: "[" },
      ],
      [
        "    ",
        { t: "str", v: '"Node.js"' },
        { t: "comma", v: "," },
        "     ",
        { t: "comment", v: "// Express · Hono" },
      ],
      ["    ", { t: "str", v: '"PostgreSQL"' }, { t: "comma", v: "," }],
      ["    ", { t: "str", v: '"Prisma ORM"' }, { t: "comma", v: "," }],
      ["    ", { t: "str", v: '"Stripe API"' }],
      ["  ", { t: "bracket", v: "]" }, { t: "comma", v: "," }],
      [
        "  ",
        { t: "key", v: '"perf"' },
        { t: "colon", v: ":" },
        " ",
        { t: "num", v: "99" },
        " ",
        { t: "comment", v: "// Lighthouse score" },
      ],
      ["}"],
      [" "],
      [" "],
    ],
  },
  stack: {
    filename: "stack.ts",
    lines: [
      [{ t: "kw", v: "interface" }, " ", { t: "type", v: "Stack" }, " ", "{"],
      [
        "  ",
        { t: "key", v: "design" },
        { t: "colon", v: ":" },
        "  ",
        { t: "val", v: '"Figma"' },
        { t: "comma", v: "," },
      ],
      [
        "  ",
        { t: "key", v: "deploy" },
        { t: "colon", v: ":" },
        "  ",
        { t: "val", v: '"Vercel"' },
        " ",
        { t: "comment", v: "// Railway" },
      ],
      [
        "  ",
        { t: "key", v: "cms" },
        { t: "colon", v: ":" },
        "     ",
        { t: "val", v: '"Sanity"' },
        " ",
        { t: "comment", v: "// Payload" },
      ],
      [
        "  ",
        { t: "key", v: "auth" },
        { t: "colon", v: ":" },
        "    ",
        { t: "val", v: '"Clerk"' },
        " ",
        { t: "comment", v: "// NextAuth" },
      ],
      [
        "  ",
        { t: "key", v: "email" },
        { t: "colon", v: ":" },
        "   ",
        { t: "val", v: '"Resend"' },
      ],
      ["}"],
      [" "],
      [
        { t: "kw", v: "const" },
        " ",
        { t: "fn", v: "deliver" },
        " = ",
        { t: "kw", v: "async" },
        "() ",
        { t: "kw", v: "=>" },
        " {",
      ],
      ["  ", { t: "kw", v: "await" }, " ", { t: "fn", v: "design" }, "(brief)"],
      ["  ", { t: "kw", v: "await" }, " ", { t: "fn", v: "code" }, "(specs)"],
      [
        "  ",
        { t: "kw", v: "await" },
        " ",
        { t: "fn", v: "test" },
        "()",
        { t: "comment", v: " // Lighthouse 98+" },
      ],
      [
        "  ",
        { t: "kw", v: "return" },
        " ",
        { t: "fn", v: "launch" },
        "()",
        { t: "comment", v: " // 🚀" },
      ],
      ["}"],
      [" "],
      [{ t: "kw", v: "export default" }, " ", { t: "fn", v: "deliver" }],
      [" "],
      [" "],
    ],
  },
};

function CodeLine({ tokens }) {
  return (
    <span className="ide-line">
      {tokens.map((tok, i) => {
        if (typeof tok === "string")
          return (
            <span key={i} className="t-brace">
              {tok}
            </span>
          );
        return (
          <span key={i} className={`t-${tok.t}`}>
            {tok.v}
          </span>
        );
      })}
    </span>
  );
}

export default function About() {
  const [activeTab, setActiveTab] = useState("skills");
  const panel = panels[activeTab];

  return (
    <section className="section apropos-section" id="apropos">
      <div className="section-inner">
        <div className="apropos-grid">
          <div>
            <div className="s-label">À propos</div>
            <h2 className="s-title">
              Développeur web,
              <br />
              pas juste <span className="serif-word">codeur.</span>
            </h2>
            <p className="apropos-desc">
              Développeur web freelance basé dans l&apos;Oise, je conçois et
              code des sites internet qui servent un seul objectif : faire
              croître votre activité. Design premium, code propre, performances
              au top — chaque projet est traité comme si c&apos;était le mien.
            </p>
            <blockquote className="apropos-highlight">
              Un bon site, c&apos;est 10 % de design et 90 % de stratégie.
            </blockquote>
            <p className="apropos-desc">
              Mon processus est simple : je comprends votre marché, je construis
              une interface qui convertit, et je vous livre un site que vous
              pouvez faire évoluer. Pas de template recyclé, pas de
              sous-traitance offshore.
            </p>
            <a
              href="#contact"
              className="btn btn-blue"
              style={{ marginTop: 8 }}
            >
              Démarrons un projet →
            </a>
          </div>

          {/* IDE Window */}
          <div className="ide-window">
            <div className="ide-titlebar">
              <div className="ide-dots">
                <div className="ide-dot" style={{ background: "#FF5F57" }} />
                <div className="ide-dot" style={{ background: "#FFBC2E" }} />
                <div className="ide-dot" style={{ background: "#28C840" }} />
              </div>
              <div className="ide-tabs">
                <div
                  className={`ide-tab${activeTab === "skills" ? " active" : ""}`}
                  onClick={() => setActiveTab("skills")}
                >
                  skills.json
                </div>
                <div
                  className={`ide-tab${activeTab === "stack" ? " active" : ""}`}
                  onClick={() => setActiveTab("stack")}
                >
                  stack.ts
                </div>
              </div>
              <div className="ide-filename">quantum-code / src</div>
            </div>

            <div className="ide-body">
              <div className="ide-gutter">
                {panel.lines.map((_, i) => (
                  <span key={i} className="ide-ln">
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="ide-code">
                {panel.lines.map((tokens, i) => (
                  <CodeLine key={`${activeTab}-${i}`} tokens={tokens} />
                ))}
              </div>
            </div>

            <div className="ide-statusbar">
              <span>UTF-8 · spaces: 2</span>
              <div className="ide-status-r">
                <span>Ln {panel.lines.length}</span>
                <span>{panel.filename}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
