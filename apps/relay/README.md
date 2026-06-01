# Klk Relay (@klk/relay)

Nostr relay server powered by [strfry](https://github.com/hoytech/strfry), deployed as a rootless Podman container via Quadlet systemd units behind a Cloudflare Tunnel.

## Architecture

- **Container**: strfry + Node.js (write-policy plugin)
- **Runtime**: rootless Podman + Quadlet (systemd `.container` units)
- **Networking**: bound to `127.0.0.1:3100` (cloudflared tunnel ingress maps `nostr.illo.fyi → localhost:3100`)
- **Storage**: persistent strfry-db at `~/klk-relay-data/strfry-db`
- **Plugin**: JavaScript allowlist with hot-reload (no restart on edits)

## Deployment Checklist

### Prerequisites

- Relay code checked out at `~/klk`
- Cloudflare Tunnel running with ingress already configured: `nostr.illo.fyi → http://localhost:3100`
- `podman` installed: `sudo apt-get install -y podman`

### 1. Prep directories and enable user services

```bash
mkdir -p ~/klk-relay-data/strfry-db ~/.config/containers/systemd
loginctl enable-linger "$USER"
```

### 2. Build the Node-enabled image

```bash
podman build -t klk-relay ~/klk/apps/relay
```

### 3. Install and activate the Quadlet unit

```bash
cp ~/klk/apps/relay/quadlet/klk-relay.container ~/.config/containers/systemd/

# IMPORTANT: Edit the two Volume= paths if your checkout isn't ~/klk
nano ~/.config/containers/systemd/klk-relay.container

systemctl --user daemon-reload
systemctl --user start klk-relay
systemctl --user status klk-relay
```

### 4. Verify the relay is running

```bash
# Check systemd status
systemctl --user is-active klk-relay
journalctl --user -u klk-relay -f

# Check network binding (should be healthy)
curl -sI -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100
```

Watch the journalctl output for the write-policy plugin loading. You should see **no `node: not found` errors** (this confirms the Containerfile Node installation worked).

### 5. Verify end-to-end through Cloudflare

```bash
# Install wscat if needed
npm install -g wscat

# Should connect (CONNECT successful = healthy relay)
wscat -c wss://nostr.illo.fyi
```

### 6. Configure allowlist

Add your keys so you can read and write events:

```bash
cd ~/klk/apps/relay

# Your personal key (for app reads/writes)
./bin/klk-allow.sh npub1<your-npub>

# Seed key (required for seeding test data)
./bin/klk-allow.sh $(nak key public $(printf 'klk-test-seed' | sha256sum | cut -d' ' -f1))
```

The plugin hot-reloads `write-policy/allowlist.txt` — no relay restart needed.

**Note**: If you plan to `git pull` frequently and don't want live edits to the allowlist committed, mark it skip-worktree:

```bash
git update-index --skip-worktree apps/relay/write-policy/allowlist.txt
```

### 7. Optional: cron job for metrics and maintenance

Add to your crontab (`crontab -e`):

```cron
# Emit stats every 10 minutes
*/10 * * * * cd ~/klk/apps/relay && ./bin/relay-stats.sh >> ~/klk-relay-stats.jsonl

# Weekly compaction (frees unused space)
0 3 * * 0   podman exec klk-relay strfry compact
```

## From your dev machine

Once the relay is live and allowlisted:

### Seed test data

```bash
KLK_RELAY_URL=wss://nostr.illo.fyi bun run seed
# Output: 5×kind-31923 (events) + 5×kind-30078 (circles) published, no rejects
```

### Point the app at the relay (EAS environment)

```bash
cd apps/events
eas env:create --name EXPO_PUBLIC_RELAY_URL --value wss://nostr.illo.fyi \
  --environment production --visibility sensitive
eas env:create --name EXPO_PUBLIC_RELAY_URL --value wss://nostr.illo.fyi \
  --environment preview --visibility sensitive
```

The `eas.json` build profiles already reference these environments; no further config needed.

### Build + test on device

Trigger an EAS preview build. In the app:

- Should connect to the relay without errors
- Should display `wss://nostr.illo.fyi` in the relay status UI
- Should read seeded events and circles
- Should accept your writes to the relay

## Troubleshooting

### "node: not found" in journalctl

The Containerfile Node installation failed or the image wasn't rebuilt.

```bash
podman build --no-cache -t klk-relay ~/klk/apps/relay
systemctl --user restart klk-relay
journalctl --user -u klk-relay -f
```

### Write policy rejecting all events

Allowlist is empty or plugin didn't hot-reload.

```bash
cat ~/klk/apps/relay/write-policy/allowlist.txt
./bin/klk-allow.sh <hex-pubkey>  # Test reload
```

### Container exiting immediately

Check logs:

```bash
journalctl --user -u klk-relay -n 50
podman logs klk-relay
```

### Relay not accessible through cloudflared

1. Confirm tunnel is running and ingress is wired: `cloudflared tunnel route dns <tunnel-id> nostr.illo.fyi`
2. Test locally: `curl http://127.0.0.1:3100`
3. Restart cloudflared if you modified its config: `sudo systemctl restart cloudflared`

## Testing the allowlist

Non-allowlisted pubkey should get blocked:

```bash
# In wscat, send a WRITE event from any non-allowlisted key
# Expected: blocked: pubkey not in allowlist
```

Allowlisted pubkey should succeed:

```bash
# Same pubkey after ./bin/klk-allow.sh npub1...
# Expected: {"id":"...", "action":"accept", "msg":""}
```

## Persistence after reboot

The unit has `[Install] WantedBy=default.target` and `[Service] Restart=always`, so it survives reboots automatically (enabled via `loginctl enable-linger` in step 1).

Verify:

```bash
sudo reboot
# After reboot:
systemctl --user is-active klk-relay  # should be active
curl http://127.0.0.1:3100            # should respond
```

## References

- **strfry**: https://github.com/hoytech/strfry
- **Quadlet (systemd-native containers)**: https://docs.podman.io/en/latest/markdown/podman-quadlet.1.html
- **Cloudflare Tunnel ingress**: https://developers.cloudflare.com/cloudflare-one/connections/connect-applications/install-and-setup/tunnel-guide/
