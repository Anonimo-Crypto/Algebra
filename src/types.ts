/** Tipos compartidos del dominio matemático. */
type AlgebraFraccion = any;

type AlgebraMetodoId = "adicion" | "gauss" | "sustitucion" | "determinante" | "inversa";

interface AlgebraPaso {
  titulo: string;
  markdown: string;
}

interface AlgebraResultado {
  steps: AlgebraPaso[];
  ok: boolean;
  kind: "unica" | "incompatible" | "infinitas";
  sol?: AlgebraFraccion[];
}

interface AlgebraSistema {
  size: 2 | 3;
  vars: string[];
  A: AlgebraFraccion[][];
  b: AlgebraFraccion[];
}
