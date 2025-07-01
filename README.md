## INTRODUCTION# PDF to LLM

A tool to process PDF documents and prepare them for Large Language Models (LLM) consumption.

## Introduction

This project provides functionality to split, process, and convert PDF documents into a format suitable for use with Large Language Models. It handles various PDF formats and ensures the output is optimized for LLM processing.

## Prerequisites

- Node.js (v16 or higher)
- PNPM package manager
- PDF processing capabilities
- Wrangler CLI (for deployment)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pdf_to_llm
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy the environment variables file:
```bash
cp .env.example .env
```

4. Configure your environment variables in the `.env` file

## Usage

To process a PDF file:
```bash
npm run dev <file absolute path>
```
## Project Structure

```
.
├── src/
│   ├── index.js          # Main entry point
│   └── scripts/
│       └── splittingPdf.js   # PDF processing logic
├── test/
│   └── data/             # Test PDF files
└── .wrangler/            # Wrangler configuration
```

## Development

To run the development server:
before that uncomment line number 144 to 146 in src/index.js
```bash
npm run dev <file absolute path>
```

## Testing

Test files are located in the `test/data` directory. You can use these files to verify the PDF processing functionality.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

[Add your license here]