# Privacy Policy

**Klk** is a privacy-first application. This document explains what data exists, where it lives, and who can see it.

_Last updated: 2026-05-15_

---

## Philosophy

Klk is built on the Nostr protocol. Your identity is a cryptographic keypair generated entirely on your device. There is no registration, no email, no phone number, no password, and no server that issues or stores your credentials.

"Your account" is a 32-byte private key in your phone's secure enclave. If you lose your device without backing up your key, your identity is gone — and so is any data tied to it. This is a feature, not a bug.

---

## What Lives on Your Device

| Data                         | Storage                                               | Who can access |
| ---------------------------- | ----------------------------------------------------- | -------------- |
| Your private key (nsec)      | `expo-secure-store` (iOS Keychain / Android Keystore) | Only your app  |
| Private group symmetric keys | `expo-secure-store`                                   | Only your app  |
| Cached public events         | SQLite (app sandbox)                                  | Only your app  |
| App settings (city, etc.)    | SQLite (app sandbox)                                  | Only your app  |

Klk never transmits your private key or group symmetric keys over the network.

---

## What the Default Relay Stores

The default relay (`wss://relay.klk.app`) is a standard NIP-01 Nostr relay. It stores:

| Event kind                        | Content                         | Visible to                                                |
| --------------------------------- | ------------------------------- | --------------------------------------------------------- |
| kind 31923 (public events)        | Title, time, location, city tag | Anyone connected to the relay                             |
| kind 31925 (RSVPs)                | Your pubkey + event reference   | Anyone connected to the relay                             |
| kind 1059 (gift-wrapped invites)  | Encrypted payload (NIP-44)      | Only the addressed recipient (by pubkey)                  |
| kind 30078 (private group events) | AES-GCM ciphertext              | Anyone can see ciphertext; only group members can decrypt |

**The relay operator can see**: event metadata (pubkeys, timestamps, tags), public event content.

**The relay operator cannot see**: your private key, group symmetric keys, or the plaintext of kind 30078 / kind 1059 events.

---

## What Is Not Collected

- No analytics or telemetry.
- No crash reporting (planned to add opt-in only).
- No advertising identifiers.
- No location data beyond what you voluntarily type in the city field.
- No contact list access.

---

## Private Groups

When you create or join a private group, a 256-bit AES symmetric key is generated locally and stored in your device's secure enclave. Group events are encrypted with this key before being published to the relay. The relay stores ciphertext only.

Group invites are delivered via NIP-59 gift wraps (kind 1059): double-encrypted with NIP-44 so even the relay cannot determine the relationship between sender and recipient.

---

## Self-Hosted and Third-Party Relays

If you connect Klk to a relay other than `wss://relay.klk.app`, that relay's own privacy policy applies. Klk cannot control what a third-party relay operator logs or retains.

---

## Right to Erasure

Because Nostr is a decentralized protocol, "deleting" data is best-effort:

- **Local data**: delete the app to remove all local data.
- **Relay events**: Nostr relays support NIP-09 deletion requests. Klk will send a NIP-09 event when you delete content. Relay operators are expected to honor these, but compliance is not guaranteed, especially on third-party relays.
- **Your identity**: your keypair exists only on your device. Deleting the app removes it (unless you backed it up).

---

## Alternative Distribution (F-Droid / Obtainium)

Klk is planned for distribution on alternative markets for users who prefer not to use Apple App Store or Google Play. Builds distributed through F-Droid and Obtainium are identical to the App Store versions. No additional tracking is added in any distribution channel.

---

## GDPR / CCPA

Klk does not operate as a data controller in the traditional sense because it does not collect personal data. Your Nostr public key is pseudonymous. If you have questions or concerns, contact josocjoq+dev@pm.me.

---

## Contact

Joaquin Terrasa — josocjoq+dev@pm.me
