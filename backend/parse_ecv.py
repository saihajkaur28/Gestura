import xml.etree.ElementTree as ET
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://aslsignbank.com/static/ecv/asl.ecv"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
    tree = ET.fromstring(resp.read())

target_words = ["HELLO", "THANK-YOU", "HELP", "GOODBYE", "WATER", "YES", "NO", "PLEASE", "SORRY", "DOCTOR", "HOSPITAL", "FOOD", "EAT", "MORE", "NAME", "WHERE", "WHAT", "WHY", "DEAF"]

entries = {}
for entry in tree.findall(".//CV_ENTRY_ML"):
    cve_id = entry.get("CVE_ID")
    val_elem = entry.find("CVE_VALUE")
    if val_elem is not None:
        gloss = (val_elem.text or "").strip()
        desc = (val_elem.get("DESCRIPTION") or "").strip()
        entries[gloss] = {"id": cve_id, "desc": desc}

print(f"Total entries in ASL Signbank ECV: {len(entries)}")
print("\nTarget signs found:")
for t in target_words:
    matches = {g: info for g, info in entries.items() if t in g or any(t.lower() == d.strip().lower() for d in info["desc"].split(","))}
    print(f"Target '{t}':", list(matches.items())[:3])
