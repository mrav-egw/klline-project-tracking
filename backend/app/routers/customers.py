from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.customer import Customer
from app.models.number_sequence import NumberSequence
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


async def _next_kundennr(db: AsyncSession) -> str:
    result = await db.execute(select(NumberSequence).where(NumberSequence.id == "KU").with_for_update())
    seq = result.scalar_one_or_none()
    if seq is None:
        seq = NumberSequence(id="KU", prefix="", current_value=1031)
        db.add(seq)
        await db.flush()
    seq.current_value += 1
    return f"{seq.prefix}{seq.current_value}"


@router.get("/", response_model=list[CustomerRead])
async def list_customers(
    skip: int = 0, limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Customer).order_by(Customer.name).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    data = body.model_dump()
    if not data.get("kundennr"):
        data["kundennr"] = await _next_kundennr(db)
    customer = Customer(**data)
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    return customer


@router.put("/{customer_id}", response_model=CustomerRead)
async def update_customer(
    customer_id: str,
    body: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    await db.flush()
    await db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    await db.delete(customer)
