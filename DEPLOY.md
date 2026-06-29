# Deploy na VPS Hostinger (31.97.14.17)

## 1. Empacotar e enviar o código (no Windows, PowerShell)

```powershell
cd C:\Users\ramon
tar --exclude=node_modules --exclude=.next --exclude=dist -czf zapye.tar.gz zapye-food
scp zapye.tar.gz root@31.97.14.17:/opt/
```

## 2. Conectar e instalar Docker (na VPS)

```bash
ssh root@31.97.14.17

# Docker + plugin compose
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version

cd /opt && tar -xzf zapye.tar.gz && cd zapye-food
```

## 3. Configurar variáveis de produção

```bash
cp .env.example .env
nano .env
```

Ajuste no mínimo:

```ini
JWT_SECRET=<gere algo forte>
POSTGRES_PASSWORD=<senha forte>
EVOLUTION_API_KEY=<chave forte>
ANTHROPIC_API_KEY=sk-ant-...        # ou OPENAI + AI_PROVIDER=openai
NEXT_PUBLIC_API_URL=http://31.97.14.17:3333
```

> `DATABASE_URL`, `REDIS_URL` e `EVOLUTION_BASE_URL` já são sobrescritos
> pelo docker-compose com os nomes internos da rede Docker.

## 4. Subir a stack

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api    # confere "ZAPYE API on :3333"
```

## 5. Criar a loja de exemplo (seed) — uma vez

```bash
docker compose exec api npm run seed
```

## 6. Liberar portas (firewall)

```bash
ufw allow 22 && ufw allow 80 && ufw allow 443
ufw allow 3000 && ufw allow 3333 && ufw allow 8080
ufw --force enable
```
Se a VPS usar o firewall do painel Hostinger, libere as mesmas portas lá também.

## 7. Testar

- Web:        http://31.97.14.17:3000/login  (ze@burger.com / zapye123)
- API health: http://31.97.14.17:3333/health
- Evolution:  http://31.97.14.17:8080

## 8. Conectar o WhatsApp (Evolution)

1. Crie a instância na Evolution (nome = o mesmo do registro `WhatsappInstance` no banco).
2. Pareie o QR Code.
3. O webhook global já aponta para `http://api:3333/webhooks/evolution`.

## Atualizar depois

```powershell
# Windows: reempacota e reenvia
tar --exclude=node_modules --exclude=.next --exclude=dist -czf zapye.tar.gz zapye-food
scp zapye.tar.gz root@31.97.14.17:/opt/
```
```bash
# VPS
cd /opt && tar -xzf zapye.tar.gz && cd zapye-food
docker compose up -d --build
```
