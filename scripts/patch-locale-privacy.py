#!/usr/bin/env python3
"""Add privacy + maps strings to en/am/om/ha catalogs. Run from repo root."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "messages"


def deep_merge(base: dict, patch: dict) -> None:
    for k, v in patch.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            deep_merge(base[k], v)
        else:
            base[k] = v


PRIVACY_EN = {
    "eyebrow": "Legal",
    "title": "Privacy policy",
    "metaDescription": "How this government website collects, stores, and protects information.",
    "intro": "This policy explains what information this website collects, how it is stored, and how it is used.",
    "collectTitle": "Information we collect",
    "collectBody": "We collect only what is needed to run the public website and the content management system.",
    "collectCookies": "Cookies: language preference (lang), session authentication for CMS staff, and a CSRF token for form safety.",
    "collectAccounts": "CMS accounts: name, email, role, and password hash for authorised editors and administrators.",
    "collectLogs": "Technical logs: IP address and user agent may be stored with CMS sessions for security auditing.",
    "storageTitle": "Storage and security",
    "storageBody": "Data is stored in the institution's database. Session tokens are stored as hashes. Access to the CMS requires a signed-in staff account.",
    "phonesTitle": "Phone numbers",
    "phonesBody": "The office phone number shown on the site is a public contact detail for the institution. This platform does not maintain a database of citizens' mobile phone numbers.",
    "rightsTitle": "Questions",
    "rightsBody": "For privacy questions about this website, contact the office using the published contact channels.",
}

PRIVACY_OM = {
    "eyebrow": "Seera",
    "title": "Imaammata dhuunfaa",
    "metaDescription": "Marsariitiin mootummaa kun odeeffannoo akkaataa itti walitti qabu, kuusuu fi eegu.",
    "intro": "Imaammatni kun odeeffannoo maal akka walitti qabamu, akkaataa kuusuu fi itti fayyadamu ibsa.",
    "collectTitle": "Odeeffannoo walitti qabnu",
    "collectBody": "Marsariitii ummataa fi sirna bulchiinsa qabiyyee geggeessuuf kan barbaachisu qofa walitti qabna.",
    "collectCookies": "Kuukiiwwan: filannoo afaanii (lang), mirkaneessa session hojjettoota CMS, fi token CSRF nageenya foormii.",
    "collectAccounts": "Herrega CMS: maqaa, iimeelii, gahee, fi hash jecha iccitii gulaaltotaafi bulchitootaaf.",
    "collectLogs": "Galmee teeknikaa: teessoo IP fi user agent session CMS wajjin qorannoo nageenyaaf kuufamuu danda'u.",
    "storageTitle": "Kuusuu fi nageenya",
    "storageBody": "Daataan kuusaa daataa dhaabbataa keessatti kuufama. Token session akka hashitti kuufamu. CMS seenuun herrega hojjetaa mallatteeffame ni barbaachisa.",
    "phonesTitle": "Lakkoofsa bilbilaa",
    "phonesBody": "Lakkoofsi waajjira marsariitii irratti mul'atu odeeffannoo quunnamtii ummataati. Platformiin kun kuusaa lakkoofsa bilbila harkaa lammii hin qabu.",
    "rightsTitle": "Gaaffilee",
    "rightsBody": "Gaaffilee dhuunfaa marsariitii kanaa irratti, karaa quunnamtii maxxanfameen waajjira qunnamaa.",
}

MAPS = {
    "en": {"openInGoogleMaps": "Open in Google Maps", "openInAppleMaps": "Open in Apple Maps"},
    "am": {"openInGoogleMaps": "Open in Google Maps", "openInAppleMaps": "Open in Apple Maps"},
    "om": {"openInGoogleMaps": "Google Maps bani", "openInAppleMaps": "Apple Maps bani"},
    "ha": {"openInGoogleMaps": "Open in Google Maps", "openInAppleMaps": "Open in Apple Maps"},
}


def main() -> None:
    for code, privacy, nav_label in [
        ("en", PRIVACY_EN, "Privacy"),
        ("am", PRIVACY_EN, "Privacy"),
        ("om", PRIVACY_OM, "Dhuunfaa"),
        ("ha", PRIVACY_EN, "Privacy"),
    ]:
        path = ROOT / f"{code}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["privacy"] = privacy
        deep_merge(data.setdefault("contact", {}), MAPS[code])
        data.setdefault("navigation", {})["privacy"] = nav_label
        data.setdefault("footer", {})["privacy"] = nav_label
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("updated", path.name)


if __name__ == "__main__":
    main()
