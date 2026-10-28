const targets = await fetch("http://localhost:9222/json").then((response) => response.json());
const target = targets.find((entry) => entry.type === "page");
if (!target) throw new Error("No Chrome page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
});

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await command("Runtime.enable");
await command("Page.enable");
await command("Page.navigate", { url: "http://localhost:3000" });
await new Promise((resolve) => setTimeout(resolve, 1500));

const initialText = await evaluate("document.body.innerText");
if (!initialText.includes("Browser sign → backend verify")) {
  throw new Error(`App did not render correctly: ${initialText}`);
}
await evaluate("document.querySelector('button').click()");

let finalText = "";
for (let attempt = 0; attempt < 60; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  finalText = await evaluate("document.body.innerText");
  if (finalText.includes("Backend verification succeeded.") || finalText.includes("Error:")) break;
}

socket.close();
if (browserErrors.length) throw new Error(`Browser exceptions: ${browserErrors.join("; ")}`);
if (!finalText.includes("Backend verification succeeded.")) {
  throw new Error(`End-to-end flow failed:\n${finalText}`);
}

console.log(finalText);
