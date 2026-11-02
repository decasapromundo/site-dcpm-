# Apps Script do formulário v2: passo a passo (cerca de 5 minutos)

O formulário do site envia as respostas para um Apps Script. Ele grava a linha na planilha e manda o lead ao CRM.
A chave do CRM fica guardada no próprio Apps Script, nunca no site.

Planilha já criada: https://docs.google.com/spreadsheets/d/1QUcx7gfZymjL5rwYZWyHski8g8sNrq8wDvTwSR84pe8/edit
(aba "Respostas", com os cabeçalhos prontos)

## 1. Colar o código
1. Abra a planilha acima. Menu **Extensões > Apps Script**.
2. Apague o conteúdo de `Código.gs` e cole todo o arquivo `apps-script/formulario-v2.gs` deste repositório. Salve.

## 2. Guardar a chave do CRM
1. No Apps Script, clique na engrenagem **Configurações do projeto**.
2. Em **Propriedades do script > Adicionar propriedade**: nome `CRM_URL`, valor = o endereço da integração "Formulário DCPM v2" do CRM
   (o endereço completo está na nota privada da sessão: `side-session-notes/.../crm-formulario-v2.private.txt`; ou veja na tela Integrações do CRM).
3. Salvar propriedades.

## 3. Testar antes de publicar
1. No editor, escolha a função `testar` e clique em **Executar** (autorize quando pedir: planilha e conexão externa).
2. Deve aparecer uma linha nova na planilha com `crm_status` = `ok`, e um contato "Teste Formulario" no CRM.
   Depois apague essa linha de teste.

## 4. Implantar como app da web
1. **Implantar > Nova implantação > Tipo: App da Web**.
2. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
3. Implantar e copiar o **URL do app da Web** (termina em `/exec`).

## 5. Ligar o site
No arquivo `aplicacao.html`, troque `COLE_AQUI_O_ENDERECO_DO_APPS_SCRIPT` pelo URL copiado e publique.
O URL do app não é segredo: sem a chave guardada no Apps Script ele não dá acesso ao CRM.

## Se o CRM falhar
A linha sempre fica na planilha. Na coluna `crm_status` aparece o erro. Para reenviar as que falharam,
execute a função `reenviarFalhas`.

## Se mudar uma regra (perfil, pontuação, opções)
A lógica fica em `aplicacao-regras.js` (usada no site e copiada no fim do `.gs`). Depois de editar, rode:
`sh apps-script/montar.sh` (gera o `formulario-v2.gs` novo), `node apps-script/teste-rotas.js`, e cole o `.gs` de novo no Apps Script (Implantar > Gerenciar implantações > editar > nova versão).

## Prévia local
`CRM_URL="..." node apps-script/teste-local.js` e abra http://localhost:8080/aplicacao?endpoint=http://localhost:8080/exec
(o código do `.gs` roda de verdade; a planilha vira o arquivo `saida-local.jsonl`, que não é versionado).
