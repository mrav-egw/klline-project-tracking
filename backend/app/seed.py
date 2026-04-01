"""
Seed the database with sample data on first startup.
Only runs when there are no customers yet (idempotent).
"""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.installer import InstallationPartner
from app.models.supplier import Supplier


async def seed_db(db: AsyncSession) -> None:
    # Only seed if no data exists yet
    result = await db.execute(select(Customer).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    # ── Suppliers ────────────────────────────────────────────────────────────
    suppliers = [
        Supplier(code="MAR", name="Mayr Schulmöbel", contact_person="Vertrieb AT", email="office@mayr.at",
                 discount_pct=Decimal("43"), payment_terms="30 Tage", lead_time="6 Wochen",
                 work_tables=True, conference_furniture=True, school_furniture=True),
        Supplier(code="NAR", name="Narbutas", contact_person="Vertrieb AT", email="at@narbutas.com",
                 discount_pct=Decimal("50"), payment_terms="30 Tage", lead_time="8 Wochen",
                 work_tables=True, conference_furniture=True, seating=True, lounge=True, office_chairs=True),
        Supplier(code="STE", name="Steelcase", contact_person="Sales", email="sales@steelcase.com",
                 discount_pct=Decimal("45"), payment_terms="30 Tage", lead_time="10 Wochen",
                 work_tables=True, conference_furniture=True, seating=True, office_chairs=True),
        Supplier(code="ROV", name="RovoChair", contact_person="Innendienst", email="order@rovochair.com",
                 discount_pct=Decimal("40"), payment_terms="14 Tage", lead_time="4 Wochen",
                 office_chairs=True, seating=True),
        Supplier(code="MDD", name="MDD", contact_person="Vertrieb", email="info@mdd.eu",
                 discount_pct=Decimal("48"), payment_terms="30 Tage", lead_time="6 Wochen",
                 work_tables=True, conference_furniture=True),
        Supplier(code="MAU", name="MAUL", contact_person="Vertrieb", email="info@maul.de",
                 discount_pct=Decimal("20"), payment_terms="30 Tage", lead_time="2 Wochen",
                 acoustics=True),
    ]
    for s in suppliers:
        db.add(s)
    await db.flush()

    # ── Installation Partners ────────────────────────────────────────────────
    installers = [
        InstallationPartner(name="Montagetischler Andreas Wunder", contact_person="Andreas Wunder",
                            phone="+43 664 123 4567", city="Wien", regions="NÖ / Wien",
                            can_install=True, can_deliver=True),
        InstallationPartner(name="Holzmanufaktur Daniel Führer", contact_person="Daniel Führer",
                            phone="+43 664 234 5678", city="Graz", regions="Steiermark",
                            can_install=True),
        InstallationPartner(name="Bautransmontage GmbH", contact_person="Büro",
                            phone="+43 1 234 5678", city="Wien", regions="Österreich gesamt",
                            can_install=True, can_deliver=True, can_store=True),
    ]
    for inst in installers:
        db.add(inst)
    await db.flush()

    # ── Customers ────────────────────────────────────────────────────────────
    customers_data = [
        Customer(name="Keller Grundbau Ges.m.b.H.", contact_person="Hr. Keller", email="office@keller-grundbau.at", phone="+43 3143 12345"),
        Customer(name="Alicona Imaging GmbH", contact_person="Fr. Müller", email="office@alicona.com", phone="+43 316 123456"),
        Customer(name="Stadt Wien MA60", contact_person="Hr. Berger", email="ma60@wien.gv.at"),
    ]
    for c in customers_data:
        db.add(c)
    await db.flush()

    await db.commit()
