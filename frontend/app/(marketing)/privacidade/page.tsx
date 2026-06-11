export const metadata = {
  title: "Política de Privacidade — TeamAgents",
  description: "Como o TeamAgents trata os dados, incluindo dados do Google (Gmail).",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed text-black/80">
      <h1 className="text-2xl font-semibold text-black">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-black/45">Última atualização: 9 de junho de 2026</p>

      <p className="mt-6">
        O TeamAgents (operado pela Bitzen Software) é uma plataforma de agentes de IA para
        equipes comerciais e executivas. Esta política explica que dados coletamos, como os
        usamos e os direitos que você tem sobre eles. Ao usar o serviço, você concorda com o aqui descrito.
      </p>

      <Section titulo="1. Dados que coletamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Dados de conta:</strong> email e identificação do usuário, nome da empresa.</li>
          <li><strong>Dados que você insere:</strong> campanhas, habilidades (conhecimento da empresa), textos de email/atas que você cola ou carrega.</li>
          <li><strong>Dados do Google (Gmail), se conectar a conta:</strong> conteúdo e metadados dos seus emails recentes (remetente, assunto, corpo), acessados apenas em modo de leitura.</li>
          <li><strong>Tokens de acesso (OAuth):</strong> salvos de forma segura para permitir a sincronização, associados apenas à sua empresa.</li>
        </ul>
      </Section>

      <Section titulo="2. Como usamos os dados do Google">
        <p>
          Quando você conecta o seu Gmail, acessamos os seus emails recentes <strong>exclusivamente para
          processá-los com IA</strong> e te devolver um resumo executivo — prioridades, ações e
          decisões. O acesso é de <strong>leitura apenas</strong> (scope{" "}
          <code className="rounded bg-black/8 px-1">gmail.readonly</code>). Nunca enviamos, alteramos
          nem apagamos emails.
        </p>
        <p className="mt-3">
          O conteúdo dos emails é processado em memória no momento da sincronização. Salvamos o
          resultado do processamento (o resumo) na sua conta; não mantemos cópias persistentes das
          mensagens originais para além do necessário ao processamento.
        </p>
      </Section>

      <Section titulo="3. Limited Use (Política de Uso Limitado do Google)">
        <p className="rounded-lg border border-black/10 bg-black/[0.02] p-4">
          A utilização e transferência, pelo TeamAgents, de informação recebida das APIs do Google
          obedece à{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-brand underline"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , incluindo os requisitos de Uso Limitado (Limited Use). Em concreto: não usamos os dados
          do Gmail para publicidade; não os vendemos; não os transferimos para terceiros exceto para
          operar ou melhorar o serviço com o seu consentimento, por motivos de segurança, ou quando
          exigido por lei; e não permitimos que humanos leiam os dados salvo com o seu consentimento
          explícito, para segurança, ou quando exigido por lei.
        </p>
      </Section>

      <Section titulo="4. Compartilhamento e processadores">
        <p>
          Não vendemos dados pessoais. Para operar o serviço, recorremos a fornecedores de
          infraestrutura e de IA que processam dados em nosso nome: Supabase (banco de dados),
          Render (backend), Vercel (frontend) e Anthropic (modelos de IA, para gerar os resumos).
          Estes fornecedores estão sujeitos a obrigações de confidencialidade e segurança.
        </p>
      </Section>

      <Section titulo="5. Retenção e remoção">
        <p>
          Mantemos os dados enquanto a sua conta estiver ativa. Você pode <strong>desligar o Gmail</strong>{" "}
          a qualquer momento em Configurações → Email, o que apaga os tokens salvos. Você também pode
          revogar o acesso diretamente em{" "}
          <a href="https://myaccount.google.com/permissions" className="text-brand underline" target="_blank" rel="noreferrer">
            myaccount.google.com/permissions
          </a>
          . Para apagar a sua conta e dados associados, entre em contato.
        </p>
      </Section>

      <Section titulo="6. Segurança">
        <p>
          Usamos conexões criptografadas (HTTPS) e armazenamento de credenciais isolado por empresa.
          Apesar dos nossos esforços, nenhum sistema é 100% seguro; comunique-nos qualquer
          preocupação de segurança.
        </p>
      </Section>

      <Section titulo="7. Contato">
        <p>
          Dúvidas sobre privacidade? Escreva para{" "}
          <a href="mailto:bitzensoftware@bitzen.app" className="text-brand underline">
            bitzensoftware@bitzen.app
          </a>
          .
        </p>
      </Section>
    </main>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-black">{titulo}</h2>
      {children}
    </section>
  );
}
