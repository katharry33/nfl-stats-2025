import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  // Made these optional with '?' to fix error 2739
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
}

export function KpiCard({ 
  title, 
  value, 
  icon: Icon, // Rename to uppercase to use as a component
  change, 
  changeType = "neutral",
  className 
}: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(
            "text-xs mt-1",
            changeType === "positive" ? "text-emerald-500" : 
            changeType === "negative" ? "text-rose-500" : "text-muted-foreground"
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}