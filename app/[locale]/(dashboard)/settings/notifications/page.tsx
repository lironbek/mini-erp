"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Preferences = {
  channels: Record<string, boolean>;
  quietHours: { enabled: boolean; from: string; to: string };
  summaryFrequency: string;
  disabledTypes: string[];
};

const NOTIFICATION_TYPES = [
  "ORDER_RECEIVED",
  "ORDER_ANOMALY",
  "ORDER_STATUS",
  "ORDER_REMINDER",
  "ORDER_CUTOFF",
  "DAILY_ORDER_SUMMARY",
  "PRODUCTION_PLAN_READY",
  "MATERIAL_SHORTAGE",
  "CAPACITY_EXCEEDED",
  "PRODUCTION_COMPLETE",
  "HIGH_WASTE",
  "LOW_STOCK",
  "CRITICAL_STOCK",
  "EXPIRING_SOON",
  "GOODS_RECEIVED",
  "COUNT_DUE",
  "COUNT_COMPLETE",
  "REORDER_SUGGESTION",
  "VARIANCE_ALERT",
  "MARGIN_ALERT",
];

const CHANNELS = ["in_app", "email", "whatsapp", "push"] as const;

export default function NotificationPreferencesPage() {
  const t = useTranslations();
  const [prefs, setPrefs] = useState<Preferences>({
    channels: { in_app: true, email: true, whatsapp: false, push: true },
    quietHours: { enabled: false, from: "22:00", to: "07:00" },
    summaryFrequency: "daily",
    disabledTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch_prefs() {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) setPrefs(await res.json());
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    }
    fetch_prefs();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        toast.success(t("notifications.preferencesSaved"));
      } else {
        toast.error("Failed to save preferences");
      }
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function toggleType(type: string) {
    setPrefs((prev) => ({
      ...prev,
      disabledTypes: prev.disabledTypes.includes(type)
        ? prev.disabledTypes.filter((t) => t !== type)
        : [...prev.disabledTypes, type],
    }));
  }

  if (loading) {
    return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("notifications.preferences")}</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Save className="me-1 h-4 w-4" />}
          {t("notifications.savePreferences")}
        </Button>
      </div>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHANNELS.map((ch) => (
            <div key={ch} className="flex items-center justify-between">
              <span className="font-medium">{t(`notifications.channels.${ch}` as never)}</span>
              <Switch
                checked={prefs.channels[ch] ?? false}
                onCheckedChange={(checked) =>
                  setPrefs({
                    ...prefs,
                    channels: { ...prefs.channels, [ch]: checked },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.quietHours")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("notifications.quietHours")}</span>
            <Switch
              checked={prefs.quietHours.enabled}
              onCheckedChange={(checked) =>
                setPrefs({
                  ...prefs,
                  quietHours: { ...prefs.quietHours, enabled: checked },
                })
              }
            />
          </div>
          {prefs.quietHours.enabled && (
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm text-muted-foreground">{t("notifications.quietHoursFrom")}</label>
                <Input
                  type="time"
                  value={prefs.quietHours.from}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, from: e.target.value },
                    })
                  }
                  className="w-32"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">{t("notifications.quietHoursTo")}</label>
                <Input
                  type="time"
                  value={prefs.quietHours.to}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, to: e.target.value },
                    })
                  }
                  className="w-32"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.summaryFrequency")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={prefs.summaryFrequency}
            onValueChange={(v) => setPrefs({ ...prefs, summaryFrequency: v })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {NOTIFICATION_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">
                  {t(`notifications.types.${type}` as never)}
                </span>
                <Switch
                  checked={!prefs.disabledTypes.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
