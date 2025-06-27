from fastapi import FastAPI, Depends, HTTPException, status, Request, Form, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from databases import Database
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timedelta
from fastapi.staticfiles import StaticFiles
from typing import Optional, List
import os
import httpx

# Конфигурация
SECRET_KEY = "lskdlskwijr294t02tj9820c9i2k2oi3jr"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

DATABASE_URL = os.getenv("DATABASE_URL")
IMAGE_PROCESSOR_SERVER_URL = os.getenv("IMAGE_PROCESSOR_SERVER_URL")  


models =['autoencoder_simple',
         'autoencoder_bce',
         'autoencoder_bce_2',
         'autoencoder_ssim']

# Инициализация
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
database = Database(DATABASE_URL)
templates = Jinja2Templates(directory="templates")

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Модели
class User(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("main.html", {"request": request, "models": models})

@app.get("/auth", response_class=HTMLResponse)
async def auth_page(request: Request):
    return templates.TemplateResponse("auth.html", {"request": request})


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    query = "SELECT username FROM ServiceUser WHERE username = :username"
    user = await database.fetch_one(query, values={"username": username})
    if user is None:
        raise credentials_exception
    
    return user

@app.post("/register", response_model=dict)
async def register_user(user: User):
    hashed_password = get_password_hash(user.password)
    query = "INSERT INTO ServiceUser (username, hashed_password) VALUES (:username, :hashed_password)"
    try:
        await database.execute(query, values={
            "username": user.username,
            "hashed_password": hashed_password
        })
        return {"message": "Пользователь успешно зарегистрирован"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Регистрация не удалась: " + str(e)
        )

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    query = "SELECT username, hashed_password FROM ServiceUser WHERE username = :username"
    user = await database.fetch_one(query, values={"username": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=dict)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"]}




@app.post("/process_images")
async def process_images(
    files: List[UploadFile] = File(...),
    model_str: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    if not files:
        raise HTTPException(status_code=400, detail="Не загружено ни одного изображения")

    try:
        async with httpx.AsyncClient() as client:
            form_data = {
                "model_str": model_str
            }
            
            files_to_send = [("files", (file.filename, await file.read(), file.content_type)) for file in files]
            
            response = await client.post(
                IMAGE_PROCESSOR_SERVER_URL + "/denoise",
                files=files_to_send,
                data=form_data
            )
        

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Ошибка сервера обработки изображений: {response.text}"
            )
        

        return JSONResponse(content=response.json())
    
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось подключиться к серверу обработки изображений: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Произошла ошибка: {str(e)}"
        )