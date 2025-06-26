import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import tensorflow as tf
from keras.models import load_model
from PIL import Image
import numpy as np
import io
import cv2
from typing import List
import base64
from pathlib import Path

app = FastAPI()

models = None

def ssim_loss(y_true, y_pred):
    return 1 - tf.reduce_mean(tf.image.ssim(y_true, y_pred, max_val=1.0))

@app.on_event("startup")
async def load_models_on_startup():
    global models 
    models = {
        "autoencoder_simple": load_model('autoencoder_simple.keras'),
        "autoencoder_bce": load_model('autoencoder_bce.keras'),
        "autoencoder_bce_2": load_model('autoencoder_bce_2.keras'),
        "autoencoder_ssim": load_model(
        'autoencoder_ssim.keras',
        custom_objects={'Custom>ssim_loss': ssim_loss}
    )
    }

def denoise_image(img_bytes, model, target_size=(540, 540)):
    try:
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
        
        img = cv2.resize(img, target_size)
        img = img.astype('float32') / 255.0
        images = np.array([img])
        
        denoised = model.predict(images)
        
        denoised_img = (denoised[0] * 255).clip(0, 255).astype(np.uint8)
        
        return denoised_img
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки изображения: {str(e)}")

@app.post("/denoise")
async def denoise_images(files: List[UploadFile] = File(...), model_str: str = Form(None)):
    if not files:
        raise HTTPException(status_code=400, detail="Не загружено ни одного изображения")
    if model_str not in models.keys():
        raise HTTPException(status_code=400, detail="Модель выбрана некорректно")
    
    results = []
    
    for file in files:
        if not file.content_type.startswith('image/'):
            results.append({
                "filename": file.filename,
                "error": "Файл не является изображением"
            })
            continue
        
        try:
            contents = await file.read()
            
            denoised_img = denoise_image(contents, models[model_str])
            
            # Конвертация в base64 для JSON
            _, img_encoded = cv2.imencode('.png', denoised_img)
            img_base64 = base64.b64encode(img_encoded).decode('utf-8')

            
            original_path = Path(file.filename)
            new_filename = f"{original_path.stem}_denoised.png"
            
            results.append({
                "filename": new_filename,
                "processed_image": img_base64,
                "status": "success"
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e),
                "status": "failed"
            })
    
    return JSONResponse(content={"results": results})
