$(document).ready(function() {
    let token = null;
    const API_URL = "https://ifsp.ddns.net/webservices/lembretes/";
    const TOKEN_EXPIRATION_TIME = 180000; // 3 minutos em milissegundos
    let tokenExpirationTimer = null;

    // Função auxiliar para exibir mensagens de erro
    function showError(message) {
        alert(message);
    }

    // Função auxiliar para exibir mensagens de sucesso
    function showSuccess(message) {
        alert(message);
    }

    // Função para verificar se o token ainda é válido
    function isTokenValid() {
        return token !== null;
    }

    // Função para renovar o token
    function renewToken() {
        if (isTokenValid()) {
            $.ajax({
                url: API_URL + "usuario/renew",
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
                success: function(response) {
                    token = response.token;
                    resetTokenExpirationTimer();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error("Erro ao renovar token:", textStatus, errorThrown);
                    console.error("Resposta do servidor:", jqXHR.responseText);
                    logoutUser(true);
                }
            });
        }
    }

    // Função para reiniciar o timer de expiração do token
    function resetTokenExpirationTimer() {
        if (tokenExpirationTimer) {
            clearTimeout(tokenExpirationTimer);
        }
        tokenExpirationTimer = setTimeout(() => {
            renewToken();
        }, TOKEN_EXPIRATION_TIME - 60000); // Renova 1 minuto antes de expirar
    }

    // Função para fazer logout do usuário
    function logoutUser(isSessionExpired = false) {
        token = null;
        if (tokenExpirationTimer) {
            clearTimeout(tokenExpirationTimer);
        }

        $("#login").show();
        $("#register").show();
        $("#lembretes").hide();

        if (isSessionExpired) {
            showError("Sessão expirada. Faça login novamente.");
        }
    }

    // Função centralizada para tratar erros
    function handleError(jqXHR, textStatus, errorThrown, defaultMessage) {
        console.error(defaultMessage, textStatus, errorThrown);
        console.error("Resposta do servidor:", jqXHR.responseText);

        let errorMessage = defaultMessage;
        if (jqXHR.responseJSON && jqXHR.responseJSON.msg) {
            errorMessage += " " + jqXHR.responseJSON.msg;
        } else if (jqXHR.responseText) {
            errorMessage += " " + jqXHR.responseText;
        } else {
            errorMessage += " " + textStatus;
        }

        showError(errorMessage);
    }

    // Cadastro de usuário
    $("#registerForm").submit(function(e) {
        e.preventDefault();
        const username = $("#username").val();
        const password = $("#password").val();

        $.ajax({
            url: API_URL + "usuario/signup",
            method: "POST",
            data: JSON.stringify({ login: username, senha: password }),
            contentType: "application/json",
            success: function(response) {
                console.log("Usuário cadastrado com sucesso!", response);
                showSuccess("Usuário cadastrado com sucesso!");
                $("#registerForm")[0].reset();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                handleError(jqXHR, textStatus, errorThrown, "Erro ao cadastrar usuário:");
            }
        });
    });

    // Login de usuário
    $("#loginForm").submit(function(e) {
        e.preventDefault();
        const username = $("#loginUsername").val();
        const password = $("#loginPassword").val();

        $.ajax({
            url: API_URL + "usuario/login",
            method: "POST",
            data: JSON.stringify({ login: username, senha: password }),
            contentType: "application/json",
            success: function(response) {
                token = response.token;
                console.log("Login bem-sucedido!", response);
                $("#loginForm")[0].reset();
                $("#login").hide();
                $("#register").hide();
                $("#lembretes").show();
                loadLembretes();
                resetTokenExpirationTimer();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                handleError(jqXHR, textStatus, errorThrown, "Erro ao fazer login:");
            }
        });
    });

    // Carregar lembretes
    function loadLembretes() {
        if (!isTokenValid()) {
            showError("Sessão expirada. Faça login novamente.");
            return;
        }

        $.ajax({
            url: API_URL + "lembrete",
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            success: function(response) {
                console.log("Lembretes carregados com sucesso!", response);
                const lembretesList = $("#lembretesList");
                lembretesList.empty();
                response.forEach(lembrete => {
                    lembretesList.append(`
                        <div class="lembrete" data-id="${lembrete.id}">
                            <span>${lembrete.texto}</span>
                            <button class="edit">Editar</button>
                            <button class="delete">Excluir</button>
                        </div>
                    `);
                });
            },
            error: function(jqXHR, textStatus, errorThrown) {
                handleError(jqXHR, textStatus, errorThrown, "Erro ao carregar lembretes:");
            }
        });
    }

    // Adicionar lembrete
    $("#lembreteForm").submit(function(e) {
        e.preventDefault();
        if (!isTokenValid()) {
            showError("Sessão expirada. Faça login novamente.");
            return;
        }

        const texto = $("#lembreteText").val();

        $.ajax({
            url: API_URL + "lembrete",
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            data: JSON.stringify({ texto: texto }),
            contentType: "application/json",
            success: function(response) {
                console.log("Lembrete adicionado com sucesso!", response);
                loadLembretes();
                $("#lembreteForm")[0].reset();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                handleError(jqXHR, textStatus, errorThrown, "Erro ao adicionar lembrete:");
            }
        });
    });

    // Excluir lembrete
    $("#lembretesList").on("click", ".delete", function() {
        if (!isTokenValid()) {
            showError("Sessão expirada. Faça login novamente.");
            return;
        }

        const id = $(this).parent().data("id");

        $.ajax({
            url: API_URL + `lembrete/${id}`,
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
            success: function(response) {
                console.log("Lembrete excluído com sucesso!", response);
                loadLembretes();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                handleError(jqXHR, textStatus, errorThrown, "Erro ao excluir lembrete:");
            }
        });
    });

    // Editar lembrete
    $("#lembretesList").on("click", ".edit", function() {
        if (!isTokenValid()) {
            showError("Sessão expirada. Faça login novamente.");
            return;
        }

        const id = $(this).parent().data("id");
        const novoTexto = prompt("Digite o novo texto do lembrete:");

        if (novoTexto) {
            $.ajax({
                url: API_URL + `lembrete/${id}`,
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                data: JSON.stringify({ texto: novoTexto }),
                contentType: "application/json",
                success: function(response) {
                    console.log("Lembrete editado com sucesso!", response);
                    loadLembretes();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    handleError(jqXHR, textStatus, errorThrown, "Erro ao editar lembrete:");
                }
            });
        }
    });
});
