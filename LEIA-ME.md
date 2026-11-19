# Site Collection 3D — guia de instalação

Site estático (HTML/CSS/JS) + **Supabase** (banco de dados e login). Roda em qualquer plano da Hostinger, sem Node nem PHP.

```
site/                   ← conteúdo que vai para public_html na Hostinger
├── index.html, produtos.html, lojas.html, pedidos.html, calculadora.html, contato.html
├── entrar.html, redefinir-senha.html, conta.html, admin.html
├── privacidade.html, termos.html, cookies.html, 404.html
├── assets/ (css, js, img, fontes)
├── .htaccess, robots.txt, sitemap.xml, site.webmanifest
supabase/               ← NÃO sobe para a Hostinger
├── schema.sql          (banco de dados completo)
└── email-templates/    (e-mails em português)
```

---

## 1. Criar o banco no Supabase (10 min)

1. Crie uma conta em **supabase.com** → **New project** e preencha:
   - **GitHub (optional):** deixe em branco. O banco é criado pelo `schema.sql` no SQL Editor.
   - **Project name:** `Collection3d`.
   - **Database password:** clique em *Generate a password* e guarde num lugar seguro (o site não usa essa senha).
   - **Region:** clique em *Need a specific region?* e escolha **South America (São Paulo)**. Os dados ficam no Brasil, o que é melhor para a LGPD.
   - **Enable Data API:** ✅ marcado (o site usa).
   - **Automatically expose new tables:** ⬜ desmarcado (mais seguro; o `schema.sql` já dá as permissões certas).
   - **Enable automatic RLS:** ✅ marcado (proteção extra).
2. Menu **SQL Editor → New query** → cole todo o conteúdo de `supabase/schema.sql` → **Run**.
3. Menu **Project Settings → API**: copie **Project URL** e a chave **anon / publishable**.
4. Abra `site/assets/js/config.js` e preencha:
   ```js
   supabaseUrl: 'https://SEU-PROJETO.supabase.co',
   supabaseAnonKey: 'cole-a-chave-anon-aqui',
   ```
   > A chave *anon* pode ficar no site, a segurança vem das regras RLS. **Nunca** use a chave `service_role` no site.

## 2. Configurar o login (Authentication)

**Authentication → URL Configuration**
- Site URL: `https://collection3d.com.br`
- Redirect URLs: `https://collection3d.com.br/**`

**Authentication → Sign In / Providers → Email**
- Enable Email provider: ✅ · Confirm email: ✅
- Minimum password length: 8
- Email OTP Length: **6** (se mudar, ajuste `otpLength` no config.js)

**Authentication → Emails → SMTP Settings** (obrigatório!)
O e-mail padrão do Supabase **só entrega para os membros da sua equipe** e envia pouquíssimos e-mails por hora. Configure um SMTP próprio:
- **E-mail da Hostinger** (se o seu plano tiver): crie `contato@collection3d.com.br` no hPanel → host `smtp.hostinger.com`, porta `465`.
- Ou **Brevo** / **Resend** (planos grátis).
- Ou o Gmail `collection3d13@gmail.com` com *senha de app* (host `smtp.gmail.com`, porta `465`). Funciona, mas é o menos recomendado para entregabilidade.

Depois, em **Rate Limits**, ajuste o limite de e-mails por hora se precisar.

**Authentication → Emails → Templates** — cole os arquivos de `supabase/email-templates/`:

| Template no Supabase | Arquivo | Assunto sugerido |
|---|---|---|
| Confirm signup | `confirmar-cadastro.html` | Confirme seu e-mail — Collection 3D |
| Magic Link | `codigo-de-acesso.html` | Seu código de acesso: {{ .Token }} |
| Reset Password | `redefinir-senha.html` | Redefinir sua senha — Collection 3D |
| Change Email Address | `alterar-email.html` | Confirme seu novo e-mail |

> O template **Magic Link** precisa ter `{{ .Token }}`, porque é ele que mostra o código de 6 dígitos do "Entrar com código".

### Login com Google
1. **console.cloud.google.com** → crie um projeto → **APIs e serviços → Tela de consentimento OAuth** (tipo Externo; nome "Collection 3D"; e-mail de suporte; domínio `collection3d.com.br`; links da Política de Privacidade e dos Termos).
2. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**
   - Origens JavaScript: `https://collection3d.com.br`
   - URI de redirecionamento: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
3. Copie Client ID e Secret → Supabase **Authentication → Providers → Google** → ativar e colar.

### Login com Apple
Exige o **Apple Developer Program** (assinatura anual paga). Siga o guia do Supabase: *Login with Apple* (Services ID + chave .p8). Enquanto não tiver, deixe `enableApple: false` no `config.js` e o botão some.

## 3. Seu painel de dono (admin)
Só **você** entra no painel, e sempre com **verificação em 2 etapas (2FA)**. Não existe botão no site para virar admin.

1. Crie a sua conta normalmente no site (Entrar → Criar conta) com `collection3d13@gmail.com`.
2. No **SQL Editor** do Supabase rode:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'collection3d13@gmail.com'
   on conflict do nothing;
   ```
3. Instale o **Google Authenticator** (ou Microsoft Authenticator/Authy) no celular.
4. Acesse `collection3d.com.br/admin.html`. Na primeira vez aparece um **QR code**: leia com o app e digite o código de 6 dígitos. Nas próximas vezes, é só digitar o código do app.
   > O 2FA por app (TOTP) já vem ativo em todo projeto Supabase. Confira em *Authentication → Multi-Factor*.

**Perdeu o celular?** Rode no SQL Editor e cadastre o QR de novo:
```sql
delete from auth.mfa_factors
 where user_id = (select id from auth.users where email = 'collection3d13@gmail.com');
```

### O que o painel faz
| Aba | Para quê |
|---|---|
| **Visão geral** | Visitas de hoje, clientes novos, pedidos aguardando, alertas |
| **Acessos ao site** | Visitas por dia (7/30/90 dias), visitantes diferentes, páginas mais vistas, de onde vêm (Instagram, TikTok…), celular × computador |
| **Clientes** | Lista com filtros e busca. **Ficha** de cada cliente: pedidos, consentimentos, editar nome/WhatsApp, **anotação interna**, **bloquear/desbloquear** (impede login e pedidos), exportar dados, excluir |
| **Pedidos** | Todos os pedidos com código, cliente, WhatsApp e **status** (o cliente vê a mudança) |
| **Produtos** | Criar, editar, esconder/mostrar, excluir, foto (otimizada automaticamente), preço, selo, destaque, links Shopee/TikTok |
| **Banners** | Banners da página inicial com **foto**, título, texto, botão, cor de fundo e ordem. Sem banner cadastrado, aparecem os 4 padrão |
| **Configurações** | Trocar os links das lojas e o link de venda da calculadora, **barra de aviso** no topo do site, ver os admins e o status do 2FA |
| **Lista calculadora** | E-mails para avisar no lançamento |
| **Solicitações LGPD** | Pedidos dos clientes com prazo de 15 dias |
| **Consentimentos** | Prova de quem aceitou o quê |
| **Histórico** | Tudo que foi alterado no painel, por quem e quando (não pode ser apagado) |

Tudo exporta em CSV (abre no Excel). As tabelas também ficam no Supabase em **Table Editor**.

**Dica de divulgação:** coloque `?utm_source=` nos links que você posta, por exemplo `https://collection3d.com.br/?utm_source=instagram-bio` ou `?utm_source=meme-bob`. Em *Acessos → De onde vêm* você vê qual post trouxe mais gente.

> Estatística de visitas: pela LGPD, só conta quem aceitou cookies de *Estatísticas*. É feita pelo próprio site (sem Google Analytics) e não guarda IP, nome nem e-mail.

## 4. Publicar na Hostinger
1. hPanel → **Sites → collection3d.com.br → Gerenciador de arquivos** → pasta `public_html`.
2. Apague o `default.php`/`index.php` de exemplo, se existir.
3. Envie **todo o conteúdo da pasta `site/`** para dentro de `public_html` (dica: compacte a pasta `site/` num .zip, envie e use "Extrair").
   > O `.htaccess` começa com ponto; se não aparecer, ative "mostrar arquivos ocultos".
4. hPanel → **Segurança → SSL**: ative o SSL gratuito (o `.htaccess` já força HTTPS).
5. Acesse `https://collection3d.com.br` e teste: cadastro, e-mail de confirmação, código por e-mail, esqueci a senha, Google.

## 5. Ajustes rápidos (tudo em `assets/js/config.js`)
- **Link da Shopee**: troque no **Painel → Configurações** (ou em `shopeeUrl`). Pegue o link no app Shopee → Minha loja → Compartilhar.
- **CNPJ / razão social / cidade**: preencha `razaoSocial`, `cnpj` e `cidadeUf`. Aparecem no rodapé e nas políticas.
- **Calculadora**: quando lançar, cole o link da Hotmart/Kiwify/etc. em **Painel → Configurações** e o botão "Comprar agora" é ativado sozinho.
- **Mudou os termos?** Altere o texto, atualize a data nas páginas e troque `termsVersion`. Todos os usuários vão aceitar a nova versão no próximo acesso.

## 6. Produtos
Cadastre pelo **Painel admin → Produtos → Novo produto** (nome, categoria, preço opcional, foto, links da Shopee/TikTok, destaque). A foto é otimizada automaticamente.
Os 9 produtos de exemplo do `schema.sql` podem ser editados ou apagados.

## 7. LGPD: o que já está pronto
- Aviso de cookies com **Aceitar / Rejeitar / Personalizar**, botões com o mesmo destaque, registro da escolha, renovação a cada 6 meses e link "Preferências de cookies" no rodapé.
- Nenhum script de terceiros: fontes e ícones ficam no próprio site, sem Google Fonts nem CDN.
- Cadastro com aceite **ativo** (caixas desmarcadas) de Termos e Política, declaração de idade e marketing **opcional e separado**.
- Quem entra com Google, Apple ou código precisa aceitar os termos antes de usar a conta.
- Registro de consentimentos com data e versão (tabela `consent_logs`).
- Área **Minha conta → Privacidade e dados**: baixar os dados (JSON), mudar permissões, solicitar direitos do art. 18 e **excluir a conta**.
- Painel de solicitações LGPD com prazo de 15 dias.
- RLS no banco: cada usuário só vê os próprios dados.
- Coleta mínima: sem CPF, endereço ou data de nascimento.
- Política de Privacidade, Termos de Uso e Política de Cookies completos em português.

**Pendências suas:**
- Preencher CNPJ e razão social no `config.js`.
- Configurar o SMTP (sem ele, os clientes não recebem e-mail).
- Se adicionar Google Analytics ou Pixel no futuro, carregue só depois do consentimento (evento `c3d:consent`, `window.c3dConsent.analytics`), liste na Política de Cookies e libere o domínio no CSP do `.htaccess`.
- Opcional: agende a limpeza automática (`lgpd_cleanup`) com pg_cron (instruções no final do `schema.sql`).
- Os textos legais são um modelo sólido, mas vale uma revisão por um advogado.

## 8. Opcional / próximos passos
- **CAPTCHA** contra robôs: Supabase → Authentication → Attack Protection (hCaptcha ou Turnstile).
- Fotos reais dos produtos (fundo claro, produto de frente, fosco).

## Modelos 3D (STL / 3MF)
Página **collection3d.com.br/modelos.html**, cadastrada pelo **Painel do dono → Modelos 3D**.

1. Uma vez só: Supabase → **SQL Editor** → **New query** → cole todo o `supabase/modelos-3d.sql` → **Run**.
2. **Grátis:** suba o arquivo (ou uma pasta com STL + 3MF) no Google Drive → botão direito → Compartilhar → Acesso geral: **Qualquer pessoa com o link** → Copiar link → cole em "Link de download". O painel mostra quantos downloads cada um teve (sem guardar quem baixou).
3. **Pagos:** crie o produto na plataforma (Kiwify, Hotmart, Cults3D...) com o arquivo anexado e cole o link de compra. O arquivo pago **nunca** vai no site: quem entrega é a plataforma, depois do pagamento.
4. Licença por modelo: "Uso pessoal" ou "Venda das peças liberada". Revender o arquivo é sempre proibido (Termos, seção 8).
