import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmailCampaigns } from "@/services/email/hooks/useEmailCampaigns";
import { Badge } from "@/components/ui/badge";
import { MailMinus, MailPlus } from "lucide-react";

export function EmailCampaignsDashboard() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { campaigns, refetch, createCampaign, isCampaignCreating } = useEmailCampaigns(userId);

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    campaign_type: "",
    subject_template: "",
  });

  async function handleNewCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaign_type || !form.subject_template) return;
    await createCampaign({
      user_id: userId,
      campaign_type: form.campaign_type,
      subject_template: form.subject_template,
      audience_segment: {}, // placeholder
      status: "draft",
    });
    setForm({ campaign_type: "", subject_template: "" });
    setShowNew(false);
    refetch();
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MailMinus className="w-5 h-5" />
          Email Campaigns
        </h2>
        <Button onClick={() => setShowNew(s => !s)} variant="default" size="sm">
          <MailPlus className="w-4 h-4 mr-1" />
          New Campaign
        </Button>
      </div>
      {showNew && (
        <form className="rounded border p-4 mb-6 flex gap-2 items-center" onSubmit={handleNewCampaign}>
          <Input
            type="text"
            placeholder="Type (e.g., registration, follow-up)"
            value={form.campaign_type}
            onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}
            className="w-40"
          />
          <Input
            type="text"
            placeholder="Subject"
            value={form.subject_template}
            onChange={e => setForm(f => ({ ...f, subject_template: e.target.value }))}
            className="w-56"
          />
          <Button type="submit" size="sm" disabled={isCampaignCreating}>
            Create
          </Button>
        </form>
      )}
      <div className="bg-background rounded border">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-muted text-xs text-muted-foreground">
              <th className="py-2 px-3 text-left">Subject</th>
              <th className="py-2 px-3 text-left">Type</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Created</th>
              <th className="py-2 px-3 text-left">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className="hover:bg-accent border-b last:border-none">
                <td className="py-2 px-3">{c.subject_template}</td>
                <td className="py-2 px-3">{c.campaign_type}</td>
                <td className="py-2 px-3">
                  <Badge variant="outline">{c.status}</Badge>
                </td>
                <td className="py-2 px-3 text-xs">{c.created_at?.slice(0, 16)}</td>
                <td className="py-2 px-3 text-xs">{c.last_run_at?.slice(0, 16) || "--"}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No campaigns found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
