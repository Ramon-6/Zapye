const colors = [
  ["Fundo kraft", "#F5E6D3"],
  ["Comanda", "#FDF8F0"],
  ["Borda", "#D4C4A8"],
  ["Tinta", "#2D2418"],
  ["Tinta desbotada", "#8B7355"],
  ["Limao", "#84CC16"],
  ["Limao escuro", "#65A30D"],
  ["Selo vermelho", "#DC2626"],
  ["Selo amarelo", "#D97706"],
  ["Carimbo azul", "#2563EB"],
];

export default function StyleGuidePage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="page-title text-4xl">Guia visual ZAPYE Food</h1>
        <p className="page-intro text-sm">Sistema visual food app: claro, apetitoso, arredondado e pronto para venda mobile.</p>
      </div>

      <section className="receipt-card mb-6 p-5">
        <h2 className="page-title mb-4 text-2xl">Cores exatas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {colors.map(([label, hex]) => (
            <div key={hex} className="ticket-card p-3">
              <div className="mb-3 h-16 rounded-md border" style={{ background: hex, borderColor: "var(--border)" }} />
              <div className="text-sm font-black">{label}</div>
              <div className="mono-value text-xs">{hex}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="receipt-card p-5">
          <h2 className="page-title mb-4 text-2xl">Tipografia</h2>
          <div className="brand-wordmark text-5xl">ZAPYE <span className="brand-food">Food</span></div>
          <p className="mt-4 text-sm">Port Lligat Sans como tipografia principal da marca e da interface.</p>
          <p className="mono-value mt-2 text-2xl">R$ 57,80 - #1027</p>
          <p className="mt-2 text-xs muted-ink">A mesma familia tambem cobre precos, totais e numeros para manter unidade visual.</p>
        </div>

        <div className="receipt-card p-5">
          <h2 className="page-title mb-4 text-2xl">Fundos e superficies</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="ticket-card h-28 p-3">card branco</div>
            <div className="ticket-card h-28 p-3" style={{ background: "var(--accent-soft)" }}>accent soft</div>
            <div className="food-thumb h-28 p-3 text-white">food image</div>
          </div>
        </div>
      </section>

      <section className="receipt-card my-6 p-5">
        <h2 className="page-title mb-4 text-2xl">Componentes</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="ticket-card p-4">
            <div className="text-xs font-bold uppercase muted-ink">KPI Ticket</div>
            <div className="mono-value mt-2 text-3xl">R$ 1.256,00</div>
            <div className="receipt-divider mt-3 pt-3 text-xs muted-ink">Sombra macia de app premium.</div>
          </div>
          <div className="order-ticket p-4">
            <div className="receipt-header mb-3 flex justify-between pb-2">
              <b>#1025</b><span className="price">R$ 68,00</span>
            </div>
            <p className="text-sm"><b>2x</b> X-Burger Classico</p>
            <p className="text-sm"><b>1x</b> Coca-Cola Lata</p>
            <span className="stamp stamp-yellow mt-3">em preparo</span>
          </div>
          <div className="ticket-card p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="stamp stamp-blue">novo</span>
              <span className="stamp stamp-yellow">pendente</span>
              <span className="stamp stamp-green">pronto</span>
              <span className="stamp stamp-red">cancelado</span>
            </div>
            <button className="stamp-button mr-2 px-4 py-2 text-sm">Acao principal</button>
            <button className="secondary-button px-4 py-2 text-sm">Secundario</button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="receipt-card p-5">
          <h2 className="page-title text-xl">Estado vazio</h2>
          <p className="mt-3 text-sm muted-ink">Nenhuma comanda presa aqui.</p>
        </div>
        <div className="receipt-card p-5">
          <h2 className="page-title text-xl">Loading</h2>
          <p className="mt-3 text-sm muted-ink">Carregando a comanda do dia...</p>
        </div>
        <div className="receipt-card p-5">
          <h2 className="page-title text-xl">Sucesso / erro</h2>
          <div className="mt-3 flex gap-2">
            <span className="stamp stamp-green">salvo</span>
            <span className="stamp stamp-red">erro</span>
          </div>
        </div>
      </section>
    </div>
  );
}
