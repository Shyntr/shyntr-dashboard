import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

window.addEventListener("unhandledrejection", (e) => {
    console.log("UNHANDLED REJECTION reason:", e.reason);
    try { console.log("reason json:", JSON.stringify(e.reason)); } catch {}
});

window.addEventListener("error", (e) => {
    console.log("WINDOW ERROR:", e.error || e.message);
    if (e.error) {
        console.log("error name:", e.error.name);
        console.log("error message:", e.error.message);
        console.log("error stack:", e.error.stack);
    }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
