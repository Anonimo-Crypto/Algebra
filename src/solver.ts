/* Motor matemático en TypeScript. Se compila a js/solver.js para el navegador. */

declare const Frac: any;
declare function matrixCopy(M: any[][]): any[][];

type F = any;
type MetodoId = "adicion" | "gauss" | "sustitucion" | "determinante" | "inversa";
type Sistema = { size: number; vars: string[]; A: F[][]; b: F[] };
type PasoMatematico = { titulo: string; markdown: string };
type ResultadoSistema = { steps: PasoMatematico[]; ok: boolean; kind: "unica" | "incompatible" | "infinitas"; sol?: F[] };
type Metodo = { id: MetodoId; name: string; run: (sys: Sistema) => ResultadoSistema };

const f = (n: number | string, d?: number): F => new Frac(n, d);
const clone = (v: F): F => v.clone();

function det2(a: F, b: F, c: F, d: F): F {
  return a.mul(d).sub(b.mul(c));
}

function det3(M: F[][]): F {
  return M[0][0].mul(det2(M[1][1], M[1][2], M[2][1], M[2][2]))
    .sub(M[0][1].mul(det2(M[1][0], M[1][2], M[2][0], M[2][2])))
    .add(M[0][2].mul(det2(M[1][0], M[1][1], M[2][0], M[2][1])));
}

function coef(v: F, variable: string, first = false): string {
  if (v.isZero()) return "";
  const sign = v.n < 0 ? "−" : (first ? "" : "+");
  const abs = v.abs().toString();
  const number = abs === "1" ? "" : abs;
  return `${sign}${number}${variable}`;
}

function equation(row: F[], b: F, vars: string[]): string {
  const terms: string[] = [];
  row.forEach((value, i) => {
    const term = coef(value, vars[i], terms.length === 0);
    if (term) terms.push(term);
  });
  return `${terms.length ? terms.join("") : "0"}=${b.toString()}`;
}

function systemMarkdown(A: F[][], b: F[], vars: string[]): string {
  return `$$\\system{${A.map((row, i) => equation(row, b[i], vars)).join("\\\\")}}$$`;
}

function matrixMarkdown(M: F[][]): string {
  return `$$\\matrix{${M.map(row => row.map(x => x.toString()).join(" & ")).join("\\\\")}}$$`;
}

function decimalString(v: Frac): string {
  const n = v.toNumber();
  if (!Number.isFinite(n) || v.d === 1) return "";
  return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function boxedSolution(sol: Frac[], vars: string[]) {
  return `$$\\boxed{${sol.map((v, i) => {
    const decimal = decimalString(v);
    return `${vars[i]}=${v.toString()}${decimal ? `≈${decimal}` : ""}`;
  }).join("\\\\")}}$$`;
}

function classify(A: F[][], b: F[]): "unica" | "incompatible" | "infinitas" {
  const M = A.map((row, i) => row.map(clone).concat([clone(b[i])]));
  let rankA = 0;
  let rankAb = 0;
  let row = 0;
  const rows = M.length;
  const cols = M[0].length;

  for (let col = 0; col < cols && row < rows; col++) {
    let pivot = row;
    for (let r = row + 1; r < rows; r++) {
      if (M[r][col].abs().toNumber() > M[pivot][col].abs().toNumber()) pivot = r;
    }
    if (M[pivot][col].isZero()) continue;
    [M[row], M[pivot]] = [M[pivot], M[row]];
    const pv = M[row][col];
    for (let j = col; j < cols; j++) M[row][j] = M[row][j].div(pv);
    for (let r = 0; r < rows; r++) {
      if (r === row) continue;
      const factor = M[r][col];
      if (!factor.isZero()) {
        for (let j = col; j < cols; j++) M[r][j] = M[r][j].sub(factor.mul(M[row][j]));
      }
    }
    row++;
  }

  M.forEach(r => {
    if (r.slice(0, A.length).some(v => !v.isZero())) rankA++;
    if (r.some(v => !v.isZero())) rankAb++;
  });
  if (rankA < rankAb) return "incompatible";
  if (rankA < A.length) return "infinitas";
  return "unica";
}

function rowOperation(target: number, factor: F, pivot: number): string {
  const sign = factor.n < 0 ? "+" : "−";
  return `F_${target + 1} ${sign} ${factor.abs().toString()}F_${pivot + 1}`;
}

function elimination(sys: Sistema, name: string, reduced: boolean): ResultadoSistema {
  const A = matrixCopy(sys.A);
  const b = sys.b.map(clone);
  const n = sys.size;
  const steps: PasoMatematico[] = [{
    titulo: "Paso 1",
    markdown: systemMarkdown(A, b, sys.vars)
  }];
  let step = 2;

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (A[r][col].abs().toNumber() > A[pivot][col].abs().toNumber()) pivot = r;
    }

    if (A[pivot][col].isZero()) {
      const kind = classify(sys.A, sys.b);
      const label = kind === "incompatible" ? "Sin solución" : "Infinitas soluciones";
      steps.push({ titulo: "Resultado", markdown: `$$\\boxed{${label}}$$` });
      return { steps, ok: false, kind };
    }

    if (pivot !== col) {
      [A[col], A[pivot]] = [A[pivot], A[col]];
      [b[col], b[pivot]] = [b[pivot], b[col]];
      steps.push({
        titulo: `Paso ${step++}`,
        markdown: `$$F_${col + 1}\\leftrightarrow F_${pivot + 1}$$\n\n${systemMarkdown(A, b, sys.vars)}`
      });
    }

    const pv = A[col][col];
    if (!pv.eq(f(1))) {
      for (let j = col; j < n; j++) A[col][j] = A[col][j].div(pv);
      b[col] = b[col].div(pv);
      steps.push({
        titulo: `Paso ${step++}`,
        markdown: `$$F_${col + 1}\\div ${pv.toString()}$$\n\n${systemMarkdown(A, b, sys.vars)}`
      });
    }

    const targets: number[] = [];
    if (reduced) {
      for (let r = 0; r < n; r++) if (r !== col) targets.push(r);
    } else {
      for (let r = col + 1; r < n; r++) targets.push(r);
    }

    for (const r of targets) {
      const factor = A[r][col];
      if (factor.isZero()) continue;
      for (let j = col; j < n; j++) A[r][j] = A[r][j].sub(factor.mul(A[col][j]));
      b[r] = b[r].sub(factor.mul(b[col]));
      steps.push({
        titulo: `Paso ${step++}`,
        markdown: `$$${rowOperation(r, factor, col)}$$\n\n${systemMarkdown(A, b, sys.vars)}`
      });
    }
  }

  if (!reduced) {
    const sol: F[] = Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let value = b[i];
      for (let j = i + 1; j < n; j++) value = value.sub(A[i][j].mul(sol[j]));
      sol[i] = value.div(A[i][i]);
      steps.push({
        titulo: `Paso ${step++}`,
        markdown: `$$${sys.vars[i]}=${sol[i].toString()}$$`
      });
    }
    steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
    return { steps, ok: true, kind: "unica", sol };
  }

  const sol = b.map(clone);
  steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
  return { steps, ok: true, kind: "unica", sol };
}

function substitution(sys: Sistema): ResultadoSistema {
  if (sys.size !== 2) return elimination(sys, "Sustitución", false);
  const A = matrixCopy(sys.A);
  const b = sys.b.map(clone);
  const vars = sys.vars;
  const steps: PasoMatematico[] = [{ titulo: "Paso 1", markdown: systemMarkdown(A, b, vars) }];

  let source = A[0][0].isZero() ? 1 : 0;
  if (A[source][0].isZero()) return elimination(sys, "Sustitución", false);
  const other = 1 - source;
  const a = A[source][0], c = A[source][1], d = b[source];
  const a2 = A[other][0], c2 = A[other][1], d2 = b[other];
  const expr = `(${d.toString()}−(${c.toString()})${vars[1]})/${a.toString()}`;
  steps.push({ titulo: "Paso 2", markdown: `$$${vars[0]}=${expr}$$` });

  const denominator = c2.mul(a).sub(a2.mul(c));
  if (denominator.isZero()) {
    const kind = classify(sys.A, sys.b);
    steps.push({ titulo: "Resultado", markdown: `$$\\boxed{${kind === "incompatible" ? "Sin solución" : "Infinitas soluciones"}}$$` });
    return { steps, ok: false, kind };
  }
  const y = d2.mul(a).sub(a2.mul(d)).div(denominator);
  steps.push({ titulo: "Paso 3", markdown: `$$${vars[1]}=${y.toString()}$$` });
  const x = d.sub(c.mul(y)).div(a);
  steps.push({ titulo: "Paso 4", markdown: `$$${vars[0]}=${x.toString()}$$` });
  const sol = [x, y];
  steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, vars) });
  return { steps, ok: true, kind: "unica", sol };
}

function determinant(sys: Sistema): ResultadoSistema {
  const A = matrixCopy(sys.A);
  const steps: PasoMatematico[] = [{ titulo: "Paso 1", markdown: matrixMarkdown(A) }];
  const D = sys.size === 2 ? det2(A[0][0], A[0][1], A[1][0], A[1][1]) : det3(A);
  steps.push({ titulo: "Paso 2", markdown: `$$D=${D.toString()}$$` });
  if (D.isZero()) {
    const kind = classify(sys.A, sys.b);
    steps.push({ titulo: "Resultado", markdown: `$$\\boxed{${kind === "incompatible" ? "Sin solución" : "Infinitas soluciones"}}$$` });
    return { steps, ok: false, kind };
  }

  const sol: F[] = [];
  sys.vars.forEach((variable, col) => {
    const Aj = matrixCopy(A);
    for (let row = 0; row < sys.size; row++) Aj[row][col] = clone(sys.b[row]);
    const Dj = sys.size === 2 ? det2(Aj[0][0], Aj[0][1], Aj[1][0], Aj[1][1]) : det3(Aj);
    const value = Dj.div(D);
    sol.push(value);
    steps.push({
      titulo: `Paso ${steps.length + 1}`,
      markdown: `$$D_${variable}=${Dj.toString()}$$\n\n$$${variable}=D_${variable}/${D.toString()}=${value.toString()}$$`
    });
  });
  steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
  return { steps, ok: true, kind: "unica", sol };
}

function inverseMethod(sys: Sistema): ResultadoSistema {
  const n = sys.size;
  const A = matrixCopy(sys.A);
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => f(i === j ? 1 : 0)));
  const M = A.map((row, i) => row.concat(I[i]));
  const steps: PasoMatematico[] = [{
    titulo: "Paso 1",
    markdown: `$$\\augmatrix{${M.map(row => row.map(v => v.toString()).join(" & ")).join("\\\\")}}$$`
  }];
  let step = 2;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (M[r][col].abs().toNumber() > M[pivot][col].abs().toNumber()) pivot = r;
    if (M[pivot][col].isZero()) return { steps, ok: false, kind: classify(sys.A, sys.b) };
    if (pivot !== col) [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] = M[col][j].div(pv);
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = 0; j < 2 * n; j++) M[r][j] = M[r][j].sub(factor.mul(M[col][j]));
    }
    steps.push({ titulo: `Paso ${step++}`, markdown: `$$\\augmatrix{${M.map(row => row.map(v => v.toString()).join(" & ")).join("\\\\")}}$$` });
  }
  const inv = M.map(row => row.slice(n));
  const sol = inv.map(row => row.reduce((sum: F, value: F, j: number) => sum.add(value.mul(sys.b[j])), f(0)));
  steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
  return { steps, ok: true, kind: "unica", sol };
}

const METHODS: Record<MetodoId, Metodo> = {
  adicion: { id: "adicion", name: "Adición", run: (sys) => elimination(sys, "Adición", false) },
  gauss: { id: "gauss", name: "Gauss-Jordan", run: (sys) => elimination(sys, "Gauss-Jordan", true) },
  sustitucion: { id: "sustitucion", name: "Sustitución", run: substitution },
  determinante: { id: "determinante", name: "Determinante", run: determinant },
  inversa: { id: "inversa", name: "Matriz inversa", run: inverseMethod }
};

(window as any).METHODS = METHODS;
(window as any).solveSystem = function (sys: Sistema, methodId: MetodoId): ResultadoSistema {
  const method = METHODS[methodId];
  if (!method) throw new Error("Método no disponible");
  return method.run(sys);
};
