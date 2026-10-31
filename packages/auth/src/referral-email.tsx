/** @jsxRuntime automatic */
import type { TransactionalEmail } from "@alternativebot/adapter-kit";
import { displayName } from "@alternativebot/core";
import { Link, Text } from "react-email";
import { linkStyle, message } from "./email.js";

export function referralEmail(
  user: { email: string; name: string },
  invitePageUrl: string,
  unsubscribeUrl: string,
): Promise<TransactionalEmail> {
  return message(
    user.email,
    "Invite a friend",
    <>
      <Text>Hi {displayName(user.name, "there")},</Text>
      <Text>
        Invite a friend to Alternative Bot and earn a free month when they start a qualifying subscription
        with a new card.{" "}
        <Link href={invitePageUrl} style={linkStyle}>
          Open Alternative Bot
        </Link>{" "}
        and choose Invite friends for your link.
      </Text>
      <Text>Have any questions? Just reply to this email.</Text>
      <Text>
        If you're enjoying Alternative Bot,{" "}
        <Link href="https://github.com/elie222/alternativebot" style={linkStyle}>
          give us a star on GitHub
        </Link>
        .
      </Text>
      <Text>Elie</Text>
    </>,
    unsubscribeUrl,
  );
}
