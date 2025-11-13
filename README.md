# Goose Code Review Tool

A local AI-assisted code review tool with a web-based interface.

## Features

- **CLI-based**: Run `goose` in any project directory to start the review tool
- **Local server**: Automatically starts a local server and opens the browser
- **Read-only**: View and analyze code without editing capabilities
- **AI analysis**: Automated code quality, security, and performance analysis
- **UML visualization**: Generate class diagrams and flowcharts from code

## Installation

### Install from npm (Recommended)

```bash
# Install globally
npm install -g @kuochunchang/goose-code-review

# Or use npx without installing
npx @kuochunchang/goose-code-review
```

### Install from Source (For Development)

```bash
# Clone the repository
git clone https://github.com/kuochunchang/goose-sight.git
cd code-review-goose

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for local development
npm link
```

## Quick Start

After installation, navigate to your project directory and run:

```bash
cd /path/to/your-project
goose
```

The tool will automatically start a local server and open your browser.

## Usage

```bash
# Start in your project directory
cd /path/to/your-project
goose

# Specify custom port
goose -p 8080

# Prevent automatic browser opening
goose --no-open

# View help
goose --help
```

The tool will automatically:

1. Start a local web server
2. Open your default browser
3. Display the code review interface

All data is stored locally in `.code-review/` directory within your project.

## Configuration

### AI Provider Setup

Before using AI analysis features, you need to configure your AI provider.

**Configure OpenAI API Key**:

- The first time you run `goose`, it will prompt you to enter your OpenAI API key
- Or manually create `.code-review/config.json` in your project directory:

```json
{
  "aiProvider": "openai",
  "openai": {
    "apiKey": "sk-your-api-key-here",
    "model": "gpt-4"
  }
}
```

**Get your OpenAI API Key**:

- Visit [OpenAI Platform](https://platform.openai.com/api-keys)
- Create a new API key
- Copy and paste it into the configuration

### Advanced Configuration

The `.code-review/config.json` file supports additional options:

```json
{
  "aiProvider": "openai",
  "openai": {
    "apiKey": "sk-your-api-key-here",
    "model": "gpt-4"
  },
  "ignorePatterns": ["node_modules", ".git", "dist", "build", "*.log"],
  "maxFileSize": 5242880
}
```

- `ignorePatterns`: Array of glob patterns to exclude from analysis
- `maxFileSize`: Maximum file size in bytes (default: 5MB)

## Development

For development setup and contribution guidelines, see:

- [Development Guide](./docs/DEVELOPMENT.md)

## License

MIT License
