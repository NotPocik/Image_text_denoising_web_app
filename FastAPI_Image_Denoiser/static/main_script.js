const API_URL = 'http://localhost:8000';
let selectedFiles = [];

document.addEventListener("DOMContentLoaded", async function() {
    await checkAuthStatus();
    setupEventListeners();
});

async function checkAuthStatus() {
    try {
        const token = localStorage.getItem("access_token");
        if (!token) {
            updateUIForUnauthorized();
            return;
        }

        const response = await fetch(`${API_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateUIForAuthorized(data.username);
        } else {
            localStorage.removeItem("access_token");
            updateUIForUnauthorized();
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        updateUIForUnauthorized();
    }
}

function updateUIForAuthorized(username) {
    document.getElementById("username-display").textContent = username;
    document.getElementById("username-display").classList.remove("hidden");
    document.getElementById("logout-link").classList.remove("hidden");
    document.getElementById("login-link").classList.add("hidden");
    
    // Активируем форму
    document.getElementById("model-select").disabled = false;
    document.getElementById("image-upload").disabled = false;
    document.querySelector(".process-button").disabled = false;
    document.getElementById("auth-warning").classList.add("hidden");
}

function updateUIForUnauthorized() {
    document.getElementById("username-display").classList.add("hidden");
    document.getElementById("logout-link").classList.add("hidden");
    document.getElementById("login-link").classList.remove("hidden");
    
    // Деактивируем форму
    document.getElementById("model-select").disabled = true;
    document.getElementById("image-upload").disabled = true;
    document.querySelector(".process-button").disabled = true;
    document.getElementById("auth-warning").classList.remove("hidden");
}

function setupEventListeners() {
    // Обработчик загрузки файлов
    document.getElementById("image-upload").addEventListener("change", function(e) {
        if (this.files.length > 10) {
            showErrorNotification("Можно загрузить не более 10 файлов");
            this.value = '';
            return;
        }
        
        selectedFiles = Array.from(this.files);
        updateFileList();
    });
    
    // Обработчик отправки формы
    document.getElementById("image-upload-form").addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const model = document.getElementById("model-select").value;
        if (!model) {
            showErrorNotification("Выберите модель обработки");
            return;
        }
        
        if (selectedFiles.length === 0) {
            showErrorNotification("Выберите хотя бы одно изображение");
            return;
        }
        
        await processImages(selectedFiles, model);
    });
}

function updateFileList() {
    const fileListContainer = document.getElementById("file-list");
    fileListContainer.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        return;
    }
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
        
        const fileInfo = document.createElement("div");
        fileInfo.style.display = "flex";
        fileInfo.style.alignItems = "center";
        fileInfo.style.flexGrow = "1";
        
        const fileName = document.createElement("span");
        fileName.className = "file-name";
        fileName.textContent = file.name;
        
        const fileSize = document.createElement("span");
        fileSize.className = "file-size";
        fileSize.textContent = formatFileSize(file.size);
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-file";
        removeBtn.innerHTML = "&times;";
        removeBtn.addEventListener("click", () => removeFile(index));
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileListContainer.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
    document.getElementById("image-upload").value = '';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function processImages(files, model) {
    const resultsContainer = document.getElementById("results-container");
    resultsContainer.innerHTML = '';
    document.querySelector(".results-section").classList.remove("hidden");
    
    const loader = document.createElement("div");
    loader.className = "loader";
    resultsContainer.appendChild(loader);
    loader.style.display = "block";
    
    try {
        const token = localStorage.getItem("access_token");
        if (!token) {
            throw new Error("Требуется авторизация");
        }
        
        const formData = new FormData();
        formData.append("model_str", model);
        
        // Добавляем файлы в FormData
        for (const file of files) {
            formData.append("files", file);
        }
        
        const response = await fetch(`${API_URL}/process_images`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Ошибка при обработке изображений");
        }
        
        const result = await response.json();
        
        // Обрабатываем результаты
        if (result.results && result.results.length > 0) {
            for (let i = 0; i < result.results.length; i++) {
                const item = result.results[i];
                const originalFile = files[i];
                
                if (item.status === "success") {
                    const processedImageUrl = `data:image/png;base64,${item.processed_image}`;
                    const imagePair = createImagePair(originalFile, processedImageUrl);
                    resultsContainer.appendChild(imagePair);
                } else {
                    // Создаем карточку для ошибки
                    const errorCard = createErrorCard(originalFile.name, item.error);
                    resultsContainer.appendChild(errorCard);
                }
            }
        } else {
            throw new Error("Сервер не вернул результатов обработки");
        }
        
        showNotification(`Обработка завершена (${result.results.filter(r => r.status === "success").length}/${files.length} успешно)`);
    } catch (error) {
        console.error("Ошибка обработки:", error);
        showErrorNotification(error.message || "Ошибка при обработке изображений");
    } finally {
        loader.style.display = "none";
    }
}

function createImagePair(originalFile, processedImageUrl) {
    const imagePair = document.createElement("div");
    imagePair.className = "image-pair";
    
    const imageBoxOriginal = document.createElement("div");
    imageBoxOriginal.className = "image-box";
    
    const originalTitle = document.createElement("h3");
    originalTitle.textContent = "Исходное изображение";
    imageBoxOriginal.appendChild(originalTitle);
    
    const originalImg = document.createElement("img");
    originalImg.className = "result-image";
    originalImg.alt = "Исходное изображение";
    originalImg.src = URL.createObjectURL(originalFile);
    imageBoxOriginal.appendChild(originalImg);
    
    const imageBoxProcessed = document.createElement("div");
    imageBoxProcessed.className = "image-box";
    
    const processedTitle = document.createElement("h3");
    processedTitle.textContent = "Обработанное изображение";
    imageBoxProcessed.appendChild(processedTitle);
    
    const processedImg = document.createElement("img");
    processedImg.className = "result-image";
    processedImg.alt = "Обработанное изображение";
    processedImg.src = processedImageUrl;
    imageBoxProcessed.appendChild(processedImg);
    
    const downloadContainer = document.createElement("div");
    downloadContainer.className = "download-container";
    
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "download-button";
    downloadBtn.textContent = "Скачать";
    downloadBtn.addEventListener("click", () => downloadImage(processedImageUrl, originalFile.name));
    downloadContainer.appendChild(downloadBtn);
    
    imageBoxProcessed.appendChild(downloadContainer);
    
    imagePair.appendChild(imageBoxOriginal);
    imagePair.appendChild(imageBoxProcessed);
    
    return imagePair;
}

function createErrorCard(filename, errorMessage) {
    const errorCard = document.createElement("div");
    errorCard.className = "error-card";
    
    const errorTitle = document.createElement("h3");
    errorTitle.textContent = `Ошибка обработки: ${filename}`;
    errorCard.appendChild(errorTitle);
    
    const errorText = document.createElement("p");
    errorText.className = "error-message";
    errorText.textContent = errorMessage;
    errorCard.appendChild(errorText);
    
    return errorCard;
}

function downloadImage(base64Data, originalName) {
    try {
        // Создаем временную ссылку для скачивания
        const link = document.createElement("a");
        link.href = base64Data;
        link.download = `denoised_${originalName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Ошибка скачивания:", error);
        showErrorNotification("Ошибка при скачивании изображения");
    }
}

function logout() {
    localStorage.removeItem("access_token");
    window.location.href = "/";
}

function login() {
    window.location.href = "/auth";
}

// Отображение уведомления
function showNotification(message) {
    const notificationContainer = document.getElementById('notifications-container');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showErrorNotification(message) {
    const notificationContainer = document.getElementById('notifications-container');
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}