import { useState } from "react";
import { BookingPage } from "./pages/BookingPage";
import { OwnerPage } from "./pages/OwnerPage";
import "./App.css";

type Mode = "guest" | "owner";

function App() {
  const [mode, setMode] = useState<Mode>("guest");

  return (
    <div>
      <nav className="app-nav">
        <button
          type="button"
          className={mode === "guest" ? "app-nav__link app-nav__link--active" : "app-nav__link"}
          onClick={() => setMode("guest")}
        >
          Запись на звонок
        </button>
        <button
          type="button"
          className={mode === "owner" ? "app-nav__link app-nav__link--active" : "app-nav__link"}
          onClick={() => setMode("owner")}
        >
          Панель владельца
        </button>
      </nav>
      {mode === "guest" ? <BookingPage /> : <OwnerPage />}
    </div>
  );
}

export default App;
