from pydantic import BaseModel, ConfigDict


class InstallerBase(BaseModel):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    regions: str | None = None
    can_install: bool = False
    can_deliver: bool = False
    can_store: bool = False
    notes: str | None = None


class InstallerCreate(InstallerBase):
    pass


class InstallerUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    regions: str | None = None
    can_install: bool | None = None
    can_deliver: bool | None = None
    can_store: bool | None = None
    notes: str | None = None


class InstallerRead(InstallerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
