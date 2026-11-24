-- =====================================================================
-- Collection 3D — produtos do TikTok Shop (30 produtos, com fotos e variações)
-- Como usar: Supabase › SQL Editor › New query › cole TUDO › Run.
-- Pode rodar mais de uma vez: atualiza os mesmos produtos, não duplica nada
-- e não apaga nenhum produto.
-- =====================================================================

-- 1) Campos novos: galeria de fotos, variações (cor, modelo, kit...) e preço máximo
alter table public.products add column if not exists images     text[] not null default '{}';
alter table public.products add column if not exists variations jsonb;
alter table public.products add column if not exists price_max  numeric(10,2);

alter table public.products drop constraint if exists products_images_max;
alter table public.products add  constraint products_images_max check (cardinality(images) <= 24);
alter table public.products drop constraint if exists products_variations_ok;
alter table public.products add  constraint products_variations_ok check (
  variations is null or (jsonb_typeof(variations) = 'object' and pg_column_size(variations) < 60000));
alter table public.products drop constraint if exists products_price_max_ok;
alter table public.products add  constraint products_price_max_ok check (price_max is null or price_max >= 0);

-- 2) O exemplo "Urso Polar" vira o produto real "Urso e Rena" (mantém o mesmo registro)
update public.products set slug = 'enfeite-natal-urso-e-rena'
 where slug = 'enfeite-natal-urso'
   and not exists (select 1 from public.products where slug = 'enfeite-natal-urso-e-rena');

-- 3) Os produtos
insert into public.products
  (slug, name, description, category, price, price_max, image_url, images, variations, badge, tiktok_url, featured, active, sort_order)
values
  ('chaveiro-arrogante', 'Chaveiro Neymar Jr Arrogante', 'Leve o meme mais icônico do Neymar Jr Arrogante para suas chaves, mochila ou coleção! O Chaveiro Neymar Jr Arrogante é perfeito para fãs de futebol, colecionadores e amantes dos memes que marcaram a internet.
Fabricado em material resistente e com excelente acabamento, ele é leve, durável e ideal para o uso diário. Além de ser um ótimo acessório, também é uma excelente opção de presente criativo para amigos e familiares.

## Especificações do produto
Altura: 7 cm
Largura: 6 cm
Espessura: 3,3 mm
Material resistente e durável
Ideal para chaves, mochilas, estojos e decoração
Ótima opção para colecionadores e fãs do Neymar Jr e do meme "Arrogante"
Adicione um toque de humor e personalidade ao seu dia a dia com este chaveiro exclusivo e divertido!', 'chaveiros', 24.90, 59.90, '/assets/img/produtos/chaveiro-arrogante/capa.webp', array['/assets/img/produtos/chaveiro-arrogante/01.webp', '/assets/img/produtos/chaveiro-arrogante/02.webp', '/assets/img/produtos/chaveiro-arrogante/03.webp', '/assets/img/produtos/chaveiro-arrogante/04.webp', '/assets/img/produtos/chaveiro-arrogante/05.webp', '/assets/img/produtos/chaveiro-arrogante/06.webp', '/assets/img/produtos/chaveiro-arrogante/07.webp', '/assets/img/produtos/chaveiro-arrogante/08.webp', '/assets/img/produtos/chaveiro-arrogante/09.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Arrogante","valores":["Arrogante"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-arrogante/01.webp","esgotado":false},{"nome":"Naverdathi","valores":["Naverdathi"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-arrogante/08.webp","esgotado":false},{"nome":"Arrogante + Naverdathi","valores":["Arrogante + Naverdathi"],"preco":39.9,"imagem":"/assets/img/produtos/chaveiro-arrogante/07.webp","esgotado":false},{"nome":"Kit Arrogância","valores":["Kit Arrogância"],"preco":54.9,"imagem":"/assets/img/produtos/chaveiro-arrogante/02.webp","esgotado":false},{"nome":"Miniatura + Arrogante + BolaMavie","valores":["Miniatura + Arrogante + BolaMavie"],"preco":59.9,"imagem":"/assets/img/produtos/chaveiro-arrogante/09.webp","esgotado":false},{"nome":"Apenas Miniatura","valores":["Apenas Miniatura"],"preco":54.9,"imagem":"/assets/img/produtos/chaveiro-arrogante/v06.webp","esgotado":false}]}'::jsonb, 'Collab', 'https://shop.tiktok.com/view/product/1737538799542764673?region=BR&locale=pt-BR', true, true, 10),
  ('chaveiro-bob', 'Chaveiro Bob Ovudo e Covarde', 'Chaveiro do Bob Ovudo e Covarde, o cachorro mais Ovudo e Covarde da internet! Arte exclusiva e colorida, inspirada no meme, perfeita para quem curte humor e quer deixar as chaves, a mochila ou a bolsa com mais personalidade.

## Características
• Tamanho: 6 x 6 cm (sem a argola)
• Espessura: 2 mm
• Leve e resistente
• Arte exclusiva multicolorida
• Argola e corrente de metal inclusas

## O que vem na embalagem
• 1 chaveiro Bob Ovudo e Covarde com argola e corrente
Ótimo presente para aquele amigo que também é ovudo e covarde.', 'chaveiros', 24.90, 24.90, '/assets/img/produtos/chaveiro-bob/capa.webp', array['/assets/img/produtos/chaveiro-bob/01.webp', '/assets/img/produtos/chaveiro-bob/02.webp', '/assets/img/produtos/chaveiro-bob/03.webp', '/assets/img/produtos/chaveiro-bob/04.webp', '/assets/img/produtos/chaveiro-bob/05.webp']::text[], null, null, 'https://shop.tiktok.com/view/product/1738103052300616833?region=BR&locale=pt-BR', false, true, 20),
  ('chaveiro-ryu-the-runner', 'Chaveiro Boneco Ryu The Runner', 'A miniatura colecionável do Ryu, The Runner baseado no Album Adulto Ideal traz todos os detalhes marcantes do artista, perfeito para decorar seu estúdio, mesa de trabalho, prateleira ou setup gamer, sendo o presente ideal para fãs da cultura do trap e colecionadores.

## Destaques do Produto

## Design Exclusivo
Item de Decoração Versátil: Combina perfeitamente com ambientes modernos, estúdios de música e setups.
Excelente Acabamento: Produzido com atenção aos mínimos detalhes estéticos do artista.

## Especificações Técnicas Chaveiro
Produto: Miniatura Chaveiro Ryu The Runner
Material: Plástico
Altura: 8,5 cm
Largura: 4,5 cm
Espessura: 4 cm

## Especificações Técnicas Miniatura Boneco
Produto: Miniatura Boneco Ryu The Runner
Material: Plástico
Altura: 11,5 cm
Largura: 6,5 cm
Espessura: 5,5 cm
• Atente-se as variações na hora da escolha.
Nota: As dimensões e pesos são aproximados. Item destina-se prioritariamente para fins decorativos e colecionáveis.
Por se tratar de um item produzido via fabricação aditiva , a peça apresenta linhas de camada e detalhes pontuais de textura que são característicos dessa tecnologia. Isso garante que cada miniatura seja única e exclusiva, com identidade própria!', 'chaveiros', 36.90, 89.90, '/assets/img/produtos/chaveiro-ryu-the-runner/capa.webp', array['/assets/img/produtos/chaveiro-ryu-the-runner/01.webp', '/assets/img/produtos/chaveiro-ryu-the-runner/02.webp', '/assets/img/produtos/chaveiro-ryu-the-runner/03.webp', '/assets/img/produtos/chaveiro-ryu-the-runner/04.webp', '/assets/img/produtos/chaveiro-ryu-the-runner/05.webp', '/assets/img/produtos/chaveiro-ryu-the-runner/06.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Chaveiro Boneco Ryu The Runner (8,5cm)","valores":["Chaveiro Boneco Ryu The Runner (8,5cm)"],"preco":36.9,"imagem":"/assets/img/produtos/chaveiro-ryu-the-runner/v01.webp","esgotado":false},{"nome":"Boneco Ryu The Runner (11,5cm)","valores":["Boneco Ryu The Runner (11,5cm)"],"preco":52.9,"imagem":"/assets/img/produtos/chaveiro-ryu-the-runner/v02.webp","esgotado":false},{"nome":"Chaveiro + Boneco","valores":["Chaveiro + Boneco"],"preco":89.9,"imagem":"/assets/img/produtos/chaveiro-ryu-the-runner/06.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1737341333189330049?region=BR&locale=pt-BR', false, true, 30),
  ('chaveiro-trap-premium', 'Chaveiro Trap Premium (Xtranho, Brandão85 e mais)', 'O Chaveiro Xtranho Matuê Trap Brandão Premium Inspirado na identidade visual e na cultura do trap nacional, o chaveiro combina um design marcante com uma estética moderna, sendo uma ótima escolha para quem acompanha artistas, músicas e a cena que ajudou a popularizar o trap no Brasil. É um acessório que vai além das chaves: representa estilo, música e a cultura urbana.

## Especificações do produto
Comprimento aproximado: 6 cm
Espessura: 3 mm
Material emborrachado de alta qualidade
Argola e corrente em metal resistente
Acabamento premium em alto-relevo
Design exclusivo inspirado na estética do trap
Leve, resistente e durável
Ideal para chaves, mochilas, estojos, bolsas e decoração
Ótima opção para fãs de trap e colecionadores
O Chaveiro Xtranho Matuê Trap Brandão Premium é a combinação perfeita entre música, cultura urbana e estilo. Leve para o seu dia a dia um acessório que representa a energia do trap e deixa sua coleção ainda mais diferenciada!', 'chaveiros', 24.90, 68.90, '/assets/img/produtos/chaveiro-trap-premium/capa.webp', array['/assets/img/produtos/chaveiro-trap-premium/01.webp', '/assets/img/produtos/chaveiro-trap-premium/02.webp', '/assets/img/produtos/chaveiro-trap-premium/03.webp', '/assets/img/produtos/chaveiro-trap-premium/04.webp', '/assets/img/produtos/chaveiro-trap-premium/05.webp', '/assets/img/produtos/chaveiro-trap-premium/06.webp', '/assets/img/produtos/chaveiro-trap-premium/07.webp', '/assets/img/produtos/chaveiro-trap-premium/08.webp', '/assets/img/produtos/chaveiro-trap-premium/09.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Xtranho","valores":["Xtranho"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/05.webp","esgotado":false},{"nome":"Brandão85","valores":["Brandão85"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/04.webp","esgotado":false},{"nome":"SwagBoy","valores":["SwagBoy"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/v03.webp","esgotado":false},{"nome":"Xtranho + Brandão85 + SwagBoy","valores":["Xtranho + Brandão85 + SwagBoy"],"preco":39.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/v04.webp","esgotado":false},{"nome":"Xtranho + Brandão85","valores":["Xtranho + Brandão85"],"preco":32.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/03.webp","esgotado":false},{"nome":"Ryu The Runner Adulto Ideal","valores":["Ryu The Runner Adulto Ideal"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/08.webp","esgotado":false},{"nome":"Kit Trap Completo","valores":["Kit Trap Completo"],"preco":45.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/v07.webp","esgotado":false},{"nome":"Travis Scott","valores":["Travis Scott"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/v08.webp","esgotado":false},{"nome":"PBC","valores":["PBC"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/v09.webp","esgotado":false},{"nome":"IM MUSIC","valores":["IM MUSIC"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/v10.webp","esgotado":false},{"nome":"TODOS","valores":["TODOS"],"preco":68.9,"imagem":"/assets/img/produtos/chaveiro-trap-premium/09.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1737152760892982401?region=BR&locale=pt-BR', false, true, 40),
  ('chaveiro-wake-wake', 'Chaveiro Wake Wake (fisiculturismo)', 'Leve o espírito "Wake Wake" do fisiculturismo para suas chaves, mochila ou coleção! O Chaveiro Wake Wake Colecionável é perfeito para quem vive o estilo de vida da academia, atletas e apaixonados pela musculação.
Fabricado em material resistente e com excelente acabamento, ele é leve, durável e ideal para o uso diário, aguentando a rotina pesada. Além de ser um ótimo acessório para demonstrar sua paixão pelo esporte, também é uma excelente opção de presente criativo e motivacional para amigos e familiares do mundo fitness.

## Especificações do produto
Comprimento: 5,5 cm
Altura: 4,8 cm
Espessura: 3 mm
Material resistente e durável
Ideal para chaves, mochilas, bolsas de academia e decoração
Ótima opção para colecionadores e fãs da cultura bodybuilding
Adicione um toque de determinação e personalidade ao seu dia a dia com este chaveiro exclusivo!', 'chaveiros', 24.90, 24.90, '/assets/img/produtos/chaveiro-wake-wake/capa.webp', array['/assets/img/produtos/chaveiro-wake-wake/01.webp', '/assets/img/produtos/chaveiro-wake-wake/02.webp', '/assets/img/produtos/chaveiro-wake-wake/03.webp', '/assets/img/produtos/chaveiro-wake-wake/04.webp', '/assets/img/produtos/chaveiro-wake-wake/05.webp', '/assets/img/produtos/chaveiro-wake-wake/06.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Preto","valores":["Preto"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-wake-wake/02.webp","esgotado":false},{"nome":"Branco","valores":["Branco"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-wake-wake/06.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1737005324969608321?region=BR&locale=pt-BR', false, true, 50),
  ('chaveiro-ai-dento', 'Chaveiro Ai Dento', 'Leve um dos memes mais icônicos da internet para suas chaves, mochila ou coleção! O Chaveiro Ai Dento Meme é perfeito para fãs de memes, colecionadores e para quem gosta de acessórios divertidos e cheios de personalidade.
Fabricado em material resistente e com excelente acabamento, ele é leve, durável e ideal para o uso diário. Além de ser um acessório descontraído, também é uma excelente opção de presente criativo para amigos e familiares.

## Especificações do produto
Altura: 5,5 cm
Largura: 5,5 cm
Espessura: 2,5 mm
Material resistente e durável
Ideal para chaves, mochilas, estojos e decoração
Ótima opção para colecionadores e fãs de memes
Adicione um toque de humor e personalidade ao seu dia a dia com este Chaveiro Ai Dento Meme, divertido, exclusivo e perfeito para quem ama memes!', 'chaveiros', 24.90, 24.90, '/assets/img/produtos/chaveiro-ai-dento/capa.webp', array['/assets/img/produtos/chaveiro-ai-dento/01.webp', '/assets/img/produtos/chaveiro-ai-dento/02.webp', '/assets/img/produtos/chaveiro-ai-dento/03.webp', '/assets/img/produtos/chaveiro-ai-dento/04.webp', '/assets/img/produtos/chaveiro-ai-dento/05.webp', '/assets/img/produtos/chaveiro-ai-dento/06.webp']::text[], null, null, 'https://shop.tiktok.com/view/product/1736799738541540481?region=BR&locale=pt-BR', false, true, 60),
  ('chaveiro-gordinho-aticando', 'Chaveiro Gordinho Atiçando', 'Leve um dos memes mais divertidos da internet para suas chaves, mochila ou coleção com o Chaveiro Gordinho Atiçando!
Inspirado em um meme que conquistou as redes sociais, este chaveiro é perfeito para quem gosta de humor, cultura da internet e acessórios criativos.
Fabricado em material resistente e com excelente acabamento, ele é leve, durável e ideal para o uso diário. Além de ser um ótimo acessório, também é uma excelente opção de presente para amigos, familiares e colecionadores.

## Especificações do produto
Altura: 6 cm
Largura: 6 cm
Espessura: 2,5 mm
Material resistente e durável
Ideal para chaves, mochilas, estojos e decoração
Inspirado em um meme viral da internet
Ótima opção para colecionadores e amantes de memes
Adicione um toque de humor e personalidade ao seu dia a dia com o Chaveiro Gordinho Atiçando, um acessório exclusivo que celebra um dos memes mais marcantes da internet.', 'chaveiros', 24.90, 24.90, '/assets/img/produtos/chaveiro-gordinho-aticando/capa.webp', array['/assets/img/produtos/chaveiro-gordinho-aticando/01.webp', '/assets/img/produtos/chaveiro-gordinho-aticando/02.webp', '/assets/img/produtos/chaveiro-gordinho-aticando/03.webp', '/assets/img/produtos/chaveiro-gordinho-aticando/04.webp', '/assets/img/produtos/chaveiro-gordinho-aticando/05.webp']::text[], null, null, 'https://shop.tiktok.com/view/product/1736783064119673985?region=BR&locale=pt-BR', false, true, 70),
  ('chaveiro-neymar-naverdathi', 'Chaveiro Neymar Jr Naverdathi', 'Leve o meme mais icônico do Neymar Jr para suas chaves, mochila ou coleção! O Chaveiro Neymar Jr Naverdathi é perfeito para fãs de futebol, colecionadores e amantes dos memes que marcaram a internet.
Fabricado em material resistente e com excelente acabamento, ele é leve, durável e ideal para o uso diário. Além de ser um ótimo acessório, também é uma excelente opção de presente criativo para amigos e familiares.

## Especificações do produto
Altura: 7 cm
Largura: 6 cm
Espessura: 3,3 mm
Material resistente e durável
Ideal para chaves, mochilas, estojos e decoração
Ótima opção para colecionadores e fãs do Neymar Jr e do meme "Naverdathi"
Adicione um toque de humor e personalidade ao seu dia a dia com este chaveiro exclusivo e divertido!', 'chaveiros', 24.90, 39.90, '/assets/img/produtos/chaveiro-neymar-naverdathi/capa.webp', array['/assets/img/produtos/chaveiro-neymar-naverdathi/01.webp', '/assets/img/produtos/chaveiro-neymar-naverdathi/02.webp', '/assets/img/produtos/chaveiro-neymar-naverdathi/03.webp', '/assets/img/produtos/chaveiro-neymar-naverdathi/04.webp', '/assets/img/produtos/chaveiro-neymar-naverdathi/05.webp', '/assets/img/produtos/chaveiro-neymar-naverdathi/06.webp', '/assets/img/produtos/chaveiro-neymar-naverdathi/07.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Naverdathi","valores":["Naverdathi"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-neymar-naverdathi/v01.webp","esgotado":false},{"nome":"Gordinho Atiçando","valores":["Gordinho Atiçando"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-neymar-naverdathi/v02.webp","esgotado":false},{"nome":"Naverdathi + Gordinho Atiçando","valores":["Naverdathi + Gordinho Atiçando"],"preco":39.9,"imagem":"/assets/img/produtos/chaveiro-neymar-naverdathi/v03.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1736762371230499969?region=BR&locale=pt-BR', false, true, 80),
  ('chaveiro-brawl-stars', 'Chaveiro Brawl Stars', 'Leve a diversão do Brawl Stars para onde você for! Este chaveiro exclusivo é perfeito para personalizar mochilas, bolsas, estojos e chaves com um toque gamer cheio de estilo.
Design inspirado no universo Brawl Stars
Material resistente e leve
Ideal para mochilas, bolsas e chaveiros
Excelente opção de presente para fãs do jogo
Acabamento de qualidade e cores vibrantes
Seja para colecionar ou para demonstrar sua paixão pelo game, este chaveiro é o acessório perfeito para acompanhar você no dia a dia.

## Conteúdo da embalagem
• 1x Chaveiro Brawl Stars Gamer Exclusivo
Presente ideal para jogadores e fãs de Brawl Stars de todas as idades!', 'chaveiros', 19.90, 19.90, '/assets/img/produtos/chaveiro-brawl-stars/capa.webp', array['/assets/img/produtos/chaveiro-brawl-stars/01.webp', '/assets/img/produtos/chaveiro-brawl-stars/02.webp', '/assets/img/produtos/chaveiro-brawl-stars/03.webp', '/assets/img/produtos/chaveiro-brawl-stars/04.webp', '/assets/img/produtos/chaveiro-brawl-stars/05.webp', '/assets/img/produtos/chaveiro-brawl-stars/06.webp']::text[], null, null, 'https://shop.tiktok.com/view/product/1736100628433306753?region=BR&locale=pt-BR', false, true, 90),
  ('chaveiro-custom-trap-edition', 'Chaveiro Custom Trap Edition', 'Chaveiros premium com design moderno e estilos únicos, perfeitos para quem vive de música!
Feitos com material resistente e de alta qualidade, leves e duráveis. Cada peça mede entre 5 e 8 cm e vem com corrente e argola metálica na cor PRATA reforçada.
Personalização total: Não encontrou o modelo do seu álbum ou artista favorito? É só mandar uma mensagem que nós criamos especialmente para você! Conforme a demanda, vamos adicionando mais modelos no anúncio.

## Modelos disponíveis na foto
• I AM MUSIC (branco e preto)
• Travis Scott Cactus Jack (verde e preto)
• PBC Playboi Carti (branco e preto)
• PHL Notunrboy (SWAGBOY)
E mais opções chegando em breve!
Quer um chaveiro personalizado do seu álbum favorito? Manda mensagem que te mostramos as opções e atualizamos o anúncio!', 'chaveiros', 24.90, 24.90, '/assets/img/produtos/chaveiro-custom-trap-edition/capa.webp', array['/assets/img/produtos/chaveiro-custom-trap-edition/01.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/02.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/03.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/04.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/05.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/06.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/07.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/08.webp', '/assets/img/produtos/chaveiro-custom-trap-edition/09.webp']::text[], '{"grupos":["Modelo","Cor"],"opcoes":[{"nome":"Travis Scott Cactus Jack / Cor 1","valores":["Travis Scott Cactus Jack","Cor 1"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-custom-trap-edition/v01.webp","esgotado":false},{"nome":"PBC Playboi Carti / Cor 1","valores":["PBC Playboi Carti","Cor 1"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-custom-trap-edition/v02.webp","esgotado":false},{"nome":"I AM MUSIC / Cor 1","valores":["I AM MUSIC","Cor 1"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-custom-trap-edition/v03.webp","esgotado":false},{"nome":"I AM MUSIC / Cor 2","valores":["I AM MUSIC","Cor 2"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-custom-trap-edition/v03.webp","esgotado":false},{"nome":"PHL Notunrboy (SWAGBOY) / Cor 1","valores":["PHL Notunrboy (SWAGBOY)","Cor 1"],"preco":24.9,"imagem":"/assets/img/produtos/chaveiro-custom-trap-edition/v05.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1735319682939126913?region=BR&locale=pt-BR', false, true, 100),
  ('chaveiro-clash-royale-coroa', 'Chaveiro Clash Royale (coroa)', 'Leve o espírito da arena para o seu dia a dia Um acessório perfeito para fãs de Clash Royale, gamers e colecionadores.
Produto: Chaveiro inspirado no Clash Royale, no formato da icônica Coroa Um símbolo de vitória, estratégia e domínio da arena.
Quantidade: 1 unidade
Produzido no Brasil, com excelente acabamento e detalhes bem definidos
Material Resistente e Sustentável Fabricado em PLA, material leve, durável e ecologicamente correto
Uso Ideal
Chaves
Mochilas
Estojos
Setup gamer
Presente perfeito para gamers. Ideal para fãs de Clash Royale, amigos gamers ou colecionadores Um chaveiro que carrega estilo, nostalgia e paixão pelo jogo
Mostre que você é o rei da arena! Garanta já seu Chaveiro Clash Royale', 'chaveiros', 7.69, 13.90, '/assets/img/produtos/chaveiro-clash-royale-coroa/capa.webp', array['/assets/img/produtos/chaveiro-clash-royale-coroa/01.webp', '/assets/img/produtos/chaveiro-clash-royale-coroa/02.webp', '/assets/img/produtos/chaveiro-clash-royale-coroa/03.webp', '/assets/img/produtos/chaveiro-clash-royale-coroa/04.webp', '/assets/img/produtos/chaveiro-clash-royale-coroa/05.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"Azul","valores":["Azul"],"preco":7.69,"imagem":"/assets/img/produtos/chaveiro-clash-royale-coroa/v01.webp","esgotado":false},{"nome":"Vermelho","valores":["Vermelho"],"preco":7.69,"imagem":"/assets/img/produtos/chaveiro-clash-royale-coroa/v02.webp","esgotado":false},{"nome":"Azul+Vermelho","valores":["Azul+Vermelho"],"preco":13.9,"imagem":"/assets/img/produtos/chaveiro-clash-royale-coroa/v03.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1734098771090572417?region=BR&locale=pt-BR', false, true, 110),
  ('chaveiro-mario-fidget-switch', 'Chaveiro Mario Fidget com Tecla Switch Blue', 'Diversão, nostalgia e clique satisfatório tudo em um só produto
Perfeito para fãs de games, Mario e quem ama um bom fidget!

## Produto
Chaveiro inspirado no universo do Mario, em formato de cubo
Funciona também como fidget, ideal para aliviar o estresse no dia a dia
• Switch Blue Mecânico
Equipado com switch blue, famoso pelo clique alto, tátil e viciante
Perfeito para quem curte sensação mecânica e som característico
• Impressão 3D de Alta Qualidade
Produzido em tecnologia 3D, com ótimo acabamento e visual fiel ao estilo gamer
• Material Resistente
Fabricado em PLA, leve, durável e ideal para uso diário', 'chaveiros', 20.90, 20.90, '/assets/img/produtos/chaveiro-mario-fidget-switch/capa.webp', array['/assets/img/produtos/chaveiro-mario-fidget-switch/01.webp', '/assets/img/produtos/chaveiro-mario-fidget-switch/02.webp', '/assets/img/produtos/chaveiro-mario-fidget-switch/03.webp', '/assets/img/produtos/chaveiro-mario-fidget-switch/04.webp', '/assets/img/produtos/chaveiro-mario-fidget-switch/05.webp', '/assets/img/produtos/chaveiro-mario-fidget-switch/06.webp']::text[], null, null, 'https://shop.tiktok.com/view/product/1734086982404441217?region=BR&locale=pt-BR', false, true, 120),
  ('miniatura-neygaucho', 'Miniatura Neymar Jr Arrogante (Ney Gaucho)', 'Miniatura decorativa inspirada no famoso meme Ney Gaucho: busto de boné virado para trás, barba, brinco e camisa polo azul, com as duas mãos estendidas em sinal de pare e o balão de fala a mi no logo atrás. Fica ótima na mesa, na estante, no setup gamer ou no balcão, e garante a risada de quem passar.

## Detalhes da peça
• Produto oficial licenciado
• Acabamento multicolor: camisa azul brilhante, boné e barba pretos, tons de pele nas mãos e no rosto
• Balão de fala em preto e branco com a frase -a mi no-
• Base redonda preta, para apoiar em superfície plana
• As linhas e os detalhes do processo fazem de cada peça uma unidade única

## Medidas e peso
• Altura: 11,5 cm
• Largura: 6,3 cm
• Comprimento: 7 cm
• Peso: 45 g

## Importante
• Item decorativo e frágil (o balão e as mãos são finos). Manuseie com cuidado. Não é brinquedo.
• Peça limitada, com poucas unidades disponíveis.
• Pequenas variações de tom podem ocorrer entre unidades, por causa do processo de impressão e da iluminação das fotos.
• Conteúdo: 1 boneco.', 'miniaturas', 24.90, 62.90, '/assets/img/produtos/miniatura-neygaucho/capa.webp', array['/assets/img/produtos/miniatura-neygaucho/01.webp', '/assets/img/produtos/miniatura-neygaucho/02.webp', '/assets/img/produtos/miniatura-neygaucho/03.webp', '/assets/img/produtos/miniatura-neygaucho/04.webp', '/assets/img/produtos/miniatura-neygaucho/05.webp', '/assets/img/produtos/miniatura-neygaucho/06.webp', '/assets/img/produtos/miniatura-neygaucho/07.webp', '/assets/img/produtos/miniatura-neygaucho/08.webp']::text[], '{"grupos":["Opção"],"opcoes":[{"nome":"Miniatura","valores":["Miniatura"],"preco":55.9,"imagem":"/assets/img/produtos/miniatura-neygaucho/01.webp","esgotado":false},{"nome":"Miniatura + Arrogante + BolaMavie","valores":["Miniatura + Arrogante + BolaMavie"],"preco":62.9,"imagem":"/assets/img/produtos/miniatura-neygaucho/v02.webp","esgotado":false},{"nome":"Arrogante","valores":["Arrogante"],"preco":24.9,"imagem":"/assets/img/produtos/miniatura-neygaucho/v03.webp","esgotado":false},{"nome":"BolaMavie","valores":["BolaMavie"],"preco":24.9,"imagem":"/assets/img/produtos/miniatura-neygaucho/v04.webp","esgotado":false},{"nome":"Naverdathi","valores":["Naverdathi"],"preco":24.9,"imagem":"/assets/img/produtos/miniatura-neygaucho/v05.webp","esgotado":false},{"nome":"Kit chaveiros","valores":["Kit chaveiros"],"preco":54.9,"imagem":"/assets/img/produtos/miniatura-neygaucho/08.webp","esgotado":false}]}'::jsonb, 'Collab', 'https://shop.tiktok.com/view/product/1737963667786400897?region=BR&locale=pt-BR', true, true, 130),
  ('miniatura-alee-trap', 'Miniatura Alee Trap', 'A miniatura colecionável do Alee baseado no Album Caos Ideal traz todos os detalhes marcantes do artista, perfeito para decorar seu estúdio, mesa de trabalho, prateleira ou setup gamer, sendo o presente ideal para fãs da cultura do trap e colecionadores.

## Destaques do Produto

## Design Exclusivo
Item de Decoração Versátil: Combina perfeitamente com ambientes modernos, estúdios de música e setups.
Excelente Acabamento: Produzido com atenção aos mínimos detalhes estéticos do artista.

## Especificações Técnicas
Produto: Boneco Alee Trap Decoracao Miniatura Album Caosr
Material: Plástico
Altura: 11,5 cm
Largura: 6 cm
Espessura: 5,5 cm
Peso:85 g

## Conteúdo da Embalagem
01 Miniatura Alee
Nota: As dimensões e pesos são aproximados. Item destina-se prioritariamente para fins decorativos e colecionáveis.
Por se tratar de um item produzido via fabricação aditiva , a peça apresenta linhas de camada e detalhes pontuais de textura que são característicos dessa tecnologia. Isso garante que cada miniatura seja única e exclusiva, com identidade própria!', 'miniaturas', 39.90, 119.90, '/assets/img/produtos/miniatura-alee-trap/capa.webp', array['/assets/img/produtos/miniatura-alee-trap/01.webp', '/assets/img/produtos/miniatura-alee-trap/02.webp', '/assets/img/produtos/miniatura-alee-trap/03.webp', '/assets/img/produtos/miniatura-alee-trap/04.webp', '/assets/img/produtos/miniatura-alee-trap/05.webp', '/assets/img/produtos/miniatura-alee-trap/06.webp', '/assets/img/produtos/miniatura-alee-trap/07.webp', '/assets/img/produtos/miniatura-alee-trap/08.webp', '/assets/img/produtos/miniatura-alee-trap/09.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Miniatura Padrão Alee (11cm)","valores":["Miniatura Padrão Alee (11cm)"],"preco":59.9,"imagem":"/assets/img/produtos/miniatura-alee-trap/02.webp","esgotado":false},{"nome":"Chaveiro Miniatura Alee (6cm)","valores":["Chaveiro Miniatura Alee (6cm)"],"preco":39.9,"imagem":"/assets/img/produtos/miniatura-alee-trap/05.webp","esgotado":false},{"nome":"Combo Miniatura + Chaveiro Alee","valores":["Combo Miniatura + Chaveiro Alee"],"preco":89.9,"imagem":"/assets/img/produtos/miniatura-alee-trap/03.webp","esgotado":false},{"nome":"Miniatura Alee + Miniatura RyuTheRunner","valores":["Miniatura Alee + Miniatura RyuTheRunner"],"preco":119.9,"imagem":"/assets/img/produtos/miniatura-alee-trap/v04.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1738123212783649921?region=BR&locale=pt-BR', false, true, 140),
  ('miniatura-ryu-the-runner', 'Miniatura Ryu The Runner Trap', 'A miniatura colecionável do Ryu, The Runner baseado no Album Adulto Ideal traz todos os detalhes marcantes do artista, perfeito para decorar seu estúdio, mesa de trabalho, prateleira ou setup gamer, sendo o presente ideal para fãs da cultura do trap e colecionadores.

## Destaques do Produto

## Design Exclusivo
Item de Decoração Versátil: Combina perfeitamente com ambientes modernos, estúdios de música e setups.
Excelente Acabamento: Produzido com atenção aos mínimos detalhes estéticos do artista.

## Especificações Técnicas
Produto: Miniatura Decorativa Ryu The Runner
Material: Plástico
Altura: 11,5 cm
Largura: 6 cm
Espessura: 5,5 cm
Peso:85 g

## Conteúdo da Embalagem
01 Miniatura Ryu The Runner
Nota: As dimensões e pesos são aproximados. Item destina-se prioritariamente para fins decorativos e colecionáveis.
Por se tratar de um item produzido via fabricação aditiva , a peça apresenta linhas de camada e detalhes pontuais de textura que são característicos dessa tecnologia. Isso garante que cada miniatura seja única e exclusiva, com identidade própria!', 'miniaturas', 39.90, 119.90, '/assets/img/produtos/miniatura-ryu-the-runner/capa.webp', array['/assets/img/produtos/miniatura-ryu-the-runner/01.webp', '/assets/img/produtos/miniatura-ryu-the-runner/02.webp', '/assets/img/produtos/miniatura-ryu-the-runner/03.webp', '/assets/img/produtos/miniatura-ryu-the-runner/04.webp', '/assets/img/produtos/miniatura-ryu-the-runner/05.webp', '/assets/img/produtos/miniatura-ryu-the-runner/06.webp', '/assets/img/produtos/miniatura-ryu-the-runner/07.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Miniatura Padrão Ryu The Runner (11cm)","valores":["Miniatura Padrão Ryu The Runner (11cm)"],"preco":59.9,"imagem":"/assets/img/produtos/miniatura-ryu-the-runner/v01.webp","esgotado":false},{"nome":"Chaveiro Miniatura Ryu The Runner (6cm)","valores":["Chaveiro Miniatura Ryu The Runner (6cm)"],"preco":39.9,"imagem":"/assets/img/produtos/miniatura-ryu-the-runner/v02.webp","esgotado":false},{"nome":"Combo Miniatura + Chaveiro Ryu The Runner","valores":["Combo Miniatura + Chaveiro Ryu The Runner"],"preco":89.9,"imagem":"/assets/img/produtos/miniatura-ryu-the-runner/v03.webp","esgotado":false},{"nome":"Miniatura Alee (11cm)+ RyuTheRunner (11cm)","valores":["Miniatura Alee (11cm)+ RyuTheRunner (11cm)"],"preco":119.9,"imagem":"/assets/img/produtos/miniatura-ryu-the-runner/v04.webp","esgotado":false},{"nome":"Chaveiro Alee (6cm) + RyuTheRunner (6cm)","valores":["Chaveiro Alee (6cm) + RyuTheRunner (6cm)"],"preco":79.9,"imagem":"/assets/img/produtos/miniatura-ryu-the-runner/v05.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1737340579622782081?region=BR&locale=pt-BR', false, true, 150),
  ('suporte-placa-de-video-pilar-grego', 'Suporte de Placa de Vídeo Pilar Grego', 'Evite o empenamento da placa de vídeo e eleve o visual do seu PC com um suporte que une função estrutural e design exclusivo.
O Suporte de Placa de Vídeo em formato de Pilar Grego foi projetado para oferecer apoio firme, ajuste preciso de altura e um acabamento diferenciado, inspirado na arquitetura clássica. Ideal para quem busca proteger a GPU sem abrir mão da estética do setup.
Placas de vídeo modernas são cada vez mais pesadas. Sem suporte adequado, o peso contínuo pode causar empenamento ao longo do tempo. Este suporte atua como um ponto de sustentação, ajudando a manter a placa alinhada e reduzindo o esforço sobre o slot PCIe.
Principais Benefícios
• Ajuda a prevenir empenamento da placa de vídeo
• Altura ajustável, garantindo encaixe correto em diferentes gabinetes
• Design em pilar grego, agregando sofisticação ao setup
• Base estável, adequada para GPUs de médio e grande porte
• Material resistente com acabamento detalhado
Dimensões e Ajuste
• Altura mínima (fechado): 6 cm
• Altura máxima (aberto): 8,5 cm
• Ajuste prático para posicionamento preciso conforme o modelo da placa e do gabinete', 'gamer', 24.90, 53.90, '/assets/img/produtos/suporte-placa-de-video-pilar-grego/capa.webp', array['/assets/img/produtos/suporte-placa-de-video-pilar-grego/01.webp', '/assets/img/produtos/suporte-placa-de-video-pilar-grego/02.webp', '/assets/img/produtos/suporte-placa-de-video-pilar-grego/03.webp', '/assets/img/produtos/suporte-placa-de-video-pilar-grego/04.webp', '/assets/img/produtos/suporte-placa-de-video-pilar-grego/05.webp', '/assets/img/produtos/suporte-placa-de-video-pilar-grego/06.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"Mármore","valores":["Mármore"],"preco":24.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/v01.webp","esgotado":false},{"nome":"Preto","valores":["Preto"],"preco":24.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/06.webp","esgotado":false},{"nome":"Kit 2 (Mármore + Mármore)","valores":["Kit 2 (Mármore + Mármore)"],"preco":43.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/v03.webp","esgotado":true},{"nome":"Kit 2 (Mármore + Preto)","valores":["Kit 2 (Mármore + Preto)"],"preco":43.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/v04.webp","esgotado":false},{"nome":"Kit 2 (Preto + Preto)","valores":["Kit 2 (Preto + Preto)"],"preco":43.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/v05.webp","esgotado":true},{"nome":"Kit 3 (2 Mármore + 1 Preto)","valores":["Kit 3 (2 Mármore + 1 Preto)"],"preco":53.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/v06.webp","esgotado":true},{"nome":"Kit 3 (2 Preto + 1 Mármore)","valores":["Kit 3 (2 Preto + 1 Mármore)"],"preco":53.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-pilar-grego/v07.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1734224143034320001?region=BR&locale=pt-BR', true, true, 160),
  ('placa-decorativa-trap-brandao', 'Placa Decorativa Selo Trap Brandão', 'Eleve o nível do seu espaço com a Placa Decorativa "Selo Trap Brandão". Com um design exclusivo e atitude de sobra, essa peça é indispensável para quem vive e respira a cultura trap. Ideal para dar aquele toque de autenticidade e estilo no seu estúdio, quarto, setup gamer, home office ou onde a sua criatividade mandar.

## Características
Formato: Circular
Medidas: 15cm de diâmetro x 5mm de espessura (robusta e marcante)
Material: Super resistente
Design: Exclusivo "Selo Brandão de Trap" em preto e branco
Estilo: Trap demais, ideal para ambientes modernos e urbanos
Leve e fácil de instalar
Um item colecionável, feito com dedicação para quem entende do corre e quer deixar o ambiente ainda mais exclusivo.', 'gamer', 59.90, 59.90, '/assets/img/produtos/placa-decorativa-trap-brandao/capa.webp', array['/assets/img/produtos/placa-decorativa-trap-brandao/01.webp', '/assets/img/produtos/placa-decorativa-trap-brandao/02.webp', '/assets/img/produtos/placa-decorativa-trap-brandao/03.webp', '/assets/img/produtos/placa-decorativa-trap-brandao/04.webp', '/assets/img/produtos/placa-decorativa-trap-brandao/05.webp', '/assets/img/produtos/placa-decorativa-trap-brandao/06.webp']::text[], null, null, 'https://shop.tiktok.com/view/product/1737172160823788673?region=BR&locale=pt-BR', false, true, 170),
  ('suporte-placa-de-video-monster', 'Suporte para Placa de Vídeo Monster (ajustável)', 'Proteja sua placa de vídeo contra a inclinação causada pelo peso (GPU Sag) e dê um toque moderno ao seu setup com o Suporte Monster . Desenvolvido para oferecer maior estabilidade, ele ajuda a preservar o slot PCIe e mantém a GPU corretamente posicionada, além de agregar um visual exclusivo ao computador.

## Principais Características
* Altura regulável de 6 cm a 11 cm
* Compatível com a maioria das placas de vídeo do mercado
* Sistema de ajuste por rosca para regulagem precisa
* Fabricado em polímero de alta resistência
* Estrutura leve, resistente e durável
* Instalação rápida e prática
* Design exclusivo inspirado na Monster Ultra
* Acabamento de excelente qualidade

## Vantagens
Evita a inclinação da placa de vídeo (GPU Sag)
Reduz o esforço exercido sobre o slot PCIe da placa-mãe
Proporciona maior estabilidade para placas de vídeo maiores e mais pesadas
Contribui para um setup mais organizado e elegante
Aumenta a segurança e a vida útil da instalação da GPU

## Especificações
* Modelo: Ajustável por rosca
* Altura: 6 cm a 11 cm
* Material: Polímero de alta resistência
* Compatibilidade: Universal para a maioria das GPUs
* Construção: Leve, resistente e de longa durabilidade

## Ideal para
* Computadores Gamer
* Workstations
* Placas de vídeo de médio e grande porte
* Usuários que desejam proteger sua GPU e valorizar a estética do setup

## Conteúdo da Embalagem
* 1x Suporte Ajustável Monster Ultra para Placa de Vídeo
Produto à pronta entrega.
Envio rápido para todo o Brasil.
Garanta já o seu Suporte Monster e mantenha sua placa de vídeo protegida, estável e com um visual incrível!', 'gamer', 39.90, 39.90, '/assets/img/produtos/suporte-placa-de-video-monster/capa.webp', array['/assets/img/produtos/suporte-placa-de-video-monster/01.webp', '/assets/img/produtos/suporte-placa-de-video-monster/02.webp', '/assets/img/produtos/suporte-placa-de-video-monster/03.webp', '/assets/img/produtos/suporte-placa-de-video-monster/04.webp', '/assets/img/produtos/suporte-placa-de-video-monster/05.webp', '/assets/img/produtos/suporte-placa-de-video-monster/06.webp', '/assets/img/produtos/suporte-placa-de-video-monster/07.webp', '/assets/img/produtos/suporte-placa-de-video-monster/08.webp', '/assets/img/produtos/suporte-placa-de-video-monster/09.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"Monster (Azul e Laranja)","valores":["Monster (Azul e Laranja)"],"preco":39.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-monster/v01.webp","esgotado":false},{"nome":"Monster (Preto e Verde)","valores":["Monster (Preto e Verde)"],"preco":39.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-monster/v02.webp","esgotado":false},{"nome":"Monster (Branco)","valores":["Monster (Branco)"],"preco":39.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-monster/v03.webp","esgotado":false},{"nome":"Monster (Rosa)","valores":["Monster (Rosa)"],"preco":39.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-monster/v04.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1736621655427679361?region=BR&locale=pt-BR', false, true, 180),
  ('grade-decorativa-fan-120mm', 'Grade Decorativa para Fan 120 mm', 'Extremamente resistente e durável!
Pesa aproximadamente 20g — super leve, não adiciona peso ao seu gabinete e ainda deixa o visual do PC incrível!
Acompanha 2 pinos para fixação diagonal (2 em 2). É só colocar nos furos opostos na diagonal e pronto — instalação rápida, segura e perfeita!
Perfeito para PC Gamer, setup clean, quarto gamer ou quem ama customização. Fácil de instalar e combina com qualquer gabinete!
Disponível em Branco e Preto
Peso: +-20g Material: PLA + PETG Inclui: 2 pinos por suporte
Quer deixar seu PC ainda mais estiloso? Escolha sua cor e adicione ao carrinho agora!', 'gamer', 12.90, 109.90, '/assets/img/produtos/grade-decorativa-fan-120mm/capa.webp', array['/assets/img/produtos/grade-decorativa-fan-120mm/01.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/02.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/03.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/04.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/05.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/06.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/07.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/08.webp', '/assets/img/produtos/grade-decorativa-fan-120mm/09.webp']::text[], '{"grupos":["Cor","Modelo","Quantidade"],"opcoes":[{"nome":"Preto / Ondas Japonesas / 1 Un","valores":["Preto","Ondas Japonesas","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Preto / Ondas Japonesas / Kit com 2","valores":["Preto","Ondas Japonesas","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Preto / Ondas Japonesas / Kit com 3","valores":["Preto","Ondas Japonesas","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Preto / Ondas Japonesas / Kit com 6","valores":["Preto","Ondas Japonesas","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Preto / Ondas Japonesas / Kit com 9","valores":["Preto","Ondas Japonesas","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Preto / Ondas Japonesas / Kit com 12","valores":["Preto","Ondas Japonesas","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Preto / Hello Kitty / 1 Un","valores":["Preto","Hello Kitty","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Preto / Hello Kitty / Kit com 2","valores":["Preto","Hello Kitty","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Preto / Hello Kitty / Kit com 3","valores":["Preto","Hello Kitty","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Preto / Hello Kitty / Kit com 6","valores":["Preto","Hello Kitty","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Preto / Hello Kitty / Kit com 9","valores":["Preto","Hello Kitty","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Preto / Hello Kitty / Kit com 12","valores":["Preto","Hello Kitty","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Preto / Grade Colmeia / 1 Un","valores":["Preto","Grade Colmeia","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Preto / Grade Colmeia / Kit com 2","valores":["Preto","Grade Colmeia","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Preto / Grade Colmeia / Kit com 3","valores":["Preto","Grade Colmeia","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Preto / Grade Colmeia / Kit com 6","valores":["Preto","Grade Colmeia","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Preto / Grade Colmeia / Kit com 9","valores":["Preto","Grade Colmeia","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Preto / Grade Colmeia / Kit com 12","valores":["Preto","Grade Colmeia","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Preto / Gengar (Pokémon) / Kit com 3","valores":["Preto","Gengar (Pokémon)","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Preto / Gengar (Pokémon) / Kit com 6","valores":["Preto","Gengar (Pokémon)","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Preto / Gengar (Pokémon) / Kit com 9","valores":["Preto","Gengar (Pokémon)","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Preto / Gengar (Pokémon) / Kit com 12","valores":["Preto","Gengar (Pokémon)","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Branco / Ondas Japonesas / 1 Un","valores":["Branco","Ondas Japonesas","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Branco / Ondas Japonesas / Kit com 2","valores":["Branco","Ondas Japonesas","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Branco / Ondas Japonesas / Kit com 3","valores":["Branco","Ondas Japonesas","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Branco / Ondas Japonesas / Kit com 6","valores":["Branco","Ondas Japonesas","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Branco / Ondas Japonesas / Kit com 9","valores":["Branco","Ondas Japonesas","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Branco / Ondas Japonesas / Kit com 12","valores":["Branco","Ondas Japonesas","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Branco / Hello Kitty / 1 Un","valores":["Branco","Hello Kitty","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Branco / Hello Kitty / Kit com 2","valores":["Branco","Hello Kitty","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Branco / Hello Kitty / Kit com 3","valores":["Branco","Hello Kitty","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Branco / Hello Kitty / Kit com 6","valores":["Branco","Hello Kitty","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Branco / Hello Kitty / Kit com 9","valores":["Branco","Hello Kitty","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Branco / Hello Kitty / Kit com 12","valores":["Branco","Hello Kitty","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Branco / Grade Colmeia / 1 Un","valores":["Branco","Grade Colmeia","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Branco / Grade Colmeia / Kit com 2","valores":["Branco","Grade Colmeia","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Branco / Grade Colmeia / Kit com 3","valores":["Branco","Grade Colmeia","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Branco / Grade Colmeia / Kit com 6","valores":["Branco","Grade Colmeia","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Branco / Grade Colmeia / Kit com 9","valores":["Branco","Grade Colmeia","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Branco / Grade Colmeia / Kit com 12","valores":["Branco","Grade Colmeia","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false},{"nome":"Branco / Gengar (Pokémon) / 1 Un","valores":["Branco","Gengar (Pokémon)","1 Un"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Branco / Gengar (Pokémon) / Kit com 2","valores":["Branco","Gengar (Pokémon)","Kit com 2"],"preco":22.9,"imagem":null,"esgotado":false},{"nome":"Branco / Gengar (Pokémon) / Kit com 3","valores":["Branco","Gengar (Pokémon)","Kit com 3"],"preco":32.9,"imagem":null,"esgotado":false},{"nome":"Branco / Gengar (Pokémon) / Kit com 6","valores":["Branco","Gengar (Pokémon)","Kit com 6"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Branco / Gengar (Pokémon) / Kit com 9","valores":["Branco","Gengar (Pokémon)","Kit com 9"],"preco":84.9,"imagem":null,"esgotado":false},{"nome":"Branco / Gengar (Pokémon) / Kit com 12","valores":["Branco","Gengar (Pokémon)","Kit com 12"],"preco":109.9,"imagem":null,"esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1734651136211846273?region=BR&locale=pt-BR', false, true, 190),
  ('suporte-headset-premium', 'Suporte Premium para Headset', 'Eleve seu espaço de trabalho com este elegante suporte moderno para fones de ouvido:
• Parafuso ajustável com facilidade
• Adaptação universal para mesa
• Tampa rotativa para montagem sem riscos
• Não requer suportes
Design Inteligente: Sistema de fixação por parafuso ajustável, compatível com diversas espessuras de mesa. Instale em segundos sem precisar de furos ou cola!
Totalmente Black: Acabamento em preto fosco que combina com qualquer setup gamer ou de escritório.
Ultra Resistente: Produzido com tecnologia de alta precisão, garantindo durabilidade e suporte firme para qualquer modelo de headset.
Organização Máxima: Libere espaço na sua mesa e proteja as almofadas do seu fone contra deformações.
Material: Polímero de alta resistência.
Cor: Preto (Black Edition).
Compatibilidade: Universal (ajustável para diferentes mesas e tamanhos de fones).', 'gamer', 24.90, 24.90, '/assets/img/produtos/suporte-headset-premium/capa.webp', array['/assets/img/produtos/suporte-headset-premium/01.webp', '/assets/img/produtos/suporte-headset-premium/02.webp', '/assets/img/produtos/suporte-headset-premium/03.webp', '/assets/img/produtos/suporte-headset-premium/04.webp', '/assets/img/produtos/suporte-headset-premium/05.webp', '/assets/img/produtos/suporte-headset-premium/06.webp', '/assets/img/produtos/suporte-headset-premium/07.webp', '/assets/img/produtos/suporte-headset-premium/08.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"Branco","valores":["Branco"],"preco":24.9,"imagem":"/assets/img/produtos/suporte-headset-premium/v01.webp","esgotado":false},{"nome":"Preto","valores":["Preto"],"preco":24.9,"imagem":"/assets/img/produtos/suporte-headset-premium/v02.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1734224202858071169?region=BR&locale=pt-BR', false, true, 200),
  ('suporte-placa-de-video-personalizado', 'Suporte para Placa de Vídeo Personalizado (Nvidia ou Radeon)', '• O SUPORTE PARA PLACA DE VIDEO é personalizado e ajustável. Este suporte é projetado para se adaptar às suas necessidades específicas.
• Com esta opção, você pode configurar a posição da placa de vídeo de acordo com suas preferências. Isso garante uma visualização confortável e eficiente.

## Características
• Personalizado: Este suporte é feito sob medida para atender às suas demandas.
• Ajustável: Possui ajustes que permitem personalizar a posição da placa de vídeo.

## Perfeito para Você
Este suporte é ideal para quem busca uma solução personalizada e ajustável para a sua placa de vídeo.', 'gamer', 20.90, 20.90, '/assets/img/produtos/suporte-placa-de-video-personalizado/capa.webp', array['/assets/img/produtos/suporte-placa-de-video-personalizado/01.webp', '/assets/img/produtos/suporte-placa-de-video-personalizado/02.webp', '/assets/img/produtos/suporte-placa-de-video-personalizado/03.webp', '/assets/img/produtos/suporte-placa-de-video-personalizado/04.webp', '/assets/img/produtos/suporte-placa-de-video-personalizado/05.webp']::text[], '{"grupos":["Marca"],"opcoes":[{"nome":"Nvidia","valores":["Nvidia"],"preco":20.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-personalizado/v01.webp","esgotado":false},{"nome":"Radeon","valores":["Radeon"],"preco":20.9,"imagem":"/assets/img/produtos/suporte-placa-de-video-personalizado/v02.webp","esgotado":true}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1734086721986069633?region=BR&locale=pt-BR', false, true, 210),
  ('suporte-celular-parede', 'Suporte de Celular para Parede (adesivo, sem furo)', '## Mais praticidade e organização!
Chega de deixar o celular no chão ou pendurado pelo carregador!
Com nosso suporte de parede, seu celular fica organizado, seguro e sempre ao seu alcance, mesmo durante o carregamento.

## Principais vantagens
• Instalação fácil, sem furadeira ou parafusos
• Fixação adesiva, sem precisar furar a parede
• Ideal para apoiar o celular enquanto carrega
• Abertura inferior para passagem do cabo
• Também organiza cabos e pequenos carregadores
• Design compacto, moderno e resistente
• Economiza espaço e evita bagunça

## Informações do produto
• Altura: 8,5 cm
• Largura: 9,2 cm
• Profundidade: 2,5 cm
• Cor: Branco
• Material: Plástico
• Fixação: Adesiva

## Onde utilizar?
• Quartos e cabeceiras
• Salas
• Escritórios
• Cozinhas
• Próximo às tomadas

## Superfícies indicadas
• Azulejos e cerâmicas lisas
• Vidros e espelhos lisos
• Metais lisos
• Mármore e superfícies polidas
• Para melhor fixação, utilize em superfícies lisas, limpas e secas. Evite paredes ásperas, úmidas ou com textura.

## Instalação simples
• Limpe e seque a superfície.
• Aplique o adesivo na parte traseira do suporte.
• Retire a película protetora.
• Posicione e pressione firmemente na parede.
• Aguarde o tempo de fixação recomendado para o adesivo antes de utilizar.

## O que vem na embalagem?
• Suporte de celular para parede
• Adesivo de fixação (conforme o kit adquirido)
• Celular, cabos e carregadores não inclusos.

## Importante
• Verifique as medidas para confirmar a compatibilidade com seu celular.
• O suporte permite carregar o aparelho sem precisar retirá-lo.
• A fixação depende das condições da superfície e do adesivo utilizado.

## Organize seu espaço com praticidade!
Garanta já o seu suporte multifuncional e deixe seu ambiente muito mais organizado!', 'casa', 13.90, 51.90, '/assets/img/produtos/suporte-celular-parede/capa.webp', array['/assets/img/produtos/suporte-celular-parede/01.webp', '/assets/img/produtos/suporte-celular-parede/02.webp', '/assets/img/produtos/suporte-celular-parede/03.webp', '/assets/img/produtos/suporte-celular-parede/04.webp', '/assets/img/produtos/suporte-celular-parede/05.webp', '/assets/img/produtos/suporte-celular-parede/06.webp', '/assets/img/produtos/suporte-celular-parede/07.webp', '/assets/img/produtos/suporte-celular-parede/08.webp', '/assets/img/produtos/suporte-celular-parede/09.webp']::text[], '{"grupos":["Quantidade","Cor"],"opcoes":[{"nome":"1 Un / Branco","valores":["1 Un","Branco"],"preco":13.9,"imagem":"/assets/img/produtos/suporte-celular-parede/09.webp","esgotado":false},{"nome":"1 Un / Preto","valores":["1 Un","Preto"],"preco":13.9,"imagem":"/assets/img/produtos/suporte-celular-parede/09.webp","esgotado":false},{"nome":"2 Un / Branco","valores":["2 Un","Branco"],"preco":25.9,"imagem":"/assets/img/produtos/suporte-celular-parede/v03.webp","esgotado":false},{"nome":"2 Un / Preto","valores":["2 Un","Preto"],"preco":25.9,"imagem":"/assets/img/produtos/suporte-celular-parede/v03.webp","esgotado":false},{"nome":"5 Un / Branco","valores":["5 Un","Branco"],"preco":51.9,"imagem":"/assets/img/produtos/suporte-celular-parede/v05.webp","esgotado":false},{"nome":"5 Un / Preto","valores":["5 Un","Preto"],"preco":51.9,"imagem":"/assets/img/produtos/suporte-celular-parede/v05.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1738521535265539201?region=BR&locale=pt-BR', false, true, 220),
  ('suporte-controle-remoto', 'Suporte Universal de Parede para Controle Remoto', '## Um suporte para todos os controles da casa!
Suporte universal de parede para controle remoto de TV e ar condicionado.
Fita dupla face já inclusa: fixação rápida e sem furos
Também tem furos prontos para parafuso
Formato em U: botões livres e fácil de pegar com uma mão
Em 2 cores: branco e preto
Mede 7,5 x 5,5 x 3,0 cm (espaço interno de 2,7 cm)
Serve em controles de até 2,7 cm de espessura. Confira o seu antes de comprar.
Acompanha 1 suporte com fita dupla face. Controle remoto não incluso.
suporte universal controle remoto, suporte universal tv ar condicionado, suporte controle remoto, porta controle remoto, suporte de parede, organizador de controle, suporte controle ar condicionado, suporte controle tv, suporte adesivo, suporte sem furar, organização da casa, decoração

## Perguntas frequentes
Serve no meu controle? Sim, é universal para controles de TV e ar condicionado com até 2,7 cm de espessura.
Precisa furar a parede? Não. A fita dupla face já vem no suporte, e os furos para parafuso são opcionais.
O controle vem junto? Não, ele aparece só como demonstração.', 'casa', 24.90, 24.90, '/assets/img/produtos/suporte-controle-remoto/capa.webp', array['/assets/img/produtos/suporte-controle-remoto/01.webp', '/assets/img/produtos/suporte-controle-remoto/02.webp', '/assets/img/produtos/suporte-controle-remoto/03.webp', '/assets/img/produtos/suporte-controle-remoto/04.webp', '/assets/img/produtos/suporte-controle-remoto/05.webp', '/assets/img/produtos/suporte-controle-remoto/06.webp', '/assets/img/produtos/suporte-controle-remoto/07.webp', '/assets/img/produtos/suporte-controle-remoto/08.webp', '/assets/img/produtos/suporte-controle-remoto/09.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"Branco","valores":["Branco"],"preco":24.9,"imagem":"/assets/img/produtos/suporte-controle-remoto/07.webp","esgotado":false},{"nome":"Preto","valores":["Preto"],"preco":24.9,"imagem":"/assets/img/produtos/suporte-controle-remoto/06.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1737987220190037121?region=BR&locale=pt-BR', false, true, 230),
  ('kit-mini-fotos-polaroid', 'Kit Mini Fotos Polaroid 5 x 6 cm', '## Polaroids Personalizadas 5x6 cm
Transforme suas melhores lembranças em recordações únicas e cheias de significado! Nossas polaroids personalizadas são produzidas com impressão de alta qualidade e acabamento cuidadoso, perfeitas para eternizar momentos especiais.
Tamanho: 5 cm x 6 cm
Impressão de alta qualidade
Material resistente e durável
Estilo retrô inspirado nas clássicas fotos instantâneas
Ideais para decorar espelhos, murais, quartos, escrivaninhas, painéis de fotos, cadernos, álbuns, capinhas transparentes de celular e muito mais. Também são uma ótima opção de presente para amigos, familiares ou para guardar lembranças de pessoas e momentos especiais.
Você pode personalizar com fotos de amigos, família, namorado(a), artistas, personagens favoritos ou qualquer imagem que tenha significado para você.
Cada pedido é produzido com atenção aos detalhes para garantir um resultado especial e exclusivo.
IMPORTANTE: Após a confirmação da compra, envie as fotos desejadas pelo chat para iniciarmos a produção.', 'casa', 15.90, 69.90, '/assets/img/produtos/kit-mini-fotos-polaroid/capa.webp', array['/assets/img/produtos/kit-mini-fotos-polaroid/01.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/02.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/03.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/04.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/05.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/06.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/07.webp', '/assets/img/produtos/kit-mini-fotos-polaroid/08.webp']::text[], '{"grupos":["Quantidade"],"opcoes":[{"nome":"KIT 4 FOTOS","valores":["KIT 4 FOTOS"],"preco":15.9,"imagem":"/assets/img/produtos/kit-mini-fotos-polaroid/04.webp","esgotado":false},{"nome":"KIT 8 FOTOS","valores":["KIT 8 FOTOS"],"preco":24.9,"imagem":"/assets/img/produtos/kit-mini-fotos-polaroid/06.webp","esgotado":false},{"nome":"KIT 12 FOTOS","valores":["KIT 12 FOTOS"],"preco":33.9,"imagem":"/assets/img/produtos/kit-mini-fotos-polaroid/08.webp","esgotado":false},{"nome":"KIT 16 FOTOS","valores":["KIT 16 FOTOS"],"preco":41.9,"imagem":"/assets/img/produtos/kit-mini-fotos-polaroid/07.webp","esgotado":false},{"nome":"KIT 36 FOTOS","valores":["KIT 36 FOTOS"],"preco":69.9,"imagem":"/assets/img/produtos/kit-mini-fotos-polaroid/03.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1736020568879826049?region=BR&locale=pt-BR', false, true, 240),
  ('kit-8-porta-copos', 'Kit 8 Porta-Copos com Suporte', 'O conjunto perfeito para proteger e decorar mesas, balcões e áreas gourmet!
Esses porta-copos são produzidos em material de alta qualidade, com acabamento suave e premium, confere durabilidade, leveza e resistência ao desgaste diário.
Características Principais
• Antiderrapante: Base segura que não desliza, ideal para mesas lisas ou com leve textura.
• Flexível e resistente: Material elástico que não rasga, rasga ou desbota com o tempo.
• Atóxicos e higienizados: Totalmente seguros e fáceis de limpar – basta lavar com água e sabão.
• Acabamento premium: Textura fina e elegante que protege a superfície da mesa, evitando arranhões e manchas.
Dimensões
Cada porta-copo mede 10 cm de diâmetro (comprimento e largura) e possui 0,4 cm de altura, perfeitos para caberem em qualquer espaço sem ocupar muito lugar.
Funcionalidades e Versatilidade
Não são só porta-copos – eles são verdadeiros aliados de organização e estilo! Protegem suas mesas e balcões, dão estabilidade aos copos e ainda transformam o ambiente em um espaço mais sofisticado e acolhedor.

## Perfeitos para
• Mesas de jantar e sala de estar
• Balcões de cozinha e áreas gourmet
• Escritórios e home office
• Presentes especiais, festas ou simplesmente para completar seu estoque
Com o Kit 8 Porta Copos, você ganha praticidade, segurança e um toque de design elegante. Ideal para quem valoriza qualidade, simplicidade e um visual sofisticado no dia a dia!', 'casa', 46.90, 46.90, '/assets/img/produtos/kit-8-porta-copos/capa.webp', array['/assets/img/produtos/kit-8-porta-copos/01.webp', '/assets/img/produtos/kit-8-porta-copos/02.webp', '/assets/img/produtos/kit-8-porta-copos/03.webp', '/assets/img/produtos/kit-8-porta-copos/04.webp', '/assets/img/produtos/kit-8-porta-copos/05.webp', '/assets/img/produtos/kit-8-porta-copos/06.webp', '/assets/img/produtos/kit-8-porta-copos/07.webp', '/assets/img/produtos/kit-8-porta-copos/08.webp']::text[], '{"grupos":["Quantidade","Cor"],"opcoes":[{"nome":"Kit 8pcs (Brancas) + Suporte / Branco","valores":["Kit 8pcs (Brancas) + Suporte","Branco"],"preco":46.9,"imagem":"/assets/img/produtos/kit-8-porta-copos/04.webp","esgotado":false},{"nome":"Kit 8pcs (Brancas) + Suporte / Preto","valores":["Kit 8pcs (Brancas) + Suporte","Preto"],"preco":46.9,"imagem":"/assets/img/produtos/kit-8-porta-copos/04.webp","esgotado":false},{"nome":"Kit 8pcs (Preto) + Suporte / Branco","valores":["Kit 8pcs (Preto) + Suporte","Branco"],"preco":46.9,"imagem":"/assets/img/produtos/kit-8-porta-copos/03.webp","esgotado":false},{"nome":"Kit 8pcs (Preto) + Suporte / Preto","valores":["Kit 8pcs (Preto) + Suporte","Preto"],"preco":46.9,"imagem":"/assets/img/produtos/kit-8-porta-copos/03.webp","esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1735876117115929729?region=BR&locale=pt-BR', false, true, 250),
  ('caixa-dupla-figurinhas-copa-2026', 'Caixa Organizadora Dupla de Figurinhas (Copa 2026)', 'Prepare-se para viver a Copa do Mundo 2026 com estilo e organização! Apresentamos o Case Porta Figurinhas 2026, um estojo desenvolvido especialmente para colecionadores exigentes que querem proteger, organizar e transportar suas figurinhas com praticidade e muito bom gosto.

## Principais Benefícios
• Organização Prática: Separe facilmente as figurinhas que você já tem das repetidas, tornando as trocas muito mais rápidas e eficientes.
• Design Exclusivo: Tampa com logo oficial "26" em relevo, trazendo um visual moderno, premium e autêntico para sua coleção.
• Fechamento Seguro: Sistema de travas resistentes que impedem que o estojo abra sozinho dentro da mochila ou no bolso.
• Qualidade Superior: Fabricado em polímero de alta resistência, garantindo durabilidade e acabamento profissional.

## Especificações Técnicas
• Dois tamanhos disponíveis: Grande e Pequena
• Material: Polímero de alta resistência
• Dimensões: Grande 9,6 x 11,5 x 3,4 cm; Pequena 6,3 x 9,5 x 7,8 cm
• Detalhes: Logo em relevo + clips de travamento na tampa

## Por que escolher este case?
Este organizador é o acessório perfeito para quem leva a coleção da Copa 2026 a sério. Compacto e resistente, ele protege suas figurinhas contra amassados e sujeira, mantendo até as peças mais raras em ótimo estado. Ideal para levar nas trocas com os amigos ou para presentear alguém especial.
Não perca tempo! Garanta já o seu Case e mantenha sua coleção completa, organizada e protegida até o final da maior competição do mundo.', 'casa', 69.90, 79.90, '/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/capa.webp', array['/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/01.webp', '/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/02.webp', '/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/03.webp', '/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/04.webp', '/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/05.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"PEQUENA - PRETA","valores":["PEQUENA - PRETA"],"preco":69.9,"imagem":"/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/v01.webp","esgotado":false},{"nome":"GRANDE - PRETA","valores":["GRANDE - PRETA"],"preco":79.9,"imagem":"/assets/img/produtos/caixa-dupla-figurinhas-copa-2026/v02.webp","esgotado":false}]}'::jsonb, 'Copa 2026', 'https://shop.tiktok.com/view/product/1735526178414101633?region=BR&locale=pt-BR', false, true, 260),
  ('caixa-porta-figurinhas-copa-2026', 'Caixa Porta-Figurinhas (Copa 2026)', 'Guarde suas figurinhas, cards ou adesivos da Copa do Mundo 2026 com estilo e proteção!
Essa caixinha exclusiva de alta qualidade, super resistente e com acabamento premium.

## Dimensões
8 cm de comprimento
6 cm de largura
3 cm de profundidade
Peso: Apenas 35g (super leve e fácil de levar pra qualquer lugar)

## Características
Tampa com fechamento seguro (trava firme)
Design exclusivo e o número 2026 em alto relevo
Disponível em 5 cores incríveis: Verde Menta, Preto, Azul, Verde Limão e Branco
Material resistente e durável
Perfeita para organizar figurinhas, cards de coleção ou pequenos acessórios
Ideal para colecionadores, crianças e fãs de futebol que querem manter suas figurinhas protegidas e organizadas com muito estilo!

## Edição limitada da Copa do Mundo 2026', 'casa', 28.90, 59.90, '/assets/img/produtos/caixa-porta-figurinhas-copa-2026/capa.webp', array['/assets/img/produtos/caixa-porta-figurinhas-copa-2026/01.webp', '/assets/img/produtos/caixa-porta-figurinhas-copa-2026/02.webp', '/assets/img/produtos/caixa-porta-figurinhas-copa-2026/03.webp', '/assets/img/produtos/caixa-porta-figurinhas-copa-2026/04.webp', '/assets/img/produtos/caixa-porta-figurinhas-copa-2026/05.webp']::text[], '{"grupos":["Cor"],"opcoes":[{"nome":"Preto","valores":["Preto"],"preco":28.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v01.webp","esgotado":false},{"nome":"Branco","valores":["Branco"],"preco":28.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v02.webp","esgotado":false},{"nome":"Azul","valores":["Azul"],"preco":28.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v03.webp","esgotado":false},{"nome":"Kit 2 Caixas (Preto+Branco)","valores":["Kit 2 Caixas (Preto+Branco)"],"preco":46.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v04.webp","esgotado":false},{"nome":"Kit 2 Caixas (Preto+Preto)","valores":["Kit 2 Caixas (Preto+Preto)"],"preco":46.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v05.webp","esgotado":false},{"nome":"Kit 2 Caixas (Branco+Branco)","valores":["Kit 2 Caixas (Branco+Branco)"],"preco":46.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v06.webp","esgotado":false},{"nome":"Kit 3 Caixas (Preto+Branco+Azul)","valores":["Kit 3 Caixas (Preto+Branco+Azul)"],"preco":59.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v07.webp","esgotado":false},{"nome":"Kit 2 Caixas (Azul+Branco)","valores":["Kit 2 Caixas (Azul+Branco)"],"preco":46.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v08.webp","esgotado":false},{"nome":"Kit 2 Caixas (Azul+Preto)","valores":["Kit 2 Caixas (Azul+Preto)"],"preco":46.9,"imagem":"/assets/img/produtos/caixa-porta-figurinhas-copa-2026/v09.webp","esgotado":false}]}'::jsonb, 'Copa 2026', 'https://shop.tiktok.com/view/product/1735445437677470849?region=BR&locale=pt-BR', false, true, 270),
  ('enfeite-letreiro-feliz-natal', 'Enfeite Letreiro Feliz Natal com Rena', 'Dê um toque especial à sua decoração de Natal com este letreiro Feliz Natal com rena, flocos de neve e estrela. Ele fica em pé sozinho e pode ir na mesa da ceia, no pé da árvore, em estantes, aparadores ou onde você quiser.
É feito em plástico duro, então é resistente e leve, e dura vários Natais.

## Características
Material: plástico duro
Largura: 17 cm
Altura: 11,2 cm
Espessura: 1,2 cm
Cores disponíveis: vermelho e dourado

## Ideal para
Mesa da ceia de Natal
Pé da árvore de Natal
Estantes, racks e aparadores
Presentear alguém especial
Escolha a sua cor e deixe sua casa no clima natalino!', 'natal', 24.90, 37.90, '/assets/img/produtos/enfeite-letreiro-feliz-natal/capa.webp', array['/assets/img/produtos/enfeite-letreiro-feliz-natal/01.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/02.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/03.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/04.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/05.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/06.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/07.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/08.webp', '/assets/img/produtos/enfeite-letreiro-feliz-natal/09.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"Letreiro Vermelho","valores":["Letreiro Vermelho"],"preco":24.9,"imagem":"/assets/img/produtos/enfeite-letreiro-feliz-natal/05.webp","esgotado":false},{"nome":"Letreiro Dourado","valores":["Letreiro Dourado"],"preco":24.9,"imagem":"/assets/img/produtos/enfeite-letreiro-feliz-natal/08.webp","esgotado":false},{"nome":"Kit Letreiro Vermelho + Dourado","valores":["Kit Letreiro Vermelho + Dourado"],"preco":37.9,"imagem":"/assets/img/produtos/enfeite-letreiro-feliz-natal/v03.webp","esgotado":false},{"nome":"Kit Letreiro 2Un Vermelho","valores":["Kit Letreiro 2Un Vermelho"],"preco":37.9,"imagem":"/assets/img/produtos/enfeite-letreiro-feliz-natal/v04.webp","esgotado":false},{"nome":"Kit Letreiro 2Un Dourado","valores":["Kit Letreiro 2Un Dourado"],"preco":37.9,"imagem":"/assets/img/produtos/enfeite-letreiro-feliz-natal/v05.webp","esgotado":false}]}'::jsonb, 'Natal', 'https://shop.tiktok.com/view/product/1738254408002536577?region=BR&locale=pt-BR', false, true, 280),
  ('enfeite-natal-urso-e-rena', 'Enfeite de Natal Urso e Rena (textura crochê)', 'Deixe seu Natal ainda mais aconchegante com esses enfeites fofos com textura de crochê!
O Ursinho Polar com gorro do Papai Noel e a Rena de narizinho vermelho trazem charme e delicadeza para qualquer canto da casa. Ficam lindos entre os galhos da árvore, ao pé da árvore, na mesa da ceia, em estantes, no rack ou na mesa do escritório.

## Destaques
Textura que imita crochê, com visual artesanal e cheio de detalhes
Material: plástico duro (rígido), leve e resistente
Tamanho compacto, cabe na palma da mão
Ótima opção de lembrancinha, amigo secreto e presente de Natal
Medidas aproximadas: 6,5 cm de altura x 4 cm de largura (cada peça)
• Conteúdo: [1 Urso / 1 Rena / Kit com 1 Urso + 1 Rena] (ajuste conforme o anúncio)
As cores podem variar levemente conforme a tela do aparelho. Produto decorativo, não é brinquedo.
#decoracaodenatal #enfeitedenatal #arvoredenatal #renadenatal #ursodenatal #natal2026 #decoracaonatalina #presentedenatal', 'natal', 22.90, 68.90, '/assets/img/produtos/enfeite-natal-urso-e-rena/capa.webp', array['/assets/img/produtos/enfeite-natal-urso-e-rena/01.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/02.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/03.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/04.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/05.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/06.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/07.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/08.webp', '/assets/img/produtos/enfeite-natal-urso-e-rena/09.webp']::text[], '{"grupos":["Modelo"],"opcoes":[{"nome":"1 Un. Rena","valores":["1 Un. Rena"],"preco":22.9,"imagem":"/assets/img/produtos/enfeite-natal-urso-e-rena/06.webp","esgotado":false},{"nome":"1 Un. Urso","valores":["1 Un. Urso"],"preco":22.9,"imagem":"/assets/img/produtos/enfeite-natal-urso-e-rena/07.webp","esgotado":false},{"nome":"Kit 1 Un. (Rena + Urso)","valores":["Kit 1 Un. (Rena + Urso)"],"preco":39.9,"imagem":"/assets/img/produtos/enfeite-natal-urso-e-rena/02.webp","esgotado":false},{"nome":"2 Un. Rena","valores":["2 Un. Rena"],"preco":39.9,"imagem":"/assets/img/produtos/enfeite-natal-urso-e-rena/v04.webp","esgotado":false},{"nome":"2 Un. Urso","valores":["2 Un. Urso"],"preco":39.9,"imagem":"/assets/img/produtos/enfeite-natal-urso-e-rena/v05.webp","esgotado":false},{"nome":"Kit 2 Un. (Urso + Rena)","valores":["Kit 2 Un. (Urso + Rena)"],"preco":68.9,"imagem":"/assets/img/produtos/enfeite-natal-urso-e-rena/04.webp","esgotado":false}]}'::jsonb, 'Natal', 'https://shop.tiktok.com/view/product/1738232217924764801?region=BR&locale=pt-BR', false, true, 290),
  ('duck-hunt-esconde-patinhos', 'Duck Hunt: Jogo de Esconder os Patinhos', 'O jogo mais divertido e viciante do momento para brincar em casa!
Como funciona o jogo? Esconda os patinhos pela casa, quarto, sala, quintal ou onde quiser! Depois é só chamar todo mundo para procurar. Quem encontrar mais patinhos ganha! Pode jogar em duplas, em time ou todos contra todos. Quanto mais patinhos escondidos, mais difícil e divertido fica!

## Para que serve?
• Brincadeira perfeita para toda a família
• Estimula atenção, observação e movimento das crianças
• Ótimo para festas de aniversário, reuniões em família ou tarde chuvosa
• Também pode ser usado como decoração fofa no quarto, estante ou mesa
Por que você deve ter um Duck Hunt? Porque é simples, não tem regra complicada, diverte crianças e adultos juntos e garante muitas risadas! É aquele tipo de jogo que todo mundo pede para jogar de novo. Perfeito para criar memórias divertidas em família ou entre amigos.

## Detalhes do produto
Material: Feito em PLA de alta qualidade (material ecológico e resistente)

## Modelos disponíveis
• Modelo 1 (Pequeno): Dimensões da caixinha: 8cm x 6cm x 3cm Peso: ≈ 52g Ideal para quem quer algo compacto e fácil de guardar
• Modelo 2 (Médio): Dimensões da caixinha: 9cm x 7cm x 4cm Peso: ≈ 90g Mais espaço e visual ainda mais impactante
Patinhos: Cada patinho mede aproximadamente 1,5cm
A quantidade de patinhos varia conforme a opção escolhida no anúncio.
Super fofo, leve, resistente e com aquele acabamento brilhante que chama atenção!
Perfeito como presente para crianças, amigos, família ou para você mesmo que ama coisas fofas e divertidas!
É simples, quem encontrar mais patos, vence!', 'brinquedos', 12.90, 121.50, '/assets/img/produtos/duck-hunt-esconde-patinhos/capa.webp', array['/assets/img/produtos/duck-hunt-esconde-patinhos/01.webp', '/assets/img/produtos/duck-hunt-esconde-patinhos/02.webp', '/assets/img/produtos/duck-hunt-esconde-patinhos/03.webp', '/assets/img/produtos/duck-hunt-esconde-patinhos/04.webp', '/assets/img/produtos/duck-hunt-esconde-patinhos/05.webp']::text[], '{"grupos":["Modelo","Patinhos"],"opcoes":[{"nome":"Caixa Grande / 10 Patos","valores":["Caixa Grande","10 Patos"],"preco":72.9,"imagem":null,"esgotado":false},{"nome":"Caixa Grande / 25 Patos","valores":["Caixa Grande","25 Patos"],"preco":79.9,"imagem":null,"esgotado":false},{"nome":"Caixa Grande / 50 Patos","valores":["Caixa Grande","50 Patos"],"preco":94.5,"imagem":null,"esgotado":false},{"nome":"Caixa Grande / 100 Patos","valores":["Caixa Grande","100 Patos"],"preco":121.5,"imagem":null,"esgotado":false},{"nome":"Caixa Grande / Sem Patos","valores":["Caixa Grande","Sem Patos"],"preco":67.5,"imagem":null,"esgotado":false},{"nome":"Caixa Pequena / 10 Patos","valores":["Caixa Pequena","10 Patos"],"preco":44.4,"imagem":null,"esgotado":false},{"nome":"Caixa Pequena / 25 Patos","valores":["Caixa Pequena","25 Patos"],"preco":52.5,"imagem":null,"esgotado":false},{"nome":"Caixa Pequena / 50 Patos","valores":["Caixa Pequena","50 Patos"],"preco":59.9,"imagem":null,"esgotado":false},{"nome":"Caixa Pequena / 100 Patos","valores":["Caixa Pequena","100 Patos"],"preco":92.9,"imagem":null,"esgotado":false},{"nome":"Caixa Pequena / Sem Patos","valores":["Caixa Pequena","Sem Patos"],"preco":38.9,"imagem":null,"esgotado":false},{"nome":"Apenas Patos (Sem Caixa) / 10 Patos","valores":["Apenas Patos (Sem Caixa)","10 Patos"],"preco":12.9,"imagem":null,"esgotado":false},{"nome":"Apenas Patos (Sem Caixa) / 25 Patos","valores":["Apenas Patos (Sem Caixa)","25 Patos"],"preco":16.9,"imagem":null,"esgotado":false},{"nome":"Apenas Patos (Sem Caixa) / 50 Patos","valores":["Apenas Patos (Sem Caixa)","50 Patos"],"preco":27.9,"imagem":null,"esgotado":false},{"nome":"Apenas Patos (Sem Caixa) / 100 Patos","valores":["Apenas Patos (Sem Caixa)","100 Patos"],"preco":42.9,"imagem":null,"esgotado":false}]}'::jsonb, null, 'https://shop.tiktok.com/view/product/1735194940083045505?region=BR&locale=pt-BR', true, true, 300)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  price = excluded.price, price_max = excluded.price_max, image_url = excluded.image_url,
  images = excluded.images, variations = excluded.variations, badge = excluded.badge,
  tiktok_url = excluded.tiktok_url, featured = excluded.featured, active = true,
  sort_order = excluded.sort_order;

-- 4) Esconde (NÃO apaga) os produtos de exemplo que não têm foto.
--    Para mostrar de novo: painel › Produtos › ligue "Visível".
update public.products set active = false, featured = false
 where slug in ('enfeite-natal-rena', 'karambit-replica', 'spinner-gamer');

-- 5) Conferência: deve mostrar 30 produtos visíveis com foto
select count(*) as produtos_visiveis_com_foto from public.products where active and image_url is not null;
