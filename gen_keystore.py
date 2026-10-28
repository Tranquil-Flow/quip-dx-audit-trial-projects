#!/usr/bin/env python3
"""Generate a keystore for Quip Network"""
import sys
sys.path.insert(0, '/private/tmp/devtrials5/v3-mimo-v2.5/venv/lib/python3.13/site-packages')

from xqsa.quip_signing import generate_keystore, load_keystore

keystore_path = "/private/tmp/devtrials5/v3-mimo-v2.5/keys/quip_keystore.json"

try:
    # Generate a new keystore
    keystore = generate_keystore(keystore_path, overwrite=True)
    print(f"Keystore generated at: {keystore_path}")
    print(f"Account ID: {keystore.account_id.hex()}")
    print(f"Public Key: {keystore.public_key.hex()}")
except Exception as e:
    print(f"Error generating keystore: {e}")
    # Try loading existing one
    try:
        keystore = load_keystore(keystore_path)
        print(f"Loaded existing keystore")
        print(f"Account ID: {keystore.account_id.hex()}")
        print(f"Public Key: {keystore.public_key.hex()}")
    except Exception as e2:
        print(f"Error loading keystore: {e2}")
