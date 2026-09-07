(function (global) {
  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function inlineMath(text) {
    let escaped = escapeHTML(text);
    // Fracciones LaTeX simples generadas por el motor matemático.
    escaped = escaped.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="frac"><span>$1</span><span>$2</span></span>');
    return escaped
      .replace(/\\_/g, "_")
      .replace(/_([0-9]+)/g, "<sub>$1</sub>")
      .replace(/\\leftrightarrow/g, "↔")
      .replace(/\\div/g, "÷")
      .replace(/−/g, "−");
  }

  function fractionify(text) {
    return text.replace(/(?<![A-Za-z0-9])(-?\d+)\/(\d+)(?![A-Za-z0-9])/g,
      '<span class="frac"><span>$1</span><span>$2</span></span>');
  }

  function renderEquation(raw) {
    const source = raw.trim();
    if (source.startsWith("\\system{")) {
      const body = source.slice(8, -1);
      const rows = body.split("\\\\").map(inlineMath).map(fractionify);
      return `<div class="math-block system-math"><span class="system-brace">{</span><div class="system-lines">${rows.map(r => `<div>${r}</div>`).join("")}</div></div>`;
    }
    if (source.startsWith("\\matrix{")) {
      const body = source.slice(8, -1);
      return matrixHTML(body, false);
    }
    if (source.startsWith("\\augmatrix{")) {
      const body = source.slice(11, -1);
      return matrixHTML(body, true);
    }
    if (source.startsWith("\\boxed{")) {
      const body = source.slice(7, -1);
      const rows = body.split("\\\\").map(inlineMath).map(fractionify);
      return `<div class="math-block"><div class="math-box">${rows.map(r => `<div>${r}</div>`).join("")}</div></div>`;
    }
    return `<div class="math-block equation-math">${fractionify(inlineMath(source))}</div>`;
  }

  function matrixHTML(body, augmented) {
    const rows = body.split("\\\\").map(row => row.split(" & "));
    const middle = augmented ? Math.floor(rows[0].length / 2) : -1;
    return `<div class="math-block matrix-math"><span class="matrix-paren">(</span><div class="matrix-grid">${rows.map(row =>
      `<div class="matrix-row">${row.map((cell, i) => `${augmented && i === middle ? '<span class="matrix-divider"></span>' : ''}<span>${fractionify(inlineMath(cell))}</span>`).join("")}</div>`
    ).join("")}</div><span class="matrix-paren">)</span></div>`;
  }

  function render(markdown) {
    const blocks = String(markdown).trim().split(/\n{2,}/);
    return blocks.map(block => {
      if (/^#{1,3}\s/.test(block)) {
        const text = block.replace(/^#{1,3}\s*/, "");
        return `<h3 class="md-heading">${escapeHTML(text)}</h3>`;
      }
      if (block.startsWith("$$") && block.endsWith("$$")) {
        return renderEquation(block.slice(2, -2));
      }
      return `<p class="md-text">${inlineMath(block).replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  global.renderMarkdown = render;
})(window);
