// ===========================
// CONFIG RapidAPI
// ===========================
const RAPIDAPI_KEY = "86241d53b8mshe640b1d427662e5p1ea499jsn55540fbe50b9";
const RAPIDAPI_HOST = "chatgpt-42.p.rapidapi.com";
const ENDPOINT = "https://chatgpt-42.p.rapidapi.com/chat";
const MODEL = "gpt-4o-mini"; // si falla, prueba a quitarlo

// ===========================
// UI
// ===========================
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const quickQuestions = document.getElementById("quickQuestions");

// Mensajes requeridos
const WELCOME_MESSAGE =
  "Hola 👋 Soy el ChatBot Ivan. Puedes preguntarme sobre el FAQ del taller o tocar una pregunta rápida de abajo.";

const GENERIC_ERROR_MESSAGE =
  "Vaya 😅 Ahora mismo no puedo responder. Inténtalo de nuevo en unos segundos.";

const NOT_UNDERSTOOD_MESSAGE =
  "No estoy seguro de haber entendido tu pregunta. Prueba con una de las preguntas rápidas o reformula la consulta.";

// ===========================
// Helpers UI
// ===========================
function addMessage(text, who = "bot", extraClass = "") {
  const div = document.createElement("div");
  div.className = `msg ${who} ${extraClass}`.trim();
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  userInput.disabled = isLoading;
  sendBtn.textContent = isLoading ? "Enviando..." : "Enviar";
}

// ✅ Mensaje de bienvenida al abrir
window.addEventListener("DOMContentLoaded", () => {
  addMessage(WELCOME_MESSAGE, "bot");
});

// Detectar si “no entiende”
function looksLikeNotUnderstood(text) {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  if (t.length < 2) return true;

  const patterns = [
    "no entiendo",
    "no he entendido",
    "no estoy seguro",
    "podrías reformular",
    "puedes reformular",
    "no comprendo",
    "no tengo información"
  ];
  return patterns.some((p) => t.includes(p));
}

// ===========================
// API call (XMLHttpRequest)
// ===========================
function askRapidAPI(userText) {
  return new Promise((resolve, reject) => {
    const payload = {
      messages: [
        {
          role: "system",
          content:
            "Eres un chatbot de atención al cliente de un taller de coches. Responde en español, claro y breve. Si la pregunta no es del FAQ o no tienes datos, dilo y sugiere pedir cita o llamar."
        },
        { role: "user", content: userText }
      ],
      model: MODEL
    };

    const xhr = new XMLHttpRequest();
    xhr.withCredentials = false;

    // ✅ Timeout: “la API no responde”
    xhr.timeout = 15000;
    xhr.ontimeout = () => reject(new Error("Timeout: la API tardó demasiado en responder"));

    xhr.addEventListener("readystatechange", function () {
      if (this.readyState === this.DONE) {
        if (xhr.status < 200 || xhr.status >= 300) {
          return reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText || "Error"}`));
        }

        try {
          const data = JSON.parse(xhr.responseText);

          const reply =
            data?.result ||
            data?.response ||
            data?.answer ||
            data?.message ||
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.text;

          resolve(reply ? String(reply) : "");
        } catch {
          resolve(xhr.responseText || "");
        }
      }
    });

    xhr.open("POST", ENDPOINT);
    xhr.setRequestHeader("x-rapidapi-key", RAPIDAPI_KEY);
    xhr.setRequestHeader("x-rapidapi-host", RAPIDAPI_HOST);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(payload));
  });
}

// ===========================
// Envío de mensajes (función reusable)
// ===========================
async function sendUserMessage(text) {
  const msg = text.trim();
  if (!msg) return;

  addMessage(msg, "user");
  setLoading(true);

  // indicador “escribiendo…”
  const thinkingId = `thinking-${Date.now()}`;
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "msg bot meta";
  thinkingDiv.id = thinkingId;
  thinkingDiv.textContent = "Escribiendo…";
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const botReply = await askRapidAPI(msg);

    const t = document.getElementById(thinkingId);
    if (t) t.remove();

    if (looksLikeNotUnderstood(botReply)) {
      addMessage(NOT_UNDERSTOOD_MESSAGE, "bot");
    } else {
      addMessage(botReply, "bot");
    }
  } catch (err) {
    const t = document.getElementById(thinkingId);
    if (t) t.remove();

    addMessage(GENERIC_ERROR_MESSAGE, "bot");
    addMessage(String(err?.message || err), "bot", "meta");
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ===========================
// Submit del formulario
// ===========================
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value;
  userInput.value = "";
  await sendUserMessage(text);
});

// ===========================
// ✅ Opción A: botones de preguntas predefinidas
// ===========================
if (quickQuestions) {
  quickQuestions.addEventListener("click", async (e) => {
    const btn = e.target.closest(".qq");
    if (!btn) return;
    const q = btn.getAttribute("data-q");
    await sendUserMessage(q);
  });
}

