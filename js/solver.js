/* Motor matemático en TypeScript. Se compila a js/solver.js para el navegador. */
const f = (n, d) => new Frac(n, d);
const clone = (v) => v.clone();
const divLatex = (a, b) => `\\frac{${a}}{${b}}`;
function det2(a, b, c, d) { return a.mul(d).sub(b.mul(c)); }
function det3(M) {
    return M[0][0].mul(det2(M[1][1], M[1][2], M[2][1], M[2][2]))
        .sub(M[0][1].mul(det2(M[1][0], M[1][2], M[2][0], M[2][2])))
        .add(M[0][2].mul(det2(M[1][0], M[1][1], M[2][0], M[2][1])));
}
function coef(v, variable, first = false) {
    if (v.isZero())
        return "";
    const sign = v.n < 0 ? "−" : (first ? "" : "+");
    const abs = v.abs().toString();
    return `${sign}${abs === "1" ? "" : abs}${variable}`;
}
function equation(row, b, vars) {
    const terms = [];
    row.forEach((value, i) => { const term = coef(value, vars[i], terms.length === 0); if (term)
        terms.push(term); });
    return `${terms.length ? terms.join("") : "0"}=${b.toString()}`;
}
function systemMarkdown(A, b, vars) {
    return `$$\\system{${A.map((row, i) => equation(row, b[i], vars)).join("\\\\")}}$$`;
}
function matrixMarkdown(M) {
    return `$$\\matrix{${M.map(row => row.map(x => x.toString()).join(" & ")).join("\\\\")}}$$`;
}
function decimalString(v) {
    const n = v.toNumber();
    if (!Number.isFinite(n) || v.d === 1)
        return "";
    return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}
function valueWithDecimal(v) {
    const decimal = decimalString(v);
    return `${v.toString()}${decimal ? `≈${decimal}` : ""}`;
}
function boxedSolution(sol, vars) {
    return `$$\\boxed{${sol.map((v, i) => `${vars[i]}=${valueWithDecimal(v)}`).join("\\\\")}}$$`;
}
function classify(A, b) {
    const M = A.map((row, i) => row.map(clone).concat([clone(b[i])]));
    let row = 0;
    for (let col = 0; col < M[0].length - 1 && row < M.length; col++) {
        let pivot = row;
        for (let r = row + 1; r < M.length; r++)
            if (M[r][col].abs().toNumber() > M[pivot][col].abs().toNumber())
                pivot = r;
        if (M[pivot][col].isZero())
            continue;
        [M[row], M[pivot]] = [M[pivot], M[row]];
        const pv = M[row][col];
        for (let j = col; j < M[0].length; j++)
            M[row][j] = M[row][j].div(pv);
        for (let r = 0; r < M.length; r++)
            if (r !== row) {
                const factor = M[r][col];
                if (!factor.isZero())
                    for (let j = col; j < M[0].length; j++)
                        M[r][j] = M[r][j].sub(factor.mul(M[row][j]));
            }
        row++;
    }
    const rankA = M.filter(r => r.slice(0, A.length).some(v => !v.isZero())).length;
    const rankAb = M.filter(r => r.some(v => !v.isZero())).length;
    if (rankA < rankAb)
        return "incompatible";
    if (rankA < A.length)
        return "infinitas";
    return "unica";
}
function rowOperation(target, factor, pivot) {
    const sign = factor.n < 0 ? "+" : "−";
    return `F_${target + 1} ${sign} ${factor.abs().toString()}F_${pivot + 1}`;
}
function elimination(sys, name, reduced) {
    const A = matrixCopy(sys.A), b = sys.b.map(clone), n = sys.size;
    const steps = [{ titulo: "Paso 1", markdown: systemMarkdown(A, b, sys.vars) }];
    let step = 2;
    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++)
            if (A[r][col].abs().toNumber() > A[pivot][col].abs().toNumber())
                pivot = r;
        if (A[pivot][col].isZero()) {
            const kind = classify(sys.A, sys.b), label = kind === "incompatible" ? "Sin solución" : "Infinitas soluciones";
            steps.push({ titulo: "Resultado", markdown: `$$\\boxed{${label}}$$` });
            return { steps, ok: false, kind };
        }
        if (pivot !== col) {
            [A[col], A[pivot]] = [A[pivot], A[col]];
            [b[col], b[pivot]] = [b[pivot], b[col]];
            steps.push({ titulo: `Paso ${step++}`, markdown: `$$F_${col + 1}\\leftrightarrow F_${pivot + 1}$$\n\n${systemMarkdown(A, b, sys.vars)}` });
        }
        const pv = A[col][col];
        if (!pv.eq(f(1))) {
            const before = equation(A[col], b[col], sys.vars);
            const afterRow = A[col].map((x) => x.div(pv)), afterB = b[col].div(pv);
            steps.push({ titulo: `Paso ${step++}`, markdown: `$$F_${col + 1}\\div ${pv.toString()}$$\n\n$$(${before})÷${pv.toString()}=${equation(afterRow, afterB, sys.vars)}$$` });
            A[col] = afterRow;
            b[col] = afterB;
            steps.push({ titulo: `Paso ${step++}`, markdown: systemMarkdown(A, b, sys.vars) });
        }
        const targets = [];
        if (reduced) {
            for (let r = 0; r < n; r++)
                if (r !== col)
                    targets.push(r);
        }
        else {
            for (let r = col + 1; r < n; r++)
                targets.push(r);
        }
        for (const r of targets) {
            const factor = A[r][col];
            if (factor.isZero())
                continue;
            const oldEquation = equation(A[r], b[r], sys.vars);
            const pivotEquation = equation(A[col], b[col], sys.vars);
            const newRow = A[r].map((x, j) => x.sub(factor.mul(A[col][j])));
            const newB = b[r].sub(factor.mul(b[col]));
            const operation = rowOperation(r, factor, col);
            steps.push({ titulo: `Paso ${step++}`, markdown: `$$${operation}$$\n\n$$(${oldEquation})${factor.n < 0 ? "+" : "−"}${factor.abs().toString()}(${pivotEquation})=${equation(newRow, newB, sys.vars)}$$` });
            A[r] = newRow;
            b[r] = newB;
            steps.push({ titulo: `Paso ${step++}`, markdown: systemMarkdown(A, b, sys.vars) });
        }
    }
    if (!reduced) {
        const sol = Array(n);
        for (let i = n - 1; i >= 0; i--) {
            let rhs = b[i];
            const substitutions = [];
            for (let j = i + 1; j < n; j++) {
                rhs = rhs.sub(A[i][j].mul(sol[j]));
                substitutions.push(`${A[i][j].toString()}(${sol[j].toString()})`);
            }
            const denominator = A[i][i], value = rhs.div(denominator);
            const original = equation(A[i], b[i], sys.vars);
            const rhsText = substitutions.length ? `${b[i].toString()}−${substitutions.join("−")}` : b[i].toString();
            steps.push({ titulo: `Paso ${step++}`, markdown: `$$${original}$$\n\n$$${sys.vars[i]}=${divLatex(rhsText, denominator.toString())}=${valueWithDecimal(value)}$$` });
            sol[i] = value;
        }
        steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
        return { steps, ok: true, kind: "unica", sol };
    }
    const sol = b.map(clone);
    steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
    return { steps, ok: true, kind: "unica", sol };
}
function substitution(sys) {
    if (sys.size !== 2)
        return elimination(sys, "Sustitución", false);
    const A = matrixCopy(sys.A), b = sys.b.map(clone), vars = sys.vars;
    const steps = [{ titulo: "Paso 1", markdown: systemMarkdown(A, b, vars) }];
    let source = A[0][0].isZero() ? 1 : 0;
    if (A[source][0].isZero())
        return elimination(sys, "Sustitución", false);
    const other = 1 - source;
    const a = A[source][0], c = A[source][1], d = b[source], a2 = A[other][0], c2 = A[other][1], d2 = b[other];
    const sourceEq = equation(A[source], b[source], vars);
    const numerator = `${d.toString()}−(${c.toString()})${vars[1]}`;
    steps.push({ titulo: "Paso 2", markdown: `$$${sourceEq}$$\n\n$$${a.toString()}${vars[0]}=${d.toString()}−${c.toString()}${vars[1]}$$\n\n$$${vars[0]}=${divLatex(numerator, a.toString())}$$` });
    const denominator = c2.mul(a).sub(a2.mul(c));
    if (denominator.isZero()) {
        const kind = classify(sys.A, sys.b);
        steps.push({ titulo: "Resultado", markdown: `$$\\boxed{${kind === "incompatible" ? "Sin solución" : "Infinitas soluciones"}}$$` });
        return { steps, ok: false, kind };
    }
    const yNumerator = d2.mul(a).sub(a2.mul(d));
    const y = yNumerator.div(denominator);
    const otherEq = equation(A[other], b[other], vars);
    steps.push({ titulo: "Paso 3", markdown: `$$${otherEq}$$\n\n$$${a2.toString()}(${divLatex(numerator, a.toString())})+${c2.toString()}${vars[1]}=${d2.toString()}$$` });
    steps.push({ titulo: "Paso 4", markdown: `$$${vars[1]}=${divLatex(yNumerator.toString(), denominator.toString())}=${valueWithDecimal(y)}$$` });
    const xNumerator = d.sub(c.mul(y)), x = xNumerator.div(a);
    steps.push({ titulo: "Paso 5", markdown: `$$${vars[0]}=${divLatex(`${d.toString()}−(${c.toString()})(${y.toString()})`, a.toString())}=${valueWithDecimal(x)}$$` });
    const sol = [x, y];
    steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, vars) });
    return { steps, ok: true, kind: "unica", sol };
}
function determinant(sys) {
    const A = matrixCopy(sys.A);
    const steps = [{ titulo: "Paso 1", markdown: systemMarkdown(A, sys.b, sys.vars) }];
    const D = sys.size === 2 ? det2(A[0][0], A[0][1], A[1][0], A[1][1]) : det3(A);
    if (sys.size === 2)
        steps.push({ titulo: "Paso 2", markdown: `$$D=(${A[0][0]})(${A[1][1]})−(${A[0][1]})(${A[1][0]})=${D.toString()}$$` });
    else
        steps.push({ titulo: "Paso 2", markdown: `$$D=${D.toString()}$$` });
    if (D.isZero()) {
        const kind = classify(sys.A, sys.b);
        steps.push({ titulo: "Resultado", markdown: `$$\\boxed{${kind === "incompatible" ? "Sin solución" : "Infinitas soluciones"}}$$` });
        return { steps, ok: false, kind };
    }
    const sol = [];
    sys.vars.forEach((variable, col) => {
        const Aj = matrixCopy(A);
        for (let row = 0; row < sys.size; row++)
            Aj[row][col] = clone(sys.b[row]);
        steps.push({ titulo: `Paso ${steps.length + 1}`, markdown: `$$D_${variable}$$\n\n${matrixMarkdown(Aj)}` });
        const Dj = sys.size === 2 ? det2(Aj[0][0], Aj[0][1], Aj[1][0], Aj[1][1]) : det3(Aj);
        if (sys.size === 2)
            steps.push({ titulo: `Paso ${steps.length + 1}`, markdown: `$$D_${variable}=(${Aj[0][0]})(${Aj[1][1]})−(${Aj[0][1]})(${Aj[1][0]})=${Dj.toString()}$$` });
        else
            steps.push({ titulo: `Paso ${steps.length + 1}`, markdown: `$$D_${variable}=${Dj.toString()}$$` });
        const value = Dj.div(D);
        sol.push(value);
        steps.push({ titulo: `Paso ${steps.length + 1}`, markdown: `$$${variable}=${divLatex(`D_${variable}`, "D")}=${divLatex(Dj.toString(), D.toString())}=${valueWithDecimal(value)}$$` });
    });
    steps.push({ titulo: "Resultado", markdown: boxedSolution(sol, sys.vars) });
    return { steps, ok: true, kind: "unica", sol };
}
function inverseMethod(sys) { return elimination(sys, "Matriz inversa", true); }
const METHODS = {
    adicion: { id: "adicion", name: "Adición", run: (sys) => elimination(sys, "Adición", false) },
    gauss: { id: "gauss", name: "Gauss-Jordan", run: (sys) => elimination(sys, "Gauss-Jordan", true) },
    sustitucion: { id: "sustitucion", name: "Sustitución", run: substitution },
    determinante: { id: "determinante", name: "Determinante", run: determinant },
    inversa: { id: "inversa", name: "Matriz inversa", run: inverseMethod }
};
window.METHODS = METHODS;
window.solveSystem = function (sys, methodId) { const method = METHODS[methodId]; if (!method)
    throw new Error("Método no disponible"); return method.run(sys); };
