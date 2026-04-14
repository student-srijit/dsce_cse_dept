import assert from "node:assert/strict";

function createRequest(body: unknown): any {
  return {
    json: async () => body,
  };
}

async function run(): Promise<void> {
  const route = await import(
    "../../app/api/gramcredit/interview-questions/route"
  );

  const response = await route.POST(
    createRequest({
      language: "hi",
      farmerProfile: {
        name: "Ramesh",
        cropType: "wheat",
        landSizeHectares: 2.5,
        requestedLoanAmount: 25000,
        loanPurpose: "medical",
        preferredLanguage: "hi",
      },
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    questions: string[];
    source: "groq" | "fallback";
    language: string;
  };

  assert.equal(payload.language, "hi");
  assert.ok(Array.isArray(payload.questions));
  assert.equal(payload.questions.length, 5);
  assert.ok(payload.questions.every((q) => typeof q === "string" && q.length > 0));
  assert.ok(payload.source === "groq" || payload.source === "fallback");

  console.log("Interview question API tests passed.");
}

run().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
