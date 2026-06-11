# Integration testing scope (TacTic)

TacTic does **not** use RabbitMQ, Laravel `Notification` classes, or queued `Job` classes for HR workflows.

Integration tests therefore focus on:

- **Broadcast events** — `LeaveStatusNotification`, `SalaryPaid`, `AttendanceNotification` via `Event::fake()` / `Event::assertDispatched()`
- **HTTP flows** — e.g. leave approval updating user status and balance

## Not applicable (roadmap items skipped)

| Roadmap item | Reason |
|--------------|--------|
| `Notification::fake()` | No classes in `app/Notifications/` |
| `Queue::fake()` | No classes in `app/Jobs/`; tests use `QUEUE_CONNECTION=sync` |
| RabbitMQ tests | Not in stack; Reverb handles WebSocket broadcasts |

PHPUnit suite: `backend/tests/Integration/`.

Historical TestSprite report: [testsprite-mcp-test-report.md](./testsprite-mcp-test-report.md).
