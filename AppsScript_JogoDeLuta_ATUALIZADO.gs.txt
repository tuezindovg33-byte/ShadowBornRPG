/**

 * BACKEND - Jogo de Luta

 * SEM SENHA EM TEXTO PURO

 * + Fases e NPCs (bosses) criados pelo Admin, salvos na planilha

 *   e visíveis pra todo mundo que jogar.

 */



const SHEET_NAME = 'Usuarios';

const SHEET_FASES = 'Fases';

const SHEET_NPCS = 'NpcTypes';
const SHEET_BOSSES = 'Bosses';

const ADMIN_EMAIL = 'tuezindovg33@gmail.com';



// ================= CONFIGURAÇÃO DA PLANILHA =================
// Rode configurarPlanilhaAtual() UMA VEZ no editor do Apps Script se este
// projeto estiver vinculado à planilha. Para projeto independente, rode
// configurarPlanilhaPorId("ID_DA_PLANILHA").
const PROP_PLANILHA_ID = 'SHADOWBORN_SPREADSHEET_ID';

function configurarPlanilhaAtual() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Nenhuma planilha ativa. Use configurarPlanilhaPorId("ID_DA_PLANILHA").');
  PropertiesService.getScriptProperties().setProperty(PROP_PLANILHA_ID, ss.getId());
  Logger.log('Planilha configurada: ' + ss.getName() + ' | ' + ss.getId());
  return ss.getId();
}

function configurarPlanilhaPorId(id) {
  if (!id) throw new Error('Informe o ID da planilha.');
  const ss = SpreadsheetApp.openById(String(id).trim());
  PropertiesService.getScriptProperties().setProperty(PROP_PLANILHA_ID, ss.getId());
  Logger.log('Planilha configurada: ' + ss.getName() + ' | ' + ss.getId());
  return ss.getId();
}

function getSpreadsheetJogo() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(PROP_PLANILHA_ID);
  if (id) return SpreadsheetApp.openById(id);
  const ativo = SpreadsheetApp.getActiveSpreadsheet();
  if (ativo) {
    props.setProperty(PROP_PLANILHA_ID, ativo.getId());
    return ativo;
  }
  throw new Error('Planilha do ShadowBorn não configurada. Rode configurarPlanilhaPorId("ID_DA_PLANILHA") no Apps Script.');
}

function diagnosticoPlanilha() {
  try {
    const ss = getSpreadsheetJogo();
    const nomeTeste = '_DiagnosticoShadowBorn';
    let sh = ss.getSheetByName(nomeTeste);
    if (!sh) sh = ss.insertSheet(nomeTeste);
    sh.getRange(1,1,1,2).setValues([['UltimoTeste', new Date()]]);
    SpreadsheetApp.flush();
    return { sucesso:true, mensagem:'Escrita na planilha OK', dados:{ planilha:ss.getName(), planilhaId:ss.getId(), url:ss.getUrl() } };
  } catch (err) {
    return { sucesso:false, mensagem:'Falha na planilha: ' + err.message };
  }
}

// ================= FUNÇÕES DE SEGURANÇA =================



function gerarSalt() {

  return Utilities.getUuid() + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 10);

}



function hashSenha(senha, salt) {

  const combined = senha + salt;

  const bytes = Utilities.computeDigest(

    Utilities.DigestAlgorithm.SHA_256,

    combined,

    Utilities.Charset.UTF_8

  );

  return bytes.map(function(b) {

    return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');

  }).join('');

}



function verificarSenha(senha, salt, hashArmazenado) {

  const hashCalculado = hashSenha(senha, salt);

  return hashCalculado === hashArmazenado;

}



// ================= ROTEAMENTO =================



function doGet(e) {

  return criarResposta({

    sucesso: true,

    mensagem: 'API do Jogo de Luta está no ar!'

  });

}



function doPost(e) {

  try {

    if (!e || !e.postData || !e.postData.contents) {

      return criarResposta({ sucesso: false, mensagem: 'Requisição inválida' });

    }



    const data = JSON.parse(e.postData.contents);

    Logger.log('📥 Ação: ' + data.action);



    let resultado;

    switch(data.action) {

      case 'cadastro': resultado = cadastrarUsuario(data); break;

      case 'login': resultado = loginUsuario(data); break;

      case 'obterPerfil': resultado = obterPerfil(data); break;

      case 'salvarProgresso': resultado = salvarProgresso(data); break;

      case 'listarUsuarios': resultado = listarUsuarios(data); break;
      case 'ranking': resultado = obterRanking(data); break;

      case 'concederMoedas': resultado = concederMoedas(data); break;

      case 'promoverAdmin': resultado = promoverAdmin(data); break;

      case 'listarFases': resultado = listarFases(data); break;

      case 'salvarFase': resultado = salvarFase(data); break;

      case 'removerFase': resultado = removerFase(data); break;

      case 'listarNpcs': resultado = listarNpcs(data); break;

      case 'salvarNpc': resultado = salvarNpc(data); break;

      case 'removerNpc': resultado = removerNpc(data); break;
      case 'listarBosses': resultado = listarBosses(data); break;
      case 'salvarBoss': resultado = salvarBoss(data); break;
      case 'removerBoss': resultado = removerBoss(data); break;
      case 'salvarConteudoCompleto': resultado = salvarConteudoCompleto(data); break;
      case 'diagnosticoPlanilha': resultado = diagnosticoPlanilha(); break;

      default: resultado = { sucesso: false, mensagem: 'Ação inválida' };

    }



    return criarResposta(resultado);

  } catch (err) {

    Logger.log('❌ ERRO: ' + err.message);

    return criarResposta({ sucesso: false, mensagem: 'Erro: ' + err.message });

  }

}



// ================= FUNÇÃO DE RESPOSTA COM CORS =================



function criarResposta(conteudo) {
  // ContentService.TextOutput não possui setHeader().
  // Web Apps do Apps Script já entregam a resposta via endpoint /exec.
  return ContentService
    .createTextOutput(JSON.stringify(conteudo))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================= FUNÇÕES DA PLANILHA (USUÁRIOS) =================



function getSheet() {

  try {

    const ss = getSpreadsheetJogo();

    let sheet = ss.getSheetByName(SHEET_NAME);



    const cabecalho = ['ID', 'Nome', 'Email', 'SenhaHash', 'Salt', 'Role', 'Moedas', 'DadosJogo'];



    if (!sheet) {

      sheet = ss.insertSheet(SHEET_NAME);

      sheet.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);

      Logger.log('Planilha criada');

    }



    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {

      sheet.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);

      Logger.log('Cabeçalho adicionado');

    }



    return sheet;

  } catch (err) {

    Logger.log('❌ Erro getSheet: ' + err.message);

    throw err;

  }

}



function colunas() {

  return {

    ID: 0,

    Nome: 1,

    Email: 2,

    SenhaHash: 3,

    Salt: 4,

    Role: 5,

    Moedas: 6,

    DadosJogo: 7

  };

}



// ================= FASES E NPCS =================



function getSheetGenericaConteudo(nome) {

  const cabecalho = ['ID', 'Nome', 'ConfigJSON', 'CriadoPor', 'Data'];

  const ss = getSpreadsheetJogo();

  let sheet = ss.getSheetByName(nome);



  if (!sheet) {

    sheet = ss.insertSheet(nome);

    sheet.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);

  }

  if (sheet.getLastColumn() === 0) {

    sheet.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);

  }



  return sheet;

}



function getSheetFases() { return getSheetGenericaConteudo(SHEET_FASES); }

function getSheetNpcs() { return getSheetGenericaConteudo(SHEET_NPCS); }
function getSheetBosses() { return getSheetGenericaConteudo(SHEET_BOSSES); }



function parseJSONSeguro(txt) {

  try { return JSON.parse(txt); } catch (err) { return {}; }

}



function listarConteudo(sheet) {

  const values = sheet.getDataRange().getValues();

  const resultado = [];

  for (let i = 1; i < values.length; i++) {

    const row = values[i];

    if (!row || !row[0]) continue;

    resultado.push({ id: row[0], nome: row[1], config: parseJSONSeguro(row[2]) });

  }

  return resultado;

}



function salvarConteudo(sheet, data, labelErro) {

  const { adminID, id, nome, config } = data;

  if (!ehAdmin(adminID)) return { sucesso: false, mensagem: 'Acesso negado: você não é administrador.' };

  if (!nome || !config) return { sucesso: false, mensagem: 'Preencha nome e configuração ' + labelErro + '.' };



  const configTxt = JSON.stringify(config);



  if (id) {

    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {

      if (values[i][0] === id) {

        sheet.getRange(i + 1, 2, 1, 2).setValues([[nome, configTxt]]);

        SpreadsheetApp.flush();
        return { sucesso: true, mensagem: 'Atualizado com sucesso!', dados: { id: id, aba: sheet.getName() } };

      }

    }

    return { sucesso: false, mensagem: 'Não encontrado.' };

  }



  const novoId = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  sheet.appendRow([novoId, nome, configTxt, adminID, new Date()]);

  return { sucesso: true, mensagem: 'Criado com sucesso!', dados: { id: novoId } };

}



function removerConteudo(sheet, data) {

  const { adminID, id } = data;

  if (!ehAdmin(adminID)) return { sucesso: false, mensagem: 'Acesso negado: você não é administrador.' };

  if (!id) return { sucesso: false, mensagem: 'ID não fornecido.' };



  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (values[i][0] === id) {

      sheet.deleteRow(i + 1);

      return { sucesso: true, mensagem: 'Removido com sucesso.' };

    }

  }

  return { sucesso: false, mensagem: 'Não encontrado.' };

}



function listarFases(data) {

  try {

    return { sucesso: true, mensagem: 'ok', dados: listarConteudo(getSheetFases()) };

  } catch (err) {

    Logger.log('❌ Erro listarFases: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function salvarFase(data) {

  try {

    return salvarConteudo(getSheetFases(), data, 'da fase');

  } catch (err) {

    Logger.log('❌ Erro salvarFase: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function removerFase(data) {

  try {

    return removerConteudo(getSheetFases(), data);

  } catch (err) {

    Logger.log('❌ Erro removerFase: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function listarNpcs(data) {
  try {
    // Compatibilidade com o jogo atual: retorna NPCs comuns + Bosses.
    const npcs = listarConteudo(getSheetNpcs());
    const bosses = listarConteudo(getSheetBosses());
    return { sucesso: true, mensagem: 'ok', dados: npcs.concat(bosses) };
  } catch (err) {
    Logger.log('❌ Erro listarNpcs: ' + err.message);
    return { sucesso: false, mensagem: 'Erro: ' + err.message };
  }
}

function salvarNpc(data) {
  try {
    // Boss agora ganha aba própria automaticamente.
    const isBoss = !!(data.config && data.config.isBoss);
    return salvarConteudo(isBoss ? getSheetBosses() : getSheetNpcs(), data, isBoss ? 'do Boss' : 'do NPC');
  } catch (err) {
    Logger.log('❌ Erro salvarNpc: ' + err.message);
    return { sucesso: false, mensagem: 'Erro: ' + err.message };
  }
}

function removerNpc(data) {
  try {
    if (!ehAdmin(data.adminID)) return { sucesso: false, mensagem: 'Acesso negado.' };
    // Procura nas duas abas para manter compatibilidade com IDs antigos.
    let r = removerConteudo(getSheetNpcs(), data);
    if (r.sucesso) return r;
    return removerConteudo(getSheetBosses(), data);
  } catch (err) {
    Logger.log('❌ Erro removerNpc: ' + err.message);
    return { sucesso: false, mensagem: 'Erro: ' + err.message };
  }
}

function listarBosses(data) {
  try {
    return { sucesso: true, mensagem: 'ok', dados: listarConteudo(getSheetBosses()) };
  } catch (err) {
    return { sucesso: false, mensagem: 'Erro: ' + err.message };
  }
}

function salvarBoss(data) {
  try {
    data.config = Object.assign({}, data.config || {}, { isBoss: true });
    return salvarConteudo(getSheetBosses(), data, 'do Boss');
  } catch (err) {
    return { sucesso: false, mensagem: 'Erro: ' + err.message };
  }
}

function removerBoss(data) {
  try { return removerConteudo(getSheetBosses(), data); }
  catch (err) { return { sucesso: false, mensagem: 'Erro: ' + err.message }; }
}

// Salva um pacote inteiro de conteúdo em uma única chamada.
// Útil para futuros editores/importadores e garante que Fase/NPC/Boss
// usem exatamente o mesmo formato de persistência.
function salvarConteudoCompleto(data) {
  try {
    if (!ehAdmin(data.adminID)) return { sucesso: false, mensagem: 'Acesso negado.' };
    const resultados = { fases: [], npcs: [], bosses: [] };
    (data.npcs || []).forEach(item => resultados.npcs.push(salvarConteudo(getSheetNpcs(), Object.assign({}, item, { adminID: data.adminID }), 'do NPC')));
    (data.bosses || []).forEach(item => {
      item.config = Object.assign({}, item.config || {}, { isBoss: true });
      resultados.bosses.push(salvarConteudo(getSheetBosses(), Object.assign({}, item, { adminID: data.adminID }), 'do Boss'));
    });
    (data.fases || []).forEach(item => resultados.fases.push(salvarConteudo(getSheetFases(), Object.assign({}, item, { adminID: data.adminID }), 'da fase')));
    SpreadsheetApp.flush();
    return { sucesso: true, mensagem: 'Conteúdo completo salvo.', dados: resultados };
  } catch (err) {
    Logger.log('❌ Erro salvarConteudoCompleto: ' + err.message);
    return { sucesso: false, mensagem: 'Erro: ' + err.message };
  }
}

// ================= USUÁRIOS =================



function cadastrarUsuario(data) {

  try {

    const { nome, email, senha } = data;



    if (!nome || !email || !senha) {

      return { sucesso: false, mensagem: 'Preencha todos os campos' };

    }



    if (senha.length < 4) {

      return { sucesso: false, mensagem: 'Senha deve ter 4+ caracteres' };

    }



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.Email]) {

        if (String(row[col.Email]).toLowerCase() === String(email).toLowerCase()) {

          return { sucesso: false, mensagem: 'Email já cadastrado' };

        }

      }

    }



    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);



    const salt = gerarSalt();

    const senhaHash = hashSenha(senha, salt);



    const role = String(email).toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';



    const newRow = [

      id,

      nome,

      email,

      senhaHash,

      salt,

      role,

      100,

      '{}'

    ];



    sheet.appendRow(newRow);



    return {

      sucesso: true,

      mensagem: 'Cadastro realizado!',

      dados: {

        id: id,

        nome: nome,

        email: email,

        role: role,

        moedas: 100,

        dadosJogo: {}

      }

    };



  } catch (err) {

    Logger.log('❌ Erro cadastro: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function loginUsuario(data) {

  try {

    const { email, senha } = data;



    if (!email || !senha) {

      return { sucesso: false, mensagem: 'Preencha email e senha' };

    }



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (!row || row.length === 0) continue;



      if (String(row[col.Email]).toLowerCase() === String(email).toLowerCase()) {

        const salt = row[col.Salt];

        const hashArmazenado = row[col.SenhaHash];



        if (!salt || !hashArmazenado) {

          return { sucesso: false, mensagem: 'Erro na conta. Contate o suporte.' };

        }



        const senhaValida = verificarSenha(senha, salt, hashArmazenado);



        if (!senhaValida) {

          return { sucesso: false, mensagem: 'Senha incorreta' };

        }



        return {

          sucesso: true,

          mensagem: 'Login realizado!',

          dados: {

            id: row[col.ID],

            nome: row[col.Nome],

            email: row[col.Email],

            role: row[col.Role] || 'user',

            moedas: Number(row[col.Moedas] || 0),

            dadosJogo: JSON.parse(row[col.DadosJogo] || '{}')

          }

        };

      }

    }



    return { sucesso: false, mensagem: 'Usuário não encontrado' };



  } catch (err) {

    Logger.log('❌ Erro login: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function obterPerfil(data) {

  try {

    const { userID } = data;

    if (!userID) return { sucesso: false, mensagem: 'ID não fornecido' };



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.ID] === userID) {

        return {

          sucesso: true,

          mensagem: 'ok',

          dados: {

            id: row[col.ID],

            nome: row[col.Nome],

            email: row[col.Email],

            role: row[col.Role] || 'user',

            moedas: Number(row[col.Moedas] || 0),

            dadosJogo: JSON.parse(row[col.DadosJogo] || '{}')

          }

        };

      }

    }



    return { sucesso: false, mensagem: 'Usuário não encontrado' };

  } catch (err) {

    Logger.log('❌ Erro obterPerfil: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function salvarProgresso(data) {

  try {

    const { userID, moedas, dadosJogo } = data;



    if (!userID) {

      return { sucesso: false, mensagem: 'ID não fornecido' };

    }



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.ID] === userID) {

        rowIndex = i;

        break;

      }

    }



    if (rowIndex === -1) {

      return { sucesso: false, mensagem: 'Usuário não encontrado' };

    }



    if (typeof moedas === 'number') {

      sheet.getRange(rowIndex + 1, col.Moedas + 1).setValue(Math.floor(Math.max(0, moedas)));

    }



    if (dadosJogo) {

      sheet.getRange(rowIndex + 1, col.DadosJogo + 1).setValue(JSON.stringify(dadosJogo));

    }



    return { sucesso: true, mensagem: 'Progresso salvo!' };



  } catch (err) {

    Logger.log('❌ Erro salvarProgresso: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



// ================= RANKING GLOBAL =================
function obterRanking(data) {
  try {
    const sheet=getSheet(), col=colunas(), values=sheet.getDataRange().getValues(), jogadores=[];
    for(let i=1;i<values.length;i++){const row=values[i];if(!row||!row[col.ID])continue;const dados=parseJSONSeguro(row[col.DadosJogo]||'{}');jogadores.push({nome:String(row[col.Nome]||'Caçador'),level:Math.max(1,Number(dados.level||1)||1),moedas:Math.max(0,Number(row[col.Moedas]||0)||0),money:Math.max(0,Number(dados.money||0)||0)});}
    function top(k){return jogadores.slice().sort((a,b)=>Number(b[k]||0)-Number(a[k]||0)).slice(0,100);}
    return {sucesso:true,mensagem:'Ranking atualizado',dados:{level:top('level'),coins:top('moedas'),money:top('money')}};
  } catch(err){return {sucesso:false,mensagem:'Erro no ranking: '+err.message};}
}
// ================= ADMIN =================



function ehAdmin(userID) {

  if (!userID) return false;

  try {

    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.ID] === userID) {

        return String(row[col.Role] || '').toLowerCase() === 'admin';

      }

    }

    return false;

  } catch (err) {

    Logger.log('❌ Erro ehAdmin: ' + err.message);

    return false;

  }

}



function listarUsuarios(data) {

  try {

    const { adminID } = data;



    if (!adminID) {

      return { sucesso: false, mensagem: 'ID do admin não fornecido' };

    }



    if (!ehAdmin(adminID)) {

      return { sucesso: false, mensagem: 'Acesso negado' };

    }



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    const usuarios = [];

    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.ID]) {

        usuarios.push({

          id: row[col.ID],

          nome: row[col.Nome] || '',

          email: row[col.Email] || '',

          role: row[col.Role] || 'user',

          moedas: Number(row[col.Moedas] || 0)

        });

      }

    }



    return { sucesso: true, mensagem: 'Usuários listados', dados: usuarios };



  } catch (err) {

    Logger.log('❌ Erro listarUsuarios: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function concederMoedas(data) {

  try {

    const { adminID, targetID, quantidade } = data;



    if (!adminID || !targetID) {

      return { sucesso: false, mensagem: 'Dados incompletos' };

    }



    if (!ehAdmin(adminID)) {

      return { sucesso: false, mensagem: 'Acesso negado' };

    }



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    let targetRow = -1;

    let moedasAtuais = 0;



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.ID] === targetID) {

        targetRow = i;

        moedasAtuais = Number(row[col.Moedas] || 0);

        break;

      }

    }



    if (targetRow === -1) {

      return { sucesso: false, mensagem: 'Usuário alvo não encontrado' };

    }



    const qtd = Number(quantidade) || 50;

    const novoSaldo = moedasAtuais + qtd;



    sheet.getRange(targetRow + 1, col.Moedas + 1).setValue(novoSaldo);



    return {

      sucesso: true,

      mensagem: qtd + ' moedas concedidas!',

      dados: { novoSaldo: novoSaldo }

    };



  } catch (err) {

    Logger.log('❌ Erro concederMoedas: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



function promoverAdmin(data) {

  try {

    const { adminID, targetID, novoRole } = data;



    if (!adminID || !targetID || !novoRole) {

      return { sucesso: false, mensagem: 'Dados incompletos' };

    }



    if (!ehAdmin(adminID)) {

      return { sucesso: false, mensagem: 'Acesso negado' };

    }



    if (adminID === targetID) {

      return { sucesso: false, mensagem: 'Não pode alterar seu próprio papel' };

    }



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    let targetRow = -1;

    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.ID] === targetID) {

        targetRow = i;

        break;

      }

    }



    if (targetRow === -1) {

      return { sucesso: false, mensagem: 'Usuário alvo não encontrado' };

    }



    sheet.getRange(targetRow + 1, col.Role + 1).setValue(novoRole);



    const mensagem = novoRole === 'admin' ? 'Promovido a administrador!' : 'Rebaixado para usuário comum!';

    return { sucesso: true, mensagem: mensagem };



  } catch (err) {

    Logger.log('❌ Erro promoverAdmin: ' + err.message);

    return { sucesso: false, mensagem: 'Erro: ' + err.message };

  }

}



// ================= CONFIGURAR ADMIN =================



function configurarAdmin() {

  try {

    Logger.log('🚀 Configurando admin...');



    const sheet = getSheet();

    const col = colunas();

    const values = sheet.getDataRange().getValues();



    const adminEmail = ADMIN_EMAIL;

    const adminSenha = 'tuezin3484';



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      if (row && row.length > 0 && row[col.Email]) {

        if (String(row[col.Email]).toLowerCase() === adminEmail.toLowerCase()) {

          sheet.getRange(i + 1, col.Role + 1).setValue('admin');



          if (!row[col.Salt] || !row[col.SenhaHash]) {

            const novoSalt = gerarSalt();

            const novoHash = hashSenha(adminSenha, novoSalt);

            sheet.getRange(i + 1, col.Salt + 1).setValue(novoSalt);

            sheet.getRange(i + 1, col.SenhaHash + 1).setValue(novoHash);

          }



          Logger.log('✅ Admin configurado: ' + adminEmail);

          return;

        }

      }

    }



    const id = 'admin_' + Date.now();

    const salt = gerarSalt();

    const senhaHash = hashSenha(adminSenha, salt);



    const newRow = [

      id,

      'Admin',

      adminEmail,

      senhaHash,

      salt,

      'admin',

      1000,

      '{}'

    ];



    sheet.appendRow(newRow);

    Logger.log('✅ Admin criado!');

    Logger.log('📧 Email: ' + adminEmail);

    Logger.log('🔑 Senha: ' + adminSenha);



  } catch (err) {

    Logger.log('❌ Erro configurarAdmin: ' + err.message);

  }

}