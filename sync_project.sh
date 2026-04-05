#!/bin/bash

# SincroPath-IA - Script de Governança
OUTPUT="projeto_full_context.txt"
LOG="projeto_full_log.txt"

echo "🚀 Iniciando Sincronização do SincroPath-IA..."

# 1. Atualizar o Log com a nova configuração
echo -e "\n## $(date +'%d/%m/%Y %H:%M') - Atualização de Infraestrutura" >> $LOG
echo "- [x] Migração para OpenAI concluída no Backend." >> $LOG
echo "- [x] Chaves de API isoladas no Backend para maior segurança." >> $LOG
echo "- [x] Configuração de VITE_API_URL no Frontend." >> $LOG

# 2. Gerar o Contexto Completo
echo "📂 Gerando contexto atualizado em $OUTPUT..."
echo "==========================================" > $OUTPUT
echo "ESTRUTURA ATUAL DO PROJETO:" >> $OUTPUT
tree -I "node_modules|.git|dist|venv|__pycache__" >> $OUTPUT
echo "==========================================" >> $OUTPUT

# Buscar arquivos relevantes (Backend e Frontend)
find . -maxdepth 4 -not -path '*/.*' | grep -E '\.(ts|tsx|py|sql|env\.example|txt)$' | while read -r file; do
    if [[ "$file" == *"$OUTPUT"* ]] || [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"venv"* ]]; then
        continue
    fi
    echo "FILE: $file" >> $OUTPUT
    echo "------------------------------------------" >> $OUTPUT
    cat "$file" >> $OUTPUT
    echo -e "\n------------------------------------------\n" >> $OUTPUT
done

echo "✅ Sucesso! O arquivo $OUTPUT e $LOG estão prontos para análise."