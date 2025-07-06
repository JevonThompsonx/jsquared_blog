import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Home from "./components/Home.tsx";
import { BrowserRouter, Routes, Route } from "react-router";
// import { drizzle } from "drizzle-orm/libsql";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
