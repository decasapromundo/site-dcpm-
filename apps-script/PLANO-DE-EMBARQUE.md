# Formulário do Plano de Embarque: como ligar (cerca de 5 minutos)

A página `plano-de-embarque.html` envia as respostas para um Apps Script do Google. Ele grava cada aluno numa planilha
e manda as respostas organizadas para o seu e-mail. Quem responde pelo e-mail fala direto com o aluno (o "responder" já vai para ele).

## 1. Criar a planilha e colar o código
1. Crie uma planilha nova no Google Sheets com o nome "Plano de Embarque: respostas".
2. Menu **Extensões > Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole todo o arquivo `apps-script/plano-de-embarque.gs`. Salve.

## 2. (Opcional) Escolher o e-mail que recebe
Sem nada configurado, o e-mail vai para a conta Google dona da planilha.
Para mandar para outro endereço: engrenagem **Configurações do projeto > Propriedades do script > Adicionar propriedade**,
nome `EMAIL_AVISO`, valor = o e-mail que deve receber.

## 3. Testar
1. No editor, escolha a função `testar` e clique em **Executar**. Autorize quando pedir (planilha e envio de e-mail).
2. Deve aparecer a aba "Respostas" com uma linha "Teste Formulario" e chegar um e-mail "Plano de Embarque: Teste Formulario".
3. Apague a linha de teste.

## 4. Publicar como app da web
1. **Implantar > Nova implantação > Tipo: App da Web**.
2. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
3. Copie o **URL do app da Web** (termina em `/exec`).

## 5. Ligar o site
No arquivo `plano-de-embarque.html`, troque `COLE_AQUI_O_ENDERECO_DO_APPS_SCRIPT` pelo URL copiado e publique o site.

## Como funciona
- Na etapa 1 (nome, e-mail, WhatsApp) já entra uma linha com status "começou". Assim dá para ver quem abriu e não terminou.
- No envio final, a mesma linha vira "enviado" e o e-mail sai. Um aluno, uma linha.
- O rascunho fica salvo no aparelho do aluno (navegador). Se ele fechar e voltar no mesmo aparelho, continua de onde parou.

## Prévia local (sem Google)
`node apps-script/teste-plano-local.js` e abra http://localhost:8091/plano-de-embarque.html?endpoint=/exec
O código do `.gs` roda de verdade: a planilha vira `saida-plano.jsonl` e o e-mail vira `saida-email-plano.html`.
