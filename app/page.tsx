import { useChat } from "ai/react";
import { StreamingTextResponse, LangChainStream, Message } from "ai";
import {
  ChatOpenAI,
  ChatOpenAICallOptions,
} from "langchain/chat_models/openai";
import { AIMessage, HumanMessage, SystemMessage } from "langchain/schema";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PromptTemplate } from "langchain/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "langchain/schema/runnable";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { StringOutputParser } from "langchain/schema/output_parser";
import Chat from "./components/chat";
import fs from "fs";
import pdf from "@cyber2024/pdf-parse-fixed";
import path from "path";
import { RetrievalQAChain, loadQAStuffChain } from "langchain/chains";

export async function bla(): Promise<string> {
  const llm = new ChatOpenAI({
    streaming: true,
    temperature: 0,
  });

  const filePath = path.join(__dirname, "../../../app/cvs", "fakeCv1.pdf");

  const buffer = fs.readFileSync(filePath);
  const parsedPdf = await pdf(buffer);

  const vectorStore = await MemoryVectorStore.fromDocuments(
    [{ pageContent: parsedPdf.text, metadata: parsedPdf.metadata }],
    new OpenAIEmbeddings()
  );

  // const retriever = vectorStore.asRetriever();

  const chain = new RetrievalQAChain({
    combineDocumentsChain: loadQAStuffChain(llm, {}),
    retriever: vectorStore.asRetriever(1),
    returnSourceDocuments: true,
  });

  const res = await chain.call({ query: "What are Emily's skills?" });

  return res.text.split("\n").join(" ");
}

export default async function Home() {
  const blaResult = await bla();
  console.log({ blaResult });
  return <Chat />;
}
