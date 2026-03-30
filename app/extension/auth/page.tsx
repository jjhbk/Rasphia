export default function ExtensionAuthPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Connecting to Extension...</title>

        {/* 🔑 AUTH BRIDGE SCRIPT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const params = new URLSearchParams(window.location.search);
                  const token = params.get("token");

                  if (!token) {
                    console.error("No token found in URL");
                    return;
                  }

                  // 🔔 Notify extension
                  window.postMessage(
                    {
                      source: "rasphia-web",
                      type: "EXTENSION_AUTH_TOKEN",
                      token: token,
                    },
                    "*"
                  );

                  // Optional: auto-close after success
                  setTimeout(() => {
                    window.close();
                  }, 1500);
                } catch (err) {
                  console.error("Auth bridge error:", err);
                }
              })();
            `,
          }}
        />

        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FAF7F2;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 4px 16px rgba(44,36,32,0.08);
            border: 1px solid #E8DFD3;
            max-width: 400px;
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 3px solid #E8DFD3;
            border-top: 3px solid #2C2420;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 {
            color: #2C2420;
            font-size: 22px;
            margin-bottom: 10px;
            font-weight: 600;
          }
          p {
            color: #A39B93;
            font-size: 14px;
          }
        `}</style>
      </head>

      <body>
        <div className="container">
          <div className="spinner"></div>
          <h1>Connecting to Extension...</h1>
          <p>You can close this tab if it doesn’t close automatically.</p>
        </div>
      </body>
    </html>
  );
}
