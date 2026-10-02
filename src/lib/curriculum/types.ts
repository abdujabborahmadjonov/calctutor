export type Unit = "calc1" | "calc2";

export type Topic = {
  id: string;
  name: string;
  unit: Unit;
  methods: string[];
  typicalProblems: string[];
};

export type Notation = {
  inverseTrig: "arcsin" | "sin^{-1}";
  log: "ln";
  intervals: "interval" | "inequality";
  rationalizeDenominators: boolean;
};

export type Course = {
  id: string;
  institution: string;
  code: string;
  name: string;
  level: Unit | "both";
  topicOrder: string[];
  notation: Notation;
  notes: string;
};
