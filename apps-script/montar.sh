#!/bin/sh
# Gera formulario-v2.gs (o arquivo para colar no Apps Script) = servidor.gs + aplicacao-regras.js
cd "$(dirname "$0")"
cat servidor.gs ../aplicacao-regras.js > formulario-v2.gs
echo "formulario-v2.gs gerado"
