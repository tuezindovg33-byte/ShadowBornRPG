// ===================================================================
// Conta do jogador: cadastro, login, perfil e (se for admin) gestão de
// usuários — tudo falando com o backend Google Apps Script.
// ===================================================================

// Cole aqui a URL do seu Apps Script (termina em /exec) depois de implantar.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXQqmh6LTLktdQ7JfgAkawNBHLpZpGD_ezwxDQyZdRnIzXcjy2pDt6myycqqX1DtqU-g/exec";

const SESSION_KEY = "jogoDeLuta_session_v1";

function isBackendConfigured() {
    return typeof APPS_SCRIPT_URL === "string" && APPS_SCRIPT_URL.trim().length > 0;
}

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function persistSession() {
    try {
        if (currentUser) {
            // 🔥 NUNCA SALVA A SENHA NO LOCALSTORAGE
            const userToSave = {
                id: currentUser.id,
                nome: currentUser.nome,
                email: currentUser.email,
                role: currentUser.role,
                moedas: currentUser.moedas,
                dadosJogo: currentUser.dadosJogo
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(userToSave));
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    } catch (e) {
        console.error("Não foi possível salvar a sessão:", e);
    }
}

let currentUser = loadSession();

// Envia uma ação para o backend.
async function apiCall(action, payload) {
    if (!isBackendConfigured()) {
        return { sucesso: false, mensagem: "O backend ainda não foi conectado. (Configure APPS_SCRIPT_URL em js/account.js)" };
    }
    try {
        // 🔥 NUNCA ENVIA A SENHA EM LOG
        const payloadToSend = { ...payload };
        if (payloadToSend.senha) {
            payloadToSend.senha = "********"; // 🔥 MASCARA A SENHA NO LOG
        }
        console.log(`📤 Enviando ação: ${action}`, payloadToSend);
        
        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(Object.assign({ action }, payload)),
            redirect: "follow"
        });
        const raw = await res.text();
        if (!res.ok) {
            console.error("Backend HTTP", res.status, raw);
            return { sucesso: false, mensagem: `Servidor respondeu HTTP ${res.status}. Atualize a implantação do Apps Script.` };
        }
        try { return JSON.parse(raw); }
        catch (e) {
            console.error("Resposta não-JSON do backend:", raw);
            return { sucesso: false, mensagem: "O Web App não devolveu JSON. Verifique a implantação /exec e as permissões." };
        }
    } catch (err) {
        console.error("Erro de rede ao falar com o backend:", err);
        return { sucesso: false, mensagem: "Não foi possível conectar ao servidor. Verifique sua internet." };
    }
}

// Aplica o perfil vindo do servidor ao estado local do jogo
function applyServerProfileToLocalState(profile) {
    if (!profile) return;
    if (typeof profile.moedas === "number") saveData.coins = profile.moedas;
    if (profile.dadosJogo && profile.dadosJogo.levels) {
        saveData.levels = Object.assign({ health: 0, damage: 0, speed: 0 }, profile.dadosJogo.levels);
    }
    persistSave();
    if (typeof updateWalletDisplays === "function") updateWalletDisplays();
}

let syncTimeout = null;
function scheduleProgressSync() {
    if (!currentUser || !isBackendConfigured()) return;
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        apiCall("salvarProgresso", {
            userID: currentUser.id,
            moedas: saveData.coins,
            dadosJogo: { levels: saveData.levels }
        });
    }, 1500);
}

// ---- Cadastro / Login / Logout ----

async function doRegister() {
    const nome = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const senha = document.getElementById("register-password").value;
    const errorEl = document.getElementById("register-error");
    errorEl.textContent = "";

    if (!nome || !email || !senha) {
        errorEl.textContent = "Preenche todos os campos!";
        return;
    }

    if (senha.length < 4) {
        errorEl.textContent = "A senha deve ter pelo menos 4 caracteres!";
        return;
    }

    const submitBtn = document.getElementById("register-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Cadastrando...";

    try {
        // 🔥 NUNCA LOG A SENHA
        console.log("📝 Tentando cadastrar:", { nome, email, senha: "********" });
        
        const res = await apiCall("cadastro", { nome, email, senha });

        submitBtn.disabled = false;
        submitBtn.textContent = "Criar Conta";

        if (!res.sucesso) {
            errorEl.textContent = res.mensagem;
            return;
        }

        // 🔥 NUNCA ARMAZENA A SENHA
        currentUser = res.dados;
        // Remove qualquer campo de senha que possa vir do backend
        if (currentUser.senha) delete currentUser.senha;
        if (currentUser.Senha) delete currentUser.Senha;
        if (currentUser.senhaHash) delete currentUser.senhaHash;
        
        persistSession();
        applyServerProfileToLocalState(res.dados);
        syncAccountUI();
        showProfile();
        
        console.log("✅ Cadastro realizado com sucesso para:", email);
        
    } catch (err) {
        console.error("❌ Erro no cadastro:", err);
        errorEl.textContent = "Erro ao cadastrar. Tente novamente.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Criar Conta";
    }
}

async function doLogin() {
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");
    errorEl.textContent = "";

    if (!email || !senha) {
        errorEl.textContent = "Preenche email e senha!";
        return;
    }

    const submitBtn = document.getElementById("login-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Entrando...";

    try {
        // 🔥 NUNCA LOG A SENHA
        console.log("🔑 Tentando login:", { email, senha: "********" });
        
        const res = await apiCall("login", { email, senha });

        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar";

        if (!res.sucesso) {
            errorEl.textContent = res.mensagem;
            return;
        }

        // 🔥 NUNCA ARMAZENA A SENHA
        currentUser = res.dados;
        // Remove qualquer campo de senha que possa vir do backend
        if (currentUser.senha) delete currentUser.senha;
        if (currentUser.Senha) delete currentUser.Senha;
        if (currentUser.senhaHash) delete currentUser.senhaHash;
        
        persistSession();
        applyServerProfileToLocalState(res.dados);
        syncAccountUI();
        showProfile();
        
        console.log("✅ Login realizado com sucesso para:", email);
        
    } catch (err) {
        console.error("❌ Erro no login:", err);
        errorEl.textContent = "Erro ao fazer login. Tente novamente.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar";
    }
}

function doLogout() {
    currentUser = null;
    persistSession();
    syncAccountUI();
    showTitle();
    console.log("👋 Logout realizado");
}

// Mostra/esconde o botão de Admin e o texto "Entrar"/nome do jogador no menu
function syncAccountUI() {
    const accountBtn = document.getElementById("account-btn-menu");
    const adminBtn = document.getElementById("admin-btn-menu");

    if (accountBtn) {
        accountBtn.textContent = currentUser ? `👤 ${currentUser.nome}` : "👤 Entrar / Cadastrar";
    }
    if (adminBtn) {
        adminBtn.classList.toggle("hidden", !(currentUser && currentUser.role === "admin"));
    }
}

function renderProfile() {
    const el = document.getElementById("profile-content");
    if (!el) return;

    if (!currentUser) {
        el.innerHTML = '<p class="admin-empty-note">Você não está logado.</p>';
        return;
    }

    // 🔥 NUNCA MOSTRA A SENHA NO PERFIL
    el.innerHTML = `
        <div class="profile-avatar">${currentUser.role === "admin" ? "👑" : "👤"}</div>
        <h3>${currentUser.nome}</h3>
        <p class="profile-email">${currentUser.email}</p>
        ${currentUser.role === "admin" ? '<span class="admin-tag admin-tag-gold">Administrador</span>' : ""}
        <div class="profile-stat"><span class="hud-icon">🪙</span> ${saveData.coins} moedas</div>
        <p class="profile-note">Seu progresso (moedas e upgrades) fica salvo na nuvem e sincroniza em qualquer aparelho que você entrar com essa conta.</p>
    `;
}

// ---- Painel de Admin: gestão de usuários ----

async function renderAdminUsersList() {
    const el = document.getElementById("admin-users-list");
    if (!el || !currentUser) return;
    el.innerHTML = '<p class="admin-empty-note">Carregando...</p>';

    try {
        const res = await apiCall("listarUsuarios", { adminID: currentUser.id });

        if (!res.sucesso) {
            el.innerHTML = `<p class="admin-empty-note">${res.mensagem}</p>`;
            return;
        }

        if (!res.dados || res.dados.length === 0) {
            el.innerHTML = '<p class="admin-empty-note">Nenhum usuário cadastrado.</p>';
            return;
        }

        el.innerHTML = "";
        res.dados.forEach(u => {
            const row = document.createElement("div");
            row.className = "admin-list-item";
            row.innerHTML = `
                <div class="admin-list-info">
                    <strong>${u.role === "admin" ? "👑 " : ""}${u.nome}</strong>
                    <span>${u.email} · 🪙 ${u.moedas}</span>
                </div>
                <button class="btn btn-ghost admin-grant-btn" data-id="${u.id}">+50🪙</button>
                <button class="btn btn-ghost admin-toggle-role-btn" data-id="${u.id}" data-role="${u.role}">${u.role === "admin" ? "Rebaixar" : "Promover"}</button>
            `;
            el.appendChild(row);
        });

        el.querySelectorAll(".admin-grant-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = "...";
                    await apiCall("concederMoedas", { 
                        adminID: currentUser.id, 
                        targetID: btn.dataset.id, 
                        quantidade: 50 
                    });
                    renderAdminUsersList();
                } catch (err) {
                    console.error("❌ Erro ao conceder moedas:", err);
                    btn.disabled = false;
                    btn.textContent = "+50🪙";
                }
            });
        });

        el.querySelectorAll(".admin-toggle-role-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = "...";
                    const novoRole = btn.dataset.role === "admin" ? "user" : "admin";
                    await apiCall("promoverAdmin", { 
                        adminID: currentUser.id, 
                        targetID: btn.dataset.id, 
                        novoRole 
                    });
                    renderAdminUsersList();
                } catch (err) {
                    console.error("❌ Erro ao promover/rebaixar:", err);
                    btn.disabled = false;
                    btn.textContent = btn.dataset.role === "admin" ? "Rebaixar" : "Promover";
                }
            });
        });
        
    } catch (err) {
        console.error("❌ Erro ao carregar lista de usuários:", err);
        el.innerHTML = '<p class="admin-empty-note">Erro ao carregar usuários.</p>';
    }
}

// ---- Funções auxiliares para limpar dados sensíveis ----

function clearSensitiveData() {
    // 🔥 Limpa qualquer dado sensível da memória
    if (currentUser) {
        if (currentUser.senha) delete currentUser.senha;
        if (currentUser.Senha) delete currentUser.Senha;
        if (currentUser.senhaHash) delete currentUser.senhaHash;
        if (currentUser.Salt) delete currentUser.Salt;
        persistSession();
    }
}

// 🔥 Chama a limpeza ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    clearSensitiveData();
    console.log("🔒 Dados sensíveis limpos da memória");
});

// 🔥 Limpa campos de senha após o uso
function clearPasswordFields() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach(field => {
        field.value = '';
    });
}

// 🔥 Adiciona limpeza após cadastro e login
const originalDoRegister = doRegister;
doRegister = async function() {
    await originalDoRegister();
    clearPasswordFields();
};

const originalDoLogin = doLogin;
doLogin = async function() {
    await originalDoLogin();
    clearPasswordFields();
};

console.log("🔒 Sistema de segurança ativado - Senhas protegidas");