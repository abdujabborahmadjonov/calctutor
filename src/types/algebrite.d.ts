declare module "algebrite" {
  const Algebrite: {
    run(script: string): string;
    clearall(): void;
  };
  export default Algebrite;
}
