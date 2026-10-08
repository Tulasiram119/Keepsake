import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { format, parseISO } from "date-fns";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { GratitudeCard } from "@/components/gratitude-card";
import { IconButton } from "@/components/icon-button";
import { PlanContactPanel } from "@/components/plan-contact-panel";
import { Screen } from "@/components/screen";
import { SectionTitle } from "@/components/section-title";
import { StatusPill } from "@/components/status-pill";
import { ThemedText } from "@/components/themed-text";
import { TimelineItem } from "@/components/timeline-item";
import { syncAllNotifications } from "@/services/notifications";
import { useAppStore } from "@/store";
import {
  appActions,
  useFriend,
  useFriends,
  useGratitude,
  useInteractions,
} from "@/store/hooks";
import { useTheme } from "@/theme/use-theme";
import {
  daysUntilBirthday,
  formatBirthday,
  formatDayTime,
  relativeDays,
} from "@/utils/dates";
import {
  contactStatus,
  daysUntilDue,
  formatLastContact,
  gratitudeForFriend,
  interactionsForFriend,
  isSnoozed,
  lastInteractionFor,
  statusMessage,
} from "@/utils/derived";
import { INTERACTION_META } from "@/utils/interaction-meta";

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const friend = useFriend(id);
  const friends = useFriends();
  const interactions = useInteractions();
  const gratitudeList = useGratitude();
  const { colors, radius, spacing } = useTheme();

  const [isPlanning, setIsPlanning] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const now = useMemo(() => new Date(), []);

  const friendInteractions = useMemo(
    () => (id ? interactionsForFriend(id, interactions) : []),
    [id, interactions],
  );

  const lastContact = useMemo(
    () => (id ? lastInteractionFor(id, interactions) : undefined),
    [id, interactions],
  );

  const friendGratitude = useMemo(
    () => (id ? gratitudeForFriend(id, gratitudeList) : []),
    [id, gratitudeList],
  );

  if (!friend) {
    return (
      <Screen padded>
        <EmptyState
          icon="person-remove-outline"
          title="This friend isn't here anymore"
          message="This profile may have been deleted or does not exist."
          actionLabel="Back to friends"
          onAction={() => router.replace("/(tabs)/friends")}
        />
      </Screen>
    );
  }

  const status = contactStatus(friend, lastContact, now);
  const dueDays = daysUntilDue(friend, lastContact, now);
  const gentleMsg = statusMessage({ friend, status, daysUntilDue: dueDays });

  let birthdayText = "";
  if (friend.birthday) {
    try {
      const bdayStr = formatBirthday(friend.birthday);
      const bdayDays = daysUntilBirthday(friend.birthday, now);
      birthdayText = `Birthday ${bdayStr} · ${relativeDays(-bdayDays)}`;
    } catch {
      // Ignore birthday formatting error if invalid
    }
  }

  const handleCall = () => {
    if (friend.phone) {
      void Linking.openURL(`tel:${friend.phone}`);
    }
  };

  const snoozed = isSnoozed(friend, now);

  const handleSnooze = (days: number) => {
    appActions().snoozeFriend(friend.id, days);
    void syncAllNotifications(useAppStore.getState());
    setShowSnoozeMenu(false);
  };

  const handleSkipCycle = () => {
    appActions().skipCycle(friend.id);
    void syncAllNotifications(useAppStore.getState());
    setShowSnoozeMenu(false);
  };

  const handleClearSnooze = () => {
    appActions().clearSnooze(friend.id);
    void syncAllNotifications(useAppStore.getState());
  };

  return (
    <Screen scroll padded>
      {/* Header bar */}
      <View style={[styles.topBar, { marginBottom: spacing.md }]}>
        <IconButton
          icon="arrow-back"
          accessibilityLabel="Back"
          tone="neutral"
          onPress={() => router.back()}
        />
        <ThemedText
          variant="subheading"
          style={styles.topBarTitle}
          numberOfLines={1}
        >
          {friend.name}
        </ThemedText>
        <IconButton
          icon="create-outline"
          accessibilityLabel="Edit profile"
          tone="neutral"
          onPress={() => router.push(`/friend/edit?id=${friend.id}` as any)}
        />
      </View>

      {/* Hero Section */}
      <View style={[styles.hero, { marginBottom: spacing.lg }]}>
        <Avatar name={friend.name} photoUri={friend.photoUri} size={76} />
        <ThemedText variant="title" style={{ marginTop: spacing.sm }}>
          {friend.name}
        </ThemedText>

        <ThemedText
          variant="small"
          color="textSecondary"
          style={{ marginTop: 2 }}
        >
          {[friend.group, friend.howWeMet].filter(Boolean).join(" · ")}
        </ThemedText>

        {status !== "none" ? (
          <View style={{ marginTop: spacing.sm }}>
            <StatusPill status={status} daysUntilDue={dueDays} />
          </View>
        ) : null}

        {gentleMsg ? (
          <ThemedText
            variant="smallStrong"
            color="primary"
            style={{ marginTop: spacing.xs, textAlign: "center" }}
          >
            {gentleMsg}
          </ThemedText>
        ) : null}

        {birthdayText ? (
          <ThemedText
            variant="small"
            color="textSecondary"
            style={{ marginTop: spacing.xs }}
          >
            🎂 {birthdayText}
          </ThemedText>
        ) : null}
      </View>

      {/* Quick Actions Row */}
      <View
        style={[
          styles.actionsRow,
          { gap: spacing.sm, marginBottom: spacing.lg },
        ]}
      >
        <Button
          label="Log moment"
          icon="cafe-outline"
          variant="primary"
          onPress={() =>
            router.push(`/log-interaction?friendId=${friend.id}` as any)
          }
          style={{ flex: 1 }}
        />
        {friend.phone ? (
          <Button
            label="Call"
            icon="call-outline"
            variant="secondary"
            onPress={handleCall}
          />
        ) : null}
        <Button
          label="Gratitude"
          icon="heart-outline"
          variant="secondary"
          onPress={() =>
            router.push(`/add-gratitude?friendId=${friend.id}` as any)
          }
        />
      </View>

      {/* Stats & Cadence Card */}
      <Card tone="surface" style={{ marginBottom: spacing.lg }}>
        <ThemedText variant="smallStrong" color="textSecondary">
          Last contact
        </ThemedText>
        <ThemedText variant="bodyStrong" style={{ marginBottom: spacing.md }}>
          {formatLastContact(lastContact, now)}
        </ThemedText>

        <ThemedText variant="smallStrong" color="textSecondary">
          Stay in touch cadence
        </ThemedText>
        <ThemedText variant="body" style={{ marginBottom: spacing.xs }}>
          {friend.repeatEveryDays
            ? `Every ${friend.repeatEveryDays} days`
            : "No rhythm set"}
        </ThemedText>

        {friend.repeatEveryDays ? (
          <View style={{ marginBottom: spacing.md }}>
            {snoozed && friend.snoozedUntil ? (
              <View
                style={[
                  styles.snoozeRow,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginTop: spacing.xs,
                  },
                ]}
              >
                <ThemedText variant="smallStrong" color="secondary" style={{ flex: 1 }}>
                  Snoozed until {format(parseISO(friend.snoozedUntil), 'MMM d, yyyy')}
                </ThemedText>
                <Button
                  label="Clear"
                  variant="ghost"
                  onPress={handleClearSnooze}
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing.xs }}>
                {!showSnoozeMenu ? (
                  <Button
                    label="Snooze or skip..."
                    variant="ghost"
                    onPress={() => setShowSnoozeMenu(true)}
                  />
                ) : (
                  <View style={{ marginTop: spacing.xs }}>
                    <ThemedText
                      variant="small"
                      color="textSecondary"
                      style={{ marginBottom: spacing.xs }}
                    >
                      Pause reminders for:
                    </ThemedText>
                    <View style={[styles.chipsRow, { gap: spacing.xs, marginBottom: spacing.xs }]}>
                      <Chip label="1 day" onPress={() => handleSnooze(1)} />
                      <Chip label="3 days" onPress={() => handleSnooze(3)} />
                      <Chip label="1 week" onPress={() => handleSnooze(7)} />
                      <Chip
                        label={`Skip cycle (+${friend.repeatEveryDays}d)`}
                        onPress={handleSkipCycle}
                      />
                    </View>
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => setShowSnoozeMenu(false)}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        ) : null}

        <ThemedText variant="smallStrong" color="textSecondary">
          Next planned contact
        </ThemedText>
        <ThemedText variant="body" style={{ marginBottom: spacing.sm }}>
          {friend.nextPlanned
            ? `${formatDayTime(friend.nextPlanned.at, now)} (${
                INTERACTION_META[friend.nextPlanned.type].label
              })`
            : "Nothing planned yet"}
        </ThemedText>

        {!isPlanning ? (
          <Button
            label={friend.nextPlanned ? "Change plan" : "Plan next contact"}
            variant="secondary"
            onPress={() => setIsPlanning(true)}
            style={{ marginTop: spacing.xs }}
          />
        ) : null}
      </Card>

      {/* Inline Planning Panel */}
      {isPlanning ? (
        <PlanContactPanel friend={friend} onDone={() => setIsPlanning(false)} />
      ) : null}

      {/* Notes Card */}
      {friend.notes ? (
        <Card tone="surface" style={{ marginBottom: spacing.lg }}>
          <ThemedText
            variant="smallStrong"
            color="textSecondary"
            style={{ marginBottom: spacing.xs }}
          >
            Notes
          </ThemedText>
          <ThemedText variant="body">{friend.notes}</ThemedText>
        </Card>
      ) : null}

      {/* Moments Section */}
      <SectionTitle
        title="Moments"
        actionLabel="+ Log"
        onAction={() =>
          router.push(`/log-interaction?friendId=${friend.id}` as any)
        }
      />
      {friendInteractions.length === 0 ? (
        <Card tone="surfaceAlt" style={styles.emptyCard}>
          <ThemedText variant="body" color="textSecondary">
            No moments logged yet.
          </ThemedText>
        </Card>
      ) : (
        friendInteractions.map((i) => (
          <TimelineItem
            key={i.id}
            interaction={i}
            now={now}
            onPress={() =>
              router.push(`/log-interaction?interactionId=${i.id}` as any)
            }
          />
        ))
      )}

      {/* Gratitude Section */}
      <SectionTitle
        title="Grateful for"
        actionLabel="+ Add"
        onAction={() =>
          router.push(`/add-gratitude?friendId=${friend.id}` as any)
        }
      />
      {friendGratitude.length === 0 ? (
        <Card tone="surfaceAlt" style={styles.emptyCard}>
          <ThemedText variant="body" color="textSecondary">
            Nothing noted yet.
          </ThemedText>
        </Card>
      ) : (
        friendGratitude.map((g) => (
          <GratitudeCard
            key={g.id}
            entry={g}
            friends={friends}
            now={now}
            onPress={() => router.push(`/add-gratitude?entryId=${g.id}` as any)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginBottom: 8,
  },
  snoozeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
});
