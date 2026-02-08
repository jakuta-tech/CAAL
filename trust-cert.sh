#!/usr/bin/env bash
# trust-cert.sh — Install CAAL's self-signed certificate into the OS/browser trust store.
# Usage: ./trust-cert.sh [--yes]

set -euo pipefail

CERT="./certs/server.crt"
AUTO_YES=false

for arg in "$@"; do
    case "$arg" in
        --yes|-y) AUTO_YES=true ;;
    esac
done

if [ ! -f "$CERT" ]; then
    echo "No certificate found at $CERT — start the stack first so it is generated."
    exit 0
fi

if [ "$AUTO_YES" = false ]; then
    printf "Trust the CAAL self-signed certificate so browsers stop showing warnings? [y/N] "
    read -r answer
    case "$answer" in
        [Yy]*) ;;
        *) echo "Skipped."; exit 0 ;;
    esac
fi

OS="$(uname -s)"

case "$OS" in
    Darwin)
        echo "Installing certificate into macOS System Keychain..."
        sudo security add-trusted-cert -d -r trustRoot \
            -k /Library/Keychains/System.keychain "$CERT"
        echo "Done — certificate trusted on macOS."
        ;;

    Linux)
        # System trust store
        if [ -d /usr/local/share/ca-certificates ]; then
            echo "Installing certificate (Debian/Ubuntu)..."
            sudo cp "$CERT" /usr/local/share/ca-certificates/caal.crt
            sudo update-ca-certificates
        elif [ -d /etc/pki/ca-trust/source/anchors ]; then
            echo "Installing certificate (RHEL/Fedora)..."
            sudo cp "$CERT" /etc/pki/ca-trust/source/anchors/caal.pem
            sudo update-ca-trust
        elif command -v trust >/dev/null 2>&1; then
            echo "Installing certificate (Arch/p11-kit)..."
            sudo trust anchor --store "$CERT"
        else
            echo "Warning: could not detect CA trust directory. Skipping system trust."
        fi

        # Chrome (NSS database)
        if command -v certutil >/dev/null 2>&1; then
            NSSDB="$HOME/.pki/nssdb"
            if [ -d "$NSSDB" ]; then
                echo "Adding certificate to Chrome trust store..."
                certutil -d sql:"$NSSDB" -D -n "CAAL" 2>/dev/null || true
                certutil -d sql:"$NSSDB" -A -t "C,," -n "CAAL" -i "$CERT"
            fi

            # Firefox profiles
            for profile in "$HOME"/.mozilla/firefox/*.default*; do
                if [ -d "$profile" ]; then
                    echo "Adding certificate to Firefox profile $(basename "$profile")..."
                    certutil -d sql:"$profile" -D -n "CAAL" 2>/dev/null || true
                    certutil -d sql:"$profile" -A -t "C,," -n "CAAL" -i "$CERT"
                fi
            done
        else
            echo "Tip: install certutil (libnss3-tools) to also trust the cert in Chrome/Firefox."
        fi

        echo "Done — certificate trusted on Linux."
        ;;

    *)
        echo "Unsupported OS: $OS. Please import $CERT manually."
        exit 1
        ;;
esac
