/** @jsxRuntime automatic */
import type { TransactionalEmail } from "@alternativebot/adapter-kit";
import { ANDROID_APK_URL } from "@alternativebot/contracts";
import { displayName } from "@alternativebot/core";
import { Link, Text } from "react-email";
import { linkStyle, message } from "./email.js";

const APPS = [
  ["Android", ANDROID_APK_URL],
  ["Mac", "https://alternativebot.com/api/download?platform=mac"],
  ["Windows", "https://alternativebot.com/api/download?platform=windows"],
  ["Linux", "https://alternativebot.com/api/download?platform=linux"],
] as const;

export function welcomeEmail(
  user: { email: string; name: string },
  unsubscribeUrl: string,
): Promise<TransactionalEmail> {
  return message(
    user.email,
    "Welcome to Alternative Bot",
    <>
      <Text>Hi {displayName(user.name, "there")},</Text>
      <Text>Thanks for signing up for AlternativeBot.</Text>
      <Text>
        Alternative Bot also has apps for{" "}
        {APPS.map(([name, href], index) => (
          <span key={name}>
            {index === APPS.length - 1 ? "and " : ""}
            <Link href={href} style={linkStyle}>
              {name}
            </Link>
            {index === APPS.length - 1 ? "." : ", "}
          </span>
        ))}
      </Text>
      <Text>
        Alternative Bot is open source. If you like it,{" "}
        <Link href="https://github.com/NETO-DEV66/alternativebot" style={linkStyle}>
          a star on GitHub
        </Link>{" "}
        helps others find it.
      </Text>
      <Text>
        Want to run it on your own servers?{" "}
        <Link
          href="https://github.com/NETO-DEV66/alternativebot/blob/main/docs/self-host.md"
          style={linkStyle}
        >
          Self-host Alternative Bot
        </Link>
        .
      </Text>
      <Text>Have any questions? Reply to this email.</Text>
    </>,
    unsubscribeUrl,
  );
}
