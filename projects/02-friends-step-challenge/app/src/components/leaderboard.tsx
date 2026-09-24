import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";
import { formatSteps, type Friend } from "@/data/circle";
import { Avatar } from "./avatar";

export function Leaderboard({
  friends,
  leaderCaption = "Leading now",
}: {
  friends: Friend[];
  leaderCaption?: string;
}) {
  return (
    <View style={styles.card}>
      {friends.map((friend, index) => (
        <View
          key={`${friend.name}-${index}`}
          style={[styles.row, friend.isYou && styles.youRow]}
        >
          {index === 0 ? (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderBadgeText}>1</Text>
            </View>
          ) : (
            <Text selectable style={styles.rank}>{index + 1}</Text>
          )}
          <Avatar friend={friend} />
          <View style={styles.nameColumn}>
            <Text
              selectable
              style={[styles.name, friend.isYou && styles.youText]}
            >
              {friend.name}
            </Text>
            {index === 0 && <Text style={styles.caption}>{leaderCaption}</Text>}
          </View>
          <Text
            selectable
            style={[styles.steps, friend.isYou && styles.youText]}
          >
            {formatSteps(friend.steps)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: 15,
  },
  youRow: { backgroundColor: "#EFF6FF" },
  rank: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    width: 28,
  },
  leaderBadge: {
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  leaderBadgeText: { color: colors.accentPressed, fontSize: 14, fontWeight: "900" },
  nameColumn: { flex: 1, marginLeft: 11 },
  name: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  youText: { color: colors.accentPressed },
  caption: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  steps: {
    color: colors.ink,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
});
