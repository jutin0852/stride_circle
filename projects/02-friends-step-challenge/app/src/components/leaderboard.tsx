import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";
import { formatSteps, type Friend } from "@/data/circle";
import { Avatar } from "./avatar";

export function Leaderboard({
  friends,
}: {
  friends: Friend[];
}) {
  return (
    <View style={styles.card}>
      {friends.map((friend, index) => (
          <View
            key={friend.id ?? `${friend.name}-${index}`}
            style={[styles.row, friend.isYou && styles.youRow]}
          >
            <Text selectable style={styles.rank}>{index + 1}</Text>
            <Avatar friend={friend} />
            <View style={styles.nameColumn}>
              <Text
                selectable
                style={[styles.name, friend.isYou && styles.youText]}
              >
                {friend.name}
              </Text>
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
  nameColumn: { flex: 1, marginLeft: 11 },
  name: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  youText: { color: colors.accentPressed },
  steps: {
    color: colors.ink,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
});
