"""PDF generation for Angebote and Rechnungen using WeasyPrint."""
from decimal import Decimal

from jinja2 import Template
from weasyprint import HTML

from app.models.angebot import Angebot, AngebotStatus
from app.models.company_settings import CompanySettings
from app.models.customer import Customer
from app.models.rechnung import Rechnung, RechnungType


def _format_eur(value: Decimal | float | int | None) -> str:
    if value is None:
        return "0,00 EUR"
    v = Decimal(str(value)).quantize(Decimal("0.01"))
    sign = "-" if v < 0 else ""
    v = abs(v)
    integer_part = int(v)
    decimal_part = str(v).split(".")[1] if "." in str(v) else "00"
    # Thousands separator
    int_str = f"{integer_part:,}".replace(",", ".")
    return f"{sign}{int_str},{decimal_part} EUR"


def _format_date(d) -> str:
    if d is None:
        return ""
    return d.strftime("%d.%m.%Y")


def _format_qty(v: Decimal) -> str:
    if v == int(v):
        return f"{int(v)},00"
    return str(v).replace(".", ",")


TEMPLATE = Template(r"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 35mm 20mm;
    @bottom-center {
      content: element(page-footer);
    }
    @bottom-right {
      content: counter(page) "/" counter(pages);
      font-size: 8pt;
      color: #666;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Liberation Sans', Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #222; line-height: 1.4; }

  .page-footer {
    position: running(page-footer);
    border-top: 1px solid #ccc;
    padding-top: 6pt;
    font-size: 7.5pt;
    color: #666;
  }
  .footer-table { width: 100%; border-collapse: collapse; }
  .footer-table td { vertical-align: top; padding: 0 8pt; font-size: 7.5pt; color: #666; }
  .footer-table td:first-child { padding-left: 0; }
  .footer-table td:last-child { padding-right: 0; text-align: right; }

  .header { margin-bottom: 8mm; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10pt; }
  .header-top .address-side { flex: 1; }
  .header-top .meta-side { flex: 0 0 auto; text-align: right; }
  .logo { max-height: 50pt; max-width: 180pt; margin-bottom: 8pt; }
  .sender-line { font-size: 7pt; color: #888; border-bottom: 0.5pt solid #888; padding-bottom: 2pt; margin-bottom: 8pt; display: inline-block; }
  .address-block { margin-bottom: 5pt; font-size: 10pt; line-height: 1.5; }

  .meta-table { font-size: 9pt; }
  .meta-table td { padding: 1pt 0; }
  .meta-table td:first-child { color: #666; padding-right: 15pt; }
  .meta-table td:last-child { text-align: right; font-weight: 600; }

  .title { font-size: 14pt; font-weight: 700; margin: 25pt 0 12pt 0; clear: both; border-bottom: 1.5pt solid #222; padding-bottom: 6pt; }
  .greeting { margin-bottom: 10pt; font-size: 9.5pt; }

  table.positions { width: 100%; border-collapse: collapse; margin-bottom: 15pt; }
  table.positions th { background: #f5f5f5; border-bottom: 1.5pt solid #ccc; padding: 5pt 6pt; text-align: left; font-size: 8.5pt; font-weight: 700; }
  table.positions th.right { text-align: right; }
  table.positions td { padding: 4pt 6pt; vertical-align: top; border-bottom: 0.5pt solid #eee; font-size: 9pt; }
  table.positions td.right { text-align: right; }
  table.positions td.mono { font-size: 8pt; }

  .group-row td { background: #f9f9f9; font-weight: 700; font-size: 9.5pt; padding: 6pt; border-bottom: 1pt solid #ddd; }
  .desc-detail { font-size: 8pt; color: #666; white-space: pre-line; margin-top: 2pt; }
  .rabatt { font-size: 7.5pt; color: #888; text-align: right; }

  .totals { width: auto; margin-left: auto; margin-right: 0; border-collapse: collapse; margin-bottom: 15pt; }
  .totals td { padding: 3pt 8pt; font-size: 9.5pt; }
  .totals td:last-child { text-align: right; min-width: 100pt; }
  .totals .brutto { font-weight: 700; border-top: 1.5pt solid #222; }
  .totals .brutto td { padding-top: 5pt; font-size: 10.5pt; }

  .section-title { font-size: 12pt; font-weight: 700; margin: 20pt 0 8pt 0; }

  table.verrechnung { width: 100%; border-collapse: collapse; margin-bottom: 15pt; }
  table.verrechnung th { background: #f5f5f5; border-bottom: 1pt solid #ccc; padding: 4pt 6pt; text-align: left; font-size: 8.5pt; font-weight: 700; }
  table.verrechnung th.right { text-align: right; }
  table.verrechnung td { padding: 4pt 6pt; font-size: 9pt; border-bottom: 0.5pt solid #eee; }
  table.verrechnung td.right { text-align: right; }
  table.verrechnung .sum-row td { font-weight: 700; border-top: 1pt solid #222; }

  table.schluss { width: auto; margin-left: auto; margin-right: 0; border-collapse: collapse; margin-bottom: 15pt; }
  table.schluss td { padding: 3pt 8pt; font-size: 9.5pt; }
  table.schluss td:last-child { text-align: right; min-width: 100pt; }
  table.schluss .rest { font-weight: 700; border-top: 2pt double #222; }
  table.schluss .rest td { padding-top: 5pt; font-size: 10.5pt; }

  .payment-terms { margin-top: 15pt; font-size: 9pt; }
  .closing { margin-top: 20pt; font-size: 9pt; }
</style>
</head>
<body>

<!-- Footer on every page -->
<div class="page-footer">
  <table class="footer-table"><tr>
    <td>
      {{ cs.company_name or '' }}<br>
      {% if cs.address %}{{ cs.address }}<br>{% endif %}
      {% if cs.postal_code or cs.city %}{{ cs.postal_code or '' }} {{ cs.city or '' }}<br>{% endif %}
      {{ cs.country or '' }}
    </td>
    <td>
      {% if cs.phone %}Tel. {{ cs.phone }}<br>{% endif %}
      {% if cs.email %}E-Mail {{ cs.email }}<br>{% endif %}
      {% if cs.web %}Web {{ cs.web }}<br>{% endif %}
    </td>
    <td>
      {% if cs.fn_nr %}FN-Nr. {{ cs.fn_nr }}<br>{% endif %}
      {% if cs.ust_id %}USt.-ID {{ cs.ust_id }}<br>{% endif %}
      {% if cs.amtsgericht %}{{ cs.amtsgericht }}<br>{% endif %}
      {% if cs.geschaeftsfuehrung %}Geschäftsführung {{ cs.geschaeftsfuehrung }}{% endif %}
    </td>
    <td>
      {% if cs.bank_name %}{{ cs.bank_name }}<br>{% endif %}
      {% if cs.iban %}IBAN {{ cs.iban }}<br>{% endif %}
      {% if cs.bic %}BIC {{ cs.bic }}{% endif %}
    </td>
  </tr></table>
</div>

<!-- Header -->
<div class="header">
  <div class="header-top">
    <div class="address-side">
      <div class="sender-line">{{ cs.company_name or '' }} · {{ cs.address or '' }} · {{ cs.postal_code or '' }} {{ cs.city or '' }}</div>
      <div class="address-block">
        <strong>{{ customer.name }}</strong><br>
        {% if customer.address %}{{ customer.address }}<br>{% endif %}
        {% if customer.postal_code or customer.city %}{{ customer.postal_code or '' }} {{ customer.city or '' }}<br>{% endif %}
        {% if customer.country and customer.country != 'Österreich' %}{{ customer.country }}<br>{% endif %}
      </div>
    </div>
    <div class="meta-side">
      {% if cs.logo_base64 %}
      <img class="logo" src="data:image/png;base64,{{ cs.logo_base64 }}" alt="Logo"><br>
      {% endif %}
      <table class="meta-table">
        <tr><td>{{ doc_number_label }}</td><td>{{ doc_number }}</td></tr>
        <tr><td>{{ doc_date_label }}</td><td>{{ doc_date }}</td></tr>
        {% if reference %}<tr><td>Referenz</td><td>{{ reference }}</td></tr>{% endif %}
        {% if ansprechpartner %}<tr><td>Ihr Ansprechpartner</td><td>{{ ansprechpartner }}</td></tr>{% endif %}
        {% if customer.customer_ust_id %}<tr><td>Ihre USt-Id.</td><td>{{ customer.customer_ust_id }}</td></tr>{% endif %}
      </table>
    </div>
  </div>
</div>

<!-- Title -->
<div class="title">{{ doc_title }}</div>

<!-- Greeting -->
<div class="greeting">
  {{ greeting }}<br>
  {{ intro_text }}
</div>

<!-- Positions table -->
<table class="positions">
  <thead>
    <tr>
      <th style="width:35pt">Pos.</th>
      <th>Beschreibung</th>
      <th class="right" style="width:60pt">Menge</th>
      <th class="right" style="width:80pt">Einzelpreis</th>
      <th class="right" style="width:85pt">Gesamtpreis</th>
    </tr>
  </thead>
  <tbody>
    {% for item in position_rows %}
    {% if item.is_group %}
    <tr class="group-row"><td colspan="5">{{ item.name }}</td></tr>
    {% else %}
    <tr>
      <td class="mono">{{ item.pos }}.</td>
      <td>
        <strong>{{ item.name }}</strong>
        {% if item.description %}<div class="desc-detail">{{ item.description }}</div>{% endif %}
      </td>
      <td class="right">{{ item.menge_str }} {{ item.einheit }}</td>
      <td class="right">{{ item.einzelpreis_str }}</td>
      <td class="right">
        {{ item.gesamtpreis_str }}
        {% if item.rabatt_pct > 0 %}
        <div class="rabatt">(Rabatt {{ item.rabatt_pct_str }}%<br>{{ item.rabatt_amount_str }})</div>
        {% endif %}
      </td>
    </tr>
    {% endif %}
    {% endfor %}
  </tbody>
</table>

<!-- Totals -->
<table class="totals">
  <tr><td>Gesamtbetrag netto</td><td>{{ total_netto_str }}</td></tr>
  <tr><td>zzgl. Umsatzsteuer {{ ust_pct_str }} %</td><td>{{ ust_amount_str }}</td></tr>
  <tr class="brutto"><td>Gesamtbetrag brutto</td><td>{{ total_brutto_str }}</td></tr>
</table>

{% if show_verrechnung %}
<!-- Verrechnung der Abschlagsrechnungen -->
<div class="section-title">Verrechnung der Abschlagsrechnungen</div>
<table class="verrechnung">
  <thead>
    <tr>
      <th>Datum</th>
      <th>Rechnungs-Nr.</th>
      <th class="right">Rechnungssumme Brutto</th>
      <th>Steuersatz</th>
      <th class="right">Zahlung Netto</th>
      <th class="right">USt.</th>
      <th class="right">Zahlung Brutto</th>
    </tr>
  </thead>
  <tbody>
    {% for ab in abschlag_rows %}
    <tr>
      <td>{{ ab.date }}</td>
      <td>{{ ab.number }}</td>
      <td class="right">{{ ab.brutto_str }}</td>
      <td>{{ ust_pct_str }}%</td>
      <td class="right">{{ ab.netto_str }}</td>
      <td class="right">{{ ab.ust_str }}</td>
      <td class="right">{{ ab.brutto_str }}</td>
    </tr>
    {% endfor %}
    <tr class="sum-row">
      <td colspan="4">Summe geleisteter Zahlungen</td>
      <td class="right">{{ abschlag_sum_netto_str }}</td>
      <td class="right">{{ abschlag_sum_ust_str }}</td>
      <td class="right">{{ abschlag_sum_brutto_str }}</td>
    </tr>
  </tbody>
</table>

<!-- Schlussrechnung summary -->
<div class="section-title">Schlussrechnung</div>
<table class="schluss">
  <tr><td>Summe Schlussrechnung brutto</td><td>{{ total_brutto_str }}</td></tr>
  <tr><td>Summe geleisteter Zahlungen brutto</td><td>{{ abschlag_sum_brutto_str }}</td></tr>
  <tr><td></td><td></td></tr>
  <tr><td>Gesamtbetrag netto</td><td>{{ rest_netto_str }}</td></tr>
  <tr><td>zzgl. Umsatzsteuer {{ ust_pct_str }} %</td><td>{{ rest_ust_str }}</td></tr>
  <tr class="rest"><td>Verbleibende Restforderung brutto</td><td>{{ rest_brutto_str }}</td></tr>
</table>
{% endif %}

<!-- Payment terms -->
{% if payment_terms %}
<div class="payment-terms">{{ payment_terms }}</div>
{% endif %}

<!-- Closing -->
<div class="closing">
  Mit freundlichen Grüßen<br>
  {{ cs.geschaeftsfuehrung or cs.company_name or '' }}
</div>

</body>
</html>
""")


def _build_position_rows(angebot: Angebot) -> list[dict]:
    rows = []
    groups = sorted(angebot.groups, key=lambda g: g.sort_order)
    used_positions = set()

    for group in groups:
        group_positions = [p for p in angebot.positions if p.group_id == group.id]
        group_positions.sort(key=lambda p: p.sort_order)
        if group_positions or True:  # always show group header
            rows.append({"is_group": True, "name": group.name})
            for p in group_positions:
                rows.append(_position_to_row(p))
                used_positions.add(p.id)

    # Ungrouped
    for p in sorted(angebot.positions, key=lambda x: x.sort_order):
        if p.id not in used_positions:
            rows.append(_position_to_row(p))

    return rows


def _position_to_row(p) -> dict:
    return {
        "is_group": False,
        "pos": p.position_number,
        "name": p.product.name if p.product else "",
        "description": p.description_override or (p.product.description if p.product else None),
        "menge_str": _format_qty(p.menge),
        "einheit": p.product.einheit if p.product else "Stk",
        "einzelpreis_str": _format_eur(p.einzelpreis),
        "gesamtpreis_str": _format_eur(p.netto_amount),
        "rabatt_pct": float(p.rabatt_pct),
        "rabatt_pct_str": str(p.rabatt_pct).replace(".", ","),
        "rabatt_amount_str": _format_eur(p.rabatt_amount),
    }


def generate_angebot_pdf(
    angebot: Angebot,
    customer: Customer,
    cs: CompanySettings,
) -> bytes:
    ust_pct = float(customer.ust_pct)
    total_netto = angebot.total_netto
    ust_amount = total_netto * Decimal(str(ust_pct)) / Decimal("100")
    total_brutto = total_netto + ust_amount

    ctx = {
        "cs": cs,
        "customer": customer,
        "doc_number_label": "Angebots-Nr.",
        "doc_number": angebot.angebot_number,
        "doc_date_label": "Angebotsdatum",
        "doc_date": _format_date(angebot.angebot_date),
        "reference": "",
        "doc_title": f"Angebot Nr. {angebot.angebot_number}",
        "ansprechpartner": cs.geschaeftsfuehrung or "",
        "greeting": cs.default_greeting or "Sehr geehrte Damen und Herren,",
        "intro_text": "vielen Dank für Ihr Interesse! Hiermit unterbreiten wir Ihnen folgendes Angebot:",
        "position_rows": _build_position_rows(angebot),
        "total_netto_str": _format_eur(total_netto),
        "ust_pct_str": str(ust_pct).replace(".", ","),
        "ust_amount_str": _format_eur(ust_amount),
        "total_brutto_str": _format_eur(total_brutto),
        "show_verrechnung": False,
        "payment_terms": "",
    }

    html = TEMPLATE.render(**ctx)
    return HTML(string=html).write_pdf()


def generate_rechnung_pdf(
    rechnung: Rechnung,
    angebot: Angebot,
    customer: Customer,
    cs: CompanySettings,
) -> bytes:
    ust_pct = float(customer.ust_pct)
    is_schluss = rechnung.rechnung_type == RechnungType.SCHLUSS

    # Full angebot totals (used for both types)
    angebot_netto = angebot.total_netto
    angebot_ust = angebot_netto * Decimal(str(ust_pct)) / Decimal("100")
    angebot_brutto = angebot_netto + angebot_ust

    if is_schluss:
        # Schlussrechnung shows full positions, then subtracts Abschlag
        total_netto = angebot_netto
        ust_amount = angebot_ust
        total_brutto = angebot_brutto

        title = f"Schlussrechnung Nr. {rechnung.rechnung_number} aus Angebot {angebot.angebot_number}"

        # Abschlag rows
        abschlag_rechnungen = [r for r in angebot.rechnungen if r.rechnung_type == RechnungType.ABSCHLAG]
        abschlag_rows = []
        abschlag_sum_netto = Decimal("0")
        for ab in abschlag_rechnungen:
            ab_ust = ab.total_netto * Decimal(str(ust_pct)) / Decimal("100")
            ab_brutto = ab.total_netto + ab_ust
            abschlag_rows.append({
                "date": _format_date(ab.rechnung_date),
                "number": ab.rechnung_number,
                "netto_str": _format_eur(ab.total_netto),
                "ust_str": _format_eur(ab_ust),
                "brutto_str": _format_eur(ab_brutto),
            })
            abschlag_sum_netto += ab.total_netto

        abschlag_sum_ust = abschlag_sum_netto * Decimal(str(ust_pct)) / Decimal("100")
        abschlag_sum_brutto = abschlag_sum_netto + abschlag_sum_ust

        rest_netto = total_netto - abschlag_sum_netto
        rest_ust = rest_netto * Decimal(str(ust_pct)) / Decimal("100")
        rest_brutto = rest_netto + rest_ust

        extra_ctx = {
            "show_verrechnung": len(abschlag_rows) > 0,
            "abschlag_rows": abschlag_rows,
            "abschlag_sum_netto_str": _format_eur(abschlag_sum_netto),
            "abschlag_sum_ust_str": _format_eur(abschlag_sum_ust),
            "abschlag_sum_brutto_str": _format_eur(abschlag_sum_brutto),
            "rest_netto_str": _format_eur(rest_netto),
            "rest_ust_str": _format_eur(rest_ust),
            "rest_brutto_str": _format_eur(rest_brutto),
        }
    else:
        # Abschlagsrechnung
        total_netto = rechnung.total_netto
        ust_amount = total_netto * Decimal(str(ust_pct)) / Decimal("100")
        total_brutto = total_netto + ust_amount
        title = f"Abschlagsrechnung Nr. {rechnung.rechnung_number} aus Angebot {angebot.angebot_number}"
        extra_ctx = {"show_verrechnung": False}

    payment_terms = cs.default_payment_terms or ""

    ctx = {
        "cs": cs,
        "customer": customer,
        "doc_number_label": "Rechnungs-Nr.",
        "doc_number": rechnung.rechnung_number,
        "doc_date_label": "Rechnungsdatum",
        "doc_date": _format_date(rechnung.rechnung_date),
        "reference": f"Angebot {angebot.angebot_number}",
        "doc_title": title,
        "ansprechpartner": cs.geschaeftsfuehrung or "",
        "greeting": cs.default_greeting or "Sehr geehrte Damen und Herren,",
        "intro_text": "vielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:",
        "position_rows": _build_position_rows(angebot),
        "total_netto_str": _format_eur(total_netto),
        "ust_pct_str": str(ust_pct).replace(".", ","),
        "ust_amount_str": _format_eur(ust_amount),
        "total_brutto_str": _format_eur(total_brutto),
        "payment_terms": payment_terms,
        **extra_ctx,
    }

    html = TEMPLATE.render(**ctx)
    return HTML(string=html).write_pdf()
