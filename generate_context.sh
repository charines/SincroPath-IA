#!/bin/bash

# Nome do arquivo de saída
OUTPUT="projeto_full_context.txt"

# Limpa o arquivo se já existir
> $OUTPUT

echo "Gerando contexto do projeto em $OUTPUT..."
echo "==========================================" >> $OUTPUT
echo "ESTRUTURA DE DIRETÓRIOS:" >> $OUTPUT
# Substituí o comando 'tree' (que não é nativo) por 'find' formatado para lista.
find . -not -path "*/.*" -not -path "*/node_modules*" -not -path "*/venv*" -not -path "*/dist*" -not -path "*/__pycache__*" | sort >> $OUTPUT
echo "==========================================" >> $OUTPUT

# Percorre os arquivos com profundidade aumentada removendo limitadores que escondiam componentes
find . -not -path "*/.*" -not -path "*/node_modules*" -not -path "*/venv*" -not -path "*/dist*" -not -path "*/__pycache__*" | grep -E '\.(ts|tsx|js|jsx|json|py|txt|sql|env\.example|css|md)$' | while read -r file; do
    
    # Ignora binários, scripts de build, e lockfiles que asfixiam o contexto do LLM
    if [[ "$file" == *"$OUTPUT"* ]] || \
       [[ "$file" == *"generate_context.sh"* ]] || \
       [[ "$file" == *"package-lock.json"* ]] || \
       [[ "$file" == *"projeto_full_log"* ]]; then
        continue
    fi

    echo "FILE: $file" >> $OUTPUT
    echo "------------------------------------------" >> $OUTPUT
    cat "$file" >> $OUTPUT
    echo -e "\n------------------------------------------\n" >> $OUTPUT
done

echo "Concluído! O contexto limpo e estruturado já pode ser submetido às IAs em $OUTPUT."