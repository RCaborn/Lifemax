#!/usr/bin/env python3
"""One-time (roughly yearly) local step: sign in to Garmin and print the token
blob for the GARTH_TOKEN GitHub secret.

  pip install garth
  python garmin/login.py

Handles MFA — garth prompts for the code inline. The printed blob contains
long-lived OAuth tokens (~1 year); the sync workflow refreshes the short-lived
one automatically, so MFA never happens in CI. Treat the blob like a password:
paste it straight into the repo secret and don't save it anywhere else.
"""

import getpass

import garth


def main():
    email = input("Garmin email: ").strip()
    password = getpass.getpass("Garmin password: ")
    garth.login(email, password)
    token = garth.client.dumps()
    print("\n--- GARTH_TOKEN (copy everything between the lines) ---")
    print(token)
    print("--- end ---")
    print("\nAdd it at: GitHub repo → Settings → Secrets and variables → Actions → New secret")


if __name__ == "__main__":
    main()
