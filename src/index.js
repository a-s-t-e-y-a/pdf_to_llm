import splitAllTextFromPdf from './scripts/splittingPdf.js'
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { GoogleGenAI } from "@google/genai"
import 'dotenv/config'
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import chalk from 'chalk';
const rl = readline.createInterface({ input, output });
const promptTemplate = PromptTemplate.fromTemplate(
  `I am going to give you the context and ask the question related to that context you have to just frame the answer according to that context, 
  context : {context}
  Question: {question}
  ` 
);
const {
  GOOGLE_GENAI_API_KEY,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID,
  VECTORIZE_INDEX_NAME
} = process.env;

async function insertToVectorize(vectors) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX_NAME}/insert`;
  
  // Convert vectors to NDJSON format
  const ndjsonData = vectors.map(vector => JSON.stringify(vector)).join('\n');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/x-ndjson'
    },
    body: ndjsonData
  });
  console.log(response)
  if (!response.ok) {
    throw new Error(`Failed to insert vectors: ${await response.text()}`);
  }
  return await response.json();
}
async function createEmbedding(documents) {
    const ai = new GoogleGenAI({apiKey: GOOGLE_GENAI_API_KEY});
    const embeddingResponse = await ai.models.embedContent({
        model: 'embedding-001',
        contents: [documents],
      });

      return embeddingResponse.embeddings[0].values;

}
async function queryVectorize(vector, topK = 5) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX_NAME}/query`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vector: vector,
      topK: topK,
      returnMetadata: "all",  // Get all metadata
      // returnValues: true 
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to query vectors: ${await response.text()}`);
  }
  
  const result = await response.json();
  return result.result.matches;
}
async function streamResponse(promptInput) {
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    temperature: 0,
    maxRetries: 2,
    apiKey: GOOGLE_GENAI_API_KEY
  });

  try {
    process.stdout.write(chalk.green('Assistant: '));
    const stream = await llm.stream(promptInput);
    for await (const chunk of stream) {
      process.stdout.write(chunk.content);
    }
    console.log('\n');
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
  }
}
async function processDocument(filePath) {
  try {
    const result = await splitAllTextFromPdf(filePath);
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const documents = await splitter.createDocuments([result.text]);
    console.log(`Processing ${documents.length} chunks...`);

    const ai = new GoogleGenAI({apiKey: GOOGLE_GENAI_API_KEY});
    const vectors = [];

    for (const doc of documents) {
      // Get embedding for each chunk
      const embeddingResponse = await ai.models.embedContent({
        model: 'embedding-001',
        contents: [doc.pageContent],
      });

      // Prepare vector data
      vectors.push({
        id: crypto.randomUUID(),
        values: embeddingResponse.embeddings[0].values,
        metadata: { text: doc.pageContent }
      });
    }

    // Batch insert all vectors
    const vectorResponse = await insertToVectorize(vectors);
    console.log(`Vectors queued for insertion. Mutation ID: ${vectorResponse.result.mutationId}`);
    console.log('All chunks processed and queued successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Main execution
const FilePath = process.argv[2];
if (!FilePath) {
  console.error('Please provide a PDF file path');
  process.exit(1);
}

// processDocument(FilePath)
//   .then(() => console.log('Processing complete!'))
//   .catch(err => console.error('Processing failed:', err));

console.log("Document get vectorize peroperly, now you can use it in your application!");

async function displayChatHeader() {
  console.clear();
  console.log(chalk.cyan('╭──────────────────────────────────╮'));
  console.log(chalk.cyan('│        PDF Chat Assistant        │'));
  console.log(chalk.cyan('╰──────────────────────────────────╯\n'));
  console.log(chalk.gray('Type "exit" to quit\n'));
}

async function startChat() {
  await displayChatHeader();
  
  while(true) {
    const question = await rl.question(chalk.yellow('You: '));
    
    if (question.toLowerCase() === 'exit') {
      console.log(chalk.gray('\nGoodbye! 👋'));
      rl.close();
      process.exit(0);
    }

    try {
      const vector = await createEmbedding(question);
      const results = await queryVectorize(vector);
      
      const templateResult = await promptTemplate.invoke({
        context: results.map(r => r.metadata.text).join('\n'),
        question: question
      });

      await streamResponse(templateResult.value);
      console.log(chalk.gray('─'.repeat(50)));
      
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
      console.log(chalk.gray('─'.repeat(50)));
    }
  }
}

// Replace the existing while loop with:
await startChat();