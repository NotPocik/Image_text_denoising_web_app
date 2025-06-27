const API_URL = 'http://127.0.0.1:8000';

// Переключение между формами логина и регистрации
function toggleForms() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const formTitle = document.getElementById("form-title");

    if (loginForm.classList.contains("hidden")) {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        formTitle.textContent = "Вход";
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
        formTitle.textContent = "Регистрация";
    }
}

// Отображение сообщений
function displayMessage(message) {
    let messageElement = document.getElementById("message");
    if (!messageElement) {
        messageElement = document.createElement("p");
        messageElement.id = "message";
        document.querySelector(".container").appendChild(messageElement);
    }
    messageElement.textContent = message;
}

// Обработка формы регистрации
document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = event.target.username.value;
    const password = event.target.password.value;

    if (password.length < 8){
        displayMessage("Пароль должен иметь не менее 8 символов");
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (response.ok) {
            displayMessage("Регистрация прошла успешно!");
            toggleForms();
        } else {
            displayMessage(`Ошибка регистрации: ${data.detail}`);
        }
    } catch (error) {
        displayMessage("Сетевая ошибка: " + error.message);
    }
});



document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = event.target.username.value;
    const password = event.target.password.value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("access_token", data.access_token);
            displayMessage("Вы успешно зашли в систему!");
            
            window.location.href = "/";
        } else {
            displayMessage(`Authorization error: ${data.detail}`);
        }
    } catch (error) {
        console.error("Сетевая ошибка:", error);
        displayMessage("Сетевая ошибка: " + error.message);
    }
});

