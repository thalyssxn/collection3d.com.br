// =====================================================================
//  CONFIGURAÇÃO DO SITE — edite só este arquivo para trocar links e dados.
// =====================================================================
export const CONFIG = {
  siteName: 'Collection 3D',
  siteUrl: 'https://collection3d.com.br',

  // --- Supabase (banco de dados + login) -------------------------------
  // Supabase > Project Settings > API: copie "Project URL" e a chave
  // "anon / publishable". Essa chave é pública por natureza (a segurança
  // vem das regras RLS do schema.sql). NUNCA coloque aqui a "service_role".
  supabaseUrl: 'https://jeemudvwzqsongkpomet.supabase.co',
  supabaseAnonKey: 'sb_publishable_Rxcu9qPMA546lV9KUOgCAw_X0ZBW1Eh',

  // Login social: deixe true só depois de configurar no Supabase.
  enableGoogle: true,        // login com Google ativo
  enableApple: false,       // exige conta Apple Developer (paga)
  otpLength: 6,             // tamanho do código enviado por e-mail

  // --- Contato ---------------------------------------------------------
  whatsapp: '5515997670544',             // DDI + DDD + número, só dígitos
  whatsappDisplay: '(15) 99767-0544',
  email: 'collection3d13@gmail.com',

  // --- Lojas e redes ---------------------------------------------------
  instagramHandle: '@collection_3d_',
  instagramUrl: 'https://www.instagram.com/collection_3d_/',
  tiktokHandle: '@collection_3d',
  tiktokUrl: 'https://www.tiktok.com/@collection_3d',
  // TODO: cole aqui o link da sua loja na Shopee
  // (App Shopee > Minha loja > Compartilhar > Copiar link)
  shopeeUrl: 'https://shopee.com.br/thalyssxn',

  // Números mostrados no site (atualize quando quiser)
  shopeeRating: '4,9',
  shopeeReviews: '+110',

  // --- Calculadora de Marketplace (aba futura) --------------------------
  // Quando lançar, coloque o link da plataforma de venda (Hotmart, Kiwify...)
  calculatorSalesUrl: '',
  calculatorLaunchText: 'Em breve',

  // --- Dados legais (LGPD / rodapé) -----------------------------------
  // Preencha com os dados do seu MEI. Se ficar vazio, não aparece no site.
  razaoSocial: '64.549.954 THALYSSON SERGIO FERNANDES SOARES',          // ex.: '12.345.678 THALYSSON ...'
  cnpj: '64.549.954/0001-30',                 // ex.: '12.345.678/0001-90'
  cidadeUf: '',             // ex.: 'São Miguel Arcanjo/SP'

  // Versão dos Termos/Política. Mude a data quando alterar os textos:
  // quem já tinha aceitado verá o pedido de aceite de novo.
  termsVersion: '2026-11-16',
};

export const isSupabaseConfigured = () =>
  /^https:\/\/.+/.test(CONFIG.supabaseUrl) && CONFIG.supabaseAnonKey.length > 20;
