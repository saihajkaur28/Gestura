"""
ASL Video Library Migration Script
1. Archives existing ISL videos into videos/isl_legacy/
2. Downloads authentic ASL videos from Yale ASL Signbank
3. Generates metadata catalog with source, attribution, and license
4. Populates both backend (videos/asl/) and frontend (frontend/public/videos/asl/)
"""

import os
import shutil
import ssl
import urllib.request
import json
from pathlib import Path

# SSL context for ASL Signbank
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

PROJECT_ROOT = Path(__file__).resolve().parents[1]
VIDEOS_DIR = PROJECT_ROOT / "videos"
ISL_LEGACY_DIR = VIDEOS_DIR / "isl_legacy"
ASL_VIDEOS_DIR = VIDEOS_DIR / "asl"
FRONTEND_ASL_DIR = PROJECT_ROOT / "frontend" / "public" / "videos" / "asl"

# 1. Archive legacy ISL videos
ISL_LEGACY_DIR.mkdir(parents=True, exist_ok=True)
ASL_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_ASL_DIR.mkdir(parents=True, exist_ok=True)

isl_files_moved = 0
for item in VIDEOS_DIR.iterdir():
    if item.is_file() and item.suffix.lower() == ".mp4":
        dest = ISL_LEGACY_DIR / item.name
        if not dest.exists():
            shutil.move(str(item), str(dest))
            isl_files_moved += 1

print(f"Archived {isl_files_moved} legacy ISL videos to {ISL_LEGACY_DIR}")

# 2. Authentic ASL Vocabulary List from Yale ASL Signbank
ASL_VOCABULARY = [
    {
        "id": "hello",
        "gloss": "HELLO",
        "keywords": ["hello", "hi", "hey", "greeting", "greetings"],
        "signbank_id": 482,
        "video_path_rel": "ASL/HE/HELLO-482.mp4",
        "desc": "Open flat hand with thumb in, fingertips touching temple, moving outward and forward in a salute gesture.",
        "category": "greetings",
    },
    {
        "id": "thank_you",
        "gloss": "THANK-YOU",
        "keywords": ["thank you", "thanks", "thank", "thankyou", "grateful"],
        "signbank_id": 1198,
        "video_path_rel": "ASL/TH/THANK-YOU-1198.mp4",
        "desc": "Flat hand with fingers touching chin or lips, then moving forward and slightly downward toward the other person.",
        "category": "politeness",
    },
    {
        "id": "help",
        "gloss": "HELP",
        "keywords": ["help", "assist", "aid", "assistance", "support"],
        "signbank_id": 2219,
        "video_path_rel": "ASL/HE/HELP-2219.mp4",
        "desc": "Closed fist with thumb extended upright on primary hand, resting on the open palm of the secondary hand, lifting upward together.",
        "category": "emergency",
    },
    {
        "id": "goodbye",
        "gloss": "GOODBYE",
        "keywords": ["goodbye", "bye", "bye-bye", "farewell", "see you"],
        "signbank_id": 425,
        "video_path_rel": "ASL/BY/BYE-BYE-425.mp4",
        "desc": "Open palm held upright facing forward, fingers waving/opening and closing toward the recipient.",
        "category": "greetings",
    },
    {
        "id": "yes",
        "gloss": "YES",
        "keywords": ["yes", "yeah", "yep", "affirmative", "correct", "agree"],
        "signbank_id": 1472,
        "video_path_rel": "ASL/YE/YES-1472.mp4",
        "desc": "Fist (S-handshape) nodding up and down from the wrist, imitating a head nod.",
        "category": "responses",
    },
    {
        "id": "no",
        "gloss": "NO",
        "keywords": ["no", "nope", "negative", "disagree", "dont"],
        "signbank_id": 512,
        "video_path_rel": "ASL/NO/NO-512.mp4",
        "desc": "Index and middle fingers snap down onto the thumb, mimicking a quick mouth closing.",
        "category": "responses",
    },
    {
        "id": "please",
        "gloss": "PLEASE",
        "keywords": ["please", "pleased", "kindly"],
        "signbank_id": 527,
        "video_path_rel": "ASL/PL/PLEASE-527.mp4",
        "desc": "Open flat palm rubbing in a circular motion on the chest.",
        "category": "politeness",
    },
    {
        "id": "sorry",
        "gloss": "SORRY",
        "keywords": ["sorry", "apologize", "apology", "regret", "my bad"],
        "signbank_id": 566,
        "video_path_rel": "ASL/SO/SORRY-566.mp4",
        "desc": "A-handshape (fist with thumb alongside) rubbing in a circular motion over the heart/chest.",
        "category": "politeness",
    },
    {
        "id": "water",
        "gloss": "WATER",
        "keywords": ["water", "drink", "liquid", "thirsty"],
        "signbank_id": 1414,
        "video_path_rel": "ASL/WA/WATER-1414.mp4",
        "desc": "W-handshape (three middle fingers extended) with index finger tapping twice against the chin/lower lip.",
        "category": "needs",
    },
    {
        "id": "eat",
        "gloss": "EAT",
        "keywords": ["eat", "food", "consume", "meal", "dinner", "lunch", "breakfast"],
        "signbank_id": 399,
        "video_path_rel": "ASL/EA/EAT-399.mp4",
        "desc": "Squashed O-handshape (fingertips touching thumb) brought to the lips repeatedly.",
        "category": "needs",
    },
    {
        "id": "more",
        "gloss": "MORE",
        "keywords": ["more", "again", "additional"],
        "signbank_id": 508,
        "video_path_rel": "ASL/MO/MORE-508.mp4",
        "desc": "Both hands in flattened O-handshapes tapping together at the fingertips repeatedly.",
        "category": "needs",
    },
    {
        "id": "wait",
        "gloss": "WAIT",
        "keywords": ["wait", "pause", "hold on", "stay"],
        "signbank_id": 1405,
        "video_path_rel": "ASL/WA/WAIT-1405.mp4",
        "desc": "Both hands held upward palms up, fingers wiggling gently.",
        "category": "actions",
    },
    {
        "id": "doctor",
        "gloss": "DOCTOR",
        "keywords": ["doctor", "physician", "md", "dr"],
        "signbank_id": 344,
        "video_path_rel": "ASL/DO/DOCTOR-344.mp4",
        "desc": "Bent palm or M-fingers tapping on the inner wrist where the pulse is taken.",
        "category": "medical",
    },
    {
        "id": "hospital",
        "gloss": "HOSPITAL",
        "keywords": ["hospital", "clinic", "er", "infirmary"],
        "signbank_id": 1759,
        "video_path_rel": "ASL/HO/HOSPITAL-1759.mp4",
        "desc": "H-handshape drawing a cross on the upper arm or forehead.",
        "category": "medical",
    },
    {
        "id": "deaf",
        "gloss": "DEAF",
        "keywords": ["deaf", "hard of hearing", "signing"],
        "signbank_id": 104,
        "video_path_rel": "ASL/DE/DEAF-104.mp4",
        "desc": "Index finger touching near the ear and then near the corner of the mouth.",
        "category": "identity",
    },
    {
        "id": "emergency",
        "gloss": "EMERGENCY",
        "keywords": ["emergency", "crisis", "urgent", "danger", "sos"],
        "signbank_id": 3525,
        "video_path_rel": "ASL/EM/EMERGENCY-3525.mp4",
        "desc": "E-handshape shaken back and forth with urgency at chest level.",
        "category": "emergency",
    },
    {
        "id": "bathroom",
        "gloss": "BATHROOM",
        "keywords": ["bathroom", "restroom", "toilet", "washroom", "pee"],
        "signbank_id": 32,
        "video_path_rel": "ASL/BA/BATHROOM-32.mp4",
        "desc": "T-handshape (thumb tucked between index and middle) shaking gently from side to side.",
        "category": "needs",
    },
    {
        "id": "pain",
        "gloss": "PAIN",
        "keywords": ["pain", "hurt", "ache", "sore", "injury"],
        "signbank_id": 489,
        "video_path_rel": "ASL/PA/PAIN-489.mp4",
        "desc": "Index fingers pointing toward each other, twisting inward repeatedly near the location of pain.",
        "category": "medical",
    },
    {
        "id": "want",
        "gloss": "WANT",
        "keywords": ["want", "desire", "wish"],
        "signbank_id": 1409,
        "video_path_rel": "ASL/WA/WANT-1409.mp4",
        "desc": "Both open clawed hands pulling inward toward the body.",
        "category": "needs",
    },
    {
        "id": "need",
        "gloss": "NEED",
        "keywords": ["need", "must", "necessary", "require", "have to"],
        "signbank_id": 194,
        "video_path_rel": "ASL/NE/NEED-194.mp4",
        "desc": "Bent index finger (X-handshape) nodding downward emphatically.",
        "category": "needs",
    },
    {
        "id": "friend",
        "gloss": "FRIEND",
        "keywords": ["friend", "buddy", "pal", "companion"],
        "signbank_id": 462,
        "video_path_rel": "ASL/FR/FRIEND-462.mp4",
        "desc": "Index fingers hooked together, then flipped and hooked the other way.",
        "category": "people",
    },
    {
        "id": "where",
        "gloss": "WHERE",
        "keywords": ["where"],
        "signbank_id": 1427,
        "video_path_rel": "ASL/WH/WHERE-1427.mp4",
        "desc": "Index finger held upright shaking side to side, with an inquiring facial expression.",
        "category": "questions",
    },
    {
        "id": "what",
        "gloss": "WHAT",
        "keywords": ["what"],
        "signbank_id": 1425,
        "video_path_rel": "ASL/WH/WHAT-1425.mp4",
        "desc": "Both open hands held palms up shaking side to side gently.",
        "category": "questions",
    },
    {
        "id": "name",
        "gloss": "NAME",
        "keywords": ["name", "named", "title"],
        "signbank_id": 511,
        "video_path_rel": "ASL/NA/NAME-511.mp4",
        "desc": "H-handshapes (index and middle fingers extended) tapping crosswise on top of each other twice.",
        "category": "conversation",
    },
    {
        "id": "how",
        "gloss": "HOW",
        "keywords": ["how"],
        "signbank_id": 487,
        "video_path_rel": "ASL/HO/HOW-487.mp4",
        "desc": "Both curved hands with knuckles touching, rolling outward so palms face upward.",
        "category": "questions",
    },
    {
        "id": "nice",
        "gloss": "NICE",
        "keywords": ["nice", "clean", "pleasant"],
        "signbank_id": 198,
        "video_path_rel": "ASL/NI/NICE-198.mp4",
        "desc": "Open dominant palm sliding smoothly across the non-dominant open palm forward.",
        "category": "conversation",
    },
    {
        "id": "fine",
        "gloss": "FINE",
        "keywords": ["fine", "all right", "okay"],
        "signbank_id": 455,
        "video_path_rel": "ASL/FI/FINE-455.mp4",
        "desc": "5-handshape (open palm, fingers spread) thumb tapping gently against the center of the chest.",
        "category": "conversation",
    },
    {
        "id": "hot",
        "gloss": "HOT",
        "keywords": ["hot", "warm", "heat"],
        "signbank_id": 485,
        "video_path_rel": "ASL/HO/HOT-485.mp4",
        "desc": "Claw hand near mouth turning away and downward, as if spitting out something hot.",
        "category": "descriptors",
    },
    {
        "id": "cold",
        "gloss": "COLD",
        "keywords": ["cold", "chilly", "freezing", "winter"],
        "signbank_id": 432,
        "video_path_rel": "ASL/CO/COLD-432.mp4",
        "desc": "Both fists held at chest level shaking as if shivering with cold.",
        "category": "descriptors",
    },
    {
        "id": "medicine",
        "gloss": "MEDICINE",
        "keywords": ["medicine", "medication", "pill", "drugs"],
        "signbank_id": 1621,
        "video_path_rel": "ASL/ME/MEDICINE-1621.mp4",
        "desc": "Middle finger bent slightly, grinding in a circular motion on the open palm of the other hand (as with a mortar and pestle).",
        "category": "medical",
    },
    {
        "id": "i_love_you",
        "gloss": "I-LOVE-YOU",
        "keywords": ["love", "i love you", "ily", "love you"],
        "signbank_id": 156,
        "video_path_rel": "ASL/I-/I-LOVE-YOU-156.mp4",
        "desc": "ILY handshape: thumb, index, and pinky fingers extended upright, middle and ring fingers held down.",
        "category": "expressions",
    },
]

BASE_SIGNBANK_URL = "https://aslsignbank.haskins.yale.edu"

print("\nDownloading authentic ASL videos from Yale ASL Signbank...")
verified_catalog = []

for entry in ASL_VOCABULARY:
    sign_id = entry["id"]
    filename = f"{sign_id}.mp4"
    backend_dest = ASL_VIDEOS_DIR / filename
    frontend_dest = FRONTEND_ASL_DIR / filename

    remote_url = f"{BASE_SIGNBANK_URL}/dictionary/protected_media/glossvideo/{entry['video_path_rel']}"

    # Download if not already cached
    if not backend_dest.exists() or backend_dest.stat().st_size < 1000:
        print(f"Downloading {entry['gloss']} from {remote_url}...")
        try:
            req = urllib.request.Request(remote_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                data = resp.read()
                with open(backend_dest, "wb") as f:
                    f.write(data)
                print(f"  ✓ Saved to {backend_dest.name} ({len(data)} bytes)")
        except Exception as e:
            print(f"  ✗ Failed to download {entry['gloss']}: {e}")
            continue

    # Mirror to frontend public directory
    if backend_dest.exists():
        shutil.copy2(str(backend_dest), str(frontend_dest))

    # Add to verified catalog
    verified_catalog.append({
        "id": entry["id"],
        "gloss": entry["gloss"],
        "keywords": entry["keywords"],
        "signbank_id": entry["signbank_id"],
        "filename": filename,
        "video_url": f"/media/asl/{filename}",
        "frontend_video_url": f"/videos/asl/{filename}",
        "remote_source_url": remote_url,
        "source": "ASL Signbank (Haskins Laboratories / Yale University)",
        "attribution": "ASL Signbank, Haskins Laboratories & Yale University",
        "license": "Educational and Non-Commercial Research Use with Attribution",
        "status": "available",
        "description": entry["desc"],
        "category": entry["category"],
        "avatar_animation": None,
    })

print(f"\nSuccessfully populated {len(verified_catalog)} ASL videos!")

# Save catalog JSON
catalog_path = PROJECT_ROOT / "backend" / "data" / "asl_catalog.json"
catalog_path.parent.mkdir(parents=True, exist_ok=True)
with open(catalog_path, "w", encoding="utf-8") as f:
    json.dump(verified_catalog, f, indent=2)

print(f"Saved ASL catalog to {catalog_path}")
