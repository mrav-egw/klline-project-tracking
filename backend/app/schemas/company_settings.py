from pydantic import BaseModel, ConfigDict


class CompanySettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_name: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    web: str | None = None
    fn_nr: str | None = None
    ust_id: str | None = None
    amtsgericht: str | None = None
    geschaeftsfuehrung: str | None = None
    bank_name: str | None = None
    iban: str | None = None
    bic: str | None = None
    logo_base64: str | None = None
    default_payment_terms: str | None = None
    default_greeting: str | None = None


class CompanySettingsUpdate(BaseModel):
    company_name: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    web: str | None = None
    fn_nr: str | None = None
    ust_id: str | None = None
    amtsgericht: str | None = None
    geschaeftsfuehrung: str | None = None
    bank_name: str | None = None
    iban: str | None = None
    bic: str | None = None
    logo_base64: str | None = None
    default_payment_terms: str | None = None
    default_greeting: str | None = None
