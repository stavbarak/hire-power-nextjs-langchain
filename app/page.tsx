import Chat from "./components/chat";
import { upload } from "./upload";

export default async function Home() {
  return (
    <div>
      <form action={upload}>
        <input type="file" name="file" />
        <button type="submit">Upload</button>
      </form>
      <Chat />
    </div>
  );
}
