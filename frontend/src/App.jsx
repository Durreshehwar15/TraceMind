import { useState } from "react";
import "./App.css";

const LINE_HEIGHT = 22;

const EXAMPLES = [
  {
    name: "Divide by zero",
    code: "def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))",
    error: "ZeroDivisionError: division by zero",
  },
  {
    name: "List index",
    code: "def pick(items, n):\n    return items[n]\n\nprint(pick([4, 8, 15], 5))",
    error: "IndexError: list index out of range",
  },
  {
    name: "Missing key",
    code: "user = {'name': 'Sam'}\nprint(user['email'])",
    error: "KeyError: 'email'",
  },
];

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M3 24 C 10 24, 10 8, 17 8 S 24 22, 29 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="17" cy="8" r="3.6" fill="#E0314B" />
    </svg>
  );
}

function Station({ state, title, index, children }) {
  return (
    <li className={`station ${state}`} style={{ "--i": index }}>
      <span className="node" aria-hidden="true">
        {state === "done" && "✓"}
        {state === "fault" && "!"}
      </span>
      <div className="station-body">
        <h3>{title}</h3>
        {children}
      </div>
    </li>
  );
}

function App() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [error, setError] = useState(EXAMPLES[0].error);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [copied, setCopied] = useState(false);


async function analyzeBug(event) {
  event.preventDefault();
  setLoading(true);
  setResult(null);

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, error }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail || "Request failed")
      );
    }

    setResult({
      cause: data.cause || data.message,
      location: data.location ||
        `Backend received ${data.code_length} characters of code.`,
      fix: data.fix ||
        "The backend is connected. Actual AI debugging is the next step.",
      patch: data.patch || "No patch generated yet.",
      status: data.status || "Received — not verified by tests.",
    });
  } catch (err) {
    setResult({
      cause: "Could not connect to the backend.",
      location: err.message,
      fix: "Check that the Python server is running on port 8000.",
      patch: "No patch generated.",
      status: "Request failed — no analysis was performed.",
    });
  } finally {
    setLoading(false);
  }
}


  const lineCount = code.split("\n").length;
  const traced = Boolean(result);
  const failed = traced && /^request failed/i.test(result.status || "");
  const hasPatch =
    traced && result.patch && !/^no patch/i.test(result.patch);

  function edit(setter) {
    return (e) => {
      setter(e.target.value);
      setResult(null);
    };
  }

  function loadExample(ex) {
    setCode(ex.code);
    setError(ex.error);
    setResult(null);
  }

  async function copyPatch() {
    try {
      await navigator.clipboard.writeText(result.patch);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <a className="brand" href="#top">
          <Mark />
          <span>TraceMind</span>
        </a>
        <p className="engine">
          <span className="dot" />
          Backend: 127.0.0.1:8000
        </p>
      </header>

      <section className="hero" id="top">
        <h1>
          Follow the thread
          <br />
          to the bug.
        </h1>
        <p>
          Paste your code and the error it threw. TraceMind finds the line
          where it snags, explains why, and drafts a patch for you to test.
        </p>
      </section>

      <main className="stage">
        <form className="bench" onSubmit={analyzeBug}>
          <div className="bench-head">
            <h2>Your bug</h2>
            <div className="examples" role="group" aria-label="Load an example">
              <span>Examples</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  className="chip"
                  onClick={() => loadExample(ex)}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor="source-code">Code</label>
          <div className="editor">
            <div className="gutter" aria-hidden="true">
              <div style={{ transform: `translateY(${-scroll}px)` }}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
            </div>
            <textarea
              id="source-code"
              value={code}
              onChange={edit(setCode)}
              onScroll={(e) => setScroll(e.target.scrollTop)}
              placeholder="Paste the code that fails"
              required
              spellCheck="false"
              wrap="off"
            />
          </div>

          <label htmlFor="error-message">Error or traceback</label>
          <textarea
            id="error-message"
            className="error-box"
            value={error}
            onChange={edit(setError)}
            placeholder="Paste the error message"
            required
            spellCheck="false"
          />

          <button className="trace-button" type="submit" disabled={loading}>
            {loading ? "Tracing the bug..." : "Trace this bug"}
          </button>
        </form>

        <section className="case" aria-live="polite">
          <div className="case-head">
            <h2>What we found</h2>
            {traced && (
              <span className="stamp">
                {failed ? "Request failed" : "Not tested yet"}
              </span>
            )}
          </div>

          {!traced && !loading && (
            <p className="lead">
              Run a trace and the thread below fills in, one station at a time.
            </p>
          )}
          {loading && <p className="lead">Pulling on the thread...</p>}

          {failed && (
            <div className="failbox" role="alert">
              <h3>{result.cause}</h3>
              <p className="failmsg">{result.location}</p>
              <p>{result.fix}</p>
            </div>
          )}

          <ol className={`thread ${traced && !failed ? "traced" : ""}`}>
            <Station
              index={0}
              state={traced && !failed ? "done" : "todo"}
              title="Reproduced"
            >
              {traced && !failed ? (
                <p className="errline">
                  {error.trim().split("\n").pop()}
                </p>
              ) : (
                <p className="quiet">Confirms the error you pasted.</p>
              )}
            </Station>

            <Station
              index={1}
              state={traced && !failed ? "fault" : "todo"}
              title="Where it snags"
            >
              {traced && !failed ? (
                <p>{result.location}</p>
              ) : (
                <p className="quiet">Marks the spot in your code.</p>
              )}
            </Station>

            <Station
              index={2}
              state={traced && !failed ? "done" : "todo"}
              title="Why it happens"
            >
              {traced && !failed ? (
                <p>{result.cause}</p>
              ) : (
                <p className="quiet">Explains the root cause in plain words.</p>
              )}
            </Station>

            <Station
              index={3}
              state={hasPatch && !failed ? "done" : "todo"}
              title="Patch to try"
            >
              {traced && !failed ? (
                <>
                  <p>{result.fix}</p>
                  <pre className="patch">{result.patch}</pre>
                  {hasPatch && (
                    <button type="button" className="copy" onClick={copyPatch}>
                      {copied ? "Copied" : "Copy patch"}
                    </button>
                  )}
                </>
              ) : (
                <p className="quiet">Shows what to change.</p>
              )}
            </Station>

            <Station index={4} state="todo" title="Proof">
              <p className={traced ? "" : "quiet"}>
                {traced
                  ? result.status
                  : "Stays open until the patch passes your tests."}
              </p>
            </Station>
          </ol>
        </section>
      </main>

      <footer>
        TraceMind suggests fixes. Run your tests before you ship one.
      </footer>
    </div>
  );
}

export default App;
