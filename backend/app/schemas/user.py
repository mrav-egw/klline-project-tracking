from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "user"


class UserUpdate(BaseModel):
    username: str | None = None
    full_name: str | None = None
    password: str | None = None
    is_active: bool | None = None
    role: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    full_name: str
    is_active: bool
    role: str
