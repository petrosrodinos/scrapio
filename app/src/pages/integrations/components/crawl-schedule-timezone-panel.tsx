import { useEffect, useState } from "react";
import { Label, Select, ListBox } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import {
  useCrawlScheduleTimezones,
  useCurrentUserProfile,
  useUpdateCurrentUserProfile,
} from "@/features/user/hooks/use-user-profile";

export function CrawlScheduleTimezonePanel() {
  const { data: profile, isPending: profilePending } = useCurrentUserProfile();
  const { data: timezones = [], isPending: timezonesPending } = useCrawlScheduleTimezones();
  const updateProfile = useUpdateCurrentUserProfile();
  const [selectedTimezone, setSelectedTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.default_schedule_tz) {
      setSelectedTimezone(profile.default_schedule_tz);
    }
  }, [profile?.default_schedule_tz]);

  const isPending = profilePending || timezonesPending;
  const hasChanges =
    !!profile &&
    !!selectedTimezone &&
    selectedTimezone !== profile.default_schedule_tz;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold text-foreground">Crawl schedule timezone</p>
        <p className="text-sm text-muted">
          Scheduled crawl runs for your website targets use this timezone when evaluating cron
          intervals.
        </p>
      </div>

      <div className="flex flex-col gap-1 max-w-md">
        <Select
          selectedKey={selectedTimezone ?? undefined}
          onSelectionChange={(key) => setSelectedTimezone(String(key))}
          isDisabled={isPending || updateProfile.isPending}
        >
          <Label>Timezone</Label>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={timezones}>
              {(timezone) => (
                <ListBox.Item id={timezone.value} textValue={timezone.label}>
                  {timezone.label}
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div>
        <ActionButtonWithPending
          isPending={updateProfile.isPending}
          isDisabled={!hasChanges || !selectedTimezone}
          onPress={() => {
            if (!selectedTimezone) return;
            updateProfile.mutate({ default_schedule_tz: selectedTimezone });
          }}
        >
          Save timezone
        </ActionButtonWithPending>
      </div>
    </section>
  );
}
