-- =====================================================================
-- Collection 3D — links da Shopee + produto novo (Suporte para Copos Descartáveis)
-- Rode DEPOIS do produtos-tiktok.sql. Supabase › SQL Editor › New query › cole TUDO › Run.
-- Pode rodar mais de uma vez. Não apaga nada.
-- =====================================================================

-- 1) Links da Shopee nos produtos que já estão no site
update public.products as p set shopee_url = v.url
from (values
  ('chaveiro-arrogante', 'https://shopee.com.br/product/476941339/58218813240'),
  ('chaveiro-neymar-naverdathi', 'https://shopee.com.br/product/476941339/58218813240'),
  ('miniatura-neygaucho', 'https://shopee.com.br/product/476941339/58270370631'),
  ('suporte-celular-parede', 'https://shopee.com.br/product/476941339/58272813423'),
  ('suporte-controle-remoto', 'https://shopee.com.br/product/476941339/22499881875'),
  ('enfeite-letreiro-feliz-natal', 'https://shopee.com.br/product/476941339/22995375785'),
  ('miniatura-ryu-the-runner', 'https://shopee.com.br/product/476941339/22799814003'),
  ('chaveiro-ryu-the-runner', 'https://shopee.com.br/product/476941339/22799814003'),
  ('karambit-replica', 'https://shopee.com.br/product/476941339/58258230369'),
  ('spinner-gamer', 'https://shopee.com.br/product/476941339/58208233921')
) as v(slug, url)
where p.slug = v.slug;

-- 2) Produto novo, só na Shopee
insert into public.products
  (slug, name, description, category, price, price_max, image_url, images, variations, badge, tiktok_url, shopee_url, featured, active, sort_order)
values
  ('suporte-copos-descartaveis', 'Suporte para Copos Descartáveis', 'Chega de copos espalhados, caindo ou sujando na bancada. Com este suporte, os copos ficam empilhados de pé, protegidos e sempre à mão. É só puxar o de cima e usar.

## Praticidade no dia a dia
• Pegue um copo por vez com uma mão só, sem desmontar a pilha
• Os copos ficam em pé e alinhados, sem rolar nem cair
• Menos contato com os outros copos, então ficam mais limpos e higiênicos
• Na hora de repor, é só encaixar a nova pilha por cima, sem tirar nada do lugar
• Dá para ver na hora quando os copos estão acabando
• Leve (cerca de 50 g), fácil de mudar de lugar e de levar para eventos
• Ocupa pouco espaço: cabe em qualquer canto da mesa, bancada ou balcão
• Limpeza simples: é só passar um pano úmido

## Fácil de montar
São só duas peças: a base e as hastes. Basta encaixar as hastes nos furos da base. Fica pronto em segundos, sem ferramentas e sem parafusos.

## Medidas e compatibilidade
• Altura: 13 cm
• Diâmetro da base: 12 cm
• Distância entre as hastes: 4,8 cm
• Peso aproximado: 50 g
• Compatível com copos de 50 ml a 200 ml (diâmetro de até 8 cm)
• Base com borda ondulada, firme e estável

## Onde usar
Cozinha, escritório, recepção, consultório, salão, cafeteria, festas e eventos. Use com copos de café, água ou chá.

## Cores
Preto e branco.

## Conteúdo da embalagem
A quantidade e a cor variam conforme a opção escolhida. O produto é enviado desmontado (base + hastes), pronto para encaixar.', 'casa', 39.98, 69.98,
   '/assets/img/produtos/suporte-copos-descartaveis/capa.webp', array['/assets/img/produtos/suporte-copos-descartaveis/01.webp', '/assets/img/produtos/suporte-copos-descartaveis/02.webp', '/assets/img/produtos/suporte-copos-descartaveis/03.webp', '/assets/img/produtos/suporte-copos-descartaveis/04.webp', '/assets/img/produtos/suporte-copos-descartaveis/05.webp', '/assets/img/produtos/suporte-copos-descartaveis/06.webp', '/assets/img/produtos/suporte-copos-descartaveis/07.webp', '/assets/img/produtos/suporte-copos-descartaveis/08.webp', '/assets/img/produtos/suporte-copos-descartaveis/09.webp']::text[],
   '{"grupos":["Opção"],"opcoes":[{"nome":"1 Un Branco","valores":["1 Un Branco"],"preco":39.98,"imagem":null,"esgotado":false},{"nome":"1 Un Preto","valores":["1 Un Preto"],"preco":39.98,"imagem":null,"esgotado":false},{"nome":"2 Un Branco","valores":["2 Un Branco"],"preco":69.98,"imagem":null,"esgotado":false},{"nome":"2 Un Preto","valores":["2 Un Preto"],"preco":69.98,"imagem":null,"esgotado":false},{"nome":"Kit Branco + Preto","valores":["Kit Branco + Preto"],"preco":69.98,"imagem":null,"esgotado":false}]}'::jsonb, null, null, 'https://shopee.com.br/product/476941339/23399903641', false, true, 275)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  price = excluded.price, price_max = excluded.price_max, image_url = excluded.image_url,
  images = excluded.images, variations = excluded.variations, shopee_url = excluded.shopee_url;

-- 3) Karambit e Spinner: agora com fotos (e vídeo), voltam a aparecer no site
update public.products as p set name = v.name, description = v.description, category = v.category,
  price = v.price, price_max = v.price, image_url = v.image_url, images = v.images, variations = null, active = true, sort_order = v.sort_order
from (values
  ('karambit-replica', 'Karambit Counter-Strike: Réplica Tamanho Real', 'Réplica decorativa do karambit do Counter-Strike, em tamanho real (1:1). Leve e sem corte: é peça de coleção, feita para enfeitar o setup, a estante ou a mesa gamer.

## Ideal para
• Fãs de Counter-Strike e colecionadores
• Decoração de setup e quarto gamer
• Presente para quem joga', 'gamer', 24.90::numeric, '/assets/img/produtos/karambit-replica/capa.webp', array['/assets/img/produtos/karambit-replica/01.webp', '/assets/img/produtos/karambit-replica/02.webp', '/assets/img/produtos/karambit-replica/03.webp', '/assets/img/produtos/karambit-replica/04.webp', '/assets/img/produtos/karambit-replica/05.webp']::text[], 212),
  ('spinner-gamer', 'Spinner de Dedo Kunai', 'Spinner de dedo no formato de kunai, com design inspirado nos animes. É só encaixar o anel no dedo e girar. Veja no vídeo da galeria como ele gira.

## Ideal para
• Fãs de anime e de games
• Passar o tempo e aliviar a tensão nas mãos
• Colecionar ou dar de presente', 'gamer', 19.90::numeric, '/assets/img/produtos/spinner-gamer/capa.webp', array['/assets/img/produtos/spinner-gamer/01.webp', '/assets/img/produtos/spinner-gamer/video.mp4', '/assets/img/produtos/spinner-gamer/02.webp', '/assets/img/produtos/spinner-gamer/03.webp', '/assets/img/produtos/spinner-gamer/04.webp', '/assets/img/produtos/spinner-gamer/05.webp', '/assets/img/produtos/spinner-gamer/06.webp', '/assets/img/produtos/spinner-gamer/07.webp']::text[], 214)
) as v(slug, name, description, category, price, image_url, images, sort_order)
where p.slug = v.slug;

-- 4) Mais uma foto da Miniatura Ryu (sem repetir se rodar de novo)
update public.products set images = array_append(images, '/assets/img/produtos/miniatura-ryu-the-runner/08.webp')
 where slug = 'miniatura-ryu-the-runner' and not ('/assets/img/produtos/miniatura-ryu-the-runner/08.webp' = any(images));

-- 5) Conferência: deve mostrar 11 produtos com link da Shopee, todos visíveis
select slug, active, shopee_url from public.products where shopee_url is not null order by active desc, sort_order;
