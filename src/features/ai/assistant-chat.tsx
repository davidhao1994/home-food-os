"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const examples = [
  "What can I cook tonight?",
  "Which food expires this week?",
  "Create a Costco shopping list.",
  "I want 180g protein tomorrow.",
  "Recommend Chinese dishes."
];

export function AssistantChat() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const send = async (nextPrompt?: string) => {
    const input = (nextPrompt ?? prompt).trim();
    if (!input) {
      return;
    }

    setMessages((current) => [...current, { role: "user", text: input }]);
    setPrompt("");

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input })
    });

    if (!response.ok) {
      setMessages((current) => [...current, { role: "assistant", text: "Unable to process request right now." }]);
      return;
    }

    const data = await response.json();
    setMessages((current) => [...current, { role: "assistant", text: data.response }]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Food Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => send(example)}
                className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="max-h-72 space-y-2 overflow-auto rounded-lg border p-3">
            {messages.length === 0 ? <p className="text-sm text-muted-foreground">Start a conversation with your assistant.</p> : null}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-md p-2 text-sm ${message.role === "user" ? "bg-primary/10" : "bg-muted"}`}
              >
                <p className="mb-1 text-xs uppercase text-muted-foreground">{message.role}</p>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask your food assistant" />
            <Button className="w-full sm:w-auto" type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
