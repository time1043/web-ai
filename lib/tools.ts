export const toolSchemas = [
  {
    type: "function" as const,
    function: {
      name: "navigate",
      description: "Navigate to a page by path. Available pages: / (home), /about",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "The path to navigate to, e.g. /about" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_signature",
      description: "Update the user's signature/personal motto on the about page",
      parameters: {
        type: "object",
        properties: {
          value: { type: "string", description: "The new signature text" },
        },
        required: ["value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "submit_form",
      description: "Submit the current form on the page to save changes",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];
