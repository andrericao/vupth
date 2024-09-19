#!/bin/bash

#cores
Red='\033[0;31m' 
Green='\033[0;32m'

echo "Favor inserir mensagem de commit: " 
read mensagem_commit

if git add . && git commit -m "$mensagem_commit" 
then
	git push
	echo -e "${Green} Git atualizado com sucesso"
else
	echo -e "${Red} Git não foi atualizado"
fi