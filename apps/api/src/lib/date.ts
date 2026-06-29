// Data de "hoje" no fuso de São Paulo, formato YYYY-MM-DD.
// Usada pelo cardápio do dia: item diário só aparece se availableDate === hoje.
export function todaySP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
