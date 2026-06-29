const tabs = [
  { href: "/configuracoes/loja", title: "Dados da loja", desc: "Endereço, Pix, pagamentos, pedido mínimo e mensagens." },
  { href: "/configuracoes/whatsapp", title: "WhatsApp", desc: "Conectar o número e ver o status da conexão." },
  { href: "/configuracoes/ia", title: "IA de atendimento", desc: "Tom de voz, ligar/desligar a IA." },
];

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">Configurações</h1>
      <div className="grid gap-3">
        {tabs.map((t) => (
          <a key={t.href} href={t.href} className="rounded-xl border p-4 hover:bg-white/5"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="font-semibold">{t.title}</div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>{t.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
