"use client";

import { useState } from "react";
import Chat from "./components/chat";
import { upload } from "./upload";

export default function Home() {
  const [active, setActive] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files ? files[0] : null;
    setActive((file && file.size > 0) ?? false);
    if (file && file.size === 0) {
      setActive(true);
    }
  };

  return (
    <div>
      <div className="form-container">
        <form action={upload}>
          <input type="file" name="file" onChange={handleChange} />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!active}
          >
            Upload
          </button>
        </form>
        <div>stavb@tikalk.com</div>
      </div>
      <Chat />
    </div>
  );
}
