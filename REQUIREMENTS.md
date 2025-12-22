# System Requirements

Complete requirements for running BOZLY.

---

## Operating System

### Supported
- **macOS** 10.15 (Catalina) or later
- **Linux** (Ubuntu 20.04+, Debian 10+, Fedora 33+, etc.)
- **WSL2** on Windows (Windows Subsystem for Linux 2)

### Not Supported
- **Native Windows** — Use WSL2 instead
- **Windows PowerShell** — Not planned

---

## Required Software

### 1. Node.js (Required)

**Minimum version:** Node.js 18+

**Check if installed:**
```bash
node --version
# Should show: v18.0.0 or higher

npm --version
# Should show: 8.0.0 or higher
```

**Installation:**

*macOS (Homebrew):*
```bash
brew install node
```

*Ubuntu/Debian:*
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

*Or download:* https://nodejs.org/

### 2. AI CLI Tool (At Least One Required)

BOZLY works with any AI CLI. You need at least one installed:

| Provider | CLI | Check | Install |
|----------|-----|-------|---------|
| **Claude** | `claude` | `command -v claude` | `npm install -g @anthropic-ai/claude-code` |
| **GPT** | `gpt` | `command -v gpt` | `pip install openai-cli` |
| **Ollama** | `ollama` | `command -v ollama` | `brew install ollama` |
| **Gemini** | `gemini` | `command -v gemini` | See Google AI docs |

**Check what you have:**
```bash
command -v claude && echo "Claude: OK" || echo "Claude: not found"
command -v gpt && echo "GPT: OK" || echo "GPT: not found"
command -v ollama && echo "Ollama: OK" || echo "Ollama: not found"
```

**Recommended:** Install Claude Code for the best experience:
```bash
npm install -g @anthropic-ai/claude-code
```

### 3. Bash Shell (Required)

**Minimum version:** Bash 3.2+

**Check if installed:**
```bash
bash --version
# Should show: GNU bash, version 3.2.0 or higher
```

**Included by default:** Yes (macOS and Linux include Bash)

---

## Optional Software

### Git (Recommended)

For cloning BOZLY from source:

```bash
git --version
# Should show git version 2.x.x
```

**Installation:**
- macOS: `brew install git`
- Ubuntu: `sudo apt-get install git`

### Homebrew (macOS, Optional)

Alternative installation method:

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install BOZLY
brew tap retroghostlabs/bozly
brew install bozly
```

---

## Hardware Requirements

BOZLY is lightweight:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 256 MB | 512 MB |
| Disk | 50 MB | 100 MB |
| CPU | Any modern CPU | — |

**Note:** Your AI CLI (Claude, GPT, etc.) has its own requirements. BOZLY itself is minimal.

---

## Network Requirements

- Internet connection for npm installation
- Internet connection for AI CLI (unless using local Ollama)
- No BOZLY-specific cloud services required

---

## Verification Checklist

Run these commands to verify your system is ready:

```bash
# 1. Check Node.js
node --version
# Expected: v18.0.0+

# 2. Check npm
npm --version
# Expected: 8.0.0+

# 3. Check at least one AI CLI
command -v claude || command -v gpt || command -v ollama
# Expected: path to one CLI

# 4. Check Bash
bash --version
# Expected: 3.2+
```

If all checks pass, you're ready to install BOZLY:
```bash
npm install -g bozly
bozly --version
```

---

## Troubleshooting

### "npm command not found"

Node.js is not installed. Install it:
```bash
# macOS
brew install node

# Ubuntu
sudo apt-get install nodejs npm
```

### "claude command not found"

Claude Code is not installed. Install it:
```bash
npm install -g @anthropic-ai/claude-code
```

### Permission errors on npm install

Use npm with proper permissions:
```bash
# Option 1: Use sudo (not recommended)
sudo npm install -g bozly

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g bozly
```

### WSL2 Issues

Ensure you're using WSL2 (not WSL1):
```bash
wsl --list --verbose
# VERSION should be 2
```

If using WSL1, upgrade:
```bash
wsl --set-version <distro> 2
```

---

## Next Steps

Once requirements are met:
1. Install BOZLY: `npm install -g bozly`
2. Create your first node: `bozly init`
3. Read [GETTING-STARTED.md](docs/GETTING-STARTED.md)

---

*BOZLY: Build. OrganiZe. Link. Yield.*

*Last updated: 2025-12-16*
