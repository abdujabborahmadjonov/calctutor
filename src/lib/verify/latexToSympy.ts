// Converts the LaTeX of a single expression into SymPy syntax for the CAS
// worker. It handles the notation CalcTutor's solutions use (fractions, roots,
// powers, trig, logs, pi, e) and returns undefined for anything else, so an
// unfamiliar construct becomes "Could not verify" instead of a wrong parse.

class Unsupported extends Error {}

const FUNCTIONS: Record<string, string> = {
  sin: "sin",
  cos: "cos",
  tan: "tan",
  sec: "sec",
  csc: "csc",
  cot: "cot",
  arcsin: "asin",
  arccos: "acos",
  arctan: "atan",
  sinh: "sinh",
  cosh: "cosh",
  tanh: "tanh",
  ln: "log",
  log: "log",
  exp: "exp",
};

const INVERSE: Record<string, string> = {
  sin: "asin",
  cos: "acos",
  tan: "atan",
};

const IGNORED = new Set(["left", "right", "displaystyle", "big", "Big"]);
const SPACES = new Set([",", ";", "!", " ", ":", "quad", "qquad"]);

function convertLatex(source: string): string {
  let index = 0;

  const peek = () => source[index];
  const skipSpaces = () => {
    while (peek() === " ") index += 1;
  };

  const readCommandName = () => {
    const start = index;
    while (/[a-zA-Z]/.test(source[index] ?? "")) index += 1;
    if (index === start) index += 1;
    return source.slice(start, index);
  };

  // One argument: a brace group, a command, or a single character.
  const readArgument = (): string => {
    skipSpaces();
    const char = peek();
    if (char === undefined) throw new Unsupported("missing argument");
    if (char === "{") {
      index += 1;
      return readSequence("}");
    }
    if (char === "\\") {
      index += 1;
      return readCommand();
    }
    index += 1;
    if (!/[0-9a-zA-Z.]/.test(char)) throw new Unsupported(char);
    return char;
  };

  // A function argument without brackets, as in \ln x or \sin 3x.
  const readBareArgument = (): string => {
    skipSpaces();
    const char = peek();
    if (char === "(") {
      index += 1;
      return readSequence(")");
    }
    if (char === "{" || char === "\\") return readArgument();
    const start = index;
    while (/[0-9a-zA-Z.]/.test(source[index] ?? "")) index += 1;
    if (index === start) throw new Unsupported("missing function argument");
    let atom = source.slice(start, index);
    if (peek() === "^") {
      index += 1;
      atom += `**(${readArgument()})`;
    }
    return atom;
  };

  const readFunction = (name: string): string => {
    skipSpaces();
    let power: string | undefined;
    let sympyName = FUNCTIONS[name];

    if (peek() === "^") {
      index += 1;
      power = readArgument();
      if (power.replaceAll(" ", "") === "-1" && INVERSE[name]) {
        sympyName = INVERSE[name];
        power = undefined;
      }
    }

    const argument = readBareArgument();
    const call = `${sympyName}(${argument})`;
    return power ? ` ${call}**(${power}) ` : ` ${call} `;
  };

  const readCommand = (): string => {
    const name = readCommandName();

    if (SPACES.has(name)) return " ";
    if (IGNORED.has(name)) {
      skipSpaces();
      const delimiter = peek();
      if (delimiter === "(" || delimiter === ")") return "";
      if (delimiter === "[") {
        index += 1;
        return "(";
      }
      if (delimiter === "]") {
        index += 1;
        return ")";
      }
      if (delimiter === ".") {
        index += 1;
        return "";
      }
      return "";
    }
    if (name === "frac" || name === "dfrac" || name === "tfrac") {
      const numerator = readArgument();
      const denominator = readArgument();
      return `((${numerator})/(${denominator}))`;
    }
    if (name === "sqrt") {
      skipSpaces();
      if (peek() === "[") {
        index += 1;
        const root = readSequence("]");
        return `((${readArgument()})**(1/(${root})))`;
      }
      return ` sqrt(${readArgument()}) `;
    }
    if (name === "pi") return " pi ";
    if (name === "infty") return " oo ";
    if (name === "cdot" || name === "times") return "*";
    if (FUNCTIONS[name]) return readFunction(name);
    throw new Unsupported(`\\${name}`);
  };

  const readSequence = (closing?: string): string => {
    let output = "";

    while (index < source.length) {
      const char = source[index];

      if (char === closing) {
        index += 1;
        return output;
      }

      index += 1;

      if (char === "\\") output += readCommand();
      else if (char === "{") output += `(${readSequence("}")})`;
      else if (char === "(") output += `(${readSequence(")")})`;
      else if (char === "[") output += `(${readSequence("]")})`;
      else if (char === "^") output += `**(${readArgument()})`;
      else if (/[0-9a-zA-Z.+\-*/ ]/.test(char)) output += char;
      else throw new Unsupported(char);
    }

    if (closing) throw new Unsupported(`unclosed ${closing}`);
    return output;
  };

  return readSequence();
}

export function latexToSympy(latex: string): string | undefined {
  const source = latex.replaceAll(/\s+/g, " ").trim();
  if (!source) return undefined;

  try {
    const converted = convertLatex(source).replaceAll(/\s+/g, " ").trim();
    return converted || undefined;
  } catch (error) {
    if (error instanceof Unsupported) return undefined;
    throw error;
  }
}
