import { describe, expect, it } from "vitest";

import { validateWebhookUrl } from "./url-validator";

describe("validateWebhookUrl", () => {
  it("accepts valid https URL", () => {
    expect(validateWebhookUrl("https://discord.com/api/webhooks/123/abc")).toBe(true);
  });

  it("rejects http", () => {
    expect(validateWebhookUrl("http://example.com/webhook")).toBe(false);
  });

  it("rejects empty", () => {
    expect(validateWebhookUrl("")).toBe(false);
  });

  it("rejects localhost", () => {
    expect(validateWebhookUrl("https://localhost/webhook")).toBe(false);
  });

  it("rejects private IPs", () => {
    expect(validateWebhookUrl("https://10.0.0.1/webhook")).toBe(false);
    expect(validateWebhookUrl("https://172.16.0.1/webhook")).toBe(false);
    expect(validateWebhookUrl("https://192.168.1.1/webhook")).toBe(false);
    expect(validateWebhookUrl("https://127.0.0.1/webhook")).toBe(false);
  });

  it("rejects link-local", () => {
    expect(validateWebhookUrl("https://169.254.1.1/webhook")).toBe(false);
  });
});
