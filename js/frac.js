(function (global) {
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function Frac(n, d) {
    if (n instanceof Frac) return n;
    if (typeof n === "string") return Frac.parse(n);
    if (typeof n === "number" && d == null) {
      if (!Number.isFinite(n)) throw new Error("Número no finito");
      if (Number.isInteger(n)) {
        this.n = n;
        this.d = 1;
        return;
      }
      return Frac.fromDecimal(n);
    }
    d = d == null ? 1 : d;
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
      throw new Error("Fracción inválida");
    }
    if (d < 0) {
      n = -n;
      d = -d;
    }
    n = Math.round(n);
    d = Math.round(d);
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }

  Frac.fromDecimal = function (x) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const s = String(x);
    if (s.includes("e") || s.includes("E")) {
      const str = x.toFixed(10).replace(/0+$/, "");
      return Frac.parse((sign < 0 ? "-" : "") + str);
    }
    if (!s.includes(".")) return new Frac(sign * Math.round(x), 1);
    const parts = s.split(".");
    const dec = parts[1] || "";
    const den = Math.pow(10, dec.length);
    const num = sign * (parseInt(parts[0] || "0", 10) * den + parseInt(dec || "0", 10));
    return new Frac(num, den);
  };

  Frac.parse = function (raw) {
    const s = String(raw).replace(/\s+/g, "");
    if (!s) return new Frac(0, 1);
    if (s.includes("/")) {
      const [a, b] = s.split("/");
      return new Frac(Number(a), Number(b));
    }
    if (s.includes(".")) return Frac.fromDecimal(Number(s));
    return new Frac(Number(s), 1);
  };

  Frac.zero = function () {
    return new Frac(0, 1);
  };
  Frac.one = function () {
    return new Frac(1, 1);
  };

  Frac.prototype.clone = function () {
    return new Frac(this.n, this.d);
  };
  Frac.prototype.add = function (o) {
    o = o instanceof Frac ? o : new Frac(o);
    return new Frac(this.n * o.d + o.n * this.d, this.d * o.d);
  };
  Frac.prototype.sub = function (o) {
    o = o instanceof Frac ? o : new Frac(o);
    return new Frac(this.n * o.d - o.n * this.d, this.d * o.d);
  };
  Frac.prototype.mul = function (o) {
    o = o instanceof Frac ? o : new Frac(o);
    return new Frac(this.n * o.n, this.d * o.d);
  };
  Frac.prototype.div = function (o) {
    o = o instanceof Frac ? o : new Frac(o);
    if (o.n === 0) throw new Error("División por cero");
    return new Frac(this.n * o.d, this.d * o.n);
  };
  Frac.prototype.neg = function () {
    return new Frac(-this.n, this.d);
  };
  Frac.prototype.abs = function () {
    return new Frac(Math.abs(this.n), this.d);
  };
  Frac.prototype.eq = function (o) {
    o = o instanceof Frac ? o : new Frac(o);
    return this.n === o.n && this.d === o.d;
  };
  Frac.prototype.isZero = function () {
    return this.n === 0;
  };
  Frac.prototype.toNumber = function () {
    return this.n / this.d;
  };
  Frac.prototype.toString = function () {
    if (this.d === 1) return String(this.n);
    return this.n + "/" + this.d;
  };
  Frac.prototype.pad = function (w) {
    const s = this.toString();
    return s.length >= w ? s : " ".repeat(w - s.length) + s;
  };

  function matrixCopy(M) {
    return M.map((row) => row.map((c) => (c instanceof Frac ? c.clone() : new Frac(c))));
  }

  function fmtRow(row, barAt) {
    const cells = row.map((c) => (c instanceof Frac ? c.toString() : String(c)));
    const w = Math.max(3, ...cells.map((s) => s.length));
    const left = cells.slice(0, barAt).map((s) => s.padStart(w)).join("  ");
    if (barAt != null && barAt < cells.length) {
      const right = cells.slice(barAt).map((s) => s.padStart(w)).join("  ");
      return left + "  |  " + right;
    }
    return left;
  }

  global.Frac = Frac;
  global.matrixCopy = matrixCopy;
  global.fmtRow = fmtRow;
})(window);
