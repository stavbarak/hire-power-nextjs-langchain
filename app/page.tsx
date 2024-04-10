import Chat from "./components/chat";
import { upload } from "./upload";

export default async function Home() {
  return (
    <div>
      <div className="form-container">
        <form action={upload}>
          <input type="file" name="file" />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Upload
          </button>
        </form>
      </div>
      <Chat />
    </div>
  );
}
