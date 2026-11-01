// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  chooseServer: vi.fn(),
  retry: vi.fn(),
  styles: new Proxy({}, { get: () => ({}) }),
}));

vi.mock("react-native", () => ({
  ActivityIndicator: () => createElement("span", { "data-testid": "spinner" }),
  StyleSheet: { create: (value: unknown) => value },
  Text: ({ children }: { children?: unknown }) => createElement("span", null, children as never),
  View: ({ children }: { children?: unknown }) => createElement("div", null, children as never),
}));
vi.mock("./api", () => ({ currentApiBase: () => "http://127.0.0.1:3100" }));
vi.mock("./i18n", () => ({
  useI18n: () => ({
    t: (text: string, values?: Record<string, string>) =>
      values
        ? Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, value), text)
        : text,
  }),
}));
vi.mock("./native", () => ({
  native: new Proxy({}, { get: () => "#000" }),
  useResolvedAppearance: () => "light",
  useThemedStyles: () => state.styles,
}));
vi.mock("../components/native-symbol", () => ({ NativeSymbol: () => null }));
vi.mock("../components/native-action-button", () => ({
  NativeActionButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
    createElement("button", { type: "button", onClick: onPress }, label),
}));

import { HomeErrorState } from "../components/home-error-state";

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;
async function render(props: Parameters<typeof HomeErrorState>[0]) {
  root = createRoot(container);
  await act(async () => root.render(createElement(HomeErrorState, props)));
}
function button(label: string) {
  return [...container.querySelectorAll("button")].find((node) => node.textContent === label);
}
afterEach(async () => {
  await act(async () => root?.unmount());
  container.innerHTML = "";
  vi.clearAllMocks();
});

describe("home error state", () => {
  it("names the rejected address and offers another server", async () => {
    await render({
      kind: "session",
      message: "Could not sign in",
      loading: false,
      onRetry: state.retry,
      onChooseServer: state.chooseServer,
    });

    expect(container.textContent).toContain("Could not sign in");
    expect(container.textContent).toContain("http://127.0.0.1:3100");

    await act(async () => button("Choose a server")?.click());
    expect(state.chooseServer).toHaveBeenCalledOnce();

    await act(async () => button("Try again")?.click());
    expect(state.retry).toHaveBeenCalledOnce();
  });

  it("keeps the retry alone when there is no other server to pick", async () => {
    await render({
      kind: "session",
      message: "Could not sign in",
      loading: false,
      onRetry: state.retry,
    });

    expect(button("Choose a server")).toBeUndefined();
    await act(async () => button("Try again")?.click());
    expect(state.retry).toHaveBeenCalledOnce();
  });

  it("reports an unreachable server as its own failure", async () => {
    await render({
      kind: "offline",
      message: "Could not reach the server",
      loading: false,
      onRetry: state.retry,
    });

    expect(container.textContent).toContain("Could not reach the server");
    expect(container.textContent).toContain("No answer from http://127.0.0.1:3100");
  });

  it("offers the address when a saved session cannot reach the server", async () => {
    await render({
      kind: "offline",
      message: "Could not reach the server",
      loading: false,
      onRetry: state.retry,
      onChooseServer: state.chooseServer,
    });

    await act(async () => button("Choose a server")?.click());
    expect(state.chooseServer).toHaveBeenCalledOnce();
  });

  it("keeps the address off a server fault, where it is not the cause", async () => {
    await render({
      kind: "server",
      message: "The server had a problem",
      loading: false,
      onRetry: state.retry,
    });

    expect(container.textContent).toContain("The server had a problem");
    expect(container.textContent).not.toContain("127.0.0.1");
    expect(button("Try again")).toBeUndefined();
  });
});
