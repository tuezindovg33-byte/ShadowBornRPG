# ShadowBorn RPG — Ascensão das Sombras

RPG de ação 2D em HTML5 Canvas / JavaScript, com suporte a desktop e mobile.

## Sistemas atuais
- Combate com katana, inimigos e chefes
- Fases configuráveis e painel administrativo
- Conta, perfil, moedas e progressão persistente
- Arsenal/loja de melhorias
- Progressão RPG por nível e XP
- Atributos: Vigor, Poder e Agilidade
- Missões com objetivos e recompensas
- Controles touch e teclado
- Integração opcional com Google Apps Script / Sheets

## Controles
A/D mover · W pular · Espaço atacar · Esc pausar.

## Observação de segurança
Antes de publicar em produção, o backend deve validar sessões/tokens no servidor e nunca confiar apenas em IDs ou valores de moedas enviados pelo navegador.

## Persistência Google Sheets (v3)
- `Fases`: configuração completa da fase em JSON, incluindo snapshots dos NPCs e do Boss usados.
- `NpcTypes`: NPCs comuns personalizados.
- `Bosses`: bosses personalizados (criada automaticamente pelo Apps Script).
- `Usuarios`: contas e progresso.

Substitua o código da implantação do Google Apps Script pelo arquivo `Code.gs` deste pacote e crie uma **nova implantação** do Web App. Se a URL `/exec` mudar, atualize `APPS_SCRIPT_URL` em `js/account.js`.


## UI V6
Novo hub visual estilo moderno animado azul/preto, responsivo, mantendo os sistemas e persistência da v5.
