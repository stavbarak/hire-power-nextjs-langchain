import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  BytesOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import fs from "fs/promises";
import pdf from "@cyber2024/pdf-parse-fixed";
import path from "path";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// combine documents into a single string
const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join("\n\n");
};

// format chat history into a human-readable format
const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === "user") {
      return `Human: ${message.content}`;
    } else if (message.role === "assistant") {
      return `Assistant: ${message.content}`;
    } else {
      return `${message.role}: ${message.content}`;
    }
  });
  return formattedDialogueTurns.join("\n");
};

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`;
const condenseQuestionPrompt = PromptTemplate.fromTemplate(
  CONDENSE_QUESTION_TEMPLATE
);

const ANSWER_TEMPLATE = `You are an assistant helping to hire a candidate. 
If the user says hello, you should say hello back. You can have a small talk about anything.
Only if asked about candidates, answer the question you are asked, based on the following context and chat history:
<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}

`;

const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

/**
 * This handler initializes and calls a retrieval chain. It composes the chain using
 * LangChain Expression Language. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#conversational-retrieval-chain
 */
export async function POST(req: NextRequest) {
  try {
    const directoryPath = path.join(process.cwd(), "app/cvs");

    // Read the directory
    const files = await fs.readdir(directoryPath);

    // Read and parse all PDF files in the directory
    const parsedPdfs = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directoryPath, file);
        const pdfFile = await fs.readFile(filePath);
        const parsedPdf = await pdf(pdfFile);
        return parsedPdf;
      })
    );

    const mappedPdfs = parsedPdfs.map((parsedPdf) => ({
      pageContent: parsedPdf.text,
      metadata: parsedPdf.metadata,
    }));

    const vectorStore = await MemoryVectorStore.fromDocuments(
      mappedPdfs,
      new OpenAIEmbeddings()
    );

    // The body of the POST request should contain the messages in the chat.
    // The last message in the array is the current message.
    // The previous messages are used to provide context to the AI model.
    const body = await req.json();
    const messages = body.messages ?? [];
    const previousMessages = messages.slice(0, -1);
    const currentMessageContent = messages[messages.length - 1].content;

    // Initialize the OpenAI model
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-1106",
      temperature: 0,
    });

    /**
     * We use LangChain Expression Language to compose two chains.
     * To learn more, see the guide here:
     *
     * https://js.langchain.com/docs/guides/expression_language/cookbook
     *
     * You can also use the "createRetrievalChain" method with a
     * "historyAwareRetriever" to get something prebaked.
     */

    // This chain takes the current question, condenses it into a standalone question, and then uses the model to generate a response.
    const standaloneQuestionChain = RunnableSequence.from([
      condenseQuestionPrompt,
      model,
      new StringOutputParser(),
    ]);

    let resolveWithDocuments: (value: Document[]) => void;

    const retriever = vectorStore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd(documents) {
            resolveWithDocuments(documents);
          },
        },
      ],
    });

    // This chain uses the vector store to retrieve relevant documents based on the current question.
    const retrievalChain = retriever.pipe(combineDocumentsFn);

    // This chain combines the context (retrieved documents and chat history) and the current question,
    // then uses the model to generate an answer.
    const answerChain = RunnableSequence.from([
      {
        context: RunnableSequence.from([
          (input) => input.question,
          retrievalChain,
        ]),
        chat_history: (input) => input.chat_history,
        question: (input) => input.question,
      },
      answerPrompt,
      model,
    ]);

    // This chain combines the standalone question chain and the answer chain to process the question
    // and generate an answer based on the conversation history and the PDF content.
    const conversationalRetrievalQAChain = RunnableSequence.from([
      {
        question: standaloneQuestionChain,
        chat_history: (input) => input.chat_history,
      },
      answerChain,
      new BytesOutputParser(),
    ]);

    // The function executes the conversational retrieval QA chain with the current question and formatted chat history.
    const stream = await conversationalRetrievalQAChain.stream({
      question: currentMessageContent,
      chat_history: formatVercelMessages(previousMessages),
    });
    // It streams the response back to the client using StreamingTextResponse
    return new StreamingTextResponse(stream);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
