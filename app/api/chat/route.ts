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
import {
  BytesOutputParser,
  StringOutputParser,
} from "langchain/schema/output_parser";
import { RetrievalQAChain, loadQAStuffChain } from "langchain/chains";
import fs from "fs";
import pdf from "@cyber2024/pdf-parse-fixed";
import path from "path";

export const runtime = "edge";

// const filePath = path.join(__dirname, "../../../app/cvs", "fakeCv1.pdf");
// const buffer = fs.readFileSync(filePath);

// const getChain = async () => {
//   const llm = new ChatOpenAI({
//     streaming: true,
//     temperature: 0
//   });

//   const filePath = path.join(__dirname, "../../../app/cvs", "fakeCv1.pdf");

//   const buffer = fs.readFileSync(filePath);
//   const parsedPdf = await pdf(buffer);

//   const vectorStore = await MemoryVectorStore.fromDocuments(
//     [{pageContent: parsedPdf.text, metadata: parsedPdf.metadata}], new OpenAIEmbeddings(),
//   )

//   const chain = new RetrievalQAChain({
//     combineDocumentsChain: loadQAStuffChain(llm,{}),
//     retriever: vectorStore.asRetriever(1),
//     returnSourceDocuments: true
//   })

//   return chain;

// }

export async function POST(req: Request) {
  const { messages } = await req.json();

  const { stream, handlers } = LangChainStream();

  const llm = new ChatOpenAI({
    streaming: true,
    temperature: 0,
  });

  // const vectorStore = await MemoryVectorStore.fromDocuments(
  //   [{pageContent: parsedPdf.text, metadata: parsedPdf.metadata}], new OpenAIEmbeddings(),
  // )

  // const chain = new RetrievalQAChain({
  //   combineDocumentsChain: loadQAStuffChain(llm,{}),
  //   retriever: vectorStore.asRetriever(1),
  //   returnSourceDocuments: true
  // })

  const vectorStore = await MemoryVectorStore.fromTexts(
    [
      "Pie is the powerhouse of the cell",
      "lysosomes are the garbage disposal of the cell",
      "the nucleus is the control center of the cell",
    ],
    [{ id: 1 }, { id: 2 }, { id: 3 }],
    new OpenAIEmbeddings()
  );

  const retriever = vectorStore.asRetriever();

  // const prompt =
  // PromptTemplate.fromTemplate(`Answer the question based only on the following context:
  // {context}

  // Question: {question}`);

  const serializeDocs = (docs: any) =>
    docs.map((doc: any) => doc.pageContent).join("\n");

  const chain = RunnableSequence.from([
    {
      context: retriever.pipe(serializeDocs),
      question: new RunnablePassthrough(),
    },
    {},
    llm,
    retriever,
    new StringOutputParser(),
  ]);

  // const result = await chain.invoke("What is the powerhouse of the cell?");

  // console.log(result);

  // const matchingNodes = await retriever.invoke(

  // "What is the powerhouse of the cell?"
  // );

  const engineeredMessages = messages.map((m: Message) =>
    m.role == "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  // engineeredMessages.unshift(cellContextMessage);

  llm.call(engineeredMessages, {}, [handlers]).catch(console.error);

  return new StreamingTextResponse(stream);
}
