const tabs = [
  { href: "/configuracoes/loja", title: "Dados da loja", desc: "Endereco, Pix, pagamentos, pedido minimo e mensagens.", stamp: "geral" },
  { href: "/configuracoes/whatsapp", title: "WhatsApp", desc: "Conectar o numero e ver o status da conexao.", stamp: "qr" },
  { href: "/configuracoes/ia", title: "IA de atendimento", desc: "Tom de voz, ligar/desligar a IA.", stamp: "bot" },
];

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="page-title text-3xl">Configuracoes</h1>
      <p className="page-intro mb-5 text-sm">Fichas de ajuste do restaurante.</p>
      <div className="grid gap-3">
        {tabs.map((t) => (
          <a key={t.href} href={t.href} className="receipt-card block p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="page-title text-xl">{t.title}</div>
                <div className="text-sm muted-ink">{t.desc}</div>
              </div>
              <span className="stamp stamp-blue">{t.stamp}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
