(function (global) {
  const VAR_SETS = {
    2: ["x", "y"],
    3: ["x", "y", "z"]
  };

  function normalize(text) {
    return text
      .replace(/[×·]/g, "")
      .replace(/−/g, "-")
      .replace(/–/g, "-")
      .replace(/＝/g, "=")
      .replace(/\{|\}/g, "")
      .replace(/\t/g, " ")
      .trim();
  }

  function parseCoeffToken(tok) {
    tok = tok.replace(/\s+/g, "");
    if (tok === "" || tok === "+") return new Frac(1, 1);
    if (tok === "-") return new Frac(-1, 1);
    return Frac.parse(tok);
  }

  function parseSide(side, vars) {
    const coeffs = {};
    vars.forEach((v) => {
      coeffs[v] = Frac.zero();
    });
    let constant = Frac.zero();
    const s = side.replace(/\s+/g, "");
    if (!s) return { coeffs, constant };

    const termRe = /([+-]?)(\d+(?:\/\d+)?|\d*\.\d+)?([xyzXYZ])?|([+-]?\d+(?:\/\d+)?|\d*\.\d+)/g;
    let m;
    let found = false;
    const str = s.startsWith("+") || s.startsWith("-") ? s : "+" + s;
    const better = /[+-](?:\d+(?:\/\d+)?|\d*\.\d+)?[xyzXYZ]?/gi;
    const pieces = str.match(/[+-](?:\d+(?:\/\d+)?|\d*\.\d+)?[xyzXYZ]?/g);
    if (!pieces) throw new Error("No se pudo leer: " + side);

    pieces.forEach((p) => {
      found = true;
      const varMatch = p.match(/[xyzXYZ]$/);
      if (varMatch) {
        const v = varMatch[0].toLowerCase();
        if (!vars.includes(v)) throw new Error("Variable no esperada: " + v);
        const coefStr = p.slice(0, -1);
        coeffs[v] = coeffs[v].add(parseCoeffToken(coefStr));
      } else {
        constant = constant.add(Frac.parse(p));
      }
    });
    if (!found) throw new Error("Ecuación vacía");
    return { coeffs, constant };
  }

  function parseEquation(line, vars) {
    const raw = normalize(line);
    if (!raw) return null;
    if (!raw.includes("=")) throw new Error("Falta '=' en: " + line);
    const parts = raw.split("=");
    if (parts.length !== 2) throw new Error("Hay más de un '=' en: " + line);
    const L = parseSide(parts[0], vars);
    const R = parseSide(parts[1], vars);
    const row = vars.map((v) => L.coeffs[v].sub(R.coeffs[v]));
    const b = R.constant.sub(L.constant);
    return { row, b, source: raw };
  }

  function parseSystem(text, size) {
    const vars = VAR_SETS[size];
    const lines = normalize(text)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length && !l.startsWith("#"));
    if (lines.length !== size) {
      return {
        ok: false,
        error: "Se necesitan exactamente " + size + " ecuaciones. Hay " + lines.length + "."
      };
    }
    try {
      const eqs = lines.map((l) => parseEquation(l, vars));
      const A = eqs.map((e) => e.row);
      const b = eqs.map((e) => e.b);
      const sources = eqs.map((e) => e.source);
      const allZero = A.every((row) => row.every((c) => c.isZero()));
      if (allZero) return { ok: false, error: "Todas las filas son cero." };
      return { ok: true, size, vars, A, b, sources };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  global.parseSystem = parseSystem;
  global.VAR_SETS = VAR_SETS;
})(window);
