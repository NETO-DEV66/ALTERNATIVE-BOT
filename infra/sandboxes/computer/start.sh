#!/usr/bin/env bash
set -uo pipefail
source /usr/local/lib/alternativebot-user-env.sh
export DISPLAY="${DISPLAY:-:1}"
export HOME="${HOME:-/home/alternativebot}"
AGENT_HOME="$HOME"
mkdir -p "$AGENT_HOME" "$AGENT_HOME/.local/bin" "$AGENT_HOME/.config" /tmp/alternativebot /tmp/.X11-unix /tmp/fluxbox-home
# Login shells re-apply ~/.local/bin from /etc/profile.d/alternativebot-local-bin.sh.
export PATH="$AGENT_HOME/.local/bin:/usr/local/bin:$PATH"
export NPM_CONFIG_PREFIX="$AGENT_HOME/.local"
export PIP_USER=1
cd "$AGENT_HOME"

# This script is PID 1, which ignores SIGTERM without a handler, so `docker stop` would wait out
# its grace period. Install the handler before any child starts so a stop during startup is
# honoured too.
XVFB_PID=""
shutdown() {
  trap - TERM INT
  if [[ -n "$XVFB_PID" ]]; then
    kill -TERM "$XVFB_PID" 2>/dev/null || true
  fi
  kill -TERM -- -1 2>/dev/null || true
  if [[ -n "$XVFB_PID" ]]; then
    wait "$XVFB_PID" 2>/dev/null || true
  fi
  exit 0
}
trap shutdown TERM INT

if [[ -n "${ALTERNATIVEBOT_COMPUTER_CONTROL_TOKEN:-}" ]]; then
  while true; do
    /usr/local/bin/alternativebot-computer-control
    sleep 1
  done >/tmp/alternativebot/control.log 2>&1 &
fi

rm -f /tmp/.X1-lock /tmp/.X11-unix/X1

Xvfb :1 -screen 0 1280x800x24 -ac +extension RANDR +render -noreset >/tmp/alternativebot/xvfb.log 2>&1 &
XVFB_PID=$!

ready=0
for _ in $(seq 1 100); do
  if xdpyinfo -display :1 >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.1
done
if [[ "$ready" -ne 1 ]]; then
  echo "Xvfb failed to start" >&2
  cat /tmp/alternativebot/xvfb.log >&2 || true
  exit 1
fi

if command -v dbus-launch >/dev/null 2>&1; then
  eval "$(dbus-launch --sh-syntax)"
  # alternativebot-browser is launched later without this session's environment; the
  # file-chooser portals only work if the browser finds the same bus.
  printf 'export DBUS_SESSION_BUS_ADDRESS=%s\n' "$DBUS_SESSION_BUS_ADDRESS" \
    > /tmp/alternativebot/dbus-session
fi

# Chromium's file chooser talks to xdg-desktop-portal over the session bus.
# Without a running portal backend, the select-file dialog opens but the
# chosen file never reaches the page — uploads silently do nothing. The
# daemons install as flat files in /usr/libexec on Debian bookworm.
if [ -x /usr/libexec/xdg-desktop-portal ] && [ -x /usr/libexec/xdg-desktop-portal-gtk ]; then
  /usr/libexec/xdg-desktop-portal >/tmp/alternativebot/portal.log 2>&1 &
  /usr/libexec/xdg-desktop-portal-gtk >/tmp/alternativebot/portal-gtk.log 2>&1 &
fi

xsetroot -solid "#111113" >/dev/null 2>&1 || true
mkdir -p /tmp/fluxbox-home/.fluxbox
cp /etc/alternativebot/fluxbox/init /tmp/fluxbox-home/.fluxbox/init
cp /etc/alternativebot/fluxbox/apps /tmp/fluxbox-home/.fluxbox/apps 2>/dev/null || true
cp /etc/alternativebot/fluxbox/menu /tmp/fluxbox-home/.fluxbox/menu 2>/dev/null || true
cat > /tmp/fluxbox-home/.fluxbox/startup <<'EOF'
#!/bin/sh
xsetroot -solid "#111113"
exec fluxbox -rc /tmp/fluxbox-home/.fluxbox/init
EOF
chmod +x /tmp/fluxbox-home/.fluxbox/startup
HOME=/tmp/fluxbox-home /tmp/fluxbox-home/.fluxbox/startup >/tmp/alternativebot/fluxbox.log 2>&1 &

register_browser_handler() {
  local mime="$1"
  if ! xdg-mime default alternativebot-browser.desktop "$mime" >/dev/null 2>&1 \
    || [[ "$(xdg-mime query default "$mime" 2>/dev/null || true)" != "alternativebot-browser.desktop" ]]; then
    echo "failed to register alternativebot-browser for $mime" >&2
    exit 1
  fi
}
register_browser_handler x-scheme-handler/http
register_browser_handler x-scheme-handler/https
register_browser_handler text/html
if ! xdg-settings set default-web-browser alternativebot-browser.desktop >/dev/null 2>&1 \
  || [[ "$(xdg-settings get default-web-browser 2>/dev/null || true)" != "alternativebot-browser.desktop" ]]; then
  echo "failed to set default web browser to alternativebot-browser" >&2
  exit 1
fi

x11vnc -display :1 -forever -shared -viewonly -nopw -listen 127.0.0.1 -rfbport 5900 -xkb -ncache 0 >/tmp/alternativebot/x11vnc.log 2>&1 &

NOVNC_ROOT=/usr/share/novnc
if [[ ! -d "$NOVNC_ROOT" ]]; then
  echo "noVNC is missing from the computer image" >&2
  exit 1
fi
if [[ ! -f "$NOVNC_ROOT/embed.html" ]]; then
  echo "noVNC embed.html is missing from the computer image" >&2
  exit 1
fi
if [[ ! -f "$NOVNC_ROOT/clipboard-bridge.js" ]]; then
  echo "noVNC clipboard-bridge.js is missing from the computer image" >&2
  exit 1
fi
if [[ ! -f "$NOVNC_ROOT/mobile-keyboard.js" ]]; then
  echo "noVNC mobile-keyboard.js is missing from the computer image" >&2
  exit 1
fi
# The screen proxy reaches this isolated container through its bridge interface.
websockify --heartbeat=30 --web="$NOVNC_ROOT" --token-plugin=TokenFile --token-source=/tmp/alternativebot/view-target-1 0.0.0.0:6080 >/tmp/alternativebot/novnc.log 2>&1 &

wait "$XVFB_PID"
echo "Xvfb exited" >&2
exit 1
