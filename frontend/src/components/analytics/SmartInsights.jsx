import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, TrendingUp, AlertTriangle, Building2, Users } from "lucide-react";

export const SmartInsights = ({ insights, aiQuery, setAiQuery, aiInsight, isAiLoading, onAiSubmit }) => {
  return (
    <Card className="shadow-sm border-slate-200" data-testid="smart-insights">
      <CardHeader className="pb-2 px-5 pt-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
          <Sparkles className="w-4 h-4 text-violet-500" /> Smart Insights
        </CardTitle>
        <CardDescription className="text-[11px]">AI-powered business intelligence from your Capex data</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {/* Auto-generated insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {insights.map((insight, i) => (
            <div key={i} className={`p-3 rounded-xl border ${insight.borderColor} ${insight.bgColor} flex items-start gap-2.5`}>
              <div className={`w-7 h-7 rounded-lg ${insight.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <insight.icon className={`w-3.5 h-3.5 ${insight.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{insight.title}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{insight.description}</p>
                {insight.badge && (
                  <Badge className={`text-[9px] mt-1.5 ${insight.badgeColor}`}>{insight.badge}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI Query */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] font-medium text-slate-500 mb-2">Ask AI about your data</p>
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g. Which department exceeded budget? What's the average delivery time?"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="min-h-[50px] text-xs resize-none"
              data-testid="ai-query-input"
            />
            <Button onClick={onAiSubmit} disabled={isAiLoading || !aiQuery.trim()} className="self-end px-3" data-testid="ai-query-btn"
              style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}>
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {aiInsight && (
            <div className="mt-3 p-3 bg-violet-50 rounded-lg border border-violet-100" data-testid="ai-response">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{aiInsight}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
