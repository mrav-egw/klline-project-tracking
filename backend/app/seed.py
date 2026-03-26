"""
Seed the database with sample data on first startup.
Only runs when there are no customers yet (idempotent).
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cost_entry import CostCategory, CostEntry
from app.models.customer import Customer
from app.models.installer import InstallationPartner
from app.models.project import Project, PurchaseOrder, SalesInvoice
from app.models.supplier import Supplier


async def seed_db(db: AsyncSession) -> None:
    # Only seed if no data exists yet
    result = await db.execute(select(Customer).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    # ── Suppliers ────────────────────────────────────────────────────────────
    suppliers = [
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
        Supplier(code="ALB", name="Alba Seating", contact_person="Export", email="export@albaseating.com",
                 discount_pct=Decimal("42"), payment_terms="Vorauskassa", lead_time="12 Wochen",
                 office_chairs=True, seating=True, lounge=True),
        Supplier(code="VAM", name="Vama Cucine", contact_person="Sales IT", email="sales@vamacucine.it",
                 discount_pct=Decimal("35"), payment_terms="Vorauskassa", lead_time="16 Wochen",
                 kitchens=True),
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
        InstallationPartner(name="Montagetischler David Wolf", contact_person="David Wolf",
                            phone="+43 664 345 6789", city="Innsbruck", regions="Tirol / Vorarlberg",
                            can_install=True, can_deliver=True),
    ]
    for inst in installers:
        db.add(inst)
    await db.flush()

    # ── Customers ────────────────────────────────────────────────────────────
    customers_data = [
        Customer(name="Alicona Imaging GmbH", contact_person="Fr. Müller", email="office@alicona.com", phone="+43 316 123456"),
        Customer(name="Stadt Wien MA60", contact_person="Hr. Berger", email="ma60@wien.gv.at"),
        Customer(name="MacroArray Diagnostics GmbH", contact_person="Fr. Schmidt", email="office@macroarray.at"),
        Customer(name="Iveco Austria GmbH", contact_person="Hr. Huber", phone="+43 1 987 6543"),
        Customer(name="Labor Vidotto", contact_person="Dr. Vidotto", email="labor@vidotto.at"),
        Customer(name="Gemeinde Kaltenbach", contact_person="Bgm. Mair", email="gemeinde@kaltenbach.tirol.gv.at"),
    ]
    for c in customers_data:
        db.add(c)
    await db.flush()

    ali, wien, macro, iveco, labor, kaltenbach = customers_data

    # ── Projects ─────────────────────────────────────────────────────────────
    nar = suppliers[0]
    ste = suppliers[1]
    mdd = suppliers[3]

    # Project 1: Alicona — completed, fully paid
    p1 = Project(name="Alicona Büroausstattung 2025", customer_id=ali.id)
    db.add(p1)
    await db.flush()
    db.add(SalesInvoice(project_id=p1.id, invoice_number="25-00001", invoice_date=date(2025, 1, 15),
                        net_amount=Decimal("18500.00"), noch_zu_fakturieren=Decimal("0"),
                        customer_payment_amount=Decimal("18500.00"), customer_payment_date=date(2025, 2, 14)))
    db.add(PurchaseOrder(project_id=p1.id, supplier_id=nar.id, order_date=date(2024, 12, 10),
                         order_amount=Decimal("9800.00"), supplier_invoice_number="NAR-2025-0044",
                         supplier_invoice_amount=Decimal("9800.00"), klline_paid=True, klline_paid_date=date(2025, 1, 20),
                         delivery_notes="Geliefert KW4", installation_notes="Montiert 22.01.2025"))

    # Project 2: Stadt Wien — partially invoiced
    p2 = Project(name="MA60 Büroumbau Erdgeschoss", customer_id=wien.id)
    db.add(p2)
    await db.flush()
    db.add(SalesInvoice(project_id=p2.id, invoice_number="25-00008", invoice_date=date(2025, 3, 1),
                        net_amount=Decimal("34200.00"), noch_zu_fakturieren=Decimal("12000.00"),
                        customer_payment_amount=Decimal("34200.00"), customer_payment_date=date(2025, 4, 2)))
    db.add(PurchaseOrder(project_id=p2.id, supplier_id=ste.id, order_date=date(2025, 1, 20),
                         order_amount=Decimal("21500.00"), supplier_invoice_number="STE-AT-8871",
                         supplier_invoice_amount=Decimal("21500.00"), klline_paid=True, klline_paid_date=date(2025, 2, 28),
                         delivery_notes="Geliefert in 2 Tranchen", installation_notes="Wunder Montage"))
    db.add(PurchaseOrder(project_id=p2.id, supplier_name_free="Wunder Montage", order_date=date(2025, 3, 5),
                         order_amount=Decimal("2800.00"), klline_paid=True, klline_paid_date=date(2025, 3, 20),
                         installation_notes="Montage komplett"))

    # Project 3: MacroArray — in progress, not yet paid
    p3 = Project(name="MacroArray Laboreinrichtung", customer_id=macro.id)
    db.add(p3)
    await db.flush()
    db.add(SalesInvoice(project_id=p3.id, invoice_number="25-00019", invoice_date=date(2025, 5, 10),
                        net_amount=Decimal("9600.00"), noch_zu_fakturieren=Decimal("4800.00")))
    db.add(PurchaseOrder(project_id=p3.id, supplier_id=mdd.id, order_date=date(2025, 4, 15),
                         order_amount=Decimal("7200.00"), supplier_invoice_number="MDD-AT-2025-112",
                         supplier_invoice_amount=Decimal("7200.00"), klline_paid=False,
                         delivery_notes="Lieferung ausstehend"))

    # Project 4: Iveco — offer phase
    p4 = Project(name="Iveco Showroom Möblierung", customer_id=iveco.id)
    db.add(p4)
    await db.flush()
    db.add(SalesInvoice(project_id=p4.id, noch_zu_fakturieren=Decimal("22000.00")))

    # ── Cost Entries (Vertriebsbericht) ──────────────────────────────────────
    cost_entries = [
        # January 2025
        CostEntry(name="Alicona Imaging GmbH", entry_date=date(2025, 1, 15), invoice_number="25-00001",
                  revenue_net=Decimal("18500.00"), category=CostCategory.REVENUE),
        CostEntry(name="Narbutas – Alicona", entry_date=date(2025, 1, 20), invoice_number="NAR-2025-0044",
                  purchase_cost_net=Decimal("9800.00"), category=CostCategory.PURCHASE),
        CostEntry(name="Lohnkosten 01.2025", entry_date=date(2025, 1, 31),
                  other_costs=Decimal("5240.00"), category=CostCategory.PAYROLL),
        CostEntry(name="Internet / Tel 01.2025", entry_date=date(2025, 1, 31),
                  other_costs=Decimal("100.00"), category=CostCategory.OVERHEAD),
        CostEntry(name="EGW-Anteile 01.2025", entry_date=date(2025, 1, 31),
                  other_costs=Decimal("2000.00"), category=CostCategory.OVERHEAD),
        # March 2025
        CostEntry(name="Stadt Wien MA60", entry_date=date(2025, 3, 1), invoice_number="25-00008",
                  revenue_net=Decimal("34200.00"), category=CostCategory.REVENUE),
        CostEntry(name="Steelcase – MA60", entry_date=date(2025, 2, 28), invoice_number="STE-AT-8871",
                  purchase_cost_net=Decimal("21500.00"), category=CostCategory.PURCHASE),
        CostEntry(name="Wunder Montage – MA60", entry_date=date(2025, 3, 20),
                  purchase_cost_net=Decimal("2800.00"), category=CostCategory.PURCHASE),
        CostEntry(name="Lohnkosten 03.2025", entry_date=date(2025, 3, 31),
                  other_costs=Decimal("5240.00"), category=CostCategory.PAYROLL),
        CostEntry(name="Internet / Tel 03.2025", entry_date=date(2025, 3, 31),
                  other_costs=Decimal("100.00"), category=CostCategory.OVERHEAD),
        # May 2025
        CostEntry(name="MacroArray Diagnostics", entry_date=date(2025, 5, 10), invoice_number="25-00019",
                  revenue_net=Decimal("9600.00"), category=CostCategory.REVENUE),
        CostEntry(name="MDD – MacroArray", entry_date=date(2025, 5, 15), invoice_number="MDD-AT-2025-112",
                  purchase_cost_net=Decimal("7200.00"), category=CostCategory.PURCHASE),
        CostEntry(name="Lohnkosten 05.2025", entry_date=date(2025, 5, 31),
                  other_costs=Decimal("5240.00"), category=CostCategory.PAYROLL),
        CostEntry(name="Internet / Tel 05.2025", entry_date=date(2025, 5, 31),
                  other_costs=Decimal("100.00"), category=CostCategory.OVERHEAD),
    ]
    for e in cost_entries:
        db.add(e)

    await db.commit()
