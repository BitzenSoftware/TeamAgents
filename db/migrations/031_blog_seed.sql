-- =====================================================================
-- TeamAgents — Migração 031: artigos iniciais do blog (seed)
-- 6 artigos publicados, com datas escalonadas (cadência ~semanal).
-- Usa dollar-quoting ($md$...$md$) para não precisar escapar nada.
-- Idempotente: on conflict (slug) do nothing — pode rodar de novo.
-- =====================================================================

insert into blog_posts (slug, titulo, resumo, meta_description, conteudo, publicado, created_at) values (
  'automatizar-agendamento-clinica-estetica-whatsapp',
  $md$Como automatizar o agendamento da sua clínica de estética pelo WhatsApp$md$,
  $md$O WhatsApp é onde a paciente decide. Veja como automatizar o atendimento e o agendamento da sua clínica de estética sem perder o toque humano — e parar de perder cliente por demora.$md$,
  $md$Aprenda a automatizar o agendamento da sua clínica de estética pelo WhatsApp: atender em segundos, qualificar e marcar a avaliação 24/7, sem recepcionista.$md$,
  $md$Na estética, a venda não acontece na sua agenda — acontece no **WhatsApp**, às vezes às 22h, no meio de uma dúvida sobre preenchimento ou "quanto custa a limpeza de pele". Se a resposta demora, a paciente vai para a clínica do lado. Automatizar esse atendimento deixou de ser luxo: é o que separa a agenda cheia da agenda com buracos.

## Por que o WhatsApp é o coração da sua clínica

A maioria das suas pacientes não liga e não preenche formulário. Elas mandam mensagem — vindas de um anúncio, do Instagram ou de uma indicação. O problema é que você (ou a recepção) não consegue responder na hora o tempo todo: está com uma paciente na cadeira, almoçando, ou já foi para casa.

Cada mensagem sem resposta rápida é uma avaliação que não foi marcada.

## O que significa "automatizar o agendamento"

Não é mandar mensagem robótica. É ter um atendimento que faz, sozinho, o que uma ótima recepcionista faria:

1. **Responde na hora**, a qualquer momento do dia ou da noite.
2. **Entende o que a paciente quer** (qual procedimento, primeira vez ou não, urgência).
3. **Responde o "quanto custa?"** com naturalidade, sem assustar — falando o valor a partir de e o benefício.
4. **Conduz para a avaliação** e marca o horário direto na sua agenda.

## Como funciona na prática

O fluxo ideal é simples e tem três peças:

- **A isca:** um anúncio ou post com um botão/link que leva direto pro WhatsApp da clínica.
- **O atendimento:** assim que a paciente chama, ela é atendida em segundos — qualificada e conduzida com o tom da sua clínica.
- **O agendamento:** quando ela confirma o interesse, a avaliação é marcada na agenda automaticamente.

O segredo é que essas três peças conversam entre si: o atendimento já sabe de qual anúncio a pessoa veio e fala a língua daquele procedimento.

## O que olhar ao escolher uma solução

- **Velocidade real:** responde em segundos, não em minutos.
- **Conhece a sua clínica:** dá pra ensinar seus procedimentos, valores e respostas às objeções ("dói?", "quanto dura?").
- **Agenda de verdade:** marca na sua agenda (Google/Cal.com), não só manda um link solto.
- **Sabe a hora de chamar você:** casos clínicos ou sensíveis devem ir para um humano.
- **Mostra resultado:** você precisa enxergar quantas pacientes entraram e quantas viraram avaliação.

## Erros comuns que custam agendamento

- **Respostas genéricas** que não citam o procedimento que a paciente perguntou.
- **Fugir do preço** e jogar a pessoa para "depois te falo" — ela esfria.
- **Depender de horário comercial:** boa parte das mensagens chega à noite e no fim de semana.
- **Não medir nada:** sem dado, você não sabe onde está perdendo.

## Conclusão

Automatizar o agendamento pelo WhatsApp não é tirar o humano da clínica — é garantir que **nenhuma paciente fique sem resposta** enquanto você cuida de quem já está na cadeira. Quem responde primeiro, agenda primeiro. E na estética, agendar a avaliação já é mais da metade da venda.$md$,
  true,
  now()
) on conflict (slug) do nothing;

insert into blog_posts (slug, titulo, resumo, meta_description, conteudo, publicado, created_at) values (
  'quanto-custa-perder-paciente-demora-atendimento',
  $md$Quanto custa perder uma paciente por demora no atendimento?$md$,
  $md$A demora para responder no WhatsApp tem um preço — e ele é maior do que parece. Veja a conta real do que a sua clínica de estética perde por mês com cada mensagem sem resposta.$md$,
  $md$Descubra quanto a sua clínica de estética perde por demorar a responder no WhatsApp e como atender 24/7 transforma mensagens em avaliações agendadas.$md$,
  $md$"Depois eu respondo." Essa frase, repetida algumas vezes por dia, é uma das maiores fontes de prejuízo invisível de uma clínica de estética. A paciente não reclama — ela simplesmente vai embora em silêncio, e você nunca fica sabendo da venda que não aconteceu.

Vamos colocar número nisso.

## A demora esfria — rápido

Interesse em estética é **impulsivo**. A pessoa viu um antes/depois, se animou, mandou mensagem. Se ela é respondida em segundos, está no auge da motivação. Se a resposta vem horas depois (ou no dia seguinte), o impulso passou — e provavelmente outra clínica já respondeu.

Não é falta de interesse. É **janela de oportunidade** que fecha.

## A conta do prejuízo (faça a sua)

Use os seus números. A título de exemplo:

- Você recebe **150 mensagens/mês** de possíveis pacientes.
- Por demora, falta de resposta à noite e fim de semana, você perde o contato de **20%** delas → **30 pacientes/mês**.
- Dessas, digamos que **1 em cada 6** fecharia um procedimento de ticket médio **R$ 800**.
- Resultado: **5 procedimentos × R$ 800 = R$ 4.000/mês** indo embora. **R$ 48.000 por ano.**

Mesmo cortando esses números pela metade, ainda é dinheiro suficiente para pagar muitas vezes uma solução de atendimento — e sobrar.

## Onde as pacientes escapam

- **Fora do horário comercial:** boa parte das mensagens chega à noite e no fim de semana, quando ninguém responde.
- **Durante o expediente:** você está com uma paciente na cadeira e não consegue parar para responder.
- **Na dúvida de preço:** quando demora ou foge do "quanto custa?", a pessoa desiste.
- **No vácuo:** ela manda "oi, tenho interesse" e a resposta nunca vem.

## O custo que ninguém soma

O prejuízo não é só a venda perdida. É também:

- O **dinheiro do anúncio** que trouxe aquela mensagem (você pagou para ela chegar… e a perdeu na porta).
- O **boca a boca** que aquela paciente satisfeita traria.
- O **tempo da sua equipe** respondendo no susto, sem padrão.

## Como virar o jogo

A solução não é trabalhar mais — é **nunca deixar uma mensagem sem resposta imediata**:

- Atendimento **24/7**, que responde em segundos a qualquer hora.
- Que **responde preço** com jeito e conduz para a avaliação.
- Que **marca o horário** na sua agenda na hora.
- E que te mostra, no fim da semana, **quantas pacientes foram salvas** — inclusive as que chegaram de madrugada.

## Conclusão

A pergunta não é "quanto custa automatizar o atendimento?". É **"quanto já está custando não automatizar?"**. Some as mensagens que você perdeu este mês e multiplique pelo seu ticket médio. Essa é a conta que importa — e ela corre contra você todos os dias, em silêncio.$md$,
  true,
  now() - interval '3 days'
) on conflict (slug) do nothing;

insert into blog_posts (slug, titulo, resumo, meta_description, conteudo, publicado, created_at) values (
  'ia-bastidores-clinica-estetica-emails',
  $md$Fornecedores, boletos e convênios: deixe a IA cuidar dos bastidores da sua clínica$md$,
  $md$A parte administrativa que ninguém vê — fornecedor de toxina, boletos, convênios — consome seu tempo e gera erro caro. Veja como uma IA resume tudo em prioridades e ações.$md$,
  $md$Use IA para organizar os e-mails administrativos da sua clínica de estética: fornecedores, boletos e convênios resumidos em prioridades, ações e decisões.$md$,
  $md$Toda dona de clínica conhece a sensação: a agenda está cheia, a sala lotada, e a caixa de e-mail acumula fornecedor de toxina, boleto para vencer, mensagem do convênio e newsletter de congresso. O atendimento à paciente sempre ganha — e os bastidores viram uma bomba-relógio. É aí que o lote de preenchedor vence, o boleto atrasa ou a parceria some no meio de 80 e-mails.

## O custo invisível da bagunça administrativa

O problema não é só o tempo gasto lendo e-mail. É o **erro caro** que nasce do que passou batido:

- Um lote de toxina/preenchedor que venceu sem ninguém ver.
- Um boleto pago a mais (ou em atraso, com multa).
- Um convênio ou parceria que ficou sem resposta e esfriou.

Esses deslizes não aparecem no caixa como "prejuízo" — mas estão lá.

## O que a IA faz com a sua caixa de entrada

Em vez de você abrir e-mail por e-mail, a ideia é simples: a IA **lê e resume** o que importa e te entrega em três blocos:

- **Prioridades:** o que precisa de você hoje.
- **Ações:** o que fazer, com prazo.
- **Decisões:** o que ficou definido.

Tudo isso sem você abrir a caixa. Você bate o olho e sabe o que importa.

## Como funciona na rotina da clínica

O ideal é trabalhar por **tarefas dirigidas**, não "ler tudo":

1. Você cria uma tarefa do tipo "resumir os e-mails dos meus fornecedores".
2. Define a frequência (todo dia de manhã, por exemplo) e o horário.
3. A IA processa só o que você pediu e te entrega o resumo pronto.

Resultado: os bastidores deixam de competir com a paciente na cadeira.

## O que olhar numa solução assim

- **Foco, não tudo:** ela lê só o que você manda (economiza e evita ruído).
- **Saída acionável:** prioridades, ações e prazos — não um textão.
- **Agenda própria:** roda sozinha no horário que você definir.
- **Privacidade:** seus e-mails ficam isolados e seguros.

## Conclusão

Você não abriu uma clínica para administrar caixa de entrada. Deixar a IA cuidar dos bastidores — fornecedores, boletos, convênios — devolve o seu tempo para o que dá dinheiro: cuidar das pacientes. O administrativo continua em dia, sem virar bomba.$md$,
  true,
  now() - interval '6 days'
) on conflict (slug) do nothing;

insert into blog_posts (slug, titulo, resumo, meta_description, conteudo, publicado, created_at) values (
  'resumo-emails-ia-gestao-clinica',
  $md$Resumo de e-mails com IA: como economizar 1 hora por dia na gestão da clínica$md$,
  $md$Você não precisa ler cada e-mail. Entenda como a IA lê, resume e entrega só prioridades, ações e decisões — e como encaixar isso na rotina da sua clínica.$md$,
  $md$Como usar IA para resumir e-mails e atas na gestão da clínica: prioridades, ações e decisões prontas, sem abrir a caixa de entrada. Economize 1 hora por dia.$md$,
  $md$Quanto tempo você gasta por dia lendo e-mail e mensagem administrativa? Para a maioria das gestoras de clínica, é mais de uma hora — fragmentada em pedaços, entre uma paciente e outra, sempre no susto. A boa notícia: dá para terceirizar isso para uma IA e ficar só com o que importa.

## Por que ler e-mail é um trabalho mal pago

Ler e-mail tem um custo escondido: além do tempo, ele **rouba foco**. Cada vez que você para para checar a caixa, leva minutos para voltar ao que estava fazendo. No fim do dia, foi uma hora perdida — e ainda assim algo importante passou batido.

## O que é um "resumo executivo" feito por IA

Não é só encurtar o texto. É transformar uma pilha de mensagens em **decisão**:

- **Resumo:** a essência de cada assunto em 2 ou 3 frases.
- **Prioridade:** o que é urgente, médio ou pode esperar.
- **Ações:** o que precisa ser feito, por quem e até quando.

Você lê em 30 segundos o que levaria 30 minutos.

## Como aplicar na rotina

O segredo é **dirigir** a IA, em vez de mandar ela "ler tudo":

- Crie tarefas específicas: "resumir e-mails do contador", "resumir atas das reuniões da equipe".
- Programe para rodar sozinha — por exemplo, todo dia às 7h, antes de você abrir a clínica.
- Receba o resumo pronto: você começa o dia sabendo exatamente o que decidir.

Funciona para e-mail e também para **atas de reunião**: cole a ata e receba as decisões e tarefas já organizadas.

## Dicas para tirar o máximo

- **Seja específico** no que pedir — quanto mais clara a tarefa, melhor o resumo.
- **Comece pequeno:** uma ou duas tarefas que mais te consomem hoje.
- **Confie no filtro:** o objetivo é você parar de abrir o que não precisa.

## Conclusão

Ler e-mail não é gestão — é ruído. Deixar a IA resumir e te entregar só prioridades, ações e decisões libera a sua hora mais cara do dia. Na clínica, essa hora vale muito mais aplicada na operação e nas pacientes do que dentro da caixa de entrada.$md$,
  true,
  now() - interval '9 days'
) on conflict (slug) do nothing;

insert into blog_posts (slug, titulo, resumo, meta_description, conteudo, publicado, created_at) values (
  'como-criar-anuncios-clinica-estetica',
  $md$Como criar anúncios de estética que enchem a agenda (com exemplos)$md$,
  $md$Anúncio bom não fala de você — fala da dor e do desejo da paciente. Veja a estrutura de um anúncio que converte na estética, com exemplos prontos.$md$,
  $md$Aprenda a criar anúncios para clínica de estética que enchem a agenda: estrutura, gatilhos e exemplos prontos para harmonização, botox e limpeza de pele.$md$,
  $md$A maioria dos anúncios de clínica de estética falha pelo mesmo motivo: fala da clínica ("temos os melhores equipamentos", "profissionais qualificados") quando deveria falar da **paciente** — da dor que ela sente e do resultado que ela deseja. Anúncio que enche agenda é aquele em que a pessoa se reconhece.

## A estrutura de um anúncio que converte

Todo bom anúncio de estética tem quatro partes:

1. **O gancho (a dor ou o desejo):** a primeira linha precisa parar o dedo. Fale do incômodo real.
2. **A virada (a solução):** mostre, em uma frase, que existe saída — sem prometer milagre.
3. **A prova ou diferencial:** o que torna o resultado confiável (avaliação, profissional habilitada).
4. **O CTA (chamada):** diga exatamente o que fazer — "chame no WhatsApp", "agende sua avaliação".

## Dois ângulos que sempre funcionam

Vale a pena criar **duas versões** do mesmo anúncio:

- **Foco na dor:** "Cansada de esconder o sorriso por causa do bigode chinês?"
- **Foco no benefício:** "Recupere o contorno do seu rosto em uma única sessão."

Públicos diferentes reagem a gatilhos diferentes. Teste os dois.

## Exemplos prontos (adapte para a sua clínica)

**Preenchimento labial — dor:**
> "Sente que seus lábios 'sumiram' nas fotos? O preenchimento certo devolve volume natural — sem exagero. Avaliação essa semana. Chame no WhatsApp 👇"

**Botox — benefício:**
> "Aquela expressão cansada some em minutos. Toxina aplicada por profissional habilitada, resultado natural. Agende sua avaliação."

**Limpeza de pele — dor:**
> "Pele oleosa e cravos que não vão embora? Uma limpeza profunda muda o jogo. Vagas essa semana — chame agora."

## Cuidados importantes (compliance)

Estética tem regras de conselho de classe. Evite:

- Prometer **resultado garantido** ou "100%".
- Usar antes/depois fora das regras do seu conselho.
- Linguagem que gere expectativa irreal.

Foque em **sentir-se bem**, não em milagre.

## O atalho: deixe a IA gerar (e você aprova)

Escrever bons anúncios toda semana cansa. Um agente de copy faz isso em segundos: você dá o procedimento e o público, e ele devolve as duas versões já com gatilho, dor e desejo mapeados — e ainda gera a palavra-chave e o link que levam a pessoa direto pro seu WhatsApp. Você só revisa e publica.

## Conclusão

Anúncio que enche agenda fala da paciente, não da clínica. Tenha sempre duas versões (dor e benefício), uma chamada clara para o WhatsApp e respeito às regras do seu conselho. O resto é teste — e velocidade para produzir.$md$,
  true,
  now() - interval '12 days'
) on conflict (slug) do nothing;

insert into blog_posts (slug, titulo, resumo, meta_description, conteudo, publicado, created_at) values (
  'ideias-de-post-clinica-estetica',
  $md$Ideias de post para clínica de estética: o que publicar para atrair pacientes$md$,
  $md$Sem saber o que postar, o Instagram da clínica trava. Veja 7 tipos de post que atraem pacientes — e como produzir tudo em minutos.$md$,
  $md$7 ideias de post para clínica de estética que atraem pacientes no Instagram: educativo, dúvidas, bastidores, prova social e oferta — com dicas de como criar em minutos.$md$,
  $md$O Instagram parado é uma das maiores dores de quem tem clínica de estética. Não por falta de vontade — por falta de **ideia do que postar**. A boa notícia: existe um punhado de formatos que sempre funcionam. Tenha esta lista por perto e nunca mais fique sem assunto.

## 7 tipos de post que atraem pacientes

**1. Educativo ("mitos e verdades")**
Responda uma dúvida comum: "Preenchimento muda o rosto para sempre?". Ensinar gera autoridade e confiança.

**2. Dúvida frequente da recepção**
Pegue o que mais te perguntam no WhatsApp ("dói?", "quanto tempo dura?") e transforme em post. Se perguntam muito, muita gente quer saber.

**3. Bastidores**
Mostre o cuidado: higienização, produtos registrados, a profissional se preparando. Bastidores geram segurança.

**4. Prova social (com cuidado)**
Depoimento de paciente, em texto ou vídeo curto. Respeite as regras do seu conselho sobre imagem e antes/depois.

**5. Oferta / chamada**
Uma condição da semana com chamada clara para o WhatsApp. Sem isso, o conteúdo não vira agendamento.

**6. "Para quem é / para quem não é"**
Ajuda a paciente certa a se identificar e filtra a errada. Ex.: "Harmonização é para quem busca naturalidade, não exagero."

**7. Antes/depois (dentro das regras)**
Quando permitido pelo seu conselho, é o formato mais poderoso. Na dúvida, prefira "resultado em palavras".

## A regra de ouro: todo post precisa de um destino

Conteúdo bonito que não leva a lugar nenhum não enche agenda. Sempre que fizer sentido, termine com **"chame no WhatsApp"** — e tenha alguém (ou uma IA) pronto para responder na hora. De nada adianta atrair se a mensagem fica sem resposta.

## Como manter a consistência sem enlouquecer

O segredo da rede social é **frequência**, e é aí que a maioria desiste. Duas saídas:

- **Planeje em lote:** reserve uma hora por semana e crie vários posts de uma vez.
- **Use IA para acelerar:** um agente de copy gera legendas e anúncios com o tom da sua clínica em segundos — você só revisa, ajusta e publica (inclusive direto no Instagram e Facebook).

## Conclusão

Você não precisa de inspiração todo dia — precisa de um **sistema**. Tenha esses 7 formatos à mão, sempre com uma chamada para o WhatsApp, e mantenha a frequência. Consistência atrai paciente; post solto, não.$md$,
  true,
  now() - interval '15 days'
) on conflict (slug) do nothing;
