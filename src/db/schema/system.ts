import { bigint, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { organizations } from "./organizations";
import { taskStatusEnum } from "./enums";

/** Log of background / scheduled jobs (heartbeat, cleanup, reminders). */
export const scheduledTasks = pgTable(
  "scheduled_tasks",
  {
    id: primaryId(),
    organizationId: bigint("organization_id", { mode: "number" }).references(
      () => organizations.id,
      { onDelete: "cascade" },
    ),
    task: varchar("task", { length: 150 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: taskStatusEnum("status").default("pending").notNull(),
    output: text("output"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [
    index("scheduled_tasks_task_idx").on(table.task),
    index("scheduled_tasks_status_idx").on(table.status),
  ],
);
