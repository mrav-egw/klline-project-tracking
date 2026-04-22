"""
One-off script to import customers from a CSV file.

Usage (locally):
  python -m app.scripts.import_customers /path/to/contacts.csv

Usage (in OpenShift via oc):
  # 1. Copy the CSV to the pod
  POD=$(oc -n klline get pod -l app=backend -o jsonpath='{.items[0].metadata.name}')
  oc -n klline cp contacts.csv $POD:/tmp/contacts.csv
  # 2. Run the script
  oc -n klline exec $POD -- python -m app.scripts.import_customers /tmp/contacts.csv

The script:
- Reads the semicolon-separated CSV with German column headers
- Groups by Organisation name (merges duplicate rows)
- Maps fields: Organisation->name, Strasse->address, PLZ->postal_code, etc.
- Combines Titel + Vorname + Nachname into contact_person
- Skips rows with empty Organisation
- Updates existing customers by Organisation name (idempotent)
- Auto-creates the KU number sequence and bumps it past the highest imported kundennr
"""
import asyncio
import csv
import sys
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.customer import Customer
from app.models.number_sequence import NumberSequence


def _clean(v: str | None) -> str | None:
    if v is None:
        return None
    s = v.strip().strip('"')
    return s if s else None


def _build_contact_person(titel: str | None, vorname: str | None, nachname: str | None) -> str | None:
    parts = [p for p in (titel, vorname, nachname) if p]
    return " ".join(parts) if parts else None


def _read_csv(path: str) -> list[dict[str, Any]]:
    """Read CSV and group by Organisation, merging duplicates."""
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";", quotechar='"')
        rows = list(reader)

    # Group by Organisation, prefer rows with more data
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        org = _clean(row.get("Organisation"))
        if not org:
            continue

        existing = grouped.get(org)
        if existing is None:
            grouped[org] = row
        else:
            # Merge: keep existing, only fill in fields that are empty
            for key, value in row.items():
                if not _clean(existing.get(key)) and _clean(value):
                    existing[key] = value

    return list(grouped.values())


def _row_to_customer_data(row: dict[str, Any]) -> dict[str, Any]:
    """Map a CSV row to Customer model fields."""
    return {
        "kundennr": _clean(row.get("Kunden-Nr.")),
        "name": _clean(row.get("Organisation")),
        "contact_person": _build_contact_person(
            _clean(row.get("Titel")),
            _clean(row.get("Vorname")),
            _clean(row.get("Nachname")),
        ),
        "email": _clean(row.get("E-Mail")),
        "phone": _clean(row.get("Telefon")),
        "mobil": _clean(row.get("Mobil")),
        "webseite": _clean(row.get("Webseite")),
        "address": _clean(row.get("Strasse")),
        "postal_code": _clean(row.get("PLZ")),
        "city": _clean(row.get("Ort")),
        "country": _clean(row.get("Land")) or "Österreich",
        "customer_ust_id": _clean(row.get("Umsatzsteuer-ID")),
        "notes": _clean(row.get("Beschreibung")),
        "payment_terms_days": _parse_int(row.get("Zahlungsziel Tage")),
    }


def _parse_int(v: Any) -> int | None:
    s = _clean(v)
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


async def _bump_sequence(db: AsyncSession, max_kundennr: int) -> None:
    """Bump the KU sequence past the highest imported kundennr."""
    result = await db.execute(select(NumberSequence).where(NumberSequence.id == "KU"))
    seq = result.scalar_one_or_none()
    if seq is None:
        seq = NumberSequence(id="KU", prefix="", current_value=max_kundennr)
        db.add(seq)
    elif seq.current_value < max_kundennr:
        seq.current_value = max_kundennr


async def import_csv(csv_path: str) -> None:
    rows = _read_csv(csv_path)
    print(f"Read {len(rows)} unique organisations from CSV")

    created = 0
    updated = 0
    skipped = 0
    max_kundennr = 0

    async with AsyncSessionLocal() as db:
        for row in rows:
            data = _row_to_customer_data(row)
            if not data["name"]:
                skipped += 1
                continue

            # Track highest kundennr for sequence bumping
            try:
                if data["kundennr"]:
                    n = int(data["kundennr"])
                    if n > max_kundennr:
                        max_kundennr = n
            except ValueError:
                pass

            # Check if customer exists by name
            existing_q = await db.execute(select(Customer).where(Customer.name == data["name"]))
            existing = existing_q.scalar_one_or_none()

            if existing:
                # Update only fields that are empty on the existing record
                for k, v in data.items():
                    if v and not getattr(existing, k):
                        setattr(existing, k, v)
                updated += 1
            else:
                # Strip None values so model defaults kick in
                clean_data = {k: v for k, v in data.items() if v is not None}
                customer = Customer(**clean_data)
                db.add(customer)
                created += 1

        if max_kundennr > 0:
            await _bump_sequence(db, max_kundennr)
            print(f"Bumped KU sequence to {max_kundennr}")

        await db.commit()

    print(f"Done. Created: {created}, Updated: {updated}, Skipped: {skipped}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.scripts.import_customers <csv_path>")
        sys.exit(1)
    asyncio.run(import_csv(sys.argv[1]))
